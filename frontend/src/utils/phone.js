/**
 * Validates and normalizes an Indian phone number.
 * 
 * Supports:
 * - 10-digit input: "9876543210" -> formatted: "+919876543210"
 * - Explicit +91: "+919876543210" or "+91 98765 43210" -> formatted: "+919876543210"
 * - Prefix with 91: "919876543210" -> formatted: "+919876543210"
 * - Leading 0: "09876543210" -> formatted: "+919876543210"
 * 
 * @param {string} input - The phone number string input by user
 * @returns {{ valid: boolean, error: string | null, formatted: string, rawDigits: string }}
 */
export function validateAndFormatIndianPhone(input) {
  if (!input || !input.toString().trim()) {
    return {
      valid: false,
      error: 'Please enter your phone number.',
      formatted: '',
      rawDigits: ''
    };
  }

  // Remove spaces, hyphens, and parentheses
  let cleaned = input.toString().trim().replace(/[\s\-()]/g, '');

  // Strip leading +91 or 91 or 0
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Check if remaining characters are all digits
  if (!/^\d+$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Phone number should contain digits only.',
      formatted: '',
      rawDigits: cleaned
    };
  }

  // Indian mobile numbers must be exactly 10 digits
  if (cleaned.length !== 10) {
    return {
      valid: false,
      error: `Please enter a correct 10-digit phone number (currently ${cleaned.length} digits).`,
      formatted: '',
      rawDigits: cleaned
    };
  }

  return {
    valid: true,
    error: null,
    formatted: `+91${cleaned}`,
    rawDigits: cleaned
  };
}
