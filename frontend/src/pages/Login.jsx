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
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '2rem', lineHeight: '1.2' }}>
        Instant access to trading from<br/>comfort of your home
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

      <div className="divider" style={{ margin: '2rem 0' }}>
        <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Or</span>
      </div>

      <button className="btn btn-outline" style={{ padding: '0.875rem' }}>
        <svg style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }} viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem' }}>
        <span style={{ color: '#a1a1aa' }}>Don't have an account? </span>
        <Link to="/register" style={{ color: '#fff', fontWeight: '500' }}>Register here</Link>
      </div>
    </div>
  );
}
