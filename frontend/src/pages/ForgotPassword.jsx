import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(phone);
      navigate('/verify-otp', { state: { phone, purpose: 'reset_password' } });
    } catch (err) {
      setError(err.message);
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
        Enter your phone number and we'll send you an OTP to reset your password.
      </p>
      
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleReset}>
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Phone Number</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" placeholder="+1234567890" required style={{ backgroundColor: '#050505' }} />
        </div>

        <button type="submit" className="btn btn-primary" style={{ padding: '0.875rem', marginBottom: '1rem' }} disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
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
