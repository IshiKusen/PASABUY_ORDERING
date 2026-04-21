import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, ShoppingCart } from 'lucide-react';
import { productsApi, categoriesApi, configApi } from '../../utils/api';
import { useCartStore } from '../../store/cartStore';

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

interface Category {
  id: number;
  name: string;
}

const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getImageUrl = (path: string | null | undefined) => {
  if (!path || typeof path !== 'string') return 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80';
  if (path.startsWith('http')) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_HOST}${normalizedPath}`;
};


/* ─────────────────────────────────────────────── */
/* Variant Selection Modal                          */
/* ─────────────────────────────────────────────── */
const VariantSelectionModal = ({ 
  product, 
  onClose, 
  onAdd,
  onImageClick
}: { 
  product: Product, 
  onClose: () => void, 
  onAdd: (variant: Variant) => void,
  onImageClick: (url: string) => void
}) => {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-t-[32px] md:rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="relative p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={selectedVariant ? getImageUrl(selectedVariant.image_path) : getImageUrl(product.image_path)} 
              className="w-16 h-16 rounded-2xl object-cover transition-all duration-300 cursor-zoom-in" 
              alt={product.name}
              onClick={() => {
                onImageClick(selectedVariant ? getImageUrl(selectedVariant.image_path) : getImageUrl(product.image_path));
              }}
            />
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{product.name}</h3>
              <p className="text-[#d62b70] font-bold text-lg">
                {selectedVariant 
                  ? `₱${Number(selectedVariant.price_php).toLocaleString()}`
                  : product.min_price && product.max_price && Number(product.min_price) !== Number(product.max_price)
                    ? `₱${Number(product.min_price).toLocaleString()} - ${Number(product.max_price).toLocaleString()}`
                    : `₱${Number(product.min_price || product.price_php).toLocaleString()}`
                }
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors font-bold text-gray-400">✕</button>
        </div>

        <div className="p-6">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Select Variation</p>
          <div className="flex flex-wrap gap-2.5">
            {product.variants?.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${
                  selectedVariant?.id === variant.id
                    ? 'border-[#d62b70] bg-[#fff0f5] dark:bg-primary-900/20 text-[#d62b70]'
                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-dark-surfaceAlt text-gray-600 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-600'
                }`}
              >
                {variant.variant_name}
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-gray-500 dark:text-gray-400">Stock Available</span>
              <span className={selectedVariant && Number(selectedVariant.stock) < 10 ? 'text-red-500' : 'text-gray-900 dark:text-white'}>
                {selectedVariant ? `${selectedVariant.stock} items` : 'Please select'}
              </span>
            </div>

            <button
              disabled={!selectedVariant || Number(selectedVariant.stock) <= 0}
              onClick={() => selectedVariant && onAdd(selectedVariant)}
              className="w-full py-4 bg-[#d62b70] text-white rounded-2xl font-black text-lg shadow-lg shadow-pink-200/50 dark:shadow-pink-900/30 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              {selectedVariant && Number(selectedVariant.stock) <= 0 ? 'Out of Stock' : 'Add to Bag'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────── */
