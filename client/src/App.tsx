import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { CustomerLayout } from './components/common/CustomerLayout';
import { HomePage } from './pages/customer/HomePage';
import { ProductsPage } from './pages/customer/ProductsPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { InventoryPage } from './pages/admin/InventoryPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { OrdersPage } from './pages/customer/OrdersPage';
import { CartDrawer } from './components/customer/CartDrawer';
import { AuthModal } from './components/common/AuthModal';
import { useAuthStore } from './store/authStore';
import { authApi } from './utils/api';

function App() {
  const { login, logout } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await authApi.getMe();
        login({
          id: String(res.user.id),
          fullName: res.user.full_name,
          email: res.user.email,
          mobile: res.user.phone,
          address: res.user.address,
          lat: res.user.lat,
          lng: res.user.lng,
          role: res.user.role
        });
      } catch (err) {
        logout(); // Automatically clears token if invalid
      }
    };
    checkAuth();
  }, [login, logout]);

  return (
    <Router>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders" element={<OrdersPage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      
      {/* Global Overlays */}
      <CartDrawer />
      <AuthModal />
    </Router>
  );
}

export default App;
