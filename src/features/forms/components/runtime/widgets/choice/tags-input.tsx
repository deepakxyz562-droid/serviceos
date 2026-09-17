'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { WidgetProps, str, num } from '../widget-props';

export function TagsInput({ value, onChange, config, disabled, field }: WidgetProps) {
  const tags: string[] = Array.isArray(value) ? value.filter((t): t is string => typeof t === 'string') : [];
  const placeholder = str(config.placeholder, 'Type and press Enter');
  const maxTags = num(config.maxTags, 0);
  const ariaLabel = str(field?.label, 'Tags');
  const [draft, setDraft] = React.useState('');

  const addTag = (t: string) => {
    const cleaned = t.trim();
    if (!cleaned || tags.includes(cleaned)) return;
    if (maxTags > 0 && tags.length >= maxTags) return;
    onChange([...tags, cleaned]);
    setDraft('');
  };

  const removeTag = (t: string) => onChange(tags.filter((x) => x !== t));

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-xs focus-within:ring-2 focus-within:ring-ring/50">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 py-0.5">
          {tag}
          {!disabled && (
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
              <X className="size-3" />
            </button>
          )}
        </Badge>
      ))}
      <Input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => draft && addTag(draft)}
        disabled={disabled || (maxTags > 0 && tags.length >= maxTags)}
        placeholder={tags.length === 0 ? placeholder : ''}
        aria-label={ariaLabel}
        className="flex-1 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-7 min-w-[80px]"
      />
    </div>
  );
}

export default TagsInput;
