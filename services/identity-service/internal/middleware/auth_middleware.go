package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/velocity-dashboard/identity-service/internal/common/apperror"
	"github.com/velocity-dashboard/identity-service/internal/common/response"
	"github.com/velocity-dashboard/identity-service/pkg/jwtpkg"
)

const (
	// LocalsKeyUserID is the Fiber locals key for the authenticated user's ID.
	LocalsKeyUserID = "userID"
	// LocalsKeyUserEmail is the Fiber locals key for the authenticated user's email.
	LocalsKeyUserEmail = "userEmail"
	// LocalsKeyUserRole is the Fiber locals key for the authenticated user's role.
	LocalsKeyUserRole = "userRole"
)

// AuthMiddleware validates the Bearer JWT access token on protected routes.
func AuthMiddleware(jwtSvc *jwtpkg.JWTService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return response.Error(c, apperror.Unauthorized("authorization header is required"))
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			return response.Error(c, apperror.Unauthorized("authorization header format must be: Bearer <token>"))
		}

		claims, err := jwtSvc.ValidateAccessToken(parts[1])
		if err != nil {
			return response.Error(c, apperror.ErrInvalidToken)
		}

		// Store claims in Fiber locals for downstream handlers.
		c.Locals(LocalsKeyUserID, claims.UserID)
		c.Locals(LocalsKeyUserEmail, claims.Email)
		c.Locals(LocalsKeyUserRole, claims.Role)

		return c.Next()
	}
}

// RequireRole returns a middleware that enforces a specific role.
// Must be chained after AuthMiddleware.
func RequireRole(role string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, ok := c.Locals(LocalsKeyUserRole).(string)
		if !ok || userRole != role {
			return response.Error(c, apperror.Forbidden("insufficient permissions"))
		}
		return c.Next()
	}
}
