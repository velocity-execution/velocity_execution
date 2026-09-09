import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { validateAndFormatIndianPhone } from '../utils/phone';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    let targetIdentifier = inputVal.trim();
    if (!targetIdentifier) {
      setError('Please enter your phone number or email.');
      return;
    }

    // Check if it's an email or phone number
    if (!targetIdentifier.includes('@')) {
      const phoneCheck = validateAndFormatIndianPhone(targetIdentifier);
      if (!phoneCheck.valid) {
        setError(phoneCheck.error);
        return;
      }
      targetIdentifier = phoneCheck.formatted;
    }

    setLoading(true);

    try {
      await authAPI.forgotPassword(targetIdentifier);
      navigate('/reset-password', { state: { phone: targetIdentifier } });
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem', lineHeight: '1.2' }}>
        Reset your password
      </h1>
      <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Enter your registered Indian phone number to receive a 6-digit OTP to reset your password.
      </p>
      
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleReset}>
        <div className="form-group" style={{ marginBottom: '1.75rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Phone Number (India)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ 
              backgroundColor: '#18181b', 
              color: '#a1a1aa', 
              padding: '0.65rem 0.85rem', 
              borderRadius: '6px', 
              fontSize: '0.9rem', 
              fontWeight: '500',
              border: '1px solid #27272a'
            }}>
              +91
            </span>
            <input 
              type="tel" 
              value={inputVal} 
              onChange={(e) => setInputVal(e.target.value)} 
              className="form-input" 
              placeholder="10-digit mobile number" 
              required 
              style={{ backgroundColor: '#050505', flex: 1 }} 
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ padding: '0.875rem', width: '100%', marginBottom: '1rem' }} disabled={loading}>
          {loading ? 'Sending OTP...' : 'Send Reset Code'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
        <Link to="/login" style={{ color: '#a1a1aa', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
