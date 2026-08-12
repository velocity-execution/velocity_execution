package velocity

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	velocityv1 "github.com/velocity-dashboard/identity-service/internal/grpc/proto/velocity/v1"
)

type Client struct {
	conn   *grpc.ClientConn
	client velocityv1.VelocityServiceClient
}

func New(address string) (*Client, error) {
	conn, err := grpc.NewClient(
		address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, err
	}

	return &Client{
		conn:   conn,
		client: velocityv1.NewVelocityServiceClient(conn),
	}, nil
}

func (c *Client) Close() error {
	return c.conn.Close()
}

func (c *Client) CreateUser(
	ctx context.Context,
	id int64,
	email string,
) (*velocityv1.CreateUserResponse, error) {

	return c.client.CreateUser(
		ctx,
		&velocityv1.CreateUserRequest{
			Id:    id,
			Email: email,
		},
	)
}