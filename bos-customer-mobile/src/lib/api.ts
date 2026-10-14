import { Store, Product } from '../types';
import { API_BASE_URL } from './constants';

export const SAMPLE_STORES: Store[] = [
  {
    id: 'store-sharma-kirana',
    name: 'Sharma Kirana Store',
    slug: 'sharma-kirana',
    category: 'Kirana',
    description: 'Fresh Products • Best Prices • Daily Free Home Delivery',
    bannerUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80',
    address: 'Station Road, Kankarbagh',
    city: 'Patna',
    rating: 4.6,
    reviewCount: 250,
    deliveryTime: '30-45 min',
    freeDeliveryAbove: 299,
    minOrder: 100,
    isOpen: true,
    distanceKm: 1.2,
    itemCount: 48,
    featuredItems: ['Aashirvaad Atta 5kg', 'Amul Milk 1L', 'Maggi Noodles', 'Tata Salt'],
  },
  {
    id: 'store-fresh-mart',
    name: 'Fresh Mart',
    slug: 'fresh-mart',
    category: 'Grocery',
    description: 'Organic vegetables, fruits, dairy products and grocery',
    bannerUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
    address: 'Boring Road, Anandpuri',
    city: 'Patna',
    rating: 4.4,
    reviewCount: 180,
    deliveryTime: '25-35 min',
    freeDeliveryAbove: 199,
    isOpen: true,
    distanceKm: 1.5,
    itemCount: 65,
    featuredItems: ['Fresh Tomatoes 1kg', 'Farm Potatoes 2kg', 'Amul Butter 100g'],
  },
  {
    id: 'store-daily-needs',
    name: 'Daily Needs Store',
    slug: 'daily-needs-store',
    category: 'Grocery',
    description: 'All household essentials, cleaning supplies and kitchenware',
    bannerUrl: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=600&auto=format&fit=crop&q=80',
    address: 'Bailey Road, Raja Bazar',
    city: 'Patna',
    rating: 4.3,
    reviewCount: 96,
    deliveryTime: '40-50 min',
    minOrder: 199,
    isOpen: true,
    distanceKm: 2.1,
    itemCount: 38,
    featuredItems: ['Surf Excel 1kg', 'Harpic 1L', 'Vim Gel 500ml'],
  },
  {
    id: 'store-apollo-pharmacy',
    name: 'Apollo Pharmacy',
    slug: 'apollo-pharmacy',
    category: 'Pharmacy',
    description: 'Genuine medicines, wellness products and baby care items',
    bannerUrl: 'https://images.unsplash.com/photo-1586015555751-63c2999f8488?w=600&auto=format&fit=crop&q=80',
    address: 'Frazer Road, Dak Bungalow',
    city: 'Patna',
    rating: 4.5,
    reviewCount: 320,
    deliveryTime: '20-30 min',
    freeDeliveryAbove: 399,
    isOpen: true,
    distanceKm: 1.8,
    itemCount: 110,
    featuredItems: ['Paracetamol 650', 'Dettol Antiseptic', 'Pampers Diapers'],
  },
  {
    id: 'store-cake-corner',
    name: 'The Cake Corner',
    slug: 'the-cake-corner',
    category: 'Food',
    description: 'Artisanal cakes, pastries, fresh bread and celebratory desserts',
    bannerUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    address: 'Patliputra Colony, Main Road',
    city: 'Patna',
    rating: 4.3,
    reviewCount: 95,
    deliveryTime: '35-45 min',
    isOpen: true,
    distanceKm: 2.4,
    itemCount: 28,
    featuredItems: ['Black Forest Cake 500g', 'Chocolate Mousse', 'Fresh Pav'],
  },
  {
    id: 'store-green-leaf',
    name: 'Green Leaf Vegetables',
    slug: 'green-leaf-vegetables',
    category: 'Grocery',
    description: 'Fresh green leafy vegetables direct from local farmer mandi',
    bannerUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    address: 'Rajendra Nagar, Road No. 1',
    city: 'Patna',
    rating: 4.4,
    reviewCount: 120,
    deliveryTime: '20-30 min',
    isOpen: true,
    distanceKm: 0.8,
    itemCount: 32,
    featuredItems: ['Palak 500g', 'Dhaniya 100g', 'Green Chillies 250g'],
  },
];

