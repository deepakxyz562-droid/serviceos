'use client';

import { useEffect, useMemo, useState } from 'react';
import { authFetch } from '@/lib/client-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Bot,
  Compass,
  Eye,
  Globe,
  Grid3x3,
  Loader2,
  MapPin,
  RefreshCw,
  Search as SearchIcon,
  Sparkles,
} from 'lucide-react';

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

type GridPoint = {
  row: number;
  col: number;
  lat: number;
  lng: number;
  coord: string;
  rank: number | null;
  topCompetitorName?: string | null;
  topCompetitorRating?: number | null;
};

type GridScanRow = {
  id: string;
  date: string;
  keyword: string;
  placeId: string;
  gridSize: 3 | 5;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  avgRank: number | null;
  top3Pct: number;
  rankedPoints: number;
  totalPoints: number;
  points: GridPoint[];
  cost: number;
};

type OrganicScanRow = {
  id: string;
  date: string;
  keyword: string;
  targetDomain: string;
  organicRank: number | null;
  aiOverviewPresent: boolean;
  aiOverviewCited: boolean;
  citedDomains: string[];
  topCompetitorDomains?: string[];
  cost: number;
};

type PresenceInfo = {
  mode: 'no_website' | 'bgos_hosted' | 'custom_domain';
  websiteUrl: string | null;
  canonicalUrl: string | null;
  hostedCanonicalUrl: string;
  domain: string | null;
};

type AutoDefaults = {
  placeId: string | null;
  centerLat: number | null;
  centerLng: number | null;
  locationCoord: string | null;
  city: string | null;
  websiteUrl: string | null;
  canonicalUrl: string | null;
  domain: string | null;
  suggestedKeywords: string[];
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
  presence?: PresenceInfo;
  autoDefaults?: AutoDefaults;
  gridScans?: GridScanRow[];
  organicScans?: OrganicScanRow[];
};

type RankViewTab = 'overview' | 'geo-grid' | 'organic-serp';

function tileClass(rank: number | null): string {
  if (rank === null) return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  if (rank <= 3) return 'bg-emerald-500 text-white border-emerald-600 shadow-xs';
  if (rank <= 10) return 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs';
  return 'bg-rose-500 text-white border-rose-600 shadow-xs';
}

