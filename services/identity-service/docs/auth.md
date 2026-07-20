# Authentication — Identity Service

> **Base URL:** `http://localhost:8081/api`
> **Content-Type:** `application/json`
> **Framework:** Go · Fiber v2 · GORM · PostgreSQL

---

## Table of Contents

1. [Overview](#overview)
2. [Token System](#token-system)
3. [Password Rules](#password-rules)
4. [Phone Number Format](#phone-number-format)
5. [Auth Flows (Step-by-Step)](#auth-flows)
   - [Registration Flow](#1-registration-flow)
   - [Login Flow](#2-login-flow)
   - [Token Refresh Flow](#3-token-refresh-flow)
   - [Logout Flow](#4-logout-flow)
   - [Phone Verification Flow (OTP)](#5-phone-verification-flow-otp)
   - [Forgot Password Flow](#6-forgot-password-flow)
   - [Reset Password Flow](#7-reset-password-flow)
6. [API Reference](#api-reference)
7. [Error Reference](#error-reference)

---

## Overview

The identity-service handles all authentication and account management for the Velocity platform.
Every endpoint lives under `/api/auth`. All endpoints are **public** (no JWT required) — the JWT
middleware is available for downstream protected routes in other services.

```
Client  ──►  POST /api/auth/*  ──►  AuthHandler
                                         │
                                         ▼
                                    AuthUseCase  (business logic)
                                         │
                              ┌──────────┼──────────┐
                              ▼          ▼          ▼
                        AuthRepository  JWTService  SMSService
                        (PostgreSQL)    (JWT)       (Twilio)
```

---

## Token System

| Token | Algorithm | Signed With | Default Lifetime | Stored in DB? |
|---|---|---|---|---|
| **Access Token** | HS256 JWT | `JWT_ACCESS_SECRET` | 15 minutes | ❌ Stateless |
| **Refresh Token** | HS256 JWT | `JWT_REFRESH_SECRET` | 7 days | ✅ `refresh_tokens` table |

**JWT Claims payload:**
```json
{
  "user_id": 42,
  "email": "example@gmail.com",
  "role": "user",
  "exp": 1750000000,
  "iat": 1749999100,
  "iss": "velocity-identity"
}
```

**Usage on protected routes:**
```
Authorization: Bearer <access_token>
```

---

## Password Rules

Every password (on registration and reset) must satisfy **all** of the following:

| Rule | Requirement |
|---|---|
| Minimum length | ≥ 8 characters |
| Maximum length | ≤ 72 characters |
| Uppercase | At least **1** uppercase letter (A–Z) |
| Lowercase | At least **1** lowercase letter (a–z) |
| Digit | At least **1** numeric digit (0–9) |

**Valid examples:**
- `Password1` ✅
- `Velocity@9` ✅
- `MySecure99` ✅

**Invalid examples:**
- `password1` ❌ — no uppercase
- `PASSWORD1` ❌ — no lowercase
- `Password` ❌ — no digit
- `Pass1` ❌ — too short (< 8 chars)

---

## Phone Number Format

All phone numbers must be in **E.164** format:

```
+[country code][number]
```

| Example | Valid? |
|---|---|
| `+919876543210` | ✅ India |
| `+14155552671` | ✅ USA |
| `919876543210` | ✅ (leading `+` is optional) |
| `09876543210` | ❌ Local format not accepted |
| `phone123` | ❌ Not a valid number |

---

## Auth Flows

### 1. Registration Flow

```
Client                       Server
  │                             │
  │── POST /auth/register ──────►│
  │   { full_name, email,        │
  │     phone, password }        │
  │                             │  1. Validate password complexity
  │                             │  2. Validate phone (E.164)
  │                             │  3. Check email uniqueness  ──► 409 if taken
  │                             │  4. Check phone uniqueness  ──► 409 if taken
  │                             │  5. bcrypt hash password
  │                             │  6. INSERT user (is_verified=false, role="user")
  │                             │  7. Generate 6-digit OTP → save to DB
  │                             │  8. Send OTP via Twilio SMS (non-blocking)
  │◄── 201 RegisterResponse ────│
  │   { message, user{...} }    │
```

> ⚠️ After registration the user is **not verified** yet. They **cannot log in** until they complete phone verification (Step 5).

---

### 2. Login Flow

```
Client                       Server
  │                             │
  │── POST /auth/login ─────────►│
  │   { email, password }        │
  │                             │  1. Find user by email  ──► 401 if not found
  │                             │  2. Check is_blocked    ──► 403 if blocked
  │                             │  3. Check is_verified   ──► 403 if not verified
  │                             │  4. bcrypt compare password ──► 401 if wrong
  │                             │  5. Generate access token  (JWT, 15 min)
  │                             │  6. Generate refresh token (JWT, 7 days)
  │                             │  7. INSERT refresh token into DB
  │◄── 200 LoginResponse ───────│
  │   { access_token,           │
  │     refresh_token,          │
  │     token_type: "Bearer",   │
  │     expires_in: 900,        │
  │     user{...} }             │
```

> 🔒 The server always returns **401 "invalid email or password"** for both wrong email AND wrong password — this prevents email enumeration attacks.

---

### 3. Token Refresh Flow

```
Client                       Server
  │                             │
  │── POST /auth/refresh ───────►│
  │   { refresh_token }          │
  │                             │  1. Validate JWT signature & expiry
  │                             │  2. Look up token in DB   ──► 404 if not found (logged out)
  │                             │  3. Check server-side expiry ──► 401 if expired
  │                             │  4. Reload user (check if blocked since last login)
  │                             │  5. Generate NEW access token
  │◄── 200 TokenResponse ───────│
  │   { access_token,           │
  │     token_type: "Bearer",   │
  │     expires_in: 900 }       │
```

> The **refresh token is NOT rotated** on refresh — only a new access token is issued.

---

### 4. Logout Flow

```
Client                       Server
  │                             │
  │── POST /auth/logout ────────►│
  │   { refresh_token }          │
  │                             │  1. Find token in DB  ──► 404 if not found
  │                             │  2. DELETE token from DB
  │◄── 200 ────────────────────│
  │   { message: "Logged out    │
  │     successfully" }          │
```

> After logout the refresh token is gone from the DB. Any attempt to use it for token refresh returns 404.

---

### 5. Phone Verification Flow (OTP)

New users must verify their phone after registration.

```
Client                       Server
  │                             │
  │ [Already received OTP SMS   │
  │  at registration — OR]      │
  │                             │
  │── POST /auth/otp/send ──────►│
  │   { phone, purpose:"verify"}│
  │                             │  1. Validate phone format
  │                             │  2. Find user by phone
  │                             │  3. Invalidate previous unused OTPs (same phone + purpose)
  │                             │  4. Generate new 6-digit OTP (crypto/rand)
  │                             │  5. INSERT OTP (expires in 10 min)
  │                             │  6. Send SMS via Twilio
  │◄── 200 ────────────────────│
  │   { message: "OTP sent" }   │
  │                             │
  │── POST /auth/otp/verify ────►│
  │   { phone, code:"123456",   │
  │     purpose:"verify" }       │
  │                             │  1. Validate code (6 numeric digits)
  │                             │  2. Find valid OTP (unexpired, unused, matching)
  │                             │  3. Mark OTP as used (used=true)
  │                             │  4. Set user.is_verified = true
  │◄── 200 ────────────────────│
  │   { message: "OTP verified"}│
```

---

### 6. Forgot Password Flow

```
Client                       Server
  │                             │
  │── POST /auth/password/──────►│
  │   forgot                    │
  │   { phone: "+919..." }      │
  │                             │  1. Find user by phone
  │                             │  2. If not found: SILENTLY succeed (no enumeration)
  │                             │  3. Generate reset OTP → save to DB
  │                             │  4. Send password-reset SMS via Twilio
  │◄── 200 ────────────────────│
  │   { message: "If an account │
  │     with that ... OTP has   │
  │     been sent" }             │
```

> 🔒 The response is always the same regardless of whether the phone exists. This prevents user enumeration.

---

### 7. Reset Password Flow

```
Client                       Server
  │                             │
  │── POST /auth/password/──────►│
  │   reset                     │
  │   { phone, code:"654321",   │
  │     new_password }           │
  │                             │  1. Validate new password complexity
  │                             │  2. Find valid reset OTP ──► 400 if invalid/expired
  │                             │  3. Mark OTP as used
  │                             │  4. Find user by phone
  │                             │  5. bcrypt hash new password
  │                             │  6. UPDATE user.hash_password
  │                             │  7. DELETE all user's refresh tokens (force re-login)
  │◄── 200 ────────────────────│
  │   { message: "Password      │
  │     reset successfully..." }│
```

> ⚠️ All active sessions are **invalidated** after a password reset. The user must log in again with their new password.

---

## API Reference

### `POST /api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "example@gmail.com",
  "phone": "+919876543210",
  "password": "Velocity@9"
}
```

**Field Validation:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `full_name` | string | ✅ | min=2, max=50 chars |
| `email` | string | ✅ | valid email format, max=50 chars |
| `phone` | string | ✅ | E.164 format, min=7, max=20 chars |
| `password` | string | ✅ | min=8, max=72, 1 uppercase, 1 lowercase, 1 digit |

**Success Response — `201 Created`:**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. A verification OTP has been sent to your phone.",
    "user": {
      "id": 1,
      "full_name": "John Doe",
      "email": "example@gmail.com",
      "phone": "+919876543210",
      "role": "user",
      "is_blocked": false,
      "is_verified": false,
      "created_at": "2026-07-17T05:00:00Z"
    }
  }
}
```

**Error Responses:**

| HTTP | When |
|---|---|
| `400` | Missing / invalid field (e.g. password too short, bad email) |
| `409` | `email already in use` |
| `409` | `phone number already in use` |

---

### `POST /api/auth/login`

Authenticate with email and password.

**Request Body:**
```json
{
  "email": "example@gmail.com",
  "password": "Velocity@9"
}
```

**Field Validation:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | ✅ | valid email format |
| `password` | string | ✅ | non-empty |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": 1,
      "full_name": "John Doe",
      "email": "example@gmail.com",
      "phone": "+919876543210",
      "role": "user",
      "is_blocked": false,
      "is_verified": true,
      "created_at": "2026-07-17T05:00:00Z"
    }
  }
}
```

> `expires_in` is in **seconds** (900 = 15 minutes).

**Error Responses:**

| HTTP | Code | When |
|---|---|---|
| `400` | — | Missing `email` or `password` field |
| `401` | `invalid email or password` | Wrong email or wrong password |
| `403` | `your account has been blocked` | Account is blocked |
| `403` | `please verify your phone number first` | Phone not yet verified |

---

### `POST /api/auth/logout`

Revoke the refresh token (invalidate session).

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Field Validation:**

| Field | Type | Required |
|---|---|---|
| `refresh_token` | string | ✅ |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Responses:**

| HTTP | When |
|---|---|
| `400` | Missing `refresh_token` |
| `404` | Token not found in DB (already logged out or never issued) |

---

### `POST /api/auth/refresh`

Exchange a refresh token for a new access token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new token)...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

**Error Responses:**

| HTTP | When |
|---|---|
| `400` | Missing `refresh_token` |
| `401` | Invalid JWT signature or expired JWT |
| `401` | Server-side expiry exceeded |
| `403` | User has been blocked since last login |
| `404` | Token not found in DB |

---

### `POST /api/auth/otp/send`

Send a verification or password-reset OTP via SMS.

**Request Body:**
```json
{
  "phone": "+919876543210",
  "purpose": "verify"
}
```

**Field Validation:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `phone` | string | ✅ | E.164 format, min=7, max=20 |
| `purpose` | string | ✅ | one of: `verify`, `reset_password` |

**Purpose Values:**

| Value | Use Case |
|---|---|
| `verify` | New account phone verification |
| `reset_password` | Password reset confirmation |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Error Responses:**

| HTTP | When |
|---|---|
| `400` | Invalid phone format or invalid purpose value |
| `404` | Phone number not associated with any account |

---

### `POST /api/auth/otp/verify`

Verify the OTP code received via SMS.

**Request Body:**
```json
{
  "phone": "+919876543210",
  "code": "483920",
  "purpose": "verify"
}
```

**Field Validation:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `phone` | string | ✅ | non-empty |
| `code` | string | ✅ | exactly 6 numeric digits |
| `purpose` | string | ✅ | one of: `verify`, `reset_password` |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Error Responses:**

| HTTP | When |
|---|---|
| `400` | Code is not 6 digits, contains non-numeric chars, or purpose is invalid |
| `400` | `invalid or expired OTP code` — OTP not found, already used, or expired |

---

### `POST /api/auth/password/forgot`

Request a password-reset OTP sent to the registered phone.

> **Note:** The `phone` field in the request is actually looked up by **email** in the current implementation (`ForgotPassword` calls `FindUserByEmail`). The field name in the DTO is `phone` but it accepts an email address. This is a known inconsistency — use the email address here.

**Request Body:**
```json
{
  "phone": "example@gmail.com"
}
```

**Success Response — `200 OK` (always):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a reset OTP has been sent"
}
```

> Always returns 200 to prevent account enumeration, even if the email does not exist.

---

### `POST /api/auth/password/reset`

Reset the password using the OTP received via SMS.

**Request Body:**
```json
{
  "phone": "+919876543210",
  "code": "192837",
  "new_password": "NewSecure1"
}
```

**Field Validation:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `phone` | string | ✅ | non-empty |
| `code` | string | ✅ | exactly 6 numeric digits |
| `new_password` | string | ✅ | min=8, max=72, 1 uppercase, 1 lowercase, 1 digit |

**Success Response — `200 OK`:**
```json
{
  "success": true,
  "message": "Password reset successfully. Please log in with your new password."
}
```

**Error Responses:**

| HTTP | When |
|---|---|
| `400` | `new_password` fails complexity rules |
| `400` | OTP is invalid, expired, or already used |
| `404` | Phone not found |

---

### `GET /health`

Health check — no auth required.

**Response — `200 OK`:**
```json
{
  "success": true,
  "service": "identity-service",
  "timestamp": "2026-07-17T05:30:00Z"
}
```

---

## Error Reference

All errors follow this envelope shape:

```json
{
  "success": false,
  "error": "human-readable message"
}
```

| HTTP Status | Meaning | Example Message |
|---|---|---|
| `400 Bad Request` | Validation failed or malformed body | `"password must contain at least one uppercase letter"` |
| `401 Unauthorized` | Bad credentials or invalid token | `"invalid email or password"`, `"invalid or expired token"` |
| `403 Forbidden` | Account blocked or not verified | `"your account has been blocked"`, `"please verify your phone number first"` |
| `404 Not Found` | Resource does not exist | `"user not found"`, `"refresh token not found"` |
| `409 Conflict` | Duplicate unique value | `"email already in use"`, `"phone number already in use"` |
| `500 Internal Server Error` | Unexpected server-side failure | `"failed to generate access token"` |

---

## OTP Details

- **Length:** 6 numeric digits (e.g., `483920`)
- **Expiry:** 10 minutes (configurable via `OTP_EXPIRY_MINUTES`)
- **Generation:** Uses `crypto/rand` (cryptographically secure — not predictable)
- **Single-use:** Once verified, `used = true` is set; the code cannot be reused
- **Auto-invalidation:** Sending a new OTP for the same `phone + purpose` automatically **deletes** the previous unused OTP

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `APP_PORT` | `8081` | HTTP server port |
| `APP_ENV` | `development` | Runtime environment |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `velocity` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | _(empty)_ | Database password |
| `JWT_ACCESS_SECRET` | `change-me` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | `change-me` | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRY_MINUTES` | `15` | Access token lifetime (minutes) |
| `JWT_REFRESH_EXPIRY_DAYS` | `7` | Refresh token lifetime (days) |
| `TWILIO_ACCOUNT_SID` | _(required)_ | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | _(required)_ | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | _(required)_ | Twilio sender phone number |
| `OTP_EXPIRY_MINUTES` | `10` | OTP validity window (minutes) |
| `OTP_CODE_LENGTH` | `6` | OTP digit count |
