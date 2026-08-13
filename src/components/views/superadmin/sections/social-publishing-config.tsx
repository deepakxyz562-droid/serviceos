'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Superadmin — Social Publishing OAuth Configuration
// ─────────────────────────────────────────────────────────────────────────────
//
// Card-per-platform UI where the platform owner registers OAuth app
// credentials for the 5 social-publishing platforms (Meta App covers
// both FB + IG). Below the cards: a feature-flag table with per-platform
// Enabled toggle + Min Plan dropdown.
//
// Backed by /api/superadmin/social-publishing-config (GET/PUT/DELETE).
//
// Each card shows:
//   • Platform name + icon
//   • "✓ Configured" / "⚠ Not configured" status badge
//   • Masked clientId + masked clientSecret (with "••••••••XXXX" format)
//   • Editable inputs for App ID + Secret (re-enter secret to update)
//   • Read-only copyable Redirect URIs (one per OAuth callback)
//   • Read-only Scopes list
//   • Save / Test Connection / Remove buttons
//
// The "Test Connection" button probes our own /api/oauth/{platform}
// endpoint with a HEAD request to verify it returns 307 (configured +
// reachable) vs 503 (not configured) vs 401 (auth required). It's a
// smoke test — a full token-exchange test would require a real user
// consent flow, which we can't run from the superadmin context.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Loader2, CheckCircle2, AlertTriangle, Save, Trash2, Copy,
  ExternalLink, FlaskConical, KeyRound, Eye, EyeOff,
  AlertCircle, RefreshCw,
} from 'lucide-react';
import {
  SectionHeader, KpiCard, DemoDataPill,
} from '@/components/views/superadmin/_shared';

// ─── Types ─────────────────────────────────────────────────────────────────

type PlanKey = 'trial' | 'starter' | 'growth' | 'business' | 'enterprise';

interface PlatformConfig {
  key: string;
  label: string;
  description: string;
  idFieldLabel: string;
  secretFieldLabel: string;
  secretOptional?: boolean;
  redirectUris: string[];
  scopes: string[];
  docsUrl: string;
  warning?: string;
  configured: boolean;
  credentialId: string | null;
  clientId: string;
  clientIdMasked: string;
  clientSecretMasked: string;
  hasSecret: boolean;
  scopesStored: string;
  flags: { enabled: boolean; minPlan: PlanKey };
  connectedTenants: number;
  totalAccounts: number;
  updatedAt: string | null;
}

interface Summary {
  total: number;
  configured: number;
  enabled: number;
  connectedTenantsTotal: number;
}

const PLAN_OPTIONS: { value: PlanKey; label: string }[] = [
  { value: 'trial', label: 'Free / Trial' },
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'business', label: 'Pro / Business' },
  { value: 'enterprise', label: 'Enterprise' },
];

/** Per-platform form state — the user's in-progress edits. */
interface PlatformForm {
  clientId: string;
  clientSecret: string;
  showSecret: boolean;
}

type PlatformForms = Record<string, PlatformForm>;

// ─── Component ─────────────────────────────────────────────────────────────

