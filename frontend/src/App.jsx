import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import { initBackgroundTokenRefresh } from './services/tokenService';

// Dashboard Pages
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import Markets from './pages/Markets';
import Trade from './pages/Trade';
import Wallet from './pages/Wallet';
import OpenOrders from './pages/OpenOrders';
import OrderHistory from './pages/OrderHistory';

// Seller Pages
import SellerDashboard from './pages/SellerDashboard';
import SellerProducts from './pages/SellerProducts';
import SellerProductDetails from './pages/SellerProductDetails';
import SellerOrders from './pages/SellerOrders';
import SellerInventory from './pages/SellerInventory';
import SellerWallet from './pages/SellerWallet';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
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
  useEffect(() => {
    // Start the silent background token refresh daemon on application mount
    const cleanup = initBackgroundTokenRefresh();
    return cleanup;
  }, []);

  return (
    <Routes>
      {/* Auth Routes with AuthLayout */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/otp-verification" element={<OTPVerification />} />
        <Route path="/verify-otp" element={<OTPVerification />} />
      </Route>

      {/* Legacy Home Route (Standalone, has its own header) */}
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />

      {/* Protected Dashboard Routes (Trader/User only) */}
      <Route path="/" element={<ProtectedRoute allowedRoles={['user', 'admin']}><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/marketplace" element={<ProtectedRoute allowedRoles={['user', 'admin']}><DashboardLayout><Marketplace /></DashboardLayout></ProtectedRoute>} />
      <Route path="/markets" element={<ProtectedRoute allowedRoles={['user', 'admin']}><DashboardLayout><Markets /></DashboardLayout></ProtectedRoute>} />
      <Route path="/trade/:symbol" element={<ProtectedRoute allowedRoles={['user', 'admin']}><DashboardLayout><Trade /></DashboardLayout></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute allowedRoles={['user', 'admin']}><DashboardLayout><Wallet /></DashboardLayout></ProtectedRoute>} />
      <Route path="/orders/open" element={<ProtectedRoute allowedRoles={['user', 'admin']}><DashboardLayout><OpenOrders /></DashboardLayout></ProtectedRoute>} />
      <Route path="/orders/history" element={<ProtectedRoute allowedRoles={['user', 'admin']}><DashboardLayout><OrderHistory /></DashboardLayout></ProtectedRoute>} />
      
      {/* Seller Routes (Seller only) */}
      <Route path="/seller" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><DashboardLayout><SellerDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/products" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><DashboardLayout><SellerProducts /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/products/:id" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><DashboardLayout><SellerProductDetails /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/orders" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><DashboardLayout><SellerOrders /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/inventory" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><DashboardLayout><SellerInventory /></DashboardLayout></ProtectedRoute>} />
      <Route path="/seller/wallet" element={<ProtectedRoute allowedRoles={['seller', 'admin']}><DashboardLayout><SellerWallet /></DashboardLayout></ProtectedRoute>} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
