package handlers

import (
	"fmt"
	"strings"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
)

type User struct {
	Id       int
	Login    string
	Password string
}

type UserClaims struct {
	Login string `json:"login"`
	jwt.RegisteredClaims
}

func ValidateLoginPassword(login, password string) bool {
	if len(login) > 50 || len(password) > 50 {
		return false
	}

	for _, c := range login {
		if !(unicode.IsLetter(c) || unicode.IsNumber(c)) {
			return false
		}
	}

	for _, c := range password {
		if !(unicode.IsLetter(c) || unicode.IsNumber(c) || (c == '_') || (c == '-') || (c == '!')) {
			return false
		}
	}
	return true
}

func CreateJWTToken(login string, secret string) (string, error) {
	claims := UserClaims{
		Login: login,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func GetUserFromJWTToken(token string, secret string) (*User, error) {
	token, _ = strings.CutPrefix(token, "Bearer ")
	claims := &UserClaims{}
	outputToken, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("bag sign method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if !outputToken.Valid {
		return nil, fmt.Errorf("incorrect token")
	}

	return &User{Login: claims.Login}, nil
}
