package handlers

type LinkRequest struct {
	Link string `json:"link"`
}

type RegistAuthRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

type UpdateSrcLinkHandler struct {
	OldLink string `json:"old_link"`
	NewLink string `json:"new_link"`
	DstLink string `json:"dst_link"`
}

var UserContextKey string = "user"
