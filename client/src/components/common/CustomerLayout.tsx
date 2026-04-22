import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';

export const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen pt-16 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      {/* Only show the simple footer on non-home pages (HomePage has its own footer) */}
      {!isHomePage && (
        <footer className="bg-gray-900 dark:bg-dark-bg border-t border-gray-800 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} Japan Haul Pasabuy. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
};
