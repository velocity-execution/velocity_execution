package response

import (
	"github.com/gofiber/fiber/v2"
	"github.com/velocity-dashboard/identity-service/internal/common/apperror"
)

// envelope is the standard JSON wrapper for every API response.
type envelope struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// OK sends a 200 response with data.
func OK(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(envelope{Success: true, Data: data})
}

// Created sends a 201 response with data.
func Created(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(envelope{Success: true, Data: data})
}

// Success sends a 200 response with only a message (no body data).
func Success(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusOK).JSON(envelope{Success: true, Message: message})
}

// Error maps an AppError (or generic error) to the correct HTTP status and body.
func Error(c *fiber.Ctx, err error) error {
	var appErr *apperror.AppError
	if e, ok := err.(*apperror.AppError); ok {
		appErr = e
	} else {
		appErr = apperror.InternalServerError(err.Error())
	}
	return c.Status(appErr.Code).JSON(envelope{Success: false, Error: appErr.Message})
}

// BadRequest is a convenience helper for malformed requests.
func BadRequest(c *fiber.Ctx, message string) error {
	return Error(c, apperror.BadRequest(message))
}

// Unauthorized is a convenience helper for auth failures.
func Unauthorized(c *fiber.Ctx, message string) error {
	return Error(c, apperror.Unauthorized(message))
}
