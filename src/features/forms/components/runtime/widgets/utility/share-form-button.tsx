'use client';

import React, { useState } from 'react';
import { Share2, Loader2, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';
import { str } from '../widget-props';

interface ShareFormValue {
  action: 'share';
  timestamp: string;
  method?: 'native' | 'clipboard';
  url?: string;
}

export function ShareFormButton({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Share form');
  const shareUrl = str(config.shareUrl, typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = str(config.shareTitle, 'Check out this form');
  const shareText = str(config.shareText, '');
  const existing = (value as Partial<ShareFormValue> | undefined) ?? {};
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    if (disabled) return;
    setPending(true); setError(null);
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      if (nav && typeof nav.share === 'function') {
        await nav.share({ title: shareTitle, text: shareText, url: shareUrl });
        onChange({ action: 'share', timestamp: new Date().toISOString(), method: 'native', url: shareUrl } as ShareFormValue);
      } else if (nav?.clipboard) {
        await nav.clipboard.writeText(shareUrl);
        onChange({ action: 'share', timestamp: new Date().toISOString(), method: 'clipboard', url: shareUrl } as ShareFormValue);
      } else {
        setError('Share API not available in this browser.');
      }
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setError('Share was cancelled.');
    } finally {
      setPending(false);
    }
  };

  const copyUrl = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      onChange({ action: 'share', timestamp: new Date().toISOString(), method: 'clipboard', url: shareUrl } as ShareFormValue);
    }
  };

  return (
    <div className="space-y-1" aria-label={ariaLabel}>
      <Button type="button" disabled={disabled || pending} onClick={handleShare}
        variant={done ? 'outline' : 'default'}
        className="w-full h-9 text-xs gap-1.5">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : done ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Share2 className="size-3.5" />}
        {done ? 'Shared' : 'Share form'}
      </Button>
      <Button type="button" variant="ghost" disabled={disabled} onClick={copyUrl}
        className="w-full h-7 text-[10px] gap-1 text-muted-foreground">
        <Copy className="size-3" /> Copy link instead
      </Button>
      {error && <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}
      {existing.timestamp && existing.method === 'native' && (
        <p className="text-[10px] text-muted-foreground text-center">Shared via native dialog</p>
      )}
      {existing.timestamp && existing.method === 'clipboard' && (
        <p className="text-[10px] text-muted-foreground text-center">Link copied to clipboard</p>
      )}
    </div>
  );
}

export default ShareFormButton;
