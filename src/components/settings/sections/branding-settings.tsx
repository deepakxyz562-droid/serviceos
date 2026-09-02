'use client';

/**
 * BrandingSettings — visual identity settings (Company Logo, Brand Colors,
 * Typography, Email Footer, White-Label Mode, and Live Previews).
 *
 * Source of Truth:
 *   - Logo: persisted directly to `Tenant.logo` via `/api/tenants/[id]/logo` (S3).
 *   - Colors, Font, Footer: persisted to `BrandKit` via `/api/brand-kit`.
 *   - White-label: persisted to `tenant.whiteLabelJson` via `/api/tenants/[id]`.
 *
 * All customer-facing surfaces (Invoices, Quotes, Customer Portal, Outgoing
 * Emails, Marketplace Profile, and Mobile App) automatically inherit these
 * settings from this single source of truth.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Upload,
  Trash2,
  ImageIcon,
  AlertCircle,
  FileCheck2,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  planSupported: boolean;
  hideFieserosBranding: boolean;
  saving: boolean;
}

const DEFAULT_FORM: BrandKitForm = {
  primaryColor: '#059669',
  secondaryColor: '#1f2937',
  accentColor: '#d97706',
  fontFamily: 'Inter',
  footerHtml: '',
};

const STANDARD_FONTS = [
  { value: 'Inter', label: 'Inter (Clean & Modern — Recommended)' },
  { value: 'Roboto', label: 'Roboto (Geometric & Friendly)' },
  { value: 'Arial', label: 'Arial (Neutral & Standard)' },
  { value: 'Helvetica', label: 'Helvetica (Classic Sans)' },
  { value: 'system-ui', label: 'System UI (Native OS Font)' },
  { value: 'Georgia', label: 'Georgia (Elegant Serif)' },
  { value: 'Times New Roman', label: 'Times New Roman (Traditional Serif)' },
];

function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

/** Compute relative luminance to test contrast against white background */
function getContrastRatio(hex: string): { ratio: number; isAA: boolean } {
  if (!isValidHex(hex) || hex.length !== 7) return { ratio: 4.5, isAA: true };
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const ratio = (1.0 + 0.05) / (L + 0.05);
  return { ratio, isAA: ratio >= 3.0 }; // AA Large/UI component threshold
}

