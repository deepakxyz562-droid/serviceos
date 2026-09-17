'use client';

import React, { useEffect, useState } from 'react';
import { Twitter, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface TwitterEmbedValue {
  tweetUrl: string;
  embedHtml: string;
  provider: 'twitter_placeholder';
}

export function TwitterEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const initialUrl = String(config?.tweetUrl ?? (value as TwitterEmbedValue | undefined)?.tweetUrl ?? '');
  const [tweetUrl, setTweetUrl] = useState(initialUrl);
  const ariaLabel = String(field?.label ?? 'Twitter embed');

  useEffect(() => {
    if (initialUrl && !disabled) {
      const next: TwitterEmbedValue = {
        tweetUrl: initialUrl,
        embedHtml: `<blockquote class="twitter-tweet"><a href="${initialUrl}">Tweet</a></blockquote>`,
        provider: 'twitter_placeholder',
      };
      onChange(next);
    }
     
  }, [initialUrl, disabled]);

  const commit = (url: string) => {
    setTweetUrl(url);
    if (!disabled) {
      onChange({
        tweetUrl: url,
        embedHtml: `<blockquote class="twitter-tweet"><a href="${url}">Tweet</a></blockquote>`,
        provider: 'twitter_placeholder',
      } as TwitterEmbedValue);
    }
  };

  const parsed = tweetUrl.match(/twitter\.com\/\w+\/status\/(\d+)/) || tweetUrl.match(/x\.com\/\w+\/status\/(\d+)/);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Input
        type="url"
        value={tweetUrl}
        disabled={disabled}
        placeholder="https://twitter.com/user/status/123456"
        onChange={(e) => setTweetUrl(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className="text-xs"
        aria-label="Tweet URL"
      />
      {!parsed ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <span>Enter a valid tweet URL (twitter.com or x.com). The official embed widget will render here.</span>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-2">
          <Twitter className="size-6 mx-auto text-black dark:text-white" />
          <p className="text-xs font-semibold">Tweet preview</p>
          <p className="text-[10px] text-muted-foreground break-all">Tweet ID: {parsed[1]}</p>
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
            <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" /> View on X
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

export default TwitterEmbed;
