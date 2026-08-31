package entity

import "time"

// User is the core user domain model.
// It is the single source of truth for user data across the identity service.
type User struct {
	ID            uint           `gorm:"primaryKey;autoIncrement"               json:"id"`
	FullName      string         `gorm:"size:50;not null"                       json:"full_name"`
	Email         string         `gorm:"size:50;uniqueIndex;not null"           json:"email"`
	Phone         string         `gorm:"size:20;uniqueIndex"                    json:"phone"`
	HashPassword  string         `gorm:"size:255"                               json:"-"`
	Role          string         `gorm:"size:30;default:user;not null;index"    json:"role"`
	IsBlocked     bool           `gorm:"default:false;not null"                 json:"is_blocked"`
	IsVerified    bool           `gorm:"column:is_verified;default:false;not null" json:"is_verified"`
	RefreshTokens []RefreshToken `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;" json:"-"`
	OTPs          []OTP          `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE;" json:"-"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// TableName sets the GORM table name explicitly.
func (User) TableName() string { return "users" }

// RefreshToken represents a persisted refresh token linked to a user.
type RefreshToken struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"      json:"id"`
	UserID    uint      `gorm:"not null;index"                json:"user_id"`
	Token     string    `gorm:"size:500;not null;uniqueIndex"  json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName sets the GORM table name explicitly.
func (RefreshToken) TableName() string { return "refresh_tokens" }

// OTP represents a one-time password record used for phone verification
// and password-reset flows.
type OTP struct {
	ID        uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint       `gorm:"not null;index"           json:"user_id"`
	Phone     string     `gorm:"size:20;not null"`
	Code      string     `gorm:"size:10;not null"`
	Purpose   OTPPurpose `gorm:"size:30;not null;index"`
	ExpiresAt time.Time  `json:"expires_at"`
	Used      bool       `gorm:"default:false"`
	CreatedAt time.Time  `json:"created_at"`
}

// TableName sets the GORM table name explicitly.
func (OTP) TableName() string { return "otps" }

// OTPPurpose is a typed string for OTP use-cases to avoid magic strings.
type OTPPurpose string

const (
	OTPPurposeVerify        OTPPurpose = "verify"
	OTPPurposeResetPassword OTPPurpose = "reset_password"
)

// Role constants
const (
	RoleUser   = "user"
	RoleSeller = "seller"
	RoleAdmin  = "admin"
)
