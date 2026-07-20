package jwtpkg

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the JWT payload for both access and refresh tokens.
type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// JWTService handles token generation and validation.
type JWTService struct {
	accessSecret        []byte
	refreshSecret       []byte
	accessExpiryMinutes int
	refreshExpiryDays   int
}

// NewJWTService creates a JWTService with the given secrets and expiry settings.
func NewJWTService(accessSecret, refreshSecret string, accessExpMin, refreshExpDays int) *JWTService {
	return &JWTService{
		accessSecret:        []byte(accessSecret),
		refreshSecret:       []byte(refreshSecret),
		accessExpiryMinutes: accessExpMin,
		refreshExpiryDays:   refreshExpDays,
	}
}

// GenerateAccessToken creates a signed JWT access token.
// Returns the token string, its lifetime in seconds, and any error.
func (s *JWTService) GenerateAccessToken(userID uint, email, role string) (string, int, error) {
	expiry := time.Duration(s.accessExpiryMinutes) * time.Minute
	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "velocity-identity",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.accessSecret)
	if err != nil {
		return "", 0, err
	}
	return signed, int(expiry.Seconds()), nil
}

// GenerateRefreshToken creates a signed JWT refresh token.
// Returns the token string, its absolute expiry time, and any error.
func (s *JWTService) GenerateRefreshToken(userID uint, email, role string) (string, time.Time, error) {
	expiresAt := time.Now().AddDate(0, 0, s.refreshExpiryDays)
	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "velocity-identity",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.refreshSecret)
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiresAt, nil
}

// ValidateAccessToken parses and validates an access token, returning its claims.
func (s *JWTService) ValidateAccessToken(tokenStr string) (*Claims, error) {
	return s.validate(tokenStr, s.accessSecret)
}

// ValidateRefreshToken parses and validates a refresh token, returning its claims.
func (s *JWTService) ValidateRefreshToken(tokenStr string) (*Claims, error) {
	return s.validate(tokenStr, s.refreshSecret)
}

func (s *JWTService) validate(tokenStr string, secret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
