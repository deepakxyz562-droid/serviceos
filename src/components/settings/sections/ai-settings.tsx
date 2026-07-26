'use client';

/**
 * AI section.
 *
 * Thin wrapper around the existing `AiVoiceSettingsTab` (Vapi.ai BYOK).
 * The full AI Assistant / Dispatcher / Pricing / Quote Generator /
 * Knowledge Base UI is tracked separately; for now the BYOK voice
 * configuration remains the live surface here.
 */

import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiVoiceSettingsTab } from '@/components/settings/ai-voice-settings-tab';

export function AiSettings() {
  return (
    <div className="space-y-6">
      <Card className="border-violet-200 dark:border-violet-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                AI Configuration
                <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                  Bring Your Own Key
                </Badge>
              </CardTitle>
              <CardDescription>
                Connect your AI Voice provider (Vapi.ai). More AI features — Assistant, Dispatcher,
                Pricing, Quote Generator, Email Writer, Knowledge Base — will land here soon.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AiVoiceSettingsTab />
        </CardContent>
      </Card>
    </div>
  );
}
