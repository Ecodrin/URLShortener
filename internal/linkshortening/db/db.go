package db

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	_ "github.com/lib/pq"

	handlers "linkshorteningservice/internal/linkshortening/handlers"
)

func InitDB(init string) (*sql.DB, error) {
	DB, err := sql.Open("postgres", init)
	if err != nil {
		return nil, err
	}

	err = DB.Ping()
	if err != nil {
		return nil, err
	}

	err = RunMigration(DB)
	if err != nil {
		return nil, err
	}
	return DB, nil
}

func InsertLink(DB *sql.DB, link handlers.Link) error {
	query := "INSERT INTO links (src, dst, user_id) VALUES ($1, $2, $3)"
	_, err := DB.Exec(query, link.SrcLink, link.DstLink, link.UserId)
	return err
}

func InsertLinkTx(Tx *sql.Tx, link handlers.Link) error {
	query := "INSERT INTO links (src, dst, user_id) VALUES ($1, $2, $3)"
	_, err := Tx.Exec(query, link.SrcLink, link.DstLink, link.UserId)
	return err
}

func InsertInfoTx(Tx *sql.Tx, info handlers.LinkInfo) error {
	query := "INSERT INTO infos (link_id, browser, timestamp) VALUES ($1, $2, $3)"
	_, err := Tx.Exec(query, info.LinkId, info.Browser, info.Timestamp)
	return err
}

func GetDstLink(DB *sql.DB, srcLink string) (*handlers.Link, error) {
	var dstLink string
	for true {
		dstLink = uuid.NewString()[:8]
		exists, err := IsExistDstLink(DB, dstLink)
		if err != nil {
			return nil, err
		}
		if !exists {
			break
		}

	}
	return &handlers.Link{
		SrcLink: srcLink,
		DstLink: dstLink,
		UserId:  sql.NullInt64{Valid: false},
	}, nil
}

func GetDstLinkTX(Tx *sql.Tx, srcLink string, UserId sql.NullInt64) (*handlers.Link, error) {
	var dstLink string
	for true {
		dstLink = uuid.NewString()[:8]
		exists, err := IsExistDstLinkTx(Tx, dstLink)
		if err != nil {
			return nil, err
		}
		if !exists {
			break
		}

	}
	return &handlers.Link{
		SrcLink: srcLink,
		DstLink: dstLink,
		UserId:  UserId,
	}, nil
}

func CreateDstLink(DB *sql.DB, link string, userLogin string) (*handlers.Link, error) {
	tx, err := DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	userId := sql.NullInt64{Valid: false}
	if userLogin != "" {
		user, err := GetUserByLoginTx(tx, userLogin)
		if err != nil {
			return nil, err
		}
		userId = sql.NullInt64{Int64: int64(user.Id), Valid: true}
	}

	linkHandler, err := GetDstLinkTX(tx, link, userId)
	if err != nil {
		return nil, err
	}

	err = InsertLinkTx(tx, *linkHandler)
	if err != nil {
		return nil, err
	}

	err = tx.Commit()
	if err != nil {
		return nil, err
	}
	return linkHandler, nil
}

func CreateUser(DB *sql.DB, user handlers.User) (bool, error) {
	tx, err := DB.Begin()
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	userH, err := GetUserByLoginTx(tx, user.Login)
	if err == nil && userH != nil {
		return false, nil
	}
	if err != nil && err != sql.ErrNoRows {
		return false, err
	}

	err = InsertUserTx(tx, user)
	if err != nil {
		return false, err
	}

	err = tx.Commit()
	if err != nil {
		return false, err
	}
	return true, nil
}

func CreateInfos(DB *sql.DB, info handlers.LinkInfo, dstLink string) error {
	tx, err := DB.Begin()
	if err != nil {
		return nil
	}
	defer tx.Rollback()

	link, err := GetLinkByDstLinkTx(tx, dstLink)
	if err != nil {
		return err
	}

	if link.UserId.Valid == false {
		return nil
	}

	err = InsertInfoTx(tx, info)
	if err != nil {
		return err
	}

	err = tx.Commit()
	return err
}

func GetLinkById(DB *sql.DB, id int) (*handlers.Link, error) {
	query := "SELECT id, src, dst, user_id FROM users WHERE id = $1"
	row := DB.QueryRow(query, id)
	var link handlers.Link

	err := row.Scan(&link.Id, &link.SrcLink, &link.DstLink, &link.UserId)
	if err != nil {
		return nil, err
	}
	return &link, err
}

