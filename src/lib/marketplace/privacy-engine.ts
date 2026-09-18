/**
 * Fieseros Marketplace Privacy & Redaction Engine
 * -----------------------------------------------
 * Enforces customer address privacy by default. Redacts precise street numbers
 * and contact details from public/provider feeds until proposal acceptance.
 */

import type { PublicMarketplaceRequestView } from './types';

export function redactRequestForPublicFeed(
  request: Record<string, any>,
  providerDistanceMiles?: number | null
): PublicMarketplaceRequestView {
  return {
    id: request.id,
    publicSlug: request.publicSlug || request.id,
    title: request.title,
    description: request.description,
    categorySlug: request.categorySlug,
    serviceType: request.serviceType,
    propertyType: request.propertyType || 'residential',
    urgency: request.urgency || 'flexible',
    budgetMin: request.budgetMin,
    budgetMax: request.budgetMax,
    
    // Fuzzy Location (Street address stripped!)
    city: request.city || 'Chicago',
    state: request.state || 'IL',
    postalCode: request.postalCode || '',
    country: request.country || 'US',
    approxDistanceMiles: providerDistanceMiles ?? request.approxDistanceMiles ?? null,
    
    preferredDate: request.preferredDate ? new Date(request.preferredDate).toISOString() : null,
    preferredTimeSlot: request.preferredTimeSlot,
    
    status: request.status,
    proposalsCount: Array.isArray(request.proposals) ? request.proposals.length : (request.proposalsCount || 0),
    createdAt: request.createdAt ? new Date(request.createdAt).toISOString() : new Date().toISOString(),
    expiresAt: request.expiresAt ? new Date(request.expiresAt).toISOString() : null,
    media: (request.media || []).map((m: any) => ({
      id: m.id,
      url: m.url,
      type: m.type || 'image',
      caption: m.caption,
    })),
  };
}
