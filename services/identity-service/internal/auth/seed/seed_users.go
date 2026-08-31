package seed

import (
	"fmt"

	"github.com/velocity-dashboard/identity-service/internal/auth/entity"
	"github.com/velocity-dashboard/identity-service/pkg/hashpkg"
	"gorm.io/gorm"
)

func mustHash(password string) string {
	hash, err := hashpkg.HashPassword(password)
	if err != nil {
		panic(err)
	}
	return hash
}

func SeedUsers(db *gorm.DB) {
	users := []entity.User{
		{
			FullName:     "Admin User",
			Email:        "admin@example.com",
			Phone:        "1234567890",
			HashPassword: mustHash("password"),
			Role:         entity.RoleAdmin,
			IsBlocked:    false,
			IsVerified:   true,
		},
		{
			FullName:     "Seller User",
			Email:        "seller@example.com",
			Phone:        "1234567891",
			HashPassword: mustHash("password"),
			Role:         entity.RoleSeller,
			IsBlocked:    false,
			IsVerified:   true,
		},
		{
			FullName:     "Regular User",
			Email:        "seller1@example.com",
			Phone:        "1234567892",
			HashPassword: mustHash("password"),
			Role:         entity.RoleSeller,
			IsBlocked:    false,
			IsVerified:   true,
		},
		{
			FullName:     "Regular User",
			Email:        "seller2@example.com",
			Phone:        "1234567893",
			HashPassword: mustHash("password"),
			Role:         entity.RoleSeller,
			IsBlocked:    false,
			IsVerified:   true,
		},
		{
			FullName:     "Regular User",
			Email:        "seller3@example.com",
			Phone:        "1234567894",
			HashPassword: mustHash("password"),
			Role:         entity.RoleSeller,
			IsBlocked:    false,
			IsVerified:   true,
		},
		{
			FullName:     "Regular User",
			Email:        "user1@example.com",
			Phone:        "1234567895",
			HashPassword: mustHash("password"),
			Role:         entity.RoleUser,
			IsBlocked:    false,
			IsVerified:   true,
		},
		{
			FullName:     "Regular User",
			Email:        "user2@example.com",
			Phone:        "1234567896",
			HashPassword: mustHash("password"),
			Role:         entity.RoleUser,
			IsBlocked:    false,
			IsVerified:   true,
		},
		{
			FullName:     "Regular User",
			Email:        "user3@example.com",
			Phone:        "1234567897",
			HashPassword: mustHash("password"),
			Role:         entity.RoleUser,
			IsBlocked:    false,
			IsVerified:   true,
		},
	}
	for _, u := range users {
		var user entity.User
		if err := db.Where("email = ?", u.Email).First(&user).Error; err != nil {
			fmt.Printf("Seeding user: %s\n", u.Email)
			db.Create(&u)
		}
	}
}
