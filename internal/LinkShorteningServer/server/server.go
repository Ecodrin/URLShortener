package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"database/sql"

	_ "github.com/lib/pq"

	"linkshorteningservice/internal/LinkShorteningServer/db"
)

type Server struct {
	mux *http.ServeMux

	logger *log.Logger
	config *Config

	DB *sql.DB
}

func (server *Server) CreateNewLink(w http.ResponseWriter, r *http.Request) {
	var s interface{}
	json.NewDecoder(r.Body).Decode(&s)
	fmt.Fprintln(w, s)
}

func (server *Server) RedirectFunction(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, r.PathValue("id"))
	server.logger.Println(r.PathValue("id"))
}

func StartServer(host, port string) *Server {
	server := Server{}
	server.mux = http.NewServeMux()
	server.mux.HandleFunc("POST /shorten", server.CreateNewLink)
	server.mux.HandleFunc("/{id}", server.RedirectFunction)
	server.config = LoadConfig()

	os.Mkdir("logs", 0666)
	_, err := os.Create("logs/server.log")
	if err != nil {
		log.Fatal(err)
	}
	server.logger = log.New(os.Stdout, "logger: ", log.Lshortfile|log.LstdFlags)

	dsn := fmt.Sprintf("postgresql://%s:%s@%s/%s?sslmode=disable",
		server.config.db_user,
		server.config.db_password,
		server.config.db_host,
		server.config.db_name,
	)
	server.DB, err = sql.Open("postgres", dsn)
	if err != nil {
		server.logger.Fatal("error in open sql: " + err.Error())
		return nil
	}
	err = db.RunMigration(server.DB)
	if err != nil {
		server.logger.Fatal("error in run migration: " + err.Error())
		return nil
	}

	server.logger.Fatal(http.ListenAndServe(":"+port, server.mux))

	return &server
}
