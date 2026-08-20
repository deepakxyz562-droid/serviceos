'use client';

/**
 * AI Receptionist Settings Wrapper
 * ================================
 *
 * Conditionally renders:
 *   - Onboarding wizard (if no subscription or incomplete setup)
 *   - Dashboard (if subscription + receptionist + phone all configured)
 *
 * This is the single entry point for Settings → AI.
 */

import { useState, useEffect } from 'react';
import { AiReceptionistDashboard } from './ai-receptionist-dashboard';
import { AiReceptionistOnboarding } from './ai-receptionist-onboarding';
import { Loader2 } from 'lucide-react';

export function AiReceptionistSettings() {
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [hasReceptionist, setHasReceptionist] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const [subRes, recvRes, phoneRes] = await Promise.all([
          fetch('/api/addons/subscriptions'),
          fetch('/api/addons/receptionist'),
          fetch('/api/addons/phones/connections'),
        ]);

        if (subRes.ok) {
          const subData = await subRes.json();
          const aiSub = subData.subscriptions?.find(
            (s: { addonProduct: { code: string }; status: string }) =>
              s.addonProduct?.code === 'AI_RECEPTIONIST' &&
              ['ACTIVE', 'PAST_DUE'].includes(s.status)
          );
          setHasSubscription(!!aiSub);
        }

        if (recvRes.ok) {
          const recvData = await recvRes.json();
          setHasReceptionist(!!recvData.receptionist);
        }

        if (phoneRes.ok) {
          const phoneData = await phoneRes.json();
          setHasPhone(phoneData.connections?.length > 0);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If everything is set up → show dashboard
  if (hasSubscription && hasReceptionist && hasPhone) {
    return <AiReceptionistDashboard />;
  }

  // Otherwise → show onboarding wizard
  return <AiReceptionistOnboarding />;
}
