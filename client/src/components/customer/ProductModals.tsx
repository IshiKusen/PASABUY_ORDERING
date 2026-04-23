import React, { useState } from 'react';
import { getImageUrl } from '../../utils/image';

export interface Variant {
  id: number;
  product_id: number;
  variant_name: string;
  price_php: string;
  price_jpy: string;
  stock: number;
  image_path?: string;
}

export interface Product {
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

/* ─────────────────────────────────────────────── */
/* Variant Selection Modal                          */
/* ─────────────────────────────────────────────── */
export const VariantSelectionModal = ({ 
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
export const FullScreenImageModal = ({ imageUrl, onClose }: { imageUrl: string, onClose: () => void }) => {
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