export function RankTracker() {
  const [data, setData] = useState<Result | null>(null);
  const [activeTab, setActiveTab] = useState<RankViewTab>('overview');
  const [busy, setBusy] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [activatingSite, setActivatingSite] = useState(false);
  const [error, setError] = useState('');

  // Single-point scan form
  const [placeId, setPlaceId] = useState('');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');

  // Geo-Grid form state
  const [gridKeyword, setGridKeyword] = useState('');
  const [gridSize, setGridSize] = useState<3 | 5>(3);
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [gridBusy, setGridBusy] = useState(false);
  const [selectedGridId, setSelectedGridId] = useState<string | null>(null);

  // Organic SERP form state
  const [organicKeywordsInput, setOrganicKeywordsInput] = useState('');
  const [organicBusy, setOrganicBusy] = useState(false);

  async function load() {
    try {
      const r = await authFetch('/api/gbp/rankings');
      const j = (await r.json()) as Result & { error?: string };
      if (!r.ok) throw new Error(j.error || 'Could not load rankings');
      setData(j);

      const defaults = j.autoDefaults;
      if (j.search) {
        setPlaceId((prev) => prev || j.search!.placeId);
        setLocation((prev) => prev || j.search!.location);
        setKeywords((prev) => prev || j.search!.keywords.join('\n'));
      } else if (defaults) {
        if (defaults.placeId) setPlaceId((prev) => prev || defaults.placeId!);
        if (defaults.locationCoord) setLocation((prev) => prev || defaults.locationCoord!);
        if (Array.isArray(defaults.suggestedKeywords) && defaults.suggestedKeywords.length > 0) {
          setKeywords((prev) => prev || defaults.suggestedKeywords.join('\n'));
        }
      }

      if (defaults?.suggestedKeywords?.length) {
        setGridKeyword((prev) => prev || defaults.suggestedKeywords[0]);
        setOrganicKeywordsInput((prev) => prev || defaults.suggestedKeywords.slice(0, 3).join('\n'));
      }
      if (Array.isArray(j.gridScans) && j.gridScans.length > 0) {
        setSelectedGridId((prev) => prev || j.gridScans![0].id);
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

  async function activateFreeMiniSite() {
    setActivatingSite(true);
    try {
      const r = await authFetch('/api/seo/fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', actionKey: 'activate_hosted_site', syncToGoogle: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Could not activate hosted mini-site');
      toast.success(j?.result?.message || 'Free SEO mini-site activated!');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to activate mini-site');
    } finally {
      setActivatingSite(false);
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

  async function runGeoGridScan() {
    const cleanKw = gridKeyword.trim();
    if (!cleanKw) {
      toast.info('Enter a keyword to scan on the Geo-Grid.');
      return;
    }
    const coordParts = location.split(',');
    const centerLat = Number(coordParts[0]) || data?.autoDefaults?.centerLat;
    const centerLng = Number(coordParts[1]) || data?.autoDefaults?.centerLng;

    setGridBusy(true);
    setError('');
    try {
      const r = await authFetch('/api/gbp/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'maps_grid',
          keyword: cleanKw,
          placeId: placeId || data?.autoDefaults?.placeId,
          centerLat,
          centerLng,
          gridSize,
          radiusKm,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Geo-Grid scan failed');
      toast.success(`${gridSize}x${gridSize} Maps Geo-Grid scan complete!`);
      if (j?.scan?.id) setSelectedGridId(j.scan.id);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Geo-Grid scan failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setGridBusy(false);
    }
  }

  async function runOrganicSerpScan() {
    const list = organicKeywordsInput
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (list.length === 0) {
      toast.info('Enter 1–3 keywords to check Organic Google & AI Overview rankings.');
      return;
    }
    setOrganicBusy(true);
    setError('');
    try {
      const r = await authFetch('/api/gbp/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'organic_serp',
          keywords: list,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Organic SERP scan failed');
      toast.success(`Checked ${j?.scans?.length || list.length} keyword(s) on Google Web & AI Overviews!`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Organic SERP scan failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setOrganicBusy(false);
    }
  }

  const activeGridScan = useMemo(() => {
    const list = data?.gridScans || [];
    if (!list.length) return null;
    return list.find((s) => s.id === selectedGridId) || list[0];
  }, [data?.gridScans, selectedGridId]);

  const presence = data?.presence;

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight">Google Maps &amp; Search Ranking Telemetry</h2>
            <Badge
              variant="outline"
              className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200"
            >
              {data?.hasGoogleConnection ? 'Google Profile Connected' : 'Google Disconnected'}
            </Badge>
            {presence && (
              <Badge variant="outline" className="text-xs">
                {presence.mode === 'custom_domain'
                  ? `Domain: ${presence.domain}`
                  : presence.mode === 'bgos_hosted'
                    ? 'BGOS Hosted Mini-Site'
                    : 'No Dedicated Website'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track official Google Maps discovery, multi-point Geo-Grid rankings, Google Organic Web SERPs, and AI Overview citations.
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

      {/* Sub-navigation switcher */}
      <div className="flex items-center gap-2 flex-wrap border-b border-border pb-2">
        {[
          { id: 'overview' as const, label: 'Maps Position & Discovery', icon: Compass },
          { id: 'geo-grid' as const, label: 'Maps Geo-Grid (3x3 / 5x5)', icon: Grid3x3 },
          { id: 'organic-serp' as const, label: 'Google Web & AI Overviews', icon: Globe },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-[#009F50] text-white shadow-2xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {activeTab === 'overview' && (
        <>
          {/* ── NATIVE GOOGLE DISCOVERY CARD (100% Free via Connected Google OAuth) ── */}
          <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="size-4 text-blue-600" />
                <h3 className="font-semibold text-sm">Google Maps &amp; Search Discovery (Official Google Telemetry)</h3>
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
                  <span className="text-xs">Directions &amp; Calls</span>
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

          {/* ── MEASURED POSITION RANKINGS (DataForSEO Single-Point Scan) ── */}
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
        </>
      )}

      {/* ── MAPS GEO-GRID HEATMAP (3x3 / 5x5) ── */}
      {activeTab === 'geo-grid' && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-foreground">Google Maps Geo-Grid Heatmap</h3>
                <p className="text-xs text-muted-foreground">
                  Measures your exact Google Maps pack position across 9 (3x3) or 25 (5x5) neighborhood GPS points around your business.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-emerald-500" /> #1–3</span>
                <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-amber-400" /> #4–10</span>
                <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-rose-500" /> #11–20</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="text-xs font-semibold">Keyword</label>
                <input
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-xs"
                  value={gridKeyword}
                  onChange={(e) => setGridKeyword(e.target.value)}
                  placeholder="e.g. dental clinic near me"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold">Grid Size</label>
                <select
                  className="mt-1 w-full rounded-lg border bg-background px-2.5 py-2 text-xs"
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value) === 5 ? 5 : 3)}
                >
                  <option value={3}>3x3 (9 pts)</option>
                  <option value={5}>5x5 (25 pts)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold">Radius</label>
                <select
                  className="mt-1 w-full rounded-lg border bg-background px-2.5 py-2 text-xs"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                >
                  <option value={1.5}>1.5 km</option>
                  <option value={3}>3 km</option>
                  <option value={5}>5 km</option>
                </select>
              </div>
              <div className="sm:col-span-3 flex items-end">
                <Button
                  disabled={gridBusy || !data?.configured}
                  onClick={() => void runGeoGridScan()}
                  className="w-full h-9 text-xs font-bold bg-[#009F50] hover:bg-[#008A45] text-white"
                >
                  {gridBusy ? (
                    <><Loader2 className="size-3.5 animate-spin mr-1.5" /> Scanning Grid…</>
                  ) : (
                    'Run Geo-Grid Scan'
                  )}
                </Button>
              </div>
            </div>

            {!data?.configured && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                DataForSEO server credentials are required to run live coordinate Geo-Grid scans.
              </p>
            )}
          </div>

          {activeGridScan ? (
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold">
                    &ldquo;{activeGridScan.keyword}&rdquo; ({activeGridScan.gridSize}x{activeGridScan.gridSize} · {activeGridScan.radiusKm} km radius)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Scanned {new Date(activeGridScan.date).toLocaleString()} · Avg Rank: {activeGridScan.avgRank ?? 'Unranked'} · Top-3 Coverage: {activeGridScan.top3Pct}%
                  </p>
                </div>
                {(data?.gridScans?.length || 0) > 1 && (
                  <select
                    className="rounded-lg border bg-background px-2.5 py-1.5 text-xs"
                    value={activeGridScan.id}
                    onChange={(e) => setSelectedGridId(e.target.value)}
                  >
                    {data!.gridScans!.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.keyword} ({s.gridSize}x{s.gridSize}) — {new Date(s.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div
                className="grid gap-2 max-w-md mx-auto py-2"
                style={{
                  gridTemplateColumns: `repeat(${activeGridScan.gridSize}, minmax(0, 1fr))`,
                }}
              >
                {activeGridScan.points.map((pt, idx) => (
                  <div
                    key={`${pt.row}-${pt.col}-${idx}`}
                    title={`Coord: ${pt.lat}, ${pt.lng}${pt.topCompetitorName ? ` · #1: ${pt.topCompetitorName}` : ''}`}
                    className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1 text-center transition ${tileClass(pt.rank)}`}
                  >
                    <span className="text-sm font-black">{pt.rank != null ? `#${pt.rank}` : '—'}</span>
                    {pt.row === Math.floor(activeGridScan.gridSize / 2) &&
                      pt.col === Math.floor(activeGridScan.gridSize / 2) && (
                        <span className="text-[9px] uppercase font-bold opacity-90">Center</span>
                      )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              No Geo-Grid heatmap scans saved yet. Enter a keyword above and run your first 3x3 or 5x5 grid scan.
            </div>
          )}
        </div>
      )}

      {/* ── GOOGLE ORGANIC WEB SERP & AI OVERVIEWS ── */}
      {activeTab === 'organic-serp' && (
        <div className="space-y-4">
          {presence?.mode === 'no_website' ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  No Dedicated Website Linked Yet
                </h3>
                <p className="text-xs text-amber-800/90 dark:text-amber-300 max-w-xl">
                  Google Web Organic Rankings &amp; AI Overviews track a webpage URL. Activate your free SEO-ready BGOS mini-site ({presence.hostedCanonicalUrl}) in 1 click to start tracking organic &amp; AI Overview citations.
                </p>
              </div>
              <Button
                size="sm"
                disabled={activatingSite}
                onClick={() => void activateFreeMiniSite()}
                className="bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-bold shrink-0 gap-1.5"
              >
                {activatingSite ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                <span>Activate Free Mini-Site</span>
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold">Google Organic Web SERP &amp; AI Overview Tracker</h3>
                  <p className="text-xs text-muted-foreground">
                    Tracking domain/page:{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {presence?.canonicalUrl || presence?.domain}
                    </span>
                  </p>
                </div>
              </div>

              <label className="block text-xs font-semibold">
                Keywords (1 to 3 per scan, 12-hour cooldown)
                <textarea
                  className="mt-1 w-full rounded-lg border bg-background p-2.5 text-xs"
                  rows={3}
                  value={organicKeywordsInput}
                  onChange={(e) => setOrganicKeywordsInput(e.target.value)}
                  placeholder="Enter 1–3 local buyer-intent keywords..."
                />
              </label>

              <Button
                size="sm"
                disabled={organicBusy || !data?.configured}
                onClick={() => void runOrganicSerpScan()}
                className="bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-bold"
              >
                {organicBusy ? (
                  <><Loader2 className="size-3.5 animate-spin mr-1.5" /> Checking Google Web &amp; AI Overviews…</>
                ) : (
                  'Check Web Rank & AI Overview Citations'
                )}
              </Button>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 font-semibold">Keyword</th>
                  <th className="p-3 font-semibold">Organic Web Rank</th>
                  <th className="p-3 font-semibold">AI Overview</th>
                  <th className="p-3 font-semibold">Top Cited Domains</th>
                </tr>
              </thead>
              <tbody>
                {(data?.organicScans || []).map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3 font-semibold text-foreground">{row.keyword}</td>
                    <td className="p-3">
                      {row.organicRank != null ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                          #{row.organicRank}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not in Top 30</span>
                      )}
                    </td>
                    <td className="p-3">
                      {row.aiOverviewCited ? (
                        <Badge className="bg-emerald-600 text-white gap-1">
                          <Bot className="size-3" /> Cited!
                        </Badge>
                      ) : row.aiOverviewPresent ? (
                        <Badge variant="outline">AIO Present (Not Cited)</Badge>
                      ) : (
                        <span className="text-muted-foreground">No AI Overview</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.citedDomains?.length ? row.citedDomains.slice(0, 4).join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.organicScans || data.organicScans.length === 0) && (
              <p className="p-4 text-xs text-muted-foreground">
                No Organic Web SERP or AI Overview scans recorded yet.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
