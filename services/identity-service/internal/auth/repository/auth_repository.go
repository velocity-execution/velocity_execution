package repository

import (
	"time"

	"gorm.io/gorm"

	"github.com/velocity-dashboard/identity-service/internal/auth/entity"
	"github.com/velocity-dashboard/identity-service/internal/common/apperror"
)

// AuthRepository defines all database operations required by the auth use-case.
// The interface-first approach allows the use-case to be fully unit-tested
// with a mock implementation without touching the database.
type AuthRepository interface {
	// ── User ──────────────────────────────────────────────────

	// CreateUser inserts a new user record and returns the created entity.
	CreateUser(user *entity.User) (*entity.User, error)

	// FindUserByEmail looks up a user by email address.
	FindUserByEmail(email string) (*entity.User, error)

	// FindUserByPhone looks up a user by phone number.
	FindUserByPhone(phone string) (*entity.User, error)

	// FindUserByID looks up a user by primary key.
	FindUserByID(id uint) (*entity.User, error)

	// UpdateUser persists all field changes to an existing user.
	UpdateUser(user *entity.User) error

	// ── RefreshToken ──────────────────────────────────────────

	// CreateRefreshToken persists a new refresh-token record.
	CreateRefreshToken(token *entity.RefreshToken) error

	// FindRefreshToken looks up a stored refresh token by its value.
	FindRefreshToken(token string) (*entity.RefreshToken, error)

	// DeleteRefreshToken removes a single refresh token (logout).
	DeleteRefreshToken(token string) error

	// DeleteAllUserRefreshTokens removes every refresh token for a user
	// (used after a password reset to invalidate all active sessions).
	DeleteAllUserRefreshTokens(userID uint) error

	// ── OTP ───────────────────────────────────────────────────

	// CreateOTP persists a new OTP record. Any previous unused OTPs for the
	// same phone + purpose are automatically invalidated before insertion.
	CreateOTP(otp *entity.OTP) (*entity.OTP, error)

	// FindValidOTP looks up an unexpired, unused OTP that matches the
	// phone number, code, and purpose exactly.
	FindValidOTP(phone, code string, purpose entity.OTPPurpose) (*entity.OTP, error)

	// MarkOTPUsed sets used = true on the OTP so it cannot be reused.
	MarkOTPUsed(otpID uint) error

	// DeleteExpiredOTPs cleans up stale OTP rows (run periodically).
	DeleteExpiredOTPs() error
}

// ──────────────────────────────────────────────────────────────
//  PostgreSQL Implementation
// ──────────────────────────────────────────────────────────────

type authRepository struct {
	db *gorm.DB
}

// NewAuthRepository creates a new PostgreSQL-backed AuthRepository.
func NewAuthRepository(db *gorm.DB) AuthRepository {
	return &authRepository{db: db}
}

// ── User ──────────────────────────────────────────────────────

func (r *authRepository) CreateUser(user *entity.User) (*entity.User, error) {
	if err := r.db.Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func (r *authRepository) FindUserByEmail(email string) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, apperror.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *authRepository) FindUserByPhone(phone string) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("phone = ?", phone).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, apperror.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *authRepository) FindUserByID(id uint) (*entity.User, error) {
	var user entity.User
	err := r.db.First(&user, id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, apperror.ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (r *authRepository) UpdateUser(user *entity.User) error {
	return r.db.Save(user).Error
}

// ── RefreshToken ──────────────────────────────────────────────

func (r *authRepository) CreateRefreshToken(token *entity.RefreshToken) error {
	return r.db.Create(token).Error
}

func (r *authRepository) FindRefreshToken(token string) (*entity.RefreshToken, error) {
	var rt entity.RefreshToken
	err := r.db.Where("token = ?", token).First(&rt).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, apperror.ErrTokenNotFound
		}
		return nil, err
	}
	return &rt, nil
}

func (r *authRepository) DeleteRefreshToken(token string) error {
	return r.db.Where("token = ?", token).Delete(&entity.RefreshToken{}).Error
}

func (r *authRepository) DeleteAllUserRefreshTokens(userID uint) error {
	return r.db.Where("user_id = ?", userID).Delete(&entity.RefreshToken{}).Error
}

// ── OTP ───────────────────────────────────────────────────────

func (r *authRepository) CreateOTP(otp *entity.OTP) (*entity.OTP, error) {
	// Invalidate all previous unused OTPs for the same phone + purpose
	// so only the most recently sent code is ever valid.
	r.db.Where(
		"phone = ? AND purpose = ? AND used = false",
		otp.Phone, otp.Purpose,
	).Delete(&entity.OTP{})

	if err := r.db.Create(otp).Error; err != nil {
		return nil, err
	}
	return otp, nil
}

func (r *authRepository) FindValidOTP(phone, code string, purpose entity.OTPPurpose) (*entity.OTP, error) {
	var otp entity.OTP
	err := r.db.Where(
		"phone = ? AND code = ? AND purpose = ? AND used = false AND expires_at > ?",
		phone, code, purpose, time.Now(),
	).First(&otp).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, apperror.ErrInvalidOTP
		}
		return nil, err
	}
	return &otp, nil
}

func (r *authRepository) MarkOTPUsed(otpID uint) error {
	return r.db.Model(&entity.OTP{}).
		Where("id = ?", otpID).
		Update("used", true).Error
}

func (r *authRepository) DeleteExpiredOTPs() error {
	return r.db.
		Where("expires_at < ? OR used = true", time.Now()).
		Delete(&entity.OTP{}).Error
}
