import React from 'react';
import { ShoppingCart, UserCircle, Menu, Moon, Sun, Package, X, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { removeToken } from '../../utils/api';

export const Navbar: React.FC = () => {
  const { getTotalItems, setCartOpen } = useCartStore();
  const { user, isAuthenticated, setLoginModalOpen, logout } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    removeToken();
    logout();
  };

  const handleProfileClick = () => {
    if (!isAuthenticated) {
      setLoginModalOpen(true);
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path: string) =>
    `relative font-semibold transition-colors duration-200 ${
      isActive(path)
        ? 'text-primary-500 dark:text-primary-400'
        : 'text-gray-600 hover:text-primary-500 dark:text-gray-300 dark:hover:text-primary-400'
    }`;

  const mobileNavLinkClass = (path: string) =>
    `font-medium px-3 py-2.5 rounded-xl transition-all ${
      isActive(path)
        ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20'
        : 'text-gray-600 hover:text-primary-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="bg-primary-500 p-2 rounded-xl text-white group-hover:bg-primary-600 transition-colors">
                <Package size={22} />
              </div>
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-700 hidden sm:inline">
                Ordering Pasabuy
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={navLinkClass('/')}>
              Home
              {isActive('/') && location.pathname === '/' && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
              )}
            </Link>
            <Link to="/products" className={navLinkClass('/products')}>
              Products
              {isActive('/products') && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
              )}
            </Link>
            <a
              href={location.pathname === '/' ? '#contact' : '/#contact'}
              className="text-gray-600 hover:text-primary-500 font-semibold dark:text-gray-300 dark:hover:text-primary-400 transition-colors"
            >
              Contact
            </a>
            {isAuthenticated && (
              <Link to="/orders" className={navLinkClass('/orders')}>
                My Orders
                {isActive('/orders') && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">Admin Dashboard</Link>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button 
              onClick={() => setCartOpen(true)}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            >
              <ShoppingCart size={20} />
              {getTotalItems() > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
                  {getTotalItems()}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <div className="relative group cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold border-2 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-700">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <p className="font-semibold text-sm truncate dark:text-white">{user?.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    {user?.role === 'admin' && (
                      <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="p-2 space-y-1">
                    {user?.role === 'admin' && (
                      <Link 
                        to="/admin"
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Package size={14} />
                        Admin Panel
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleProfileClick}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
                title="Sign In"
              >
                <UserCircle size={24} />
              </button>
            )}
            
            <button 
              className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-100 dark:border-gray-800 animate-fade-in">
            <div className="flex flex-col gap-1">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={mobileNavLinkClass('/')}>
                Home
              </Link>
              <Link to="/products" onClick={() => setIsMobileMenuOpen(false)} className={mobileNavLinkClass('/products')}>
                Products
              </Link>
              <a
                href={location.pathname === '/' ? '#contact' : '/#contact'}
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-medium px-3 py-2.5 rounded-xl text-gray-600 hover:text-primary-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Contact
              </a>
              {isAuthenticated && (
                <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className={mobileNavLinkClass('/orders')}>
                  My Orders
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="font-semibold px-3 py-2.5 rounded-xl text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
