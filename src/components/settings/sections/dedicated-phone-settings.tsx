'use client';

/**
 * Dedicated Phone Number Settings section.
 *
 * Replaces the old `ai-phone-numbers-view.tsx` shim that showed a
 * "Phone numbers have moved" redirect card. The phone number management
 * UI now lives directly inside Settings → Communication → Dedicated Phone
 * Number, so tenants can buy/release/switch numbers without a confusing
 * redirect.
 *
 * Embeds the existing `SmsNumbersView` component verbatim — no rewrite
 * of the phone number CRUD logic.
 *
 * If no SMS provider (Twilio) is configured — neither at the platform
 * level (superadmin) nor at the tenant level (Channels & Credentials) —
 * we show a friendly guidance card ABOVE the number management UI so the
 * user understands what they need to do before clicking "Buy Number".
 * This prevents the raw "Twilio is not configured" error from surfacing
 * as a confusing toast during the buy flow.
 */

import { useState, useEffect } from 'react';
import { Phone, AlertCircle, ArrowRight, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SmsNumbersView } from '@/components/views/sms-numbers-view';

export function DedicatedPhoneSettings({ onNavigateSection }: { onNavigateSection?: (id: string) => void }) {
  const [smsConfigured, setSmsConfigured] = useState<boolean | null>(null);

  // Lightweight check: hit the campaigns provider-status endpoint (already
  // used elsewhere) to see if SMS is configured at the tenant or platform
  // level. This avoids the user discovering the "not configured" error
  // only after clicking "Buy Number".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/campaigns/provider-status');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSmsConfigured(!!data?.sms?.configured);
        }
      } catch {
        // If the check fails, assume configured (don't block the UI)
        if (!cancelled) setSmsConfigured(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header card explaining the unified phone management */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg shrink-0 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Phone className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                Dedicated Phone Numbers
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                  Live
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Buy, release, and switch between SMS, call forwarding, voicemail, and
                AI-answered voice from a single view. Numbers are provisioned through your
                connected communication provider.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Need a new number? Click &quot;Buy Number&quot; below. Already have one? Forward
            it to SMS, voice, or AI receptionist.
          </p>
        </CardContent>
      </Card>

      {/* SMS provider not-configured guidance card.
          Shows only when the provider-status check confirms SMS is NOT
          configured. Explains the two paths (tenant-owned or platform-level)
          and links to Channels & Credentials. */}
      {smsConfigured === false && (
        <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg shrink-0 bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                <AlertCircle className="size-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  SMS provider required to buy phone numbers
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-300/90">
                  Dedicated phone numbers are provisioned through Twilio. You have two options:
                </p>
                <ul className="text-xs text-amber-800 dark:text-amber-300/90 space-y-1 ml-4 list-disc">
                  <li>
                    <strong>Add your own Twilio credentials</strong> in{' '}
                    <button
                      type="button"
                      onClick={() => onNavigateSection?.('channels-credentials')}
                      className="inline-flex items-center gap-0.5 font-semibold underline hover:text-amber-900 dark:hover:text-amber-200"
                    >
                      Settings → Channels &amp; Credentials → SMS
                      <ArrowRight className="size-3" />
                    </button>{' '}
                    (recommended for campaigns)
                  </li>
                  <li>
                    <strong>Contact your platform admin</strong> to enable platform-level SMS
                    (superadmin configures Twilio in the Admin Panel)
                  </li>
                </ul>
                {onNavigateSection && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30"
                    onClick={() => onNavigateSection('channels-credentials')}
                  >
                    <SettingsIcon className="size-3.5 mr-1" />
                    Go to Channels &amp; Credentials
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* The actual phone number management UI (embedded verbatim) */}
      <SmsNumbersView />
    </div>
  );
}
