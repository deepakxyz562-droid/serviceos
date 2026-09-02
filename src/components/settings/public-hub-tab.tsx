'use client';

/**
 * Public Hub Settings Tab — Public Presentation & Discovery Layer
 *
 * Single Source of Truth architecture:
 *   - Business Name, Industry, Tagline, Description, Contact, and Base Address
 *     are inherited from Company Information.
 *   - Logo and Brand Colors are inherited from Branding.
 *   - This component manages marketplace-specific discovery extensions:
 *     1. Visibility & Public URL Preview with Profile Readiness Meter (0-100%)
 *     2. Inherited Business Profile summary card
 *     3. Service Areas (Travel radius in km + served suburbs/neighborhoods)
 *     4. Photos & Portfolio Gallery (Cover Hero + Work Gallery via S3)
 *     5. Inherited Business Hours summary card
 *     6. Social Media Links
 *     7. FAQs (Customer-facing accordion + Schema.org)
 *     8. SEO Metadata (Meta title, Meta description, Google SERP preview)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Navigation,
  Building2,
  ArrowUpRight,
  Sparkles,
  Layers,
  FileCheck,
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

// ─── Types ─────────────────────────────────────────────────────────────────

interface GalleryItem {
  url: string;
  caption: string;
}

interface FaqItem {
  question: string;
  answer: string;
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
  marketplaceOptIn: boolean;
  publicSlug: string;
  city: string;
  state: string;
  postalCode: string;
  tagline: string;
  description: string;
  coverImage: string;
  gallery: GalleryItem[];
  serviceAreas: string[];
  serviceRadiusKm: number;
  socialLinks: SocialLinks;
  faqs: FaqItem[];
  seoTitle: string;
  seoDescription: string;
}

interface Props {
  tenantId: string | null;
  industry: string;
  slug: string;
  onSaved?: () => void;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export function PublicHubTab({ tenantId, industry, slug, onSaved }: Props) {
  const [form, setForm] = useState<HubForm>({
    publicProfileEnabled: false,
    marketplaceOptIn: false,
    publicSlug: '',
    city: '',
    state: '',
    postalCode: '',
    tagline: '',
    description: '',
    coverImage: '',
    gallery: [],
    serviceAreas: [],
    serviceRadiusKm: 25,
    socialLinks: {},
    faqs: [],
    seoTitle: '',
    seoDescription: '',
  });

  // Inherited snapshot fields
  const [inheritedData, setInheritedData] = useState<{
    name: string;
    logo: string | null;
    tagline: string;
    description: string;
    phone: string;
    email: string;
    website: string;
    country: string;
    hoursSummary: string;
  }>({
    name: '',
    logo: null,
    tagline: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    country: 'US',
    hoursSummary: 'Mon – Fri: 9:00 AM – 5:00 PM',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [newArea, setNewArea] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGalleryIdx, setUploadingGalleryIdx] = useState<number | null>(null);

  // ── Load Hub & Tenant Data ──────────────────────────────────────────────
  const loadHub = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}`);
      if (!res.ok) throw new Error('Failed to load tenant');
      const data = await res.json();
      const t = data.tenant;

      let gallery: GalleryItem[] = [];
      try {
        gallery = JSON.parse(t.galleryJson || '[]');
      } catch {}

      let serviceAreas: string[] = [];
      try {
        serviceAreas = JSON.parse(t.serviceAreasJson || '[]');
      } catch {}

      let socialLinks: SocialLinks = {};
      try {
        socialLinks = JSON.parse(t.socialLinksJson || '{}');
      } catch {}

      let faqs: FaqItem[] = [];
      try {
        faqs = JSON.parse(t.faqsJson || '[]');
      } catch {}

      // Format business hours summary
      let hoursSummary = 'Mon – Fri: 9:00 AM – 5:00 PM (Sat–Sun Closed)';
      if (t.businessHoursJson) {
        try {
          const parsed = JSON.parse(t.businessHoursJson);
          if (parsed && typeof parsed === 'object') {
            const openDays = Object.keys(parsed).filter((d) => !parsed[d]?.closed);
            if (openDays.length > 0) {
              hoursSummary = `${openDays.map((d) => DAY_LABELS[d] || d).join(', ')}: ${parsed[openDays[0]]?.open || '09:00'} – ${parsed[openDays[0]]?.close || '17:00'}`;
            } else {
              hoursSummary = 'Schedule set in Company Profile';
            }
          }
        } catch {}
      }

      setInheritedData({
        name: t.name || 'Your Business',
        logo: t.logo || null,
        tagline: t.tagline || '',
        description: t.description || '',
        phone: t.phone || '',
        email: t.email || '',
        website: t.website || '',
        country: t.country || 'US',
        hoursSummary,
      });

      setForm({
        publicProfileEnabled: Boolean(t.publicProfileEnabled),
        marketplaceOptIn: Boolean(t.marketplaceOptIn),
        publicSlug: t.publicSlug || '',
        city: t.city || '',
        state: t.state || '',
        postalCode: t.postalCode || '',
        tagline: t.tagline || '',
        description: t.description || '',
        coverImage: t.coverImage || '',
        gallery,
        serviceAreas,
        serviceRadiusKm: typeof t.serviceRadiusKm === 'number' ? t.serviceRadiusKm : 25,
        socialLinks,
        faqs,
        seoTitle: t.seoTitle || '',
        seoDescription: t.seoDescription || '',
      });
      setPublicUrl(t.publicUrl || null);
    } catch (err) {
      console.error('[PublicHubTab] Error loading hub:', err);
      toast.error('Network error loading marketplace settings');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadHub();
  }, [loadHub]);

  // ── Save Handler ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicProfileEnabled: form.publicProfileEnabled,
          marketplaceOptIn: form.marketplaceOptIn,
          publicSlug: form.publicSlug,
          coverImage: form.coverImage,
          galleryJson: JSON.stringify(form.gallery),
          serviceAreasJson: JSON.stringify(form.serviceAreas),
          serviceRadiusKm: form.serviceRadiusKm,
          socialLinksJson: JSON.stringify(form.socialLinks),
          faqsJson: JSON.stringify(form.faqs),
          seoTitle: form.seoTitle,
          seoDescription: form.seoDescription,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPublicUrl(data.tenant.publicUrl || null);
        toast.success('Marketplace & Public Hub settings saved!');
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Network error saving hub settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Image Upload Helper ──────────────────────────────────────────────────
  const uploadImage = async (file: File, folder: string): Promise<string> => {
    if (!tenantId) throw new Error('No tenant ID');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'company-assets');
    formData.append('folder', folder);

    const res = await authFetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }
    const data = await res.json();
    return data.url;
  };

  // ── URL Preview & Readiness Score ────────────────────────────────────────
  const urlIndustry = (industry || 'services').toLowerCase().replace(/\s+/g, '-');
  const urlCity = (form.city || 'city').toLowerCase().replace(/\s+/g, '-');
  const urlSlug = (form.publicSlug || slug || 'profile').toLowerCase().replace(/\s+/g, '-');
  const urlPreview = `${urlIndustry}/${urlCity}/${urlSlug}`;

  // Compute profile readiness percentage
  const checks = [
    { label: 'Business Name', ok: Boolean(inheritedData.name) },
    { label: 'Base Location & Country', ok: Boolean(form.city && inheritedData.country) },
    { label: 'Business Logo', ok: Boolean(inheritedData.logo) },
    { label: 'Business Tagline / Description', ok: Boolean(inheritedData.tagline || inheritedData.description) },
    { label: 'Cover Image or Gallery', ok: Boolean(form.coverImage || form.gallery.length > 0) },
    { label: 'Service Areas', ok: form.serviceAreas.length > 0 || form.serviceRadiusKm > 0 },
  ];
  const passedChecks = checks.filter((c) => c.ok).length;
  const readinessPct = Math.round((passedChecks / checks.length) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading public profile settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. Visibility, Public URL & Readiness Meter ───────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Public Hub & Marketplace Visibility</CardTitle>
                <CardDescription>Control your public-facing profile and discovery listing on Fieseros</CardDescription>
              </div>
            </div>

            {/* Live Badges */}
            <div className="flex items-center gap-2">
              {form.publicProfileEnabled ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> Public Page Live
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1.5">
                  <span className="size-2 rounded-full bg-muted-foreground" /> Page Offline
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
              <div className="space-y-1">
                <Label htmlFor="hub-enabled" className="text-sm font-semibold">Enable Public Business Page</Label>
                <p className="text-xs text-muted-foreground">
                  Publishes your verified business landing page at your dedicated URL.
                </p>
              </div>
              <Switch
                id="hub-enabled"
                checked={form.publicProfileEnabled}
                onCheckedChange={(v) => setForm({ ...form, publicProfileEnabled: v })}
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20">
              <div className="space-y-1">
                <Label htmlFor="marketplace-optin" className="text-sm font-semibold">List in Marketplace Directory</Label>
                <p className="text-xs text-muted-foreground">
                  Displays your business in search, city directories, and category results.
                </p>
              </div>
              <Switch
                id="marketplace-optin"
                checked={form.marketplaceOptIn}
                onCheckedChange={(v) => setForm({ ...form, marketplaceOptIn: v })}
              />
            </div>
          </div>

          {/* URL Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your Public Dedicated URL</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30 font-mono text-xs sm:text-sm break-all">
              <span className="text-muted-foreground">https://fieseros.com/</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">{urlPreview}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-1.5">
              <Label htmlFor="public-slug" className="text-sm font-medium">Custom Public Slug</Label>
              <Input
                id="public-slug"
                value={form.publicSlug}
                onChange={(e) => setForm({ ...form, publicSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder={slug || 'acme-services'}
                className="font-mono text-sm h-9"
              />
            </div>

            <div className="pt-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!form.publicProfileEnabled}
                onClick={() => {
                  if (publicUrl) window.open(publicUrl, '_blank');
                  else window.open(`/${urlPreview}`, '_blank');
                }}
                className="gap-1.5 w-full sm:w-auto text-xs font-medium"
              >
                <ExternalLink className="size-3.5" />
                Preview Live Page
              </Button>
            </div>
          </div>

          {/* Profile Readiness Meter */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                <span className="text-sm font-semibold">Public Profile Readiness</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{readinessPct}% Complete</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                style={{ width: `${readinessPct}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-1.5 text-xs">
                  {c.ok ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="size-3.5 text-muted-foreground/60 shrink-0" />
                  )}
                  <span className={c.ok ? 'text-foreground font-medium' : 'text-muted-foreground'}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. Inherited Business Profile (Read-Only) ─────────────────── */}
      <Card className="border-emerald-200/60 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Building2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-sm font-bold">Business Information (Inherited)</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Source of Truth: <strong>Company Information</strong>
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Business Name</p>
              <p className="font-semibold text-foreground text-sm mt-0.5">{inheritedData.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Industry & Region</p>
              <p className="font-medium text-foreground mt-0.5">{industry || 'Home Services'} · {inheritedData.country}</p>
            </div>
            {inheritedData.tagline && (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Tagline</p>
                <p className="font-medium text-foreground italic mt-0.5">&ldquo;{inheritedData.tagline}&rdquo;</p>
              </div>
            )}
            {inheritedData.description && (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Description</p>
                <p className="text-muted-foreground mt-0.5 line-clamp-2">{inheritedData.description}</p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
            <FileCheck className="size-3.5 text-emerald-600 shrink-0" />
            To update your business name, tagline, description, or physical address, edit your <strong>Company Information</strong> tab.
          </p>
        </CardContent>
      </Card>

      {/* ─── 3. Service Areas & Travel Radius ─────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Service Areas & Travel Radius</CardTitle>
              <CardDescription>Configure which suburbs, cities, and distance radius your technicians cover</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Base Location Note */}
          <div className="flex items-center gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border">
            <MapPin className="size-3.5 text-emerald-600 shrink-0" />
            <span>
              Primary Base: <strong>{form.city || 'City'}, {form.state || 'State'} ({inheritedData.country})</strong> — automatically synced from Company Address.
            </span>
          </div>

          {/* Travel Radius */}
          <div className="space-y-2">
            <Label htmlFor="service-radius" className="text-sm font-medium flex items-center gap-1.5">
              <Navigation className="size-3.5 text-emerald-600" />
              Customer Travel Radius (km)
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="service-radius"
                type="number"
                min={0}
                max={500}
                step={5}
                value={form.serviceRadiusKm}
                onChange={(e) => setForm({ ...form, serviceRadiusKm: Number(e.target.value) || 0 })}
                className="max-w-[150px] h-9 text-xs"
              />
              <span className="text-xs text-muted-foreground">
                {form.serviceRadiusKm === 0 ? 'Will travel anywhere' : `Covers up to ${form.serviceRadiusKm} km from base`}
              </span>
            </div>
          </div>

          <Separator />

          {/* Specific Suburbs Chips */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Served Neighborhoods & Suburbs</Label>
            <p className="text-xs text-muted-foreground">Add specific suburbs or districts for hyper-local marketplace matching.</p>
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
                placeholder="e.g. Richmond, South Yarra, St Kilda"
                className="h-9 text-xs"
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
                className="gap-1.5 h-9 text-xs"
              >
                <Plus className="size-3.5" /> Add Suburb
              </Button>
            </div>
            {form.serviceAreas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {form.serviceAreas.map((area, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pl-2.5 pr-1 py-0.5 text-xs">
                    {area}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, serviceAreas: form.serviceAreas.filter((_, idx) => idx !== i) })}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <Trash2 className="size-3 text-muted-foreground hover:text-red-600" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. Photos & Work Gallery ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <ImageIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Photos & Work Portfolio</CardTitle>
              <CardDescription>Hero cover image and gallery showcasing your past projects and equipment</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Cover Hero Image */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Hero Cover Image</Label>
            {form.coverImage ? (
              <div className="relative group rounded-xl overflow-hidden border border-border max-w-md h-44 bg-muted">
                <img src={form.coverImage} alt="Cover" className="size-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setForm({ ...form, coverImage: '' })}
                    className="gap-1 text-xs"
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full max-w-md h-36 rounded-xl border-2 border-dashed border-border hover:border-emerald-500 cursor-pointer bg-muted/20 text-muted-foreground">
                <Upload className="size-5" />
                <span className="text-xs font-medium">Upload Cover Hero Banner</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingCover(true);
                    try {
                      const url = await uploadImage(file, 'cover');
                      setForm((prev) => ({ ...prev, coverImage: url }));
                      toast.success('Cover image uploaded');
                    } catch {
                      toast.error('Failed to upload cover image');
                    } finally {
                      setUploadingCover(false);
                    }
                  }}
                />
              </label>
            )}
          </div>

          <Separator />

          {/* Portfolio Gallery */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Portfolio Photo Gallery</Label>
              <label className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
                  <span>
                    <Upload className="size-3.5" /> Upload Portfolio Photo
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadImage(file, 'gallery');
                      setForm((prev) => ({
                        ...prev,
                        gallery: [...prev.gallery, { url, caption: '' }],
                      }));
                      toast.success('Photo added to gallery');
                    } catch {
                      toast.error('Failed to upload photo');
                    }
                  }}
                />
              </label>
            </div>

            {form.gallery.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No portfolio photos yet. Upload photos to enhance customer trust.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {form.gallery.map((item, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-border bg-muted h-28">
                    <img src={item.url} alt={`Gallery ${idx + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }))}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── 5. Inherited Operating Hours ──────────────────────────────── */}
      <Card className="border-border bg-muted/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-sm font-bold">Operating Hours (Inherited)</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-medium">{inheritedData.hoursSummary}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Marketplace visitors see your live open/closed status and schedule based on the weekly hours configured under <strong>Company Information → Business Hours</strong>.
          </p>
        </CardContent>
      </Card>

      {/* ─── 6. Social Media & FAQs ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Share2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Social Media Profiles</CardTitle>
              <CardDescription>Connect your official social media pages</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'] as const).map((network) => (
            <div key={network} className="space-y-1.5">
              <Label className="text-xs font-medium capitalize">{network}</Label>
              <Input
                placeholder={`https://${network}.com/yourpage`}
                value={form.socialLinks[network] || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    socialLinks: { ...form.socialLinks, [network]: e.target.value },
                  })
                }
                className="h-9 text-xs"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── 7. FAQs ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <HelpCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Frequently Asked Questions (FAQs)</CardTitle>
                <CardDescription>Answer common customer questions on your public page</CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, faqs: [...form.faqs, { question: '', answer: '' }] })}
              className="gap-1 text-xs"
            >
              <Plus className="size-3.5" /> Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.faqs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No FAQs added yet.</p>
          ) : (
            form.faqs.map((faq, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    placeholder="Question (e.g. Do you provide emergency same-day service?)"
                    value={faq.question}
                    onChange={(e) => {
                      const next = [...form.faqs];
                      next[i].question = e.target.value;
                      setForm({ ...form, faqs: next });
                    }}
                    className="text-xs font-semibold h-9"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setForm({ ...form, faqs: form.faqs.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 className="size-3.5 text-red-600" />
                  </Button>
                </div>
                <Textarea
                  placeholder="Answer..."
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => {
                    const next = [...form.faqs];
                    next[i].answer = e.target.value;
                    setForm({ ...form, faqs: next });
                  }}
                  className="text-xs"
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ─── 8. SEO Metadata ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Search className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">Search Engine Optimization (SEO)</CardTitle>
              <CardDescription>Custom metadata for Google and search engine rankings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Custom SEO Title</Label>
            <Input
              placeholder={`${inheritedData.name} | Top-Rated ${industry || 'Services'} in ${form.city || 'Your City'}`}
              value={form.seoTitle}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Meta Description</Label>
            <Textarea
              placeholder="Search snippet description shown in Google search results..."
              rows={2}
              value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* ─── Save Changes ──────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 px-6 font-semibold shadow-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'Saving...' : 'Save Marketplace Settings'}
        </Button>
      </div>
    </div>
  );
}
