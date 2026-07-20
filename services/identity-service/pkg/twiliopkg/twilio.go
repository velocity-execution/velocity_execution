package twiliopkg

import (
	"fmt"

	"github.com/twilio/twilio-go"
	twilioApi "github.com/twilio/twilio-go/rest/api/v2010"
)

// SMSService wraps the Twilio REST client for SMS delivery.
type SMSService struct {
	client     *twilio.RestClient
	fromNumber string
}

// NewSMSService creates an SMSService using the given Twilio credentials.
func NewSMSService(accountSID, authToken, fromNumber string) *SMSService {
	client := twilio.NewRestClientWithParams(twilio.ClientParams{
		Username: accountSID,
		Password: authToken,
	})
	return &SMSService{client: client, fromNumber: fromNumber}
}

// SendOTP sends a phone-verification OTP to the given number.
func (s *SMSService) SendOTP(toPhone, code string) error {
	body := fmt.Sprintf(
		"Your Velocity verification code is: %s\nExpires in 10 minutes. Do not share this code.",
		code,
	)
	return s.send(toPhone, body)
}

// SendPasswordResetOTP sends a password-reset OTP to the given number.
func (s *SMSService) SendPasswordResetOTP(toPhone, code string) error {
	body := fmt.Sprintf(
		"Your Velocity password reset code is: %s\nExpires in 10 minutes. If you did not request this, ignore this message.",
		code,
	)
	return s.send(toPhone, body)
}

// send is the internal helper that calls the Twilio Messages API.
func (s *SMSService) send(toPhone, body string) error {
	params := &twilioApi.CreateMessageParams{}
	params.SetTo(toPhone)
	params.SetFrom(s.fromNumber)
	params.SetBody(body)

	_, err := s.client.Api.CreateMessage(params)
	if err != nil {
		return fmt.Errorf("twilio: send to %s failed: %w", toPhone, err)
	}
	return nil
}
