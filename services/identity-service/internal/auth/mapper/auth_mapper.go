package mapper

import (
	"github.com/velocity-dashboard/identity-service/internal/auth/dto"
	"github.com/velocity-dashboard/identity-service/internal/auth/entity"
)

// ToUserResponse converts a User entity to the safe public-facing UserResponse DTO.
// Sensitive fields (HashPassword) are never included.
func ToUserResponse(u *entity.User) dto.UserResponse {
	return dto.UserResponse{
		ID:         u.ID,
		FullName:   u.FullName,
		Email:      u.Email,
		Phone:      u.Phone,
		Role:       u.Role,
		IsBlocked:  u.IsBlocked,
		IsVerified: u.IsVerified,
		CreatedAt:  u.CreatedAt,
	}
}

// ToRegisterResponse wraps a UserResponse in the registration envelope.
func ToRegisterResponse(u *entity.User) dto.RegisterResponse {
	return dto.RegisterResponse{
		Message: "Registration successful. A verification OTP has been sent to your phone.",
		User:    ToUserResponse(u),
	}
}
