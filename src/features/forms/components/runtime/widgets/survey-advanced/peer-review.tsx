'use client';

import React, { useState } from 'react';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Star } from 'lucide-react';

interface PeerReviewValue {
  reviewer?: string;
  rating?: number;
  comment?: string;
}

export function PeerReview({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Peer review');
  const reviewerLabel = str(config.reviewerLabel, 'Reviewer name');
  const commentPlaceholder = str(config.commentPlaceholder, 'Share specific, actionable feedback…');
  const showCharCount = bool(config.showCharCount, false);
  const maxChars = Math.max(0, num(config.maxChars, 500));

  const v: PeerReviewValue = value && typeof value === 'object' ? (value as PeerReviewValue) : {};
  const reviewer = str(v.reviewer, '');
  const rating = typeof v.rating === 'number' ? v.rating : 0;
  const comment = str(v.comment, '');

  const setReviewer = (r: string) => onChange({ reviewer: r, rating, comment });
  const setRating = (n: number) => onChange({ reviewer, rating: rating === n ? 0 : n, comment });
  const setComment = (c: string) => onChange({ reviewer, rating, comment: c });

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <UserCheck className="size-3" /> {reviewerLabel}
        </label>
        <Input
          value={reviewer}
          disabled={disabled}
          onChange={(e) => setReviewer(e.target.value)}
          placeholder="e.g. Jordan Lee"
          className="text-xs h-8"
          aria-label={reviewerLabel}
        />
      </div>

      <div className="space-y-1">
        <div className="text-[11px] text-muted-foreground">Overall rating</div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => setRating(s)}
              aria-label={`Rating ${s}`}
              className="p-0.5"
            >
              <Star
                className={cn(
                  'size-5 transition-colors',
                  s <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30 hover:text-amber-300',
                )}
              />
            </button>
          ))}
          {rating > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{rating}/5</Badge>}
        </div>
      </div>

      <div className="space-y-1">
        <Textarea
          value={comment}
          disabled={disabled}
          onChange={(e) => {
            const next = maxChars > 0 ? e.target.value.slice(0, maxChars) : e.target.value;
            setComment(next);
          }}
          placeholder={commentPlaceholder}
          className="text-xs min-h-[80px]"
          aria-label={`${ariaLabel} comment`}
        />
        {showCharCount && (
          <div className="flex justify-end text-[10px] text-muted-foreground">
            {comment.length}{maxChars > 0 ? ` / ${maxChars}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default PeerReview;
