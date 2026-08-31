package usecase

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"github.com/velocity-dashboard/identity-service/internal/auth/dto"
	"github.com/velocity-dashboard/identity-service/internal/auth/entity"
	"github.com/velocity-dashboard/identity-service/internal/auth/mapper"
	"github.com/velocity-dashboard/identity-service/internal/auth/repository"
	"github.com/velocity-dashboard/identity-service/internal/auth/validator"
	"github.com/velocity-dashboard/identity-service/internal/common/apperror"
	"github.com/velocity-dashboard/identity-service/pkg/hashpkg"
	"github.com/velocity-dashboard/identity-service/pkg/jwtpkg"
	"github.com/velocity-dashboard/identity-service/pkg/twiliopkg"
)

// AuthUseCase defines every auth business operation.
// Handlers call these methods; they have no knowledge of HTTP or the database.
type AuthUseCase interface {
	// Register creates a new user account and triggers a verification OTP via SMS.
	Register(req dto.RegisterRequest) (*dto.RegisterResponse, error)

	// Login verifies credentials and issues an access + refresh token pair.
	Login(req dto.LoginRequest) (*dto.LoginResponse, error)

	// Logout revokes the given refresh token so it can no longer be exchanged.
	Logout(refreshToken string) error

	// RefreshToken validates a refresh token and issues a new access token.
	RefreshToken(refreshToken string) (*dto.TokenResponse, error)

	// SendOTP generates a new OTP for the given phone number and purpose,
	// persists it, and delivers it via Twilio SMS.
	SendOTP(req dto.SendOTPRequest) error

	// VerifyOTP validates the supplied code. On a successful "verify" purpose
	// it marks the user's account as verified (is_verified = true).
	VerifyOTP(req dto.VerifyOTPRequest) error

	// ForgotPassword looks up the user by email and sends a password-reset OTP.
	// Always returns nil to prevent email enumeration.
	ForgotPassword(req dto.ForgotPasswordRequest) error

	// ResetPassword verifies the reset OTP, updates the password hash, and
	// invalidates all existing refresh tokens for that user.
	ResetPassword(req dto.ResetPasswordRequest) error
}

// ──────────────────────────────────────────────────────────────
//  Implementation
// ──────────────────────────────────────────────────────────────

type authUseCase struct {
	repo      repository.AuthRepository
	jwtSvc    *jwtpkg.JWTService
	smsSvc    *twiliopkg.SMSService
	otpExpiry int // minutes
}

// NewAuthUseCase wires all dependencies and returns an AuthUseCase.
func NewAuthUseCase(
	repo repository.AuthRepository,
	jwtSvc *jwtpkg.JWTService,
	smsSvc *twiliopkg.SMSService,
	otpExpiryMinutes int,
) AuthUseCase {
	return &authUseCase{
		repo:      repo,
		jwtSvc:    jwtSvc,
		smsSvc:    smsSvc,
		otpExpiry: otpExpiryMinutes,
	}
}

// ── Register ──────────────────────────────────────────────────

func (uc *authUseCase) Register(req dto.RegisterRequest) (*dto.RegisterResponse, error) {
	// 1. Validate password complexity beyond the basic length check.
	if err := validator.ValidatePassword(req.Password); err != nil {
		return nil, apperror.BadRequest(err.Error())
	}

	// 2. Validate phone is E.164 format.
	if err := validator.ValidatePhone(req.Phone); err != nil {
		return nil, apperror.BadRequest(err.Error())
	}

	// 3. Email uniqueness check.
	if _, err := uc.repo.FindUserByEmail(req.Email); err == nil {
		return nil, apperror.ErrEmailTaken
	}

	// 4. Phone uniqueness check.
	if _, err := uc.repo.FindUserByPhone(req.Phone); err == nil {
		return nil, apperror.ErrPhoneTaken
	}

	// 5. Hash the password before persistence.
	hashedPwd, err := hashpkg.HashPassword(req.Password)
	if err != nil {
		return nil, apperror.InternalServerError("failed to hash password")
	}

	role := req.Role
	if role == "" {
		role = entity.RoleUser
	}

	// 6. Persist the new user.
	user := &entity.User{
		FullName:     req.FullName,
		Email:        req.Email,
		Phone:        req.Phone,
		HashPassword: hashedPwd,
		Role:         role,
		IsVerified:   false,
		IsBlocked:    false,
	}

	created, err := uc.repo.CreateUser(user)
	if err != nil {
		return nil, apperror.InternalServerError("failed to create user account")
	}

	// 7. Send verification OTP (non-blocking — failure does not roll back registration).
	_ = uc.sendOTPToUser(created, entity.OTPPurposeVerify)

	resp := mapper.ToRegisterResponse(created)
	return &resp, nil
}

