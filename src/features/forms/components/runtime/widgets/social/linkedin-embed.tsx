'use client';

import React, { useEffect, useState } from 'react';
import { Linkedin, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WidgetProps } from '../widget-props';

interface LinkedinEmbedValue {
  postUrl: string;
  embedHtml: string;
  provider: 'linkedin_placeholder';
}

export function LinkedinEmbed({ value, onChange, config, disabled, field }: WidgetProps) {
  const initialUrl = String(config?.postUrl ?? (value as LinkedinEmbedValue | undefined)?.postUrl ?? '');
  const [postUrl, setPostUrl] = useState(initialUrl);
  const ariaLabel = String(field?.label ?? 'LinkedIn embed');

  useEffect(() => {
    if (initialUrl && !disabled) {
      const next: LinkedinEmbedValue = {
        postUrl: initialUrl,
        embedHtml: `<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:share:${initialUrl}" frameborder="0" allowfullscreen></iframe>`,
        provider: 'linkedin_placeholder',
      };
      onChange(next);
    }
     
  }, [initialUrl, disabled]);

  const commit = (url: string) => {
    setPostUrl(url);
    if (!disabled) {
      onChange({
        postUrl: url,
        embedHtml: `<iframe src="https://www.linkedin.com/embed/feed/update/urn:li:share:${url}" frameborder="0" allowfullscreen></iframe>`,
        provider: 'linkedin_placeholder',
      } as LinkedinEmbedValue);
    }
  };

  const parsed = postUrl.match(/linkedin\.com\/posts\/[\w-]+-([a-z0-9]{19})/i) ||
    postUrl.match(/linkedin\.com\/feed\/update\/urn:li:share:(\d+)/);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <Input
        type="url"
        value={postUrl}
        disabled={disabled}
        placeholder="https://www.linkedin.com/posts/username_title-..."
        onChange={(e) => setPostUrl(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className="text-xs"
        aria-label="LinkedIn post URL"
      />
      {!parsed ? (
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <span>Enter a valid LinkedIn post URL. The official embed widget will render here.</span>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-2">
          <Linkedin className="size-6 mx-auto text-[#0A66C2]" />
          <p className="text-xs font-semibold">LinkedIn post preview</p>
          <p className="text-[10px] text-muted-foreground break-all">Post ID: {parsed[1]}</p>
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
            <a href={postUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" /> View on LinkedIn
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

export default LinkedinEmbed;
