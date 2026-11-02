'use client';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/client-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Compass, Eye, MapPin, Search as SearchIcon, RefreshCw } from 'lucide-react';

type Search = { placeId: string; location: string; keywords: string[] };
type NativeDiscovery = {
  updatedAt: string;
  totalViews: number;
  mapsImpressions: number;
  searchImpressions: number;
  callClicks: number;
  directionRequests: number;
  websiteClicks: number;
  keywords: Array<{ keyword: string; count: number }>;
};
type Result = {
  configured: boolean;
  hasGoogleConnection: boolean;
  nativeDiscovery: NativeDiscovery | null;
  currentAvgRank: number | null;
  initialAvgRank: number | null;
  totalImprovement: number | null;
  lastScannedAt: string | null;
  search: Search | null;
  keywords: { keyword: string; currentRank: number | null }[];
  history: { date: string; avgRank: number | null; location: string; cost: number }[];
};

export function RankTracker() {
  const [data, setData] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [error, setError] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');

  async function load() {
    try {
      const r = await authFetch('/api/gbp/rankings');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j);
      if (j.search) {
        setPlaceId(j.search.placeId);
        setLocation(j.search.location);
        setKeywords(j.search.keywords.join('\n'));
      }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load rankings');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function refreshNativeDiscovery() {
    setNativeBusy(true);
    setError('');
    try {
      const r = await authFetch('/api/gbp/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google_native' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      toast.success(j.message || 'Google Business discovery metrics updated!');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to refresh discovery');
    } finally {
      setNativeBusy(false);
    }
  }

  async function scan() {
    setBusy(true);
    setError('');
    try {
      const r = await authFetch('/api/gbp/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: {
            placeId,
            location,
            keywords: keywords
              .split('\n')
              .map((k) => k.trim())
              .filter(Boolean),
          },
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      toast.success(j.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Google Maps & Search Ranking Telemetry</h2>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200">
              {data?.hasGoogleConnection ? 'Google Profile Connected' : 'Google Disconnected'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track real customer discovery on Google Maps, Search queries, and measured position rankings.
          </p>
        </div>
        {data?.hasGoogleConnection && (
          <Button
            variant="outline"
            size="sm"
            disabled={nativeBusy}
            onClick={() => void refreshNativeDiscovery()}
            className="gap-2 shrink-0"
          >
            <RefreshCw className={`size-3.5 ${nativeBusy ? 'animate-spin' : ''}`} />
            {nativeBusy ? 'Syncing...' : 'Refresh Google Discovery'}
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {/* ── NATIVE GOOGLE DISCOVERY CARD (100% Free via Connected Google OAuth) ── */}
      <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-blue-600" />
            <h3 className="font-semibold text-sm">Google Maps & Search Discovery (Official Google Telemetry)</h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {data?.nativeDiscovery?.updatedAt
              ? `Synced ${new Date(data.nativeDiscovery.updatedAt).toLocaleTimeString()}`
              : 'Direct from Google Business Profile'}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs">Maps Views</span>
              <MapPin className="size-3 text-emerald-600" />
            </div>
            <p className="text-xl font-bold">{data?.nativeDiscovery?.mapsImpressions ?? '—'}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs">Search Views</span>
              <SearchIcon className="size-3 text-blue-600" />
            </div>
            <p className="text-xl font-bold">{data?.nativeDiscovery?.searchImpressions ?? '—'}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs">Total Views</span>
              <Eye className="size-3 text-purple-600" />
            </div>
            <p className="text-xl font-bold">{data?.nativeDiscovery?.totalViews ?? '—'}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs">Directions & Calls</span>
              <Compass className="size-3 text-amber-600" />
            </div>
            <p className="text-xl font-bold">
              {(data?.nativeDiscovery?.directionRequests || 0) + (data?.nativeDiscovery?.callClicks || 0) || '—'}
            </p>
          </div>
        </div>

        {data?.nativeDiscovery?.keywords && data.nativeDiscovery.keywords.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Top Customer Search Queries on Google
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.nativeDiscovery.keywords.map((k) => (
                <Badge key={k.keyword} variant="secondary" className="text-xs font-normal py-0.5 px-2 bg-slate-100 dark:bg-slate-800">
                  {k.keyword} <span className="ml-1 text-[10px] text-muted-foreground font-semibold">({k.count} views)</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MEASURED POSITION RANKINGS (DataForSEO Grid or Custom Measurements) ── */}
      <div className="space-y-4">
        <h3 className="font-semibold text-base">Google Maps Position Tracker</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['First measured average', data?.initialAvgRank],
            ['Latest measured average', data?.currentAvgRank],
            ['Position change', data?.totalImprovement],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold mt-1">{value ?? 'Not measured'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCAN FORM ── */}
      <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Google Place ID
          <input
            className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            placeholder="ChIJ…"
          />
        </label>
        <label className="text-sm font-medium">
          Search coordinates and zoom
          <input
            className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="28.6139,77.2090,15z"
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Keywords (one per line, maximum 5)
          <textarea
            className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            rows={3}
          />
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          {data?.configured
            ? 'Each keyword uses a DataForSEO live maps scan (1 per 24 hours per workspace).'
            : 'DataForSEO is optional for deep 100-result coordinate grid scans. Native Google discovery above is active for free without credentials.'}
        </p>
        <Button
          disabled={busy || !data?.configured}
          onClick={() => void scan()}
          className="sm:w-auto"
        >
          {busy ? 'Scanning…' : data?.configured ? 'Run Paid Ranking Scan' : 'DataForSEO Credentials Needed For Grid Scan'}
        </Button>
      </div>

      {/* ── KEYWORD POSITIONS TABLE ── */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 font-semibold">Keyword</th>
              <th className="p-3 font-semibold">Latest Maps Position</th>
            </tr>
          </thead>
          <tbody>
            {data?.keywords.map((k) => (
              <tr key={k.keyword} className="border-t">
                <td className="p-3">{k.keyword}</td>
                <td className="p-3">
                  {k.currentRank === null ? (
                    <span className="text-muted-foreground text-xs">Not found in returned results</span>
                  ) : (
                    <span className="font-bold text-emerald-600">#{k.currentRank}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.keywords.length && (
          <p className="p-4 text-xs text-muted-foreground">
            No measured position rankings recorded yet. Use the free Google Discovery metrics above or run a scan to establish your baseline.
          </p>
        )}
      </div>

      {/* ── COMPARABLE SCAN HISTORY ── */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Comparable Scan History</h3>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 font-semibold">Measured at</th>
                <th className="p-3 font-semibold">Average rank</th>
                <th className="p-3 font-semibold">Search location</th>
                <th className="p-3 font-semibold">Provider cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data?.history.map((h) => (
                <tr key={h.date} className="border-t">
                  <td className="p-3 text-xs">{new Date(h.date).toLocaleString()}</td>
                  <td className="p-3 font-medium">{h.avgRank ?? 'Not found'}</td>
                  <td className="p-3 text-xs text-muted-foreground">{h.location}</td>
                  <td className="p-3 text-xs font-mono">{h.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.history.length && (
            <p className="p-4 text-xs text-muted-foreground">No historical scans recorded yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
