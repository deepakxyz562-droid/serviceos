'use client';

import React, { useState } from 'react';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare } from 'lucide-react';

interface RatingValue {
  rating?: number;
  comment?: string;
}

export function StarRatingCommentsV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Star rating with comments');
  const maxStars = Math.max(1, num(config.maxStars, 5));
  const allowHalf = bool(config.allowHalf, false);
  const requireCommentBelow = num(config.requireCommentBelow, 3); // require comment if rating <= threshold
  const placeholder = str(config.placeholder, 'Tell us more about your experience…');
  const maxChars = Math.max(0, num(config.maxChars, 600));

  const v: RatingValue = value && typeof value === 'object' ? (value as RatingValue) : {};
  const rating = typeof v.rating === 'number' ? v.rating : 0;
  const comment = str(v.comment, '');
  const [hover, setHover] = useState(0);
  const [touched, setTouched] = useState(false);

  const setRating = (n: number) => {
    onChange({ rating: rating === n ? 0 : n, comment });
  };

  const setComment = (c: string) => {
    const next = maxChars > 0 ? c.slice(0, maxChars) : c;
    onChange({ rating, comment: next });
  };

  const requiresComment = rating > 0 && rating <= requireCommentBelow;
  const showValidationError = touched && requiresComment && comment.trim().length < 3;

  const labelFor = (n: number) => {
    if (n === 0) return '';
    const ratio = n / maxStars;
    if (ratio < 0.34) return 'Poor';
    if (ratio < 0.67) return 'Okay';
    if (ratio < 0.9) return 'Good';
    return 'Excellent';
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: maxStars }).map((_, i) => {
            const full = i + 1;
            const half = allowHalf ? i + 0.5 : null;
            const isFullActive = (hover || rating) >= full;
            const isHalfActive = half !== null && (hover || rating) >= half && (hover || rating) < full;
            return (
              <span key={i} className="relative inline-flex">
                {allowHalf && half !== null && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setRating(half)}
                    onMouseEnter={() => setHover(half)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`${half} of ${maxStars} stars`}
                    className="absolute inset-y-0 left-0 w-1/2 z-10"
                  />
                )}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setRating(full)}
                  onMouseEnter={() => setHover(full)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${full} of ${maxStars} stars`}
                  className="p-0.5"
                >
                  <Star
                    className={cn(
                      'size-6 transition-all',
                      isFullActive ? 'text-amber-400 fill-amber-400' : isHalfActive ? 'text-amber-400 fill-amber-200' : 'text-muted-foreground/30 hover:text-amber-300',
                    )}
                  />
                </button>
              </span>
            );
          })}
        </div>
        {rating > 0 && (
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">{rating.toFixed(allowHalf ? 1 : 0)}/{maxStars}</Badge>
            <span className="text-xs font-bold text-foreground">{labelFor(rating)}</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MessageSquare className="size-3" />
          {requiresComment ? 'Comment (required — tell us more)' : 'Comment (optional)'}
        </label>
        <Textarea
          value={comment}
          disabled={disabled}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          className="text-xs min-h-[70px]"
          aria-label={`${ariaLabel} comment`}
        />
        {maxChars > 0 && (
          <div className="flex justify-end text-[10px] text-muted-foreground">
            {comment.length} / {maxChars}
          </div>
        )}
      </div>

      {showValidationError && (
        <p className="text-[11px] text-red-600 font-semibold">Please add a comment explaining your rating.</p>
      )}
    </div>
  );
}

export default StarRatingCommentsV2;
