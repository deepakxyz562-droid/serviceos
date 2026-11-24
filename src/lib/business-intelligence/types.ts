/**
 * BGOS Automatic AI Business Intelligence & Understanding Engine
 * =============================================================
 * Single source of truth for all BGOS AI agents (post generation, review replies,
 * chatbots, marketing canvas, SEO keywords, and daily radar).
 *
 * Maintains strict separation between:
 *  - VERIFIED information (grounded in Google Business Profile, verified offerings, customer reviews)
 *  - INFERRED information (statistically probable attributes derived from industry world knowledge)
 *  - UNKNOWN information (missing facts that must never be fabricated)
 */

export type ConfidenceLevel = 'VERIFIED' | 'INFERRED' | 'UNKNOWN';

export type EvidenceSource =
  | 'google_business_profile'
  | 'business_website'
  | 'database_records'
  | 'customer_reviews'
  | 'ai_inference';

export interface ExtractedAttribute<T> {
  value: T;
  confidence: ConfidenceLevel;
  source: EvidenceSource;
  evidenceSnippet?: string;
}

export interface BusinessLocation {
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formattedAddress?: string;
}

export interface ServiceItem {
  name: string;
  category?: string;
  confidence: ConfidenceLevel;
  source: EvidenceSource;
  evidenceSnippet?: string;
}

export interface StructuredBusinessIntelligence {
  /** The authentic name of the business */
  businessName: ExtractedAttribute<string>;

  /** High-level industry sector (e.g., "Entertainment & Media", "Healthcare", "Food & Hospitality") */
  industry: ExtractedAttribute<string>;

  /** Primary business category (e.g., "Film Production", "Dental Clinic", "Italian Restaurant") */
  businessCategory: ExtractedAttribute<string>;

  /** Subcategory or specialization (e.g., "Film Studio & Creative Production House", "Cosmetic Dentistry") */
  businessSubcategory: ExtractedAttribute<string>;

  /** Operating model */
  businessType: ExtractedAttribute<
    | 'Service Business'
    | 'Physical Location'
    | 'Retail'
    | 'Hospitality'
    | 'Professional Services'
    | 'Creative Studio'
    | 'Healthcare'
    | 'Home Services'
    | 'Technology'
    | 'Other'
  >;

  /** Comprehensive, authentic description of what the business does */
  description: ExtractedAttribute<string>;

  /** Services with authoritative evidence (from GBP, offerings, website, or authentic reviews) */
  verifiedServices: ServiceItem[];

  /** Inferred services typical for this business category (clearly separated from verified) */
  inferredServices: ServiceItem[];

  /** Business aspects that could not be determined from available data (must NOT be hallucinated) */
  unknownAttributes: string[];

  /** Products sold (if applicable) */
  products: string[];

  /** Target customer personas identified with evidence */
  targetAudience: ExtractedAttribute<string[]>;

  /** Revenue or delivery model (e.g., "B2B Project Contracts", "Appointment Booking", "In-Studio Workshops") */
  businessModel: ExtractedAttribute<string | null>;

  /** Geographical market and address */
  location: ExtractedAttribute<BusinessLocation | null>;

  /** 5–6 custom marketing content themes tailored to this business */
  marketingContentPillars: string[];

  /** Strict negative boundaries: Unrelated industries/topics this business definitely does NOT do */
  negativeBoundaries: string[];

  /** Recommended brand voice and tone */
  brandTone: ExtractedAttribute<string>;

  /** Unique selling points (USPs) grounded in reviews or profile */
  usps: string[];

  /** Overall confidence score of the intelligence profile (0–100) */
  confidenceScore: number;

  /** All evidence sources used in constructing this profile */
  sourcesUsed: EvidenceSource[];

  /** Timestamp of AI analysis */
  analyzedAt: string;

  /** Schema version */
  version: number;
}

export interface BusinessIntelligenceRawEvidence {
  tenantId: string;
  businessName: string;
  industryFromDb?: string | null;
  addressFromDb?: string | null;
  cityFromDb?: string | null;
  gbpPrimaryCategory?: string | null;
  gbpAdditionalCategories?: string[];
  gbpLocationName?: string | null;
  gbpAttributes?: Record<string, any>;
  offeringsFromSettings?: string[];
  aboutBusinessFromSettings?: string[];
  recentReviews?: Array<{ author: string; rating: number; text: string }>;
  websiteUrl?: string | null;
  websiteSnippet?: string | null;
}
