'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface RedditEmbedValue {
  postUrl: string;
  postId: string;
  embedUrl: string;
  provider: 'reddit';
}

export function RedditEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const initialUrl = String(config?.postUrl ?? (value as RedditEmbedValue | undefined)?.postUrl ?? '');
  const [postUrl, setPostUrl] = useState(initialUrl);
  const height = Number(config?.height ?? 480);
  const ariaLabel = String(field?.label ?? 'Reddit embed');

  useEffect(() => {
    if (initialUrl && !disabled) {
      const m = initialUrl.match(/reddit\.com\/r\/[\w-]+\/comments\/([\w]+)/);
      const id = m ? m[1] : '';
      const embedUrl = id ? `https://www.redditmedia.com/mediaembed/comments/${id}` : '';
      onChange({ postUrl: initialUrl, postId: id, embedUrl, provider: 'reddit' } as RedditEmbedValue);
    }
     
  }, [initialUrl]);

  const commit = (url: string) => {
    setPostUrl(url);
    if (!disabled) {
      const m = url.match(/reddit\.com\/r\/[\w-]+\/comments\/([\w]+)/);
      const id = m ? m[1] : '';
      const embedUrl = id ? `https://www.redditmedia.com/mediaembed/comments/${id}` : '';
      onChange({ postUrl: url, postId: id, embedUrl, provider: 'reddit' } as RedditEmbedValue);
    }
  };

  const parsed = postUrl.match(/reddit\.com\/r\/([\w-]+)\/comments\/([\w]+)/);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Input
        type="url"
        value={postUrl}
        disabled={disabled}
        placeholder="https://www.reddit.com/r/sub/comments/xxxxxx/title"
        onChange={(e) => setPostUrl(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className="text-xs"
        aria-label="Reddit post URL"
      />
      {!parsed ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <span>Enter a valid Reddit post URL (e.g. reddit.com/r/sub/comments/...).</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl overflow-hidden border border-border bg-muted/20" style={{ height }}>
            <iframe
              src={`https://www.redditmedia.com/mediaembed/comments/${parsed[2]}`}
              title={`Reddit post — r/${parsed[1]}`}
              className="w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <MessageCircle className="size-3" /> r/{parsed[1]} · ID {parsed[2]}
            </p>
            <Button asChild variant="ghost" size="sm" className="text-[10px] gap-1">
              <a href={postUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3" /> Open
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RedditEmbed;
