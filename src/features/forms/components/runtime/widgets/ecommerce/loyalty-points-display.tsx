'use client';

import React, { useMemo, useState } from 'react';
import { Award, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WidgetProps, str, num, bool } from '../widget-props';

interface RedeemOption {
  label: string;
  points: number;
  reward: string;
}

interface RedemptionValue {
  redeemedPoints: number;
  rewardKey: string;
  reward: string;
  remainingPoints: number;
  timestamp: string;
}

interface LoyaltyValue {
  balance: number;
  tier: string;
  redeemed?: RedemptionValue | null;
}

const DEFAULT_REDEEM_OPTIONS: RedeemOption[] = [
  { label: '$5 off', points: 500, reward: '5 off next order' },
  { label: '$10 off', points: 900, reward: '10 off next order' },
  { label: 'Free shipping', points: 250, reward: 'free shipping' },
  { label: '$25 off', points: 2500, reward: '25 off next order' },
];

function tierFor(points: number): { name: string; nextThreshold: number; floor: number } {
  if (points >= 5000) return { name: 'Platinum', nextThreshold: 0, floor: 5000 };
  if (points >= 2000) return { name: 'Gold', nextThreshold: 5000, floor: 2000 };
  if (points >= 500) return { name: 'Silver', nextThreshold: 2000, floor: 500 };
  return { name: 'Bronze', nextThreshold: 500, floor: 0 };
}

export function LoyaltyPointsDisplay({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Loyalty points');
  const showRedeem = bool(config.showRedeem, true);

  const opts = useMemo<RedeemOption[]>(() => {
    const raw = config.redeemOptions;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((o, i) => ({
        label: str((o as Record<string, unknown>).label, `Reward ${i + 1}`),
        points: num((o as Record<string, unknown>).points, 100),
        reward: str((o as Record<string, unknown>).reward, o ? str((o as Record<string, unknown>).label, '') : ''),
      }));
    }
    return DEFAULT_REDEEM_OPTIONS;
  }, [config.redeemOptions]);

  // Read balance from config (read-only display) — fall back to value.
  const configBalance = num(config.balance, 0);
  const existing: LoyaltyValue = value && typeof value === 'object' ? (value as LoyaltyValue) : { balance: configBalance, tier: tierFor(configBalance).name };
  const balance = configBalance > 0 ? configBalance : existing.balance;
  const tier = tierFor(balance);
  const [selected, setSelected] = useState<string>(existing.redeemed?.rewardKey ?? '');
  const [lastRedeemed, setLastRedeemed] = useState<RedemptionValue | null>(existing.redeemed ?? null);

  const progressPct = tier.nextThreshold === 0 ? 100
    : Math.min(100, Math.round(((balance - tier.floor) / (tier.nextThreshold - tier.floor)) * 100));

  const handleRedeem = () => {
    if (disabled || !selected) return;
    const opt = opts.find((o) => `${o.points}` === selected) ?? opts.find((o) => o.label === selected);
    if (!opt) return;
    if (balance < opt.points) return;
    const remaining = balance - opt.points;
    const red: RedemptionValue = {
      redeemedPoints: opt.points,
      rewardKey: opt.label,
      reward: opt.reward,
      remainingPoints: remaining,
      timestamp: new Date().toISOString(),
    };
    setLastRedeemed(red);
    onChange({
      balance: remaining,
      tier: tierFor(remaining).name,
      redeemed: red,
    });
  };

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="rounded-lg border border-amber-300/70 dark:border-amber-800/60 bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/40 dark:to-yellow-900/20 p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Award className="size-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400">Loyalty Balance</span>
          </div>
          <Badge variant="outline" className="text-[9px] gap-1 bg-white/60 dark:bg-amber-950/40">
            <Sparkles className="size-2.5" /> {tier.name}
          </Badge>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{balance.toLocaleString()}</span>
          <span className="text-xs text-amber-700/70 dark:text-amber-300/70">points</span>
        </div>
        {tier.nextThreshold > 0 ? (
          <div className="mt-1.5">
            <Progress value={progressPct} className="h-1.5" />
            <p className="text-[10px] text-amber-700/70 dark:text-amber-300/70 mt-1">
              {(tier.nextThreshold - balance).toLocaleString()} pts to {tier.name === 'Bronze' ? 'Silver' : tier.name === 'Silver' ? 'Gold' : 'Platinum'}
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 flex items-center gap-1 mt-1">
            <TrendingUp className="size-3" /> Highest tier reached
          </p>
        )}
      </div>

      {showRedeem && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            {opts.map((o) => {
              const sel = selected === o.label;
              const affordable = balance >= o.points;
              return (
                <button
                  key={o.label}
                  type="button"
                  disabled={disabled || !affordable}
                  onClick={() => setSelected(o.label)}
                  className={`text-left rounded-md border p-2 transition-colors ${sel ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-border hover:bg-muted'} ${!affordable ? 'opacity-40 cursor-not-allowed' : ''}`}
                  aria-label={`Redeem ${o.points} points for ${o.label}`}
                >
                  <p className="text-[11px] font-semibold">{o.label}</p>
                  <p className="text-[10px] text-muted-foreground">{o.points} pts</p>
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            disabled={disabled || !selected}
            onClick={handleRedeem}
            className="w-full h-8 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Redeem <ArrowRight className="size-3" />
          </Button>

          {lastRedeemed && (
            <div className="text-[10px] text-muted-foreground rounded-md bg-muted/50 p-2 border border-border/60">
              Redeemed <strong>{lastRedeemed.redeemedPoints}</strong> pts for <strong>{lastRedeemed.reward}</strong>. Remaining: <strong>{lastRedeemed.remainingPoints}</strong>.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default LoyaltyPointsDisplay;
