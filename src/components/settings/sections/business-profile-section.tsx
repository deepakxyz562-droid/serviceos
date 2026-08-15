'use client';

/**
 * BusinessProfileSettings — Phase 3 settings section that replaces the old
 * "Coming Soon" placeholder for the `business-profile` settings key.
 *
 * Owns four sub-sections, all backed by the existing `Tenant` model fields
 * (zero schema migration needed):
 *
 *   1. Business Logo      → tenant.logo           (image upload via /api/upload)
 *   2. Tagline & Desc     → tenant.tagline, tenant.description
 *   3. Public Contact     → tenant.phone, tenant.email, tenant.website
 *   4. Business Hours     → tenant.businessHoursJson (7-day Mon-Sun grid)
 *
 * Load flow:
 *   - `GET /api/auth/me` to resolve tenant.id
 *   - `GET /api/tenants/[id]` to fetch the full tenant row (auth/me doesn't
 *     surface tagline / description / businessHoursJson / website)
 *
 * Save flow:
 *   - Single "Save Changes" button → `PUT /api/tenants/[id]` with the merged
 *     field deltas. Server persists, echoes back the updated tenant.
 *
 * Logo upload flow:
 *   - Hidden file input + dropzone-styled button
 *   - `POST /api/upload` with bucket=company-assets, folder=logos
 *   - Returned URL is stored in component state and POSTed to the tenant
 *     endpoint on Save (not auto-saved, so the user can cancel).
 *
 * Styling mirrors `company-settings.tsx`: same Card / CardHeader / CardContent
 * pattern, same emerald accent, same loading spinner.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2,
  ImagePlus,
  Loader2,
  Mail,
  Phone,
  Save,
  Trash2,
  Globe,
  Clock,
  Type,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

// ─── Business-hours shape ───────────────────────────────────────────────
//
// Stored on `tenant.businessHoursJson` (String @default("{}")). Mirrors the
// shape the customer portal + marketplace already render, so a single source
// of truth covers all surfaces.
type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type BusinessHours = Record<DayKey, DayHours>;

const DAY_ORDER: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function defaultBusinessHours(): BusinessHours {
  const days: BusinessHours = {} as BusinessHours;
  for (const d of DAY_ORDER) {
    days[d] = d === 'sunday' ? { open: '', close: '', closed: true } : { open: '09:00', close: '17:00', closed: false };
  }
  return days;
}

/** Parse the stored businessHoursJson string into a normalized 7-day map. */
function parseBusinessHours(raw: string | null | undefined): BusinessHours {
  const fallback = defaultBusinessHours();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    const out: BusinessHours = {} as BusinessHours;
    for (const d of DAY_ORDER) {
      const cell = (parsed as Record<string, unknown>)[d];
      if (cell && typeof cell === 'object') {
        const c = cell as Partial<DayHours>;
        out[d] = {
          open: typeof c.open === 'string' ? c.open : '',
          close: typeof c.close === 'string' ? c.close : '',
          closed: c.closed === true,
        };
      } else {
        // Inherit defaults if the day is missing from stored JSON.
        out[d] = fallback[d];
      }
    }
    return out;
  } catch {
    return fallback;
  }
}

interface BusinessProfileSettingsProps {
  /** Called after a successful save so the parent shell can refresh. */
  onSaved?: () => void;
}

