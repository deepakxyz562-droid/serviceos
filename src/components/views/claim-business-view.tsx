'use client';

/**
 * ClaimBusinessView
 * -------------------
 * CRM view that lets a signed-in user find and claim their business on the
 * Fieseros Marketplace. This solves the problem where the claim flow was
 * only accessible from the public marketplace detail page — now users can
 * search for their business, start a claim, and track claim status without
 * leaving the CRM.
 *
 * Two sections:
 *
 * 1. Search — search the marketplace by business name + city. Results show
 *    unclaimed businesses with a "Claim" button that opens the
 *    ClaimBusinessModal (Google verification + document upload).
 *
 * 2. My Claims — lists all claim requests submitted by the current user,
 *    with status badges (pending / auto_approved / approved / rejected /
 *    completed) and links to the business detail page.
 *
 * API:
 *   - Search: GET /api/marketplace/providers?search=...&city=...&claimedFilter=unclaimed
 *   - Claims: GET /api/marketplace/claim/my-claims
 *   - Submit: POST /api/marketplace/claim/request (handled by ClaimBusinessModal)
 */

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  Store,
  ShieldCheck,
  Loader2,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { ClaimBusinessModal } from '@/components/marketplace/claim-business-modal';
import { useAppStore } from '@/store/app-store';

// ── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string;
  name: string;
  slug: string | null;
  publicSlug: string | null;
  tagline: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email?: string | null;
  claimed: boolean;
  cardType: string;
}

interface MyClaim {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantCity: string | null;
  tenantState: string | null;
  tenantCountry: string | null;
  tenantIndustry: string | null;
  tenantSlug: string | null;
  tenantPublicSlug: string | null;
  tenantClaimed: boolean;
  claimantEmail: string | null;
  verificationMethod: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
}

// ── Main component ──────────────────────────────────────────────────────────

