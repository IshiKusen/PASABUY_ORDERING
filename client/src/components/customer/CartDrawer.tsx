import React from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { getImageUrl } from '../../utils/image';
import { X, Minus, Plus, Trash2, ShoppingBag, ShoppingCart } from 'lucide-react';
import { MOCK_CONFIG } from '../../utils/mockData';
import { ordersApi } from '../../utils/api';


export const CartDrawer: React.FC = () => {
  const { isCartOpen, setCartOpen, items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const { isAuthenticated, user, setLoginModalOpen } = useAuthStore();

  const [isPlacingOrder, setIsPlacingOrder] = React.useState(false);
  const [isAdminWalkIn, setIsAdminWalkIn] = React.useState(false);
  const [walkInName, setWalkInName] = React.useState('');
  const [walkInNumber, setWalkInNumber] = React.useState('');
  const [walkInLocation, setWalkInLocation] = React.useState('');

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      setCartOpen(false);
      setLoginModalOpen(true);
      return;
    }

    if (user?.role === 'admin' && isAdminWalkIn) {
      if (!walkInName.trim()) {
        alert('Please enter the customer name.');
        return;
      }
      if (!walkInLocation.trim()) {
        alert('Please enter the customer location.');
        return;
      }
    }

    try {
      setIsPlacingOrder(true);
      const orderData = items.map(item => ({
        product_id: Number(item.id),
        variant_id: item.variantId,
        quantity: item.quantity
      }));

      let customer_details = undefined;
      if (user?.role === 'admin' && isAdminWalkIn) {
        customer_details = {
          fullName: walkInName,
          mobile: walkInNumber,
          address: walkInLocation,
          lat: 14.7547, // Default coordinate, can be enhanced to Geocode
          lng: 120.9607
        };
      }

      const res = await ordersApi.create(orderData, customer_details);
      alert(`Order placed successfully! Order Code: ${res.order_code}`);
      
      clearCart();
      setCartOpen(false);
      // Optional: Redirect to orders page
      window.location.href = '/orders';
    } catch (err: any) {
      alert(err.message || 'Failed to place order.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-fade-in transition-opacity"
        onClick={() => setCartOpen(false)}
      />
      
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-dark-surface shadow-2xl z-[101] flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
            <ShoppingBag size={24} className="text-primary-500" />
            Your Cart
          </h2>
          <button 
            onClick={() => setCartOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 space-y-4">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <ShoppingCart size={48} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-lg font-medium">Your cart is empty</p>
              <button 
                onClick={() => setCartOpen(false)}
                className="btn-secondary"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={`${item.id}-${item.variantId}`} className="flex gap-4 bg-gray-50 dark:bg-dark-surfaceAlt p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="w-20 h-20 bg-white dark:bg-dark-surface rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                  <img 
                    src={getImageUrl(item.imageUrl)} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/f9a8d4/831843?text=No+Img';
                    }}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-semibold text-sm line-clamp-2 dark:text-white">{item.name}</h3>
                      {item.variantName && (
                        <p className="text-[10px] uppercase tracking-wider font-bold text-primary-500 mt-1">
                          Variation: {item.variantName}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => removeItem(item.id, item.variantId)}
                      className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="font-bold text-primary-600 dark:text-primary-400">₱{item.pricePhp}</p>
                    <div className="flex items-center gap-3 bg-white dark:bg-dark-surface rounded-lg px-2 py-1 shadow-sm border border-gray-200 dark:border-gray-700">
                      <button 
                        onClick={() => updateQuantity(item.id, item.variantId, Math.max(1, item.quantity - 1))}
                        className="text-gray-500 hover:text-primary-500 disabled:opacity-50"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium w-4 text-center dark:text-white">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.variantId, Math.min(item.stock, item.quantity + 1))}
                        className="text-gray-500 hover:text-primary-500 disabled:opacity-50"
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-dark-surfaceAlt">
            <div className="space-y-3 mb-6 font-medium text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>₱{getTotalPrice().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Shipping Fee</span>
                <span>Cash on Delivery</span>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between text-lg font-bold text-gray-800 dark:text-white">
                <span>Total</span>
                <span className="text-primary-600 dark:text-primary-400">₱{getTotalPrice().toLocaleString()}</span>
              </div>
            </div>

            {user?.role === 'admin' && (
              <div className="mb-4 bg-gray-100 dark:bg-dark-surface p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-white mb-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isAdminWalkIn}
                    onChange={(e) => setIsAdminWalkIn(e.target.checked)}
                    className="accent-primary-600 w-4 h-4"
                  />
                  Process as Walk-in Order (External)
                </label>
                
                {isAdminWalkIn && (
                  <div className="space-y-3 mt-2 animate-fade-in">
                    <div>
                      <input 
                        type="text" 
                        placeholder="Customer Full Name *" 
                        className="input text-sm p-2 w-full"
                        value={walkInName}
                        onChange={(e) => setWalkInName(e.target.value)}
                      />
                    </div>
                    <div>
                      <input 
                        type="tel" 
                        placeholder="Contact Number (Optional)" 
                        className="input text-sm p-2 w-full"
                        value={walkInNumber}
                        maxLength={11}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                          setWalkInNumber(val);
                        }}
                      />
                    </div>
                    <div>
                      <textarea 
                        placeholder="Delivery Location / Address *" 
                        className="input text-sm p-2 w-full resize-none h-16"
                        value={walkInLocation}
                        onChange={(e) => setWalkInLocation(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 p-3 rounded-xl text-xs font-medium mb-4 flex items-center justify-between border border-primary-100 dark:border-primary-800/30">
              <span>ETA: {new Date(MOCK_CONFIG.etaStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {new Date(MOCK_CONFIG.etaEnd).toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}</span>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={isPlacingOrder}
              className="w-full btn-primary py-4 text-lg shadow-lg shadow-primary-500/25 disabled:opacity-50"
            >
              {isPlacingOrder ? 'Placing Order...' : 'Checkout All Items'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
