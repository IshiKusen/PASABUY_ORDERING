import React, { useState, useEffect } from 'react';
import { Package, Clock, ChevronRight, ShoppingBag, X, CheckCircle2, Truck, AlertTriangle } from 'lucide-react';
import { ordersApi } from '../../utils/api';
import { format } from 'date-fns';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
  image_path: string;
}

interface Order {
  id: number;
  order_code: string;
  total: number;
  status: 'Pending' | 'Confirmed' | 'Purchased' | 'Transit' | 'Delivered' | 'Cancelled';
  created_at: string;
  delivery_date: string | null;
  items: OrderItem[];
  item_count: number;
  cancellation_reason?: string;
}

const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'cancelled'>('active');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await ordersApi.getAll({ personal: true });
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;
    
    try {
      setIsSubmittingCancel(true);
      await ordersApi.cancel(selectedOrder.id, cancelReason);
      await fetchOrders();
      setSelectedOrder(null);
      setIsConfirmingCancel(false);
      setCancelReason('');
      alert('Order cancelled successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Purchased': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Transit': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium italic">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Purchase History</h1>
          <p className="text-gray-500 mt-1 font-medium">Track your pasabuy items and status</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 px-4 py-2 rounded-2xl border border-primary-100 dark:border-primary-800/30">
          <Package className="text-primary-600" size={20} />
          <span className="text-primary-700 dark:text-primary-300 font-bold text-sm">{orders.length} Total Orders</span>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'active' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          Active Orders
        </button>
        <button 
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'cancelled' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          Cancelled Orders
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag size={48} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold dark:text-white mb-2">No orders placed yet</h3>
          <p className="text-gray-500 mb-8 max-w-sm">Start adding items to your cart and experience the best shopping service!</p>
          <a href="/" className="btn-primary px-8 py-3 rounded-2xl transition-transform hover:scale-105 active:scale-95">Start Shopping</a>
        </div>
      ) : (
        <div className="space-y-6">
          {(activeTab === 'active' ? orders.filter(o => o.status !== 'Cancelled') : orders.filter(o => o.status === 'Cancelled')).map((order) => (
            <div key={order.id} className="group bg-white dark:bg-dark-surface rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-300">
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <Package size={24} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order Code</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white">{order.order_code}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <Clock size={12} />
                        {format(new Date(order.created_at), 'MMMM dd, yyyy • hh:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="text-lg font-black text-primary-600 dark:text-primary-400">₱{order.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-y border-gray-50 dark:border-gray-800 py-6 my-2">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex-shrink-0 flex items-center gap-3 bg-gray-50 dark:bg-dark-surfaceAlt p-2 rounded-2xl border border-gray-100 dark:border-gray-800 pr-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm">
                          <img 
                            src={item.image_path.startsWith('http') ? item.image_path : `${API_HOST}${item.image_path}`} 
                            alt={item.product_name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold dark:text-white line-clamp-1 max-w-[150px]">{item.product_name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-gray-500">
                  <div className="flex items-center gap-4">
                    {order.status === 'Cancelled' ? (
                      <span className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Cancelled
                      </span>
                    ) : order.delivery_date && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 dark:text-green-500 uppercase">
                        <Clock size={12} />
                        Expected: {format(new Date(order.delivery_date), 'MMM dd')}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsConfirmingCancel(false);
                    }}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    View Details
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-surface w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-2xl text-primary-600">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black dark:text-white uppercase tracking-tight">Order Details</h2>
                  <p className="text-xs text-gray-500 font-bold">{selectedOrder.order_code}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedOrder(null);
                  setIsConfirmingCancel(false);
                }}
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Cancellation Banner */}
              {selectedOrder.status === 'Cancelled' && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-3xl">
                  <div className="flex gap-3">
                    <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-tight">Order Cancelled</p>
                      <p className="text-xs text-red-600 dark:text-red-500/80 mt-1 font-medium italic">
                        Reason: {selectedOrder.cancellation_reason || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              {selectedOrder.status !== 'Cancelled' && (
                <div className="flex justify-between items-start px-2">
                  {[
                    { label: 'Placed', icon: CheckCircle2, done: true },
                    { label: 'Confirmed', icon: CheckCircle2, done: ['Confirmed', 'Purchased', 'Transit', 'Delivered'].includes(selectedOrder.status) },
                    { label: 'Purchased', icon: ShoppingBag, done: ['Purchased', 'Transit', 'Delivered'].includes(selectedOrder.status) },
                    { label: 'Transit', icon: Truck, done: ['Transit', 'Delivered'].includes(selectedOrder.status) },
                    { label: 'Delivered', icon: CheckCircle2, done: ['Delivered'].includes(selectedOrder.status) }
                  ].map((s, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-1 relative">
                      {idx < 4 && (
                        <div className={`absolute top-4 left-[50%] right-[-50%] h-0.5 ${s.done ? 'bg-primary-500' : 'bg-gray-100 dark:bg-gray-800'}`} />
                      )}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center relative z-10 transition-colors duration-500 ${s.done ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <s.icon size={18} />
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${s.done ? 'text-primary-600' : 'text-gray-400'}`}>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cancellation Form */}
              {isConfirmingCancel && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-6 rounded-[2rem] animate-in fade-in slide-in-from-top-4">
                  <h3 className="text-sm font-black text-orange-700 uppercase tracking-tight mb-3">Why are you cancelling?</h3>
                  <textarea 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="E.g. Found it somewhere else, change of mind, incorrect items..."
                    className="w-full bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-900/50 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 h-24 mb-4 resize-none"
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={handleCancelOrder}
                      disabled={!cancelReason.trim() || isSubmittingCancel}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmittingCancel ? 'Processing...' : 'Confirm Cancellation'}
                    </button>
                    <button 
                      onClick={() => setIsConfirmingCancel(false)}
                      className="flex-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Ordered Items ({selectedOrder.items.length})</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-dark-surfaceAlt p-3 rounded-3xl border border-gray-100 dark:border-gray-800">
                      <img 
                        src={item.image_path.startsWith('http') ? item.image_path : `${API_HOST}${item.image_path}`} 
                        alt={item.product_name} 
                        className="w-16 h-16 object-cover rounded-2xl shadow-sm"
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold dark:text-white line-clamp-1">{item.product_name}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-medium">
                          <span>₱{item.price_at_purchase.toLocaleString()}</span>
                          <span className="text-gray-300">×</span>
                          <span>{item.quantity} units</span>
                        </div>
                      </div>
                      <div className="text-sm font-black dark:text-white">
                        ₱{(item.price_at_purchase * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-dark-surfaceAlt">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Amount</p>
                  <p className="text-3xl font-black text-primary-600 dark:text-primary-400">₱{selectedOrder.total.toLocaleString()}</p>
                </div>
                
                {!isConfirmingCancel && selectedOrder.status === 'Pending' && (
                  <button 
                    onClick={() => setIsConfirmingCancel(true)}
                    className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/30"
                  >
                    <X size={16} />
                    Cancel Order
                  </button>
                )}

                {selectedOrder.status === 'Cancelled' && (
                  <div className="px-6 py-3 rounded-2xl bg-red-100 text-red-700 text-xs font-black uppercase tracking-widest border border-red-200">
                    Order Cancelled
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
