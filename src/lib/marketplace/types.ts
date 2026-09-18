/**
 * Fieseros Marketplace Domain Types (Phase 0)
 * -------------------------------------------
 * Core type definitions for the Customer Acquisition Marketplace + FSM Flywheel.
 */

export type RequestStatus =
  | 'DRAFT'
  | 'POSTED'
  | 'MATCHING'
  | 'ACTIVE'
  | 'PROPOSALS_RECEIVED'
  | 'PROVIDER_SELECTED'
  | 'BOOKED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type UrgencyLevel = 'emergency' | 'same_day' | 'this_week' | 'flexible';
export type PropertyType = 'residential' | 'commercial';

export type ProposalTierType = 'standard' | 'good' | 'better' | 'best';
export type ProposalStatus = 'SUBMITTED' | 'VIEWED' | 'SHORTLISTED' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';

export type ProposalItemType = 'labor' | 'part' | 'diagnostic' | 'fee' | 'discount';

export interface ProposalItemDef {
  type: ProposalItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ProposalPackageTier {
  tier: ProposalTierType;
  title: string;
  price: number;
  description?: string;
  items: ProposalItemDef[];
  warrantyMonths: number;
  warrantyTerms?: string;
}

export interface MarketplaceFeeStructure {
  plan: string;
  takeRatePct: number; // e.g. 8 for 8%
  grossAmount: number;
  marketplaceFee: number;
  providerPayout: number;
  savingsVsFreePlan: number;
}

export interface MatchScoreResult {
  tenantId: string;
  totalScore: number; // 0..100
  distanceMiles: number;
  categoryMatch: boolean;
  isAvailable: boolean;
  reasons: string[];
}

export interface PublicMarketplaceRequestView {
  id: string;
  publicSlug: string;
  title: string;
  description: string;
  categorySlug: string;
  serviceType?: string | null;
  propertyType: string;
  urgency: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  
  // Fuzzy location (street address locked)
  city: string;
  state: string;
  postalCode: string;
  country: string;
  approxDistanceMiles?: number | null;
  
  preferredDate?: string | null;
  preferredTimeSlot?: string | null;
  
  status: RequestStatus;
  proposalsCount: number;
  createdAt: string;
  expiresAt?: string | null;
  media: Array<{ id: string; url: string; type: string; caption?: string | null }>;
}

export interface UnlockedMarketplaceBookingView {
  bookingId: string;
  requestId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  
  // UNLOCKED Full Address
  streetAddress: string;
  unit?: string | null;
  accessInstructions?: string | null;
  city: string;
  state: string;
  postalCode: string;
  
  agreedPrice: number;
  marketplaceFeeRate: number;
  marketplaceFeeAmount: number;
  payoutAmount: number;
  
  scheduledStart: string;
  scheduledEnd?: string | null;
  
  status: string;
  leadId?: string | null;
  quoteId?: string | null;
  jobId?: string | null;
}
