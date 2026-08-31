import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);

      localStorage.setItem(
        'access_token',
        response.data.access_token
      );

      localStorage.setItem(
        'refresh_token',
        response.data.refresh_token
      );

      localStorage.setItem(
        'user',
        JSON.stringify(response.data.user)
      );

      if (response.data.user.role === 'seller') {
        navigate('/seller');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', lineHeight: '1.2' }}>
        Instant access to trading from<br />comfort of your home
      </h1>

      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Login</h3>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="Enter Email" required style={{ backgroundColor: '#050505' }} />
        </div>

        <div className="form-group" style={{ marginBottom: '0.5rem' }}>
          <label className="form-label" style={{ fontSize: '0.85rem' }}>Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} className="form-input" placeholder="Enter Password" required style={{ backgroundColor: '#050505' }} />
        </div>

        <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
          <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Forgot password?</Link>
        </div>

        <button type="submit" className="btn btn-primary" style={{ padding: '0.875rem' }} disabled={loading}>
          {loading ? 'Logging in...' : 'Enter'}
        </button>
      </form>


      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem' }}>
        <span style={{ color: '#a1a1aa' }}>Don't have an account? </span>
        <Link to="/register" style={{ color: '#fff', fontWeight: '500' }}>Register here</Link>
      </div>
    </div>
  );
}
