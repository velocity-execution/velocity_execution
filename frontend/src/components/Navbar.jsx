import { Link, useLocation } from 'react-router-dom';
import { Activity, Wallet, BarChart2, Clock, ListOrdered, Search, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const links = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Markets', path: '/markets', icon: BarChart2 },
    { name: 'Trade', path: '/trade/BTC_USD', icon: Activity },
    { name: 'Open Orders', path: '/orders/open', icon: ListOrdered },
    { name: 'Order History', path: '/orders/history', icon: Clock },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
  ];

  return (
    <nav className="bg-surface border-b border-border text-white flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 font-bold text-xl text-primary cursor-pointer">
          <Activity size={24} />
          Velocity
        </div>
        <div className="hidden md:flex items-center gap-1">
          {links.map(link => {
            const Icon = link.icon;
            const active = location.pathname === link.path || (link.path.startsWith('/trade') && location.pathname.startsWith('/trade'));
            return (
              <Link 
                key={link.name} 
                to={link.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${active ? 'bg-border text-white' : 'text-gray-400 hover:text-white hover:bg-border/50'}`}
              >
                <Icon size={16} />
                {link.name}
              </Link>
            )
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
        <div className="h-8 w-8 rounded-full bg-border flex items-center justify-center cursor-pointer hover:bg-border/80 transition-colors">
          <User size={16} />
        </div>
        <button 
          onClick={handleLogout}
          className="h-8 w-8 rounded-full bg-danger/10 text-danger flex items-center justify-center cursor-pointer hover:bg-danger/20 transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
