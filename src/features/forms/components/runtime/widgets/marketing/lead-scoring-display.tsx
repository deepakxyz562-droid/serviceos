'use client';

import React, { useMemo } from 'react';
import { Flame, TrendingUp, Award, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WidgetProps, str, num, bool } from '../widget-props';

interface LeadScoreValue {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  tier: 'hot' | 'warm' | 'cold';
  signals: Array<{ label: string; points: number }>;
  timestamp?: string;
}

interface Signal {
  label: string;
  points: number;
}

function computeGrade(score: number): { grade: LeadScoreValue['grade']; tier: LeadScoreValue['tier'] } {
  if (score >= 80) return { grade: 'A', tier: 'hot' };
  if (score >= 60) return { grade: 'B', tier: 'warm' };
  if (score >= 40) return { grade: 'C', tier: 'cold' };
  return { grade: 'D', tier: 'cold' };
}

export function LeadScoringDisplay({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Lead score');
  const configScore = num(config.score, 0);
  const maxScore = num(config.maxScore, 100);
  const showSignals = bool(config.showSignals, true);

  const signals: Signal[] = useMemo(() => {
    const raw = config.signals;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((s) => ({
        label: str((s as Record<string, unknown>).label, 'Signal'),
        points: num((s as Record<string, unknown>).points, 0),
      }));
    }
    // Derive mock signals from a base score for demo.
    return [
      { label: 'Visited pricing page', points: 25 },
      { label: 'Filled contact form', points: 20 },
      { label: 'Email verified', points: 15 },
      { label: 'Returning visitor', points: 10 },
      { label: 'Company size > 100', points: 10 },
    ];
  }, [config.signals]);

  const totalPoints = signals.reduce((a, s) => a + s.points, 0);
  const score = configScore > 0 ? Math.min(maxScore, configScore) : Math.min(maxScore, totalPoints);
  const { grade, tier } = computeGrade((score / maxScore) * 100);

  const tierColor = tier === 'hot' ? 'text-red-600 dark:text-red-400' :
    tier === 'warm' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400';

  React.useEffect(() => {
    if (disabled) return;
    const out: LeadScoreValue = {
      score,
      grade,
      tier,
      signals,
      timestamp: new Date().toISOString(),
    };
    onChange(out);
  }, [score, grade, tier]);

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Award className="size-4 text-amber-500" />
        <span className="text-xs font-bold">Lead Score</span>
        <Badge variant="outline" className={`ml-auto text-[9px] ${tierColor}`}>Grade {grade}</Badge>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`text-3xl font-black tabular-nums ${tierColor}`}>{Math.round(score)}</span>
            <span className="text-xs text-muted-foreground">/ {maxScore}</span>
          </div>
          <span className={`flex items-center gap-1 text-[11px] font-bold uppercase ${tierColor}`}>
            {tier === 'hot' && <Flame className="size-3.5" />}
            {tier === 'warm' && <TrendingUp className="size-3.5" />}
            {tier === 'cold' && <Star className="size-3.5" />}
            {tier}
          </span>
        </div>
        <Progress value={(score / maxScore) * 100} className="h-1.5" />
      </div>

      {showSignals && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground">Score breakdown</p>
          <ul className="space-y-0.5 text-[11px]">
            {signals.map((s) => (
              <li key={s.label} className="flex items-center justify-between">
                <span className="text-muted-foreground truncate">{s.label}</span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">+{s.points}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LeadScoringDisplay;
