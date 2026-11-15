import { getNimoServiceClient } from './supabase';

export interface TemplateFilter {
  categorySlug?: string;
  search?: string;
  isTrending?: boolean;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
}

export class TemplateService {
  /**
   * Fetch all active categories
   */
  static async getCategories() {
    const supabase = getNimoServiceClient();
    const { data, error } = await supabase
      .from('template_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return [
        { id: '11111111-1111-1111-1111-111111111101', name: 'Couple', slug: 'couple', icon: 'heart', sort_order: 1 },
        { id: '11111111-1111-1111-1111-111111111102', name: 'Wishes', slug: 'wishes', icon: 'gift', sort_order: 2 },
        { id: '11111111-1111-1111-1111-111111111103', name: 'Refoto', slug: 'refoto', icon: 'refresh-cw', sort_order: 3 },
      ];
    }

    return [{ id: 'cat-all', name: 'All', slug: 'all', icon: 'grid', sort_order: 0 }, ...data];
  }

  /**
   * Fetch templates with filtering & pagination
   */
  static async getTemplates(filter: TemplateFilter = {}) {
    const supabase = getNimoServiceClient();
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(50, filter.limit || 20);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('templates')
      .select('*, template_categories(id, name, slug)', { count: 'exact' })
      .eq('is_active', true);

    if (filter.categorySlug && filter.categorySlug !== 'all') {
      if (filter.categorySlug === 'trending') {
        query = query.eq('is_trending', true);
      } else {
        const { data: cat } = await supabase
          .from('template_categories')
          .select('id')
          .eq('slug', filter.categorySlug)
          .single();

        if (cat) {
          query = query.eq('category_id', cat.id);
        }
      }
    }

    if (filter.search) {
      query = query.ilike('title', `%${filter.search}%`);
    }

    if (filter.isFeatured) {
      query = query.eq('is_featured', true);
    }

    const { data, count, error } = await query
      .order('is_trending', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error || !data || data.length === 0) {
      let result = FALLBACK_TEMPLATES;
      if (filter.categorySlug && filter.categorySlug !== 'all') {
        result = result.filter(
          (t) => t.template_categories?.slug === filter.categorySlug || t.category_id === filter.categorySlug
        );
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        result = result.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
      }
      return {
        data: result,
        total: result.length,
        page,
        limit,
        hasMore: false,
      };
    }

    return {
      data,
      total: count || data.length,
      page,
      limit,
      hasMore: (count || 0) > to + 1,
    };
  }

  /**
   * Fetch single template by ID or slug
   */
  static async getTemplateById(idOrSlug: string) {
    const supabase = getNimoServiceClient();
    
    // Check if UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const query = supabase
      .from('templates')
      .select('*, template_categories(id, name, slug)')
      .eq('is_active', true);

    const { data } = isUuid
      ? await query.eq('id', idOrSlug).single()
      : await query.eq('slug', idOrSlug).single();

    if (data) return data;

    // Fallback to in-memory templates
    return (
      FALLBACK_TEMPLATES.find((t) => t.id === idOrSlug || t.slug === idOrSlug) ||
      FALLBACK_TEMPLATES[0]
    );
  }
}

