import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../utils/mockData';

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  directPurchaseItem: CartItem | null;
  isCartOpen: boolean;
  setCartOpen: (isOpen: boolean) => void;
  setDirectPurchase: (item: CartItem | null) => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string, variantId?: number) => void;
  updateQuantity: (productId: string, variantId: number | undefined, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      directPurchaseItem: null,
      isCartOpen: false,
      setCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
      setDirectPurchase: (item) => set({ directPurchaseItem: item }),
      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find((item) => 
          item.id === product.id && item.variantId === product.variantId
        );

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === product.id && item.variantId === product.variantId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ items: [...items, { ...product, quantity }] });
        }
      },
      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((item) => 
            !(item.id === productId && item.variantId === variantId)
          ),
        })),
      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            (item.id === productId && item.variantId === variantId) 
              ? { ...item, quantity } 
              : item
          ),
        })),
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      getTotalPrice: () => get().items.reduce((total, item) => total + item.pricePhp * item.quantity, 0),
    }),
    {
      name: 'cart-storage',
    }
  )
);
