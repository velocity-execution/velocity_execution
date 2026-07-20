package validator

import (
	"errors"
	"regexp"
	"unicode"
)

// phoneRegex matches E.164 format: optional +, then 7–19 digits.
var phoneRegex = regexp.MustCompile(`^\+?[1-9]\d{6,19}$`)

// ValidatePassword enforces password complexity:
//   - Minimum 8 characters
//   - At least one uppercase letter
//   - At least one lowercase letter
//   - At least one digit
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}

	var hasUpper, hasLower, hasDigit bool
	for _, ch := range password {
		switch {
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsDigit(ch):
			hasDigit = true
		}
	}

	if !hasUpper {
		return errors.New("password must contain at least one uppercase letter")
	}
	if !hasLower {
		return errors.New("password must contain at least one lowercase letter")
	}
	if !hasDigit {
		return errors.New("password must contain at least one digit")
	}

	return nil
}

// ValidatePhone checks that the phone number is in E.164 format.
func ValidatePhone(phone string) error {
	if !phoneRegex.MatchString(phone) {
		return errors.New("phone must be in E.164 format (e.g. +1234567890)")
	}
	return nil
}

// ValidateOTPCode checks that the OTP is exactly 6 numeric digits.
func ValidateOTPCode(code string) error {
	if len(code) != 6 {
		return errors.New("OTP must be exactly 6 digits")
	}
	for _, ch := range code {
		if !unicode.IsDigit(ch) {
			return errors.New("OTP must contain digits only")
		}
	}
	return nil
}
