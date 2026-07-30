'use client';

import { useEffect, useState } from 'react';

/**
 * useWhatsAppStatus
 *
 * Fetches the tenant's WhatsApp enablement status from /api/whatsapp/status.
 * Used by nav items, banners, and composers to decide whether to render
 * WhatsApp UI at all.
 *
 * Per Issue 5: WhatsApp is hidden unless the tenant is on a paid plan AND has
 * connected their own Meta Cloud API. The platform provides Email, SMS, and
 * Push only — WhatsApp is strictly BYO.
 *
 * Returns:
 *   - enabled: boolean  — true only when WhatsApp UI should be shown
 *   - reason: string    — 'enabled' | 'not_paid' | 'own_not_connected' | 'loading' | 'error'
 *   - loading: boolean
 *   - refresh(): void   — re-fetch (call after the user connects a provider)
 */
export interface WhatsAppStatus {
  enabled: boolean;
  reason: string;
  planStatus?: string;
  isPaid?: boolean;
  ownConnected?: boolean;
}

export function useWhatsAppStatus() {
  const [status, setStatus] = useState<WhatsAppStatus>({
    enabled: false,
    reason: 'loading',
  });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp/status?XTransformPort=3000', {
        cache: 'no-store',
      });
      if (!res.ok) {
        setStatus({ enabled: false, reason: 'error' });
        return;
      }
      const data = await res.json();
      setStatus({
        enabled: !!data.enabled,
        reason: data.reason || 'error',
        planStatus: data.planStatus,
        isPaid: data.isPaid,
        ownConnected: data.ownConnected,
      });
    } catch {
      setStatus({ enabled: false, reason: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { status, loading, refresh };
}
