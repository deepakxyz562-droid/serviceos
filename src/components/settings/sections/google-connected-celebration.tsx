'use client';

/**
 * GoogleConnectedCelebration
 * --------------------------
 *
 * A celebration dialog shown the FIRST time a tenant connects their Google
 * Business Profile URL. Reframes the connection from "data entry" to
 * "growth unlock" — exactly as the review direction described:
 *
 *   "After SureTech successfully connects its Google Business Profile, show
 *    inside Fieseros: '🚀 Your Google Business Profile is connected. Your
 *    customers can now discover your business on Google.' + a checklist of
 *    next-step growth features."
 *
 * BEHAVIOR
 * --------
 *   - Shows ONCE after first GBP URL save (tracked via localStorage key
 *     'fieseros:gbp-celebration-seen:<tenantId>')
 *   - "Set up Google lead capture" → closes dialog (Commit 3a will wire this
 *     to the booking-link copy UI)
 *   - "Maybe later" → closes dialog
 *   - "Show me again" link in the settings panel re-opens it on demand
 *
 * The localStorage key is per-tenant so a user who manages multiple tenants
 * sees the celebration once per tenant (not once globally).
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, CheckCircle2, ArrowRight } from 'lucide-react';

interface GoogleConnectedCelebrationProps {
  /** Whether the dialog is currently open (controlled). */
  open: boolean;
  /** Called when the dialog should close (via "Maybe later" or backdrop click). */
  onClose: () => void;
  /** Called when the user clicks "Set up Google lead capture" — the parent
   * decides what to do (Commit 3a will navigate to the booking-link UI). */
  onSetUpLeadCapture: () => void;
}

const GROWTH_STEPS = [
  'Keep your business information updated',
  'Turn Google visitors into leads',
  'Let customers request appointments',
  'Manage leads and jobs from Fieseros',
  'Respond to customers from one place',
];

export function GoogleConnectedCelebration({
  open,
  onClose,
  onSetUpLeadCapture,
}: GoogleConnectedCelebrationProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Rocket className="size-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-center text-xl">
            Your Google Business Profile is connected
          </DialogTitle>
          <DialogDescription className="text-center">
            Your customers can now discover your business on Google.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm font-medium text-foreground">Take the next step:</p>
          <ul className="space-y-2">
            {GROWTH_STEPS.map((step) => (
              <li key={step} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            onClick={onSetUpLeadCapture}
            className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            Set up Google lead capture
            <ArrowRight className="size-4" />
          </Button>
          <Button onClick={onClose} variant="ghost" className="w-full">
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── localStorage helpers ────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'fieseros:gbp-celebration-seen:';

/**
 * Has the tenant already seen the celebration dialog?
 * Per-tenant so multi-tenant users see it once per tenant.
 */
export function hasSeenCelebration(tenantId: string): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_PREFIX + tenantId) === '1';
  } catch {
    return false;
  }
}

/**
 * Mark the celebration as seen for this tenant (so it doesn't auto-show again).
 */
export function markCelebrationSeen(tenantId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + tenantId, '1');
  } catch {
    // localStorage may be unavailable (private mode, etc.) — non-critical.
  }
}

/**
 * Reset the seen flag so the celebration shows again (used by the "Show me
 * again" link in the settings panel).
 */
export function resetCelebrationSeen(tenantId: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + tenantId);
  } catch {
    // non-critical
  }
}
