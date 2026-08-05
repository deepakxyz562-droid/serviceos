'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Directory Listings — Superadmin tool for seeding and managing the public
// business marketplace (/b/[slug] and /marketplace). Two tabs:
//
//   1. Seed       — pull businesses from OpenStreetMap Overpass API and insert
//                   them as `listingTier=free` tenants (name/phone/address/
//                   geo). Used to bootstrap a city's marketplace overnight.
//
//   2. Manage     — paginated table of all marketplace listings with filters,
//                   bulk edit (category / city / rating / public profile /
//                   description with replace|append modes) and bulk delete
//                   (soft = tier=none, hard = permanent).
//
// APIs (all superadmin-gated):
//   POST   /api/superadmin/marketplace/seed
//   GET    /api/superadmin/marketplace/listings
//   PATCH  /api/superadmin/marketplace/listings/bulk
//   DELETE /api/superadmin/marketplace/listings/bulk
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Store, Search, Trash2, Edit3, RefreshCw, CheckCircle2, AlertTriangle,
  Database, MapPin, Star, Globe, Filter, Loader2, Plus, Crown, Clock,
  Calendar, X, ShieldCheck,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table, TableHeader, TableBody, TableRow, TableCell, TableHead,
} from '@/components/ui/table';
import { SectionHeader } from '@/components/views/superadmin/_shared';
import { INDUSTRY_CATALOG, getIndustry } from '@/lib/industry-catalog';
import { getAllCountryOptions, getCitiesForCountry } from '@/lib/marketplace-cities';
import { ClaimReview } from '@/components/views/superadmin/sections/claim-review';

// ─── Constants ──────────────────────────────────────────────────────────────

// All countries: 7 global (US/AU/CA/NZ/IN/AE/SG) + 43 European.
// Sourced from src/lib/marketplace-cities.ts so the superadmin can seed
// and manage listings across the full global footprint. Countries with a
// full city catalogue (18 countries) power the cascading city dropdown —
// the admin picks a country first, then sees only that country's cities.
const COUNTRIES = getAllCountryOptions();

const TIERS = [
  { value: 'free', label: 'Free' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'business', label: 'Business' },
  { value: 'none', label: 'None (hidden)' },
];

const PAGE_SIZE = 20;

// ─── Types ──────────────────────────────────────────────────────────────────

interface Listing {
  id: string;
  name: string;
  industry: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  rating: number;
  reviewCount: number;
  listingTier: string;
  claimed: boolean;
  publicProfileEnabled: boolean;
  description: string;
  createdAt: string | null;
  // Featured + trial metadata (returned by the updated listings API)
  plan?: string;
  planStatus?: string;
  trialEndsAt?: string | null;
  isTrialExpired?: boolean;
  isFeatured?: boolean;
  featuredPriority?: number | null;
  isEligibleForFeatured?: boolean;
}

interface SeedResult {
  success: boolean;
  inserted: number;
  skipped: number;
  failed: number;
  total: number;
  osmElements?: number;
  // Categories that returned 0 OSM elements (HTTP 200 with an empty array —
  // NOT thrown errors). Surfaced by the API so the UI can render an amber
  // warning instead of a misleading green success banner with 0 inserts.
  emptyCategories?: string[];
  sample: { name: string; industry: string; city: string }[];
  error?: string;
}

interface BulkEditFields {
  industry: string;        // '' = No change
  city: string;            // '' = No change (when noChangeCity=true)
  noChangeCity: boolean;
  rating: string;          // '' = No change (when noChangeRating=true)
  noChangeRating: boolean;
  publicProfile: 'no-change' | 'enable' | 'disable';
  description: string;
  descriptionMode: 'replace' | 'append';
  noChangeDescription: boolean;
}