export function ClaimBusinessView() {
  const auth = useAppStore((s) => s.auth);
  const currentTenantId = (auth?.tenant as { id?: string } | null)?.id ?? null;

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchCity, setSearchCity] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);

  // Claims state
  const [claims, setClaims] = React.useState<MyClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = React.useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedBusiness, setSelectedBusiness] = React.useState<SearchResult | null>(null);

  // ── Load my claims on mount ──────────────────────────────────────────────
  const loadClaims = React.useCallback(async () => {
    setClaimsLoading(true);
    try {
      const res = await authFetch('/api/marketplace/claim/my-claims?XTransformPort=3000');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load claims');
      setClaims(data.claims || []);
    } catch {
      // Silent fail — the search section still works
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // ── Search handler ───────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() && !searchCity.trim()) {
      toast.error('Enter a business name or city to search');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({
        XTransformPort: '3000',
        limit: '20',
        claimedFilter: 'unclaimed',
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (searchCity.trim()) params.set('city', searchCity.trim());

      const res = await fetch(`/api/marketplace/providers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      // Filter out the user's own business + already-claimed businesses
      const filtered = (data.items || []).filter(
        (item: SearchResult) => item.id !== currentTenantId && !item.claimed,
      );
      setResults(filtered);
    } catch {
      toast.error('Search failed — please try again');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  // ── Open claim modal ─────────────────────────────────────────────────────
  function handleClaimClick(business: SearchResult) {
    setSelectedBusiness(business);
    setModalOpen(true);
  }

  // ── Handle modal close (refresh claims if a claim was submitted) ─────────
  function handleModalClose(open: boolean) {
    setModalOpen(open);
    if (!open) {
      // Refresh claims list after a short delay (modal submit is async)
      setTimeout(() => loadClaims(), 500);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Store className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Claim Your Business</h1>
          <p className="text-sm text-muted-foreground">
            Find your business on the Fieseros Marketplace and claim it to manage your profile.
          </p>
        </div>
      </div>

      {/* ── Info banner ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">
            How claiming works
          </p>
          <p className="mt-1 text-emerald-800 dark:text-emerald-200">
            Search for your business below, then verify your ownership with a Google Business Profile
            link (instant approval if it matches) or by uploading a business document (1-2 day review).
            Once approved, you&apos;ll manage your listing, respond to reviews, and receive customer leads.
          </p>
        </div>
      </div>

      {/* ── Search section ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-emerald-600" />
            Find your business
          </CardTitle>
          <CardDescription>
            Search by business name and/or city. Only unclaimed businesses are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="search-query" className="text-xs">Business name</Label>
                <Input
                  id="search-query"
                  placeholder="e.g. ABC Plumbing"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={searching}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="search-city" className="text-xs">City (optional)</Label>
                <Input
                  id="search-city"
                  placeholder="e.g. New York"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  disabled={searching}
                />
              </div>
            </div>
            <Button type="submit" disabled={searching} className="w-full sm:w-auto">
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" /> Search
                </>
              )}
            </Button>
          </form>

          {/* Search results */}
          {hasSearched && (
            <div className="mt-6 space-y-3">
              {results.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">No unclaimed businesses found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different name or city. If your business isn&apos;t listed yet,
                    you can add it from the marketplace.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {results.length} unclaimed {results.length === 1 ? 'business' : 'businesses'} found
                  </p>
                  {results.map((business) => (
                    <div
                      key={business.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{business.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {business.industry && (
                            <span className="capitalize">{business.industry.replace(/-/g, ' ')}</span>
                          )}
                          {business.city && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {business.city}{business.state ? `, ${business.state}` : ''}
                            </span>
                          )}
                          {business.tagline && (
                            <span className="truncate max-w-xs">{business.tagline}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleClaimClick(business)}
                        className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                        Claim
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── My Claims section ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                My Claims
              </CardTitle>
              <CardDescription>Track the status of your claim requests</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadClaims}
              disabled={claimsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${claimsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {claimsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          ) : claims.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Store className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">No claims yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Search for your business above and submit a claim to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => (
                <ClaimRow key={claim.id} claim={claim} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Claim modal ────────────────────────────────────────────────────── */}
      {selectedBusiness && (
        <ClaimBusinessModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          tenantId={selectedBusiness.id}
          tenantName={selectedBusiness.name}
          tenantEmail={selectedBusiness.email}
          tenantCity={selectedBusiness.city}
          tenantState={selectedBusiness.state}
        />
      )}
    </div>
  );
}

// ── Claim status row ────────────────────────────────────────────────────────

function ClaimRow({ claim }: { claim: MyClaim }) {
  const statusConfig = getStatusConfig(claim.status);
  const Icon = statusConfig.icon;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{claim.tenantName}</p>
          <Badge variant="outline" className={`shrink-0 ${statusConfig.badgeClass}`}>
            <Icon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {claim.tenantIndustry && (
            <span className="capitalize">{claim.tenantIndustry.replace(/-/g, ' ')}</span>
          )}
          {claim.tenantCity && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {claim.tenantCity}{claim.tenantState ? `, ${claim.tenantState}` : ''}
            </span>
          )}
          <span>
            Submitted {new Date(claim.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {claim.verificationMethod === 'google' && (
            <span>· Google verification</span>
          )}
          {claim.verificationMethod === 'document' && (
            <span>· Document upload</span>
          )}
        </div>
        {claim.reviewNote && claim.status === 'rejected' && (
          <p className="mt-2 text-xs text-destructive">
            Reason: {claim.reviewNote}
          </p>
        )}
        {claim.status === 'auto_approved' && !claim.completedAt && (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            Check your email ({claim.claimantEmail}) for a link to complete your account.
          </p>
        )}
        {claim.status === 'completed' && (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            ✓ Business claimed successfully. Manage it from &ldquo;My Listing&rdquo;.
          </p>
        )}
      </div>
      {/* Link to the public business detail page */}
      {claim.tenantPublicSlug && (
        <Link
          href={`/${claim.tenantIndustry || 'business'}/${claim.tenantCity || 'all'}/${claim.tenantPublicSlug}`}
          target="_blank"
          className="shrink-0 rounded-md border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="View listing"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

// ── Status config helper ────────────────────────────────────────────────────

function getStatusConfig(status: string): {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
} {
  switch (status) {
    case 'pending':
      return {
        label: 'Under Review',
        icon: Clock,
        badgeClass: 'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-950/40',
      };
    case 'auto_approved':
      return {
        label: 'Approved',
        icon: CheckCircle2,
        badgeClass: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40',
      };
    case 'approved':
      return {
        label: 'Approved',
        icon: CheckCircle2,
        badgeClass: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40',
      };
    case 'completed':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        badgeClass: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        icon: XCircle,
        badgeClass: 'border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-950/40',
      };
    default:
      return {
        label: status,
        icon: AlertCircle,
        badgeClass: 'border-border text-muted-foreground',
      };
  }
}