export function BusinessProfileSettings({ onSaved }: BusinessProfileSettingsProps) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [logo, setLogo] = useState<string>('');
  const [tagline, setTagline] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultBusinessHours);

  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(true);

  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Load: auth/me → tenant.id → GET /api/tenants/[id] ──────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const authRes = await fetch('/api/auth/me?XTransformPort=3000');
      if (!authRes.ok) return;
      const authData = await authRes.json();
      const tid = authData?.tenant?.id;
      if (!tid) return;
      setTenantId(tid);

      const tRes = await authFetch(`/api/tenants/${tid}`);
      if (!tRes.ok) return;
      const tData = await tRes.json();
      const t = tData?.tenant;
      if (!t) return;

      setLogo(t.logo || '');
      setTagline(t.tagline || '');
      setDescription(t.description || '');
      setPhone(t.phone || '');
      setEmail(t.email || '');
      setWebsite(t.website || '');
      setBusinessHours(parseBusinessHours(t.businessHoursJson));
    } catch {
      // silently fail — fields stay at their defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Logo upload → /api/upload → store returned URL in state ────────────
  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    // Guard: image MIME only (matches /api/upload allowlist)
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (PNG, JPG, SVG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Logo must be 10MB or smaller');
      return;
    }
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'company-assets');
      fd.append('folder', 'logos');
      fd.append('saveToLibrary', 'true');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      if (!data.url) throw new Error('Upload response missing URL');
      setLogo(data.url);
      toast.success('Logo uploaded — click Save Changes to apply');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logo upload failed';
      toast.error(msg);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setLogo('');
    toast.info('Logo removed — click Save Changes to apply');
  };

  const updateDay = (day: DayKey, patch: Partial<DayHours>) => {
    setBusinessHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  // ── Save → PUT /api/tenants/[id] with all field deltas ────────────────
  const handleSave = async () => {
    if (!tenantId) {
      toast.error('No tenant found. Complete onboarding first.');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo: logo || null,
          tagline,
          description,
          phone,
          email,
          website,
          businessHoursJson: JSON.stringify(businessHours),
        }),
      });
      if (res.ok) {
        toast.success('Business profile saved successfully');
        await fetchProfile();
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save business profile');
      }
    } catch {
      toast.error('Network error saving business profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading business profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. Business Logo ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Building2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Business Logo</CardTitle>
              <CardDescription>
                Used on invoices, the customer portal, and your marketplace listing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
            className="hidden"
            onChange={(e) => handleLogoUpload(e.target.files)}
          />

          {logo ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative size-24 rounded-lg border bg-muted overflow-hidden flex items-center justify-center p-2 shrink-0">
                <img
                  src={logo}
                  alt="Business logo preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Logo preview. Click Replace to upload a new image, or Remove to clear it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo || saving}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <ImagePlus className="size-4 mr-1.5" />
                    )}
                    {uploadingLogo ? 'Uploading...' : 'Replace'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={uploadingLogo || saving}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4 mr-1.5" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo || saving}
              className="w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 hover:bg-muted/40 hover:border-emerald-400/50 transition-colors px-4 py-8 text-sm flex flex-col items-center gap-2 disabled:opacity-50"
            >
              {uploadingLogo ? (
                <Loader2 className="size-6 animate-spin text-emerald-600" />
              ) : (
                <ImagePlus className="size-6 text-emerald-600" />
              )}
              <span className="font-medium text-foreground">
                {uploadingLogo ? 'Uploading...' : 'Click to upload your business logo'}
              </span>
              <span className="text-xs text-muted-foreground">
                PNG, JPG, SVG, or WebP · up to 10MB
              </span>
            </button>
          )}
        </CardContent>
      </Card>

      {/* ─── 2. Tagline & Description ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Type className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Tagline & Description</CardTitle>
              <CardDescription>
                Public-facing business description shown on the portal and marketplace
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium" htmlFor="bp-tagline">
              Tagline
            </Label>
            <Input
              id="bp-tagline"
              placeholder="e.g. Reliable home services, done right the first time"
              value={tagline}
              maxLength={140}
              onChange={(e) => setTagline(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A short one-liner under your business name. Max 140 characters.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium" htmlFor="bp-description">
              Description
            </Label>
            <Textarea
              id="bp-description"
              placeholder="Tell customers what you do, what makes you different, and what they can expect when they hire you."
              value={description}
              rows={5}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Longer About text. Shown on your public marketplace listing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. Public Contact Details ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Phone className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Public Contact Details</CardTitle>
              <CardDescription>
                Phone, email, and website shown to customers on invoices and the portal
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5" htmlFor="bp-phone">
                <Phone className="size-3.5" /> Phone
              </Label>
              <Input
                id="bp-phone"
                placeholder="+1 555 0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5" htmlFor="bp-email">
                <Mail className="size-3.5" /> Email
              </Label>
              <Input
                id="bp-email"
                type="email"
                placeholder="hello@yourbusiness.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5" htmlFor="bp-website">
              <Globe className="size-3.5" /> Website
            </Label>
            <Input
              id="bp-website"
              type="url"
              placeholder="https://yourbusiness.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Full URL including https:// — linked from invoices and your marketplace listing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. Business Hours ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
              <Clock className="size-4 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-base">Business Hours</CardTitle>
              <CardDescription>
                Public operating hours shown on the portal and marketplace listing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden sm:grid sm:grid-cols-[140px_120px_1fr_1fr] gap-3 px-1 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <div>Day</div>
            <div>Status</div>
            <div>Open</div>
            <div>Close</div>
          </div>
          <Separator />
          {DAY_ORDER.map((day) => {
            const hours = businessHours[day];
            return (
              <div
                key={day}
                className="grid grid-cols-1 sm:grid-cols-[140px_120px_1fr_1fr] gap-3 items-center py-2"
              >
                <div className="text-sm font-medium">{DAY_LABELS[day]}</div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!hours.closed}
                    onCheckedChange={(open) =>
                      updateDay(day, {
                        closed: !open,
                        // Pre-fill sensible defaults when flipping from closed → open
                        open: open && !hours.open ? '09:00' : hours.open,
                        close: open && !hours.close ? '17:00' : hours.close,
                      })
                    }
                    aria-label={`${DAY_LABELS[day]} open`}
                  />
                  <span className={`text-xs ${hours.closed ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {hours.closed ? 'Closed' : 'Open'}
                  </span>
                </div>
                <Input
                  type="time"
                  value={hours.open}
                  disabled={hours.closed}
                  onChange={(e) => updateDay(day, { open: e.target.value })}
                  className="sm:max-w-[180px]"
                />
                <Input
                  type="time"
                  value={hours.close}
                  disabled={hours.closed}
                  onChange={(e) => updateDay(day, { close: e.target.value })}
                  className="sm:max-w-[180px]"
                />
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground pt-2">
            Toggle a day off to mark it as closed. Times use 24-hour format (e.g. 09:00–17:00).
          </p>
        </CardContent>
      </Card>

      {/* ─── Save button ──────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6"
          onClick={handleSave}
          disabled={saving || uploadingLogo}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
