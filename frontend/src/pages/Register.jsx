import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { validateAndFormatIndianPhone } from '../utils/phone';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Phone validation & formatting (+91 implicit)
    const phoneCheck = validateAndFormatIndianPhone(formData.phone);
    if (!phoneCheck.valid) {
      setError(phoneCheck.error);
      return;
    }

    // 2. Password length check
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    // 3. Confirm password match check
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match. Please make sure both passwords are the same.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: phoneCheck.formatted,
        password: formData.password
      };

      await authAPI.register(payload);
      navigate('/otp-verification', { state: { phone: phoneCheck.formatted, purpose: 'verify' } });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', lineHeight: '1.2' }}>
        Start your trading journey<br/>with us today
      </h1>
      
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Create Account</h3>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister}>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Full Name</label>
          <input 
            type="text" 
            name="full_name" 
            value={formData.full_name} 
            onChange={handleChange} 
            className="form-input" 
            placeholder="Enter Full Name" 
            required 
            style={{ backgroundColor: '#050505' }} 
          />
        </div>
        
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Email</label>
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange} 
            className="form-input" 
            placeholder="Enter Email" 
            required 
            style={{ backgroundColor: '#050505' }} 
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
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
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              className="form-input" 
              placeholder="10-digit mobile number" 
              required 
              style={{ backgroundColor: '#050505', flex: 1 }} 
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showPassword ? 'text' : 'password'} 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              className="form-input" 
              placeholder="Minimum 8 characters" 
              required 
              style={{ backgroundColor: '#050505', paddingRight: '2.5rem' }} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#a1a1aa',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center'
              }}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input 
              type={showConfirmPassword ? 'text' : 'password'} 
              name="confirmPassword" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="form-input" 
              placeholder="Re-enter password" 
              required 
              style={{ backgroundColor: '#050505', paddingRight: '2.5rem' }} 
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#a1a1aa',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center'
              }}
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ padding: '0.875rem', width: '100%' }} disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem' }}>
        <span style={{ color: '#a1a1aa' }}>Already have an account? </span>
        <Link to="/login" style={{ color: '#fff', fontWeight: '500' }}>Login here</Link>
      </div>
    </div>
  );
}
