package handlers

type LinkRequest struct {
	Link string `json:"link"`
}

type RegistAuthRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}
