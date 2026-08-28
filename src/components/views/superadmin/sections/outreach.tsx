'use client';

// ─────────────────────────────────────────────────────────────────────────────
// OutreachSection — Superadmin Outreach management page (Task 5-a redesign).
//
// 5 tabs:
//   1. Overview     — KPI cards + daily-limit Settings card.
//   2. Compose      — split-pane: tenant list (left, checkboxes) + email
//                     preview (right). Multi-tenant bulk send via /send-bulk.
//   3. Sent         — tenant selector + per-tenant email history table
//                     (read-only; sending happens in Compose).
//   4. Suppressions — table of active suppressions + "Show resolved" toggle +
//                     "Manually suppress" dialog.
//   5. Settings     — daily limit editor (Input + Save).
//
// All API calls go through `authFetch` from `@/lib/client-auth` with the
// `?XTransformPort=3000` gateway suffix. Toasts via `sonner`.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Mail, Send, Loader2, CheckCircle2, ShieldAlert, Ban,
  RefreshCw, History, Settings as SettingsIcon, Plus,
  AlertTriangle, Clock, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { authFetch } from '@/lib/client-auth';
import {
  SectionHeader, KpiCard, EmptyState, TableSkeleton,
  formatDate, formatDateTime, timeAgo, formatNumber,
} from '@/components/views/superadmin/_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OutreachStats {
  dailyLimit: number;
  sentToday: number;
  remaining: number;
  lastSentAt: string | null;
  cooldownUntil: string | null;
  isSuppressed: boolean;
  suppressionReason: string | null;
  outreachDisabled: boolean;
}

interface CommunicationRow {
  id: string;
  tenantId: string;
  recipientEmail: string;
  recipientName: string | null;
  templateId: string | null;
  subject: string;
  status: string;
  providerMessageId: string | null;
  sentByUserId: string;
  sentByName: string | null;
  sentByEmail: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  bouncedAt: string | null;
  bouncedReason: string | null;
  complainedAt: string | null;
  createdAt: string;
}

interface SuppressionRow {
  id: string;
  email: string;
  tenantId: string | null;
  tenantName: string | null;
  reason: string;
  source: string;
  provider: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolveReason: string | null;
}

interface TenantOption {
  id: string;
  name: string;
  email: string;
  claimed: boolean;
}

// ─── ComposeTab types ────────────────────────────────────────────────────────

interface Eligibility {
  selectable: boolean;
  reason: 'no_email' | 'cooldown_active' | 'email_suppressed' | 'outreach_disabled' | null;
  cooldownUntil: string | null;
  lastSentAt: string | null;
}

interface EligibleTenant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  industry: string | null;
  city: string | null;
  claimed: boolean;
  outreachDisabled: boolean;
  lastSentAt: string | null;
  eligibility: Eligibility;
}

interface Quota {
  dailyLimit: number;
  sentToday: number;
  remaining: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  category: string;
  tagsJson: string;
}

interface SendBulkResultItem {
  tenantId: string;
  tenantName: string;
  status: 'sent' | 'skipped' | 'failed';
  reason?: string | null;
  communicationId?: string | null;
  providerMessageId?: string | null;
}

interface SendBulkResponse {
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
  results: SendBulkResultItem[];
  stats: OutreachStats;
}

// ─── Status badge styling for EmailCommunication.status ──────────────────────

