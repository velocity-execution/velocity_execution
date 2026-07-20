package main

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/velocity-dashboard/identity-service/internal/auth/handler"
	"github.com/velocity-dashboard/identity-service/internal/auth/repository"
	"github.com/velocity-dashboard/identity-service/internal/auth/routes"
	"github.com/velocity-dashboard/identity-service/internal/auth/usecase"
	"github.com/velocity-dashboard/identity-service/internal/config"
	"github.com/velocity-dashboard/identity-service/pkg/database"
	"github.com/velocity-dashboard/identity-service/pkg/jwtpkg"
	"github.com/velocity-dashboard/identity-service/pkg/twiliopkg"
)

func main() {
	// ── 1. Load configuration ─────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("[main] failed to load config: %v", err)
	}

	// ── 2. Connect to database ────────────────────────────────
	db, err := database.Connect(&cfg.DB)
	if err != nil {
		log.Fatalf("[main] database connection failed: %v", err)
	}

	// ── 3. Build shared services ──────────────────────────────
	jwtSvc := jwtpkg.NewJWTService(
		cfg.JWT.AccessSecret,
		cfg.JWT.RefreshSecret,
		cfg.JWT.AccessExpiryMinutes,
		cfg.JWT.RefreshExpiryDays,
	)

	smsSvc := twiliopkg.NewSMSService(
		cfg.Twilio.AccountSID,
		cfg.Twilio.AuthToken,
		cfg.Twilio.PhoneNumber,
	)

	// ── 4. Wire auth feature (manual DI) ─────────────────────
	authRepo := repository.NewAuthRepository(db)
	authUC := usecase.NewAuthUseCase(authRepo, jwtSvc, smsSvc, cfg.OTP.ExpiryMinutes)
	authHandler := handler.NewAuthHandler(authUC)

	// ── 5. Setup Fiber app ────────────────────────────────────
	app := fiber.New(fiber.Config{
		AppName:      "Velocity Identity Service v1.0",
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
		// Return structured JSON errors instead of plain text.
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		},
	})

	// Global middleware
	app.Use(fiberlogger.New(fiberlogger.Config{
		Format: "[${time}] ${status} ${latency} ${method} ${path}\n",
	}))
	app.Use(recover.New())

	// ── 6. Register routes ────────────────────────────────────

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success":   true,
			"service":   "identity-service",
			"timestamp": time.Now().UTC(),
		})
	})

	// API v1 group
	v1 := app.Group("/api")
	routes.RegisterAuthRoutes(v1, authHandler)

	// ── 7. Start server ───────────────────────────────────────
	addr := ":" + cfg.App.Port
	log.Printf("[main] identity-service starting on %s (env=%s)", addr, cfg.App.Env)

	if err := app.Listen(addr); err != nil {
		log.Fatalf("[main] server error: %v", err)
	}
}
