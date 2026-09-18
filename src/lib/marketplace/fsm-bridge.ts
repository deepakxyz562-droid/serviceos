/**
 * Fieseros Marketplace → Native FSM Bridge
 * -----------------------------------------
 * Automatically converts an accepted Marketplace Booking into the provider's
 * native Operating System entities: Customer -> Lead -> Quote -> Job.
 *
 * Adheres to the Single Core Principle: Reuses existing FSM workflows without
 * building duplicate job-management systems.
 */

import { calculateMarketplaceFee } from './fee-engine';
import type { UnlockedMarketplaceBookingView } from './types';

export interface FsmBridgeInput {
  requestId: string;
  proposalId: string;
  tenantId: string;
  tenantPlan?: string | null;
  workspaceId?: string | null;
  
  customer: {
    name: string;
    phone: string;
    email?: string | null;
    streetAddress: string;
    unit?: string | null;
    city: string;
    state: string;
    postalCode: string;
    accessInstructions?: string | null;
  };
  
  proposal: {
    title: string;
    price: number;
    items?: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    scheduledStart: Date;
    scheduledEnd?: Date | null;
    warrantyTerms?: string | null;
  };
}

export interface FsmBridgeResult {
  booking: UnlockedMarketplaceBookingView;
  customerId: string;
  leadId: string;
  quoteId: string;
  jobId: string;
  success: boolean;
}

/**
 * Maps the accepted marketplace booking into native FSM entity payloads.
 */
export function buildFsmEntitiesForBooking(input: FsmBridgeInput) {
  const { customer, proposal, tenantPlan } = input;
  const fullAddress = `${customer.streetAddress}${customer.unit ? `, Unit ${customer.unit}` : ''}, ${customer.city}, ${customer.state} ${customer.postalCode}`;
  
  // 1. Fee calculation
  const feeInfo = calculateMarketplaceFee(tenantPlan, proposal.price);

  // 2. Customer Payload
  const customerPayload = {
    name: customer.name,
    phone: customer.phone,
    email: customer.email || null,
    address: fullAddress,
    leadSource: 'marketplace',
    tenantId: input.tenantId,
    workspaceId: input.workspaceId || null,
  };

  // 3. Lead Payload
  const leadPayload = {
    name: customer.name,
    phone: customer.phone,
    email: customer.email || null,
    address: fullAddress,
    source: 'marketplace',
    status: 'won', // Converted immediately on booking acceptance
    value: proposal.price,
    description: `Marketplace Booking: ${proposal.title}`,
    tenantId: input.tenantId,
    marketplaceAttributionJson: JSON.stringify({
      source: 'fieseros_marketplace',
      requestId: input.requestId,
      proposalId: input.proposalId,
      feeRate: feeInfo.takeRatePct,
      feeAmount: feeInfo.marketplaceFee,
    }),
  };

  // 4. Job Payload
  const jobPayload = {
    title: proposal.title,
    description: `Marketplace request #${input.requestId.substring(0, 8)}. Warranty: ${proposal.warrantyTerms || 'Standard'}`,
    status: 'scheduled',
    priority: 'high',
    address: fullAddress,
    quotedAmount: proposal.price,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email || null,
    scheduledAt: proposal.scheduledStart,
    workspaceId: input.workspaceId || null,
  };

  return {
    customerPayload,
    leadPayload,
    jobPayload,
    feeInfo,
  };
}
