'use client';

/**
 * AI Receptionist Settings Wrapper
 * ================================
 *
 * The single entry point for Settings → AI Receptionist.
 *
 * Conditionally renders:
 *   - The onboarding wizard (if subscription, receptionist, or phone is missing)
 *   - The permanent AI Receptionist workspace (if all 3 are configured)
 *   - An error state with retry (if the API checks fail)
 *
 * Phase A: Migrated from raw fetch() to shared React Query hooks.
 * The 3 API checks (subscription, receptionist, phones) now use the SAME
 * query keys as the Workspace's data hook, so React Query deduplicates
 * them — no more 3+4 double-fetch pattern.
 *
 * The workspace is the PERMANENT home for the AI Receptionist — the wizard
 * is only for initial setup. After activation, the tenant always lands here.
 */

import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AiReceptionistWorkspace } from './workspace/ai-receptionist-workspace';
import { AiReceptionistOnboarding } from './ai-receptionist-onboarding';
import {
  useAddonSubscription,
  useReceptionistSettings,
  usePhoneConnections,
} from './workspace/use-receptionist-queries';

export function AiReceptionistSettings() {
  // Phase A: React Query deduplicates these with the Workspace's queries.
  // Both components use the SAME qk.* keys → only ONE network request per resource.
  const subQuery = useAddonSubscription();
  const recvQuery = useReceptionistSettings();
  const phoneQuery = usePhoneConnections();

  const loading = subQuery.isLoading || recvQuery.isLoading || phoneQuery.isLoading;
  const hasNetworkError =
    subQuery.isError && recvQuery.isError && phoneQuery.isError; // all 3 failed

  // Retry handler — refetch all 3 queries
  const handleRetry = () => {
    subQuery.refetch();
    recvQuery.refetch();
    phoneQuery.refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error state: only if ALL 3 APIs failed entirely ──
  if (hasNetworkError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center max-w-md mx-auto">
        <AlertCircle className="size-10 text-amber-500" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Failed to load AI Receptionist data</p>
          <p className="text-xs text-muted-foreground">
            A network error occurred while checking your subscription, receptionist, and phone number.
            Please try again.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2">
          <Loader2 className="size-3.5" />
          Try Again
        </Button>
      </div>
    );
  }

  const hasSubscription = !!subQuery.data;
  const hasReceptionist = !!recvQuery.data;
  const hasPhone = (phoneQuery.data?.length ?? 0) > 0;

  // ── All 3 configured → permanent workspace ──
  if (hasSubscription && hasReceptionist && hasPhone) {
    return <AiReceptionistWorkspace />;
  }

  // ── Otherwise → onboarding wizard ──
  return <AiReceptionistOnboarding />;
}
