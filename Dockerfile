FROM golang:1.25

WORKDIR /linkshorteningservice

COPY . .

RUN go mod tidy

EXPOSE 8080

CMD ["go", "run", "./cmd/LinkShorteningService/main.go"]