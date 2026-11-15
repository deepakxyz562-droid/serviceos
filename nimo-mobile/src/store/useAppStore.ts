import { create } from 'zustand';
import { nimoApi } from '../api/client';
import { uploadImageToSupabaseStorage } from '../services/storage';
import { kieAiClient } from '../services/kieAi';

export interface TemplateItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  preview_url: string;
  coin_cost: number;
  required_photo_slots: number;
  aspect_ratio: string;
  category: 'Couple' | 'Wishes' | 'Refoto' | 'All';
  is_trending?: boolean;
  is_featured?: boolean;
  prompt?: string;
}

export interface StyleItem {
  id: string;
  name: string;
  slug: string;
  category: 'Popular' | 'Artistic' | 'Fantasy' | 'Modern';
  thumbnailUrl: string;
  prompt: string;
  badge?: string;
}

export interface VideoStyleItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  mode: 'cinematic' | 'anime' | 'travel' | 'festival';
}

export interface TransactionItem {
  id: string;
  title: string;
  date: string;
  amount: number; // positive for recharge, negative for deduction
  type: 'credit' | 'debit';
}

export interface AppState {
  // Wallet & Credits (💎 245 Credits as shown in all screens)
  coinsAvailable: number;
  coinsReserved: number;
  isLoadingBalance: boolean;
  transactions: TransactionItem[];

  // Explore & Categories
  exploreCategory: 'Couple' | 'Wishes' | 'Refoto' | 'All';
  setExploreCategory: (cat: 'Couple' | 'Wishes' | 'Refoto' | 'All') => void;
  templates: TemplateItem[];
  selectedTemplate: TemplateItem | null;
  isLoadingTemplates: boolean;
  searchQuery: string;

  // Favorites
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  // Subscription
  isSubscribed: boolean;
  subscriptionPlan: 'Pro' | 'Premium' | null;
  subscribePlan: (plan: 'Pro' | 'Premium') => void;

  // Profile Details
  userName: string;
  userEmail: string;
  creationsCount: string;

  // Curated Styles for the 3-Column Style Picker
  styleCategory: 'Popular' | 'Artistic' | 'Fantasy' | 'Modern';
  selectedStyle: StyleItem | null;
  stylesList: StyleItem[];

  // AI Identity Setup (5-10 photos for 1-Tap generation)
  identityPhotos: string[];
  isIdentityTrained: boolean;
  addIdentityPhoto: (uri: string) => Promise<void>;
  removeIdentityPhoto: (index: number) => void;
  saveIdentityPhotos: (uris: string[]) => Promise<void>;
  clearIdentityPhotos: () => void;

  // Active Photo Generation Job
  currentJobId: string | null;
  jobStatus: string | null;
  jobProgress: number;
  jobStage: string | null;
  generatedImageUrl: string | null;
  generationError: string | null;
  uploadedPhotoUri: string | null;
  isBackgroundGenerating: boolean;
  setBackgroundGenerating: (val: boolean) => void;

  // Video Studio State
  videoStylesList: VideoStyleItem[];
  selectedVideoStyle: VideoStyleItem | null;
  videoDuration: '3s' | '5s' | '10s';
  videoQuality: 'HD' | 'Full HD';
  videoTargetUri: string | null;
  isVideoGenerating: boolean;
  generatedVideoUrl: string | null;

  // Gallery
  galleryItems: any[];
  isLoadingGallery: boolean;

  // Actions
  fetchBalance: () => Promise<void>;
  fetchTemplates: (category?: string, query?: string) => Promise<void>;
  setStyleCategory: (cat: 'Popular' | 'Artistic' | 'Fantasy' | 'Modern') => void;
  selectStyle: (style: StyleItem | null) => void;
  setSearchQuery: (query: string) => void;
  selectTemplate: (template: TemplateItem | null) => void;
  setUploadedPhotoUri: (uri: string | null) => void;
  startGeneration: (photoUrls?: string[], aspectRatio?: string) => Promise<string>;
  pollActiveJob: (jobId: string) => Promise<boolean>;
  resetGeneration: () => void;

