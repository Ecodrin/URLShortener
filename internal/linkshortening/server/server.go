package server

import (
	"context"
	"encoding/json"
	"fmt"
	"linkshorteningservice/internal/linkshortening/constants"
	"linkshorteningservice/internal/linkshortening/db"
	"linkshorteningservice/internal/linkshortening/handlers"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"database/sql"

	_ "github.com/lib/pq"

	"github.com/skip2/go-qrcode"
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

	cookie, err := r.Cookie("session_id")
	var userLogin string
	if err != http.ErrNoCookie {
		user, err := handlers.GetUserFromJWTToken(cookie.Value, server.config.JWTSecret)
		if err == nil {
			userLogin = user.Login
		}
	}

	link, err := db.CreateDstLink(server.DB, s.Link, userLogin)
	if err != nil {
		server.logger.Println("error in CreateNewLink CreateDstLink: ", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
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
			http.Error(w, "not exist link", http.StatusNotFound)
		} else {
			http.Error(w, "bad request", http.StatusBadRequest)
		}
		return
	}

	err = db.CreateInfos(server.DB, handlers.LinkInfo{
		LinkId:    link.Id,
		Browser:   r.Header.Get("User-Agent"),
		Timestamp: time.Now(),
	}, link.DstLink)

	if err != nil && err != sql.ErrNoRows {
		server.logger.Println("error in RedirectHandler CreateInfos: ", err.Error())
		http.Error(w, "internal error", http.StatusInternalServerError)
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

	server.logger.Printf("Get login '%s' password '%s': registr\n", msg.Login, msg.Password)

	if !handlers.ValidateLoginPassword(msg.Login, msg.Password) {
		http.Error(w, "incorrect login or password", http.StatusBadRequest)
		server.logger.Printf("login '%s' password '%s' incorrect\n", msg.Login, msg.Password)
		return
	}

	succes, err := db.CreateUser(server.DB, handlers.User{
		Login:    msg.Login,
		Password: msg.Password,
	})
	if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		server.logger.Println("error in RegisterHandler db.CreateUser: ", err.Error())
		return
	}
	if !succes {
		server.logger.Printf("login '%s' is busy", msg.Login)
		http.Error(w, "this login is busy", http.StatusBadRequest)
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
	server.logger.Printf("Create user login '%s' password '%s'\n", msg.Login, msg.Password)
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
	server.logger.Println("user", msg.Login, "auth successful")
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

func (server *Server) DeleteLinkHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(handlers.UserContextKey).(*handlers.User)
	if !ok {
		http.Error(w, "no auth", http.StatusNonAuthoritativeInfo)
		return
	}

	var link handlers.LinkRequest
	err := json.NewDecoder(r.Body).Decode(&link)
	if err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}

	if strings.LastIndex(link.Link, "/") == -1 {
		http.Error(w, "no correct dst link", http.StatusBadRequest)
		return
	}

	linkPostFix := link.Link[strings.LastIndex(link.Link, "/")+1:]
	err = db.DeleteLink(server.DB, linkPostFix, user.Login)
	if err != nil {
		server.logger.Println("err in deleteLink: ", err.Error(), "link: ", link.Link)
		http.Error(w, "no correct link", http.StatusBadRequest)
		return
	}
	server.logger.Println("link", link.Link, "delete by user:", user.Login)
	w.WriteHeader(http.StatusOK)
}

func (server *Server) UpdateSrcLinkHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(handlers.UserContextKey).(*handlers.User)
	if !ok {
		http.Error(w, "no auth", http.StatusNonAuthoritativeInfo)
		return
	}

	var link handlers.UpdateSrcLinkHandler
	err := json.NewDecoder(r.Body).Decode(&link)
	if err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}

	if strings.LastIndex(link.DstLink, "/") == -1 {
		http.Error(w, "no correct dst link", http.StatusBadRequest)
		return
	}

	linkPostFix := link.DstLink[strings.LastIndex(link.DstLink, "/")+1:]
	err = db.UpdateLink(server.DB, link.OldLink, link.NewLink, linkPostFix, user.Login)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	server.logger.Println("link update", link.OldLink, " -> ", link.NewLink, "by user:", user.Login)
	w.WriteHeader(http.StatusOK)
}

