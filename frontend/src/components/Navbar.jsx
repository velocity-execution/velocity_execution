import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetMarketplaceState } from '../store/marketplaceSlice';
import { Activity, Wallet, BarChart2, Clock, ListOrdered, Search, User, LogOut, Store, Package, ChevronDown, ShoppingBag, Boxes } from 'lucide-react';
import ProfileModal from './ProfileModal';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    dispatch(resetMarketplaceState());
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let user = null;
  try {
    const userString = localStorage.getItem('user');
    if (userString && userString !== 'undefined' && userString !== 'null') {
      user = JSON.parse(userString);
    } else if (userString === 'undefined' || userString === 'null') {
      localStorage.removeItem('user');
    }
  } catch (err) {
    console.error('Error parsing user from localStorage:', err);
    localStorage.removeItem('user');
    user = null;
  }
  const userRole = user?.role || 'user';

  const displayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'User');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const userLinks = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Marketplace', path: '/marketplace', icon: ShoppingBag },
    { name: 'Markets', path: '/markets', icon: BarChart2 },
    { name: 'Trade', path: '/trade/BTCUSDT', icon: Activity },
    { name: 'Open Orders', path: '/orders/open', icon: ListOrdered },
    { name: 'Order History', path: '/orders/history', icon: Clock },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
  ];

  const sellerLinks = [
    { name: 'Dashboard', path: '/seller', icon: Store },
    { name: 'My Products', path: '/seller/products', icon: Package },
    { name: 'Orders', path: '/seller/orders', icon: ShoppingBag },
    { name: 'Inventory', path: '/seller/inventory', icon: Boxes },
    { name: 'Wallet', path: '/seller/wallet', icon: Wallet },
  ];

  const links = userRole === 'seller' ? sellerLinks : userLinks;

  return (
    <>
      <nav className={`bg-surface border-b ${userRole === 'seller' ? 'border-primary/50' : 'border-border'} text-white flex items-center justify-between px-6 py-3 transition-colors relative z-40`}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-xl text-primary cursor-pointer" onClick={() => navigate(userRole === 'seller' ? '/seller' : '/')}>
            <Activity size={24} />
            Velocity {userRole === 'seller' && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded ml-2">SELLER</span>}
          </div>
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => {
              const Icon = link.icon;
              const active = location.pathname === link.path || 
                (link.path.startsWith('/trade') && location.pathname.startsWith('/trade')) || 
                (link.path === '/seller/products' && location.pathname.startsWith('/seller/products'));
              return (
                <Link 
                  key={link.name} 
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${active ? 'bg-border text-white' : 'text-gray-400 hover:text-white hover:bg-border/50'}`}
                >
                  <Icon size={16} />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden lg:block">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search markets..." 
              className="bg-[#0f172a] text-sm text-white rounded-md pl-9 pr-4 py-1.5 border border-border focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-full hover:bg-white/5 transition-all focus:outline-none"
              title="Account Menu"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md border border-blue-400/20">
                  {initials}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0b0f19] rounded-full"></span>
              </div>
              <span className="hidden md:inline-block text-xs font-medium text-gray-300 max-w-[110px] truncate">
                {displayName}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popup */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0b0f19] border border-[#1e293b] shadow-2xl py-2 z-50 animate-fadeIn">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-[#1e293b]">
                  <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email || 'Active Session'}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {userRole}
                    </span>
                    {user?.phone && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        {user.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dropdown Navigation Links */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                  >
                    <User size={14} className="text-blue-400" />
                    <span>Account Profile</span>
                  </button>

                  {userRole === 'seller' ? (
                    <>
                      <Link
                        to="/seller/products"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Package size={14} className="text-purple-400" />
                        <span>My Products</span>
                      </Link>

                      <Link
                        to="/seller/orders"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <ShoppingBag size={14} className="text-emerald-400" />
                        <span>Orders & Sales</span>
                      </Link>

                      <Link
                        to="/seller/inventory"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Boxes size={14} className="text-amber-400" />
                        <span>Inventory</span>
                      </Link>

                      <Link
                        to="/seller/wallet"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Wallet size={14} className="text-sky-400" />
                        <span>Seller Wallet</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/wallet"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Wallet size={14} className="text-emerald-400" />
                        <span>My Wallet</span>
                      </Link>

                      <Link
                        to="/orders/open"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <ListOrdered size={14} className="text-purple-400" />
                        <span>Open Orders</span>
                      </Link>
                    </>
                  )}
                </div>

                {/* Logout Button */}
                <div className="pt-1 mt-1 border-t border-[#1e293b]">
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Profile Detail Modal */}
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user} 
        onLogout={handleLogout} 
      />
    </>
  );
}

