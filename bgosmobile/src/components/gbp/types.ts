/** Shared GBP data contracts (verified against /api route implementations). */

export type Review = {
  id: string;
  rating: number;
  authorName?: string;
  comment?: string;
  source?: string;
  status?: string;
  responseJson?: string;
  createdAt?: string;
};

export type ReplyPayload = {
  text?: string;
  repliedAt?: string;
  repliedBy?: string;
  publishedToGoogle?: boolean;
  googleError?: string | null;
};

export type AuditCheck = {
  id: string;
  category: string;
  label: string;
  passed: boolean;
  scoreWeight: number;
  currentValue?: string;
  recommendation: string;
  actionRequired: string;
};

export type AuditResult = {
  score: number;
  grade: string;
  isFullyOptimized: boolean;
  checks: AuditCheck[];
  missingCount: number;
  recommendations: string[];
  connectedToGoogle?: boolean;
  reviewsCount?: number;
};

export type AnalyticsResult = {
  isConnected: boolean;
  isLiveGoogleApi: boolean;
  metrics: {
    totalViews: number;
    searchImpressions: number;
    mapsImpressions: number;
    callClicks: number;
    directionRequests: number;
    websiteClicks: number;
    totalReviews: number;
    avgRating?: number;
    responseRate: number;
    postsPublished?: number;
  };
  weeklyTrends?: Record<string, string> | null;
  trendsAvailable: boolean;
  lastUpdated?: string;
  /**
   * Baseline metrics captured when the profile was connected (Task 3-b adds
   * this server-side). The Performance tab renders before/after bars and
   * "▲ N%" ONLY when this object exists — never estimates.
   */
  previousPeriod?: {
    periodStart: string;
    periodEnd: string;
    totalViews: number;
    callClicks: number;
    directionRequests: number;
  } | null;
};

export type GbpPlaceResult = {
  isConnected: boolean;
  isPendingApproval?: boolean;
  googleEmail?: string;
  googleName?: string;
  googlePicture?: string;
  place?: {
    locationId: string;
    title: string;
    category: string;
    address: string;
    phone?: string;
    website?: string;
    placeId?: string;
    mapsUrl?: string;
    reviewUrl?: string;
    isVerified?: boolean;
    isPendingApproval?: boolean;
    status?: string;
    statusMessage?: string;
    completionScore?: number;
    missingFields?: string[];
  } | null;
  tenantFallback?: {
    name?: string;
    category?: string;
    address?: string;
    phone?: string;
    website?: string;
    completionScore?: number;
    missingFields?: string[];
  } | null;
  metrics?: {
    totalViews: number;
    searchImpressions: number;
    mapsImpressions: number;
    callClicks: number;
    directionRequests: number;
    websiteClicks: number;
    totalReviews: number;
    avgRating: number;
    responseRate: number;
  };
};

export type SocialPost = {
  id: string;
  status: string;
  content: string;
  mediaUrls?: string[];
  gbpPostType?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
};

export type GbpPhoto = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  category?: string;
  createdAt: string;
  source: 'google' | 'queue';
  status?: string;
  caption?: string;
  /** ISO date the drip scheduler will publish this queued photo (server-computed). */
  scheduledFor?: string | null;
};

export type PhotosResponse = {
  photos: GbpPhoto[];
  liveCount: number;
  queuedCount: number;
};

export type AiPostDraft = {
  headline: string;
  content: string;
  ctaType?: string;
  ctaLabel?: string;
  postType?: string;
  topic?: string;
  suggestedOffer?: { title?: string; couponCode?: string; discount?: string } | null;
  imagePrompt?: string;
  visualImageUrl?: string;
};

export type AiAction = {
  id: string;
  kind: 'post' | 'photo' | 'reply';
  when: string; // ISO
  title: string;
};

/** POST /api/gbp/keywords response (AI keyword + description generator). */
export type KeywordsResult = {
  success?: boolean;
  keywords?: { keyword: string; intent?: string; searchVolume?: string }[];
  seoDescription?: string;
  characterCount?: number;
  suggestedCategories?: string[];
  headline?: string;
};

/** Per-day business hours entry used by the wizard GBP Info step. */
export type DayHours = { open: boolean; openTime: string; closeTime: string };
export type WeekHours = Record<string, DayHours>;

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

