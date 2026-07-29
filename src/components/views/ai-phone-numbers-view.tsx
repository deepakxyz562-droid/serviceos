'use client';

// Phase 2.4.5 — Unified Phone UI. Phone numbers are now managed in ONE place
// (`smsNumbers` view under Inbox & Automation). This file is kept only as a
// backward-compat shim so existing bookmarks / deep links don't 404.

import { Phone, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';

export function AiPhoneNumbersView() {
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full text-center border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-10 pb-10 px-6 space-y-4">
          <div className="mx-auto flex items-center justify-center size-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40">
            <Phone className="size-7 text-emerald-600" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Phone numbers have moved</h2>
            <p className="text-sm text-muted-foreground">
              Phone numbers are now managed in one place — buy, release, and
              switch between SMS, call forwarding, voicemail, and AI-answered
              voice from a single view.
            </p>
          </div>
          <Button
            onClick={() => setActiveView('smsNumbers')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            Go to Phone Numbers
            <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
