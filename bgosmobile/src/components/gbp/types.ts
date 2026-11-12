/** Shared GBP data contracts (verified against /api route implementations). */

export type StructuredSeoService = {
  id?: string;
  name: string;
  description: string;
  targetKeyword?: string;
  category?: string;
  syncedToGoogle?: boolean;
};

export type Review = {
  id: string;
  rating: number;
  authorName?: string;
  comment?: string;
  source?: string;
  status?: string;
  responseJson?: string;
  googleReviewId?: string;
  createdAt?: string;
  createTime?: string;
  publishedAt?: string;
};

export type ReplyPayload = {
  text?: string;
  replyText?: string;
  repliedAt?: string;
  repliedBy?: string;
  publishedToGoogle?: boolean;
  googleError?: string | null;
  mapsUrl?: string | null;
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
    bookings?: number;
    totalReviews: number;
    avgRating?: number;
    responseRate: number;
    postsPublished?: number;
    reviewsDeltaPct8Wks?: number | null;
    ratingDeltaPct8Wks?: number;
  };
  reviewTrends?: {
    avgReviewsPerWeek: number;
    industryAvg: number;
    weeks: Array<{ label: string; count: number }>;
    total8Weeks?: number;
    deltaPct8Weeks: number | null;
  };
  sixMonthTrends?: {
    months: string[];
    views: number[];
    calls: number[];
    directions: number[];
    website?: number[];
    bookings?: number[];
    interactions?: number[];
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

export type GbpConnectionState =
  | 'connected'
  | 'pending_approval'
  | 'select_profile'
  | 'reconnect_required'
  | 'not_connected';

export type GbpPlaceResult = {
  isConnected: boolean;
  connectionState?: GbpConnectionState;
  isPendingApproval?: boolean;
  googleEmail?: string;
  googleName?: string;
  googlePicture?: string;
  place?: {
    locationId: string;
    title: string;
    category: string;
    address: string;
    city?: string | null;
    phone?: string;
    website?: string;
    description?: string;
    placeId?: string;
    mapsUrl?: string;
    reviewUrl?: string;
    openNow?: boolean | null;
    isVerified?: boolean;
    isPendingApproval?: boolean;
    status?: string;
    statusMessage?: string;
    completionScore?: number;
    missingFields?: string[];
    communicationPhone?: string | null;
    aiReplySalutation?: string | null;
    supportBranding?: boolean;
    additionalCategories?: string[];
    openingDate?: string | null;
    regularHours?: any;
    secondaryPhone?: string | null;
    services?: string[];
    seoServices?: StructuredSeoService[];
    attributes?: Record<string, string[]>;
    specialHours?: Array<{ date: string; open: boolean; openTime?: string; closeTime?: string }>;
    moreHours?: Record<string, string>;
  } | null;
  tenantFallback?: {
    name?: string;
    category?: string;
    address?: string;
    city?: string | null;
    phone?: string;
    website?: string;
    description?: string;
    placeId?: string | null;
    mapsUrl?: string | null;
    reviewUrl?: string | null;
    openNow?: boolean | null;
    completionScore?: number;
    missingFields?: string[];
    communicationPhone?: string | null;
    secondaryPhone?: string | null;
    aiReplySalutation?: string | null;
    supportBranding?: boolean;
    additionalCategories?: string[];
    openingDate?: string | null;
    regularHours?: any;
    services?: string[];
    seoServices?: StructuredSeoService[];
    attributes?: Record<string, string[]>;
    specialHours?: Array<{ date: string; open: boolean; openTime?: string; closeTime?: string }>;
    moreHours?: Record<string, string>;
  } | null;
  metrics?: {
    totalViews: number;
    searchImpressions: number;
    mapsImpressions: number;
    callClicks: number;
    directionRequests: number;
    websiteClicks: number;
    bookings?: number;
    totalReviews: number;
    avgRating: number;
    responseRate: number;
    last30Days?: {
      searchImpressions: number;
      mapsImpressions: number;
      totalViews: number;
      callClicks: number;
      directionRequests: number;
      websiteClicks: number;
      bookings: number;
      conversations: number;
    } | null;
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
  postId?: string;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  gbpCategory?: string;
  mediaFormat?: 'PHOTO' | 'VIDEO' | string;
  createdAt: string;
  source: 'google' | 'queue';
  status?: string;
  caption?: string;
  failureReason?: string;
  /** ISO date the scheduler will publish this queued photo (server-computed). */
  scheduledFor?: string | null;
};

export type PhotosResponse = {
  photos: GbpPhoto[];
  liveCount: number;
  queuedCount: number;
  isConnected?: boolean;
  connectionState?: GbpConnectionState;
  locale?: {
    country: string;
    countryName: string;
    callingCode: string;
    timeZone: string;
    locale: string;
  };
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

