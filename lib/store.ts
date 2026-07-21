import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from './types';

export interface CartItem {
  id: string; // product id + variant id
  product: Product;
  variantId?: string;
  quantity: number;
}

interface StoreState {
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, variantId?: string, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // Wishlist
  wishlist: string[]; // array of product ids
  toggleWishlist: (productId: string) => void;

  // Recently Viewed
  recentlyViewed: string[]; // array of product ids
  addRecentlyViewed: (productId: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      cart: [],
      addToCart: (product, variantId, quantity = 1) => set((state) => {
        const itemId = variantId ? `${product.id}-${variantId}` : product.id;
        const existingItem = state.cart.find(i => i.id === itemId);
        if (existingItem) {
          return {
            cart: state.cart.map(i => 
              i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i
            )
          };
        }
        return { cart: [...state.cart, { id: itemId, product, variantId, quantity }] };
      }),
      removeFromCart: (itemId) => set((state) => ({
        cart: state.cart.filter(i => i.id !== itemId)
      })),
      updateQuantity: (itemId, quantity) => set((state) => ({
        cart: state.cart.map(i => 
          i.id === itemId ? { ...i, quantity } : i
        )
      })),
      clearCart: () => set({ cart: [] }),

      wishlist: [],
      toggleWishlist: (productId) => set((state) => ({
        wishlist: state.wishlist.includes(productId)
          ? state.wishlist.filter(id => id !== productId)
          : [...state.wishlist, productId]
      })),

      recentlyViewed: [],
      addRecentlyViewed: (productId) => set((state) => {
        const list = state.recentlyViewed.filter(id => id !== productId);
        list.unshift(productId);
        return { recentlyViewed: list.slice(0, 10) }; // Keep last 10
      }),
    }),
    {
      name: 'baher-silver-storage',
    }
  )
);
