package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/velocity-dashboard/identity-service/internal/auth/handler"
)

// RegisterAuthRoutes mounts all authentication endpoints on the given Fiber router.
//
// Public routes (no authentication required):
//
//	POST  /auth/register           — Create a new account
//	POST  /auth/login              — Obtain access + refresh tokens
//	POST  /auth/logout             — Revoke a refresh token
//	POST  /auth/refresh            — Exchange refresh token for a new access token
//	POST  /auth/otp/send           — Send OTP via SMS
//	POST  /auth/otp/verify         — Verify OTP code
//	POST  /auth/password/forgot    — Trigger password-reset OTP
//	POST  /auth/password/reset     — Reset password using OTP
func RegisterAuthRoutes(router fiber.Router, h *handler.AuthHandler) {
	auth := router.Group("/auth")

	// ── Account ───────────────────────────────────────────────
	auth.Post("/register", h.Register)
	auth.Post("/login", h.Login)
	auth.Post("/logout", h.Logout)
	auth.Post("/refresh", h.RefreshToken)

	// ── OTP ───────────────────────────────────────────────────
	otp := auth.Group("/otp")
	otp.Post("/send", h.SendOTP)
	otp.Post("/verify", h.VerifyOTP)

	// ── Password ──────────────────────────────────────────────
	password := auth.Group("/password")
	password.Post("/forgot", h.ForgotPassword)
	password.Post("/reset", h.ResetPassword)
}
