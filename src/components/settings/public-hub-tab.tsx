'use client';

/**
 * Public Hub Settings Tab
 *
 * Lets a business owner/admin edit every field that appears on their public
 * Business Hub page at /{industry}/{city}/{slug}.
 *
 * Organised into 8 cards:
 *   1. Visibility & URL   — enable toggle + URL preview + Preview button
 *   2. About              — tagline + description (≥100 chars for SEO)
 *   3. Location           — city, state, postalCode + service areas (chips)
 *   4. Images             — cover image URL + gallery (repeatable)
 *   5. Business Hours     — per-day open/close toggles
 *   6. Social Links       — facebook, instagram, twitter, linkedin, youtube
 *   7. FAQs               — repeatable {question, answer}
 *   8. SEO                — seoTitle + seoDescription with char counters
 *
 * Saves via PUT /api/tenants/[id] (extended to accept the 17 Hub fields).
 * The API also calls revalidatePath so the public page refreshes instantly.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  MapPin,
  Camera,
  Clock,
  Share2,
  HelpCircle,
  Search,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { authFetch } from '@/lib/api';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/templates/rich-text-editor';

// ─── Types ─────────────────────────────────────────────────────────────────

interface GalleryItem {
  url: string;
  caption: string;
}
interface FaqItem {
  question: string;
  answer: string;
}
interface BusinessHours {
  // per-day: { open: "09:00", close: "17:00" } | { closed: true }
  [day: string]: { open: string; close: string; closed: boolean };
}
interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
}

interface HubForm {
  publicProfileEnabled: boolean;
  publicSlug: string;
  city: string;
  state: string;
  postalCode: string;
  tagline: string;
  description: string;
  coverImage: string;
  gallery: GalleryItem[];
  businessHours: BusinessHours;
  serviceAreas: string[];
  socialLinks: SocialLinks;
  faqs: FaqItem[];
  seoTitle: string;
  seoDescription: string;
}

interface Props {
  tenantId: string | null;
  /** industry + slug are needed to build the URL preview */
  industry: string;
  slug: string;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

function defaultBusinessHours(): BusinessHours {
  const hours: BusinessHours = {};
  for (const d of DAYS) {
    hours[d] = { open: '09:00', close: '17:00', closed: d === 'sun' };
  }
  return hours;
}

function emptyForm(): HubForm {
  return {
    publicProfileEnabled: false,
    publicSlug: '',
    city: '',
    state: '',
    postalCode: '',
    tagline: '',
    description: '',
    coverImage: '',
    gallery: [],
    businessHours: defaultBusinessHours(),
    serviceAreas: [],
    socialLinks: {},
    faqs: [],
    seoTitle: '',
    seoDescription: '',
  };
}

// ─── Component ─────────────────────────────────────────────────────────────

