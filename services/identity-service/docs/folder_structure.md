# Folder Structure — Identity Service

> A deep-dive into every directory, every file, and exactly **why** it exists.

---

## Table of Contents

1. [Top-Level Layout](#top-level-layout)
2. [cmd/ — Entry Point](#cmd--entry-point)
3. [internal/ — Business Domain](#internal--business-domain)
   - [internal/auth/](#internalauth)
   - [internal/user/](#internaluser)
   - [internal/common/](#internalcommon)
   - [internal/config/](#internalconfig)
   - [internal/middleware/](#internalmiddleware)
4. [pkg/ — Reusable Packages](#pkg--reusable-packages)
5. [docs/ — Documentation](#docs--documentation)
6. [migrations/ — Database Migrations](#migrations--database-migrations)
7. [scripts/ — Developer Scripts](#scripts--developer-scripts)
8. [tests/ — Test Suite](#tests--test-suite)
9. [Root Files](#root-files)
10. [Dependency Flow Diagram](#dependency-flow-diagram)
11. [Layer Responsibilities](#layer-responsibilities)
12. [Naming Conventions](#naming-conventions)

---

## Top-Level Layout

```
identity-service/
│
├── cmd/                        ← Application entry point(s)
│   └── server/
│       └── main.go
│
├── internal/                   ← Private business logic (not importable by other services)
│   ├── auth/                   ← Auth feature (8 sub-layers)
│   ├── user/                   ← User feature (8 sub-layers, same structure as auth)
│   ├── common/                 ← Shared helpers (errors, responses)
│   ├── config/                 ← Application configuration loader
│   └── middleware/             ← HTTP middleware (JWT auth guard, role check)
│
├── pkg/                        ← Shared, reusable packages (could theoretically be extracted)
│   ├── database/               ← GORM / PostgreSQL connection + auto-migrate
│   ├── hashpkg/                ← bcrypt password hashing
│   ├── jwtpkg/                 ← JWT generation & validation
│   └── twiliopkg/              ← Twilio SMS client wrapper
│
├── docs/                       ← Hand-written documentation
│   ├── auth.md                 ← Auth API reference (this project)
│   └── folder_structure.md    ← This file
│
├── migrations/                 ← SQL migration files (manual, separate from GORM auto-migrate)
├── scripts/                    ← Shell/Go helper scripts (seed, lint, etc.)
├── tests/                      ← Integration / end-to-end tests
│
├── .env                        ← Local environment variables (never commit secrets)
├── go.mod                      ← Go module definition
└── go.sum                      ← Dependency lock file
```

---

## `cmd/` — Entry Point

```
cmd/
└── server/
    └── main.go
```

### `cmd/server/main.go`

The **only** `main` function in the service. It is intentionally thin — its only job is to wire
everything together and start the HTTP server. It follows the **manual dependency injection** pattern:
no DI framework, just plain Go constructor calls chained in order.

**Boot sequence inside `main()`:**

```
Step 1  ── config.Load()              Load all env vars → Config struct
Step 2  ── database.Connect()         Open GORM + PostgreSQL connection; run AutoMigrate
Step 3  ── jwtpkg.NewJWTService()     Build JWT signer/validator with secrets + expiry
Step 4  ── twiliopkg.NewSMSService()  Build Twilio SMS client
Step 5  ── repository.NewAuthRepository(db)   Wire repo with db
Step 6  ── usecase.NewAuthUseCase(repo, jwt, sms, otpExpiry)   Wire use-case
Step 7  ── handler.NewAuthHandler(uc)  Wire HTTP handler
Step 8  ── fiber.New()                Create Fiber app with global middleware
Step 9  ── routes.RegisterAuthRoutes()  Mount /auth/* endpoints
Step 10 ── app.Listen()               Start HTTP server
```

> **Why `cmd/server/`?** Go convention allows multiple binaries under `cmd/`. If you later added
> an admin CLI or a migration runner as a separate binary, it would live at `cmd/migrate/` or
> `cmd/admin/` alongside `cmd/server/`.

---

## `internal/` — Business Domain

The `internal/` directory makes all its code **private to this module** — the Go compiler will
refuse to import anything from `internal/` in any other module. This is intentional: no other
service should depend directly on identity-service's business logic.

### `internal/auth/`

The auth feature is the heart of this service. It is split into **9 layers**, each with a single
responsibility:

```
internal/auth/
├── dto/           ← Data Transfer Objects  (request & response shapes)
├── entity/        ← Domain models           (maps 1-to-1 with DB tables)
├── events/        ← Domain events           (reserved — currently empty)
├── handler/       ← HTTP handlers           (parse request → call use-case → send response)
├── mapper/        ← Entity ↔ DTO converters (keep sensitive fields out of responses)
├── repository/    ← Database interface + PostgreSQL implementation
├── routes/        ← Route registration      (mounts handlers onto Fiber router)
├── usecase/       ← Business logic          (orchestrates repo, JWT, SMS)
└── validator/     ← Domain validators       (password complexity, phone E.164, OTP format)
```

---

#### `internal/auth/dto/` — Data Transfer Objects

**File:** `auth_dto.go`

DTOs are **plain structs** that define the exact JSON shape of HTTP requests and responses.
They carry `validate:"..."` struct tags consumed by `go-playground/validator`.

| Struct | Direction | Used By |
|---|---|---|
| `RegisterRequest` | Client → Server | `POST /auth/register` |
| `LoginRequest` | Client → Server | `POST /auth/login` |
| `LogoutRequest` | Client → Server | `POST /auth/logout` |
| `RefreshTokenRequest` | Client → Server | `POST /auth/refresh` |
| `SendOTPRequest` | Client → Server | `POST /auth/otp/send` |
| `VerifyOTPRequest` | Client → Server | `POST /auth/otp/verify` |
| `ForgotPasswordRequest` | Client → Server | `POST /auth/password/forgot` |
| `ResetPasswordRequest` | Client → Server | `POST /auth/password/reset` |
| `UserResponse` | Server → Client | Registration, Login |
| `LoginResponse` | Server → Client | Login success |
| `RegisterResponse` | Server → Client | Registration success |
| `TokenResponse` | Server → Client | Token refresh success |
| `MessageResponse` | Server → Client | OTP, logout, password ops |

**Why separate DTOs from entities?**
- Entities contain sensitive fields (e.g. `HashPassword`) — DTOs never expose them
- API shapes can change independently of the database schema
- Validation lives on the DTO, not the entity

---

#### `internal/auth/entity/` — Domain Models

**File:** `auth_entity.go`

Entities are **GORM models** — they map directly to database tables.

| Struct | Table | Purpose |
|---|---|---|
| `User` | `users` | Core user record |
| `RefreshToken` | `refresh_tokens` | Persisted JWT refresh tokens (for revocation) |
| `OTP` | `otps` | One-time passwords for phone verification and password reset |

**Key design decisions:**

- `HashPassword` has `json:"-"` — it is **never** serialized to JSON under any circumstances
- `RefreshTokens` and `OTPs` are Go associations with `CASCADE DELETE` — removing a user cascades
- `OTPPurpose` is a typed string (`type OTPPurpose string`) — prevents magic string bugs across the codebase
- `IsVerified` defaults to `false` at the DB level — users must verify their phone before they can log in

---

#### `internal/auth/events/` — Domain Events

**Directory:** `events/` *(currently empty)*

Reserved for future domain events (e.g., `UserRegistered`, `PasswordReset`) that could be published
to a message queue (Kafka, RabbitMQ) for cross-service communication.

---

#### `internal/auth/handler/` — HTTP Handlers

**File:** `auth_handler.go`

Handlers are the **HTTP layer**. They perform exactly three tasks and nothing else:

1. Parse and bind the JSON request body
2. Run struct-level validation (via `go-playground/validator`)
3. Call the use-case method and write the response

Handlers know nothing about the database, JWT secrets, or bcrypt — all of that is delegated to
the use-case.

```go
// Example pattern — every handler follows this same shape:
func (h *AuthHandler) Login(c *fiber.Ctx) error {
    var req dto.LoginRequest
    if err := c.BodyParser(&req); err != nil {      // Step 1: parse
        return response.BadRequest(c, "invalid request body")
    }
    if err := validate.Struct(req); err != nil {    // Step 2: validate
        return response.BadRequest(c, err.Error())
    }
    res, err := h.uc.Login(req)                     // Step 3: delegate
    if err != nil {
        return response.Error(c, err)
    }
    return response.OK(c, res)
}
```

The shared `validate` instance is a package-level variable (`var validate = validator.New()`) —
`validator.Validate` is designed to be created once and reused (thread-safe).

---

#### `internal/auth/mapper/` — Entity ↔ DTO Converters

**File:** `auth_mapper.go`

Mappers are **pure functions** that convert between entity and DTO types. They act as a firewall:
no database row ever reaches the HTTP response unfiltered.

| Function | Input → Output |
|---|---|
| `ToUserResponse(u *entity.User)` | `entity.User → dto.UserResponse` (strips `HashPassword`) |
| `ToRegisterResponse(u *entity.User)` | `entity.User → dto.RegisterResponse` (wraps with message) |

---

#### `internal/auth/repository/` — Data Access Layer

**File:** `auth_repository.go`

The repository defines an **interface** (`AuthRepository`) and a **PostgreSQL implementation**.
This two-part design is crucial for testability.

```
AuthRepository (interface)
    │
    └── authRepository (struct) ← real PostgreSQL implementation via GORM
```

**Interface methods by group:**

```
User Management
  CreateUser(user)           → inserts a new user row
  FindUserByEmail(email)     → SELECT WHERE email = ?
  FindUserByPhone(phone)     → SELECT WHERE phone = ?
  FindUserByID(id)           → SELECT WHERE id = ?
  UpdateUser(user)           → UPDATE (full save via GORM's Save)

Refresh Token Management
  CreateRefreshToken(token)          → INSERT
  FindRefreshToken(token)            → SELECT WHERE token = ?
  DeleteRefreshToken(token)          → DELETE WHERE token = ?  (logout)
  DeleteAllUserRefreshTokens(userID) → DELETE WHERE user_id = ?  (password reset)

OTP Management
  CreateOTP(otp)             → DELETE previous unused + INSERT new
  FindValidOTP(phone,code,purpose) → SELECT WHERE ... AND used=false AND expires_at > NOW()
  MarkOTPUsed(otpID)         → UPDATE SET used=true WHERE id=?
  DeleteExpiredOTPs()        → DELETE WHERE expires_at < NOW() OR used=true
```

**Key behavior — `CreateOTP`:**
Before inserting a new OTP, any previous **unused** OTPs for the same `phone + purpose` are
deleted. This means only the most recently sent OTP code is ever valid — resending doesn't
stack up multiple valid codes.

---

#### `internal/auth/routes/` — Route Registration

**File:** `auth_routes.go`

A single function `RegisterAuthRoutes(router, handler)` that wires HTTP verbs and paths to
handler methods. Keeping routing separate from `main.go` keeps `main.go` clean and allows routes
to be tested independently.

```
POST  /auth/register        → h.Register
POST  /auth/login           → h.Login
POST  /auth/logout          → h.Logout
POST  /auth/refresh         → h.RefreshToken
POST  /auth/otp/send        → h.SendOTP
POST  /auth/otp/verify      → h.VerifyOTP
POST  /auth/password/forgot → h.ForgotPassword
POST  /auth/password/reset  → h.ResetPassword
```

---

#### `internal/auth/usecase/` — Business Logic

**File:** `auth_usecase.go`

The use-case is the **core** of the application. It:
- Receives DTOs from the handler
- Applies business rules (uniqueness, state checks, password complexity)
- Orchestrates the repository, JWT service, and SMS service
- Returns DTOs to the handler

The interface (`AuthUseCase`) is defined in the same file, enabling mock implementations for unit tests.

**Use-case dependencies:**

```
authUseCase
  ├── repo      AuthRepository     ← data persistence
  ├── jwtSvc    *jwtpkg.JWTService ← token generation/validation
  ├── smsSvc    *twiliopkg.SMSService ← SMS delivery
  └── otpExpiry int                ← OTP lifetime in minutes
```

**OTP generation:**
OTPs are generated using Go's `crypto/rand` package (not `math/rand`). This ensures the codes are
**cryptographically random** and cannot be predicted even if an attacker knows previous OTPs.

---

#### `internal/auth/validator/` — Domain Validators

**File:** `auth_validator.go`

Three pure validation functions with no dependencies:

| Function | What It Checks |
|---|---|
| `ValidatePassword(pwd)` | ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit |
| `ValidatePhone(phone)` | Matches E.164 regex: `^\+?[1-9]\d{6,19}$` |
| `ValidateOTPCode(code)` | Exactly 6 characters, all digits |

These are called from the **use-case**, not the handler. This means validation happens at the
business-logic layer (not just the HTTP layer) — the rules are enforced even if the use-case
is called programmatically without going through HTTP.

---

### `internal/user/`

```
internal/user/
├── dto/
├── entity/
├── events/
├── handler/
├── mapper/
├── repository/
├── routes/
├── usecase/
└── validator/
```

Same 9-layer structure as `internal/auth/`. This feature handles user profile management
(view profile, update name/phone, change password, etc.) as a separate domain from authentication.
Currently scaffolded with the same structure — populated as the feature is developed.

---

### `internal/common/`

```
internal/common/
├── apperror/
│   └── apperror.go    ← Structured application errors with HTTP status codes
└── response/
    └── response.go    ← Uniform JSON response helpers (OK, Created, BadRequest, Error, ...)
```

#### `internal/common/apperror/`

`AppError` is the **single error type** used across the entire service. It carries:
- `Code int` — the HTTP status code to return
- `Message string` — the human-readable error message

Pre-defined sentinel errors (reused across use-cases):

```go
ErrUserNotFound       → 404 "user not found"
ErrEmailTaken         → 409 "email already in use"
ErrPhoneTaken         → 409 "phone number already in use"
ErrInvalidCredentials → 401 "invalid email or password"
ErrUserBlocked        → 403 "your account has been blocked"
ErrUserNotVerified    → 403 "please verify your phone number first"
ErrInvalidToken       → 401 "invalid or expired token"
ErrInvalidOTP         → 400 "invalid or expired OTP code"
ErrOTPAlreadyUsed     → 400 "OTP has already been used"
ErrTokenNotFound      → 404 "refresh token not found"
```

Handlers call `response.Error(c, err)` which type-asserts the error to `*AppError` to pick the
correct HTTP status code automatically.

#### `internal/common/response/`

Helper functions that write uniform JSON responses. Every handler uses these — no handler ever
calls `c.JSON()` or `c.Status()` directly.

```go
response.OK(c, data)           → 200 { success: true, data: ... }
response.Created(c, data)      → 201 { success: true, data: ... }
response.Success(c, message)   → 200 { success: true, message: ... }
response.BadRequest(c, msg)    → 400 { success: false, error: msg }
response.Error(c, err)         → <status from AppError> { success: false, error: msg }
```

---

### `internal/config/`

```
internal/config/
└── config.go
```

Loads all configuration from `.env` file (via `godotenv`) and falls back to OS environment
variables. Returns a single `*Config` struct with nested sub-configs:

```
Config
  ├── App      { Port, Env }
  ├── DB       { Host, Port, Name, User, Password }  + DSN() method
  ├── JWT      { AccessSecret, RefreshSecret, AccessExpiryMinutes, RefreshExpiryDays }
  ├── Twilio   { AccountSID, AuthToken, PhoneNumber }
  └── OTP      { ExpiryMinutes, CodeLength }
```

`config.Load()` **fails fast** if any required Twilio credentials are missing (since the service
cannot function without SMS delivery). Other settings have safe defaults.

---

### `internal/middleware/`

```
internal/middleware/
└── auth_middleware.go
```

Two middleware factories:

#### `AuthMiddleware(jwtSvc)`
Guards a Fiber route group. Validates the `Authorization: Bearer <token>` header, parses the JWT,
and stores the decoded claims in **Fiber locals** for downstream handlers:

```
c.Locals("userID")    → uint   (the authenticated user's ID)
c.Locals("userEmail") → string (the authenticated user's email)
c.Locals("userRole")  → string (the authenticated user's role, e.g. "user", "admin")
```

#### `RequireRole(role)`
**Must be chained after** `AuthMiddleware`. Checks that `c.Locals("userRole")` matches the
required role — returns `403 Forbidden` otherwise.

**Usage example:**
```go
protected := app.Group("/api/admin", middleware.AuthMiddleware(jwtSvc))
protected.Get("/users", middleware.RequireRole("admin"), adminHandler.ListUsers)
```

---

## `pkg/` — Reusable Packages

```
pkg/
├── database/    ← PostgreSQL connection
├── hashpkg/     ← bcrypt password hashing
├── jwtpkg/      ← JWT tokens
└── twiliopkg/   ← Twilio SMS
```

`pkg/` is the place for **infrastructure concerns** that have no knowledge of the application's
domain. They depend on nothing in `internal/`.

---

### `pkg/database/`

**File:** `database.go`

Opens a GORM connection to PostgreSQL and runs `AutoMigrate` for all three entity tables on startup:

```go
db.AutoMigrate(
    &entity.User{},
    &entity.RefreshToken{},
    &entity.OTP{},
)
```

> AutoMigrate only adds columns/tables — it never drops existing columns. Safe to run on every
> startup in development. In production, use versioned SQL migrations instead.

---

### `pkg/hashpkg/`

**File:** `hash.go`

Two functions wrapping `golang.org/x/crypto/bcrypt`:

| Function | Purpose |
|---|---|
| `HashPassword(password)` | Generates a bcrypt hash with cost=10 |
| `CheckPasswordHash(password, hash)` | Constant-time comparison (timing-attack safe) |

bcrypt at cost 10 takes ~100ms per hash — slow enough to make brute-force impractical.

---

### `pkg/jwtpkg/`

**File:** `jwt.go`

`JWTService` handles all JWT operations:

| Method | Purpose |
|---|---|
| `GenerateAccessToken(userID, email, role)` | Creates a short-lived HS256 JWT (default 15 min) |
| `GenerateRefreshToken(userID, email, role)` | Creates a long-lived HS256 JWT (default 7 days) |
| `ValidateAccessToken(tokenStr)` | Parses + validates; returns `*Claims` |
| `ValidateRefreshToken(tokenStr)` | Parses + validates; returns `*Claims` |

**Two separate secrets** are used for access vs. refresh tokens. This means:
- Compromising the access secret does NOT allow forging refresh tokens
- Refresh tokens can be rotated to a new secret without invalidating access tokens

---

### `pkg/twiliopkg/`

**File:** `twilio.go`

`SMSService` wraps the official Twilio Go SDK:

| Method | SMS Message Sent |
|---|---|
| `SendOTP(phone, code)` | `"Your Velocity verification code is: 483920 ..."` |
| `SendPasswordResetOTP(phone, code)` | `"Your Velocity password reset code is: 192837 ..."` |

Both delegate to the private `send()` method which calls `client.Api.CreateMessage()`.

---

## `docs/` — Documentation

```
docs/
├── auth.md             ← Authentication API reference (flows, endpoints, examples)
└── folder_structure.md ← This document
```

Hand-written markdown documentation. Not auto-generated — kept accurate by developers as the
codebase evolves.

---

## `migrations/` — Database Migrations

```
migrations/    (currently empty)
```

Reserved for versioned SQL migration files (e.g., `000001_create_users.up.sql`). While GORM
AutoMigrate is used during development, production deployments should use explicit SQL migrations
managed by a tool like `golang-migrate` for full control over schema changes.

---

## `scripts/` — Developer Scripts

```
scripts/    (currently empty)
```

Intended for helper scripts such as:
- Database seed scripts
- Code generation scripts
- Lint/format runners
- Docker build helpers

---

## `tests/` — Test Suite

```
tests/    (currently empty)
```

Intended for integration and end-to-end tests. Unit tests live alongside the code they test in
`*_test.go` files (Go convention). The `tests/` directory is for tests that require a running
database or HTTP server.

---

## Root Files

| File | Purpose |
|---|---|
| `.env` | Local environment variables. **Never commit real secrets.** |
| `go.mod` | Module name (`github.com/velocity-dashboard/identity-service`), Go version, and direct dependencies |
| `go.sum` | Cryptographic checksums of all dependency versions — the dependency lock file |

**Key dependencies in `go.mod`:**

| Dependency | Role |
|---|---|
| `github.com/gofiber/fiber/v2` | HTTP web framework |
| `gorm.io/gorm` + `gorm.io/driver/postgres` | ORM + PostgreSQL driver |
| `github.com/golang-jwt/jwt/v5` | JWT generation and validation |
| `golang.org/x/crypto` | bcrypt password hashing |
| `github.com/twilio/twilio-go` | Twilio SMS client |
| `github.com/go-playground/validator/v10` | Struct validation |
| `github.com/joho/godotenv` | `.env` file loader |

---

## Dependency Flow Diagram

Data flows strictly downward — no layer reaches upward into a layer above it.

```
HTTP Request
     │
     ▼
┌─────────────┐
│   handler/  │  Parse JSON → Validate struct → Call use-case → Write response
└──────┬──────┘
       │ calls
       ▼
┌─────────────┐
│  usecase/   │  Business rules → Orchestrate dependencies
└──────┬──────┘
       │ calls
   ┌───┼────────────────┐
   ▼   ▼                ▼
┌──────┐  ┌─────────┐  ┌──────────┐
│ repo │  │ jwtpkg  │  │ twiliopkg│
│ (DB) │  │ (JWT)   │  │ (SMS)    │
└──────┘  └─────────┘  └──────────┘
   │
   ▼
PostgreSQL
```

**Shared by all layers:**
- `dto/` — request/response shapes passed between handler and use-case
- `entity/` — domain models passed between use-case and repository
- `mapper/` — converts entity → DTO (called by use-case, not handler)
- `validator/` — domain validation (called by use-case)
- `common/apperror/` — error type (used everywhere)
- `common/response/` — response helpers (used only by handler)

---

## Layer Responsibilities

| Layer | Knows About | Does NOT Know About |
|---|---|---|
| `handler` | HTTP (Fiber), DTOs, `response` pkg | Database, JWT secrets, bcrypt |
| `usecase` | DTOs, entities, repo interface, JWT, SMS, validators | HTTP, Fiber, raw SQL |
| `repository` | Entities, GORM, SQL | DTOs, business rules, HTTP |
| `mapper` | DTOs + entities | HTTP, DB, business logic |
| `validator` | Primitive types (string) | Everything else |
| `dto` | JSON struct tags | Everything else |
| `entity` | GORM struct tags | HTTP, business rules |
| `pkg/*` | Their specific infrastructure concern | Application domain |

---

## Naming Conventions

| Pattern | Example | Rule |
|---|---|---|
| File names | `auth_handler.go` | `<feature>_<layer>.go` |
| Package names | `package handler` | Lowercase, single word = the layer name |
| Struct names | `AuthHandler`, `AuthUseCase` | `<Feature><Layer>` |
| Interface + impl | `AuthRepository` (interface), `authRepository` (struct) | Interface is exported, impl is unexported |
| Constructor | `NewAuthHandler(uc)` | `New<Struct>(<deps>)` |
| Entity table names | `users`, `refresh_tokens`, `otps` | Explicit via `TableName()` method — plural snake_case |
| DTO field tags | `json:"full_name"` | snake_case JSON keys |
| Error sentinels | `ErrEmailTaken` | `Err<PascalCase>` in `apperror` package |
