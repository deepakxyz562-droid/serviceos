'use client';

import React, { useMemo } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { WidgetProps } from '../widget-props';

export function LikeDislike({ value, onChange, config, disabled, field }: WidgetProps) {
  type Vote = 'like' | 'dislike' | null;
  const current = (value as Vote) || null;
  const showCounts = config.showCounts !== false;

  const stats = useMemo(() => {
    const baseLikes = Number(config.baseLikes) || 0;
    const baseDislikes = Number(config.baseDislikes) || 0;
    let likes = baseLikes;
    let dislikes = baseDislikes;
    if (current === 'like') likes += 1;
    if (current === 'dislike') dislikes += 1;
    return { likes, dislikes };
  }, [current, config.baseLikes, config.baseDislikes]);

  function vote(v: Vote) {
    onChange(v === current ? null : v);
  }

  return (
    <div className="flex items-center gap-3" aria-label={String(field?.['label'] ?? 'Like / Dislike')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => vote('like')}
        aria-pressed={current === 'like'}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all active:scale-95 ${
          current === 'like'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            : 'bg-card border-border hover:border-emerald-300 text-muted-foreground hover:text-emerald-600'
        }`}
      >
        <ThumbsUp className={`size-5 ${current === 'like' ? 'fill-emerald-500 text-emerald-500' : ''}`} />
        {showCounts && <span className="text-xs font-bold">{stats.likes}</span>}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => vote('dislike')}
        aria-pressed={current === 'dislike'}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all active:scale-95 ${
          current === 'dislike'
            ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
            : 'bg-card border-border hover:border-red-300 text-muted-foreground hover:text-red-600'
        }`}
      >
        <ThumbsDown className={`size-5 ${current === 'dislike' ? 'fill-red-500 text-red-500' : ''}`} />
        {showCounts && <span className="text-xs font-bold">{stats.dislikes}</span>}
      </button>
    </div>
  );
}

export default LikeDislike;
