package grpc

import (
	"context"
	"log"

	"github.com/velocity-dashboard/identity-service/pkg/jwtpkg"
	identityv1 "github.com/velocity-dashboard/identity-service/proto/identity/v1"
)

// Server implements the identityv1.AuthServiceServer interface.
type Server struct {
	identityv1.UnimplementedAuthServiceServer
	jwtSvc *jwtpkg.JWTService
}

// NewServer creates a new gRPC server handler.
func NewServer(jwtSvc *jwtpkg.JWTService) *Server {
	return &Server{
		jwtSvc: jwtSvc,
	}
}

// ValidateToken verifies an access token.
func (s *Server) ValidateToken(ctx context.Context, req *identityv1.ValidateTokenRequest) (*identityv1.ValidateTokenResponse, error) {
	if req.Token == "" {
		return &identityv1.ValidateTokenResponse{
			Valid: false,
			Error: "token is required",
		}, nil
	}

	claims, err := s.jwtSvc.ValidateAccessToken(req.Token)
	if err != nil {
		log.Printf("[gRPC] ValidateToken failed: %v", err)
		return &identityv1.ValidateTokenResponse{
			Valid: false,
			Error: "invalid token",
		}, nil
	}

	return &identityv1.ValidateTokenResponse{
		Valid:   true,
		UserId:  uint32(claims.UserID),
		Email:   claims.Email,
		Role:    claims.Role,
		Error:   "",
	}, nil
}