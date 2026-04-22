import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowRight, Package, Truck, CheckCircle, MessageSquare, Clock, Shield, Star, ChevronRight, Smartphone } from 'lucide-react';
import { productsApi, configApi } from '../../utils/api';
import { useCartStore } from '../../store/cartStore';
import logo from '../../../Images/PasabuyLogo.png';

interface Variant {
  id: number;
  product_id: number;
  variant_name: string;
  price_php: string;
  price_jpy: string;
  stock: number;
  image_path?: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price_php: string;
  price_jpy: string;
  category_id: number;
  category_name: string;
  stock: number;
  image_path: string;
  variants?: Variant[];
  has_variants?: boolean;
  min_price?: number;
  max_price?: number;
}

const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getImageUrl = (path: string | null | undefined) => {
  if (!path || typeof path !== 'string') return 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80';
  if (path.startsWith('http')) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_HOST}${normalizedPath}`;
};

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, configData] = await Promise.all([
          productsApi.getAll({}),
          configApi.get(),
        ]);
        setFeaturedProducts((productsData.products || []).slice(0, 8));
        setConfig(configData.config || {});
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install: Tap the "Share" or "Menu" icon in your browser and select "Add to Home Screen".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const getTimeRemaining = () => {
    if (!config.cutoff_date) return null;
    const now = new Date();
    const close = new Date(config.cutoff_date);
    const diff = close.getTime() - now.getTime();
    if (diff <= 0) return 'Batch Closed';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 30) return '~1 month';
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h left`;
  };

  const handleAddToCart = (product: Product) => {
    if (product.has_variants) return; // variants need the modal on Products page
    addItem({
      id: String(product.id),
      name: product.name,
      pricePhp: Number(product.price_php),
      imageUrl: product.image_path,
      category: product.category_name,
      description: product.description,
      stock: Number(product.stock)
    });
  };

  const handleContactClick = (type: 'whatsapp' | 'messenger') => {
    const link = type === 'whatsapp' ? config.whatsapp_link : config.messenger_link;
    const label = type === 'whatsapp' ? 'WhatsApp' : 'Messenger';
    // Check if the link is a real URL (not empty, not just the base domain)
    if (link && link.length > 15) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      alert(`${label} link is not configured yet. Please contact the admin to set it up in Settings.`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ─── Announcement Banner ─── */}
      {config.announcement_text && (
        <div className="bg-gradient-to-r from-primary-500/10 to-primary-600/10 dark:from-primary-900/30 dark:to-primary-800/30 border-b border-primary-100 dark:border-primary-800/30">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
            <div className="bg-primary-500 p-1.5 rounded-lg text-white shrink-0">
              <MessageSquare size={14} />
            </div>
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 text-center">
              {config.announcement_text}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* HERO SECTION                                    */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fff0f5] via-white to-[#fdf2f8] dark:from-dark-bg dark:via-dark-surface dark:to-dark-bg">
        {/* Decorative orbs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary-200/30 dark:bg-primary-800/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-80 h-80 bg-pink-200/20 dark:bg-pink-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-100/20 dark:bg-primary-900/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — Text */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800/40 px-4 py-2 rounded-full">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500"></span>
                </span>
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {config.batch_name || 'Japan Pasabuy — Now Open'}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d62b70] to-[#e83e8c]">Japan</span> Favorites,
                <br />
                Delivered to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e83e8c] to-[#d62b70]">Your Door</span>
              </h1>

              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-lg leading-relaxed">
                Order authentic Japanese goods — from snacks to beauty products — and we'll bring them straight to you in the Philippines. Simple, reliable, affordable.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#d62b70] to-[#e83e8c] text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-pink-200/50 dark:shadow-pink-900/30 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 transition-all duration-300"
                >
                  How It Works
                  <ChevronRight size={20} />
                </a>
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center justify-center gap-3 bg-transparent border-2 border-[#ec4899] text-[#ec4899] dark:text-[#f472b6] dark:border-[#f472b6] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#ec4899]/5 transition-all duration-300 glow-pink"
                >
                  <Smartphone size={20} />
                  Download App
                </button>
              </div>

              {/* Step-by-Step Process (Replaced Stats) */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-200 dark:via-primary-800 to-transparent sm:hidden" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 whitespace-nowrap">Your Journey Starts Here</p>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-200 dark:via-primary-800 to-transparent" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:pr-8">
                  {[
                    { step: '01', title: 'Download the App', icon: Smartphone, color: 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' },
                    { step: '02', title: 'Browse Products', icon: ShoppingCart, color: 'bg-pink-50 text-pink-500 dark:bg-pink-900/20' },
                    { step: '03', title: 'Place Your Order', icon: CheckCircle, color: 'bg-green-50 text-green-500 dark:bg-green-900/20' },
                    { step: '04', title: 'Wait for Delivery', icon: Truck, color: 'bg-amber-50 text-amber-500 dark:bg-amber-900/20' }
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3 p-3 bg-white/40 dark:bg-dark-surface/40 backdrop-blur-md rounded-2xl border border-white/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all">
                      <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0 shadow-inner`}>
                        <item.icon size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-tight">Step {item.step}</p>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">{item.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Countdown Card */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-[#d62b70] to-[#e83e8c] rounded-[32px] blur-2xl opacity-20 dark:opacity-30 scale-105" />
                <div className="relative bg-white dark:bg-dark-surface rounded-[32px] p-8 shadow-xl border border-gray-100 dark:border-gray-800">
                  <div className="text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 rounded-2xl">
                      <Clock className="w-8 h-8 text-primary-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2">Order Window</p>
                      <p className="text-4xl font-black text-gray-900 dark:text-white">
                        {getTimeRemaining() || '—'}
                      </p>
                    </div>
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Batch</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{config.batch_name || 'Loading...'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">ETA Delivery</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {config.eta_start
                              ? new Date(config.eta_start).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
                              : 'TBD'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/products"
                      className="block w-full py-4 bg-gradient-to-r from-[#d62b70] to-[#e83e8c] text-white text-center rounded-2xl font-bold shadow-lg shadow-pink-200/50 dark:shadow-pink-900/30 hover:-translate-y-0.5 transition-all"
                    >
                      Order Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                    */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="how-it-works" className="bg-white dark:bg-dark-surface py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-primary-500 mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: ShoppingCart,
                title: 'Browse & Order',
                desc: 'Pick your favorite Japanese items from our curated catalog and add them to your bag.',
                color: 'from-pink-500 to-rose-500',
                bg: 'bg-pink-50 dark:bg-pink-900/20',
                step: '01'
              },
              {
                icon: Package,
                title: 'We Purchase',
                desc: 'Once the batch closes, we purchase all items directly from Japan at the best prices.',
                color: 'from-purple-500 to-indigo-500',
                bg: 'bg-purple-50 dark:bg-purple-900/20',
                step: '02'
              },
              {
                icon: Truck,
                title: 'Delivered to You',
                desc: 'Items are shipped to the Philippines and delivered right to your doorstep.',
                color: 'from-blue-500 to-cyan-500',
                bg: 'bg-blue-50 dark:bg-blue-900/20',
                step: '03'
              }
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="bg-gray-50 dark:bg-dark-surfaceAlt rounded-3xl p-8 h-full border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`${item.bg} w-14 h-14 rounded-2xl flex items-center justify-center`}>
                      <item.icon className="w-7 h-7 text-primary-500" />
                    </div>
                    <span className="text-5xl font-black text-primary-100 dark:text-gray-800 select-none group-hover:text-primary-200 transition-colors duration-300">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* FEATURED PRODUCTS                               */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="bg-[#fff0f5] dark:bg-dark-bg py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-primary-500 mb-3">Curated Selection</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
                Featured Products
              </h2>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold hover:gap-3 transition-all"
            >
              View All Products
              <ChevronRight size={18} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-dark-surface rounded-3xl h-[340px] shadow-sm" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group bg-white dark:bg-dark-surface rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-transparent dark:border-gray-800"
                >
                  <div className="relative pt-[100%] bg-gray-50 dark:bg-dark-surfaceAlt overflow-hidden">
                    <img
                      src={getImageUrl(product.image_path)}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold text-gray-700 dark:text-gray-300 shadow-sm">
                        {product.category_name}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 leading-relaxed mb-3 flex-grow">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-lg font-bold text-[#d62b70]">
                        {product.has_variants && Number(product.min_price) !== Number(product.max_price)
                          ? `₱${Number(product.min_price).toLocaleString()}`
                          : `₱${Number(product.min_price || product.price_php).toLocaleString()}`}
                      </span>
                      {product.has_variants ? (
                        <Link
                          to="/products"
                          className="w-9 h-9 rounded-full bg-gray-50 dark:bg-dark-surfaceAlt hover:bg-[#d62b70] hover:text-white text-gray-400 flex items-center justify-center transition-all duration-300"
                          title="View Variants"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="w-9 h-9 rounded-full bg-gray-50 dark:bg-dark-surfaceAlt hover:bg-[#d62b70] hover:text-white text-gray-400 flex items-center justify-center transition-all duration-300"
                          title="Add to Cart"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              to="/products"
              className="inline-flex items-center gap-3 bg-white dark:bg-dark-surface border-2 border-[#d62b70] text-[#d62b70] px-10 py-4 rounded-2xl font-bold text-lg hover:bg-[#d62b70] hover:text-white hover:shadow-lg hover:shadow-pink-200/50 dark:hover:shadow-pink-900/30 transition-all duration-300"
            >
              View All Products
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* WHY CHOOSE US                                   */}
      {/* ═══════════════════════════════════════════════ */}
      <section className="bg-white dark:bg-dark-surface py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-primary-500 mb-3">Trusted Service</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
              Why Choose Us
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Authentic Items', desc: 'Purchased directly from Japan — 100% genuine products.' },
              { icon: Truck, title: 'Reliable Delivery', desc: 'Tracked shipping from Japan to your doorstep in PH.' },
              { icon: Star, title: 'Competitive Prices', desc: 'Fair pricing with transparent JPY→PHP exchange rates.' },
              { icon: MessageSquare, title: '24/7 Support', desc: 'Reach us anytime via WhatsApp or Messenger.' },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-3xl bg-gray-50 dark:bg-dark-surfaceAlt border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 mx-auto mb-5 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-primary-500" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* CONTACT / GET IN TOUCH                          */}
      {/* ═══════════════════════════════════════════════ */}
      <section id="contact" className="relative overflow-hidden bg-gradient-to-br from-[#d62b70] to-[#e83e8c] py-20 md:py-28">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl mb-8">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
            Get in Touch
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-lg mx-auto leading-relaxed">
            May tanong ka ba? I-message mo lang kami anytime! 
            We're always happy to help.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleContactClick('whatsapp')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white text-gray-800 px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            >
              <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={() => handleContactClick('messenger')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.933 1.456 5.547 3.733 7.255V22l3.32-1.83c.888.246 1.829.378 2.808.378h.139c5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.067 12.436l-2.545-2.718-4.969 2.718 5.466-5.803 2.607 2.718 4.908-2.718-5.467 5.803z"/>
              </svg>
              Messenger
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════ */}
      {/* FOOTER                                          */}
      {/* ═══════════════════════════════════════════════ */}
      <footer className="bg-gray-900 dark:bg-dark-bg text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logo} alt="Japan Haul Pasabuy" className="h-9 w-auto object-contain" />
                <span className="text-xl font-bold">Japan Haul Pasabuy</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your trusted pasabuy service from Japan to Philippines. Authentic products, reliable delivery.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">Quick Links</h4>
              <div className="space-y-3">
                <Link to="/" className="block text-gray-300 hover:text-white transition-colors text-sm">Home</Link>
                <Link to="/products" className="block text-gray-300 hover:text-white transition-colors text-sm">Products</Link>
                <a href="#contact" className="block text-gray-300 hover:text-white transition-colors text-sm">Contact</a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4">Get in Touch</h4>
              <div className="space-y-3">
                <button
                  onClick={() => handleContactClick('whatsapp')}
                  className="block text-gray-300 hover:text-white transition-colors text-sm text-left cursor-pointer"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => handleContactClick('messenger')}
                  className="block text-gray-300 hover:text-white transition-colors text-sm text-left cursor-pointer"
                >
                  Facebook Messenger
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Japan Haul Pasabuy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