export const FALLBACK_TEMPLATES = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    category_id: '11111111-1111-1111-1111-111111111101',
    title: 'Our Love Story',
    slug: 'our-love-story',
    description: 'Romantic couple portrait with leather jacket, sunglasses, and warm smiles.',
    thumbnail_url: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    sort_order: 1,
    prompt_config: {
      prompt: 'Romantic cinematic couple portrait preserving facial structure of <IMAGE_0>. Leather jacket aesthetic, stylish sunglasses, gentle sunset backlighting, natural radiant skin, high detail 8k',
      style: 'romantic_couple',
      quality: 'high',
    },
    template_categories: { id: '11111111-1111-1111-1111-111111111101', name: 'Couple', slug: 'couple' },
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    category_id: '11111111-1111-1111-1111-111111111101',
    title: 'Sunset Love Memories',
    slug: 'sunset-love-memories',
    description: 'Couple silhouette embracing on a beach with golden ocean sunset reflections.',
    thumbnail_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    sort_order: 2,
    prompt_config: {
      prompt: 'Dreamy golden hour beach portrait preserving identity of <IMAGE_0>. Intimate romantic embrace against setting sun over calm ocean waves, warm amber glow, lens flare, cinematic photography',
      style: 'sunset_romance',
      quality: 'high',
    },
    template_categories: { id: '11111111-1111-1111-1111-111111111101', name: 'Couple', slug: 'couple' },
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    category_id: '11111111-1111-1111-1111-111111111101',
    title: 'Long Drive Love',
    slug: 'long-drive-love',
    description: 'Joyful couple smiling in a vintage convertible on an open highway road trip.',
    thumbnail_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    sort_order: 3,
    prompt_config: {
      prompt: 'Scenic road trip portrait featuring <IMAGE_0> in a classic open-top convertible. Sun-drenched open road, wind in hair, sunglasses, genuine joy, Kodachrome film look',
      style: 'adventure_couple',
      quality: 'high',
    },
    template_categories: { id: '11111111-1111-1111-1111-111111111101', name: 'Couple', slug: 'couple' },
  },
  {
    id: '22222222-2222-2222-2222-222222222204',
    category_id: '11111111-1111-1111-1111-111111111102',
    title: 'Birthday Wish',
    slug: 'birthday-wish',
    description: 'Birthday celebration with princess tiara, pink balloons, and birthday cake with candles.',
    thumbnail_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    sort_order: 4,
    prompt_config: {
      prompt: 'Glamorous birthday celebration portrait preserving facial identity of <IMAGE_0>. Elegant crystal tiara, pastel pink balloon background, holding glowing birthday cake with lit candles, festive warm bokeh',
      style: 'birthday_glam',
      quality: 'high',
    },
    template_categories: { id: '11111111-1111-1111-1111-111111111102', name: 'Wishes', slug: 'wishes' },
  },
  {
    id: '22222222-2222-2222-2222-222222222205',
    category_id: '11111111-1111-1111-1111-111111111102',
    title: 'Anniversary Wish',
    slug: 'anniversary-wish',
    description: 'Anniversary romance in evening suit and red gown under golden chandelier bokeh lights.',
    thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    sort_order: 5,
    prompt_config: {
      prompt: 'Opulent luxury anniversary portrait featuring <IMAGE_0> in tailored evening formalwear. Grand ballroom setting, warm chandelier bokeh, romantic gaze, exquisite high-end atmosphere',
      style: 'anniversary_luxury',
      quality: 'high',
    },
    template_categories: { id: '11111111-1111-1111-1111-111111111102', name: 'Wishes', slug: 'wishes' },
  },
  {
    id: '22222222-2222-2222-2222-222222222206',
    category_id: '11111111-1111-1111-1111-111111111103',
    title: 'Magazine Cover',
    slug: 'magazine-cover',
    description: 'High-fashion editorial model on glossy VOGUE style luxury magazine cover.',
    thumbnail_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    sort_order: 6,
    prompt_config: {
      prompt: 'Vogue fashion magazine cover portrait preserving exact facial features of <IMAGE_0>. Bold typography styling, dramatic studio rim light, radiant flawless complexion, high-fashion styling',
      style: 'magazine_editorial',
      quality: 'high',
    },
    template_categories: { id: '11111111-1111-1111-1111-111111111103', name: 'Refoto', slug: 'refoto' },
  },
  {
    id: '22222222-2222-2222-2222-222222222207',
    category_id: '11111111-1111-1111-1111-111111111102',
    title: 'Dark Royal Bride',
    slug: 'dark-royal-bride',
    description: 'Indian royal bride in deep crimson and gold embroidered lehenga with maang tikka and veil.',
    thumbnail_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    sort_order: 7,
    prompt_config: {
      prompt: 'Royal Indian bride portrait preserving facial identity of <IMAGE_0>. Ornate velvet crimson lehenga with heavy zardozi gold embroidery, traditional maang tikka, sheer embroidered dupatta veil, palace interior',
      style: 'royal_indian_bride',
      quality: 'high',
    },
    template_categories: { id: '11111111-1111-1111-1111-111111111102', name: 'Wishes', slug: 'wishes' },
  },
  {
    id: '22222222-2222-2222-2222-222222222208',
    category_id: '11111111-1111-1111-1111-111111111103',
    title: 'Luxury Car Night',
    slug: 'luxury-car-night',
    description: 'Stylish man in tailored black suit posing with a luxury sports car under neon city lights.',
    thumbnail_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    sort_order: 8,
    prompt_config: {
      prompt: 'Sophisticated nightlife portrait featuring <IMAGE_0> in tailored slim-fit black suit standing beside a sleek supercar on neon-lit city street. Cool cyan and purple reflections, cinematic anamorphic look',
      style: 'luxury_nightlife',
      quality: 'high',
    },
    template_categories: { id: '11111111-1111-1111-1111-111111111103', name: 'Refoto', slug: 'refoto' },
  },
  {
    id: '22222222-2222-2222-2222-222222222209',
    category_id: '11111111-1111-1111-1111-111111111103',
    title: 'Neon Red Smoke',
    slug: 'neon-red-smoke',
    description: 'Cinematic portrait in leather jacket and sunglasses with billowing crimson smoke aura.',
    thumbnail_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    sort_order: 9,
    prompt_config: {
      prompt: 'Intense moody cinematic portrait of <IMAGE_0> surrounded by swirling vibrant crimson and red neon smoke plumes. Black leather jacket, dark sunglasses, sharp dramatic chiaroscuro studio lighting',
      style: 'neon_smoke_portrait',
      quality: 'high',
    },
    template_categories: { id: '11111111-1111-1111-1111-111111111103', name: 'Refoto', slug: 'refoto' },
  },
];
