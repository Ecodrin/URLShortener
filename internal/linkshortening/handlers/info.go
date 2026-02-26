package handlers

import "time"

type LinkInfo struct {
	Browser   string    `json:"browser"`
	Timestamp time.Time `json:"timestamp"`
	LinkId    int       `json:"link_id"`
}
