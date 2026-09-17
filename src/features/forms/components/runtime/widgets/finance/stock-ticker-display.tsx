'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface Quote {
  symbol: string;
  price: number;
  change: number;          // absolute
  changePercent: number;   // %
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  currency: string;
  timestamp: string;
  source: 'mock' | 'api';
}

interface TickerValue extends Quote {
  fetchedAt?: string;
}

// Mock quote table — Phase 3 placeholder, no real API calls.
const MOCK_QUOTES: Record<string, Omit<Quote, 'symbol' | 'timestamp'>> = {
  AAPL: { price: 178.45, change: 1.23, changePercent: 0.69, high: 179.80, low: 176.92, open: 177.10, prevClose: 177.22, volume: 48_512_300, currency: 'USD', source: 'mock' },
  GOOGL: { price: 142.78, change: -0.84, changePercent: -0.58, high: 143.95, low: 142.20, open: 143.60, prevClose: 143.62, volume: 22_104_500, currency: 'USD', source: 'mock' },
  TSLA: { price: 245.30, change: 4.12, changePercent: 1.71, high: 247.85, low: 241.10, open: 242.30, prevClose: 241.18, volume: 88_500_200, currency: 'USD', source: 'mock' },
  MSFT: { price: 412.65, change: 2.78, changePercent: 0.68, high: 414.20, low: 410.05, open: 411.20, prevClose: 409.87, volume: 14_883_400, currency: 'USD', source: 'mock' },
  NVDA: { price: 875.32, change: 18.45, changePercent: 2.15, high: 878.50, low: 858.10, open: 860.20, prevClose: 856.87, volume: 38_204_100, currency: 'USD', source: 'mock' },
};

function fetchMockQuote(symbol: string): Promise<Quote> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const base = MOCK_QUOTES[symbol.toUpperCase()];
      if (!base) {
        reject(new Error(`No mock quote for ${symbol.toUpperCase()}. Try AAPL, GOOGL, TSLA, MSFT, NVDA.`));
        return;
      }
      // Slight jitter so refresh shows movement.
      const jitter = (Math.random() - 0.5) * 0.5;
      const price = +(base.price + jitter).toFixed(2);
      const change = +(price - base.prevClose).toFixed(2);
      const changePercent = +((change / base.prevClose) * 100).toFixed(2);
      resolve({
        ...base,
        price,
        change,
        changePercent,
        high: Math.max(base.high, price),
        low: Math.min(base.low, price),
        symbol: symbol.toUpperCase(),
        timestamp: new Date().toISOString(),
      });
    }, 400);
  });
}

export function StockTickerDisplay({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Stock ticker');
  const symbol = str(config.symbol, 'AAPL').toUpperCase();
  const refreshInterval = num(config.refreshInterval, 0); // seconds; 0 = off
  const showSparkline = bool(config.showSparkline, true);
  const apiKey = str(config.apiKey, '');

  const existing: TickerValue | undefined = value && typeof value === 'object' ? (value as TickerValue) : undefined;
  const [quote, setQuote] = useState<Quote | null>(existing ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(existing ? '' : 'Press Refresh to fetch latest price.');
  const [history, setHistory] = useState<number[]>(existing ? [existing.price] : []);

  const refresh = async () => {
    if (disabled) return;
    setLoading(true); setError('');
    try {
      const q = await fetchMockQuote(symbol);
      setQuote(q);
      setHistory((h) => [...h.slice(-19), q.price]);
      onChange({ ...q, fetchedAt: new Date().toISOString() });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch quote.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh interval.
  useEffect(() => {
    if (!refreshInterval || refreshInterval < 5) return;
    const id = setInterval(refresh, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refreshInterval, symbol]);

  const up = (quote?.change ?? 0) >= 0;
  const colorCls = up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  const sparkline = useMemo(() => {
    if (!showSparkline || history.length < 2) return null;
    const w = 100, h = 24;
    const min = Math.min(...history), max = Math.max(...history);
    const range = Math.max(0.0001, max - min);
    const pts = history.map((p, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6" preserveAspectRatio="none" aria-hidden>
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} className={colorCls} />
      </svg>
    );
  }, [history, showSparkline, colorCls]);

  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-tight">{quote?.symbol ?? symbol}</span>
            <Badge variant="outline" className="text-[8px] py-0">
              {apiKey ? 'LIVE' : 'DELAYED'}
            </Badge>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={refresh} disabled={disabled || loading} aria-label="Refresh quote">
            {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          </Button>
        </div>

        {quote ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tabular-nums">
                {quote.price.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground">{quote.currency}</span>
            </div>
            <div className={cn('flex items-center gap-1 text-xs font-semibold', colorCls)}>
              {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              <span className="tabular-nums">{up ? '+' : ''}{quote.change.toFixed(2)}</span>
              <span className="tabular-nums">({up ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
              <span className="text-muted-foreground font-normal text-[10px]">Today</span>
            </div>

            {sparkline && <div className={colorCls}>{sparkline}</div>}

            <dl className="grid grid-cols-2 gap-1 mt-1 text-[10px] text-muted-foreground">
              <Row label="Open" value={quote.open.toFixed(2)} />
              <Row label="Prev close" value={quote.prevClose.toFixed(2)} />
              <Row label="High" value={quote.high.toFixed(2)} />
              <Row label="Low" value={quote.low.toFixed(2)} />
              <Row label="Volume" value={quote.volume.toLocaleString()} />
              <Row label="Source" value={quote.source} />
            </dl>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">{error || 'No quote loaded.'}</p>
        )}
      </div>

      {error && quote && <p className="text-[10px] text-amber-600">{error}</p>}
      {!apiKey && <p className="text-[10px] text-muted-foreground">Mock data — set <code>config.apiKey</code> for live quotes.</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className="font-mono text-foreground">{value}</dd>
    </div>
  );
}

export default StockTickerDisplay;
