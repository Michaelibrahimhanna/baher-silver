import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from './types';
import { CurrencyCode, createMoney } from './types/money';
import { pricingService, PricingCalculationResult } from './services/pricingService';
import { PaymentProviderType } from './services/payment';
import { OrderAggregate } from './types/orderAggregate';
import { analyticsEventBus } from './analytics/eventBus';

export interface CartItem {
  id: string; // product id + variant id
  product: Product;
  variantId?: string;
  quantity: number;
}

export interface ShippingAddressInput {
  fullName: string;
  phone: string;
  governorate: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface CheckoutState {
  step: 'contact' | 'address' | 'payment' | 'review';
  isGuest: boolean;
  guestEmail: string;
  guestPhone: string;
  shippingAddress: ShippingAddressInput;
  carrierId: string;
  paymentMethod: PaymentProviderType;
  idempotencyKey?: string;
  isProcessing: boolean;
  failureReason?: 'declined' | 'timeout' | 'expired' | 'network' | string;
  activeOrder?: OrderAggregate;
  lastAutosavedAt?: string;
}

interface CommerceStoreState {
  // Currency
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, variantId?: string, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;

  // Recently Viewed
  recentlyViewed: string[];
  addRecentlyViewed: (productId: string) => void;

  // Coupon
  couponCode: string;
  applyCoupon: (code: string) => void;
  removeCoupon: () => void;

  // Checkout State & Autosave Progress
  checkout: CheckoutState;
  setCheckoutStep: (step: CheckoutState['step']) => void;
  updateContactInfo: (email: string, phone: string, isGuest?: boolean) => void;
  updateAddressInfo: (address: Partial<ShippingAddressInput>) => void;
  setCarrierId: (carrierId: string) => void;
  setPaymentMethod: (method: PaymentProviderType) => void;
  setFailureState: (reason?: string) => void;
  setActiveOrder: (order: OrderAggregate) => void;
  resetCheckout: () => void;

