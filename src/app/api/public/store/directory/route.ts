import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export interface ListedStore {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  bannerUrl: string;
  address: string;
  rating: number;
  deliveryTime: string;
  isOpen: boolean;
  itemCount: number;
  featuredItems: string[];
}

/**
 * GET /api/public/store/directory
 * Local store directory / marketplace listing
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get('category');
    const query = (searchParams.get('q') || '').toLowerCase().trim();

    // 1. Fetch businesses / tenants with commerce configs
    const tenants = await db.tenant.findMany({
      where: {
        ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        address: true,
        city: true,
        logo: true,
      },
      take: 20,
    });

    const configs = await db.gptformCommerceConfig.findMany({
      where: {
        isActive: true,
      },
      take: 20,
    });

    const configMap = new Map(configs.map((c) => [c.businessId, c]));

    // Sample fallback stores for realistic marketplace directory
    const sampleStores: ListedStore[] = [
      {
        id: 'store-1',
        name: 'Sharma Kirana & Supermart',
        slug: 'sharma-kirana',
        category: 'Kirana',
        description: 'Fresh groceries, Aashirvaad Atta, pulses, oils & daily staples',
        bannerUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
        address: 'MG Road, Sector 14',
        rating: 4.8,
        deliveryTime: '25-35 mins',
        isOpen: true,
        itemCount: 45,
        featuredItems: ['Chakki Atta', 'Basmati Rice', 'Pure Ghee'],
      },
      {
        id: 'store-2',
        name: 'Looks Unisex Salon & Spa',
        slug: 'looks-salon',
        category: 'Salon',
        description: 'Haircuts, styling, beard grooming, O3+ facials & head massage',
        bannerUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
        address: 'Commercial Complex, 2nd Floor',
        rating: 4.9,
        deliveryTime: 'Slot Booking',
        isOpen: true,
        itemCount: 18,
        featuredItems: ['Men Haircut', 'Beard Trim', 'Glow Facial'],
      },
      {
        id: 'store-3',
        name: 'Dawat Cafe & Biryani House',
        slug: 'dawat-cafe',
        category: 'Restaurant',
        description: 'Hyderabadi Dum Biryani, Paneer Butter Masala, Momos & Shakes',
        bannerUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        address: 'Food Street, Near Metro Pillar 124',
        rating: 4.7,
        deliveryTime: '20-30 mins',
        isOpen: true,
        itemCount: 32,
        featuredItems: ['Dum Biryani', 'Paneer Tikka', 'Cold Coffee'],
      },
      {
        id: 'store-4',
        name: 'Anaya Ethnic Boutique',
        slug: 'anaya-boutique',
        category: 'Fashion',
        description: 'Trending cotton kurtis, Chanderi sarees, denim & party wear',
        bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
        address: 'Fashion Avenue, Shop 12',
        rating: 4.6,
        deliveryTime: 'Same Day Delivery',
        isOpen: true,
        itemCount: 28,
        featuredItems: ['Cotton Kurti', 'Silk Saree', 'Denim Jeans'],
      },
      {
        id: 'store-5',
        name: 'Sweet Tooth Artisan Bakery',
        slug: 'sweet-tooth',
        category: 'Bakery',
        description: 'Dutch chocolate cakes, eggless pastries, sourdough & cookies',
        bannerUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
        address: 'Bakehouse Corner, Main Market',
        rating: 4.9,
        deliveryTime: '30-45 mins',
        isOpen: true,
        itemCount: 24,
        featuredItems: ['Chocolate Truffle', 'Cheesecake', 'Garlic Bread'],
      },
    ];

    // Merge live DB stores
    const dbStores: ListedStore[] = tenants.map((t) => {
      const cfg = configMap.get(t.id);
      let cat = 'General';
      const ind = (t.industry || '').toLowerCase();
      if (ind.includes('food') || ind.includes('restaurant')) cat = 'Restaurant';
      else if (ind.includes('salon') || ind.includes('beauty')) cat = 'Salon';
      else if (ind.includes('grocery') || ind.includes('kirana')) cat = 'Kirana';

      let items: any[] = [];
      if (cfg?.catalogJson) {
        try {
          items = JSON.parse(cfg.catalogJson);
        } catch {}
      }

      return {
        id: t.id,
        name: t.name,
        slug: t.slug || t.id,
        category: cat,
        description: `${cat} store with instant WhatsApp ordering and live tracking`,
        bannerUrl: t.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        address: [t.address, t.city].filter(Boolean).join(', ') || 'Local Store',
        rating: 4.8,
        deliveryTime: 'Immediate',
        isOpen: cfg ? cfg.isActive : true,
        itemCount: items.length || 10,
        featuredItems: items.slice(0, 3).map((i) => i.name),
      };
    });

    const allStores = [...dbStores, ...sampleStores];

    const filtered = allStores.filter((s) => {
      const matchesCategory =
        !categoryParam ||
        categoryParam === 'ALL' ||
        s.category.toLowerCase() === categoryParam.toLowerCase();
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    return NextResponse.json({
      stores: filtered,
      categories: ['ALL', 'Kirana', 'Restaurant', 'Salon', 'Fashion', 'Bakery'],
    });
  } catch (err: any) {
    console.error('Failed to fetch store directory:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch directory' }, { status: 500 });
  }
}
