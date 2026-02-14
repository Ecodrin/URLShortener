package handlers

import (
	"database/sql"
)

type Link struct {
	Id      int
	SrcLink string
	DstLink string
	UserId  sql.NullInt64
}
