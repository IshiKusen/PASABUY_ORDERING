import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, ShoppingCart, Filter } from 'lucide-react';

import { productsApi, categoriesApi, configApi } from '../../utils/api';
import { useCartStore } from '../../store/cartStore';
import { getImageUrl } from '../../utils/image';
import { VariantSelectionModal, FullScreenImageModal, type Product } from '../../components/customer/ProductModals';


interface Category {
  id: number;
  name: string;
}



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
      {/* ─── Page Header Removed ─── */}

      {config.announcement_text && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
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
                
                 <div 
                   className={`p-4 md:p-5 flex flex-col flex-grow ${product.has_variants ? 'cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/20' : ''}`}
                   onClick={() => {
                     if (product.has_variants) {
                       setSelectedProductForVariant(product);
                     }
                   }}
                 >
                   <div className="mb-3 flex-grow">
                     <h3 className="text-sm md:text-[15px] font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-snug">
                       {product.name}
                     </h3>
                     {product.description && (
                       <p className="text-primary-600 dark:text-primary-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                         {product.description}
                       </p>
                     )}
                   </div>
                   
                   <div className="flex items-center justify-between mt-auto">
                     <div className="flex flex-col">
                       <span className="text-base md:text-xl font-bold text-[#d62b70]">
                         {product.has_variants && Number(product.min_price) !== Number(product.max_price)
                           ? `₱${Number(product.min_price).toLocaleString()} - ${Number(product.max_price).toLocaleString()}`
                           : `₱${Number(product.min_price || product.price_php).toLocaleString()}`
                         }
                       </span>
                       {product.has_variants && (
                         <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter mt-0.5">Click to select options</span>
                       )}
                     </div>
                     
                     <button
                       onClick={(e) => {
                         e.stopPropagation(); // Prevent card click
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
                       {product.has_variants ? <Filter className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
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
