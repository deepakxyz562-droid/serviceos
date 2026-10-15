export interface Store {
  id: string;
  name: string;
  slug: string;
  category: 'Kirana' | 'Grocery' | 'Food' | 'Restaurant' | 'Salon' | 'Pharmacy' | 'General';
  description: string;
  bannerUrl: string;
  address: string;
  city?: string;
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  minOrder?: number;
  minOrderAmount?: number;
  minDeliveryAmount?: number;
  freeDeliveryAbove?: number;
  deliveryCharge?: number;
  enableStorePickup?: boolean;
  enableLocalDelivery?: boolean;
  isOpen: boolean;
  closeReason?: string;
  todayHoursText?: string;
  phone?: string;
  upiId?: string;
  paymentQrUrl?: string;
  distanceKm?: number;
  isFavorite?: boolean;
  itemCount: number;
  featuredItems: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

export interface CartItem extends Product {
  qty: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  storeName: string;
  storeSlug: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  deliveryType: 'delivery' | 'pickup' | 'dine_in';
  deliveryAddress?: string;
  createdAt: string;
  trackingUrl?: string;
  phone: string;
}

export interface CityLocation {
  city: string;
  state: string;
  displayName: string;
  latitude?: number;
  longitude?: number;
}
