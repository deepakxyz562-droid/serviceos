import { create } from 'zustand';
import { Product, CartItem, CustomerOrder } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../lib/constants';

export interface StorePolicy {
  minOrderAmount?: number;
  minDeliveryAmount?: number;
  freeDeliveryAbove?: number;
  deliveryCharge?: number;
  enableStorePickup?: boolean;
  enableLocalDelivery?: boolean;
}

interface CartState {
  storeId: string | null;
  storeName: string | null;
  storeSlug: string | null;
  minOrderAmount: number;
  minDeliveryAmount: number;
  freeDeliveryAbove: number;
  deliveryCharge: number;
  enableStorePickup: boolean;
  enableLocalDelivery: boolean;
  items: CartItem[];
  orders: CustomerOrder[];

  // Actions
  addItem: (
    product: Product,
    storeId: string,
    storeName: string,
    storeSlug: string,
    policy?: Partial<StorePolicy>
  ) => void;
  replaceCartWithItem: (
    product: Product,
    storeId: string,
    storeName: string,
    storeSlug: string,
    policy?: Partial<StorePolicy>
  ) => void;
  setStorePolicy: (policy: Partial<StorePolicy>) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalAmount: () => number;
  addOrder: (order: CustomerOrder) => Promise<void>;
  loadOrders: () => Promise<void>;
  loadCart: () => Promise<void>;
  loadPersisted: () => Promise<void>;
}

const persistCartToStorage = async (state: {
  items: CartItem[];
  storeId: string | null;
  storeName: string | null;
  storeSlug: string | null;
  minOrderAmount: number;
  minDeliveryAmount: number;
  freeDeliveryAbove: number;
  deliveryCharge: number;
  enableStorePickup: boolean;
  enableLocalDelivery: boolean;
}) => {
  try {
    if (state.items.length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEYS.CART);
    } else {
      await AsyncStorage.setItem(
        STORAGE_KEYS.CART,
        JSON.stringify({
          items: state.items,
          storeId: state.storeId,
          storeName: state.storeName,
          storeSlug: state.storeSlug,
          minOrderAmount: state.minOrderAmount,
          minDeliveryAmount: state.minDeliveryAmount,
          freeDeliveryAbove: state.freeDeliveryAbove,
          deliveryCharge: state.deliveryCharge,
          enableStorePickup: state.enableStorePickup,
          enableLocalDelivery: state.enableLocalDelivery,
        })
      );
    }
  } catch {}
};