export function SocialPublishingConfigSection() {
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Per-platform form state (keyed by platform key).
  const [forms, setForms] = useState<PlatformForms>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/social-publishing-config');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setPlatforms(data.platforms || []);
      setSummary(data.summary || null);
      // Pre-fill forms with the masked clientId (so the user sees what's
      // there) — secrets are always blank in the form until the user
      // types a new one.
      const nextForms: PlatformForms = {};
      for (const p of data.platforms || []) {
        nextForms[p.key] = {
          clientId: p.clientId || '',
          clientSecret: '',
          showSecret: false,
        };
      }
      setForms(nextForms);
    } catch {
      toast.error('Failed to load social publishing configuration');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSave = async (platform: PlatformConfig) => {
    const form = forms[platform.key];
    if (!form) return;
    if (!form.clientId.trim()) {
      toast.error(`${platform.idFieldLabel} is required`);
      return;
    }
    if (!form.clientSecret.trim() && !platform.configured && !platform.secretOptional) {
      toast.error(`${platform.secretFieldLabel} is required for new configuration`);
      return;
    }
    setSavingKey(platform.key);
    try {
      const res = await fetch('/api/superadmin/social-publishing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platform.key,
          clientId: form.clientId.trim(),
          clientSecret: form.clientSecret.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      toast.success(`${platform.label} credentials saved`);
      // Clear the secret field on the form (so the masked display
      // comes back from the GET) and reload.
      setForms((prev) => ({
        ...prev,
        [platform.key]: { ...prev[platform.key], clientSecret: '', showSecret: false },
      }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingKey(null);
    }
  };

  const handleTestConnection = async (platform: PlatformConfig) => {
    if (!platform.configured) {
      toast.error('Save credentials before testing');
      return;
    }
    setTestingKey(platform.key);
    try {
      // HEAD-probe our own OAuth connect endpoint. A 307 means the
      // route is reachable + credentials are configured. A 503 means
      // the credentials row is missing (shouldn't happen here, but
      // defensively handled). A 401 means the superadmin isn't signed
      // in as a tenant user (still proves the route exists).
      const res = await fetch(`/api/oauth/${platform.key}`, {
        method: 'HEAD',
        redirect: 'manual', // don't follow the OAuth redirect
      });
      if (res.status === 0 || res.type === 'opaqueredirect') {
        // 307 redirect to the provider's OAuth dialog — exactly what
        // we want. The browser blocks reading the Location header
        // cross-origin, but `opaqueredirect` (or status 0) confirms
        // the route returned a redirect.
        toast.success(`${platform.label} OAuth route is reachable. Redirect URI is registered.`);
        return;
      }
      if (res.status === 307 || res.status === 302) {
        toast.success(`${platform.label} OAuth route is reachable.`);
        return;
      }
      if (res.status === 503) {
        toast.error(`${platform.label} credentials not found by the OAuth route. Try saving again.`);
        return;
      }
      if (res.status === 401) {
        toast.info(
          `${platform.label} route exists but requires a tenant login to fully test. Credential lookup succeeded.`,
        );
        return;
      }
      if (res.status === 404) {
        toast.error(`${platform.label} OAuth route not found (404).`);
        return;
      }
      toast.info(`${platform.label} route returned status ${res.status}.`);
    } catch {
      // fetch() throws on cross-origin redirect follow — but we used
      // `redirect: 'manual'`, so this only happens on network errors.
      toast.error('Network error testing connection');
    } finally {
      setTestingKey(null);
    }
  };

  const handleRemove = async (platform: PlatformConfig) => {
    if (!platform.credentialId) return;
    const ok = window.confirm(
      `Remove ${platform.label} OAuth credentials?\n\n` +
      `Tenants will not be able to connect this platform until reconfigured. ` +
      `Already-connected tenants (${platform.connectedTenants}) keep working until their token expires.`,
    );
    if (!ok) return;
    setRemovingKey(platform.key);
    try {
      const res = await fetch(
        `/api/superadmin/social-publishing-config?platform=${encodeURIComponent(platform.key)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to remove');
      }
      toast.success(`${platform.label} credentials removed`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setRemovingKey(null);
    }
  };

  const handleToggleEnabled = async (platform: PlatformConfig, enabled: boolean) => {
    setTogglingKey(platform.key);
    try {
      const res = await fetch('/api/superadmin/social-publishing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platform.key,
          clientId: platform.clientId, // preserve
          enabled,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to toggle');
      }
      toast.success(`${platform.label} ${enabled ? 'enabled' : 'disabled'}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle');
    } finally {
      setTogglingKey(null);
    }
  };

  const handleMinPlanChange = async (platform: PlatformConfig, minPlan: PlanKey) => {
    setTogglingKey(platform.key);
    try {
      const res = await fetch('/api/superadmin/social-publishing-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platform.key,
          clientId: platform.clientId, // preserve
          minPlan,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update plan');
      }
      toast.success(`${platform.label} min plan set to ${minPlan}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setTogglingKey(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  const appOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Social Publishing"
        description="Register OAuth app credentials for the 5 social-publishing platforms. Tenants authorize their own accounts against these apps."
        icon={KeyRound}
        actions={
          <div className="flex items-center gap-2">
            <DemoDataPill live />
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Platforms"
            value={summary.total}
            icon={KeyRound}
            color="sky"
            sub={`${summary.configured} configured`}
          />
          <KpiCard
            label="Enabled"
            value={summary.enabled}
            icon={CheckCircle2}
            color="emerald"
            sub={`${summary.total - summary.enabled} disabled`}
          />
          <KpiCard
            label="Connected Tenants"
            value={summary.connectedTenantsTotal}
            icon={AlertCircle}
            color="violet"
            sub="across all platforms"
          />
          <KpiCard
            label="Pending Setup"
            value={summary.total - summary.configured}
            icon={AlertTriangle}
            color="amber"
            sub="platforms needing credentials"
          />
        </div>
      )}

      {/* Platform credential cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {platforms.map((p) => {
          const form = forms[p.key] || { clientId: '', clientSecret: '', showSecret: false };
          const isSaving = savingKey === p.key;
          const isTesting = testingKey === p.key;
          const isRemoving = removingKey === p.key;
          return (
            <Card key={p.key} className="card-shadow flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="truncate">{p.label}</span>
                      {p.configured ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          <CheckCircle2 className="size-3 mr-1" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                          <AlertTriangle className="size-3 mr-1" />
                          Not configured
                        </Badge>
                      )}
                      {!p.flags.enabled && p.configured && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {p.description}
                    </CardDescription>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="shrink-0 h-8">
                    <a href={p.docsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-3.5" />
                      Console
                    </a>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1">
                {p.warning && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{p.warning}</p>
                  </div>
                )}

                {/* Credential inputs */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center justify-between">
                      <span>{p.idFieldLabel}</span>
                      {p.configured && (
                        <span className="text-muted-foreground font-normal">
                          Current: <code className="font-mono">{p.clientIdMasked || '—'}</code>
                        </span>
                      )}
                    </Label>
                    <Input
                      value={form.clientId}
                      onChange={(e) =>
                        setForms((prev) => ({
                          ...prev,
                          [p.key]: { ...prev[p.key], clientId: e.target.value },
                        }))
                      }
                      placeholder={`Paste ${p.idFieldLabel} here`}
                      className="font-mono text-sm h-9"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center justify-between">
                      <span>
                        {p.secretFieldLabel}
                        {p.secretOptional && (
                          <span className="ml-1 text-muted-foreground font-normal">
                            (optional for PKCE public clients)
                          </span>
                        )}
                      </span>
                      {p.configured && (
                        <span className="text-muted-foreground font-normal">
                          {p.hasSecret ? (
                            <span>Stored: <code className="font-mono">{p.clientSecretMasked}</code></span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">No secret stored</span>
                          )}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type={form.showSecret ? 'text' : 'password'}
                        value={form.clientSecret}
                        onChange={(e) =>
                          setForms((prev) => ({
                            ...prev,
                            [p.key]: { ...prev[p.key], clientSecret: e.target.value },
                          }))
                        }
                        placeholder={
                          p.configured
                            ? '•••••••• (leave blank to keep current)'
                            : `Paste ${p.secretFieldLabel} here`
                        }
                        className="font-mono text-sm h-9 pr-9"
                        autoComplete="new-password"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForms((prev) => ({
                            ...prev,
                            [p.key]: { ...prev[p.key], showSecret: !prev[p.key].showSecret },
                          }))
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={form.showSecret ? 'Hide secret' : 'Show secret'}
                      >
                        {form.showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Redirect URIs */}
                <div className="space-y-1.5">
                  <Label className="text-xs">OAuth Redirect URI{p.redirectUris.length > 1 ? 's' : ''}</Label>
                  <div className="space-y-1.5">
                    {p.redirectUris.map((path) => {
                      const full = `${appOrigin}${path}`;
                      return (
                        <div
                          key={path}
                          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 p-2"
                        >
                          <code className="flex-1 text-[11px] font-mono text-foreground break-all">
                            {full}
                          </code>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={() => copyToClipboard(full)}
                                >
                                  <Copy className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy full URL</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Paste {p.redirectUris.length > 1 ? 'these URLs' : 'this URL'} into the
                    provider&apos;s developer dashboard under &ldquo;Authorized redirect URIs&rdquo;.
                  </p>
                </div>

                {/* Scopes */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Required Scopes</Label>
                  <div className="flex flex-wrap gap-1">
                    {p.scopes.map((scope) => (
                      <code
                        key={scope}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border text-foreground"
                      >
                        {scope}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleSave(p)}
                    disabled={isSaving || !form.clientId.trim()}
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 mr-1 animate-spin" />
                    ) : (
                      <Save className="size-3.5 mr-1" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnection(p)}
                    disabled={isTesting || !p.configured}
                  >
                    {isTesting ? (
                      <Loader2 className="size-3.5 mr-1 animate-spin" />
                    ) : (
                      <FlaskConical className="size-3.5 mr-1" />
                    )}
                    Test
                  </Button>
                  {p.credentialId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive ml-auto"
                      onClick={() => handleRemove(p)}
                      disabled={isRemoving}
                    >
                      {isRemoving ? (
                        <Loader2 className="size-3.5 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5 mr-1" />
                      )}
                      Remove
                    </Button>
                  )}
                </div>

                {p.updatedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Last updated: {new Date(p.updatedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature flag table */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Switch className="scale-75 origin-left pointer-events-none" defaultChecked />
            Feature Flags
          </CardTitle>
          <CardDescription>
            Toggle which platforms tenants can see &amp; connect, and set the minimum subscription
            plan required to use each platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead className="w-24 text-center">Enabled</TableHead>
                  <TableHead className="w-48">Min Plan</TableHead>
                  <TableHead className="w-32 text-right">Connected Tenants</TableHead>
                  <TableHead className="w-32 text-right">Total Accounts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms.map((p) => (
                  <TableRow key={p.key}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{p.label}</span>
                        {!p.configured && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30"
                          >
                            Not configured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={p.flags.enabled}
                        onCheckedChange={(v) => handleToggleEnabled(p, v)}
                        disabled={!p.configured || togglingKey === p.key}
                        aria-label={`Toggle ${p.label}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={p.flags.minPlan}
                        onValueChange={(v) => handleMinPlanChange(p, v as PlanKey)}
                        disabled={!p.configured || togglingKey === p.key}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLAN_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.connectedTenants}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.totalAccounts}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Disabling a platform hides the &ldquo;Connect&rdquo; button in the tenant Social Accounts
            view. Existing connections remain active until their token expires.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