func GetLinkByDstLink(DB *sql.DB, dst string) (*handlers.Link, error) {
	query := "SELECT id, src, dst, user_id FROM links WHERE dst = $1"
	row := DB.QueryRow(query, dst)
	var link handlers.Link
	err := row.Scan(&link.Id, &link.SrcLink, &link.DstLink, &link.UserId)
	if err != nil {
		return nil, err
	}
	return &link, err
}

func GetLinkByDstLinkTx(Tx *sql.Tx, dst string) (*handlers.Link, error) {
	query := "SELECT id, src, dst, user_id FROM links WHERE dst = $1"
	row := Tx.QueryRow(query, dst)
	var link handlers.Link
	err := row.Scan(&link.Id, &link.SrcLink, &link.DstLink, &link.UserId)
	if err != nil {
		return nil, err
	}
	return &link, err
}

func GetLinkBySrcLink(DB *sql.DB, src string) (*handlers.Link, error) {
	query := "SELECT id, src, dst, user_id FROM links WHERE src = $1"
	row := DB.QueryRow(query, src)
	var link handlers.Link

	err := row.Scan(&link.Id, &link.SrcLink, &link.DstLink, &link.UserId)
	if err != nil {
		return nil, err
	}
	return &link, err
}

func GetLinkBySrcLinkTx(Tx *sql.Tx, src string) (*handlers.Link, error) {
	query := "SELECT id, src, dst, user_id FROM links WHERE src = $1"
	row := Tx.QueryRow(query, src)
	var link handlers.Link

	err := row.Scan(&link.Id, &link.SrcLink, &link.DstLink, &link.UserId)
	if err != nil {
		return nil, err
	}
	return &link, err
}

func IsExistDstLink(DB *sql.DB, link string) (bool, error) {
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM links WHERE dst = $1) AS exist"
	err := DB.QueryRow(query, link).Scan(&exists)

	return exists, err
}

func IsExistDstLinkTx(Tx *sql.Tx, link string) (bool, error) {
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM links WHERE dst = $1) AS exist"
	err := Tx.QueryRow(query, link).Scan(&exists)

	return exists, err
}

func InsertUser(DB *sql.DB, user handlers.User) error {
	query := "INSERT INTO users (login, password) VALUES ($1, $2)"
	_, err := DB.Exec(query, user.Login, user.Password)
	return err
}

func InsertUserTx(Tx *sql.Tx, user handlers.User) error {
	query := "INSERT INTO users (login, password) VALUES ($1, $2)"
	_, err := Tx.Exec(query, user.Login, user.Password)
	return err
}

func GetUserById(DB *sql.DB, id int) (*handlers.User, error) {
	query := "SELECT id, login, password FROM users WHERE id = $1"
	row := DB.QueryRow(query, id)
	var user handlers.User

	err := row.Scan(&user.Id, &user.Login, &user.Password)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByLoginTx(Tx *sql.Tx, login string) (*handlers.User, error) {
	query := "SELECT id, login, password FROM users WHERE login = $1"
	row := Tx.QueryRow(query, login)
	var user handlers.User

	err := row.Scan(&user.Id, &user.Login, &user.Password)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func GetUserByLogin(DB *sql.DB, login string) (*handlers.User, error) {
	query := "SELECT id, login, password FROM users WHERE login = $1"
	row := DB.QueryRow(query, login)
	var user handlers.User

	err := row.Scan(&user.Id, &user.Login, &user.Password)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func DeleteLink(DB *sql.DB, link string, userLogin string) error {

	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	user, err := GetUserByLoginTx(tx, userLogin)
	if err != nil {
		return err
	}
	linkInfo, err := GetLinkBySrcLinkTx(tx, link)
	if err != nil {
		return err
	}
	if (linkInfo.UserId.Valid) && (int(linkInfo.UserId.Int64) != user.Id) {
		return fmt.Errorf("the user has no rights")
	}
	query := "DELETE FROM links WHERE src=$1"
	_, err = tx.Exec(query, link)
	if err != nil {
		return err
	}
	err = tx.Commit()
	return err
}

func UpdateLink(DB *sql.DB, oldLink string, newLink string, userLogin string) error {
	tx, err := DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	user, err := GetUserByLoginTx(tx, userLogin)
	if err != nil {
		return err
	}
	linkInfo, err := GetLinkBySrcLinkTx(tx, oldLink)
	if err != nil {
		return err
	}
	if (linkInfo.UserId.Valid) && (int(linkInfo.UserId.Int64) != user.Id) {
		return fmt.Errorf("the user has no rights")
	}

	query := "UPDATE links SET src = $1 WHERE src=$2"
	_, err = tx.Exec(query, newLink, oldLink)
	if err != nil {
		return err
	}
	err = tx.Commit()
	return err
}
