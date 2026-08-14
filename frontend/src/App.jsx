import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';

// Dashboard Pages
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import Trade from './pages/Trade';
import Wallet from './pages/Wallet';
import OpenOrders from './pages/OpenOrders';
import OrderHistory from './pages/OrderHistory';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import OTPVerification from './pages/OTPVerification';

// Legacy/Other Pages
import Home from './pages/Home';

// Layout for the new dashboard pages that includes the Navbar
function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col text-gray-100 font-sans">
      <Navbar />
      <main className="flex-1 overflow-x-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Auth Routes with AuthLayout */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp-verification" element={<OTPVerification />} />
      </Route>

      {/* Legacy Home Route (Standalone, has its own header) */}
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />

      {/* Protected Dashboard Routes (with new Navbar) */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/markets" element={<ProtectedRoute><DashboardLayout><Markets /></DashboardLayout></ProtectedRoute>} />
      <Route path="/trade/:symbol" element={<ProtectedRoute><DashboardLayout><Trade /></DashboardLayout></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><DashboardLayout><Wallet /></DashboardLayout></ProtectedRoute>} />
      <Route path="/orders/open" element={<ProtectedRoute><DashboardLayout><OpenOrders /></DashboardLayout></ProtectedRoute>} />
      <Route path="/orders/history" element={<ProtectedRoute><DashboardLayout><OrderHistory /></DashboardLayout></ProtectedRoute>} />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