  // Pricing Calculation Selector
  getPricingBreakdown: () => PricingCalculationResult;
}

const DEFAULT_DEMO_PRODUCT: Product = {
  id: 'prod-silver-necklace-1',
  slug: 'pharaonic-ankh-silver-pendant',
  name: {
    en: 'Pharaonic Ankh Silver Pendant',
    ar: 'قلادة العنق الفضية بمجسم مفتاح الحياة',
  },
  price: 1250,
  image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
  category: 'necklaces',
  stockStatus: 'IN_STOCK',
  isNew: true,
};

export const useStore = create<CommerceStoreState>()(
  persist(
    (set, get) => ({
      // Currency
      currency: 'EGP',
      setCurrency: (currency) => set({ currency }),

      // Cart State & Actions
      cart: [
        {
          id: 'prod-silver-necklace-1',
          product: DEFAULT_DEMO_PRODUCT,
          quantity: 1,
        },
      ],

      addToCart: (product, variantId, quantity = 1) => {
        set((state) => {
          const itemId = variantId ? `${product.id}-${variantId}` : product.id;
          const existingItem = state.cart.find(i => i.id === itemId);
          let newCart: CartItem[];

          if (existingItem) {
            newCart = state.cart.map(i =>
              i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i
            );
          } else {
            newCart = [...state.cart, { id: itemId, product, variantId, quantity }];
          }

          analyticsEventBus.publish('add_to_cart', {
            productId: product.id,
            productName: product.name.en,
            quantity,
            price: createMoney(product.price, state.currency),
          });

          return { cart: newCart };
        });
      },

      removeFromCart: (itemId) => set((state) => ({
        cart: state.cart.filter(i => i.id !== itemId),
      })),

      updateQuantity: (itemId, quantity) => set((state) => ({
        cart: state.cart.map(i => i.id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i),
      })),

      clearCart: () => set({ cart: [] }),

      // Wishlist
      wishlist: [],
      toggleWishlist: (productId) => set((state) => ({
        wishlist: state.wishlist.includes(productId)
          ? state.wishlist.filter(id => id !== productId)
          : [...state.wishlist, productId],
      })),

      // Recently Viewed
      recentlyViewed: ['prod-silver-necklace-1'],
      addRecentlyViewed: (productId) => set((state) => {
        const list = state.recentlyViewed.filter(id => id !== productId);
        list.unshift(productId);
        return { recentlyViewed: list.slice(0, 10) };
      }),

      // Coupon Engine State
      couponCode: 'SILVER10',
      applyCoupon: (code) => {
        const state = get();
        set({ couponCode: code });
        const breakdown = state.getPricingBreakdown();

        analyticsEventBus.publish('apply_coupon', {
          couponCode: code,
          discountAmount: breakdown.discount,
          success: !breakdown.couponErrorMessage,
        });
      },
      removeCoupon: () => set({ couponCode: '' }),

      // Checkout Progress & Autosave State
      checkout: {
        step: 'contact',
        isGuest: true,
        guestEmail: 'alex.customer@example.com',
        guestPhone: '+201012345678',
        shippingAddress: {
          fullName: 'Alex Vance',
          phone: '+201012345678',
          governorate: 'Cairo',
          city: 'New Cairo / Fifth Settlement',
          addressLine1: 'Building 42, 90th Street North',
          addressLine2: 'Apartment 4B',
          postalCode: '11835',
          latitude: 30.0274,
          longitude: 31.4914,
        },
        carrierId: 'bosta',
        paymentMethod: 'Paymob',
        isProcessing: false,
      },

      setCheckoutStep: (step) => set((state) => ({
        checkout: { ...state.checkout, step, lastAutosavedAt: new Date().toISOString() },
      })),

      updateContactInfo: (email, phone, isGuest = true) => set((state) => ({
        checkout: {
          ...state.checkout,
          guestEmail: email,
          guestPhone: phone,
          isGuest,
          lastAutosavedAt: new Date().toISOString(),
        },
      })),

      updateAddressInfo: (address) => set((state) => ({
        checkout: {
          ...state.checkout,
          shippingAddress: { ...state.checkout.shippingAddress, ...address },
          lastAutosavedAt: new Date().toISOString(),
        },
      })),

      setCarrierId: (carrierId) => set((state) => ({
        checkout: { ...state.checkout, carrierId, lastAutosavedAt: new Date().toISOString() },
      })),

      setPaymentMethod: (method) => set((state) => ({
        checkout: { ...state.checkout, paymentMethod: method, lastAutosavedAt: new Date().toISOString() },
      })),

      setFailureState: (reason) => set((state) => ({
        checkout: { ...state.checkout, failureReason: reason, isProcessing: false },
      })),

      setActiveOrder: (order) => set((state) => ({
        checkout: { ...state.checkout, activeOrder: order, isProcessing: false },
      })),

      resetCheckout: () => set({
        checkout: {
          step: 'contact',
          isGuest: true,
          guestEmail: '',
          guestPhone: '',
          shippingAddress: {
            fullName: '',
            phone: '',
            governorate: 'Cairo',
            city: '',
            addressLine1: '',
          },
          carrierId: 'bosta',
          paymentMethod: 'Paymob',
          isProcessing: false,
        },
      }),

      // Single Source of Truth Pricing Calculation
      getPricingBreakdown: () => {
        const { cart, checkout, couponCode, currency } = get();
        return pricingService.calculatePricing({
          items: cart.map(i => ({
            productId: i.product.id,
            unitPrice: createMoney(i.product.price, currency),
            quantity: i.quantity,
          })),
          governorate: checkout.shippingAddress.governorate || 'Cairo',
          carrierId: checkout.carrierId || 'bosta',
          couponCode,
          currency,
        });
      },
    }),
    {
      name: 'baher-silver-commerce-store',
    }
  )
);