function getStatusBadge(status: string): { className: string; label: string } {
  const map: Record<string, { className: string; label: string }> = {
    queued: { className: 'bg-muted text-muted-foreground border-border', label: 'Queued' },
    sent: { className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Sent' },
    delivered: { className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'Delivered' },
    bounced: { className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', label: 'Bounced' },
    complained: { className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'Complained' },
    failed: { className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', label: 'Failed' },
  };
  return map[status?.toLowerCase()] ?? { className: 'bg-muted text-muted-foreground border-border', label: status || 'Unknown' };
}

function getSuppressionReasonBadge(reason: string): { className: string; label: string } {
  const map: Record<string, { className: string; label: string }> = {
    hard_bounce: { className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', label: 'Hard Bounce' },
    complaint: { className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'Complaint' },
    manual: { className: 'bg-muted text-muted-foreground border-border', label: 'Manual' },
  };
  return map[reason?.toLowerCase()] ?? { className: 'bg-muted text-muted-foreground border-border', label: reason || 'Unknown' };
}

// ─── Section component ───────────────────────────────────────────────────────

export function OutreachSection() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="Outreach"
        description="One-to-one personalized business outreach emails — daily limits, 72h cooldown, per-email suppression, claim-token tracking."
        icon={Send}
      />
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1.5"><Mail className="size-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="compose" className="gap-1.5"><Send className="size-3.5" /> Compose</TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5"><History className="size-3.5" /> Sent</TabsTrigger>
          <TabsTrigger value="suppressions" className="gap-1.5"><ShieldAlert className="size-3.5" /> Suppressions</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><SettingsIcon className="size-3.5" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="compose" className="mt-4">
          <ComposeTab />
        </TabsContent>
        <TabsContent value="sent" className="mt-4">
          <SentTab />
        </TabsContent>
        <TabsContent value="suppressions" className="mt-4">
          <SuppressionsTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </section>
  );
}

// ─── Tab 1: Overview ─────────────────────────────────────────────────────────

function OverviewTab() {
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [activeSuppressions, setActiveSuppressions] = useState<number | null>(null);
  const [resolvedSuppressions, setResolvedSuppressions] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(() => {
    Promise.all([
      authFetch('/api/superadmin/outreach/settings?XTransformPort=3000')
        .then((r) => r.ok ? r.json() : Promise.reject(r))
        .then((d: { dailyLimit: number }) => d.dailyLimit)
        .catch(() => null),
      authFetch('/api/superadmin/outreach/suppressions?resolved=false&page=1&limit=1&XTransformPort=3000')
        .then((r) => r.ok ? r.json() : Promise.reject(r))
        .then((d: { total: number }) => d.total)
        .catch(() => null),
      authFetch('/api/superadmin/outreach/suppressions?resolved=true&page=1&limit=1&XTransformPort=3000')
        .then((r) => r.ok ? r.json() : Promise.reject(r))
        .then((d: { total: number }) => d.total)
        .catch(() => null),
    ]).then(([limit, active, resolved]) => {
      setDailyLimit(limit);
      setActiveSuppressions(active);
      setResolvedSuppressions(resolved);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Daily limit"
          value={loading ? '…' : dailyLimit !== null ? formatNumber(dailyLimit) : '—'}
          icon={Mail}
          color="emerald"
          sub="Platform-wide cap on sent emails"
        />
        <KpiCard
          label="Active suppressions"
          value={loading ? '…' : activeSuppressions !== null ? formatNumber(activeSuppressions) : '—'}
          icon={ShieldAlert}
          color="red"
          sub="Hard bounces + complaints + manual"
        />
        <KpiCard
          label="Resolved suppressions"
          value={loading ? '…' : resolvedSuppressions !== null ? formatNumber(resolvedSuppressions) : '—'}
          icon={CheckCircle2}
          color="teal"
          sub="Manually unsuppressed by superadmins"
        />
        <KpiCard
          label="Cooldown"
          value="72h"
          icon={Clock}
          color="amber"
          sub="Per-tenant minimum gap between sends"
        />
      </div>

      <SettingsCard />
    </div>
  );
}

// ─── Tab 2: Compose (split-pane) ─────────────────────────────────────────────

function ComposeTab() {
  // ── State ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [tenants, setTenants] = useState<EligibleTenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<Quota>({ dailyLimit: 20, sentToday: 0, remaining: 20 });
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [focusedTenantId, setFocusedTenantId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customLine, setCustomLine] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultsDialog, setResultsDialog] = useState<{
    open: boolean;
    results: SendBulkResultItem[];
    summary: { sent: number; skipped: number; failed: number };
  }>({ open: false, results: [], summary: { sent: 0, skipped: 0, failed: 0 } });

  const LIMIT = 50;

  // ── Debounce search input ──────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch eligible tenants ─────────────────────────────────────────────
  const fetchTenants = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ XTransformPort: '3000' });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (filter) params.set('filter', filter);
    params.set('page', String(page));
    params.set('limit', String(LIMIT));
    authFetch(`/api/superadmin/outreach/eligible-tenants?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: {
        tenants: EligibleTenant[];
        total: number;
        dailyLimit: number;
        sentToday: number;
        remaining: number;
      }) => {
        setTenants(d.tenants || []);
        setTotal(d.total || 0);
        setQuota({
          dailyLimit: d.dailyLimit,
          sentToday: d.sentToday,
          remaining: d.remaining,
        });
      })
      .catch(() => toast.error('Failed to load tenants'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, filter, page]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // ── Fetch templates on mount ───────────────────────────────────────────
  // The `/api/email-templates` route's category allow-list doesn't include
  // 'outreach', so we fetch all global templates and filter client-side by
  // `category === 'outreach'`.
  useEffect(() => {
    authFetch('/api/email-templates?XTransformPort=3000')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((rows: EmailTemplate[]) => {
        const outreach = (rows || []).filter((t) => t.category === 'outreach');
        setTemplates(outreach);
        if (outreach.length > 0) setSelectedTemplateId(outreach[0].id);
      })
      .catch(() => toast.error('Failed to load email templates'));
  }, []);

  // ── Derived: focused tenant + filtered templates ───────────────────────
  const focusedTenant = useMemo<EligibleTenant | null>(() => {
    if (focusedTenantId) {
      return tenants.find((t) => t.id === focusedTenantId) ?? null;
    }
    // Fallback: first checked tenant, or first tenant in the list.
    if (checkedIds.size > 0) {
      const firstChecked = tenants.find((t) => checkedIds.has(t.id));
      if (firstChecked) return firstChecked;
    }
    return tenants[0] ?? null;
  }, [focusedTenantId, checkedIds, tenants]);

  const visibleTemplates = useMemo(() => {
    // Hide "claim" sub-category templates when the focused tenant is claimed.
    if (!focusedTenant || !focusedTenant.claimed) return templates;
    return templates.filter((t) => extractSubCategory(t.tagsJson) !== 'claim');
  }, [templates, focusedTenant]);

  // If the currently selected template is filtered out (because focused
  // tenant is claimed), pick the first available.
  useEffect(() => {
    if (visibleTemplates.length === 0) return;
    const stillVisible = visibleTemplates.some((t) => t.id === selectedTemplateId);
    if (!stillVisible) setSelectedTemplateId(visibleTemplates[0].id);
  }, [visibleTemplates, selectedTemplateId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  // Sorted array of checked tenants (in the same order they appear in the list).
  const checkedTenantList = useMemo(
    () => tenants.filter((t) => checkedIds.has(t.id) && t.eligibility.selectable),
    [tenants, checkedIds],
  );

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleToggleCheck = (tenantId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tenantId)) {
        next.delete(tenantId);
      } else {
        // Enforce daily-limit cap on selection.
        if (next.size >= quota.remaining) {
          toast.error(`You can only select up to ${quota.remaining} tenants (daily limit)`);
          return prev; // prevent toggle
        }
        next.add(tenantId);
      }
      return next;
    });
  };

  // Clicking a selectable row both sets focus AND toggles its checkbox.
  // Non-selectable rows do NOT change focus (only selectable rows can be
  // focused for preview).
  const handleRowClick = (tenant: EligibleTenant) => {
    if (!tenant.eligibility.selectable) return;
    setFocusedTenantId(tenant.id);
    handleToggleCheck(tenant.id);
  };

  // The checkbox itself is a separate click target — stop the row click from
  // also toggling (which would double-toggle and cancel out).
  const handleCheckboxClick = (e: React.MouseEvent, tenant: EligibleTenant) => {
    e.stopPropagation();
    if (!tenant.eligibility.selectable) return;
    setFocusedTenantId(tenant.id);
    handleToggleCheck(tenant.id);
  };

  const handlePrevSelected = () => {
    if (checkedTenantList.length < 2) return;
    const currentIdx = focusedTenant
      ? checkedTenantList.findIndex((t) => t.id === focusedTenant.id)
      : -1;
    const newIdx = currentIdx <= 0
      ? checkedTenantList.length - 1
      : currentIdx - 1;
    setFocusedTenantId(checkedTenantList[newIdx].id);
  };

  const handleNextSelected = () => {
    if (checkedTenantList.length < 2) return;
    const currentIdx = focusedTenant
      ? checkedTenantList.findIndex((t) => t.id === focusedTenant.id)
      : -1;
    const newIdx = currentIdx === -1 || currentIdx >= checkedTenantList.length - 1
      ? 0
      : currentIdx + 1;
    setFocusedTenantId(checkedTenantList[newIdx].id);
  };

  const handleSendClick = () => {
    if (checkedIds.size === 0 || !selectedTemplateId) return;
    setConfirmOpen(true);
  };

  const handleSendConfirm = async () => {
    setConfirmOpen(false);
    if (checkedIds.size === 0 || !selectedTemplateId) return;
    setSending(true);
    try {
      const body: Record<string, unknown> = {
        tenantIds: Array.from(checkedIds),
        templateId: selectedTemplateId,
      };
      if (customLine.trim()) {
        body.customVariables = { customLine: customLine.trim() };
      }
      const res = await authFetch('/api/superadmin/outreach/send-bulk?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: SendBulkResponse | null = await res.json().catch(() => null);
      if (!res.ok || !data) {
        toast.error('Failed to send outreach emails');
        return;
      }
      // Success toast (only if at least one email went out).
      if (data.sent > 0) {
        toast.success(`Sent ${data.sent} email(s)`, {
          description: data.skipped + data.failed > 0
            ? `${data.skipped} skipped, ${data.failed} failed`
            : 'All sends accepted by the provider',
        });
      } else {
        toast.error('No emails were sent', {
          description: `${data.skipped} skipped, ${data.failed} failed`,
        });
      }
      // Details dialog if any skipped or failed.
      if (data.skipped > 0 || data.failed > 0) {
        setResultsDialog({
          open: true,
          results: data.results || [],
          summary: { sent: data.sent, skipped: data.skipped, failed: data.failed },
        });
      }
      // Update quota from response.stats (so the bar reflects new state).
      if (data.stats) {
        setQuota({
          dailyLimit: data.stats.dailyLimit,
          sentToday: data.stats.sentToday,
          remaining: data.stats.remaining,
        });
      }
      // Clear selection + custom line.
      setCheckedIds(new Set());
      setCustomLine('');
      // Re-fetch the list so sent tenants show greyed-out with cooldown.
      fetchTenants();
    } catch {
      toast.error('Network error — could not reach the server');
    } finally {
      setSending(false);
    }
  };

  // ── Derived: rendered preview ──────────────────────────────────────────
  const renderedSubject = useMemo(() => {
    if (!selectedTemplate || !focusedTenant) return '';
    return previewRenderText(selectedTemplate.subject, focusedTenant, customLine);
  }, [selectedTemplate, focusedTenant, customLine]);

  const renderedHtml = useMemo(() => {
    if (!selectedTemplate || !focusedTenant) return '';
    return previewRenderText(selectedTemplate.htmlBody, focusedTenant, customLine);
  }, [selectedTemplate, focusedTenant, customLine]);

  const hasMore = tenants.length < total;
  const quotaPct = quota.dailyLimit > 0
    ? Math.min(100, (quota.sentToday / quota.dailyLimit) * 100)
    : 0;

  // Index of focused tenant within the checked list (for the "X / Y selected" counter).
  const focusedCheckedIdx = focusedTenant
    ? checkedTenantList.findIndex((t) => t.id === focusedTenant.id)
    : -1;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* ── Toolbar: search + filter + refresh + quota ────────────────── */}
      <Card className="card-shadow">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by name, email, or slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={filter}
              onValueChange={(v) => { setFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tenants</SelectItem>
                <SelectItem value="unclaimed">Unclaimed</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="no_email">No email</SelectItem>
                <SelectItem value="opted_out">Opted out</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchTenants}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            </Button>
          </div>
          {/* Quota bar */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  quotaPct >= 100
                    ? 'bg-red-500'
                    : quotaPct >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500',
                )}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            <span className="text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">{quota.sentToday}</span>
              {' / '}
              {quota.dailyLimit} used
              {' · '}
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {quota.remaining} remaining
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Split-pane: tenants list (left) + preview (right) ──────────── */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* LEFT PANE — tenant list */}
        <Card className="card-shadow md:w-2/5 md:flex-shrink-0 flex flex-col">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Tenants to email</span>
              <span className="text-xs text-muted-foreground font-normal">
                {total} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {loading && tenants.length === 0 ? (
              <div className="p-4"><TableSkeleton rows={6} /></div>
            ) : tenants.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No tenants match"
                subtitle="Try a different search or filter."
              />
            ) : (
              <div className="max-h-[40vh] md:max-h-[60vh] overflow-y-auto px-2 pb-2 space-y-0.5">
                {tenants.map((t) => (
                  <TenantRow
                    key={t.id}
                    tenant={t}
                    checked={checkedIds.has(t.id)}
                    focused={focusedTenant?.id === t.id}
                    onRowClick={() => handleRowClick(t)}
                    onCheckboxClick={(e) => handleCheckboxClick(e, t)}
                  />
                ))}
              </div>
            )}
          </CardContent>
          {/* Footer: selected count + load more */}
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{checkedIds.size}</span> selected
                {' '}
                <span className="text-muted-foreground/70">(max {quota.remaining})</span>
              </span>
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                >
                  Load more ↓
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* RIGHT PANE — email preview */}
        <Card className="card-shadow md:flex-1 flex flex-col">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-2">
                <Mail className="size-4" />
                Email preview
              </span>
              {focusedTenant && (
                <Badge variant="outline" className="font-normal">
                  Focused: {focusedTenant.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {!focusedTenant ? (
              <EmptyState
                icon={Mail}
                title="Select a tenant from the left to preview"
                subtitle="Click any tenant row to see a personalized preview."
              />
            ) : (
              <>
                {/* Template selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="compose-template" className="text-xs">Template</Label>
                  <Select
                    value={selectedTemplateId ?? ''}
                    onValueChange={setSelectedTemplateId}
                    disabled={templates.length === 0}
                  >
                    <SelectTrigger id="compose-template">
                      <SelectValue
                        placeholder={templates.length === 0
                          ? 'No templates available'
                          : 'Select a template'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {focusedTenant.claimed && (
                    <p className="text-[11px] text-muted-foreground">
                      &ldquo;Claim Your Business&rdquo; templates are hidden — this tenant is already claimed.
                    </p>
                  )}
                </div>

                {/* Custom opening line */}
                <div className="space-y-1.5">
                  <Label htmlFor="compose-custom-line" className="text-xs">
                    Custom opening line <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="compose-custom-line"
                    value={customLine}
                    onChange={(e) => setCustomLine(e.target.value)}
                    placeholder="e.g. Saw your recent 5-star review — congrats!"
                    rows={2}
                    disabled={sending}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Injected as <code className="font-mono">{`{{customLine}}`}</code> in the template body.
                  </p>
                </div>

                {/* Preview area */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Preview ({focusedTenant.name})
                  </p>
                  <div className="rounded-md border border-border bg-background overflow-hidden">
                    <div className="px-3 py-2 border-b border-border bg-muted/30">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Subject</p>
                      <p className="text-sm font-medium text-foreground break-words">
                        {renderedSubject || '—'}
                      </p>
                    </div>
                    <div
                      className="px-3 py-3 text-sm text-foreground max-h-[400px] overflow-y-auto [&_a]:text-primary [&_a]:underline"
                      dangerouslySetInnerHTML={{
                        __html: renderedHtml
                          || '<p class="text-muted-foreground">No template body.</p>',
                      }}
                    />
                  </div>
                </div>

                {/* Prev / Next selected buttons */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevSelected}
                    disabled={checkedTenantList.length < 2}
                    className="text-xs"
                  >
                    <ChevronLeft className="size-3.5 mr-1" /> Prev selected
                  </Button>
                  <span className="text-xs text-muted-foreground text-center">
                    {focusedCheckedIdx >= 0
                      ? `${focusedCheckedIdx + 1} / ${checkedTenantList.length} selected`
                      : `${checkedTenantList.length} selected`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextSelected}
                    disabled={checkedTenantList.length < 2}
                    className="text-xs"
                  >
                    Next selected <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>

                {/* Send button */}
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSendClick}
                  disabled={checkedIds.size === 0 || !selectedTemplateId || sending}
                >
                  {sending ? (
                    <><Loader2 className="size-4 mr-1.5 animate-spin" /> Sending…</>
                  ) : (
                    <><Send className="size-4 mr-1.5" /> Send to {checkedIds.size} selected tenant{checkedIds.size === 1 ? '' : 's'}</>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Confirm dialog ──────────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-5 text-primary" /> Confirm bulk send
            </DialogTitle>
            <DialogDescription>
              Send <span className="font-medium text-foreground">{selectedTemplate?.name ?? 'this template'}</span> to{' '}
              <span className="font-medium text-foreground">{checkedIds.size}</span> tenant{checkedIds.size === 1 ? '' : 's'}?
              Each email will be personalized with the recipient&rsquo;s business name and claim link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSendConfirm}
              disabled={sending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {sending
                ? <Loader2 className="size-4 mr-1.5 animate-spin" />
                : <Send className="size-4 mr-1.5" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Results dialog (skipped/failed details) ─────────────────────── */}
      <Dialog
        open={resultsDialog.open}
        onOpenChange={(open) => setResultsDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" /> Send results
            </DialogTitle>
            <DialogDescription>
              Sent: <span className="font-medium text-emerald-600 dark:text-emerald-400">{resultsDialog.summary.sent}</span>
              {' · '}
              Skipped: <span className="font-medium text-amber-600 dark:text-amber-400">{resultsDialog.summary.skipped}</span>
              {' · '}
              Failed: <span className="font-medium text-red-600 dark:text-red-400">{resultsDialog.summary.failed}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultsDialog.results
                  .filter((r) => r.status !== 'sent')
                  .map((r) => (
                    <TableRow key={r.tenantId}>
                      <TableCell className="font-medium text-foreground">{r.tenantName}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={r.status === 'skipped'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}
                        >
                          {r.status === 'skipped' ? 'Skipped' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.reason || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setResultsDialog((prev) => ({ ...prev, open: false }))}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ComposeTab sub-components + helpers ─────────────────────────────────────

function TenantRow({
  tenant, checked, focused, onRowClick, onCheckboxClick,
}: {
  tenant: EligibleTenant;
  checked: boolean;
  focused: boolean;
  onRowClick: () => void;
  onCheckboxClick: (e: React.MouseEvent) => void;
}) {
  const elig = tenant.eligibility;
  const isGreyed = !elig.selectable;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRowClick();
        }
      }}
      className={cn(
        'group flex items-start gap-2 rounded-md p-2 transition-colors text-left',
        isGreyed
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:bg-muted/60',
        focused && 'bg-emerald-500/10 ring-1 ring-emerald-500/30',
      )}
    >
      <div onClick={onCheckboxClick} className="pt-0.5">
        <Checkbox
          checked={checked}
          disabled={isGreyed}
          aria-label={`Select ${tenant.name}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{tenant.name}</p>
          <Badge variant="outline" className={cn(
            'text-[10px] px-1.5 py-0 h-4',
            tenant.claimed
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          )}>
            {tenant.claimed ? 'Claimed' : 'Unclaimed'}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {[tenant.industry, tenant.city].filter(Boolean).join(' · ') || '—'}
        </p>
        {isGreyed ? (
          <EligibilityReason tenant={tenant} />
        ) : elig.lastSentAt ? (
          // Eligible again (cooldown expired) but has been emailed before.
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
            ✓ Sent {formatShortDate(elig.lastSentAt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function EligibilityReason({ tenant }: { tenant: EligibleTenant }) {
  const elig = tenant.eligibility;
  if (elig.reason === 'cooldown_active') {
    return (
      <p className="text-[10px] text-muted-foreground/80 mt-0.5">
        ✓ Sent {formatShortDate(elig.lastSentAt)} · Next eligible {formatShortDate(elig.cooldownUntil)}
      </p>
    );
  }
  if (elig.reason === 'email_suppressed') {
    return (
      <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0 h-4 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
        Suppressed
      </Badge>
    );
  }
  if (elig.reason === 'no_email') {
    return (
      <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
        No email
      </Badge>
    );
  }
  if (elig.reason === 'outreach_disabled') {
    return (
      <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0 h-4 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
        Opted out
      </Badge>
    );
  }
  return null;
}

// Format ISO date as "Aug 27" (compact short date).
function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

// Extract 'claim' | 'outreach' sub-category from tagsJson.
function extractSubCategory(tagsJson: string | null | undefined): 'claim' | 'outreach' {
  if (!tagsJson) return 'outreach';
  try {
    const arr = JSON.parse(tagsJson);
    if (Array.isArray(arr)) {
      for (const tag of arr) {
        if (typeof tag === 'string') {
          if (tag === 'claim') return 'claim';
          if (tag === 'outreach') return 'outreach';
        }
      }
    }
  } catch {
    // ignore
  }
  return 'outreach';
}

// Naive variable substitution for the Preview panel. The backend does the
// real substitution on send; this is just a UI preview.
function previewRenderText(
  text: string,
  tenant: EligibleTenant,
  customLine: string,
): string {
  const marketplaceUrl = `https://fieseros.com/${tenant.slug}`;
  const claimLink = 'https://fieseros.com/claim?token=PREVIEW';
  return text
    .replace(/\{\{businessName\}\}/g, escapeHtml(tenant.name))
    .replace(/\{\{marketplaceUrl\}\}/g, marketplaceUrl)
    .replace(/\{\{claimLink\}\}/g, claimLink)
    .replace(/\{\{industry\}\}/g, escapeHtml(tenant.industry || ''))
    .replace(/\{\{city\}\}/g, escapeHtml(tenant.city || ''))
    .replace(/\{\{customLine\}\}/g, customLine ? escapeHtml(customLine) : '');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Tab 3: Sent (tenant selector + history table, no send button) ───────────

function SentTab() {
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [communications, setCommunications] = useState<CommunicationRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load tenants once on mount.
  useEffect(() => {
    let cancelled = false;
    setTenantsLoading(true);
    authFetch('/api/superadmin/tenants?XTransformPort=3000')
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: { tenants: TenantOption[] }) => {
        if (cancelled) return;
        setTenants(d.tenants || []);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load tenants');
      })
      .finally(() => { if (!cancelled) setTenantsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Load stats + history whenever the selected tenant changes.
  useEffect(() => {
    if (!selectedTenantId) {
      setStats(null);
      setCommunications([]);
      return;
    }
    let cancelled = false;
    setStatsLoading(true);
    setHistoryLoading(true);

    authFetch(`/api/superadmin/outreach/stats?tenantId=${encodeURIComponent(selectedTenantId)}&XTransformPort=3000`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: { stats: OutreachStats }) => {
        if (cancelled) return;
        setStats(d.stats);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load stats');
      })
      .finally(() => { if (!cancelled) setStatsLoading(false); });

    authFetch(`/api/superadmin/outreach/history?tenantId=${encodeURIComponent(selectedTenantId)}&page=1&limit=20&XTransformPort=3000`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: { communications: CommunicationRow[] }) => {
        if (cancelled) return;
        setCommunications(d.communications || []);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load history');
      })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });

    return () => { cancelled = true; };
  }, [selectedTenantId]);

  const refetchAll = useCallback(() => {
    if (!selectedTenantId) return;
    authFetch(`/api/superadmin/outreach/stats?tenantId=${encodeURIComponent(selectedTenantId)}&XTransformPort=3000`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: { stats: OutreachStats }) => setStats(d.stats))
      .catch(() => {});
    authFetch(`/api/superadmin/outreach/history?tenantId=${encodeURIComponent(selectedTenantId)}&page=1&limit=20&XTransformPort=3000`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: { communications: CommunicationRow[] }) => setCommunications(d.communications || []))
      .catch(() => {});
  }, [selectedTenantId]);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  return (
    <div className="space-y-4">
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select a workspace</CardTitle>
          <CardDescription>
            Pick a tenant to view its outreach send history + pre-flight stats.
            To send new emails, switch to the Compose tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={selectedTenantId}
              onValueChange={(v) => setSelectedTenantId(v)}
              disabled={tenantsLoading}
            >
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder={tenantsLoading ? 'Loading tenants…' : 'Select a tenant'} />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.claimed ? '✓' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTenant && (
              <Button
                variant="outline"
                onClick={refetchAll}
                disabled={statsLoading || historyLoading}
                title="Refresh history + stats"
              >
                <RefreshCw className={cn('size-4', (statsLoading || historyLoading) && 'animate-spin')} />
                <span className="ml-1.5">Refresh</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedTenantId ? (
        <EmptyState
          icon={History}
          title="No workspace selected"
          subtitle="Select a workspace above to view its outreach send history and pre-flight stats."
        />
      ) : (
        <>
          {/* Pre-flight stats */}
          {statsLoading ? (
            <Card className="card-shadow"><CardContent className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading pre-flight stats…
            </CardContent></Card>
          ) : stats ? (
            <Card className="card-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pre-flight stats — {selectedTenant?.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <StatTile label="Sent today" value={`${stats.sentToday} / ${stats.dailyLimit}`} ok={stats.sentToday < stats.dailyLimit} />
                  <StatTile label="Cooldown" value={stats.cooldownUntil ? `until ${formatDateTime(stats.cooldownUntil)}` : 'Not active'} ok={!stats.cooldownUntil || new Date(stats.cooldownUntil).getTime() <= Date.now()} />
                  <StatTile label="Suppressed" value={stats.isSuppressed ? (stats.suppressionReason || 'Yes') : 'No'} ok={!stats.isSuppressed} />
                  <StatTile label="Opt-out" value={stats.outreachDisabled ? 'Opted out' : 'Outreach enabled'} ok={!stats.outreachDisabled} />
                </div>
                {stats.lastSentAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Last sent {timeAgo(stats.lastSentAt)} · Remaining today: {stats.remaining}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* History table */}
          <Card className="card-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent outreach emails</CardTitle>
              <CardDescription>Newest first — paginated 20 per page.</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <TableSkeleton rows={5} />
              ) : communications.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="No outreach emails yet"
                  subtitle={`No EmailCommunication rows for ${selectedTenant?.name ?? 'this tenant'}.`}
                />
              ) : (
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent by</TableHead>
                        <TableHead>Outcome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communications.map((c) => {
                        const badge = getStatusBadge(c.status);
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateTime(c.sentAt || c.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium text-foreground max-w-xs truncate" title={c.subject}>
                              {c.subject || '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{c.recipientEmail}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {c.sentByName || c.sentByEmail || '—'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {c.deliveredAt && <span className="text-emerald-600 dark:text-emerald-400">Delivered {timeAgo(c.deliveredAt)}</span>}
                              {c.bouncedAt && <span className="text-red-600 dark:text-red-400" title={c.bouncedReason || ''}>Bounced {timeAgo(c.bouncedAt)}</span>}
                              {c.complainedAt && <span className="text-amber-600 dark:text-amber-400">Complained {timeAgo(c.complainedAt)}</span>}
                              {!c.deliveredAt && !c.bouncedAt && !c.complainedAt && (
                                <span className="text-muted-foreground">Pending</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn('text-sm font-semibold mt-1', ok ? 'text-foreground' : 'text-red-600 dark:text-red-400')}>
        {value}
      </p>
    </div>
  );
}

// ─── Tab 4: Suppressions ─────────────────────────────────────────────────────

function SuppressionsTab() {
  const [showResolved, setShowResolved] = useState(false);
  const [rows, setRows] = useState<SuppressionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unsuppressingId, setUnsuppressingId] = useState<string | null>(null);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  const fetchSuppressions = useCallback(() => {
    setLoading(true);
    const resolvedParam = showResolved ? 'true' : 'false';
    authFetch(`/api/superadmin/outreach/suppressions?resolved=${resolvedParam}&page=1&limit=50&XTransformPort=3000`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: { suppressions: SuppressionRow[] }) => setRows(d.suppressions || []))
      .catch(() => toast.error('Failed to load suppressions'))
      .finally(() => setLoading(false));
  }, [showResolved]);

  useEffect(() => {
    fetchSuppressions();
  }, [fetchSuppressions]);

  const handleUnsuppress = async (row: SuppressionRow) => {
    setUnsuppressingId(row.id);
    try {
      const params = new URLSearchParams({ email: row.email, XTransformPort: '3000' });
      if (row.tenantId) params.set('tenantId', row.tenantId);
      const res = await authFetch(`/api/superadmin/outreach/suppress?${params.toString()}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success(data.unsuppressed ? 'Email unsuppressed' : 'No active suppression found');
        fetchSuppressions();
      } else {
        toast.error(data.error || 'Failed to unsuppress');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setUnsuppressingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Email suppressions</CardTitle>
              <CardDescription>Per-email-address suppression list. Auto-created on hard bounce / complaint.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Switch
                  checked={showResolved}
                  onCheckedChange={setShowResolved}
                />
                Show resolved
              </label>
              <Button variant="outline" size="sm" onClick={fetchSuppressions} disabled={loading}>
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> Refresh
              </Button>
              <Button size="sm" onClick={() => setManualDialogOpen(true)}>
                <Plus className="size-3.5 mr-1" /> Manually suppress
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title={showResolved ? 'No resolved suppressions' : 'No active suppressions'}
              subtitle={showResolved
                ? 'No emails have been unsuppressed yet.'
                : 'No emails are currently suppressed. New bounces/complaints will appear here.'}
            />
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>{showResolved ? 'Resolved' : 'Created'}</TableHead>
                    {showResolved && <TableHead>Resolve reason</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const badge = getSuppressionReasonBadge(r.reason);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs text-foreground">{r.email}</TableCell>
                        <TableCell className="text-xs">
                          {r.tenantName ? (
                            <span className="text-foreground">{r.tenantName}</span>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Platform-wide</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.source}{r.provider ? ` · ${r.provider}` : ''}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {showResolved && r.resolvedAt ? formatDate(r.resolvedAt) : formatDate(r.createdAt)}
                        </TableCell>
                        {showResolved && (
                          <TableCell className="text-xs text-muted-foreground">
                            {r.resolveReason || '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          {!showResolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleUnsuppress(r)}
                              disabled={unsuppressingId === r.id}
                            >
                              {unsuppressingId === r.id ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5 mr-1" />}
                              Unsuppress
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ManualSuppressDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        onSuppressed={fetchSuppressions}
      />
    </div>
  );
}

function ManualSuppressDialog({
  open, onOpenChange, onSuppressed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuppressed: () => void;
}) {
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [notes, setNotes] = useState('');
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [saving, setSaving] = useState(false);

  // Load tenants on first open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    authFetch('/api/superadmin/tenants?XTransformPort=3000')
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: { tenants: TenantOption[] }) => {
        if (cancelled) return;
        setTenants(d.tenants || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open]);

  // Reset on close.
  useEffect(() => {
    if (!open) return;
    setEmail('');
    setTenantId('');
    setNotes('');
  }, [open]);

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('A valid email is required');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/superadmin/outreach/suppress?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          tenantId: tenantId || null,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success('Email suppressed');
        onSuppressed();
        onOpenChange(false);
      } else {
        toast.error(data.error || 'Failed to suppress email');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-500" /> Manually suppress email
          </DialogTitle>
          <DialogDescription>
            Add an email address to the suppression list. Future outreach sends to this address will be blocked.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="suppress-email">Email address *</Label>
            <Input
              id="suppress-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suppress-tenant">Tenant (optional)</Label>
            <Select value={tenantId || '__platform_wide__'} onValueChange={(v) => setTenantId(v === '__platform_wide__' ? '' : v)}>
              <SelectTrigger id="suppress-tenant"><SelectValue placeholder="Platform-wide (no tenant)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__platform_wide__">Platform-wide</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Leave as platform-wide to block this email across all tenants.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="suppress-notes">Notes (optional)</Label>
            <Textarea
              id="suppress-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Manual block per support ticket #1234"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !email.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Ban className="size-4 mr-1.5" />}
            Suppress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab 5: Settings ─────────────────────────────────────────────────────────

function SettingsTab() {
  return (
    <div className="space-y-4">
      <SettingsCard />
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How the daily limit works</CardTitle>
          <CardDescription>Reference — what counts toward the cap.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Only counts provider-accepted (<code className="font-mono text-xs">sent</code>) emails. Queued/failed sends do not consume the daily quota.</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <span>The quota resets at midnight UTC. Each tenant is also subject to a 72-hour cooldown between sends.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlert className="size-4 text-red-500 shrink-0 mt-0.5" />
              <span>Hard bounces and complaints auto-suppress the email address. Manually unsuppress from the Suppressions tab.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <span>Tenants can independently opt out via <code className="font-mono text-xs">Tenant.outreachDisabled</code> — overrides all pre-flight checks.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Shared: SettingsCard (used by Overview + Settings tabs) ─────────────────

function SettingsCard() {
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(() => {
    setLoading(true);
    authFetch('/api/superadmin/outreach/settings?XTransformPort=3000')
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: { dailyLimit: number }) => {
        setDailyLimit(d.dailyLimit);
        setInputValue(String(d.dailyLimit));
      })
      .catch(() => toast.error('Failed to load outreach settings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    const n = parseInt(inputValue, 10);
    if (!Number.isFinite(n) || n < 1) {
      toast.error('Daily limit must be a positive integer');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch('/api/superadmin/outreach/settings?XTransformPort=3000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLimit: n }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success(`Daily limit updated to ${data.dailyLimit}`);
        setDailyLimit(data.dailyLimit);
        setInputValue(String(data.dailyLimit));
      } else {
        toast.error(data.error || 'Failed to update daily limit');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="card-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <SettingsIcon className="size-4" /> Daily send limit
        </CardTitle>
        <CardDescription>
          Platform-wide cap on outreach emails per day. Clamped to [1, 1000] by the backend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="daily-limit-input">Limit (emails/day)</Label>
              <Input
                id="daily-limit-input"
                type="number"
                min={1}
                max={1000}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={saving}
                className="sm:w-40"
              />
              <p className="text-[11px] text-muted-foreground">
                Current value: <span className="font-semibold text-foreground">{dailyLimit ?? '—'}</span>. Only counts provider-accepted (<code className="font-mono">sent</code>) emails.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || inputValue === String(dailyLimit)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-4 mr-1.5" />}
              Save
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
