'use client';

import React, { useEffect, useState } from 'react';
import { Instagram, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface InstagramEmbedValue {
  postUrl: string;
  embedHtml: string;
  provider: 'instagram_placeholder';
}

export function InstagramEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const initialUrl = String(config?.postUrl ?? (value as InstagramEmbedValue | undefined)?.postUrl ?? '');
  const [postUrl, setPostUrl] = useState(initialUrl);
  const ariaLabel = String(field?.label ?? 'Instagram embed');

  useEffect(() => {
    if (initialUrl && !disabled) {
      const next: InstagramEmbedValue = {
        postUrl: initialUrl,
        embedHtml: `<blockquote class="instagram-media" data-instgrm-permalink="${initialUrl}"></blockquote>`,
        provider: 'instagram_placeholder',
      };
      onChange(next);
    }
     
  }, [initialUrl, disabled]);

  const commit = (url: string) => {
    setPostUrl(url);
    if (!disabled) {
      onChange({
        postUrl: url,
        embedHtml: `<blockquote class="instagram-media" data-instgrm-permalink="${url}"></blockquote>`,
        provider: 'instagram_placeholder',
      } as InstagramEmbedValue);
    }
  };

  const parsed = postUrl.match(/instagram\.com\/p\/([\w-]+)/) || postUrl.match(/instagram\.com\/reel\/([\w-]+)/);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Input
        type="url"
        value={postUrl}
        disabled={disabled}
        placeholder="https://www.instagram.com/p/Cxxxxxx/"
        onChange={(e) => setPostUrl(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className="text-xs"
        aria-label="Instagram post URL"
      />
      {!parsed ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <span>Enter a valid Instagram post or reel URL. The official embed widget will render here.</span>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-2">
          <div className="inline-flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
            <Instagram className="size-5 text-white" />
          </div>
          <p className="text-xs font-semibold">Instagram post preview</p>
          <p className="text-[10px] text-muted-foreground break-all">Post ID: {parsed[1]}</p>
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
            <a href={postUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" /> View on Instagram
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

export default InstagramEmbed;
