package main

import (
	"log"

	"github.com/velocity-dashboard/identity-service/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	db, err := gorm.Open(postgres.Open(cfg.DB.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	db.Exec("DROP TABLE IF EXISTS refresh_tokens CASCADE")
	db.Exec("DROP TABLE IF EXISTS otps CASCADE")
	db.Exec("DROP TABLE IF EXISTS users CASCADE")
	log.Println("Database cleaned! You can now run the server normally.")
}
