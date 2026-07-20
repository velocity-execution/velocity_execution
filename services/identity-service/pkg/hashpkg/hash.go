package hashpkg

import "golang.org/x/crypto/bcrypt"

// cost is the bcrypt work factor. 10 is the library default — good for production.
const cost = bcrypt.DefaultCost

// HashPassword generates a bcrypt hash from a plaintext password.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), cost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPasswordHash compares a plaintext password against a bcrypt hash.
// Returns true if the password matches.
func CheckPasswordHash(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
