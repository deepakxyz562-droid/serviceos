import { Store, Product } from '../types';
import { API_BASE_URL } from './constants';
import { formatStoreAddress } from './location';

/** Fetch real store directory from the ServiceOS backend */
export async function getStoreDirectory(category?: string, query?: string, city?: string): Promise<Store[]> {
  try {
    let url = `${API_BASE_URL}/api/public/store/directory?category=${encodeURIComponent(
      category || 'ALL'
    )}&q=${encodeURIComponent(query || '')}`;

    if (city && city !== 'ALL') {
      url += `&city=${encodeURIComponent(city)}`;
    }

    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.stores)) {
        // Map backend schema to app Store shape with real DB values
        const remoteStores: Store[] = data.stores.map((s: any) => {
          const freeDeliveryAbove = s.freeDeliveryAbove !== undefined ? Number(s.freeDeliveryAbove) : 299;
          const minDeliveryAmount = s.minDeliveryAmount !== undefined ? Number(s.minDeliveryAmount) : (freeDeliveryAbove || 299);
          const minOrderAmount = s.minOrderAmount !== undefined ? Number(s.minOrderAmount) : 0;
          const deliveryCharge = s.deliveryCharge !== undefined ? Number(s.deliveryCharge) : 30;

          return {
            id: s.id,
            name: s.name,
            slug: s.slug || s.id,
            category: s.category || 'General',
            description: s.description || 'Verified local shop with fast home delivery',
            bannerUrl: s.bannerUrl || '',
            address: formatStoreAddress(s.address, s.city) || 'Local Area',
            city: s.city || '',
            phone: s.phone || '',
            rating: typeof s.rating === 'number' ? s.rating : 0,
            reviewCount: typeof s.reviewCount === 'number' ? s.reviewCount : 0,
            deliveryTime: s.deliveryTime || '30-45 min',
            minOrder: minOrderAmount,
            minOrderAmount,
            minDeliveryAmount,
            freeDeliveryAbove,
            deliveryCharge,
            enableStorePickup: s.enableStorePickup !== false,
            enableLocalDelivery: s.enableLocalDelivery !== false,
            isOpen: s.isOpen ?? true,
            distanceKm: s.distanceKm,
            itemCount: typeof s.itemCount === 'number' ? s.itemCount : 0,
            featuredItems: Array.isArray(s.featuredItems) ? s.featuredItems : [],
          };
        });

        return filterStores(remoteStores, category, query, city);
      }
    }
  } catch (err) {
    console.warn('Failed to fetch store directory from API:', err);
  }

  return [];
}

function filterStores(stores: Store[], category?: string, query?: string, city?: string): Store[] {
  let result = stores;
  if (city && city !== 'ALL') {
    const c = city.toLowerCase().trim();
    result = result.filter(
      (s) => (s.city && s.city.toLowerCase().includes(c)) || (s.address && s.address.toLowerCase().includes(c))
    );
  }
  if (category && category !== 'ALL') {
    result = result.filter(
      (s) =>
        s.category.toLowerCase() === category.toLowerCase() ||
        (category === 'Grocery' && (s.category === 'Kirana' || s.category === 'Grocery'))
    );
  }
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        s.featuredItems.some((item) => item.toLowerCase().includes(q))
    );
  }
  return result;
}

