'use client';

import React, { useState } from 'react';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

type Vote = 'up' | 'down' | '';

interface VoteValue {
  vote?: Vote;
  comment?: string;
}

export function ThumbsUpDownV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Thumb rating');
  const upLabel = str(config.upLabel, 'Helpful');
  const downLabel = str(config.downLabel, 'Not helpful');
  const showLabels = bool(config.showLabels, true);
  const requireCommentOnDown = bool(config.requireCommentOnDown, true);
  const placeholder = str(config.placeholder, 'How could we improve?');

  const v: VoteValue = value && typeof value === 'object' ? (value as VoteValue) : {};
  const vote = (v.vote as Vote) || '';
  const comment = str(v.comment, '');
  const [touched, setTouched] = useState(false);

  const setVote = (next: Vote) => {
    onChange({ vote: vote === next ? '' : next, comment });
  };

  const setComment = (c: string) => onChange({ vote, comment: c });

  const needsComment = vote === 'down' && requireCommentOnDown;
  const showError = touched && needsComment && comment.trim().length < 3;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setVote('up')}
          aria-pressed={vote === 'up'}
          aria-label={upLabel}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3 py-2 transition-all active:scale-95',
            vote === 'up'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              : 'bg-card border-border hover:border-emerald-300',
          )}
        >
          <ThumbsUp className={cn('size-5 transition-colors', vote === 'up' ? 'text-emerald-500 fill-emerald-500' : 'text-muted-foreground hover:text-emerald-500')} />
          {showLabels && <span className="text-xs font-semibold">{upLabel}</span>}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setVote('down')}
          aria-pressed={vote === 'down'}
          aria-label={downLabel}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3 py-2 transition-all active:scale-95',
            vote === 'down'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800'
              : 'bg-card border-border hover:border-red-300',
          )}
        >
          <ThumbsDown className={cn('size-5 transition-colors', vote === 'down' ? 'text-red-500 fill-red-500' : 'text-muted-foreground hover:text-red-500')} />
          {showLabels && <span className="text-xs font-semibold">{downLabel}</span>}
        </button>
      </div>

      {(vote === 'down' || (vote === 'up' && comment)) && (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MessageSquare className="size-3" />
            {needsComment ? 'Comment (required)' : 'Comment (optional)'}
          </label>
          <Textarea
            value={comment}
            disabled={disabled}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            className="text-xs min-h-[60px]"
            aria-label={`${ariaLabel} comment`}
          />
          {showError && (
            <p className="text-[11px] text-red-600 font-semibold">Please explain how we could improve.</p>
          )}
        </div>
      )}

      {vote && (
        <Badge variant={vote === 'up' ? 'secondary' : 'destructive'} className="text-[10px] capitalize">
          {vote === 'up' ? upLabel : downLabel}
        </Badge>
      )}
    </div>
  );
}

export default ThumbsUpDownV2;