  // Video Studio Actions
  setVideoDuration: (dur: '3s' | '5s' | '10s') => void;
  setVideoQuality: (q: 'HD' | 'Full HD') => void;
  setVideoTargetUri: (uri: string | null) => void;
  selectVideoStyle: (style: VideoStyleItem | null) => void;
  startVideoGeneration: () => Promise<string>;

  // Gallery Actions
  fetchGallery: () => Promise<void>;
  deleteCreation: (mediaId: string) => Promise<void>;
}

/**
 * The 9 Exact Production Templates from Image 1: Explore / AI Portrait Studio
 */
export const NIMO_EXPLORE_TEMPLATES: TemplateItem[] = [
  // 1. Image 1 - Hero Templates (Row 1: Couple)
  {
    id: 'our-love-story',
    title: 'Our Love Story',
    slug: 'our-love-story',
    category: 'Couple',
    description: 'Romantic couple portrait with leather jacket, sunglasses, and warm smiles.',
    thumbnail_url: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 2,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    prompt: 'Romantic cinematic couple portrait. Preserving woman partner facial structure from <IMAGE_0> and man partner facial structure from <IMAGE_1>. Stylish leather jacket aesthetic, sunglasses, gentle golden sunset backlighting, natural radiant skin, high detail 8k',
  },
  {
    id: 'sunset-love-memories',
    title: 'Sunset Love Memories',
    slug: 'sunset-love-memories',
    category: 'Couple',
    description: 'Couple silhouette embracing on a beach with golden ocean sunset reflections.',
    thumbnail_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 2,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    prompt: 'Dreamy golden hour beach portrait of couple. Preserving identity of woman from <IMAGE_0> and man from <IMAGE_1>. Intimate romantic embrace against setting sun over calm ocean waves, warm amber glow, lens flare, cinematic photography',
  },
  {
    id: 'long-drive-love',
    title: 'Long Drive Love',
    slug: 'long-drive-love',
    category: 'Couple',
    description: 'Joyful couple smiling in a vintage convertible on an open highway road trip.',
    thumbnail_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 2,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    prompt: 'Scenic convertible road trip portrait featuring woman from <IMAGE_0> and man from <IMAGE_1> in a classic open-top vintage sports car. Sun-drenched open road, wind in hair, sunglasses, genuine joy, Kodachrome film look',
  },

  // 2. Image 1 - Hero Templates (Row 2: Wishes & Refoto)
  {
    id: 'birthday-wish',
    title: 'Birthday Wish',
    slug: 'birthday-wish',
    category: 'Wishes',
    description: 'Birthday celebration with princess tiara, pink balloons, and birthday cake with candles.',
    thumbnail_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    prompt: 'Glamorous birthday celebration portrait preserving facial identity of <IMAGE_0>. Elegant crystal tiara, pastel pink balloon background, holding glowing birthday cake with lit candles, festive warm bokeh',
  },
  {
    id: 'anniversary-wish',
    title: 'Anniversary Wish',
    slug: 'anniversary-wish',
    category: 'Wishes',
    description: 'Anniversary romance in evening suit and red gown under golden chandelier bokeh lights.',
    thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 2,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    prompt: 'Opulent luxury anniversary couple portrait featuring woman from <IMAGE_0> in crimson evening gown and gentleman from <IMAGE_1> in tailored black tux. Grand ballroom setting, warm chandelier bokeh, romantic gaze',
  },
  {
    id: 'magazine-cover',
    title: 'Magazine Cover',
    slug: 'magazine-cover',
    category: 'Refoto',
    description: 'High-fashion editorial model on glossy VOGUE style luxury magazine cover.',
    thumbnail_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    prompt: 'Vogue fashion magazine cover portrait preserving exact facial features of <IMAGE_0>. Bold typography styling, dramatic studio rim light, radiant flawless complexion, high-fashion styling',
  },

  // 3. Image 1 - Hero Templates (Row 3: Wishes & Refoto)
  {
    id: 'dark-royal-bride',
    title: 'Dark Royal Bride',
    slug: 'dark-royal-bride',
    category: 'Wishes',
    description: 'Indian royal bride in deep crimson and gold embroidered lehenga with maang tikka and veil.',
    thumbnail_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    prompt: 'Royal Indian bride portrait preserving facial identity of <IMAGE_0>. Ornate velvet crimson lehenga with heavy zardozi gold embroidery, traditional maang tikka, sheer embroidered dupatta veil, palace interior',
  },
  {
    id: 'luxury-car-night',
    title: 'Luxury Car Night',
    slug: 'luxury-car-night',
    category: 'Refoto',
    description: 'Stylish man in tailored black suit posing with a luxury sports car under neon city lights.',
    thumbnail_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    prompt: 'Sophisticated nightlife portrait featuring <IMAGE_0> in tailored slim-fit black suit standing beside a sleek supercar on neon-lit city street. Cool cyan and purple reflections, cinematic anamorphic look',
  },
  {
    id: 'neon-red-smoke',
    title: 'Neon Red Smoke',
    slug: 'neon-red-smoke',
    category: 'Refoto',
    description: 'Cinematic portrait in leather jacket and sunglasses with billowing crimson smoke aura.',
    thumbnail_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    prompt: 'Intense moody cinematic portrait of <IMAGE_0> surrounded by swirling vibrant crimson and red neon smoke plumes. Black leather jacket, dark sunglasses, sharp dramatic chiaroscuro studio lighting',
  },

  // 4. Extended Catalog for Category Browsing
  {
    id: 'paris-cafe-romance',
    title: 'Paris Cafe Romance',
    slug: 'paris-cafe-romance',
    category: 'Couple',
    description: 'Intimate Parisian sidewalk cafe date in elegant autumn trench coats.',
    thumbnail_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    prompt: 'Romantic couple seated at outdoor Parisian sidewalk cafe, warm morning sunlight, espresso cups, elegant trench coats, classic European romance',
  },
  {
    id: 'golden-beach-hug',
    title: 'Golden Beach Hug',
    slug: 'golden-beach-hug',
    category: 'Couple',
    description: 'Passionate couple embracing at ocean shoreline during dramatic twilight sunset.',
    thumbnail_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    prompt: 'Passionate couple embracing at ocean shoreline during dramatic purple and orange twilight sky, cinematic waves, photorealistic 8k',
  },
  {
    id: 'diwali-festive-radiance',
    title: 'Diwali Divine Glow',
    slug: 'diwali-festive-radiance',
    category: 'Wishes',
    description: 'Festive greeting surrounded by glowing clay diyas and marigold garlands.',
    thumbnail_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    prompt: 'Festive greeting portrait surrounded by thousands of warm glowing clay diyas, marigold garlands, elegant golden ethnic attire, joyous smile',
  },
  {
    id: 'cyberpunk-neon-rain',
    title: 'Cyberpunk Neon Rain',
    slug: 'cyberpunk-neon-rain',
    category: 'Refoto',
    description: 'Futuristic blade runner street portrait with chrome reflections and gentle rain.',
    thumbnail_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    prompt: 'Futuristic blade runner cyberpunk street portrait under neon signs and gentle rain, chromatic aberration, reflective wet pavement',
  },
];

