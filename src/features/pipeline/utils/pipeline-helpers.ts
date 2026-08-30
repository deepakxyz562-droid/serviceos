/**
 * pipeline-helpers.ts
 * ===================
 * Sales-Pipeline-specific constants + pure helper functions used by
 * sales-pipeline-view.tsx and the extracted pipeline feature components.
 *
 * What's kept here is pipeline-specific:
 *   - LEGACY_STAGE_MAP / LEGACY_STAGE_LABELS — Phase-3 default-stage fallbacks
 *   - freshness — 'fresh' / 'stale' chip classification
 *   - daysInCurrentStage — uses the latest DealStageHistory entry
 *   - isConverted — checks notesJson for a converted_to_job marker
 *   - formatMoney / assigneeName / isWonDeal / isLostDeal / isClosedDeal —
 *     pure helpers that take the previously-closure-bound values as params
 *
 * USAGE:
 *   import {
 *     LEGACY_STAGE_MAP, LEGACY_STAGE_LABELS,
 *     freshness, daysInCurrentStage, isConverted,
 *     formatMoney, assigneeName, isWonDeal, isLostDeal, isClosedDeal,
 *   } from '@/features/pipeline/utils/pipeline-helpers';
 */

import { differenceInDays, parseISO } from 'date-fns';
import type { Assignee, Deal } from '@/features/pipeline/types';

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Maps legacy 7-stage keys (used by Phase-1/2 deals + the seed-crm script) to
 * their nearest Phase-3 default stage. Used ONLY for display normalization —
 * when a user drags a normalized deal, it gets saved with the new key
 * (a lazy one-way migration). Deals whose stage is already a known DB stage
 * are passed through unchanged.
 */
export const LEGACY_STAGE_MAP: Record<string, string> = {
  new_lead: 'new_request',
  contacted: 'assessment_unscheduled',
  qualified: 'assessment_completed',
  quote_sent: 'quote_awaiting_response',
  negotiation: 'quote_changes_requested',
  won: 'won',
  lost: 'lost',
};

/** Fallback labels for legacy stage keys (only used if no DB stage is loaded). */
export const LEGACY_STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  quote_sent: 'Quote Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

// ─── Pure helpers ───────────────────────────────────────────────────────────

/**
 * Freshness chip color based on deal.createdAt:
 *  - < 1 hour  → 'fresh'  (green)
 *  - > 24 hours → 'stale' (red)
 *  - otherwise → null (no chip)
 */
export function freshness(createdAt: string): 'fresh' | 'stale' | null {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return null;
  const ageHours = (Date.now() - created) / (1000 * 60 * 60);
  if (ageHours < 1) return 'fresh';
  if (ageHours > 24) return 'stale';
  return null;
}

/** Days in current stage — uses the latest DealStageHistory entry's createdAt. */
export function daysInCurrentStage(deal: Deal): number {
  try {
    if (deal.stageHistory && deal.stageHistory.length > 0) {
      const latest = deal.stageHistory[0];
      return Math.max(0, differenceInDays(new Date(), parseISO(latest.createdAt)));
    }
    return Math.max(0, differenceInDays(new Date(), parseISO(deal.createdAt)));
  } catch {
    return 0;
  }
}

/** True if the deal's notesJson contains a `converted_to_job` marker. */
export function isConverted(deal: Deal | null): boolean {
  if (!deal?.notesJson) return false;
  try {
    const notes = JSON.parse(deal.notesJson) as { type?: string }[];
    return Array.isArray(notes) && notes.some((n) => n?.type === 'converted_to_job');
  } catch {
    return false;
  }
}

// ─── Helpers that previously used closure state ─────────────────────────────
// These now take the previously-closure-bound values as explicit params so
// they can live in a pure module. Call sites in sales-pipeline-view.tsx pass
// in the memoized stage keys / assignees / currency formatter.

/** Format a money amount using the company's currency formatter. */
export function formatMoney(
  amount: number,
  sourceCurrency: string | undefined,
  companyCurrency: string,
  formatCurrency: (amount: number, currency?: string) => string,
): string {
  return formatCurrency(amount, sourceCurrency || companyCurrency);
}

/** Resolve the display name for a deal's assignee. */
export function assigneeName(deal: Deal, assignees: Assignee[]): string {
  if (deal.assigneeName) return deal.assigneeName;
  const a = assignees.find((x) => x.id === deal.assigneeId);
  return a?.name || 'Unassigned';
}

/** Returns true if the deal's stage is the closed-won stage. */
export function isWonDeal(deal: Deal, wonStageKey: string): boolean {
  return deal.stage === wonStageKey;
}

/** Returns true if the deal's stage is the closed-lost stage. */
export function isLostDeal(deal: Deal, lostStageKey: string): boolean {
  return deal.stage === lostStageKey;
}

/** Returns true if the deal's stage is any closed stage (won or lost). */
export function isClosedDeal(deal: Deal, closedStageKeys: string[]): boolean {
  return closedStageKeys.includes(deal.stage);
}
