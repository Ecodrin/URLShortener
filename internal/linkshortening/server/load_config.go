package server

import "os"

type Config struct {
	host string
	port string

	dbHost     string
	dbPort     string
	dbUser     string
	dbPassword string
	dbName     string

	JWTSecret string
}

func LoadConfig() *Config {
	return &Config{
		host: os.Getenv("HOST"),
		port: os.Getenv("PORT"),

		dbHost:     os.Getenv("DB_HOST"),
		dbPort:     os.Getenv("DB_PORT"),
		dbUser:     os.Getenv("DB_USER"),
		dbPassword: os.Getenv("DB_PASSWORD"),
		dbName:     os.Getenv("DB_NAME"),

		JWTSecret: os.Getenv("JWT_SECRET"),
	}
}