// ── Login ─────────────────────────────────────────────────────

func (uc *authUseCase) Login(req dto.LoginRequest) (*dto.LoginResponse, error) {
	// 1. Look up user.
	user, err := uc.repo.FindUserByEmail(req.Email)
	if err != nil {
		// Return a generic error to prevent email enumeration.
		return nil, apperror.ErrInvalidCredentials
	}

	// 2. Guard: blocked account.
	if user.IsBlocked {
		return nil, apperror.ErrUserBlocked
	}

	// 3. Guard: unverified account.
	if !user.IsVerified {
		return nil, apperror.ErrUserNotVerified
	}

	// 4. Compare password.
	if !hashpkg.CheckPasswordHash(req.Password, user.HashPassword) {
		return nil, apperror.ErrInvalidCredentials
	}

	// 5. Issue access token.
	accessToken, expiresIn, err := uc.jwtSvc.GenerateAccessToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, apperror.InternalServerError("failed to generate access token")
	}

	// 6. Issue refresh token.
	refreshToken, refreshExpiresAt, err := uc.jwtSvc.GenerateRefreshToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, apperror.InternalServerError("failed to generate refresh token")
	}

	// 7. Persist refresh token.
	if err := uc.repo.CreateRefreshToken(&entity.RefreshToken{
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: refreshExpiresAt,
	}); err != nil {
		return nil, apperror.InternalServerError("failed to save session")
	}

	return &dto.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    expiresIn,
		User:         mapper.ToUserResponse(user),
	}, nil
}

// ── Logout ────────────────────────────────────────────────────

func (uc *authUseCase) Logout(refreshToken string) error {
	// Confirm the token exists before deleting (avoid silent no-ops).
	if _, err := uc.repo.FindRefreshToken(refreshToken); err != nil {
		return apperror.ErrTokenNotFound
	}
	return uc.repo.DeleteRefreshToken(refreshToken)
}

// ── RefreshToken ──────────────────────────────────────────────

func (uc *authUseCase) RefreshToken(refreshToken string) (*dto.TokenResponse, error) {
	// 1. Validate JWT signature and expiry claim.
	claims, err := uc.jwtSvc.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, apperror.ErrInvalidToken
	}

	// 2. Confirm the token is still in the DB (not already logged out).
	stored, err := uc.repo.FindRefreshToken(refreshToken)
	if err != nil {
		return nil, apperror.ErrTokenNotFound
	}

	// 3. Double-check server-side expiry.
	if time.Now().After(stored.ExpiresAt) {
		_ = uc.repo.DeleteRefreshToken(refreshToken)
		return nil, apperror.ErrInvalidToken
	}

	// 4. Reload user to pick up any role / block status changes since last login.
	user, err := uc.repo.FindUserByID(claims.UserID)
	if err != nil {
		return nil, apperror.ErrUserNotFound
	}
	if user.IsBlocked {
		return nil, apperror.ErrUserBlocked
	}

	// 5. Issue a fresh access token.
	accessToken, expiresIn, err := uc.jwtSvc.GenerateAccessToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, apperror.InternalServerError("failed to generate access token")
	}

	return &dto.TokenResponse{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresIn:   expiresIn,
	}, nil
}

// ── SendOTP ───────────────────────────────────────────────────

func (uc *authUseCase) SendOTP(req dto.SendOTPRequest) error {
	// Validate phone format.
	if err := validator.ValidatePhone(req.Phone); err != nil {
		return apperror.BadRequest(err.Error())
	}

	user, err := uc.repo.FindUserByPhone(req.Phone)
	if err != nil {
		return apperror.ErrUserNotFound
	}

	return uc.sendOTPToUser(user, entity.OTPPurpose(req.Purpose))
}

// ── VerifyOTP ─────────────────────────────────────────────────

