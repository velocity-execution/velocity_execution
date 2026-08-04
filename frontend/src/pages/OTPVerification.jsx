import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || '';
  const purpose = location.state?.purpose || 'verify';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!phone) {
      navigate('/login');
    }
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [phone, navigate]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.verifyOTP(phone, code, purpose);
      
      if (purpose === 'reset_password') {
        alert('Password reset successfully (Placeholder). Please login again.');
        navigate('/login');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem', lineHeight: '1.2' }}>
        Verify your account
      </h1>
      <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '2rem' }}>
        We have sent a 6-digit verification code to {phone || 'your phone'}.
      </p>
      
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleVerify}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'space-between' }}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              style={{
                width: '3rem', height: '3.5rem', textAlign: 'center', fontSize: '1.5rem',
                fontWeight: '600', backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: '#fff', outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                e.target.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          ))}
        </div>

        <button type="submit" className="btn btn-primary" style={{ padding: '0.875rem', marginBottom: '1.5rem' }} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
        <span style={{ color: '#a1a1aa' }}>Didn't receive code? </span>
        <button style={{ background: 'none', border: 'none', color: '#fff', fontWeight: '500', cursor: 'pointer', padding: 0 }}>
          Resend
        </button>
      </div>
    </div>
  );
}
