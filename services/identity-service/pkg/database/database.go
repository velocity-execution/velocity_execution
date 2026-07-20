package database

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/velocity-dashboard/identity-service/internal/auth/entity"
	"github.com/velocity-dashboard/identity-service/internal/config"
)

// Connect opens a GORM connection to PostgreSQL and runs auto-migrations
// for all domain entities registered here.
func Connect(cfg *config.DBConfig) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("database: connect failed: %w", err)
	}

	log.Println("[database] Connected to PostgreSQL")

	if err := db.AutoMigrate(
		&entity.User{},
		&entity.RefreshToken{},
		&entity.OTP{},
	); err != nil {
		return nil, fmt.Errorf("database: migration failed: %w", err)
	}

	log.Println("[database] Migrations applied")
	return db, nil
}