func (uc *authUseCase) VerifyOTP(req dto.VerifyOTPRequest) error {
	// Validate the code format (6 digits).
	if err := validator.ValidateOTPCode(req.Code); err != nil {
		return apperror.BadRequest(err.Error())
	}

	// Look up a matching, unexpired, unused OTP record.
	otp, err := uc.repo.FindValidOTP(req.Phone, req.Code, entity.OTPPurpose(req.Purpose))
	if err != nil {
		return err // already an *apperror.AppError
	}

	// Mark as used so it cannot be replayed.
	if err := uc.repo.MarkOTPUsed(otp.ID); err != nil {
		return apperror.InternalServerError("failed to invalidate OTP")
	}

	// For the "verify" purpose — flip is_verified on the user.
	if otp.Purpose == entity.OTPPurposeVerify {
		user, err := uc.repo.FindUserByPhone(req.Phone)
		if err != nil {
			return err
		}
		user.IsVerified = true
		if err := uc.repo.UpdateUser(user); err != nil {
			return apperror.InternalServerError("failed to verify account")
		}
	}

	return nil
}

// ── ForgotPassword ────────────────────────────────────────────

func (uc *authUseCase) ForgotPassword(req dto.ForgotPasswordRequest) error {
	user, err := uc.repo.FindUserByEmail(req.Phone)
	if err != nil {
		// Silently ignore — prevents email enumeration.
		return nil
	}
	return uc.sendOTPToUser(user, entity.OTPPurposeResetPassword)
}

// ── ResetPassword ─────────────────────────────────────────────

func (uc *authUseCase) ResetPassword(req dto.ResetPasswordRequest) error {
	// 1. Validate the new password meets complexity rules.
	if err := validator.ValidatePassword(req.NewPassword); err != nil {
		return apperror.BadRequest(err.Error())
	}

	// 2. Verify the reset OTP.
	otp, err := uc.repo.FindValidOTP(req.Phone, req.Code, entity.OTPPurposeResetPassword)
	if err != nil {
		return err
	}

	// 3. Consume the OTP immediately.
	if err := uc.repo.MarkOTPUsed(otp.ID); err != nil {
		return apperror.InternalServerError("failed to invalidate OTP")
	}

	// 4. Load the user.
	user, err := uc.repo.FindUserByPhone(req.Phone)
	if err != nil {
		return err
	}

	// 5. Hash and persist the new password.
	newHash, err := hashpkg.HashPassword(req.NewPassword)
	if err != nil {
		return apperror.InternalServerError("failed to hash new password")
	}
	user.HashPassword = newHash
	if err := uc.repo.UpdateUser(user); err != nil {
		return apperror.InternalServerError("failed to update password")
	}

	// 6. Invalidate all active sessions so the old password cannot be used.
	_ = uc.repo.DeleteAllUserRefreshTokens(user.ID)

	return nil
}

// ──────────────────────────────────────────────────────────────
//  Internal helpers
// ──────────────────────────────────────────────────────────────

// sendOTPToUser generates a cryptographically random OTP, persists it,
// and sends it to the user's registered phone via Twilio SMS.
func (uc *authUseCase) sendOTPToUser(user *entity.User, purpose entity.OTPPurpose) error {
	code, err := generateOTPCode(6)
	if err != nil {
		return apperror.InternalServerError("failed to generate OTP code")
	}

	otp := &entity.OTP{
		UserID:    user.ID,
		Phone:     user.Phone,
		Code:      code,
		Purpose:   purpose,
		ExpiresAt: time.Now().Add(time.Duration(uc.otpExpiry) * time.Minute),
	}

	if _, err := uc.repo.CreateOTP(otp); err != nil {
		return apperror.InternalServerError("failed to persist OTP")
	}

	// Dispatch the SMS.
	switch purpose {
	case entity.OTPPurposeResetPassword:
		return uc.smsSvc.SendPasswordResetOTP(user.Phone, code)
	default:
		return uc.smsSvc.SendOTP(user.Phone, code)
	}
}

// generateOTPCode returns a cryptographically random numeric string of the
// given length. Uses crypto/rand so it is safe against prediction attacks.
func generateOTPCode(length int) (string, error) {
	const digits = "0123456789"
	buf := make([]byte, length)
	for i := range buf {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", fmt.Errorf("generateOTPCode: %w", err)
		}
		buf[i] = digits[n.Int64()]
	}
	return string(buf), nil
}
