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

type OutputLink struct {
	Id      int    `json:"id"`
	SrcLink string `json:"src_link"`
	DstLink string `json:"dst_link"`
}
