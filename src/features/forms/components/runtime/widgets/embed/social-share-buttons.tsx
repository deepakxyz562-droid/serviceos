'use client';

import React, { useState } from 'react';
import { Facebook, Twitter, Linkedin, MessageCircle, Share2, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

type Platform = 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'copy';

interface ShareEvent {
  platform: Platform;
  sharedUrl: string;
  timestamp: string;
}

const PLATFORM_META: Record<Platform, { label: string; color: string; icon: React.ReactNode; share: (url: string, text: string) => string }> = {
  facebook: {
    label: 'Facebook', color: 'bg-[#1877F2] hover:bg-[#166FE5]',
    icon: <Facebook className="size-4" />,
    share: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  twitter: {
    label: 'Twitter / X', color: 'bg-black hover:bg-neutral-800',
    icon: <Twitter className="size-4" />,
    share: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  linkedin: {
    label: 'LinkedIn', color: 'bg-[#0A66C2] hover:bg-[#0958A8]',
    icon: <Linkedin className="size-4" />,
    share: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  whatsapp: {
    label: 'WhatsApp', color: 'bg-[#25D366] hover:bg-[#20BD5A]',
    icon: <MessageCircle className="size-4" />,
    share: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  copy: {
    label: 'Copy link', color: 'bg-muted hover:bg-muted/70 text-foreground',
    icon: <Link2 className="size-4" />,
    share: (url) => url,
  },
};

export function SocialShareButtons({ value, onChange, config, disabled, field }: WidgetProps) {
  const url = String(config?.url ?? typeof window !== 'undefined' ? window.location.href : '');
  const text = String(config?.text ?? field?.label ?? 'Check this out');
  const enabledPlatforms = Array.isArray(config?.platforms) && config.platforms.length
    ? (config.platforms as Platform[])
    : ['facebook', 'twitter', 'linkedin', 'whatsapp', 'copy'];
  const showLabels = Boolean(config?.showLabels ?? false);
  const ariaLabel = String(field?.label ?? 'Social share');

  const [copied, setCopied] = useState(false);

  const handleShare = (platform: Platform) => {
    if (disabled) return;
    const sharedUrl = PLATFORM_META[platform].share(url, text);
    const event: ShareEvent = { platform, sharedUrl: url, timestamp: new Date().toISOString() };
    onChange(event);

    if (platform === 'copy') {
      if (navigator?.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }
    } else if (typeof window !== 'undefined') {
      window.open(sharedUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
    }
  };

  const history = Array.isArray(value) ? (value as ShareEvent[]) : value ? [value as ShareEvent] : [];

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {enabledPlatforms.map((p) => {
          const meta = PLATFORM_META[p];
          if (!meta) return null;
          return (
            <Button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => handleShare(p)}
              variant="default"
              size="sm"
              aria-label={`Share on ${meta.label}`}
              className={`${meta.color} text-white text-xs gap-1.5 h-9`}
            >
              {p === 'copy' && copied ? <Check className="size-4" /> : meta.icon}
              {showLabels && <span>{copied && p === 'copy' ? 'Copied!' : meta.label}</span>}
            </Button>
          );
        })}
        {!showLabels && (
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 ml-1">
            <Share2 className="size-3" /> Share
          </span>
        )}
      </div>
      {history.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Last shared: {history[history.length - 1].platform} ·{' '}
          {new Date(history[history.length - 1].timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export default SocialShareButtons;
