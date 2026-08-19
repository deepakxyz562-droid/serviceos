'use client';

/**
 * BrandingSettings — visual identity settings (colors, font, email footer,
 * white-label toggle).
 *
 * Reads/writes the BrandKit model via /api/brand-kit (GET + POST).
 * The white-label toggle reads/writes tenant.whiteLabelJson via /api/tenants/[id].
 *
 * IMPORTANT: This component does NOT manage company name, logo, phone, email,
 * website, or address. Those belong to the Company Information tab (Tenant model).
 * The BrandKit model has duplicated fields (companyName, logoUrl, phone, etc.)
 * but we intentionally do NOT surface them here — they are dead data from the
 * old Template Studio design, and will be cleaned up in a future schema
 * consolidation. See worklog.md "Branding Architecture" section.
 *
 * Plan gating: the "Hide Fieseros branding" toggle is only editable when the
 * tenant's plan supports the `white_label` feature. Per DEFAULT_PLAN_MATRIX in
 * src/lib/plan-features.ts, only `enterprise` (and any future plan flagged
 * white_label=true) qualifies. Tenants on lower plans see a locked toggle with
 * an upgrade CTA so they understand what they'd get by upgrading.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Type,
  Mail,
  Eye,
  Loader2,
  Save,
  Check,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────

interface BrandKitForm {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  footerHtml: string;
}

interface WhiteLabelState {
  /** Whether the tenant's plan supports the `white_label` feature. */
  planSupported: boolean;
  /** Current value of `hideFieserosBranding` from tenant.whiteLabelJson. */
  hideFieserosBranding: boolean;
  /** True while a PUT is in flight to flip the toggle. */
  saving: boolean;
}

const DEFAULT_FORM: BrandKitForm = {
  primaryColor: '#0f766e',
  secondaryColor: '#1f2937',
  accentColor: '#f59e0b',
  fontFamily: 'Inter, sans-serif',
  footerHtml: '',
};

/** Parse a hex color (3, 6, or 8 digits with leading #) for the color input. */
function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

