package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	App    AppConfig
	DB     DBConfig
	JWT    JWTConfig
	Twilio TwilioConfig
	OTP    OTPConfig
}

// AppConfig holds general application settings.
type AppConfig struct {
	Port string
	Env  string
}

// DBConfig holds PostgreSQL connection parameters.
type DBConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
}

// DSN returns the PostgreSQL DSN for GORM.
func (d DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s dbname=%s user=%s password=%s sslmode=disable TimeZone=UTC",
		d.Host,
		d.Port,
		d.Name,
		d.User,
		d.Password,
	)
}

// JWTConfig holds JWT configuration.
type JWTConfig struct {
	AccessSecret        string
	RefreshSecret       string
	AccessExpiryMinutes int
	RefreshExpiryDays   int
}

// TwilioConfig holds Twilio credentials.
type TwilioConfig struct {
	AccountSID  string
	AuthToken   string
	PhoneNumber string
}

// OTPConfig holds OTP settings.
type OTPConfig struct {
	ExpiryMinutes int
	CodeLength    int
}

// Load loads configuration from .env and environment variables.
func Load() (*Config, error) {

	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("[config] .env file not found — reading from process environment")
	}

	cfg := &Config{
		App: AppConfig{
			Port: getEnv("APP_PORT", "8081"),
			Env:  getEnv("APP_ENV", "development"),
		},

		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			Name:     getEnv("DB_NAME", "velocity"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
		},

		JWT: JWTConfig{
			AccessSecret:        getEnv("JWT_ACCESS_SECRET", "change-me"),
			RefreshSecret:       getEnv("JWT_REFRESH_SECRET", "change-me"),
			AccessExpiryMinutes: getEnvInt("JWT_ACCESS_EXPIRY_MINUTES", 15),
			RefreshExpiryDays:   getEnvInt("JWT_REFRESH_EXPIRY_DAYS", 7),
		},

		Twilio: TwilioConfig{
			AccountSID:  getEnv("TWILIO_ACCOUNT_SID", ""),
			AuthToken:   getEnv("TWILIO_AUTH_TOKEN", ""),
			PhoneNumber: getEnv("TWILIO_PHONE_NUMBER", ""),
		},

		OTP: OTPConfig{
			ExpiryMinutes: getEnvInt("OTP_EXPIRY_MINUTES", 10),
			CodeLength:    getEnvInt("OTP_CODE_LENGTH", 6),
		},
	}

	// Check required Twilio configuration
	if cfg.Twilio.AccountSID == "" {
		return nil, fmt.Errorf("TWILIO_ACCOUNT_SID is not set")
	}

	if cfg.Twilio.AuthToken == "" {
		return nil, fmt.Errorf("TWILIO_AUTH_TOKEN is not set")
	}

	if cfg.Twilio.PhoneNumber == "" {
		return nil, fmt.Errorf("TWILIO_PHONE_NUMBER is not set")
	}

	return cfg, nil
}

// getEnv returns the value of an environment variable or a default.
func getEnv(key, defaultVal string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultVal
}

// getEnvInt returns an integer environment variable or a default.
func getEnvInt(key string, defaultVal int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultVal
}