// ─── Image upload helper ─────────────────────────────────────────────────
// Posts a File to /api/public-hub/upload and returns the resulting URL.
// Used by both the cover-image uploader and the gallery uploader.
async function uploadImage(file: File, kind: 'cover' | 'gallery'): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('kind', kind);
  const res = await authFetch('/api/public-hub/upload', { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  const data = await res.json();
  return data.url as string;
}

export function PublicHubTab({ tenantId, industry, slug }: Props) {
  const [form, setForm] = useState<HubForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newArea, setNewArea] = useState('');
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  // Upload state — shown as a small spinner overlay on the upload tile.
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGalleryIdx, setUploadingGalleryIdx] = useState<number | null>(null);

  // ── Load existing Hub data from the API ──────────────────────────────────
  const loadHub = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    try {
      const res = await authFetch(`/api/tenants/${tenantId}`, { method: 'GET' });
      if (!res.ok) {
        toast.error('Failed to load public hub data');
        return;
      }
      const data = await res.json();
      const t = data.tenant;

      // Parse JSON fields safely
      let gallery: GalleryItem[] = [];
      let businessHours: BusinessHours = defaultBusinessHours();
      let serviceAreas: string[] = [];
      let socialLinks: SocialLinks = {};
      let faqs: FaqItem[] = [];

      try { gallery = JSON.parse(t.galleryJson || '[]'); } catch {}
      try { businessHours = { ...defaultBusinessHours(), ...JSON.parse(t.businessHoursJson || '{}') }; } catch {}
      try { serviceAreas = JSON.parse(t.serviceAreasJson || '[]'); } catch {}
      try { socialLinks = JSON.parse(t.socialLinksJson || '{}'); } catch {}
      try { faqs = JSON.parse(t.faqsJson || '[]'); } catch {}

      setForm({
        publicProfileEnabled: t.publicProfileEnabled ?? false,
        publicSlug: t.publicSlug || '',
        city: t.city || '',
        state: t.state || '',
        postalCode: t.postalCode || '',
        tagline: t.tagline || '',
        description: t.description || '',
        coverImage: t.coverImage || '',
        gallery,
        businessHours,
        serviceAreas,
        socialLinks,
        faqs,
        seoTitle: t.seoTitle || '',
        seoDescription: t.seoDescription || '',
      });
      setPublicUrl(t.publicUrl || null);
    } catch {
      toast.error('Network error loading hub data');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadHub();
  }, [loadHub]);

  // ── Save handler ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!tenantId) {
      toast.error('No tenant found');
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicProfileEnabled: form.publicProfileEnabled,
          publicSlug: form.publicSlug,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          tagline: form.tagline,
          description: form.description,
          coverImage: form.coverImage,
          galleryJson: JSON.stringify(form.gallery),
          businessHoursJson: JSON.stringify(form.businessHours),
          serviceAreasJson: JSON.stringify(form.serviceAreas),
          socialLinksJson: JSON.stringify(form.socialLinks),
          faqsJson: JSON.stringify(form.faqs),
          seoTitle: form.seoTitle,
          seoDescription: form.seoDescription,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPublicUrl(data.tenant.publicUrl || null);
        toast.success('Public Hub saved — your page is live');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Network error saving hub data');
    } finally {
      setSaving(false);
    }
  };

  // ── URL preview ──────────────────────────────────────────────────────────
  const urlIndustry = industry || 'industry';
  const urlCity = form.city || 'city';
  const urlSlug = form.publicSlug || slug || 'business-slug';
  const urlPreview = `${urlIndustry}/${urlCity.toLowerCase().replace(/\s+/g, '-')}/${urlSlug.toLowerCase().replace(/\s+/g, '-')}`;

  // ── Indexability checklist (mirrors the "rich enough" rule) ──────────────
  // Strip HTML tags before counting characters so the SEO check is accurate.
  const descPlain = form.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const descLongEnough = descPlain.length >= 100;
  const hasCity = form.city.trim().length > 0;
  const hasIndustry = (industry || '').length > 0;
  const hasImage = Boolean(form.coverImage) || form.gallery.length > 0;
  const checklist = [
    { ok: hasIndustry, label: 'Industry set (in Company Profile)' },
    { ok: hasCity, label: 'City set' },
    { ok: descLongEnough, label: 'Description ≥ 100 characters' },
    { ok: hasImage, label: 'At least 1 image (cover or gallery)' },
  ];
  // Note: ≥3 public services is also required but managed elsewhere
  const allChecklistPass = checklist.every((c) => c.ok);

  // ─── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading public hub settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          1. VISIBILITY & URL
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Globe className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Public Business Hub</CardTitle>
              <CardDescription>Control your public-facing page at serviceos.cc</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enable toggle */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-muted/30">
            <div className="space-y-1">
              <Label htmlFor="hub-enabled" className="text-sm font-medium">Enable public page</Label>
              <p className="text-xs text-muted-foreground">
                When ON, your business is live at the URL below. When OFF, the page returns 404.
              </p>
            </div>
            <Switch
              id="hub-enabled"
              checked={form.publicProfileEnabled}
              onCheckedChange={(v) => setForm({ ...form, publicProfileEnabled: v })}
            />
          </div>

          {/* URL preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your public URL</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 font-mono text-sm break-all">
              <span className="text-muted-foreground">serviceos.cc/</span>
              <span className="text-emerald-700 dark:text-emerald-400">{urlPreview}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The URL is built from your <strong>industry</strong> (set in Company Profile), your <strong>city</strong>, and your <strong>public slug</strong> below.
            </p>
          </div>

          {/* Public slug */}
          <div className="space-y-2">
            <Label htmlFor="public-slug" className="text-sm font-medium">Public slug</Label>
            <Input
              id="public-slug"
              value={form.publicSlug}
              onChange={(e) => setForm({ ...form, publicSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              placeholder={slug || 'acme-plumbing'}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">Leave blank to use your default slug &quot;{slug}&quot;. Lowercase letters, numbers, and hyphens only.</p>
          </div>

          {/* Preview button + status */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!form.publicProfileEnabled}
              onClick={() => {
                if (publicUrl) window.open(publicUrl, '_blank');
              }}
              className="gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              Preview public page
            </Button>
            {form.publicProfileEnabled ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Live
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <span className="size-1.5 rounded-full bg-muted-foreground" /> Hidden
              </Badge>
            )}
          </div>

          {/* Indexability checklist */}
          {form.publicProfileEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Search engine indexing checklist</p>
                <p className="text-xs text-muted-foreground">Your page is indexed by Google only when all checks pass (plus ≥3 public services, managed in the Services tab).</p>
                <div className="grid gap-1.5">
                  {checklist.map((c) => (
                    <div key={c.label} className="flex items-center gap-2 text-sm">
                      {c.ok ? (
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={c.ok ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
                    </div>
                  ))}
                </div>
                {allChecklistPass && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="size-3.5" /> Ready for indexing (add ≥3 services in the Services tab)
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          2. ABOUT
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Your Business</CardTitle>
          <CardDescription>The headline and description shown at the top of your public page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tagline" className="text-sm font-medium">Tagline</Label>
            <Input
              id="tagline"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="Denver's trusted 24/7 plumbing experts"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">A short one-liner shown under your business name. Max 120 characters.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <span className={`text-xs ${descLongEnough ? 'text-emerald-600' : 'text-amber-600'}`}>
                {form.description.replace(/<[^>]+>/g, '').length} / 100 min
              </span>
            </div>
            <RichTextEditor
              value={form.description}
              onChange={(html) => setForm({ ...form, description: html })}
              placeholder="Tell customers what you do, where you operate, and why they should choose you. Aim for 2-3 paragraphs (200-500 words is ideal for SEO)."
              ariaLabel="Business description"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {descLongEnough ? (
                <><CheckCircle2 className="size-3.5 text-emerald-600" /> Long enough for search indexing</>
              ) : (
                <><AlertCircle className="size-3.5 text-amber-600" /> Add {100 - form.description.replace(/<[^>]+>/g, '').length} more characters to be indexed</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          3. LOCATION & SERVICE AREAS
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <MapPin className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Location & Service Areas</CardTitle>
              <CardDescription>Where you're based and which areas you serve</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-medium">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Denver"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium">State / Province</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="CO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode" className="text-sm font-medium">Postal code</Label>
              <Input
                id="postalCode"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="80202"
              />
            </div>
          </div>

          <Separator />

          {/* Service areas — chip input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Service areas</Label>
            <p className="text-xs text-muted-foreground">Cities or neighborhoods you travel to. Press Enter or click Add.</p>
            <div className="flex gap-2">
              <Input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newArea.trim()) {
                      setForm({ ...form, serviceAreas: [...form.serviceAreas, newArea.trim()] });
                      setNewArea('');
                    }
                  }
                }}
                placeholder="e.g. Aurora, Lakewood, Englewood"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (newArea.trim()) {
                    setForm({ ...form, serviceAreas: [...form.serviceAreas, newArea.trim()] });
                    setNewArea('');
                  }
                }}
                className="gap-1.5"
              >
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
            {form.serviceAreas.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {form.serviceAreas.map((area, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pl-2.5 pr-1 py-1">
                    {area}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, serviceAreas: form.serviceAreas.filter((_, idx) => idx !== i) })}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                      aria-label={`Remove ${area}`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          4. IMAGES
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <ImageIcon className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Images</CardTitle>
              <CardDescription>Upload a cover image and photos of your work. You can also paste image URLs.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── Cover image ────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="cover-image" className="text-sm font-medium">Cover image</Label>
            {form.coverImage ? (
              <div className="relative group rounded-lg overflow-hidden border max-w-sm">
                <img
                  src={form.coverImage}
                  alt="Cover preview"
                  className="w-full h-40 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploadingCover}
                    onClick={() => document.getElementById('cover-upload-input')?.click()}
                    className="gap-1.5"
                  >
                    {uploadingCover ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setForm({ ...form, coverImage: '' })}
                    className="gap-1.5"
                  >
                    <X className="size-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById('cover-upload-input')?.click()}
                disabled={uploadingCover}
                className="flex flex-col items-center justify-center gap-2 w-full max-w-sm h-40 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors text-muted-foreground"
              >
                {uploadingCover ? (
                  <><Loader2 className="size-6 animate-spin" /> <span className="text-sm">Uploading...</span></>
                ) : (
                  <><Upload className="size-6" /> <span className="text-sm font-medium">Click to upload cover image</span> <span className="text-xs">PNG, JPG, WebP up to 8MB</span></>
                )}
              </button>
            )}
            <input
              id="cover-upload-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingCover(true);
                try {
                  const url = await uploadImage(file, 'cover');
                  setForm({ ...form, coverImage: url });
                  toast.success('Cover image uploaded');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Upload failed');
                } finally {
                  setUploadingCover(false);
                  e.target.value = '';
                }
              }}
            />
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Or paste an image URL instead</summary>
              <Input
                id="cover-image"
                value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                placeholder="https://example.com/your-cover-photo.jpg"
                className="mt-2 text-sm"
              />
            </details>
          </div>

          <Separator />

          {/* ── Gallery ───────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Photo gallery</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('gallery-upload-input')?.click()}
                  disabled={uploadingGalleryIdx !== null}
                  className="gap-1.5"
                >
                  {uploadingGalleryIdx === -1 ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                  Upload photo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm({ ...form, gallery: [...form.gallery, { url: '', caption: '' }] })}
                  className="gap-1.5"
                >
                  <Plus className="size-3.5" /> Add by URL
                </Button>
              </div>
            </div>
            {/* Hidden file input for gallery uploads. Reused for each "Upload photo" click. */}
            <input
              id="gallery-upload-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingGalleryIdx(-1);
                try {
                  const url = await uploadImage(file, 'gallery');
                  setForm({ ...form, gallery: [...form.gallery, { url, caption: '' }] });
                  toast.success('Photo added to gallery');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Upload failed');
                } finally {
                  setUploadingGalleryIdx(null);
                  e.target.value = '';
                }
              }}
            />
            {form.gallery.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/20 text-muted-foreground">
                <Camera className="size-6" />
                <p className="text-xs">No gallery photos yet. Add photos of your work, team, or storefront.</p>
              </div>
            )}
            {form.gallery.map((item, i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-lg border bg-muted/20">
                <div className="relative size-16 rounded-md overflow-hidden border bg-muted shrink-0 flex items-center justify-center">
                  {item.url ? (
                    <img src={item.url} alt={item.caption || 'Gallery'} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                  ) : (
                    <Camera className="size-5 text-muted-foreground" />
                  )}
                  {uploadingGalleryIdx === i && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="size-4 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.url}
                    onChange={(e) => {
                      const next = [...form.gallery];
                      next[i] = { ...next[i], url: e.target.value };
                      setForm({ ...form, gallery: next });
                    }}
                    placeholder="https://example.com/photo.jpg"
                    className="text-sm"
                  />
                  <Input
                    value={item.caption}
                    onChange={(e) => {
                      const next = [...form.gallery];
                      next[i] = { ...next[i], caption: e.target.value };
                      setForm({ ...form, gallery: next });
                    }}
                    placeholder="Caption (optional)"
                    className="text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById(`gallery-replace-${i}`)?.click()}
                      disabled={uploadingGalleryIdx !== null}
                      className="gap-1.5 h-7 text-xs"
                    >
                      <Upload className="size-3" /> Replace
                    </Button>
                    <input
                      id={`gallery-replace-${i}`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingGalleryIdx(i);
                        try {
                          const url = await uploadImage(file, 'gallery');
                          const next = [...form.gallery];
                          next[i] = { ...next[i], url };
                          setForm({ ...form, gallery: next });
                          toast.success('Photo replaced');
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Upload failed');
                        } finally {
                          setUploadingGalleryIdx(null);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setForm({ ...form, gallery: form.gallery.filter((_, idx) => idx !== i) })}
                  aria-label="Remove photo"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          5. BUSINESS HOURS
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Clock className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Business Hours</CardTitle>
              <CardDescription>Shown as &quot;Open now&quot; status and a hours table on your page</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map((day) => {
            const hours = form.businessHours[day] || { open: '09:00', close: '17:00', closed: false };
            return (
              <div key={day} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/20">
                <div className="w-24">
                  <Label className="text-sm font-medium">{DAY_LABELS[day]}</Label>
                </div>
                <Switch
                  checked={!hours.closed}
                  onCheckedChange={(v) => setForm({
                    ...form,
                    businessHours: { ...form.businessHours, [day]: { ...hours, closed: !v } },
                  })}
                />
                <span className="text-xs text-muted-foreground w-12">{hours.closed ? 'Closed' : 'Open'}</span>
                {!hours.closed && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => setForm({
                        ...form,
                        businessHours: { ...form.businessHours, [day]: { ...hours, open: e.target.value } },
                      })}
                      className="w-32 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => setForm({
                        ...form,
                        businessHours: { ...form.businessHours, [day]: { ...hours, close: e.target.value } },
                      })}
                      className="w-32 text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          6. SOCIAL LINKS
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Share2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">Social Media Links</CardTitle>
              <CardDescription>Optional — shown as icons in your page footer</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'] as const).map((platform) => (
            <div key={platform} className="space-y-2">
              <Label htmlFor={`social-${platform}`} className="text-sm font-medium capitalize">{platform}</Label>
              <Input
                id={`social-${platform}`}
                value={form.socialLinks[platform] || ''}
                onChange={(e) => setForm({
                  ...form,
                  socialLinks: { ...form.socialLinks, [platform]: e.target.value },
                })}
                placeholder={`https://${platform}.com/yourbusiness`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          7. FAQs
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <HelpCircle className="size-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base">Frequently Asked Questions</CardTitle>
                <CardDescription>Shown in an accordion + added to FAQPage schema for SEO</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, faqs: [...form.faqs, { question: '', answer: '' }] })}
              className="gap-1.5"
            >
              <Plus className="size-3.5" /> Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.faqs.length === 0 && (
            <p className="text-xs text-muted-foreground">No FAQs yet. Common questions: &quot;Do you offer emergency service?&quot;, &quot;What areas do you cover?&quot;, &quot;Do you offer free estimates?&quot;</p>
          )}
          {form.faqs.map((faq, i) => (
            <div key={i} className="space-y-2 p-3 rounded-lg border bg-muted/20">
              <div className="flex gap-2">
                <Input
                  value={faq.question}
                  onChange={(e) => {
                    const next = [...form.faqs];
                    next[i] = { ...next[i], question: e.target.value };
                    setForm({ ...form, faqs: next });
                  }}
                  placeholder="What is your service area?"
                  className="text-sm font-medium"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setForm({ ...form, faqs: form.faqs.filter((_, idx) => idx !== i) })}
                  aria-label="Remove FAQ"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <RichTextEditor
                value={faq.answer}
                onChange={(html) => {
                  const next = [...form.faqs];
                  next[i] = { ...next[i], answer: html };
                  setForm({ ...form, faqs: next });
                }}
                placeholder="We serve the greater Denver metro area including Aurora, Lakewood, and Englewood."
                ariaLabel={`Answer for FAQ ${i + 1}`}
                className="[&_[contenteditable]]:min-h-[80px]"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          8. SEO
          ═══════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Search className="size-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base">SEO Settings</CardTitle>
              <CardDescription>Override the page title and meta description for search engines</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-title" className="text-sm font-medium">SEO title</Label>
              <span className="text-xs text-muted-foreground">{form.seoTitle.length} / 60</span>
            </div>
            <Input
              id="seo-title"
              value={form.seoTitle}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              placeholder="Acme Plumbing | 24/7 Emergency Plumbers in Denver, CO"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">Leave blank to auto-generate from your business name + tagline.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-description" className="text-sm font-medium">SEO description</Label>
              <span className="text-xs text-muted-foreground">{form.seoDescription.length} / 160</span>
            </div>
            <Textarea
              id="seo-description"
              value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              placeholder="Acme Plumbing has served the Denver metro area since 2005. Licensed, insured, and available 24/7 for emergency repairs. Free estimates. Call now."
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">Leave blank to auto-generate from your description.</p>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          SAVE BAR
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 p-4 rounded-xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
        <Button
          type="button"
          variant="outline"
          onClick={loadHub}
          disabled={saving}
        >
          Reset
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
        >
          {saving ? (
            <><Loader2 className="size-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="size-4" /> Save Hub</>
          )}
        </Button>
      </div>
    </div>
  );
}
