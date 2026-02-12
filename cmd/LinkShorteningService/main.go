package main

import (
	server "linkshorteningservice/internal/LinkShorteningServer/server"
	"os"
)

func main() {
	server.StartServer(os.Getenv("HOST"), os.Getenv("PORT"))
}
