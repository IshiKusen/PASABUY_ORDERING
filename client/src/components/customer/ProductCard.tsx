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

  // Collect images and map them to variants for price syncing
  const baseImage = getImageUrl(product.image_path);
  const slides = [
    { url: baseImage, price: product.min_price || product.price_php, variant: null },
    ...(product.variants || [])
      .filter(v => v.image_path)
      .map(v => ({
        url: getImageUrl(v.image_path),
        price: v.price_php,
        variant: v
      }))
  ].filter((v, i, a) => a.findIndex(t => t.url === v.url) === i); // Unique URLs

  const currentSlide = slides[currentImageIndex] || slides[0];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % slides.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="group bg-white dark:bg-dark-surface rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:shadow-pink-200/20 dark:hover:shadow-none hover:-translate-y-2 transition-all duration-500 flex flex-col h-full relative">
      {/* Image Slider Section */}
      <div className="relative aspect-square overflow-hidden group/slider">
        <div 
          className="w-full h-full cursor-zoom-in"
          onClick={() => onImageClick(currentSlide.url)}
        >
          <img
            src={currentSlide.url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
        </div>

        {/* Category Badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="bg-white/90 dark:bg-dark-bg/90 backdrop-blur-md text-primary-600 dark:text-primary-400 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.15em] shadow-sm">
            {product.category_name}
          </span>
        </div>

        {/* Slider Controls (Only if multiple images) */}
        {slides.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 dark:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 dark:text-white opacity-0 group-hover/slider:opacity-100 transition-all z-10 shadow-lg hover:scale-110 active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 dark:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 dark:text-white opacity-0 group-hover/slider:opacity-100 transition-all z-10 shadow-lg hover:scale-110 active:scale-95"
            >
              <ChevronRight size={20} />
            </button>
            
            {/* Shopee-style Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex ? 'bg-primary-500 w-6' : 'bg-white/60 dark:bg-white/20 w-1.5'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div 
        className={`p-6 flex flex-col flex-grow ${product.has_variants ? 'cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors' : ''}`}
        onClick={() => {
          if (product.has_variants) onVariantClick(product);
        }}
      >
        <div className="mb-4 flex-grow">
          <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors line-clamp-2 leading-tight text-sm sm:text-base">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-primary-500 dark:text-primary-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 mt-1.5">
              {product.description}
            </p>
          )}
        </div>
        
        <div className="mt-auto space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                ₱{Number(currentSlide.price).toLocaleString()}
              </span>
              {product.has_variants && slides.length > 1 && !currentSlide.variant && (
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Starting at</span>
              )}
              {currentSlide.variant && (
                 <span className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mt-0.5">
                   {currentSlide.variant.variant_name}
                 </span>
              )}
            </div>
          </div>
          
          {/* Improved Professional Buttons */}
          <div className="flex flex-col gap-2.5">
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
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gray-100 dark:bg-dark-surfaceAlt text-gray-700 dark:text-gray-300 text-xs font-black hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-all border border-transparent hover:border-primary-200 dark:hover:border-primary-800 shadow-sm active:scale-95"
            >
              <ShoppingCart size={16} />
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
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-[#d62b70] to-[#e83e8c] text-white text-xs font-black shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 active:scale-95 transition-all"
            >
              Buy It Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
