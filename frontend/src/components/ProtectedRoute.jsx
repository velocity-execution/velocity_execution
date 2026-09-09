import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('access_token');
  
  if (!token || token === 'undefined' || token === 'null') {
    // If no valid token exists, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    let user = null;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'undefined' && userStr !== 'null') {
        user = JSON.parse(userStr);
      }
    } catch {
      user = null;
    }
    const role = user?.role || 'user';
    if (!allowedRoles.includes(role)) {
      // Redirect seller to /seller, or normal user to /
      return <Navigate to={role === 'seller' ? '/seller' : '/'} replace />;
    }
  }

  // Otherwise, render the protected component
  return children;
}