/* Full Screen Image Modal                          */
/* ─────────────────────────────────────────────── */
const FullScreenImageModal = ({ imageUrl, onClose }: { imageUrl: string, onClose: () => void }) => {
  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-[160]"
      >
        ✕
      </button>
      <img 
        src={imageUrl} 
        alt="Full Size" 
        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════ */
/* PRODUCTS PAGE                                    */
/* ═══════════════════════════════════════════════ */
export const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);
  
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData, configData] = await Promise.all([
        productsApi.getAll({ category: selectedCategory, search }),
        categoriesApi.getAll(),
        configApi.get(),
      ]);
      setProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
      setConfig(configData.config || {});
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#fff0f5] dark:bg-dark-bg">
      {/* ─── Page Header ─── */}
      <div className="bg-gradient-to-r from-[#d62b70] to-[#e83e8c] dark:from-primary-800 dark:to-primary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
            Our Products
          </h1>
          <p className="text-white/80 font-medium max-w-lg">
            Browse our full catalog of authentic Japanese items. Add to your bag and checkout before the batch closes!
          </p>
        </div>
      </div>

      {config.announcement_text && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-5">
          <div className="bg-white dark:bg-dark-surface border border-primary-100 dark:border-primary-800/30 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="bg-primary-500 p-2 rounded-lg text-white shrink-0">
              <MessageSquare size={16} />
            </div>
            <p className="text-sm font-bold text-primary-700 dark:text-primary-300">
              {config.announcement_text}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── Filters Bar ─── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-8">
          {/* Search */}
          <form onSubmit={handleSearch} className="w-full md:w-80 relative shrink-0">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-0 bg-white dark:bg-dark-surface shadow-sm focus:ring-2 focus:ring-[#d62b70] outline-none transition-all text-sm font-medium text-gray-700 dark:text-gray-200"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </form>

          {/* Categories Scroller */}
          <div className="flex items-center gap-2.5 overflow-x-auto w-full no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                selectedCategory === 'All' 
                  ? 'bg-[#d62b70] text-white shadow-md shadow-pink-200/50 dark:shadow-pink-900/30' 
                  : 'bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-surfaceAlt shadow-sm'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                  selectedCategory === cat.name 
                    ? 'bg-[#d62b70] text-white shadow-md shadow-pink-200/50 dark:shadow-pink-900/30' 
                    : 'bg-white dark:bg-dark-surface text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-surfaceAlt shadow-sm'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Products Grid ─── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-dark-surface rounded-3xl h-[360px] shadow-sm" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-dark-surface rounded-3xl shadow-sm">
            <div className="bg-gray-50 dark:bg-dark-surfaceAlt w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No products found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">We couldn't find any items matching your current filters. Try searching for something else!</p>
            <button 
              onClick={() => {setSearch(''); setSelectedCategory('All');}}
              className="mt-6 text-[#d62b70] font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="group bg-white dark:bg-dark-surface rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-transparent dark:border-gray-800"
              >
                <div className="relative pt-[100%] bg-gray-50 dark:bg-dark-surfaceAlt overflow-hidden">
                  <img
                    src={getImageUrl(product.image_path)}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                    onClick={() => setFullScreenImageUrl(getImageUrl(product.image_path))}
                    loading="lazy"
                  />

                  <div className="absolute top-3 left-3">
                    <span className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] font-semibold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      {product.category_name}
                    </span>
                  </div>
                  {Number(product.stock) < 10 && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-red-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-sm">
                        Low Stock
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-4 md:p-5 flex flex-col flex-grow">
                  <div className="mb-3 flex-grow">
                    <h3 className="text-sm md:text-[15px] font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs md:text-[13px] line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-base md:text-xl font-bold text-[#d62b70]">
                      {product.has_variants && Number(product.min_price) !== Number(product.max_price)
                        ? `₱${Number(product.min_price).toLocaleString()} - ${Number(product.max_price).toLocaleString()}`
                        : `₱${Number(product.min_price || product.price_php).toLocaleString()}`
                      }
                    </span>
                    
                    <button
                      onClick={() => {
                        if (product.has_variants) {
                          setSelectedProductForVariant(product);
                        } else {
                          addItem({
                            id: String(product.id),
                            name: product.name,
                            pricePhp: Number(product.price_php),
                            imageUrl: product.image_path,
                            category: product.category_name,
                            description: product.description,
                            stock: Number(product.stock)
                          });
                        }
                      }}
                      className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-50 dark:bg-dark-surfaceAlt hover:bg-[#d62b70] hover:text-white text-gray-400 flex items-center justify-center transition-all duration-300"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Variant Modal ─── */}
      {selectedProductForVariant && (
        <VariantSelectionModal 
          product={selectedProductForVariant}
          onClose={() => setSelectedProductForVariant(null)}
          onImageClick={(url) => setFullScreenImageUrl(url)}
          onAdd={(variant) => {
            addItem({
              id: String(selectedProductForVariant.id),
              name: selectedProductForVariant.name,
              pricePhp: Number(variant.price_php),
              imageUrl: variant.image_path || selectedProductForVariant.image_path,
              category: selectedProductForVariant.category_name,
              description: selectedProductForVariant.description,
              stock: Number(variant.stock),
              variantId: variant.id,
              variantName: variant.variant_name
            });
            setSelectedProductForVariant(null);
          }}
        />
      )}
      
      {/* ─── Full Screen Image ─── */}
      {fullScreenImageUrl && (
        <FullScreenImageModal 
          imageUrl={fullScreenImageUrl}
          onClose={() => setFullScreenImageUrl(null)}
        />
      )}
    </div>
  );
};
