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
	"time"

	"database/sql"

	_ "github.com/lib/pq"
)

type Server struct {
	mux *http.ServeMux

	logger *log.Logger
	config *Config

	DB *sql.DB
}

func GetNewPath(r *http.Request, new_id string) string {
	a := r.Header.Get("X-Forwarded-Proto")
	if a == "" {
		a = "http"
	}
	new_path := fmt.Sprintf("%s://%s/%s", a, r.Header.Get("X-Forwarded-Host"), new_id)
	return new_path
}

func IsValidPath(path string) bool {
	if !strings.HasPrefix(path, "http") {
		return false
	}
	return true
}

func (server *Server) CreateNewLinkHandler(w http.ResponseWriter, r *http.Request) {
	var s handlers.LinkRequest
	err := json.NewDecoder(r.Body).Decode(&s)
	if err != nil {
		server.logger.Println("error in CreateNewLink Decode: ", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	server.logger.Println("get src link", s.Link)
	if !IsValidPath(s.Link) {
		http.Error(w, "bad link", http.StatusBadRequest)
		server.logger.Println("link", s.Link, "was not validated")
		return
	}
	// TODO вставить обработку JWT
	link, err := db.CreateDstLink(server.DB, s.Link, "")
	if err != nil {
		server.logger.Println("error in CreateNewLink CreateDstLink: ", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	s.Link = GetNewPath(r, link.DstLink)
	err = json.NewEncoder(w).Encode(s)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	server.logger.Println("create link: (", link.SrcLink, " ", link.DstLink, ")")
	w.WriteHeader(http.StatusOK)
}

func (server *Server) RedirectHandler(w http.ResponseWriter, r *http.Request) {
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

func (server *Server) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	var msg handlers.RegistAuthRequest
	err := json.NewDecoder(r.Body).Decode(&msg)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	if !handlers.ValidateLoginPassword(msg.Login, msg.Password) {
		http.Error(w, "incorrect login or password", http.StatusBadRequest)
		return
	}

	succes, err := db.CreateUser(server.DB, handlers.User{
		Login:    msg.Login,
		Password: msg.Password,
	})
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if !succes {
		http.Error(w, "this login is bisy", http.StatusBadRequest)
		return
	}
	jwtToken, err := handlers.CreateJWTToken(msg.Login, server.config.JWTSecret)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	cookie := http.Cookie{
		Name:    "session_id",
		Value:   jwtToken,
		Expires: time.Now().Add(24 * time.Hour),
	}
	http.SetCookie(w, &cookie)
	w.WriteHeader(http.StatusOK)
}

func (server *Server) AuthHandler(w http.ResponseWriter, r *http.Request) {
	var msg handlers.RegistAuthRequest
	err := json.NewDecoder(r.Body).Decode(&msg)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	if !handlers.ValidateLoginPassword(msg.Login, msg.Password) {
		http.Error(w, "incorrect login or password", http.StatusBadRequest)
		return
	}

	user, err := db.GetUserByLogin(server.DB, msg.Login)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if user.Password != msg.Password {
		http.Error(w, "incorrect login or password", http.StatusBadRequest)
		return
	}
	jwtToken, err := handlers.CreateJWTToken(msg.Login, server.config.JWTSecret)
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	cookie := http.Cookie{
		Name:    "session_id",
		Value:   jwtToken,
		Expires: time.Now().Add(24 * time.Hour),
	}
	http.SetCookie(w, &cookie)
	w.WriteHeader(http.StatusOK)
}

func (server *Server) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	session, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "no session", http.StatusNonAuthoritativeInfo)
		return
	}

	session.Expires = time.Now().AddDate(0, 0, -1)
	http.SetCookie(w, session)
	w.WriteHeader(http.StatusOK)
}

func StartServer() *Server {
	server := Server{
		config: LoadConfig(),
	}

	server.mux = http.NewServeMux()
	server.mux.HandleFunc("POST /shorten", server.CreateNewLinkHandler)
	server.mux.HandleFunc("POST /auth", server.AuthHandler)
	server.mux.HandleFunc("POST /registr", server.RegisterHandler)
	server.mux.HandleFunc("POST /logout", server.LogoutHandler)

	// TODO check auth
	server.mux.HandleFunc("/{id}", server.RedirectHandler)

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