export const SAMPLE_PRODUCTS: Record<string, Product[]> = {
  'sharma-kirana': [
    {
      id: 'p-atta-5k',
      name: 'Aashirvaad Atta 5kg',
      price: 285,
      category: 'Grocery',
      description: '100% whole wheat chakki atta with natural dietary fiber.',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p-amul-milk',
      name: 'Amul Milk 1L',
      price: 68,
      category: 'Dairy',
      description: 'Pasteurized homogenized toned milk packed with calcium & protein.',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p-maggi-70',
      name: 'Maggi Noodles 70g',
      price: 14,
      category: 'Snacks',
      description: 'Instant 2-minute noodles with classic masala taste.',
      imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p-tata-salt',
      name: 'Tata Salt 1kg',
      price: 28,
      category: 'Grocery',
      description: 'Desh Ka Namak — pure vacuum evaporated iodized salt.',
      imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p-fortune-oil',
      name: 'Fortune Sunflower Oil 1L',
      price: 145,
      category: 'Grocery',
      description: 'Refined sunflower cooking oil with Vitamin A and D.',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p-goodday',
      name: 'Britannia Good Day 120g',
      price: 35,
      category: 'Snacks',
      description: 'Rich butter cookies with delightful aroma and crunchy bite.',
      imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p-coke-750',
      name: 'Coca Cola 750ml',
      price: 40,
      category: 'Beverages',
      description: 'Chilled refreshing sparkling beverage.',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p-dettol-soap',
      name: 'Dettol Soap 75g (3-Pack)',
      price: 110,
      category: 'Personal Care',
      description: '100% germ protection bathing bar.',
      imageUrl: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&auto=format&fit=crop&q=80',
    },
  ],
};

/** Fetch store directory with real DB + seed merge */
export async function getStoreDirectory(category?: string, query?: string): Promise<Store[]> {
  try {
    const url = `${API_BASE_URL}/api/public/store/directory?category=${encodeURIComponent(
      category || 'ALL'
    )}&q=${encodeURIComponent(query || '')}`;

    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.stores) && data.stores.length > 0) {
        // Map backend schema to app Store shape
        const remoteStores: Store[] = data.stores.map((s: any) => ({
          id: s.id,
          name: s.name,
          slug: s.slug || s.id,
          category: s.category || 'Grocery',
          description: s.description || 'Verified local shop with fast home delivery',
          bannerUrl: s.bannerUrl || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80',
          address: s.address || 'Local Area',
          city: s.city || 'Patna',
          rating: s.rating || 4.5,
          reviewCount: s.reviewCount || 120,
          deliveryTime: s.deliveryTime || '30-45 min',
          freeDeliveryAbove: 299,
          isOpen: s.isOpen ?? true,
          distanceKm: s.distanceKm || 1.2,
          itemCount: s.itemCount || 35,
          featuredItems: s.featuredItems || ['Grocery Items', 'Dairy Essentials'],
        }));

        // Merge remote stores with sample stores, deduplicating by slug
        const slugs = new Set(remoteStores.map((r) => r.slug));
        const combined = [...remoteStores, ...SAMPLE_STORES.filter((s) => !slugs.has(s.slug))];
        return filterStores(combined, category, query);
      }
    }
  } catch {}

  // Offline / fallback
  return filterStores(SAMPLE_STORES, category, query);
}

function filterStores(stores: Store[], category?: string, query?: string): Store[] {
  let result = stores;
  if (category && category !== 'ALL') {
    result = result.filter(
      (s) =>
        s.category.toLowerCase() === category.toLowerCase() ||
        (category === 'Grocery' && s.category === 'Kirana')
    );
  }
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.featuredItems.some((item) => item.toLowerCase().includes(q))
    );
  }
  return result;
}

/** Get Store details and catalog by slug */
export async function getStoreBySlug(slug: string): Promise<{ store: Store; products: Product[] }> {
  const store = SAMPLE_STORES.find((s) => s.slug === slug || s.id === slug) || SAMPLE_STORES[0];
  const products = SAMPLE_PRODUCTS[slug] || SAMPLE_PRODUCTS['sharma-kirana'];
  return { store, products };
}
