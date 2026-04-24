import React, { useState } from 'react';
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '../../utils/image';
import { useCartStore } from '../../store/cartStore';
import type { Product } from './ProductModals';

interface ProductCardProps {
  product: Product;
  onVariantClick: (product: Product) => void;
  onImageClick: (url: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onVariantClick, onImageClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const addItem = useCartStore((state) => state.addItem);
  const setDirectPurchase = useCartStore((state) => state.setDirectPurchase);
  const setCartOpen = useCartStore((state) => state.setCartOpen);

  // Collect all unique images (Base image + Variant images)
  const allImages = [
    getImageUrl(product.image_path),
    ...(product.variants || [])
      .filter(v => v.image_path && getImageUrl(v.image_path) !== getImageUrl(product.image_path))
      .map(v => getImageUrl(v.image_path))
  ];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="group bg-white dark:bg-dark-surface rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:shadow-pink-100/50 dark:hover:shadow-none hover:-translate-y-2 transition-all duration-500 flex flex-col h-full relative">
      {/* Image Slider Section */}
      <div className="relative aspect-square overflow-hidden group/slider">
        <div 
          className="w-full h-full cursor-zoom-in"
          onClick={() => onImageClick(allImages[currentImageIndex])}
        >
          <img
            src={allImages[currentImageIndex]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
        </div>

        {/* Category Badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-white/90 dark:bg-dark-bg/90 backdrop-blur-md text-primary-600 dark:text-primary-400 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
            {product.category_name}
          </span>
        </div>

        {/* Slider Controls (Only if multiple images) */}
        {allImages.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-800 dark:text-white opacity-0 group-hover/slider:opacity-100 transition-opacity z-10 shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-800 dark:text-white opacity-0 group-hover/slider:opacity-100 transition-opacity z-10 shadow-sm"
            >
              <ChevronRight size={18} />
            </button>
            
            {/* Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentImageIndex ? 'bg-primary-500 w-4' : 'bg-white/60 dark:bg-white/20'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div 
        className={`p-5 flex flex-col flex-grow ${product.has_variants ? 'cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors' : ''}`}
        onClick={() => {
          if (product.has_variants) onVariantClick(product);
        }}
      >
        <div className="mb-3 flex-grow">
          <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors line-clamp-2 leading-tight text-sm sm:text-base">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-primary-600 dark:text-primary-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-2 mt-1">
              {product.description}
            </p>
          )}
        </div>
        
        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
              {product.has_variants && Number(product.min_price) !== Number(product.max_price)
                ? `₱${Number(product.min_price).toLocaleString()} - ${Number(product.max_price).toLocaleString()}`
                : `₱${Number(product.min_price || product.price_php).toLocaleString()}`
              }
            </span>
          </div>
          
          {/* Improved Buttons - Professional UX */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (product.has_variants) {
                  onVariantClick(product);
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
              className="w-full flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-2xl sm:rounded-xl bg-gray-50 dark:bg-dark-surfaceAlt text-gray-700 dark:text-gray-300 text-[11px] sm:text-[11px] font-black hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-all border border-gray-200 dark:border-gray-800 active:scale-[0.98]"
            >
              <ShoppingCart size={14} className="sm:w-3.5 sm:h-3.5" />
              Add to Cart
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (product.has_variants) {
                  onVariantClick(product);
                } else {
                  setDirectPurchase({
                    id: String(product.id),
                    name: product.name,
                    pricePhp: Number(product.price_php),
                    imageUrl: product.image_path,
                    category: product.category_name,
                    description: product.description,
                    stock: Number(product.stock),
                    quantity: 1
                  });
                  setCartOpen(true);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-2xl sm:rounded-xl bg-gradient-to-r from-[#d62b70] to-[#e83e8c] text-white text-[11px] sm:text-[11px] font-black hover:shadow-lg hover:shadow-pink-500/20 active:scale-[0.98] transition-all"
            >
              Buy It Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
