package server

import (
	"encoding/json"
	"fmt"
	"linkshorteningservice/internal/linkshortening/db"
	"linkshorteningservice/internal/linkshortening/handlers"
	"log"
	"net/http"
	"os"
	"strings"

	"database/sql"

	_ "github.com/lib/pq"
)

type Server struct {
	mux *http.ServeMux

	logger *log.Logger
	config *Config

	DB *sql.DB
}

func GetParentPath(r *http.Request) string {
	a := "http"
	if r.TLS != nil {
		a = "https"
	}
	fullPath := fmt.Sprintf("%s://%s%s", a, r.Host, r.RequestURI)
	i := strings.LastIndex(fullPath, "/")
	return fullPath[:i+1]
}

func (server *Server) CreateNewLink(w http.ResponseWriter, r *http.Request) {
	var s handlers.LinkRequest
	err := json.NewDecoder(r.Body).Decode(&s)
	if err != nil {
		server.logger.Println("error in CreateNewLink Decode: ", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	server.logger.Println("get src link", s.Link)
	// TODO вставить обработку JWT
	link, err := db.CreateDstLink(server.DB, s.Link, "")
	if err != nil {
		server.logger.Println("error in CreateNewLink CreateDstLink: ", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	s.Link = GetParentPath(r) + link.DstLink
	err = json.NewEncoder(w).Encode(s)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	server.logger.Println("create link: (", link.SrcLink, " ", link.DstLink, ")")
}

func (server *Server) RedirectFunction(w http.ResponseWriter, r *http.Request) {
	var s handlers.LinkRequest
	s.Link = r.PathValue("id")
	link, err := db.GetLinkByDstLink(server.DB, s.Link)
	if err != nil {
		server.logger.Println("error in RedirectFunction GetLinkByDstLink: ", err.Error())
		if err == sql.ErrNoRows {
			fmt.Fprintln(w, "not exist link")
		} else {
			http.Error(w, "bad request", http.StatusBadRequest)
		}
		return
	}

	server.logger.Println("redirect link: ", link.DstLink, " -> ", link.SrcLink)
	http.Redirect(w, r, link.SrcLink, http.StatusFound)
}

func StartServer() *Server {
	server := Server{
		config: LoadConfig(),
	}

	server.mux = http.NewServeMux()
	server.mux.HandleFunc("POST /shorten", server.CreateNewLink)
	server.mux.HandleFunc("/{id}", server.RedirectFunction)

	os.Mkdir("logs", 0666)
	_, err := os.Create("logs/server.log")
	if err != nil {
		log.Fatal(err)
	}
	server.logger = log.New(os.Stdout, "logger: ", log.Lshortfile|log.LstdFlags)

	init := fmt.Sprintf("postgresql://%s:%s@%s/%s?sslmode=disable",
		server.config.dbUser,
		server.config.dbPassword,
		server.config.dbHost,
		server.config.dbName,
	)
	server.DB, err = db.InitDB(init)
	if err != nil {
		server.logger.Println("error in InitDB: ", err.Error())
		return nil
	}
	server.logger.Println("database init successful")

	server.logger.Fatal(http.ListenAndServe(":"+server.config.port, server.mux))

	return &server
}
