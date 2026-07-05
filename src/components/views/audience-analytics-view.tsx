'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Users, UserCheck, UserX, AlertTriangle, FolderTree,
  Tag as TagIcon, Filter, TrendingUp, Loader2, Globe, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AudienceAnalytics {
  totalContacts: number;
  activeContacts: number;
  unsubscribedContacts: number;
  bouncedContacts: number;
  contactsBySource: { source: string; count: number }[];
  contactsByCountry: { country: string; count: number }[];
  contactsByStatus: { status: string; count: number }[];
  totalGroups: number;
  totalTags: number;
  totalSegments: number;
  topGroups: { id: string; name: string; memberCount: number }[];
  topTags: { id: string; name: string; color: string | null; contactCount: number }[];
  recentImports: {
    id: string;
    fileName: string;
    source: string;
    status: string;
    importedCount: number;
    createdAt: string;
  }[];
  growthLast30Days: { date: string; count: number }[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SOURCE_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#f97316', '#f43f5e', '#64748b', '#78716c'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function formatRelativeDay(dateStr: string, idx: number): string {
  try {
    const d = new Date(dateStr);
    if (idx % 5 === 0) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return '';
  } catch {
    return '';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AudienceAnalyticsView() {
  const [data, setData] = useState<AudienceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/audience-analytics');
      if (res.ok) {
        const result = await res.json();
        setData(result.data ?? result);
      } else {
        setError('Failed to load analytics');
        toast.error('Failed to load analytics');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Render ──
  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56 mt-1" />
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-20 mt-2" />
            </Card>
          ))}
        </div>
        <Card className="p-4 h-64">
          <Skeleton className="h-full w-full" />
        </Card>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card className="p-4 h-64"><Skeleton className="h-full w-full" /></Card>
          <Card className="p-4 h-64"><Skeleton className="h-full w-full" /></Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <BarChart3 className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load analytics</p>
        <p className="text-sm mt-1">{error ?? 'No data'}</p>
        <Button className="mt-4" variant="outline" onClick={load}>
          <Loader2 className="size-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Contacts', value: data.totalContacts, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Active', value: data.activeContacts, icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-500/10' },
    { label: 'Unsubscribed', value: data.unsubscribedContacts, icon: UserX, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'Bounced', value: data.bouncedContacts, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-500/10' },
    { label: 'Groups', value: data.totalGroups, icon: FolderTree, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'Tags', value: data.totalTags, icon: TagIcon, color: 'text-teal-600', bg: 'bg-teal-500/10' },
    { label: 'Segments', value: data.totalSegments, icon: Filter, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  ];

  const maxSource = Math.max(1, ...data.contactsBySource.map(s => s.count));
  const topCountries = data.contactsByCountry.slice(0, 10);
  const maxCountry = Math.max(1, ...topCountries.map(c => c.count));
  const maxGrowth = Math.max(1, ...data.growthLast30Days.map(d => d.count));
  const maxGroup = Math.max(1, ...data.topGroups.map(g => g.memberCount));
  const maxTag = Math.max(1, ...data.topTags.map(t => t.contactCount));
  const totalGrowth = data.growthLast30Days.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <BarChart3 className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Audience Analytics</h2>
            <p className="text-sm text-muted-foreground">Contact growth, distribution &amp; engagement</p>
          </div>
        </div>
        <Button variant="outline" onClick={load}>
          <Activity className="size-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-center justify-between">
                <div className={cn('flex items-center justify-center size-8 rounded-md', kpi.bg)}>
                  <Icon className={cn('size-4', kpi.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold mt-2">{(kpi.value || 0).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            </Card>
          );
        })}
      </div>

      {/* Growth Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" />
            Growth — Last 30 Days
            <Badge variant="secondary" className="text-[10px] ml-auto">
              +{totalGrowth} new
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.growthLast30Days.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No growth data yet</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-end gap-1 h-40">
                {data.growthLast30Days.map((d, i) => {
                  const heightPct = (d.count / maxGrowth) * 100;
                  return (
                    <div
                      key={i}
                      className="flex-1 group relative flex flex-col items-center justify-end"
                      title={`${formatDate(d.date)}: ${d.count} new`}
                    >
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-400 group-hover:from-emerald-600 group-hover:to-teal-500 transition-colors"
                        style={{ height: `${Math.max(heightPct, d.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1">
                {data.growthLast30Days.map((d, i) => (
                  <div key={i} className="flex-1 text-[9px] text-muted-foreground text-center truncate">
                    {formatRelativeDay(d.date, i)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contacts by Source & Country */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="size-4 text-emerald-600" />
              Contacts by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.contactsBySource.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No data</p>
            ) : (
              <div className="space-y-2">
                {data.contactsBySource.map((s, i) => {
                  const pct = (s.count / maxSource) * 100;
                  const color = SOURCE_COLORS[i % SOURCE_COLORS.length];
                  return (
                    <div key={s.source} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium capitalize">{s.source || 'unknown'}</span>
                        <span className="text-muted-foreground">{s.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="size-4 text-teal-600" />
              Contacts by Country (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCountries.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No data</p>
            ) : (
              <div className="space-y-2">
                {topCountries.map((c, i) => {
                  const pct = (c.count / maxCountry) * 100;
                  const color = SOURCE_COLORS[i % SOURCE_COLORS.length];
                  return (
                    <div key={c.country} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{c.country || 'unknown'}</span>
                        <span className="text-muted-foreground">{c.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Groups & Tags */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderTree className="size-4 text-emerald-600" />
              Top Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topGroups.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No groups yet</p>
            ) : (
              <div className="space-y-2">
                {data.topGroups.map((g, i) => {
                  const pct = (g.memberCount / maxGroup) * 100;
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="truncate">{i + 1}. {g.name}</span>
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">{g.memberCount}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TagIcon className="size-4 text-teal-600" />
              Top Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topTags.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No tags yet</p>
            ) : (
              <div className="space-y-2">
                {data.topTags.map((t, i) => {
                  const pct = (t.contactCount / maxTag) * 100;
                  const color = t.color || '#14b8a6';
                  return (
                    <div key={t.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate flex items-center gap-2">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate">{i + 1}. {t.name}</span>
                        </span>
                        <span className="text-muted-foreground shrink-0 ml-2">{t.contactCount}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Imports */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Imports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentImports.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No recent imports</p>
          ) : (
            <ScrollArea className="max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Imported</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentImports.map(im => (
                    <TableRow key={im.id}>
                      <TableCell className="font-medium text-sm truncate max-w-[200px]">{im.fileName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{im.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            im.status === 'completed' && 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
                            im.status === 'failed' && 'bg-rose-500/10 text-rose-700 border-rose-500/30',
                            im.status === 'processing' && 'bg-teal-500/10 text-teal-700 border-teal-500/30',
                            im.status === 'pending' && 'bg-amber-500/10 text-amber-700 border-amber-500/30',
                          )}
                        >
                          {im.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-emerald-700 font-medium">{im.importedCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(im.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Contacts by Status (footer) */}
      {data.contactsByStatus.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="size-4 text-emerald-600" />
              Contacts by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.contactsByStatus.map(s => (
                <Badge
                  key={s.status}
                  variant="outline"
                  className="text-xs py-1 px-3"
                >
                  <span className="capitalize">{s.status || 'unknown'}</span>
                  <Separator orientation="vertical" className="mx-2 h-3" />
                  <span className="font-bold">{s.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
