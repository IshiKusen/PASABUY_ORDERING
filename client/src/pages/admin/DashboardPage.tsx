import React, { useState, useEffect } from 'react';
import { Users, PhilippinePeso, ShoppingBag, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import { ordersApi, configApi } from '../../utils/api';
import { Link } from 'react-router-dom';

interface DashboardStats {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  status_breakdown: Array<{ status: string, count: number }>;
}

interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  total: string;
  status: string;
  item_count: number;
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, ordersData, configData] = await Promise.all([
          ordersApi.getStats(),
          ordersApi.getAll(),
          configApi.get()
        ]);
        
        setStats(statsData);
        setRecentOrders(ordersData?.orders?.slice(0, 5) || []); // First 5 orders or empty array
        setSystemConfig(configData?.config || null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }

    };

    fetchData();
  }, []);

  if (loading || !stats || !systemConfig) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-primary-500" size={48} />
      </div>
    );
  }

  const pendingCount = stats.status_breakdown?.find(s => s.status === 'Pending')?.count || 0;


  const statCards = [
    { label: 'Total Customers', value: stats.total_customers, icon: <Users size={24} />, color: 'bg-blue-500', trend: 'Users registered' },
    { label: 'Total Revenue', value: `₱${Number(stats.total_revenue).toLocaleString()}`, icon: <PhilippinePeso size={24} />, color: 'bg-green-500', trend: 'All confirmed orders' },
    { label: 'Total Orders', value: stats.total_orders, icon: <ShoppingBag size={24} />, color: 'bg-primary-500', trend: 'Lifetime orders' },
    { label: 'Pending Orders', value: pendingCount, icon: <TrendingUp size={24} />, color: 'bg-orange-500', trend: 'Action required' },
  ];

  return (
    <div className="space-y-8 animate-fade-in relative pb-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="card p-6 flex items-center justify-between hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
              <h3 className="text-2xl font-bold dark:text-white">{stat.value}</h3>
              <p className="text-xs font-semibold text-gray-400">
                {stat.trend}
              </p>
            </div>
            <div className={`${stat.color} p-3 rounded-2xl text-white shadow-lg shrink-0`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Batch Info Card */}
        <div className="card p-6 space-y-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
              <Calendar size={20} className="text-primary-500 shrink-0" />
              Active System Configuration
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${systemConfig.is_ordering_open === '1' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {systemConfig.is_ordering_open === '1' ? 'Ordering Open' : 'Closed'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-dark-surfaceAlt p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Next Cut-off Date</p>
              <p className="font-bold dark:text-white">
                {systemConfig.cutoff_date 
                  ? new Date(systemConfig.cutoff_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : 'Not Set'
                }
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-dark-surfaceAlt p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Exchange Rate</p>
              <p className="font-bold dark:text-white">¥1 = ₱{Number(systemConfig.jpy_to_php_rate || 0).toFixed(2)}</p>
            </div>
          </div>

          {systemConfig.announcement_text && (
            <div className="mt-auto pt-4 border-t dark:border-gray-800">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Current Announcement</p>
              <div className="p-3 bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400 rounded-lg text-sm">
                "{systemConfig.announcement_text}"
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card p-6 flex flex-col">
          <h3 className="text-lg font-bold dark:text-white mb-6">Recent Orders</h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-surfaceAlt transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-500 font-bold shrink-0">
                    {order.customer_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white">{order.customer_name}</p>
                    <p className="text-xs text-gray-500 font-mono">{order.order_code} • {order.item_count} item(s)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">₱{Number(order.total).toLocaleString()}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                    order.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 
                    order.status === 'Confirmed' ? 'bg-blue-100 text-blue-600' :
                    order.status === 'Delivered' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-sm italic text-center py-4">No recent orders found.</p>
            )}
          </div>
          <Link to="/admin/orders" className="block w-full text-center text-primary-500 text-sm font-bold mt-4 hover:underline pt-4 border-t dark:border-gray-800">
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  );
};
