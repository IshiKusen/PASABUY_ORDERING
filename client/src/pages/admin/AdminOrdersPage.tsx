import React, { useState, useEffect } from 'react';
import { Eye, MapPin, Calendar, Search, X, Check, Loader2, AlertTriangle } from 'lucide-react';
import { ordersApi } from '../../utils/api';
import { getImageUrl } from '../../utils/image';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapContainerCast = MapContainer as any;
const TileLayerCast = TileLayer as any;
const MarkerCast = Marker as any;


interface OrderItem {
  id: number;
  product_name: string;
  variant_name?: string;
  quantity: number;
  price_at_purchase: string;
  image_path: string;
}

interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_lat: number;
  customer_lng: number;
  total: string;
  status: 'Pending' | 'Confirmed' | 'Purchased' | 'Transit' | 'Delivered' | 'Cancelled';
  delivery_date: string | null;
  items: OrderItem[];
  item_count: number;
  created_at: string;
  cancellation_reason?: string;
  batch_name?: string;
}

const STATUS_TABS = ['All', 'Pending', 'Confirmed', 'Purchased', 'Transit', 'Delivered', 'Cancelled'];

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');

  // Load orders
  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersApi.getAll({ search: searchQuery });
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Load orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => loadOrders(), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-orange-100 text-orange-600';
      case 'Confirmed': return 'bg-blue-100 text-blue-600';
      case 'Purchased': return 'bg-purple-100 text-purple-600';
      case 'Transit': return 'bg-primary-100 text-primary-600';
      case 'Delivered': return 'bg-green-100 text-green-600';
      case 'Cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Filter by tab
  const filteredOrders = orders.filter(order => {
    return activeTab === 'All' || order.status === activeTab;
  });

  // Count per status
  const getStatusCount = (status: string) => {
    return status === 'All' ? orders.length : orders.filter(o => o.status === status).length;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (newStatus: Order['status']) => {
    if (selectedOrderIds.length === 0) return;
    try {
      await ordersApi.bulkUpdateStatus(selectedOrderIds, newStatus);
      setSelectedOrderIds([]);
      await loadOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickConfirm = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ordersApi.updateStatus(id, 'Confirmed');
      await loadOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChangeInModal = async (newStatus: string) => {
    if (!selectedOrder) return;
    try {
      await ordersApi.updateStatus(selectedOrder.id, newStatus, deliveryDate || undefined);
      setSelectedOrder({ ...selectedOrder, status: newStatus as Order['status'] });
      await loadOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-primary-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
             type="text" 
             placeholder="Search by ID or Customer..." 
             className="input pl-10" 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto items-start md:items-center">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            {STATUS_TABS.map(tab => {
              const count = getStatusCount(tab);
              return (
                <button 
                  key={tab} 
                  onClick={() => { setActiveTab(tab); setSelectedOrderIds([]); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeTab === tab 
                      ? 'bg-primary-500 text-white shadow-md' 
                      : 'bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-800 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/20'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedOrderIds.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in bg-white dark:bg-dark-surface p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 shrink-0">
               <span className="text-xs font-bold text-gray-500 px-3">{selectedOrderIds.length} selected</span>
               <select 
                  className="input py-1.5 px-3 text-sm min-w-[140px] bg-gray-50 dark:bg-dark-surfaceAlt"
                  onChange={(e) => handleBulkStatusChange(e.target.value as Order['status'])}
                  value=""
               >
                 <option value="" disabled>Change status to...</option>
                 <option value="Pending">Pending</option>
                 <option value="Confirmed">Confirmed</option>
                 <option value="Purchased">Purchased</option>
                 <option value="Transit">Transit</option>
                 <option value="Delivered">Delivered</option>
                 <option value="Cancelled">Cancelled</option>
               </select>
            </div>
          )}
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-surfaceAlt border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 w-12">
                    <input 
                       type="checkbox" 
                       className="rounded text-primary-500 w-4 h-4"
                       checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                       onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className={`hover:bg-gray-50/50 dark:hover:bg-dark-surfaceAlt/50 transition-colors group cursor-pointer ${selectedOrderIds.includes(order.id) ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
                    onClick={() => handleSelectOne(order.id)}
                  >
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <input 
                         type="checkbox" 
                         className="rounded text-primary-500 w-4 h-4 cursor-pointer"
                         checked={selectedOrderIds.includes(order.id)}
                         onChange={() => handleSelectOne(order.id)}
                      />
                    </td>
                    <td className="px-6 py-4 font-mono text-sm dark:text-white uppercase">{order.order_code}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {order.items && order.items.length > 0 ? (
                            <div className="flex flex-col items-center gap-1 py-1">
                              <div className="relative group">
                                <img 
                                  src={getImageUrl(order.items[0]?.image_path)} 
                                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-white dark:ring-dark-surface shadow-sm transition-transform group-hover:scale-110" 
                                  alt="Product"
                                />
                              </div>
                              <div className="flex flex-col items-center text-center w-full min-w-0">
                                <span className="text-[10px] font-bold dark:text-white truncate w-full max-w-[100px]">{order.items[0].product_name}</span>
                                {order.item_count > 1 ? (
                                  <span className="text-[9px] text-primary-500 font-bold leading-tight">+{order.item_count - 1} more items</span>
                                ) : (
                                  <span className="text-[9px] text-gray-400 font-medium leading-tight">1 item</span>
                                )}
                              </div>
                            </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No items</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold">
                          {order.customer_name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium dark:text-white">{order.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                        {order.batch_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-sm dark:text-white">₱{Number(order.total).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'Pending' && (
                          <button 
                            onClick={(e) => handleQuickConfirm(order.id, e)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-lg transition-colors text-xs font-bold"
                            title="Confirm Order"
                          >
                            <Check size={14} />
                            Confirm
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setDeliveryDate(order.delivery_date || ''); }}
                          className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-dark-surface rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-dark-surfaceAlt w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-bold dark:text-white">No orders found</h3>
          <p className="text-gray-500 text-sm mt-1">Try selecting a different filter tab or clear search.</p>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-surface w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-800">
              <h2 className="text-xl font-bold dark:text-white">Order Details: <span className="font-mono text-primary-600">{selectedOrder.order_code}</span></h2>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {selectedOrder.status === 'Cancelled' && (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-4 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="text-red-600" size={20} />
                    <div>
                      <p className="text-xs font-bold text-red-700 uppercase">Reason for Cancellation</p>
                      <p className="text-sm text-red-600 dark:text-red-400 italic">"{selectedOrder.cancellation_reason || 'No reason provided'}"</p>
                    </div>
                  </div>
                )}

                <section>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Customer Info</h3>
                  <div className="space-y-3 bg-gray-50 dark:bg-dark-surfaceAlt p-4 rounded-xl">
                    <p className="flex items-center gap-2 dark:text-white"><strong className="w-24 text-gray-400">Name:</strong> {selectedOrder.customer_name}</p>
                    <p className="flex items-center gap-2 dark:text-white"><strong className="w-24 text-gray-400">Email:</strong> {selectedOrder.customer_email}</p>
                    <p className="flex items-center gap-2 dark:text-white"><strong className="w-24 text-gray-400">Phone:</strong> {selectedOrder.customer_phone || 'N/A'}</p>
                    <p className="flex items-start gap-2 dark:text-white"><MapPin className="text-gray-400 mt-1 shrink-0" size={16} /><strong className="w-24 text-gray-400">Address:</strong> {selectedOrder.customer_address || 'N/A'}</p>
                    <p className="flex items-center gap-2 dark:text-white"><strong className="w-24 text-gray-400">Batch:</strong> <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 px-2 py-0.5 rounded text-xs font-bold">{selectedOrder.batch_name || 'N/A'}</span></p>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Order Items ({selectedOrder.item_count})</h3>
                  <div className="space-y-2 bg-gray-50 dark:bg-dark-surfaceAlt p-4 rounded-xl">
                    {selectedOrder.items && selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-dark-surfaceAlt p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <img 
                          src={getImageUrl(item.image_path)} 
                          alt="Product"
                          className="w-14 h-14 object-cover rounded-xl shadow-sm"
                        />
                        <div className="flex-1 flex flex-col">
                          <span className="font-bold dark:text-white">{item.product_name} x{item.quantity}</span>
                          {item.variant_name && (
                            <span className="text-[10px] uppercase font-bold text-primary-500">Variation: {item.variant_name}</span>
                          )}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">₱{(Number(item.price_at_purchase) * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t dark:border-gray-700 pt-2 mt-2 flex justify-between font-bold text-primary-600">
                      <span>Total</span>
                      <span>₱{Number(selectedOrder.total).toLocaleString()}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Update Fulfillment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Change status</label>
                      <select 
                        className="input text-sm font-medium"
                        value={selectedOrder.status}
                        onChange={(e) => handleStatusChangeInModal(e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Purchased">Purchased</option>
                        <option value="Transit">In Transit</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Set Delivery Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="date" 
                          className="input pl-10 text-sm" 
                          value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Delivery Location</h3>
                <div className="h-64 bg-gray-100 dark:bg-dark-surfaceAlt rounded-2xl overflow-hidden border dark:border-gray-800 relative shadow-inner z-0">
                  {selectedOrder.customer_lat && selectedOrder.customer_lng ? (
                    <MapContainerCast 
                      center={[selectedOrder.customer_lat, selectedOrder.customer_lng] as LatLngExpression} 
                      zoom={16} 
                      scrollWheelZoom={false} 
                      style={{ height: '100%', width: '100%', zIndex: 0 }}
                    >
                      <TileLayerCast
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MarkerCast position={[selectedOrder.customer_lat, selectedOrder.customer_lng] as LatLngExpression} />
                    </MapContainerCast>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <MapPin size={32} className="mx-auto mb-2" />
                      <p className="text-sm font-medium p-4">{selectedOrder.customer_address || 'No valid coordinates provided'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-800 bg-gray-50 dark:bg-dark-surfaceAlt flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setSelectedOrder(null)} className="btn-secondary">
                Close
              </button>
              <button 
                className="btn-primary"
                onClick={() => {
                   alert('Order Updated Successfully!');
                   setSelectedOrder(null);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