/** Parse `tenant.whiteLabelJson` ({ hideFieserosBranding: boolean }). */
function parseWhiteLabelJson(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'hideFieserosBranding' in parsed) {
      return Boolean((parsed as { hideFieserosBranding: unknown }).hideFieserosBranding);
    }
  } catch {
    // ignore malformed JSON — default to false
  }
  return false;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BrandingSettings() {
  const [form, setForm] = useState<BrandKitForm>(DEFAULT_FORM);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKit, setSavingKit] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // White-label state is tracked separately because it writes to a different
  // endpoint (tenant.whiteLabelJson) and is plan-gated.
  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelState>({
    planSupported: false,
    hideFieserosBranding: false,
    saving: false,
  });

  // ── Load: auth/me → tenantId + plan → /api/brand-kit + /api/tenants/[id] ─
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. /api/auth/me → resolve tenantId + plan + planStatus
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (!authRes.ok) return;
      const authData = await authRes.json();
      const t = authData?.tenant;
      if (!t?.id) return;
      setTenantId(t.id);

      // Plan-gate the white-label toggle. Per DEFAULT_PLAN_MATRIX in
      // src/lib/plan-features.ts, `white_label` is only `true` for the
      // `enterprise` tier (and trial/starter/growth/business all return
      // false). The authoritative check is the DB-backed
      // `isFeatureEnabledForPlan('white_label', tier)` on the server —
      // we can't call it from the client (it imports `db`). Instead we
      // use the plan string + planStatus from /api/auth/me as a proxy:
      //   - planStatus === 'trial'  → never white-label
      //   - plan === 'enterprise'  → white-label supported
      //   - everything else        → not supported (locked toggle + CTA)
      // If the PlanFeatureMatrix is later edited by a superadmin to enable
      // white_label on other tiers, the server-side `loadTenantEmailBranding`
      // will still honor the DB value at email-render time; this UI just
      // controls whether the toggle is editable.
      const planSupported =
        t.planStatus !== 'trial' && t.plan === 'enterprise';

      // 2. /api/brand-kit → colors, font, footer
      const kitRes = await authFetch('/api/brand-kit');
      if (kitRes.ok) {
        const kitData = await kitRes.json();
        const kit = kitData?.data;
        if (kit) {
          setForm({
            primaryColor: kit.primaryColor || DEFAULT_FORM.primaryColor,
            secondaryColor: kit.secondaryColor || DEFAULT_FORM.secondaryColor,
            accentColor: kit.accentColor || DEFAULT_FORM.accentColor,
            fontFamily: kit.fontFamily || DEFAULT_FORM.fontFamily,
            footerHtml: kit.footerHtml || '',
          });
        }
      }

      // 3. /api/tenants/[id] → tenant.whiteLabelJson
      //    The tenant detail endpoint currently does not surface whiteLabelJson
      //    in its response (only the company-profile + hub fields). We attempt
      //    the fetch anyway and treat a missing field as `false`. The PUT call
      //    below persists the toggle even though the GET response doesn't echo
      //    it back — the value lives on the Tenant row in the DB and is read
      //    directly by `loadTenantEmailBranding()` at email-render time.
      let hideBranding = false;
      try {
        const tenantRes = await authFetch(`/api/tenants/${t.id}`);
        if (tenantRes.ok) {
          const tenantData = await tenantRes.json();
          const tenantRow = tenantData?.tenant;
          // Defensive: the field may be undefined in the response (see note
          // above). Fall through to the default `false` in that case.
          hideBranding = parseWhiteLabelJson(
            tenantRow?.whiteLabelJson as string | undefined,
          );
        }
      } catch {
        // Non-fatal — toggle stays at false.
      }

      setWhiteLabel((prev) => ({
        ...prev,
        planSupported,
        hideFieserosBranding: hideBranding,
      }));
    } catch {
      // silently fail — fields stay at their defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Save (BrandKit fields) → POST /api/brand-kit ──────────────────────
  const handleSaveKit = async () => {
    setSavingKit(true);
    try {
      const res = await authFetch('/api/brand-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          fontFamily: form.fontFamily,
          footerHtml: form.footerHtml || null,
          // NOTE: we intentionally do NOT send companyName / logoUrl / phone /
          // email / address / website here — those are dead duplicated fields
          // on BrandKit that we surface under the Company Information tab via
          // the Tenant model instead. Sending null would overwrite any stale
          // value, which we don't want to do silently.
        }),
      });
      if (res.ok) {
        toast.success('Branding saved successfully');
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
        // Re-fetch so the form reflects the persisted state (incl. any
        // server-defaulted fields).
        await fetchAll();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save branding');
      }
    } catch {
      toast.error('Network error saving branding');
    } finally {
      setSavingKit(false);
    }
  };

  // ── Toggle white-label → PUT /api/tenants/[id] ────────────────────────
  const handleToggleWhiteLabel = async (nextValue: boolean) => {
    if (!tenantId || !whiteLabel.planSupported) return;
    setWhiteLabel((prev) => ({ ...prev, saving: true }));
    // Optimistically flip the toggle so the UI feels instant.
    setWhiteLabel((prev) => ({ ...prev, hideFieserosBranding: nextValue }));
    try {
      const res = await authFetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whiteLabelJson: JSON.stringify({ hideFieserosBranding: nextValue }),
        }),
      });
      if (res.ok) {
        toast.success(
          nextValue
            ? 'Fieseros branding hidden on outgoing emails'
            : 'Fieseros branding will appear on outgoing emails',
        );
      } else {
        // Revert optimistic flip on failure.
        setWhiteLabel((prev) => ({ ...prev, hideFieserosBranding: !nextValue }));
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to update white-label setting');
      }
    } catch {
      setWhiteLabel((prev) => ({ ...prev, hideFieserosBranding: !nextValue }));
      toast.error('Network error updating white-label setting');
    } finally {
      setWhiteLabel((prev) => ({ ...prev, saving: false }));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading branding settings...
      </div>
    );
  }

  const previewStyle = {
    '--brand-primary': isValidHex(form.primaryColor) ? form.primaryColor : '#0f766e',
    '--brand-accent': isValidHex(form.accentColor) ? form.accentColor : '#f59e0b',
    fontFamily: form.fontFamily || 'Inter, sans-serif',
  } as React.CSSProperties;

  return (
    <div className="space-y-6">
      {/* ─── 1. Brand Colors ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Palette className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Brand Colors</CardTitle>
              <CardDescription>
                Primary, secondary, and accent colors used on invoices, the customer portal, and email templates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <ColorField
            id="brand-primary"
            label="Primary Color"
            hint="Buttons, links, and primary actions"
            value={form.primaryColor}
            onChange={(v) => setForm((f) => ({ ...f, primaryColor: v }))}
          />
          <ColorField
            id="brand-secondary"
            label="Secondary Color"
            hint="Headings, sidebars, and secondary text"
            value={form.secondaryColor}
            onChange={(v) => setForm((f) => ({ ...f, secondaryColor: v }))}
          />
          <ColorField
            id="brand-accent"
            label="Accent Color"
            hint="Highlights, badges, and call-outs"
            value={form.accentColor}
            onChange={(v) => setForm((f) => ({ ...f, accentColor: v }))}
          />
        </CardContent>
      </Card>

      {/* ─── 2. Typography ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Type className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Typography</CardTitle>
              <CardDescription>
                Font family applied to invoices, the customer portal, and email templates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="brand-font">
            Font Family
          </Label>
          <Input
            id="brand-font"
            placeholder="e.g. Inter, sans-serif"
            value={form.fontFamily}
            onChange={(e) => setForm((f) => ({ ...f, fontFamily: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Use a CSS font-family string. Web-safe fonts (Inter, Roboto, Arial) work everywhere;
            custom fonts require a <code>@import</code> or <code>&lt;link&gt;</code> on the host page.
          </p>
        </CardContent>
      </Card>

      {/* ─── 3. Email Footer ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Mail className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Email Footer</CardTitle>
              <CardDescription>
                Custom HTML appended to the bottom of every outgoing email (optional)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="brand-footer">
            Footer HTML
          </Label>
          <Textarea
            id="brand-footer"
            placeholder={
              '<p style="font-size:12px;color:#6b7280;">Visit us at <a href="https://example.com">example.com</a></p>'
            }
            value={form.footerHtml}
            rows={5}
            onChange={(e) => setForm((f) => ({ ...f, footerHtml: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Inline styles recommended — most email clients strip <code>&lt;style&gt;</code> blocks. Leave
            blank to use the default Fieseros footer (or your white-labeled footer if the toggle below is on).
          </p>
        </CardContent>
      </Card>

      {/* ─── 4. White-Label Toggle ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Eye className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">White-Label Mode</CardTitle>
              <CardDescription>
                Hide the &ldquo;Powered by Fieseros&rdquo; footer from outgoing emails and customer-facing surfaces
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Hide Fieseros branding</p>
              <p className="text-xs text-muted-foreground">
                When enabled, outgoing emails, invoices, and the customer portal will not show the Fieseros
                logo or footer credit.
              </p>
            </div>
            {whiteLabel.planSupported ? (
              <Switch
                checked={whiteLabel.hideFieserosBranding}
                disabled={whiteLabel.saving}
                onCheckedChange={(v) => void handleToggleWhiteLabel(v)}
                aria-label="Hide Fieseros branding"
              />
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="size-3.5" />
                <span>Enterprise plan only</span>
              </div>
            )}
          </div>

          {!whiteLabel.planSupported && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 flex items-start gap-2.5">
              <Sparkles className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-medium text-amber-900 dark:text-amber-200">Upgrade to Enterprise</p>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                  White-label mode removes Fieseros branding from all customer-facing surfaces. Available on the
                  Enterprise plan — contact sales to upgrade.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ─── 5. Live Preview ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Eye className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Live Preview</CardTitle>
              <CardDescription>How your branding will appear on invoices and the customer portal</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            style={previewStyle}
            className="rounded-lg border overflow-hidden"
          >
            {/* Header bar */}
            <div
              style={{ backgroundColor: 'var(--brand-primary)' }}
              className="px-4 py-3 flex items-center justify-between"
            >
              <span className="text-white font-semibold text-sm" style={{ fontFamily: form.fontFamily || 'Inter, sans-serif' }}>
                Your Business Name
              </span>
              <span
                style={{ backgroundColor: 'var(--brand-accent)' }}
                className="text-white text-[11px] font-medium px-2 py-0.5 rounded"
              >
                Invoice
              </span>
            </div>
            {/* Body */}
            <div className="bg-white dark:bg-background p-4 space-y-2">
              <div className="h-2 w-3/4 rounded bg-muted" />
              <div className="h-2 w-1/2 rounded bg-muted" />
              <div className="h-2 w-5/6 rounded bg-muted" />
              <div className="pt-2 flex items-center gap-2">
                <span
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                  className="text-white text-[11px] font-medium px-3 py-1 rounded"
                >
                  Pay Now
                </span>
                <span
                  style={{ color: 'var(--brand-accent)' }}
                  className="text-[11px] font-medium"
                >
                  View details →
                </span>
              </div>
            </div>
            {/* Footer */}
            <div className="bg-muted/50 px-4 py-2 border-t">
              <p
                className="text-[10px] text-muted-foreground"
                style={{ fontFamily: form.fontFamily || 'Inter, sans-serif' }}
              >
                {whiteLabel.hideFieserosBranding && whiteLabel.planSupported
                  ? form.footerHtml
                    ? ''
                    : '© Your Business Name. All rights reserved.'
                  : 'Powered by Fieseros — get your own branded portal at fieseros.com'}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Preview is illustrative — actual rendering depends on the email client / portal context.
          </p>
        </CardContent>
      </Card>

      {/* ─── Save button ──────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6"
          onClick={handleSaveKit}
          disabled={savingKit}
        >
          {savingKit ? (
            <Loader2 className="size-4 animate-spin" />
          ) : savedFlash ? (
            <Check className="size-4" />
          ) : (
            <Save className="size-4" />
          )}
          {savingKit ? 'Saving...' : savedFlash ? 'Saved' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

// ─── ColorField helper ──────────────────────────────────────────────────────

interface ColorFieldProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A combined native color-picker + hex text input. The color input only
 * accepts 6-digit hex (#RRGGBB); the text input accepts any CSS color string
 * (3/6/8-digit hex, named colors). When the user picks via the swatch, we
 * sync the hex text field; when they type, we leave the swatch alone until
 * they type a valid 6-digit hex.
 */
function ColorField({ id, label, hint, value, onChange }: ColorFieldProps) {
  // The native color input requires a 7-character #RRGGBB string. Coerce
  // any incoming value into that shape so the swatch always renders.
  const swatchValue = isValidHex(value) && value.length === 7
    ? value
    : '#0f766e';

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium" htmlFor={id}>
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <div className="relative size-10 rounded-md border overflow-hidden shrink-0">
          <input
            type="color"
            value={swatchValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-100"
            aria-label={`${label} color picker`}
          />
        </div>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0f766e"
          className="font-mono max-w-[200px]"
        />
        <div
          className="size-8 rounded border shrink-0 hidden sm:block"
          style={{ backgroundColor: isValidHex(value) ? value : '#0f766e' }}
          aria-hidden
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