export const useCartStore = create<CartState>((set, get) => ({
  storeId: null,
  storeName: null,
  storeSlug: null,
  minOrderAmount: 0,
  minDeliveryAmount: 299,
  freeDeliveryAbove: 299,
  deliveryCharge: 30,
  enableStorePickup: true,
  enableLocalDelivery: true,
  items: [],
  orders: [],

  addItem: (product, storeId, storeName, storeSlug, policy) => {
    const { items, storeId: currentStoreId } = get();

    // If changing store, reset cart items
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

    const minOrderAmount = policy?.minOrderAmount !== undefined ? policy.minOrderAmount : get().minOrderAmount;
    const minDeliveryAmount = policy?.minDeliveryAmount !== undefined ? policy.minDeliveryAmount : get().minDeliveryAmount;
    const freeDeliveryAbove = policy?.freeDeliveryAbove !== undefined ? policy.freeDeliveryAbove : get().freeDeliveryAbove;
    const deliveryCharge = policy?.deliveryCharge !== undefined ? policy.deliveryCharge : get().deliveryCharge;
    const enableStorePickup = policy?.enableStorePickup !== undefined ? policy.enableStorePickup : get().enableStorePickup;
    const enableLocalDelivery = policy?.enableLocalDelivery !== undefined ? policy.enableLocalDelivery : get().enableLocalDelivery;

    const newState = {
      storeId,
      storeName,
      storeSlug,
      minOrderAmount,
      minDeliveryAmount,
      freeDeliveryAbove,
      deliveryCharge,
      enableStorePickup,
      enableLocalDelivery,
      items: updated,
    };
    set(newState);
    void persistCartToStorage({ ...get(), ...newState });
  },

  replaceCartWithItem: (product, storeId, storeName, storeSlug, policy) => {
    const minOrderAmount = policy?.minOrderAmount !== undefined ? policy.minOrderAmount : 0;
    const minDeliveryAmount = policy?.minDeliveryAmount !== undefined ? policy.minDeliveryAmount : 299;
    const freeDeliveryAbove = policy?.freeDeliveryAbove !== undefined ? policy.freeDeliveryAbove : 299;
    const deliveryCharge = policy?.deliveryCharge !== undefined ? policy.deliveryCharge : 30;
    const enableStorePickup = policy?.enableStorePickup !== undefined ? policy.enableStorePickup : true;
    const enableLocalDelivery = policy?.enableLocalDelivery !== undefined ? policy.enableLocalDelivery : true;

    const newState = {
      storeId,
      storeName,
      storeSlug,
      minOrderAmount,
      minDeliveryAmount,
      freeDeliveryAbove,
      deliveryCharge,
      enableStorePickup,
      enableLocalDelivery,
      items: [{ ...product, qty: 1 }],
    };
    set(newState);
    void persistCartToStorage({ ...get(), ...newState });
  },

  setStorePolicy: (policy) => {
    const minOrderAmount = policy.minOrderAmount !== undefined ? policy.minOrderAmount : get().minOrderAmount;
    const minDeliveryAmount = policy.minDeliveryAmount !== undefined ? policy.minDeliveryAmount : get().minDeliveryAmount;
    const freeDeliveryAbove = policy.freeDeliveryAbove !== undefined ? policy.freeDeliveryAbove : get().freeDeliveryAbove;
    const deliveryCharge = policy.deliveryCharge !== undefined ? policy.deliveryCharge : get().deliveryCharge;
    const enableStorePickup = policy.enableStorePickup !== undefined ? policy.enableStorePickup : get().enableStorePickup;
    const enableLocalDelivery = policy.enableLocalDelivery !== undefined ? policy.enableLocalDelivery : get().enableLocalDelivery;

    const newState = {
      minOrderAmount,
      minDeliveryAmount,
      freeDeliveryAbove,
      deliveryCharge,
      enableStorePickup,
      enableLocalDelivery,
    };
    set(newState);
    void persistCartToStorage({ ...get(), ...newState });
  },

  removeItem: (productId) => {
    const { items } = get();
    const existingIndex = items.findIndex((i) => i.id === productId);
    if (existingIndex === -1) return;

    let updated: CartItem[];
    let newStoreId = get().storeId;
    let newStoreName = get().storeName;
    let newStoreSlug = get().storeSlug;

    if (items[existingIndex].qty > 1) {
      updated = items.map((item, idx) =>
        idx === existingIndex ? { ...item, qty: item.qty - 1 } : item
      );
    } else {
      updated = items.filter((i) => i.id !== productId);
      if (updated.length === 0) {
        newStoreId = null;
        newStoreName = null;
        newStoreSlug = null;
      }
    }

    const newState = {
      items: updated,
      storeId: newStoreId,
      storeName: newStoreName,
      storeSlug: newStoreSlug,
    };
    set(newState);
    void persistCartToStorage({ ...get(), ...newState });
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    const updated = get().items.map((i) => (i.id === productId ? { ...i, qty } : i));
    const newState = {
      items: updated,
    };
    set(newState);
    void persistCartToStorage({ ...get(), ...newState });
  },

  clearCart: () => {
    const newState = {
      items: [],
      storeId: null,
      storeName: null,
      storeSlug: null,
      minOrderAmount: 0,
      minDeliveryAmount: 299,
      freeDeliveryAbove: 299,
      deliveryCharge: 30,
      enableStorePickup: true,
      enableLocalDelivery: true,
    };
    set(newState);
    void persistCartToStorage({ ...get(), ...newState });
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

  loadCart: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CART);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items)) {
          set({
            items: parsed.items,
            storeId: parsed.storeId || null,
            storeName: parsed.storeName || null,
            storeSlug: parsed.storeSlug || null,
            minOrderAmount: typeof parsed.minOrderAmount === 'number' ? parsed.minOrderAmount : 0,
            minDeliveryAmount: typeof parsed.minDeliveryAmount === 'number' ? parsed.minDeliveryAmount : 299,
            freeDeliveryAbove: typeof parsed.freeDeliveryAbove === 'number' ? parsed.freeDeliveryAbove : 299,
            deliveryCharge: typeof parsed.deliveryCharge === 'number' ? parsed.deliveryCharge : 30,
            enableStorePickup: parsed.enableStorePickup !== false,
            enableLocalDelivery: parsed.enableLocalDelivery !== false,
          });
        }
      }
    } catch {}
  },

  loadPersisted: async () => {
    await Promise.all([get().loadOrders(), get().loadCart()]);
  },
}));
