'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, RefreshCw, DollarSign, Coins, MessageSquareText, PhoneCall, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface FeatureRow { feature: string; calls: number; tokens: number; costUsd: number; }
interface TenantRow { tenantId: string; name: string; plan: string; calls: number; tokens: number; estimatedCostUsd: number; quotaUsed: number; quotaLimit: number; lastUsedAt: string | null; }
interface TextSpendData {
  windowDays: number;
  platform: { calls: number; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostUsd: number; byFeature: FeatureRow[]; };
  tenants: TenantRow[];
  voice: { calls: number; billableSeconds: number; providerCostUsd: number; revenueUsd: number; };
}

const WINDOW_OPTIONS = [7, 30, 90] as const;

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
function fmtUsd(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function TextSpendSubTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TextSpendData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<(typeof WINDOW_OPTIONS)[number]>(30);

  const fetchSpend = useCallback(async (windowDays: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/superadmin/ai-platform/text-spend?days=${windowDays}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json?.error ?? `Request failed (${res.status})`); setData(null); }
      else setData(json as TextSpendData);
    } catch { setError('Network error while loading spend data.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchSpend(days); }, [fetchSpend, days]);

  const voiceMinutes = data ? Math.round(data.voice.billableSeconds / 60) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2"><Sparkles className="size-4 text-emerald-600" />Text LLM Spend</h3>
          <p className="text-sm text-muted-foreground">Token usage &amp; estimated provider cost per tenant, from the UsageLedger (TEXT_LLM rows)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            {WINDOW_OPTIONS.map((d) => (
              <button key={d} onClick={() => setDays(d)} className={cn('px-3 py-1.5 text-xs font-medium transition-colors', days === d ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}>{d}d</button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => void fetchSpend(days)} disabled={loading} aria-label="Refresh">{loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}</Button>
        </div>
      </div>

      {error && <Card className="border-destructive/40"><CardContent className="py-4 text-sm text-destructive">{error}</CardContent></Card>}
      {loading && !data && <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" /> Loading spend data…</div>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><MessageSquareText className="size-3.5" /> LLM Calls ({data.windowDays}d)</CardDescription><CardTitle className="text-2xl tabular-nums">{data.platform.calls.toLocaleString()}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{fmtTokens(data.platform.promptTokens)} prompt · {fmtTokens(data.platform.completionTokens)} completion</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><Coins className="size-3.5" /> Total Tokens</CardDescription><CardTitle className="text-2xl tabular-nums">{fmtTokens(data.platform.totalTokens)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">across all tenants &amp; features</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><DollarSign className="size-3.5" /> Est. Text Cost</CardDescription><CardTitle className="text-2xl tabular-nums">{fmtUsd(data.platform.estimatedCostUsd)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">modeled from public per-1M-token prices</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1.5"><PhoneCall className="size-3.5" /> Voice (same window)</CardDescription><CardTitle className="text-2xl tabular-nums">{fmtUsd(data.voice.providerCostUsd)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{data.voice.calls} calls · {voiceMinutes.toLocaleString()} min · rev {fmtUsd(data.voice.revenueUsd)}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4 text-emerald-600" /> Per-Tenant Spend</CardTitle><CardDescription>Sorted by estimated cost</CardDescription></CardHeader>
              <CardContent>
                {data.tenants.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No text-LLM usage recorded in this window.</p> : (
                  <ScrollArea className="max-h-96">
                    <Table>
                      <TableHeader><TableRow><TableHead>Tenant</TableHead><TableHead className="text-right">Calls</TableHead><TableHead className="text-right">Tokens</TableHead><TableHead className="text-right">Est. Cost</TableHead><TableHead className="w-[120px]">Quota</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {data.tenants.map((t) => {
                          const pct = t.quotaLimit > 0 ? Math.min(100, (t.quotaUsed / t.quotaLimit) * 100) : 0;
                          return (
                            <TableRow key={t.tenantId}>
                              <TableCell><p className="font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.plan}{t.lastUsedAt ? ` · last ${new Date(t.lastUsedAt).toLocaleDateString()}` : ''}</p></TableCell>
                              <TableCell className="text-right tabular-nums">{t.calls.toLocaleString()}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtTokens(t.tokens)}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtUsd(t.estimatedCostUsd)}</TableCell>
                              <TableCell><div className="flex items-center gap-2"><Progress value={pct} className="h-1.5" aria-label={`${t.name} quota`} /><span className="w-14 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">{t.quotaUsed}/{t.quotaLimit || '—'}</span></div></TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 self-start">
              <CardHeader className="pb-3"><CardTitle className="text-base">By Feature</CardTitle><CardDescription>Which products consume the tokens</CardDescription></CardHeader>
              <CardContent>
                {data.platform.byFeature.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No usage in this window.</p> : (
                  <div className="space-y-2">
                    {data.platform.byFeature.map((f) => {
                      const share = data.platform.calls > 0 ? (f.calls / data.platform.calls) * 100 : 0;
                      return (
                        <div key={f.feature} className="rounded-lg border p-3">
                          <div className="mb-1.5 flex items-center justify-between gap-2"><Badge variant="outline" className="font-mono text-[10px]">{f.feature}</Badge><span className="text-xs tabular-nums text-muted-foreground">{f.calls} calls · {fmtUsd(f.costUsd)}</span></div>
                          <Progress value={share} className="h-1.5" aria-label={`${f.feature} share`} />
                          <p className="mt-1 text-[10px] text-muted-foreground">{share.toFixed(0)}% of calls · {fmtTokens(f.tokens)} tokens</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
