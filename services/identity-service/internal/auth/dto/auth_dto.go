package dto

import "time"

// RegisterRequest is the payload for POST /auth/register.
type RegisterRequest struct {
	FullName string `json:"full_name" validate:"required,min=2,max=50"`
	Email    string `json:"email"     validate:"required,email,max=50"`
	Phone    string `json:"phone"     validate:"required,min=7,max=20"`
	Password string `json:"password"  validate:"required,min=8,max=72"`
}

// LoginRequest is the payload for POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// RefreshTokenRequest is the payload for POST /auth/refresh.
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// LogoutRequest is the payload for POST /auth/logout.
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// SendOTPRequest is the payload for POST /auth/otp/send.
type SendOTPRequest struct {
	Phone   string `json:"phone"   validate:"required,min=7,max=20"`
	Purpose string `json:"purpose" validate:"required,oneof=verify reset_password"`
}

// VerifyOTPRequest is the payload for POST /auth/otp/verify.
type VerifyOTPRequest struct {
	Phone   string `json:"phone"   validate:"required"`
	Code    string `json:"code"    validate:"required,len=6"`
	Purpose string `json:"purpose" validate:"required,oneof=verify reset_password"`
}

// ForgotPasswordRequest is the payload for POST /auth/password/forgot.
type ForgotPasswordRequest struct {
	Phone   string `json:"phone"   validate:"required"`
}

// ResetPasswordRequest is the payload for POST /auth/password/reset.
type ResetPasswordRequest struct {
	Phone       string `json:"phone"        validate:"required"`
	Code        string `json:"code"         validate:"required,len=6"`
	NewPassword string `json:"new_password" validate:"required,min=8,max=72"`
}

// ──────────────────────────────────────────────────────────────
//  Response DTOs
// ──────────────────────────────────────────────────────────────

// UserResponse is the safe public representation of a user.
type UserResponse struct {
	ID         uint      `json:"id"`
	FullName   string    `json:"full_name"`
	Email      string    `json:"email"`
	Phone      string    `json:"phone"`
	Role       string    `json:"role"`
	IsBlocked  bool      `json:"is_blocked"`
	IsVerified bool      `json:"is_verified"`
	CreatedAt  time.Time `json:"created_at"`
}

// LoginResponse is returned on a successful login.
type LoginResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	TokenType    string       `json:"token_type"`
	ExpiresIn    int          `json:"expires_in"` // seconds
	User         UserResponse `json:"user"`
}

// RegisterResponse is returned on a successful registration.
type RegisterResponse struct {
	Message string       `json:"message"`
	User    UserResponse `json:"user"`
}

// TokenResponse is returned on a successful token refresh.
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// MessageResponse is a generic success message response.
type MessageResponse struct {
	Message string `json:"message"`
}
