package apperror

import "net/http"

// AppError is a structured application error that carries an HTTP status code.
// Handlers type-assert incoming errors to *AppError to pick the correct status.
type AppError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (e *AppError) Error() string {
	return e.Message
}

// ──────────────────────────────────────────────────────────────
//  Constructors
// ──────────────────────────────────────────────────────────────

func New(code int, message string) *AppError {
	return &AppError{Code: code, Message: message}
}

func BadRequest(message string) *AppError {
	return New(http.StatusBadRequest, message)
}

func Unauthorized(message string) *AppError {
	return New(http.StatusUnauthorized, message)
}

func Forbidden(message string) *AppError {
	return New(http.StatusForbidden, message)
}

func NotFound(message string) *AppError {
	return New(http.StatusNotFound, message)
}

func Conflict(message string) *AppError {
	return New(http.StatusConflict, message)
}

func InternalServerError(message string) *AppError {
	return New(http.StatusInternalServerError, message)
}

// ──────────────────────────────────────────────────────────────
//  Sentinel errors (reusable across use-cases)
// ──────────────────────────────────────────────────────────────

var (
	ErrUserNotFound       = NotFound("user not found")
	ErrEmailTaken         = Conflict("email already in use")
	ErrPhoneTaken         = Conflict("phone number already in use")
	ErrInvalidCredentials = Unauthorized("invalid email or password")
	ErrUserBlocked        = Forbidden("your account has been blocked")
	ErrUserNotVerified    = Forbidden("please verify your phone number first")
	ErrInvalidToken       = Unauthorized("invalid or expired token")
	ErrInvalidOTP         = BadRequest("invalid or expired OTP code")
	ErrOTPAlreadyUsed     = BadRequest("OTP has already been used")
	ErrTokenNotFound      = NotFound("refresh token not found")
)
