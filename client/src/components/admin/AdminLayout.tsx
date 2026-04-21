import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ClipboardList, 
  Settings, 
  Moon, 
  Sun,
  Home,
  Users,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { removeToken } from '../../utils/api';

export const AdminLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    removeToken();
    logout();
    navigate('/');
  };

  // Guard: only admin can see this layout
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You need admin privileges to access this page. Please sign in with an authorized admin account.
          </p>
          <Link to="/" className="btn-primary px-8 py-3 inline-block">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
    { icon: <Package size={20} />, label: 'Inventory', path: '/admin/inventory' },
    { icon: <ClipboardList size={20} />, label: 'Orders', path: '/admin/orders' },
    { icon: <Users size={20} />, label: 'User Management', path: '/admin/users' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300 overflow-x-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-[60] lg:z-50 
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'} 
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section (Clickable Toggle) */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`h-16 flex items-center border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all w-full ${isCollapsed ? 'justify-center' : 'px-6'}`}
          >
            <div className="bg-primary-500 p-1.5 rounded-lg text-white shrink-0">
              <Package size={20} />
            </div>
            {!isCollapsed && (
              <span className="ml-3 font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-700 whitespace-nowrap">
                Admin Panel
              </span>
            )}
          </button>

          {/* Navigation Items */}
          <nav className="flex-1 py-6 px-3 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  location.pathname === item.path
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-gray-800 hover:text-primary-600'
                }`}
              >
                <div className={isCollapsed ? 'mx-auto' : ''}>{item.icon}</div>
                {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <div className={isCollapsed ? 'mx-auto' : ''}>
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </div>
              {!isCollapsed && <span className="font-medium text-sm">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            
            <Link
              to="/"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              <div className={isCollapsed ? 'mx-auto' : ''}>
                <Home size={20} />
              </div>
              {!isCollapsed && <span className="font-medium text-sm">Customer View</span>}
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <div className={isCollapsed ? 'mx-auto' : ''}>
                <LogOut size={20} />
              </div>
              {!isCollapsed && <span className="font-medium text-sm">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className={`flex flex-col min-h-screen transition-all duration-300 w-full lg:w-auto
          ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}
        `}
      >
        <header className="h-16 flex items-center justify-between px-4 sm:px-8 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400"
            >
              <Package size={24} />
            </button>
            <h2 className="text-lg sm:text-xl font-bold dark:text-white capitalize truncate max-w-[150px] sm:max-w-none">
              {location.pathname === '/admin/users' ? 'User Management' : (location.pathname.split('/').pop() || 'Dashboard')}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold dark:text-white text-gray-800">{user?.fullName || 'Admin'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold border border-primary-200 dark:border-primary-800">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
