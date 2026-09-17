'use client';

import React, { useState } from 'react';
import { Facebook, Twitter, Linkedin, MessageCircle, Share2, Link2, Check, Send, Copy, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

type Platform = 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'email' | 'copy';

interface ShareEvent {
  platform: Platform;
  sharedUrl: string;
  title: string;
  timestamp: string;
}

interface ShareValue {
  url: string;
  title: string;
  events: ShareEvent[];
  totalShares: number;
}

const PLATFORM_META: Record<Platform, { label: string; color: string; icon: React.ReactNode; build: (url: string, title: string) => string }> = {
  facebook: { label: 'Facebook', color: 'bg-[#1877F2] hover:bg-[#166FE5]', icon: <Facebook className="size-4" />, build: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  twitter: { label: 'Twitter / X', color: 'bg-black hover:bg-neutral-800', icon: <Twitter className="size-4" />, build: (url, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(url)}` },
  linkedin: { label: 'LinkedIn', color: 'bg-[#0A66C2] hover:bg-[#0958A8]', icon: <Linkedin className="size-4" />, build: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  whatsapp: { label: 'WhatsApp', color: 'bg-[#25D366] hover:bg-[#20BD5A]', icon: <MessageCircle className="size-4" />, build: (url, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${url}`)}` },
  email: { label: 'Email', color: 'bg-slate-600 hover:bg-slate-700', icon: <Send className="size-4" />, build: (url, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(url)}` },
  copy: { label: 'Copy', color: 'bg-muted hover:bg-muted/70 text-foreground', icon: <Link2 className="size-4" />, build: (url) => url },
};

export function SocialShareButtonsV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Social share');
  const initialUrl = str(config.url, typeof window !== 'undefined' ? window.location.href : '');
  const initialTitle = str(config.title, str(field?.label, 'Check this out'));
  const showLabels = bool(config.showLabels, false);
  const allowEdit = bool(config.allowEdit, false);
  const enabledPlatforms = Array.isArray(config.platforms) && config.platforms.length
    ? (config.platforms as Platform[]) : ['facebook', 'twitter', 'linkedin', 'whatsapp', 'email', 'copy'];

  const existing: ShareValue | undefined = value && typeof value === 'object' ? (value as ShareValue) : undefined;
  const [url, setUrl] = useState(existing?.url ?? initialUrl);
  const [title, setTitle] = useState(existing?.title ?? initialTitle);
  const [copied, setCopied] = useState(false);
  const [history] = useState<ShareEvent[]>(existing?.events ?? []);

  const handleShare = (platform: Platform) => {
    if (disabled) return;
    const sharedUrl = PLATFORM_META[platform].build(url, title);
    const evt: ShareEvent = { platform, sharedUrl: url, title, timestamp: new Date().toISOString() };
    const next: ShareValue = { url, title, events: [...history, evt], totalShares: history.length + 1 };
    onChange(next);

    if (platform === 'copy') {
      if (navigator?.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }
    } else if (platform === 'email') {
      if (typeof window !== 'undefined') window.location.assign(sharedUrl);
    } else if (typeof window !== 'undefined') {
      window.open(sharedUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    }
  };

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Share2 className="size-4 text-purple-600" />
        <span className="text-xs font-bold">Share</span>
        {history.length > 0 && <Badge variant="outline" className="ml-auto text-[9px]">{history.length} share(s)</Badge>}
      </div>

      {allowEdit && (
        <div className="space-y-1.5">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} disabled={disabled} placeholder="https://…" className="h-8 text-[11px]" aria-label="Share URL" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={disabled} placeholder="Share title" className="h-8 text-[11px]" aria-label="Share title" />
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {enabledPlatforms.map((p) => {
          const meta = PLATFORM_META[p];
          if (!meta) return null;
          const isCopy = p === 'copy';
          return (
            <Button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => handleShare(p)}
              size="sm"
              aria-label={`Share on ${meta.label}`}
              className={cn(meta.color, 'text-white text-xs gap-1.5 h-9')}
            >
              {isCopy && copied ? <Check className="size-4 text-emerald-300" /> : meta.icon}
              {showLabels && <span>{isCopy && copied ? 'Copied!' : meta.label}</span>}
            </Button>
          );
        })}
        {!showLabels && <Copy className="size-3 text-muted-foreground ml-1" />}
      </div>

      {!allowEdit && (
        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
          <ExternalLink className="size-3" />
          {url}
        </p>
      )}

      {history.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Last shared: {history[history.length - 1].platform} · {new Date(history[history.length - 1].timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export default SocialShareButtonsV2;
