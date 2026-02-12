package db

import (
	"database/sql"

	_ "github.com/lib/pq"
)

func RunMigration(DB *sql.DB) error {
	err := CreateUsersTable(DB)
	if err != nil {
		return err
	}
	err = CreateLinkTable(DB)
	if err != nil {
		return err
	}

	err = CreateInfoTable(DB)
	return err
}

func CreateUsersTable(DB *sql.DB) error {
	query := `
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			login TEXT,
			password TEXT
		)
	`

	_, err := DB.Exec(query)
	if err != nil {
		return err
	}
	return nil
}

func CreateLinkTable(DB *sql.DB) error {
	query := `
		CREATE TABLE IF NOT EXISTS links (
			id SERIAL PRIMARY KEY,
			src TEXT,
			dst TEXT,
			user_id INTEGER,
			FOREIGN KEY (user_id) REFERENCES users(id)
		)
	`

	_, err := DB.Exec(query)
	if err != nil {
		return err
	}
	return nil
}

func CreateInfoTable(DB *sql.DB) error {
	query := `
		CREATE TABLE IF NOT EXISTS infos (
			id SERIAL PRIMARY KEY,
			link_id INTEGER NOT NULL,
			browser TEXT,
			timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP(0),
			FOREIGN KEY (link_id) REFERENCES links(id)
				ON DELETE CASCADE
				ON UPDATE CASCADE
		)
	`

	_, err := DB.Exec(query)
	if err != nil {
		return err
	}
	return nil
}
