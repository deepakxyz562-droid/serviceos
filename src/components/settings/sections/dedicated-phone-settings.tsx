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
 */

import { Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmsNumbersView } from '@/components/views/sms-numbers-view';

export function DedicatedPhoneSettings() {
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

      {/* The actual phone number management UI (embedded verbatim) */}
      <SmsNumbersView />
    </div>
  );
}