func (server *Server) GetLinksInfo(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(handlers.UserContextKey).(*handlers.User)
	if !ok {
		http.Error(w, "no auth", http.StatusNonAuthoritativeInfo)
		return
	}
	links, err := db.GetLinksByUser(server.DB, *user)
	if err != nil {
		server.logger.Println("error in GetLinksByUser: ", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	for i := range links {
		links[i].DstLink = GetNewPath(r, links[i].DstLink)
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(links)
	if err != nil {
		server.logger.Println("error in json: ", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (server *Server) GetLinkInfo(w http.ResponseWriter, r *http.Request) {
	_, ok := r.Context().Value(handlers.UserContextKey).(*handlers.User)
	if !ok {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	var link handlers.LinkRequest
	err := json.NewDecoder(r.Body).Decode(&link)
	if err != nil {
		http.Error(w, "incorrect json request", http.StatusBadRequest)
		return
	}

	linkPostFix := link.Link[strings.LastIndex(link.Link, "/")+1:]
	link.Link = linkPostFix
	infos, err := db.GetLinkInfo(server.DB, link)
	if err != nil {
		server.logger.Println("error in GetLinkInfo:", err)
		http.Error(w, "bad link", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(infos)
	if err != nil {
		server.logger.Println("error in GetLinkInfo json:", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (server *Server) GenerateQRCode(w http.ResponseWriter, r *http.Request) {
	var link handlers.LinkRequest
	err := json.NewDecoder(r.Body).Decode(&link)
	if err != nil {
		server.logger.Println("error in GenerateQRCode json:", err)
		http.Error(w, "incorrect json body", http.StatusBadRequest)
		return
	}

	if strings.LastIndex(link.Link, "/") == -1 {
		http.Error(w, "incorrect link", http.StatusBadRequest)
		return
	}
	linkWithoutPrefix := link.Link[strings.LastIndex(link.Link, "/")+1:]
	ok, err := db.IsExistDstLink(server.DB, linkWithoutPrefix)
	if err != nil {
		server.logger.Println("error in GenerateQRCode IsExistDstLink:", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	if !ok {
		server.logger.Println("not exist dst link: ", link.Link)
		http.Error(w, "not exist link", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "image/png")
	qr, err := qrcode.New(link.Link, qrcode.High)
	if err != nil {
		server.logger.Println("error in GenerateQRCode qrcode.New: ", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	err = qr.Write(constants.QRCodeSize, w)
	if err != nil {
		server.logger.Println("error in GenerateQRCode qr.Write: ", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

}

func (server *Server) CheckAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_id")
		if err != nil || (!cookie.Expires.IsZero() && time.Now().After(cookie.Expires)) {
			http.Error(w, "no session", http.StatusNonAuthoritativeInfo)
			return
		}
		user, err := handlers.GetUserFromJWTToken(cookie.Value, server.config.JWTSecret)
		if err != nil {
			cookie.Expires = time.Now().AddDate(0, 0, -1)
			http.SetCookie(w, cookie)
			http.Error(w, err.Error(), http.StatusNonAuthoritativeInfo)
			return
		}
		ctx := context.WithValue(r.Context(), "user", user)
		r = r.WithContext(ctx)
		next.ServeHTTP(w, r)
	})
}

func StartServer() *Server {
	var err error
	server := Server{
		config: LoadConfig(),
	}

	server.mux = http.NewServeMux()
	server.mux.HandleFunc("POST /shorten", server.CreateNewLinkHandler)
	server.mux.HandleFunc("POST /auth", server.AuthHandler)
	server.mux.HandleFunc("POST /registr", server.RegisterHandler)
	server.mux.HandleFunc("POST /logout", server.LogoutHandler)
	server.mux.HandleFunc("POST /generateqrcode", server.GenerateQRCode)

	AuthMux := http.NewServeMux()
	AuthMux.HandleFunc("POST /deletelink", server.DeleteLinkHandler)
	AuthMux.HandleFunc("POST /updatesrclink", server.UpdateSrcLinkHandler)
	AuthMux.HandleFunc("GET /linksinfo", server.GetLinksInfo)
	AuthMux.HandleFunc("GET /linkinfo", server.GetLinkInfo)

	AuthHandler := server.CheckAuth(AuthMux)
	server.mux.Handle("POST /deletelink", AuthHandler)
	server.mux.Handle("POST /updatesrclink", AuthHandler)
	server.mux.Handle("GET /linksinfo", AuthHandler)
	server.mux.Handle("GET /linkinfo", AuthHandler)

	server.mux.HandleFunc("/{id}", server.RedirectHandler)

	// os.Mkdir("logs", 0666)
	// f, err := os.Create("logs/server.log")
	// if err != nil {
	// 	log.Fatal(err)
	// }
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