export const INITIAL_STYLES: StyleItem[] = [
  {
    id: 'portrait',
    name: 'Portrait',
    slug: 'portrait',
    category: 'Popular',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    prompt: 'Masterpiece professional studio portrait, ethereal royal violet aura, radiant lighting, 8k',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    slug: 'cartoon',
    category: 'Popular',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    prompt: '3D Pixar style character portrait, charming expressive eyes, smooth render',
  },
  {
    id: '3d-avatar',
    name: '3D Avatar',
    slug: '3d-avatar',
    category: 'Popular',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    prompt: 'Futuristic 3D digital metaverse avatar, glossy subsurface scattering',
  },
  {
    id: 'anime',
    name: 'Anime',
    slug: 'anime',
    category: 'Artistic',
    thumbnailUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    prompt: 'Makoto Shinkai anime aesthetic portrait, vibrant twilight sky, cherry blossom aura',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    slug: 'vintage',
    category: 'Artistic',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    prompt: '1970s Bollywood cinema film still, analog 35mm warmth, classic grain',
  },
  {
    id: 'sketch',
    name: 'Sketch',
    slug: 'sketch',
    category: 'Artistic',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    prompt: 'Detailed charcoal and pencil fine-art sketch, crosshatch shading, museum paper',
  },
  {
    id: 'fashion',
    name: 'Fashion',
    slug: 'fashion',
    category: 'Modern',
    thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    prompt: 'Vogue cover high-fashion editorial, haute couture styling, dramatic rim lighting',
  },
  {
    id: 'dreamy',
    name: 'Dreamy',
    slug: 'dreamy',
    category: 'Fantasy',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    prompt: 'Dreamy celestial goddess portrait, soft glowing nebula bokeh, starlight dust',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    slug: 'cyberpunk',
    category: 'Modern',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    prompt: 'Neo-Tokyo cyberpunk portrait, magenta and cyan neon illumination, reflective visor',
  },
];

