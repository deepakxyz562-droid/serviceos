'use client';

/**
 * HealthScoreGauge — circular SVG gauge that renders a 0–100 health score.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 * Used in the Customer 360° left profile panel.
 *
 * Color (text + stroke) is derived from the score via `healthScoreColor` /
 * `healthScoreStroke` in `@/features/customers/utils/customer-helpers`.
 */

import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  healthScoreColor,
  healthScoreStroke,
} from '../utils/customer-helpers';

interface HealthScoreGaugeProps {
  score: number;
}

export function HealthScoreGauge({ score }: HealthScoreGaugeProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-16">
        <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" className="stroke-muted" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={radius} fill="none"
            className={healthScoreStroke(score)}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-sm font-extrabold', healthScoreColor(score))}>{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Heart className={cn('size-3', healthScoreColor(score))} />
        <span className="text-[10px] font-medium text-muted-foreground">Health</span>
      </div>
    </div>
  );
}
