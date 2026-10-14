import { create } from 'zustand';
import { Product, CartItem, CustomerOrder } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../lib/constants';

interface CartState {
  storeId: string | null;
  storeName: string | null;
  storeSlug: string | null;
  items: CartItem[];
  orders: CustomerOrder[];

  // Actions
  addItem: (product: Product, storeId: string, storeName: string, storeSlug: string) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalAmount: () => number;
  addOrder: (order: CustomerOrder) => Promise<void>;
  loadOrders: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  storeId: null,
  storeName: null,
  storeSlug: null,
  items: [],
  orders: [],

  addItem: (product, storeId, storeName, storeSlug) => {
    const { items, storeId: currentStoreId } = get();

    // If changing store, reset cart with confirmation
    let currentItems = items;
    if (currentStoreId && currentStoreId !== storeId) {
      currentItems = [];
    }

    const existingIndex = currentItems.findIndex((i) => i.id === product.id);
    let updated: CartItem[];
    if (existingIndex > -1) {
      updated = currentItems.map((item, idx) =>
        idx === existingIndex ? { ...item, qty: item.qty + 1 } : item
      );
    } else {
      updated = [...currentItems, { ...product, qty: 1 }];
    }

    set({
      storeId,
      storeName,
      storeSlug,
      items: updated,
    });
  },

  removeItem: (productId) => {
    const { items } = get();
    const existingIndex = items.findIndex((i) => i.id === productId);
    if (existingIndex === -1) return;

    if (items[existingIndex].qty > 1) {
      set({
        items: items.map((item, idx) =>
          idx === existingIndex ? { ...item, qty: item.qty - 1 } : item
        ),
      });
    } else {
      const filtered = items.filter((i) => i.id !== productId);
      set({
        items: filtered,
        storeId: filtered.length === 0 ? null : get().storeId,
      });
    }
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((i) => (i.id === productId ? { ...i, qty } : i)),
    });
  },

  clearCart: () => {
    set({ items: [], storeId: null, storeName: null, storeSlug: null });
  },

  getTotalItems: () => {
    return get().items.reduce((sum, item) => sum + item.qty, 0);
  },

  getTotalAmount: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  addOrder: async (order) => {
    const updated = [order, ...get().orders];
    set({ orders: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
    } catch {}
  },

  loadOrders: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ORDERS);
      if (raw) {
        set({ orders: JSON.parse(raw) });
      }
    } catch {}
  },
}));