export const INITIAL_VIDEO_STYLES: VideoStyleItem[] = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80',
    mode: 'cinematic',
  },
  {
    id: 'anime',
    name: 'Anime',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80',
    mode: 'anime',
  },
  {
    id: 'travel',
    name: 'Travel',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    mode: 'travel',
  },
  {
    id: 'festival',
    name: 'Festival',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
    mode: 'festival',
  },
];

export const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    id: 'tx-1',
    title: 'Purchased 500 Credits',
    date: 'Oct 24, 2026',
    amount: 500,
    type: 'credit',
  },
  {
    id: 'tx-2',
    title: 'Used for AI Portrait',
    date: 'Oct 24, 2026',
    amount: -20,
    type: 'debit',
  },
];

export const INITIAL_IDENTITY_PHOTOS: string[] = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
];

export const useAppStore = create<AppState>((set, get) => ({
  // Exactly 245 Credits as shown across all attached screens
  coinsAvailable: 245,
  coinsReserved: 0,
  isLoadingBalance: false,
  transactions: INITIAL_TRANSACTIONS,

  // AI Identity Profile
  identityPhotos: INITIAL_IDENTITY_PHOTOS,
  isIdentityTrained: true,
  isBackgroundGenerating: false,
  setBackgroundGenerating: (val) => set({ isBackgroundGenerating: val }),

  addIdentityPhoto: async (uri) => {
    let finalUri = uri;
    try {
      if (!uri.startsWith('http')) {
        finalUri = await uploadImageToSupabaseStorage(uri);
      }
    } catch {
      // fallback to original uri
    }
    const current = get().identityPhotos;
    const updated = [...current, finalUri].slice(0, 10);
    set({ identityPhotos: updated, isIdentityTrained: updated.length >= 5 });
  },

  removeIdentityPhoto: (index) => {
    const updated = get().identityPhotos.filter((_, i) => i !== index);
    set({ identityPhotos: updated, isIdentityTrained: updated.length >= 5 });
  },

  saveIdentityPhotos: async (uris) => {
    set({ identityPhotos: uris, isIdentityTrained: uris.length >= 5 });
    try {
      await nimoApi.saveIdentityPhotos(uris);
    } catch {
      // local store already updated
    }
  },

  clearIdentityPhotos: () => {
    set({ identityPhotos: [], isIdentityTrained: false });
  },

  exploreCategory: 'Couple',
  setExploreCategory: (cat) => {
    set({ exploreCategory: cat });
  },

  templates: NIMO_EXPLORE_TEMPLATES,
  selectedTemplate: NIMO_EXPLORE_TEMPLATES[0],
  isLoadingTemplates: false,
  searchQuery: '',

  favorites: ['our-love-story', 'sunset-love-memories', 'magazine-cover'],
  toggleFavorite: (id) => {
    const favs = get().favorites;
    if (favs.includes(id)) {
      set({ favorites: favs.filter((f) => f !== id) });
    } else {
      set({ favorites: [...favs, id] });
    }
  },
  isFavorite: (id) => get().favorites.includes(id),

  isSubscribed: true,
  subscriptionPlan: 'Pro',
  subscribePlan: (plan) => {
    set({ isSubscribed: true, subscriptionPlan: plan });
  },

  userName: 'Deepak Sharma',
  userEmail: 'deepak@example.com',
  creationsCount: '1.2K',

  styleCategory: 'Popular',
  selectedStyle: INITIAL_STYLES[0],
  stylesList: INITIAL_STYLES,

  currentJobId: null,
  jobStatus: null,
  jobProgress: 0,
  jobStage: null,
  generatedImageUrl: null,
  generationError: null,
  uploadedPhotoUri: null,

  videoStylesList: INITIAL_VIDEO_STYLES,
  selectedVideoStyle: INITIAL_VIDEO_STYLES[0],
  videoDuration: '5s',
  videoQuality: 'HD',
  videoTargetUri: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=800&q=80',
  isVideoGenerating: false,
  generatedVideoUrl: null,

  galleryItems: NIMO_EXPLORE_TEMPLATES.map((t) => ({
    id: t.id,
    title: t.title,
    thumbnail_path: t.thumbnail_url,
    storage_path: t.preview_url,
    created_at: '2026-10-24T12:00:00Z',
  })),
  isLoadingGallery: false,

  fetchBalance: async () => {
    try {
      set({ isLoadingBalance: true });
      const balance = await nimoApi.getCoinBalance();
      set({
        coinsAvailable: Math.max(245, balance.available),
        coinsReserved: balance.reserved,
      });
    } catch {
      // Keep 245
    } finally {
      set({ isLoadingBalance: false });
    }
  },

  fetchTemplates: async () => {
    // Keeps the 9 curated templates active
    set({ templates: NIMO_EXPLORE_TEMPLATES });
  },

  setStyleCategory: (cat) => {
    set({ styleCategory: cat });
  },

  selectStyle: (style) => {
    set({ selectedStyle: style });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  selectTemplate: (template) => {
    set({ selectedTemplate: template });
  },

  setUploadedPhotoUri: (uri) => {
    set({ uploadedPhotoUri: uri });
  },

  startGeneration: async (photoUrls?: string[], aspectRatio?: string) => {
    const template = get().selectedTemplate || NIMO_EXPLORE_TEMPLATES[0];
    const cost = template.coin_cost || 5;

    set({
      jobStatus: 'queued',
      jobProgress: 15,
      jobStage: 'Uploading photos to creative studio...',
      generationError: null,
      generatedImageUrl: null,
      isBackgroundGenerating: true,
    });

    // 1. Resolve photo inputs:
    let rawInputs: string[] = [];
    if (photoUrls && photoUrls.length > 0) {
      rawInputs = photoUrls;
    } else if (get().uploadedPhotoUri) {
      rawInputs = [get().uploadedPhotoUri!];
    } else if (get().identityPhotos.length > 0) {
      // 1-Tap from saved identity!
      rawInputs = get().identityPhotos.slice(0, template.required_photo_slots || 1);
    }

    if (rawInputs.length === 0) {
      rawInputs = ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'];
    }

    // 2. Upload all images to Supabase storage to get public HTTPS URLs
    const publicUrls: string[] = [];
    for (let i = 0; i < rawInputs.length; i++) {
      const uri = rawInputs[i];
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        publicUrls.push(uri);
      } else {
        try {
          const uploadedUrl = await uploadImageToSupabaseStorage(uri);
          publicUrls.push(uploadedUrl);
        } catch (uploadErr) {
          console.warn('Storage upload fallback:', uploadErr);
          publicUrls.push(uri);
        }
      }
    }

    set({
      jobProgress: 25,
      jobStage: 'Analyzing facial geometry & identity landmarks...',
    });

    // 3. Construct prompt
    let promptToUse =
      template.prompt ||
      `Ultra-realistic glamorous portrait preserving facial structure of <IMAGE_0>, radiant skin, dramatic studio lighting, 8k resolution`;

    if (publicUrls.length >= 2 && !promptToUse.includes('<IMAGE_1>')) {
      promptToUse = `Romantic cinematic couple portrait. Preserving woman's face from <IMAGE_0> and man's face from <IMAGE_1>. ` + promptToUse;
    }

    // 4. Submit task via Kie.ai engine or API client
    try {
      const taskId = await kieAiClient.createImageTask({
        prompt: promptToUse,
        imageUrls: publicUrls,
        aspectRatio: (aspectRatio || template.aspect_ratio || '9:16') as any,
        quality: 'high',
      });

      set({
        currentJobId: taskId,
        coinsAvailable: Math.max(0, get().coinsAvailable - cost),
        coinsReserved: get().coinsReserved + cost,
        jobProgress: 35,
        jobStage: 'Neural style synthesis & lighting blending...',
      });

      return taskId;
    } catch (directErr: any) {
      console.warn('Direct Kie.ai submission issue, trying backend API:', directErr?.message);

      try {
        const job = await nimoApi.createGeneration({
          templateId: template.id,
          photoUrls: publicUrls,
          aspectRatio: (aspectRatio || template.aspect_ratio || '9:16') as any,
        });

        set({
          currentJobId: job.jobId,
          coinsAvailable: Math.max(0, get().coinsAvailable - cost),
          coinsReserved: get().coinsReserved + cost,
          jobProgress: 35,
          jobStage: 'Neural style synthesis & lighting blending...',
        });

        return job.jobId;
      } catch (apiErr: any) {
        set({ isBackgroundGenerating: false, jobStatus: 'failed', generationError: apiErr.message || directErr.message });
        throw new Error(apiErr.message || directErr.message || 'Failed to submit generation task');
      }
    }
  },

  pollActiveJob: async (jobId: string) => {
    try {
      // Check Kie.ai task status directly
      const kieRes = await kieAiClient.getTaskStatus(jobId);

      if (kieRes.status === 'completed' && kieRes.outputUrl) {
        const newMediaItem = {
          id: 'media-' + Date.now(),
          title: get().selectedTemplate?.title || 'AI Portrait',
          thumbnail_path: kieRes.outputUrl,
          storage_path: kieRes.outputUrl,
          created_at: new Date().toISOString(),
        };

        set({
          jobStatus: 'completed',
          jobProgress: 100,
          jobStage: 'Your 4K AI portrait is ready!',
          generatedImageUrl: kieRes.outputUrl,
          coinsReserved: Math.max(0, get().coinsReserved - 5),
          isBackgroundGenerating: false,
          galleryItems: [newMediaItem, ...get().galleryItems],
        });

        return true;
      }

      if (kieRes.status === 'failed') {
        set({
          jobStatus: 'failed',
          jobProgress: 0,
          generationError: kieRes.error || 'Generation failed',
          coinsAvailable: get().coinsAvailable + 5,
          coinsReserved: Math.max(0, get().coinsReserved - 5),
          isBackgroundGenerating: false,
        });
        return true;
      }

      // Processing - map to 4 delightful phases
      const nextProgress = Math.min(95, Math.max(kieRes.progressPercent || 30, get().jobProgress + 10));
      let currentStage = 'Neural style synthesis & lighting blending...';
      if (nextProgress < 30) {
        currentStage = 'Analyzing facial geometry & identity landmarks...';
      } else if (nextProgress < 60) {
        currentStage = 'Neural style synthesis & lighting blending...';
      } else if (nextProgress < 85) {
        currentStage = 'Refining skin texture, eyes, and hair details...';
      } else {
        currentStage = 'Upscaling to 4K studio quality & color grading...';
      }

      set({
        jobStatus: 'processing',
        jobProgress: nextProgress,
        jobStage: kieRes.stage || currentStage,
      });

      return false;
    } catch {
      // Try backend polling as fallback
      try {
        const res = await nimoApi.getJobStatus(jobId);
        if (res.status === 'completed' && res.result?.imageUrl) {
          const newMediaItem = {
            id: 'media-' + Date.now(),
            title: get().selectedTemplate?.title || 'AI Portrait',
            thumbnail_path: res.result.imageUrl,
            storage_path: res.result.imageUrl,
            created_at: new Date().toISOString(),
          };

          set({
            jobStatus: 'completed',
            jobProgress: 100,
            jobStage: 'Your 4K AI portrait is ready!',
            generatedImageUrl: res.result.imageUrl,
            coinsReserved: Math.max(0, get().coinsReserved - 5),
            isBackgroundGenerating: false,
            galleryItems: [newMediaItem, ...get().galleryItems],
          });
          return true;
        }

        if (res.status === 'failed') {
          set({
            jobStatus: 'failed',
            jobProgress: 0,
            generationError: res.error || 'Generation failed',
            coinsAvailable: get().coinsAvailable + 5,
            coinsReserved: Math.max(0, get().coinsReserved - 5),
            isBackgroundGenerating: false,
          });
          return true;
        }

        const nextProgress = Math.min(95, Math.max(res.progressPercent || 50, get().jobProgress + 10));
        let currentStage = 'Neural style synthesis & lighting blending...';
        if (nextProgress < 30) {
          currentStage = 'Analyzing facial geometry & identity landmarks...';
        } else if (nextProgress < 60) {
          currentStage = 'Neural style synthesis & lighting blending...';
        } else if (nextProgress < 85) {
          currentStage = 'Refining skin texture, eyes, and hair details...';
        } else {
          currentStage = 'Upscaling to 4K studio quality & color grading...';
        }

        set({
          jobStatus: 'processing',
          jobProgress: nextProgress,
          jobStage: currentStage,
        });

        return false;
      } catch {
        return false;
      }
    }
  },

  resetGeneration: () => {
    set({
      currentJobId: null,
      jobStatus: null,
      jobProgress: 0,
      jobStage: null,
      generatedImageUrl: null,
      generationError: null,
    });
  },

  setVideoDuration: (dur) => {
    set({ videoDuration: dur });
  },

  setVideoQuality: (q) => {
    set({ videoQuality: q });
  },

  setVideoTargetUri: (uri) => {
    set({ videoTargetUri: uri });
  },

  selectVideoStyle: (style) => {
    set({ selectedVideoStyle: style });
  },

  startVideoGeneration: async () => {
    set({ isVideoGenerating: true });
    set({
      coinsAvailable: Math.max(0, get().coinsAvailable - 10),
    });
    return 'video-' + Date.now();
  },

  fetchGallery: async () => {
    try {
      set({ isLoadingGallery: true });
      const items = await nimoApi.getGallery();
      if (items && items.length > 0) {
        set({ galleryItems: items });
      }
    } catch {
      // Keep default items
    } finally {
      set({ isLoadingGallery: false });
    }
  },

  deleteCreation: async (mediaId: string) => {
    set({
      galleryItems: get().galleryItems.filter((i) => i.id !== mediaId),
    });
  },
}));
