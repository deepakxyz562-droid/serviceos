'use client';

import React, { useState } from 'react';
import { Star, MessageSquareWarning } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { WidgetProps } from '../widget-props';

export function StarRatingComments({ value, onChange, config, disabled, field }: WidgetProps) {
  const initial = (value as { rating?: number; comment?: string }) || {};
  const rating = Number(initial.rating) || 0;
  const comment = String(initial.comment || '');

  const maxStars = Number(config.maxStars) || 5;
  const commentThreshold = Number(config.commentThreshold) || 3; // require comment if rating ≤ threshold

  const requiresComment = rating > 0 && rating <= commentThreshold;
  const [touched, setTouched] = useState(false);

  function setRating(v: number) {
    onChange({ rating: v, comment });
  }

  function setComment(c: string) {
    onChange({ rating, comment: c });
  }

  return (
    <div className="space-y-3" aria-label={String(field?.['label'] ?? 'Star rating with comments')}>
      <div className="flex items-center gap-1.5 py-1">
        {Array.from({ length: maxStars }).map((_, i) => {
          const starVal = i + 1;
          const filled = starVal <= rating;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => setRating(starVal)}
              onBlur={() => setTouched(true)}
              className="p-1 text-muted-foreground hover:text-amber-400 focus:outline-none transition-colors"
              aria-label={`${starVal} of ${maxStars} stars`}
            >
              <Star
                className={`size-7 transition-transform active:scale-95 ${
                  filled ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'
                }`}
              />
            </button>
          );
        })}
        {rating > 0 && (
          <span className="text-xs font-bold text-foreground ml-2">
            {rating} / {maxStars}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">
          {requiresComment ? 'Comment (required — tell us more)' : 'Comment (optional)'}
        </Label>
        <Textarea
          value={comment}
          disabled={disabled}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Share your feedback..."
          className="text-xs min-h-[70px]"
        />
      </div>

      {touched && requiresComment && comment.trim().length < 3 && (
        <div className="flex items-center gap-1.5 text-[11px] text-red-600">
          <MessageSquareWarning className="size-3.5" /> Please add a comment explaining your low rating.
        </div>
      )}
    </div>
  );
}

export default StarRatingComments;
