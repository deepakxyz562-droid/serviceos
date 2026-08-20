'use client';

/**
 * AI Receptionist Settings Wrapper
 * ================================
 *
 * The single entry point for Settings → AI Configuration.
 *
 * Conditionally renders:
 *   - Onboarding wizard (if no subscription, no receptionist, or no phone)
 *   - AI Receptionist Workspace (if subscription + receptionist + phone configured)
 *
 * The workspace is the PERMANENT home for the AI Receptionist — the wizard
 * is only for initial setup. After activation, the tenant always lands in
 * the workspace.
 */

import { useState, useEffect } from 'react';
import { AiReceptionistWorkspace } from './workspace/ai-receptionist-workspace';
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

  // If everything is set up → show the permanent workspace
  if (hasSubscription && hasReceptionist && hasPhone) {
    return <AiReceptionistWorkspace />;
  }

  // Otherwise → show the onboarding wizard
  return <AiReceptionistOnboarding />;
}
