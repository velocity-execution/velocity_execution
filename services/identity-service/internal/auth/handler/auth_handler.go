package handler

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"github.com/velocity-dashboard/identity-service/internal/auth/dto"
	"github.com/velocity-dashboard/identity-service/internal/auth/usecase"
	"github.com/velocity-dashboard/identity-service/internal/common/response"
)

// validate is a shared validator instance (thread-safe; reuse across handlers).
var validate = validator.New()

// AuthHandler holds a reference to the auth use-case and exposes Fiber handler methods.
type AuthHandler struct {
	uc usecase.AuthUseCase
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(uc usecase.AuthUseCase) *AuthHandler {
	return &AuthHandler{uc: uc}
}

// ──────────────────────────────────────────────────────────────
//  Registration & Login
// ──────────────────────────────────────────────────────────────

// Register godoc
// @Summary      Register a new user
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body dto.RegisterRequest true "Registration payload"
// @Success      201 {object} dto.RegisterResponse
// @Failure      400 {object} response.envelope
// @Failure      409 {object} response.envelope
// @Router       /auth/register [post]
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	res, err := h.uc.Register(req)
	if err != nil {
		return response.Error(c, err)
	}

	return response.Created(c, res)
}

// Login godoc
// @Summary      Login with email and password
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body dto.LoginRequest true "Login credentials"
// @Success      200 {object} dto.LoginResponse
// @Failure      400 {object} response.envelope
// @Failure      401 {object} response.envelope
// @Router       /auth/login [post]
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	res, err := h.uc.Login(req)
	if err != nil {
		return response.Error(c, err)
	}

	return response.OK(c, res)
}

// ──────────────────────────────────────────────────────────────
//  Token Management
// ──────────────────────────────────────────────────────────────

// Logout godoc
// @Summary      Logout (invalidate refresh token)
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body dto.LogoutRequest true "Refresh token"
// @Success      200 {object} dto.MessageResponse
// @Failure      400 {object} response.envelope
// @Router       /auth/logout [post]
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	var req dto.LogoutRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	if err := h.uc.Logout(req.RefreshToken); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, "Logged out successfully")
}

// RefreshToken godoc
// @Summary      Refresh access token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body dto.RefreshTokenRequest true "Refresh token"
// @Success      200 {object} dto.TokenResponse
// @Failure      401 {object} response.envelope
// @Router       /auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var req dto.RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	res, err := h.uc.RefreshToken(req.RefreshToken)
	if err != nil {
		return response.Error(c, err)
	}

	return response.OK(c, res)
}

// ──────────────────────────────────────────────────────────────
//  OTP
// ──────────────────────────────────────────────────────────────

// SendOTP godoc
// @Summary      Send OTP via SMS
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body dto.SendOTPRequest true "Phone and purpose"
// @Success      200 {object} dto.MessageResponse
// @Failure      400 {object} response.envelope
// @Router       /auth/otp/send [post]
func (h *AuthHandler) SendOTP(c *fiber.Ctx) error {
	var req dto.SendOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	if err := h.uc.SendOTP(req); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, "OTP sent successfully")
}

// VerifyOTP godoc
// @Summary      Verify OTP code
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body dto.VerifyOTPRequest true "OTP verification payload"
// @Success      200 {object} dto.MessageResponse
// @Failure      400 {object} response.envelope
// @Router       /auth/otp/verify [post]
func (h *AuthHandler) VerifyOTP(c *fiber.Ctx) error {
	var req dto.VerifyOTPRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	if err := h.uc.VerifyOTP(req); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, "OTP verified successfully")
}

// ──────────────────────────────────────────────────────────────
//  Password
// ──────────────────────────────────────────────────────────────

// ForgotPassword godoc
// @Summary      Request password reset OTP
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body dto.ForgotPasswordRequest true "Email address"
// @Success      200 {object} dto.MessageResponse
// @Router       /auth/password/forgot [post]
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req dto.ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	// Always succeed to prevent email enumeration.
	_ = h.uc.ForgotPassword(req)
	return response.Success(c, "If an account with that email exists, a reset OTP has been sent")
}

// ResetPassword godoc
// @Summary      Reset password using OTP
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body dto.ResetPasswordRequest true "Reset payload"
// @Success      200 {object} dto.MessageResponse
// @Failure      400 {object} response.envelope
// @Router       /auth/password/reset [post]
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req dto.ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	if err := h.uc.ResetPassword(req); err != nil {
		return response.Error(c, err)
	}

	return response.Success(c, "Password reset successfully. Please log in with your new password.")
}