const EMPTY_BULK_EDIT: BulkEditFields = {
  industry: '',
  city: '',
  noChangeCity: true,
  rating: '',
  noChangeRating: true,
  publicProfile: 'no-change',
  description: '',
  descriptionMode: 'replace',
  noChangeDescription: true,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function tierBadgeClasses(tier: string): string {
  switch (tier) {
    case 'business':
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
    case 'claimed':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'free':
      return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
    case 'none':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function industryLabel(id: string): string {
  const ind = getIndustry(id);
  return ind ? `${ind.emoji} ${ind.name}` : id;
}

// ─── Seed Tab ───────────────────────────────────────────────────────────────

function SeedTab() {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('GB');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [count, setCount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  // Per-category progress tracking. When seeding, this holds the current
  // category name + index + total so the UI can show a real progress bar
  // instead of an indeterminate spinner.
  const [progress, setProgress] = useState<{ current: number; total: number; catName: string } | null>(null);

  const toggleCat = (id: string) => {
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const canSubmit = city.trim().length >= 2 && selectedCats.length > 0 && !loading;

  const handleSeed = async () => {
    if (!city.trim()) {
      toast.error('City is required');
      return;
    }
    if (selectedCats.length === 0) {
      toast.error('Select at least 1 category');
      return;
    }
    setLoading(true);
    setResult(null);
    setProgress({ current: 0, total: selectedCats.length, catName: '' });

    // Per-category count — distribute `count` evenly across selected cats.
    const perCat = Math.max(5, Math.ceil(count / selectedCats.length));

    const aggregate: SeedResult = {
      success: true,
      inserted: 0,
      skipped: 0,
      failed: 0,
      total: 0,
      osmElements: 0,
      emptyCategories: [],
      sample: [],
    };
    const errors: string[] = [];

    for (let i = 0; i < selectedCats.length; i++) {
      const catId = selectedCats[i];
      const catName = getIndustry(catId)?.name ?? catId;
      setProgress({ current: i, total: selectedCats.length, catName });

      try {
        const res = await fetch('/api/superadmin/marketplace/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: city.trim(),
            country,
            categories: [catId], // ONE category per request — avoids gateway timeouts
            count: perCat,
          }),
        });

        // ── Parse-safe JSON handling ──────────────────────────────────
        // The old code did `await res.json()` directly. When the request
        // exceeds the gateway/dev-server timeout, the platform returns a
        // plain-text/HTML error body ("An error occurred...") which is NOT
        // valid JSON → `res.json()` throws "Unexpected token 'A'" and masks
        // the real timeout cause. We now read text first, try JSON.parse,
        // and fall back to the raw text + HTTP status so the real error is
        // visible.
        const rawText = await res.text();
        let data: SeedResult | { error?: string };
        try {
          data = JSON.parse(rawText);
        } catch {
          // Not JSON — likely a timeout/gateway error page.
          const msg = rawText.slice(0, 200) || `HTTP ${res.status}`;
          errors.push(`${catName}: ${msg}`);
          aggregate.failed += perCat;
          continue;
        }

        if (!res.ok || !(data as SeedResult).success) {
          const errMsg = (data as { error?: string }).error || `HTTP ${res.status}`;
          errors.push(`${catName}: ${errMsg}`);
          aggregate.failed += perCat;
          continue;
        }

        const d = data as SeedResult;
        aggregate.inserted += d.inserted;
        aggregate.skipped += d.skipped;
        aggregate.failed += d.failed;
        aggregate.total += d.total;
        aggregate.osmElements = (aggregate.osmElements ?? 0) + (d.osmElements ?? 0);
        if (d.emptyCategories?.length) {
          aggregate.emptyCategories = [...(aggregate.emptyCategories ?? []), ...d.emptyCategories];
        }
        if (d.sample?.length && aggregate.sample.length < 10) {
          aggregate.sample = [...aggregate.sample, ...d.sample].slice(0, 10);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${catName}: ${msg}`);
        aggregate.failed += perCat;
      }
    }

    setProgress({ current: selectedCats.length, total: selectedCats.length, catName: '' });

    if (errors.length > 0) {
      aggregate.error = errors.join('; ');
      // Partial success if any inserts happened, else full failure.
      if (aggregate.inserted === 0) {
        aggregate.success = false;
        toast.error(`Seeding failed: ${errors[0]}`);
      } else {
        toast.warning(`Seeded ${aggregate.inserted} listings, but ${errors.length} category(ies) had errors`);
      }
    } else {
      toast.success(`Seeded ${aggregate.inserted} listings (${aggregate.skipped} skipped, ${aggregate.failed} failed)`);
    }

    setResult(aggregate);
    setLoading(false);
    setProgress(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Card className="lg:col-span-2 card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="size-4 text-primary" />
            Seed from OpenStreetMap
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pull businesses from OSM Overpass API and insert them as free-tier
            marketplace listings. This may take 30–60 seconds per category.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seed-city">City <span className="text-destructive">*</span></Label>
            <Input
              id="seed-city"
              placeholder="e.g. Sydney, Melbourne, Austin"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seed-country">Country</Label>
            <Select value={country} onValueChange={setCountry} disabled={loading}>
              <SelectTrigger id="seed-country" className="w-full">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seed-count">Count (1–200)</Label>
            <Input
              id="seed-count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Total target — split evenly across selected categories.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Categories <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">
              {selectedCats.length} of {INDUSTRY_CATALOG.length} selected.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {INDUSTRY_CATALOG.map((ind) => {
                const checked = selectedCats.includes(ind.id);
                return (
                  <label
                    key={ind.id}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-muted/60 transition-colors',
                      checked && 'bg-muted',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleCat(ind.id)}
                      disabled={loading}
                    />
                    <span className="truncate">
                      <span className="mr-1">{ind.emoji}</span>
                      {ind.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <Button onClick={handleSeed} disabled={!canSubmit} className="w-full">
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Seeding from OpenStreetMap...
              </>
            ) : (
              <>
                <Plus className="size-4 mr-2" />
                Seed from OpenStreetMap
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3 card-shadow">
        <CardHeader>
          <CardTitle className="text-base">Result</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && progress && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {progress.catName
                  ? `Seeding ${progress.catName}... (${progress.current + 1} of ${progress.total})`
                  : `Starting... (${progress.current} of ${progress.total} categories)`}
              </div>
              <Progress
                value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Each category queries the Overpass API separately (~30–60s each). This avoids
                gateway timeouts on multi-category runs.
              </p>
            </div>
          )}

          {!loading && !result && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Globe className="size-7 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">No seeding run yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Fill in the form on the left and click <strong>Seed from OpenStreetMap</strong> to
                pull businesses for a city.
              </p>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-4">
              {result.success ? (
                // Bug D: when Overpass returned 0 OSM elements (HTTP 200 with
                // empty array) and nothing threw, render an amber warning
                // instead of a misleading green "success" banner with 0 inserts.
                (result.osmElements ?? 0) === 0 && result.failed === 0 ? (
                  <div className="flex items-start gap-3 p-3 rounded-md border border-amber-500/30 bg-amber-500/10">
                    <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-300">No OSM data found</p>
                      <p className="text-muted-foreground mt-0.5">
                        No OSM data found for the selected categories in this
                        city. Try different categories or a nearby major city.
                      </p>
                      {result.emptyCategories && result.emptyCategories.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Categories with 0 results:{' '}
                          {result.emptyCategories.map(industryLabel).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3 rounded-md border border-emerald-500/30 bg-emerald-500/10">
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">Seeding complete</p>
                      <p className="text-muted-foreground mt-0.5">
                        Inserted <strong>{result.inserted}</strong>, skipped{' '}
                        <strong>{result.skipped}</strong> duplicates, failed{' '}
                        <strong>{result.failed}</strong>
                        {typeof result.osmElements === 'number' && (
                          <> · {result.osmElements} OSM elements fetched</>
                        )}
                        .
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-md border border-red-500/30 bg-red-500/10">
                  <AlertTriangle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-red-700 dark:text-red-300">Seeding failed</p>
                    <p className="text-muted-foreground mt-0.5">{result.error}</p>
                  </div>
                </div>
              )}

              {result.sample.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sample of inserted listings
                  </p>
                  <div className="space-y-1.5">
                    {result.sample.map((s, i) => (
                      <div
                        key={`${s.name}-${i}`}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-border bg-card text-sm"
                      >
                        <Store className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate flex-1">{s.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {industryLabel(s.industry)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                          <MapPin className="size-3" />
                          {s.city}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Manage Listings Tab ────────────────────────────────────────────────────

function ManageTab() {
  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [tier, setTier] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');

  // Data
  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialogs
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editFields, setEditFields] = useState<BulkEditFields>(EMPTY_BULK_EDIT);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  // Featured + trial management
  const [featuredBusy, setFeaturedBusy] = useState<string | null>(null);
  const [trialDialog, setTrialDialog] = useState<Listing | null>(null);
  const [trialDate, setTrialDate] = useState('');
  const [trialSaving, setTrialSaving] = useState(false);

  // ── Featured toggle handler ────────────────────────────────────────────
  const toggleFeatured = async (it: Listing) => {
    if (!it.isEligibleForFeatured && !it.isFeatured) {
      toast.error('Not eligible to feature', {
        description:
          'Only real registered businesses (claimed) with an active paid subscription or valid trial can be featured. Seed data cannot be featured.',
      });
      return;
    }
    setFeaturedBusy(it.id);
    try {
      if (it.isFeatured) {
        // Remove from featured
        const res = await fetch(
          `/api/superadmin/marketplace/listings/${it.id}/featured`,
          { method: 'DELETE' },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        toast.success(`Removed "${it.name}" from featured listings`);
      } else {
        // Add to featured
        const res = await fetch(
          `/api/superadmin/marketplace/listings/${it.id}/featured`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: 10 }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        toast.success(`Featured "${it.name}"`);
      }
      await fetchListings();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update featured status: ${msg}`);
    } finally {
      setFeaturedBusy(null);
    }
  };

  // ── Trial management handlers ──────────────────────────────────────────
  const openTrialDialog = (it: Listing) => {
    if (!it.claimed) {
      toast.error('Trial period can only be managed for real registered businesses', {
        description: 'Seed data cannot have a trial period.',
      });
      return;
    }
    setTrialDialog(it);
    // Pre-fill the date input with the current trialEndsAt (or 14 days from now)
    const base =
      it.trialEndsAt != null
        ? new Date(it.trialEndsAt)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    // Format as YYYY-MM-DD for the <input type="date">
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    setTrialDate(`${yyyy}-${mm}-${dd}`);
  };

  const saveTrial = async () => {
    if (!trialDialog || !trialDate) return;
    setTrialSaving(true);
    try {
      // Set the trial to end at midnight (end of the selected day) in the
      // server's local timezone.
      const end = new Date(`${trialDate}T23:59:59`);
      const res = await fetch(
        `/api/superadmin/marketplace/listings/${trialDialog.id}/trial`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trialEndsAt: end.toISOString() }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success(`Trial updated for "${trialDialog.name}"`, {
        description: `New trial end: ${end.toLocaleDateString()}`,
      });
      setTrialDialog(null);
      await fetchListings();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update trial: ${msg}`);
    } finally {
      setTrialSaving(false);
    }
  };

  const endTrialNow = async () => {
    if (!trialDialog) return;
    setTrialSaving(true);
    try {
      const res = await fetch(
        `/api/superadmin/marketplace/listings/${trialDialog.id}/trial`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trialEndsAt: null }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success(`Trial ended for "${trialDialog.name}"`);
      setTrialDialog(null);
      await fetchListings();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to end trial: ${msg}`);
    } finally {
      setTrialSaving(false);
    }
  };

  const quickExtendTrial = async (it: Listing, days: number) => {
    try {
      const base =
        it.trialEndsAt != null
          ? new Date(it.trialEndsAt) > new Date()
            ? new Date(it.trialEndsAt)
            : new Date()
          : new Date();
      const end = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
      const res = await fetch(
        `/api/superadmin/marketplace/listings/${it.id}/trial`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trialEndsAt: end.toISOString() }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success(`Extended "${it.name}" trial by ${days} day${days === 1 ? '' : 's'}`);
      await fetchListings();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to extend trial: ${msg}`);
    }
  };

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (search) params.set('search', search);
      if (category !== 'all') params.set('category', category);
      if (tier !== 'all') params.set('tier', tier);
      if (countryFilter !== 'all') params.set('country', countryFilter);
      if (cityFilter !== 'all') params.set('city', cityFilter);

      const res = await fetch(`/api/superadmin/marketplace/listings?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { items: Listing[]; total: number; page: number; limit: number };
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to load listings: ${msg}`);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, tier, countryFilter, cityFilter]);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  // Reset selection when page/filter changes
  useEffect(() => {
    setSelected(new Set());
  }, [page, search, category, tier, countryFilter, cityFilter]);

  // When country changes, reset city filter (the old city may not exist
  // in the new country's city list)
  useEffect(() => {
    setCityFilter('all');
  }, [countryFilter]);

  // Cities for the cascading dropdown: if a country is selected and has
  // a city catalogue, show those cities. Otherwise, show whatever cities
  // exist in the current page of data (fallback for countries without a
  // full catalogue).
  const availableCities = useMemo(() => {
    if (countryFilter !== 'all') {
      const catalogueCities = getCitiesForCountry(countryFilter);
      if (catalogueCities.length > 0) {
        return catalogueCities.map((c) => c.city);
      }
    }
    // Fallback: cities from the current page of data
    const set = new Set<string>();
    items.forEach((it) => { if (it.city) set.add(it.city); });
    return Array.from(set).sort();
  }, [countryFilter, items]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allOnPageSelected = items.length > 0 && items.every((it) => selected.has(it.id));

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        items.forEach((it) => next.delete(it.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        items.forEach((it) => next.add(it.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openBulkEdit = () => {
    setEditFields(EMPTY_BULK_EDIT);
    setEditOpen(true);
  };

  const openBulkDelete = () => {
    setDeleteMode('soft');
    setDeleteConfirm('');
    setDeleteOpen(true);
  };

  const submitBulkEdit = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    const fields: Record<string, unknown> = {};
    if (editFields.industry) fields.industry = editFields.industry;
    if (!editFields.noChangeCity && editFields.city.trim()) fields.city = editFields.city.trim();
    if (!editFields.noChangeRating && editFields.rating !== '') {
      const r = Number(editFields.rating);
      if (Number.isNaN(r) || r < 0 || r > 5) {
        toast.error('Rating must be between 0 and 5');
        return;
      }
      fields.rating = r;
    }
    if (editFields.publicProfile === 'enable') fields.publicProfileEnabled = true;
    if (editFields.publicProfile === 'disable') fields.publicProfileEnabled = false;
    if (!editFields.noChangeDescription && editFields.description.trim()) {
      fields.description = editFields.description.trim();
      fields.descriptionMode = editFields.descriptionMode;
    }

    if (Object.keys(fields).length === 0) {
      toast.error('No fields selected — toggle at least one "change" control');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/marketplace/listings/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, fields }),
      });
      const data = (await res.json()) as { success: boolean; updated: number; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      toast.success(`Updated ${data.updated} listing${data.updated === 1 ? '' : 's'}`);
      setEditOpen(false);
      await fetchListings();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Bulk edit failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const submitBulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (deleteMode === 'hard' && deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm hard delete');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/marketplace/listings/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, mode: deleteMode }),
      });
      const data = (await res.json()) as { success: boolean; deleted: number; mode: string; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (data.deleted === 0) {
        toast.warning('0 listings deleted', {
          description:
            deleteMode === 'hard'
              ? 'No rows were removed. Child records may still be blocking deletion — try soft delete first, then hard delete.'
              : 'No rows were updated. The selected listings may have already been soft-deleted.',
        });
      } else {
        const verb = deleteMode === 'hard' ? 'permanently deleted' : 'soft-deleted';
        toast.success(`${data.deleted} listing${data.deleted === 1 ? '' : 's'} ${verb}`);
      }
      setDeleteOpen(false);
      setSelected(new Set());
      await fetchListings();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Bulk delete failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="ml-search" className="text-xs text-muted-foreground flex items-center gap-1">
                <Search className="size-3" /> Search
              </Label>
              <Input
                id="ml-search"
                placeholder="Name, phone, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {INDUSTRY_CATALOG.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.emoji} {ind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tier</Label>
              <Select value={tier} onValueChange={(v) => { setTier(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tiers</SelectItem>
                  {TIERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Select
                value={countryFilter}
                onValueChange={(v) => { setCountryFilter(v); setPage(1); }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All countries</SelectItem>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Select
                value={cityFilter}
                onValueChange={(v) => { setCityFilter(v); setPage(1); }}
                disabled={countryFilter === 'all' && availableCities.length === 0}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All cities</SelectItem>
                  {availableCities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => void fetchListings()} disabled={loading}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-md border border-primary/30 bg-primary/5">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={openBulkEdit}>
            <Edit3 className="size-3.5 mr-1.5" />
            Bulk Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={openBulkDelete}>
            <Trash2 className="size-3.5 mr-1.5" />
            Bulk Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="card-shadow">
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all on page"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Claimed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                      <Loader2 className="size-5 animate-spin inline mr-2" />
                      Loading listings...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                      No listings match the current filters.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && items.map((it) => (
                  <TableRow key={it.id} data-state={selected.has(it.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(it.id)}
                        onCheckedChange={() => toggleOne(it.id)}
                        aria-label={`Select ${it.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        <Store className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{it.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{industryLabel(it.industry)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-3" />
                        {it.city || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.phone || '—'}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Star className="size-3 text-amber-500" />
                        {it.rating.toFixed(1)}
                        <span className="text-muted-foreground">({it.reviewCount})</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] capitalize', tierBadgeClasses(it.listingTier))}>
                        {it.listingTier}
                      </Badge>
                    </TableCell>
                    {/* Featured toggle column */}
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleFeatured(it)}
                        disabled={featuredBusy === it.id}
                        title={
                          it.isFeatured
                            ? 'Remove from featured'
                            : it.isEligibleForFeatured
                              ? 'Add to featured'
                              : 'Not eligible (seed data or expired trial)'
                        }
                        aria-label={
                          it.isFeatured
                            ? `Remove ${it.name} from featured`
                            : `Feature ${it.name}`
                        }
                        className={cn(
                          'inline-flex size-7 items-center justify-center rounded-md transition-all',
                          it.isFeatured
                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-900/60'
                            : it.isEligibleForFeatured
                              ? 'text-muted-foreground hover:bg-amber-50 hover:text-amber-500 dark:hover:bg-amber-950/30'
                              : 'cursor-not-allowed text-muted-foreground/30',
                        )}
                      >
                        {featuredBusy === it.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Crown className={cn('size-3.5', it.isFeatured && 'fill-amber-400')} />
                        )}
                      </button>
                    </TableCell>
                    {/* Trial badge column */}
                    <TableCell>
                      {(() => {
                        if (!it.claimed) {
                          return <span className="text-xs text-muted-foreground">—</span>;
                        }
                        const status = it.planStatus;
                        if (status === 'active') {
                          return (
                            <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                              Active
                            </Badge>
                          );
                        }
                        if (status === 'trial' && !it.isTrialExpired) {
                          const daysLeft = it.trialEndsAt
                            ? Math.max(
                                0,
                                Math.ceil(
                                  (new Date(it.trialEndsAt).getTime() - Date.now()) /
                                    (24 * 60 * 60 * 1000),
                                ),
                              )
                            : null;
                          return (
                            <button
                              type="button"
                              onClick={() => openTrialDialog(it)}
                              title="Manage trial period"
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                            >
                              <Clock className="size-2.5" />
                              {daysLeft != null ? `${daysLeft}d left` : 'Trial'}
                            </button>
                          );
                        }
                        if (status === 'trial' && it.isTrialExpired) {
                          return (
                            <button
                              type="button"
                              onClick={() => openTrialDialog(it)}
                              title="Trial expired — click to extend"
                              className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                            >
                              <AlertTriangle className="size-2.5" />
                              Expired
                            </button>
                          );
                        }
                        if (status === 'expired') {
                          return (
                            <button
                              type="button"
                              onClick={() => openTrialDialog(it)}
                              title="Click to reactivate"
                              className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                            >
                              Expired
                            </button>
                          );
                        }
                        return (
                          <span className="text-[9px] text-muted-foreground capitalize">
                            {status ?? '—'}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {it.claimed ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          Claimed
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => {
                          setSelected(new Set([it.id]));
                          openBulkEdit();
                        }}
                      >
                        <Edit3 className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Showing {items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {(page - 1) * PAGE_SIZE + items.length} of {total}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Bulk Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk edit {selected.size} listing{selected.size === 1 ? '' : 's'}</DialogTitle>
            <DialogDescription>
              Only the fields you change will be updated. Leave the &quot;No change&quot;
              controls checked to keep the existing value per row.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Category</Label>
              <Select
                value={editFields.industry || '__no_change__'}
                onValueChange={(v) => setEditFields((f) => ({ ...f, industry: v === '__no_change__' ? '' : v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__no_change__">No change</SelectItem>
                  {INDUSTRY_CATALOG.map((ind) => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.emoji} {ind.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">City</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={editFields.noChangeCity}
                    onCheckedChange={(c) => setEditFields((f) => ({ ...f, noChangeCity: c === true }))}
                  />
                  No change
                </label>
              </div>
              <Input
                placeholder="e.g. Sydney"
                value={editFields.city}
                onChange={(e) => setEditFields((f) => ({ ...f, city: e.target.value, noChangeCity: false }))}
                disabled={editFields.noChangeCity}
              />
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Rating (0–5)</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={editFields.noChangeRating}
                    onCheckedChange={(c) => setEditFields((f) => ({ ...f, noChangeRating: c === true }))}
                  />
                  No change
                </label>
              </div>
              <Input
                type="number"
                min={0}
                max={5}
                step={0.1}
                placeholder="4.5"
                value={editFields.rating}
                onChange={(e) => setEditFields((f) => ({ ...f, rating: e.target.value, noChangeRating: false }))}
                disabled={editFields.noChangeRating}
              />
            </div>

            {/* Public Profile */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Public Profile</Label>
              <Select
                value={editFields.publicProfile}
                onValueChange={(v) => setEditFields((f) => ({ ...f, publicProfile: v as BulkEditFields['publicProfile'] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">No change</SelectItem>
                  <SelectItem value="enable">Enable (public)</SelectItem>
                  <SelectItem value="disable">Disable (hidden)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Description</Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={editFields.noChangeDescription}
                    onCheckedChange={(c) => setEditFields((f) => ({ ...f, noChangeDescription: c === true }))}
                  />
                  No change
                </label>
              </div>
              {!editFields.noChangeDescription && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Mode:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="desc-mode"
                      checked={editFields.descriptionMode === 'replace'}
                      onChange={() => setEditFields((f) => ({ ...f, descriptionMode: 'replace' }))}
                      className="size-3"
                    />
                    Replace
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="desc-mode"
                      checked={editFields.descriptionMode === 'append'}
                      onChange={() => setEditFields((f) => ({ ...f, descriptionMode: 'append' }))}
                      className="size-3"
                    />
                    Append
                  </label>
                  <span className="text-muted-foreground">
                    ({editFields.descriptionMode === 'append' ? 'adds to existing text' : 'overwrites existing text'})
                  </span>
                </div>
              )}
              <Textarea
                rows={4}
                placeholder="Description text..."
                value={editFields.description}
                onChange={(e) => setEditFields((f) => ({ ...f, description: e.target.value, noChangeDescription: false }))}
                disabled={editFields.noChangeDescription}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitBulkEdit} disabled={saving}>
              {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Edit3 className="size-4 mr-2" />}
              Apply to {selected.size} listing{selected.size === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Delete {selected.size} listing{selected.size === 1 ? '' : 's'}
            </DialogTitle>
            <DialogDescription>
              You are about to delete <strong>{selected.size}</strong> listing
              {selected.size === 1 ? '' : 's'}. This action cannot be undone for hard deletes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <RadioGroup
              value={deleteMode}
              onValueChange={(v) => setDeleteMode(v as 'soft' | 'hard')}
              className="space-y-2"
            >
              <label className={cn(
                'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                deleteMode === 'soft' ? 'border-amber-500/40 bg-amber-500/5' : 'border-border',
              )}>
                <RadioGroupItem value="soft" className="mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Soft delete</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sets <code className="text-[10px] px-1 py-0.5 rounded bg-muted">tier=none</code> and
                    disables marketplace opt-in. The tenant record is preserved.
                  </p>
                </div>
              </label>
              <label className={cn(
                'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                deleteMode === 'hard' ? 'border-red-500/40 bg-red-500/5' : 'border-border',
              )}>
                <RadioGroupItem value="hard" className="mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Hard delete (permanent)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently removes the tenant rows from the database. This cannot be undone.
                  </p>
                </div>
              </label>
            </RadioGroup>

            {deleteMode === 'hard' && (
              <div className="space-y-1.5">
                <Label htmlFor="del-confirm" className="text-xs text-muted-foreground">
                  Type <strong className="text-foreground">DELETE</strong> to confirm
                </Label>
                <Input
                  id="del-confirm"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant={deleteMode === 'hard' ? 'destructive' : 'default'}
              className={deleteMode === 'soft' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
              onClick={submitBulkDelete}
              disabled={saving || (deleteMode === 'hard' && deleteConfirm !== 'DELETE')}
            >
              {saving ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="size-4 mr-2" />
              )}
              {deleteMode === 'hard' ? 'Permanently delete' : 'Soft delete'} {selected.size}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trial Management Dialog */}
      <Dialog open={trialDialog !== null} onOpenChange={(o) => !o && setTrialDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-4 text-emerald-600" />
              Manage trial period
            </DialogTitle>
            <DialogDescription>
              {trialDialog?.name
                ? `Set the trial end date for "${trialDialog.name}". When the trial expires, the provider's marketplace card will downgrade to a minimal listing (no booking / quote / services).`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {trialDialog ? (
            <div className="space-y-4">
              {/* Current status */}
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current plan</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {trialDialog.plan ?? 'starter'}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Current status</span>
                  <span className="text-xs font-medium capitalize">
                    {trialDialog.planStatus ?? '—'}
                  </span>
                </div>
                {trialDialog.trialEndsAt ? (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-muted-foreground">Trial ends</span>
                    <span className="text-xs font-medium">
                      {new Date(trialDialog.trialEndsAt).toLocaleString()}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Quick-extend buttons */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Quick extend
                </Label>
                <div className="flex gap-2">
                  {[7, 14, 30].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={trialSaving}
                      onClick={() => {
                        void quickExtendTrial(trialDialog, d);
                      }}
                    >
                      +{d} days
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom date picker */}
              <div>
                <Label htmlFor="trial-date" className="text-xs text-muted-foreground mb-2 block">
                  Or set a custom end date
                </Label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="trial-date"
                    type="date"
                    value={trialDate}
                    onChange={(e) => setTrialDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <DialogFooter className="flex-row gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={trialSaving}
                  onClick={() => void endTrialNow()}
                >
                  <X className="size-3.5 mr-1" />
                  End trial now
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={trialSaving}
                    onClick={() => setTrialDialog(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={trialSaving || !trialDate}
                    onClick={() => void saveTrial()}
                  >
                    {trialSaving ? (
                      <Loader2 className="size-3.5 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Section ────────────────────────────────────────────────────────────────

export function DirectoryListingsSection() {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Directory Listings"
        description="Seed and manage public marketplace business listings across cities."
        icon={Store}
      />
      <Tabs defaultValue="seed">
        <TabsList>
          <TabsTrigger value="seed" className="gap-1.5">
            <Database className="size-3.5" />
            Seed
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-1.5">
            <Filter className="size-3.5" />
            Manage Listings
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-1.5">
            <ShieldCheck className="size-3.5" />
            Claims
          </TabsTrigger>
        </TabsList>
        <TabsContent value="seed" className="mt-4">
          <SeedTab />
        </TabsContent>
        <TabsContent value="manage" className="mt-4">
          <ManageTab />
        </TabsContent>
        <TabsContent value="claims" className="mt-4">
          <ClaimReview />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DirectoryListingsSection;
