export interface BgosPageVisibility {
  published: boolean;
  showServices: boolean;
  showProducts?: boolean;
  showPhotos: boolean;
  showReviews: boolean;
  showFaqs: boolean;
  showInquiryForm: boolean;
  showHours: boolean;
  showChatbot: boolean;
}

export type BgosFulfillmentMode = 'pickup' | 'delivery' | 'food_order' | 'in_store';

export interface BgosProduct {
  id: string;
  name: string;
  description: string;
  price: number | null;
  category: string;
  imageUrl?: string | null;
  inStock: boolean;
  fulfillmentModes?: BgosFulfillmentMode[];
  updatedAt?: string;
}

export interface BgosStoreSettings {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  foodOrderingEnabled: boolean;
  inStoreShoppingEnabled: boolean;
  orderActionUrl?: string;
  deliveryRadius?: string;
  minOrderAmount?: number | null;
}

export interface BgosSocialProfiles {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
}

export interface BgosWorkspace {
  name: string;
  mode: 'local' | 'agency';
  publicSlug?: string;
  locale?: {
    country: string;
    countryName: string;
    callingCode: string;
    timeZone: string;
    locale: string;
  };
  links: { profile: string | null; booking: string | null; form: string | null; review: string | null };
  automations: { profileAssistant: boolean; offlineReply: boolean; gbp?: Record<string, boolean> };
  bookingPageConfig?: {
    businessName?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    address?: string;
    tagline?: string;
    headline?: string;
    seoDescription?: string;
    coverImage?: string | null;
    logoUrl?: string | null;
    accentColor?: string;
    publicSlug?: string;
    onlineBookingEnabled?: boolean;
    pageVisibility?: Partial<BgosPageVisibility>;
  };
  gbpServices?: string[];
  hasSeededDummyServices?: boolean;
  products?: BgosProduct[];
  storeSettings?: BgosStoreSettings;
  socialProfiles?: BgosSocialProfiles;
  intakeForm?: { id: string; name: string; slug: string } | null;
  plan: { code: string; status: string };
  billing?: {
    region: 'india' | 'international';
    currency: 'INR' | 'USD';
    countryCode: string;
    startingPriceLabel: string;
  };
  usage?: { contacts: number; forms: number; usedLeadCredits: number; leadCreditLimit: number };
}
export interface BgosConversation {
  id: string; externalConversationId?: string; customerName: string; channel: string; lastMessage: string;
  lastMessageTime: string; unreadCount: number; aiPaused: boolean; status: string;
}
export interface BgosMessage {
  id: string; content: string; sender: 'customer' | 'agent' | 'system'; timestamp: string;
  delivery?: { status: string; reason?: string; error?: string };
}
