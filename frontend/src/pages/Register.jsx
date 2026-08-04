import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.register(formData);
      navigate('/verify-otp', { state: { phone: formData.phone, purpose: 'verify' } });
    } catch (err) {
      setError(err.message);
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
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Full Name</label>
          <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="form-input" placeholder="Enter Full Name" required style={{ backgroundColor: '#050505' }} />
        </div>
        
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="Enter Email" required style={{ backgroundColor: '#050505' }} />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Phone Number</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-input" placeholder="+1234567890" required style={{ backgroundColor: '#050505' }} />
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} className="form-input" placeholder="Create Password" required style={{ backgroundColor: '#050505' }} />
        </div>

        <button type="submit" className="btn btn-primary" style={{ padding: '0.875rem' }} disabled={loading}>
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem' }}>
        <span style={{ color: '#a1a1aa' }}>Already have an account? </span>
        <Link to="/login" style={{ color: '#fff', fontWeight: '500' }}>Login here</Link>
      </div>
    </div>
  );
}