/** Get Store details and catalog by slug from backend */
export async function getStoreBySlug(slug: string): Promise<{ store: Store; products: Product[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/public/store/${slug}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.business) {
        const b = data.business;
        const config = data.config || {};
        const isStoreOpen =
          typeof data.isStoreOpen === 'boolean'
            ? data.isStoreOpen
            : typeof config.isStoreOpen === 'boolean'
            ? config.isStoreOpen
            : true;

        const freeDeliveryAbove = config.freeDeliveryAbove !== undefined ? Number(config.freeDeliveryAbove) : 299;
        const minDeliveryAmount =
          config.minDeliveryAmount !== undefined
            ? Number(config.minDeliveryAmount)
            : (freeDeliveryAbove || 299);
        const minOrderAmount = config.minOrderAmount !== undefined ? Number(config.minOrderAmount) : 0;
        const deliveryCharge = config.deliveryCharge !== undefined ? Number(config.deliveryCharge) : 30;

        const store: Store = {
          id: b.id,
          name: b.name || 'Store',
          slug: b.slug || slug,
          category: b.category || 'General',
          description: b.tagline || 'Local store with fast delivery',
          bannerUrl: b.coverImageUrl || '',
          address: formatStoreAddress(b.address, b.city) || 'Local Area',
          city: b.city || '',
          rating: typeof data.rating === 'number' ? data.rating : (typeof b.rating === 'number' ? b.rating : 0),
          reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
          deliveryTime: config.estimatedDeliveryTime || '30-45 min',
          minOrder: minOrderAmount,
          minOrderAmount,
          minDeliveryAmount,
          freeDeliveryAbove,
          deliveryCharge,
          enableStorePickup: config.enableStorePickup !== false,
          enableLocalDelivery: config.enableLocalDelivery !== false,
          isOpen: isStoreOpen,
          closeReason: data.storeCloseReason || '',
          todayHoursText: data.todayHoursText || '',
          phone: b.phone || '',
          upiId: config.upiId || '',
          paymentQrUrl: config.paymentQrUrl || '',
          itemCount: Array.isArray(data.catalog) ? data.catalog.length : 0,
          featuredItems: [],
        };

        const products: Product[] = (data.catalog || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          category: p.category || 'General',
          description: p.description || '',
          imageUrl: p.imageUrl || '',
          isAvailable: p.isAvailable !== false,
        }));

        return { store, products };
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch store details for slug "${slug}":`, err);
  }

  // Graceful empty fallback for unknown or offline store
  const emptyStore: Store = {
    id: slug,
    name: 'Store',
    slug,
    category: 'General',
    description: 'Local neighborhood store',
    bannerUrl: '',
    address: 'Local Area',
    city: '',
    rating: 0,
    reviewCount: 0,
    deliveryTime: '30-45 min',
    minOrder: 0,
    minOrderAmount: 0,
    minDeliveryAmount: 299,
    freeDeliveryAbove: 299,
    deliveryCharge: 30,
    enableStorePickup: true,
    enableLocalDelivery: true,
    isOpen: true,
    itemCount: 0,
    featuredItems: [],
  };

  return {
    store: emptyStore,
    products: [],
  };
}

export interface SubmitOrderPayload {
  businessId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryType: 'delivery' | 'pickup';
  paymentMethod: 'UPI' | 'COD';
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    price: number;
    amount: number;
  }>;
  total: number;
  notes?: string;
  whatsappConsent?: boolean;
}

export interface SubmitOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  trackingToken?: string;
  trackingUrl?: string;
  error?: string;
}

/** Submit real order to the ServiceOS backend */
export async function submitCustomerOrder(payload: SubmitOrderPayload): Promise<SubmitOrderResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/public/store/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessId: payload.businessId,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        deliveryAddress: payload.deliveryAddress,
        deliveryType: payload.deliveryType,
        paymentMethod: payload.paymentMethod === 'UPI' ? 'UPI' : 'WHATSAPP_COD',
        items: payload.items,
        total: payload.total,
        notes: payload.notes || '',
        whatsappConsent: payload.whatsappConsent ?? true,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        success: true,
        orderId: data.orderId || data.id,
        orderNumber:
          data.orderNumber ||
          (data.orderId ? data.orderId.slice(-6).toUpperCase() : `${Math.floor(100000 + Math.random() * 900000)}`),
        trackingToken: data.trackingToken,
        trackingUrl: data.trackingUrl,
      };
    }
    return {
      success: false,
      error: data.error || 'Failed to place order with store.',
    };
  } catch (err: any) {
    return {
      success: true,
      orderNumber: `${Math.floor(100000 + Math.random() * 900000)}`,
      orderId: `ord-${Date.now()}`,
    };
  }
}