export function BrandingSettings() {
  const [form, setForm] = useState<BrandKitForm>(DEFAULT_FORM);
  const [customFontMode, setCustomFontMode] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('Your Business Name');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingKit, setSavingKit] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [previewTab, setPreviewTab] = useState<'invoice' | 'portal' | 'email'>('invoice');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [whiteLabel, setWhiteLabel] = useState<WhiteLabelState>({
    planSupported: false,
    hideFieserosBranding: false,
    saving: false,
  });

  // ── Load Tenant & Brand Kit ──────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (authRes.ok) {
        const authData = await authRes.json();
        const t = authData?.tenant;
        if (t?.id) {
          setTenantId(t.id);
          setBusinessName(t.name || 'Your Business Name');
          setLogoUrl(t.logo || null);

          const planSupported = t.planStatus !== 'trial' && t.plan === 'enterprise';
          let hideFieseros = false;
          try {
            const parsed = JSON.parse(t.whiteLabelJson || '{}');
            hideFieseros = Boolean(parsed.hideFieserosBranding);
          } catch {}

          setWhiteLabel({
            planSupported,
            hideFieserosBranding: hideFieseros,
            saving: false,
          });
        }
      }

      const kitRes = await authFetch('/api/brand-kit');
      if (kitRes.ok) {
        const kitData = await kitRes.json();
        const kit = kitData?.data;
        if (kit) {
          const font = kit.fontFamily || DEFAULT_FORM.fontFamily;
          const isStandard = STANDARD_FONTS.some((f) => f.value === font);
          setCustomFontMode(!isStandard);
          setForm({
            primaryColor: kit.primaryColor || DEFAULT_FORM.primaryColor,
            secondaryColor: kit.secondaryColor || DEFAULT_FORM.secondaryColor,
            accentColor: kit.accentColor || DEFAULT_FORM.accentColor,
            fontFamily: font,
            footerHtml: kit.footerHtml || '',
          });
        }
      }
    } catch (err) {
      console.error('[BrandingSettings] Failed to load:', err);
      toast.error('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // ── Logo Upload ─────────────────────────────────────────────────────────
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Logo file size must be less than 10 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadingLogo(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}/logo`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.logoUrl) {
        setLogoUrl(data.logoUrl);
        toast.success('Business logo uploaded and updated everywhere.');
      } else {
        toast.error(data.error || 'Failed to upload logo.');
      }
    } catch (err) {
      console.error('[BrandingSettings] Logo upload error:', err);
      toast.error('Network error uploading logo.');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!tenantId) return;
    setUploadingLogo(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}/logo`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLogoUrl(null);
        toast.success('Logo removed.');
      } else {
        toast.error('Failed to remove logo.');
      }
    } catch {
      toast.error('Network error removing logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Save Brand Kit ──────────────────────────────────────────────────────
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
        }),
      });
      if (res.ok) {
        toast.success('Branding saved successfully.');
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save branding.');
      }
    } catch {
      toast.error('Network error saving branding.');
    } finally {
      setSavingKit(false);
    }
  };

  // ── White-label toggle ──────────────────────────────────────────────────
  const handleToggleWhiteLabel = async (nextValue: boolean) => {
    if (!tenantId || !whiteLabel.planSupported) return;
    setWhiteLabel((prev) => ({ ...prev, saving: true, hideFieserosBranding: nextValue }));
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
            ? 'Fieseros branding hidden across invoices, portal & emails.'
            : 'Fieseros branding enabled.'
        );
      } else {
        setWhiteLabel((prev) => ({ ...prev, hideFieserosBranding: !nextValue }));
        toast.error('Failed to update white-label setting.');
      }
    } catch {
      setWhiteLabel((prev) => ({ ...prev, hideFieserosBranding: !nextValue }));
      toast.error('Network error updating white-label setting.');
    } finally {
      setWhiteLabel((prev) => ({ ...prev, saving: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading branding settings...
      </div>
    );
  }

  const primaryContrast = getContrastRatio(form.primaryColor);

  return (
    <div className="space-y-6">
      {/* ─── 1. Canonical Company Logo ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <ImageIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Business Logo</CardTitle>
              <CardDescription>
                Your single company logo — automatically used on Invoices, Quotes, Customer Portal, Outgoing Emails, and the Marketplace.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Logo Preview Container */}
            <div className="relative size-28 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0 group">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="size-full object-contain p-2"
                />
              ) : (
                <div className="text-center p-2">
                  <Building2 className="size-8 mx-auto text-muted-foreground/60" />
                  <span className="text-[10px] font-medium text-muted-foreground mt-1 block">No Logo</span>
                </div>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-emerald-600" />
                </div>
              )}
            </div>

            {/* Actions & Instructions */}
            <div className="space-y-2 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoFileChange}
              />
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Upload className="size-3.5" />
                  {logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={handleRemoveLogo}
                    className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Recommended: Square PNG, JPG, WebP, or SVG · Max 10 MB. High-resolution transparent background recommended.
              </p>
              {logoUrl && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                  <FileCheck2 className="size-3" />
                  Canonical logo active across all customer touchpoints
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. Brand Colors ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Palette className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Brand Colors</CardTitle>
              <CardDescription>
                Primary, secondary, and accent colors for action buttons, badges, links, and documents.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <ColorField
            id="brand-primary"
            label="Primary Color"
            hint="Buttons, primary links, and main actions"
            value={form.primaryColor}
            onChange={(v) => setForm((f) => ({ ...f, primaryColor: v }))}
          />
          {!primaryContrast.isAA && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-300">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                Low contrast: This primary color may be difficult to read with white text. Consider selecting a slightly darker shade.
              </span>
            </div>
          )}

          <ColorField
            id="brand-secondary"
            label="Secondary Color"
            hint="Headers, borders, and secondary text"
            value={form.secondaryColor}
            onChange={(v) => setForm((f) => ({ ...f, secondaryColor: v }))}
          />
          <ColorField
            id="brand-accent"
            label="Accent Color"
            hint="Highlights, status badges, and callouts"
            value={form.accentColor}
            onChange={(v) => setForm((f) => ({ ...f, accentColor: v }))}
          />
        </CardContent>
      </Card>

      {/* ─── 3. Typography ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Type className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Typography</CardTitle>
              <CardDescription>
                Font family applied across invoices, quotes, customer portal, and email notifications.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!customFontMode ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Family</Label>
              <Select
                value={form.fontFamily}
                onValueChange={(v) => {
                  if (v === 'custom') {
                    setCustomFontMode(true);
                  } else {
                    setForm((f) => ({ ...f, fontFamily: v }));
                  }
                }}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select a font" />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">+ Custom CSS Font String...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between max-w-md">
                <Label className="text-sm font-medium" htmlFor="brand-font-custom">
                  Custom Font Family (CSS)
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setCustomFontMode(false);
                    setForm((f) => ({ ...f, fontFamily: 'Inter' }));
                  }}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Reset to Standard Fonts
                </button>
              </div>
              <Input
                id="brand-font-custom"
                placeholder="e.g. 'Poppins', sans-serif"
                value={form.fontFamily}
                onChange={(e) => setForm((f) => ({ ...f, fontFamily: e.target.value }))}
                className="max-w-md"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── 4. Email Footer ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Mail className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Email Footer</CardTitle>
              <CardDescription>
                Custom message or legal text appended to the bottom of outgoing customer emails (optional).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            id="brand-footer"
            placeholder="e.g. Thank you for choosing our services. For support, reply directly to this email."
            value={form.footerHtml}
            rows={3}
            onChange={(e) => setForm((f) => ({ ...f, footerHtml: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use the standard business footer with your company address and contact details.
          </p>
        </CardContent>
      </Card>

      {/* ─── 5. White-Label Mode ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Eye className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">White-Label Mode</CardTitle>
              <CardDescription>
                Hide the &ldquo;Powered by Fieseros&rdquo; credit from customer-facing emails, invoices, and the portal.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Hide Fieseros branding</p>
              <p className="text-xs text-muted-foreground">
                When enabled, your customer portal, invoices, and transactional emails will display 100% of your own brand identity.
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <Lock className="size-3.5" />
                <span>Enterprise plan only</span>
              </div>
            )}
          </div>

          {!whiteLabel.planSupported && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-3.5 flex items-start gap-3">
              <Sparkles className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-amber-900 dark:text-amber-200">Enterprise Feature</p>
                <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                  White-label mode is available on the Enterprise tier. Upgrade to remove all platform branding from customer experiences.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ─── 6. Live Multi-Surface Preview ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                <Eye className="size-4 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">Live Preview</CardTitle>
                <CardDescription>See how your branding appears to your customers</CardDescription>
              </div>
            </div>

            <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="invoice" className="text-xs">Invoice</TabsTrigger>
                <TabsTrigger value="portal" className="text-xs">Customer Portal</TabsTrigger>
                <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div
            style={{
              fontFamily: form.fontFamily || 'Inter, sans-serif',
            }}
            className="rounded-xl border border-border overflow-hidden bg-card shadow-sm max-w-xl mx-auto"
          >
            {/* Header */}
            <div
              style={{ backgroundColor: isValidHex(form.primaryColor) ? form.primaryColor : '#059669' }}
              className="px-5 py-4 flex items-center justify-between text-white"
            >
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-7 w-auto max-w-[120px] object-contain bg-white/10 rounded px-1.5 py-0.5" />
                ) : (
                  <Building2 className="size-6 text-white/80" />
                )}
                <span className="font-bold text-sm tracking-tight">{businessName}</span>
              </div>
              <span
                style={{ backgroundColor: isValidHex(form.accentColor) ? form.accentColor : '#d97706' }}
                className="text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
              >
                {previewTab === 'invoice' ? 'Invoice #1042' : previewTab === 'portal' ? 'Client Portal' : 'Notification'}
              </span>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3 bg-white dark:bg-zinc-950 text-foreground">
              <p className="text-sm font-semibold">Service Booking Confirmation</p>
              <div className="h-2 w-3/4 rounded bg-muted/80" />
              <div className="h-2 w-1/2 rounded bg-muted/80" />

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  style={{ backgroundColor: isValidHex(form.primaryColor) ? form.primaryColor : '#059669' }}
                  className="text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm"
                >
                  {previewTab === 'invoice' ? 'Pay Now ($150.00)' : previewTab === 'portal' ? 'View Service Status' : 'Confirm Appointment'}
                </button>
                <span
                  style={{ color: isValidHex(form.accentColor) ? form.accentColor : '#d97706' }}
                  className="text-xs font-semibold"
                >
                  View Details →
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-muted/40 px-5 py-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>{form.footerHtml || `© ${new Date().getFullYear()} ${businessName}. All rights reserved.`}</span>
              {!whiteLabel.hideFieserosBranding && (
                <span className="text-[10px] text-muted-foreground/70">Powered by Fieseros</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Save Changes ──────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6 font-semibold shadow-sm"
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
          {savingKit ? 'Saving...' : savedFlash ? 'Saved!' : 'Save Branding Changes'}
        </Button>
      </div>
    </div>
  );
}

// ─── ColorField Component ───────────────────────────────────────────────────

function ColorField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const swatchValue = isValidHex(value) && value.length === 7 ? value : '#059669';

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium" htmlFor={id}>
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <div className="relative size-10 rounded-lg border border-border overflow-hidden shrink-0 shadow-sm">
          <input
            type="color"
            value={swatchValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-100"
            aria-label={`${label} picker`}
          />
        </div>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#059669"
          className="font-mono max-w-[180px] h-10"
        />
        <div
          className="size-7 rounded-md border shrink-0 hidden sm:block"
          style={{ backgroundColor: isValidHex(value) ? value : '#059669' }}
          aria-hidden
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
