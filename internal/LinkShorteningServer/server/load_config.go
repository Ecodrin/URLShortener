package server

import "os"

type Config struct {
	host string
	port string

	db_host     string
	db_port     string
	db_user     string
	db_password string
	db_name     string
}

func LoadConfig() *Config {
	return &Config{
		host: os.Getenv("HOST"),
		port: os.Getenv("PORT"),

		db_host:     os.Getenv("DB_HOST"),
		db_port:     os.Getenv("DB_PORT"),
		db_user:     os.Getenv("DB_USER"),
		db_password: os.Getenv("DB_PASSWORD"),
		db_name:     os.Getenv("DB_NAME"),
	}
}
