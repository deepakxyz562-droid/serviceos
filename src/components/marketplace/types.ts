/**
 * Shared TypeScript types for the marketplace UI.
 * Mirrors the response shapes of the /api/marketplace/* routes (Phase 10).
 */

export type BookingMode = 'instant' | 'quote_request' | 'emergency' | 'ai_auto';
export type Urgency = 'low' | 'medium' | 'high' | 'emergency';

export interface ProviderService {
  id: string;
  name: string;
  slug: string | null;
  basePrice: number | null;
  duration: number | null;
  image: string | null;
  description?: string | null;
  longDescription?: string | null;
  category?: string | null;
}

/** Provider list item — shape returned by GET /api/marketplace/providers */
export interface ProviderListItem {
  id: string;
  name: string;
  slug: string | null;
  publicSlug: string | null;
  tagline: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  currency: string | null;
  rating: number | null;
  reviewCount: number | null;
  description: string | null;
  coverImage: string | null;
  pricingType: string | null;
  callOutFee: number | null;
  emergencyServiceAvailable: boolean;
  serviceAreas: string[];
  services: ProviderService[];
  featured: string | null;
  /**
   * Verification flags — used to render trust badges on provider cards.
   * The marketplace browse query no longer hard-requires all 4 gates
   * (that excluded the long tail of providers who have a public page but
   * never finished Stripe Connect). Instead we show each gate as a badge
   * so users can see at a glance how verified a provider is.
   */
  identityVerified: boolean;
  businessVerified: boolean;
  insuranceVerified: boolean;
  stripeConnected: boolean;
  planStatus: string | null;
}

export interface ProviderListResponse {
  items: ProviderListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  isVerified: boolean;
  certificateNumber: string | null;
  documentUrl: string | null;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string | null;
  source: string | null;
  response: { comment?: string; createdAt?: string } | null;
  createdAt: string;
}

export interface ProviderPortfolioItem {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  [k: string]: unknown;
}

export interface ProviderPortfolio {
  items: ProviderPortfolioItem[];
  videos: ProviderPortfolioItem[];
  awards: ProviderPortfolioItem[];
  projects: ProviderPortfolioItem[];
  team: ProviderPortfolioItem[];
}

export interface ProviderProfile {
  // tenant fields
  id: string;
  name: string;
  slug: string | null;
  publicSlug: string | null;
  tagline: string | null;
  description: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  currency: string | null;
  rating: number | null;
  reviewCount: number | null;
  coverImage: string | null;
  gallery: string[];
  businessHours: Record<string, unknown>;
  serviceAreas: string[];
  socialLinks: Record<string, string>;
  faqs: { question: string; answer: string }[];
  pricingType: string | null;
  callOutFee: number | null;
  emergencyServiceAvailable: boolean;
  languages: string[];
  vatNumber: string | null;
  licenceNumber: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  employeesCount: number | null;
  businessCategories: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  email: string | null;
  phone: string | null;
  identityVerified: boolean;
  businessVerified: boolean;
  insuranceVerified: boolean;
  stripeConnected: boolean;
  marketplaceOptIn: boolean;
}

export interface ProviderProfileResponse {
  tenant: ProviderProfile;
  services: ProviderService[];
  portfolio: ProviderPortfolio;
  certifications: Certification[];
  reviews: Review[];
  featured: { type: string; priority: number | null } | null;
}

export interface AiRouteExtraction {
  category: string | null;
  service: string | null;
  urgency: Urgency;
  budgetLow: number | null;
  budgetHigh: number | null;
  location: string | null;
  skills: string[];
  durationMins: number | null;
  summary: string;
  confidence: number;
}

export interface AiRouteNearbyProvider {
  tenantId: string;
  name: string;
  slug: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  rating: number;
  reviewCount: number;
  emergencyServiceAvailable: boolean;
  currency: string;
  estimatedPriceLow: number | null;
  estimatedPriceHigh: number | null;
  inServiceArea: boolean;
}

export interface AiRouteResponse {
  extraction: AiRouteExtraction;
  bookingMode: BookingMode;
  estimatedCost: { low: number; high: number; currency: string; basis: string };
  nearbyProviders: AiRouteNearbyProvider[];
  recommendedAction: string;
  aiModel: string;
  fallback: boolean;
}

export interface InstantBookingResponse {
  booking: { id: string; [k: string]: unknown };
  job: { id: string; [k: string]: unknown } | null;
  paymentIntent: { clientSecret: string; paymentIntentId: string } | null;
}

export interface QuoteRequestResponse {
  jobRequest: { id: string; [k: string]: unknown };
  broadcastCount: number;
}

export interface EmergencyDispatchResponse {
  emergencyDispatch: {
    id: string;
    status: string;
    acceptedById: string | null;
    acceptedAt: string | null;
    estimatedArrivalMins: number | null;
    [k: string]: unknown;
  };
  broadcastCount: number;
}

export interface EmergencyStatusResponse {
  emergencyDispatch: {
    id: string;
    title: string;
    description: string | null;
    industry: string | null;
    address: string | null;
    status: string;
    acceptedById: string | null;
    acceptedAt: string | null;
    providerEnRouteAt: string | null;
    providerOnSiteAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    estimatedArrivalMins: number | null;
    actualArrivalMins: number | null;
    estimatedCost: number | null;
    finalCost: number | null;
    currency: string | null;
    paymentStatus: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

/** Build a marketplace API URL with the gateway port param baked in. */
export function mpUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, 'http://localhost');
  url.searchParams.set('XTransformPort', '3000');
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return `${url.pathname}?${url.searchParams.toString()}`;
}
