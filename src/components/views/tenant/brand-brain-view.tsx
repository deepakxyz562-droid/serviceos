'use client';

/**
 * BrandBrainView — Engine 4 (tenant-facing)
 * -----------------------------------------
 * Captures the tenant's brand identity so every AI-generated piece of content
 * (emails, SMS, WhatsApp, social posts, suggested replies) is on-brand.
 *
 * Layout: two columns on desktop.
 *   - LEFT  = a long form organised into 5 sections (Identity, Audience,
 *             Voice, Offering, Competitors) + an "AI Assist" button at the top
 *             that opens a dialog where the tenant enters their website URL
 *             and we scrape + LLM-synthesise a starting BrandProfile.
 *   - RIGHT = a sticky live preview that re-renders the formatted system
 *             prompt the AI will receive, plus the AI-generated "brand
 *             snapshot" (2-3 sentence summary) once the profile is saved.
 *
 * Persistence:
 *   - GET  /api/brand-profile          — loads the existing BrandProfile
 *   - PUT  /api/brand-profile          — upserts the profile + regenerates
 *                                        the AI summary on save
 *   - POST /api/brand-profile/ai-generate — website → suggested fields
 *
 * All list-shaped fields (services, products, forbiddenPhrases, competitors)
 * are edited via a small inline TagInput component (badge + remove on click,
 * Enter to add).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Sparkles,
  Save,
  Loader2,
  Plus,
  X,
  Globe,
  Wand2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Building2,
  Users,
  MessageSquare,
  Package,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

const TONE_OPTIONS = [
  'Professional',
  'Friendly',
  'Casual',
  'Luxury',
  'Playful',
  'Authoritative',
] as const;
type ToneOption = (typeof TONE_OPTIONS)[number];

interface BrandProfileForm {
  businessName: string;
  industry: string;
  website: string;
  location: string;
  serviceArea: string;
  targetCustomer: string;
  customerPainPoints: string;
  tone: string;
  voiceDescription: string;
  forbiddenPhrases: string[];
  defaultCta: string;
  services: string[];
  products: string[];
  usps: string;
  currentOffers: string;
  competitors: string[];
}

interface BrandProfileRecord extends BrandProfileForm {
  id: string;
  aiGeneratedSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM: BrandProfileForm = {
  businessName: '',
  industry: '',
  website: '',
  location: '',
  serviceArea: '',
  targetCustomer: '',
  customerPainPoints: '',
  tone: 'Professional',
  voiceDescription: '',
  forbiddenPhrases: [],
  defaultCta: '',
  services: [],
  products: [],
  usps: '',
  currentOffers: '',
  competitors: [],
};

/** Parse a JSON-array column into a clean string[]. */
function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  } catch {
    // ignore
  }
  return [];
}

/** Map a DB BrandProfile row into the form's shape. */
function recordToForm(record: Partial<BrandProfileRecord>): BrandProfileForm {
  return {
    businessName: record.businessName ?? '',
    industry: record.industry ?? '',
    website: record.website ?? '',
    location: record.location ?? '',
    serviceArea: record.serviceArea ?? '',
    targetCustomer: record.targetCustomer ?? '',
    customerPainPoints: record.customerPainPoints ?? '',
    tone: record.tone ?? 'Professional',
    voiceDescription: record.voiceDescription ?? '',
    forbiddenPhrases: Array.isArray(record.forbiddenPhrases)
      ? record.forbiddenPhrases
      : parseList(record.forbiddenPhrases as unknown as string),
    defaultCta: record.defaultCta ?? '',
    services: Array.isArray(record.services)
      ? record.services
      : parseList(record.services as unknown as string),
    products: Array.isArray(record.products)
      ? record.products
      : parseList(record.products as unknown as string),
    usps: record.usps ?? '',
    currentOffers: record.currentOffers ?? '',
    competitors: Array.isArray(record.competitors)
      ? record.competitors
      : parseList(record.competitors as unknown as string),
  };
}

// ─── Small reusable TagInput ───────────────────────────────────────────────

interface TagInputProps {
  label: string;
  description?: string;
  placeholder?: string;
  values: string[];
  onChange: (next: string[]) => void;
  /** When true, treats entered values as URLs (slightly different placeholder). */
  urlMode?: boolean;
}

function TagInput({
  label,
  description,
  placeholder = 'Add item…',
  values,
  onChange,
  urlMode = false,
}: TagInputProps) {
  const [draft, setDraft] = useState('');

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    // Dedupe case-insensitively.
    if (values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, trimmed]);
    setDraft('');
  }, [draft, values, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={urlMode ? 'https://competitor-site.com' : placeholder}
          inputMode={urlMode ? 'url' : 'text'}
          className="text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={commit}
          className="shrink-0"
          aria-label={`Add to ${label}`}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((v, idx) => (
            <Badge key={`${v}-${idx}`} variant="secondary" className="gap-1 text-xs pr-1.5">
              <span className="max-w-[260px] truncate">{v}</span>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                aria-label={`Remove ${v}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Icon className="size-4" />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// ─── Live preview builder ──────────────────────────────────────────────────

/**
 * Build the same system-prompt string the backend `getBrandContext()` will
 * produce, so the user can see exactly what the AI sees. Kept in sync by
 * hand — if the backend format changes, update this mirror too.
 */
function buildPreviewString(form: BrandProfileForm): string {
  const lines: string[] = [];
  const industry = form.industry.trim() || 'service';
  const location = form.location.trim();
  const opener = location
    ? `You are writing content for ${form.businessName.trim() || 'your business'}, a ${industry} business in ${location}.`
    : `You are writing content for ${form.businessName.trim() || 'your business'}, a ${industry} business.`;
  lines.push(opener);

  if (form.serviceArea.trim()) lines.push(`Service area: ${form.serviceArea.trim()}`);
  if (form.website.trim()) lines.push(`Website: ${form.website.trim()}`);
  if (form.targetCustomer.trim()) lines.push(`Target audience: ${form.targetCustomer.trim()}`);
  if (form.customerPainPoints.trim()) lines.push(`Customer pain points: ${form.customerPainPoints.trim()}`);

  const voiceParts: string[] = [];
  if (form.tone.trim()) voiceParts.push(form.tone.trim());
  if (form.voiceDescription.trim()) voiceParts.push(form.voiceDescription.trim());
  if (voiceParts.length > 0) lines.push(`Brand voice: ${voiceParts.join(' — ')}`);

  if (form.forbiddenPhrases.length > 0) {
    lines.push(`Avoid these phrases: ${form.forbiddenPhrases.join(', ')}`);
  }
  if (form.defaultCta.trim()) lines.push(`Call to action: ${form.defaultCta.trim()}`);
  if (form.services.length > 0) lines.push(`Key services: ${form.services.join(', ')}`);
  if (form.products.length > 0) lines.push(`Products: ${form.products.join(', ')}`);
  if (form.usps.trim()) lines.push(`USPs (unique selling points): ${form.usps.trim()}`);
  if (form.currentOffers.trim()) lines.push(`Current offers: ${form.currentOffers.trim()}`);
  if (form.competitors.length > 0) {
    lines.push(
      `Known competitors (differentiate from, do not mention by name unless asked): ${form.competitors.join(', ')}`,
    );
  }

  lines.push(
    'Stay on-brand: match the tone above, use the customer\'s language for pain points, ' +
      'and end with the call to action when appropriate.',
  );

  return lines.join('\n');
}

// ─── AI Assist dialog ──────────────────────────────────────────────────────

interface AiAssistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (suggestion: BrandProfileForm) => void;
  initialWebsite: string;
}

function AiAssistDialog({
  open,
  onOpenChange,
  onApply,
  initialWebsite,
}: AiAssistDialogProps) {
  const [website, setWebsite] = useState(initialWebsite);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the dialog input in sync when the form's website field changes
  // (e.g. when the user has already typed their site in the Identity card).
  useEffect(() => {
    if (open) {
      setWebsite(initialWebsite);
      setError(null);
    }
  }, [open, initialWebsite]);

  const handleGenerate = async () => {
    setError(null);
    const trimmed = website.trim();
    if (!trimmed) {
      setError('Please enter your website URL.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/brand-profile/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to generate brand profile suggestions.');
        return;
      }
      const s = data?.suggestion;
      if (!s || typeof s !== 'object') {
        setError('The AI response was malformed. Please try again.');
        return;
      }
      // Merge the suggestion with EMPTY_FORM defaults so no field is ever
      // undefined, then call onApply to fill the parent form.
      const merged: BrandProfileForm = {
        ...EMPTY_FORM,
        businessName: s.businessName || '',
        industry: s.industry || '',
        website: s.website || trimmed,
        location: s.location || '',
        serviceArea: s.serviceArea || '',
        targetCustomer: s.targetCustomer || '',
        customerPainPoints: s.customerPainPoints || '',
        tone: s.tone || 'Professional',
        voiceDescription: s.voiceDescription || '',
        forbiddenPhrases: Array.isArray(s.forbiddenPhrases) ? s.forbiddenPhrases : [],
        defaultCta: s.defaultCta || '',
        services: Array.isArray(s.services) ? s.services : [],
        products: Array.isArray(s.products) ? s.products : [],
        usps: s.usps || '',
        currentOffers: s.currentOffers || '',
        competitors: Array.isArray(s.competitors) ? s.competitors : [],
      };
      onApply(merged);
      onOpenChange(false);
      toast.success('Brand profile suggestions applied', {
        description: 'Review the fields and adjust anything that needs tweaking, then Save.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-4 text-emerald-600" />
            AI Assist — auto-fill from your website
          </DialogTitle>
          <DialogDescription>
            Enter your business website URL. We&apos;ll fetch the homepage and ask our AI to
            suggest a complete brand profile you can review and edit.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-assist-website" className="text-sm">
              Website URL
            </Label>
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ai-assist-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://your-business.com"
                className="pl-9 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Tip: this works best on marketing sites with clear service descriptions. JS-only
            apps or login-walled pages may return sparse results.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Generate suggestions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────

export function BrandBrainView() {
  const [form, setForm] = useState<BrandProfileForm>(EMPTY_FORM);
  const [savedRecord, setSavedRecord] = useState<BrandProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // ── Load existing BrandProfile on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/brand-profile', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) {
            toast.error('Failed to load brand profile', {
              description: `HTTP ${res.status}`,
            });
          }
          return;
        }
        const data = await res.json();
        const profile = data?.profile;
        if (!cancelled) {
          if (profile) {
            const formState = recordToForm(profile);
            setForm(formState);
            setSavedRecord(profile as BrandProfileRecord);
          } else {
            setForm(EMPTY_FORM);
            setSavedRecord(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Network error';
          toast.error('Failed to load brand profile', { description: msg });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Field setters ──────────────────────────────────────────────────────
  const updateField = useCallback(
    <K extends keyof BrandProfileForm>(key: K, value: BrandProfileForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Save handler ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }
    if (!form.industry.trim()) {
      toast.error('Industry is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/brand-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error('Failed to save', { description: data?.error || `HTTP ${res.status}` });
        return;
      }
      const profile = data?.profile;
      if (profile) {
        setSavedRecord(profile as BrandProfileRecord);
        setForm(recordToForm(profile));
      }
      toast.success('Brand profile saved', {
        description: 'Your AI-generated content will now stay on-brand.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      toast.error('Failed to save', { description: msg });
    } finally {
      setSaving(false);
    }
  };

  // ── Live preview string (right column) ─────────────────────────────────
  const previewString = useMemo(() => buildPreviewString(form), [form]);

  const hasRequiredFields = form.businessName.trim() && form.industry.trim();

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between md:py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Brain className="size-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Brand Brain
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Capture your brand identity so every AI-generated email, SMS, and post sounds like you.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AiAssistDialog
              open={aiDialogOpen}
              onOpenChange={setAiDialogOpen}
              initialWebsite={form.website}
              onApply={(suggestion) => {
                setForm(suggestion);
              }}
            />
            <Button
              variant="outline"
              onClick={() => setAiDialogOpen(true)}
              disabled={loading || saving}
              className="gap-2"
            >
              <Wand2 className="size-4" />
              <span className="hidden sm:inline">AI Assist</span>
              <span className="sm:hidden">AI</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || saving || !hasRequiredFields}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Body — two-column on desktop */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            {/* ── LEFT: form ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              {/* Identity */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={Building2}
                    title="Identity"
                    description="Who you are and where you operate."
                  />
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="bp-businessName" className="text-sm font-medium">
                      Business name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bp-businessName"
                      value={form.businessName}
                      onChange={(e) => updateField('businessName', e.target.value)}
                      placeholder="Acme Plumbing Co."
                      className="text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bp-industry" className="text-sm font-medium">
                      Industry <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bp-industry"
                      value={form.industry}
                      onChange={(e) => updateField('industry', e.target.value)}
                      placeholder="Plumbing, HVAC, Landscaping…"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bp-website" className="text-sm font-medium">
                      Website
                    </Label>
                    <div className="relative">
                      <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="bp-website"
                        value={form.website}
                        onChange={(e) => updateField('website', e.target.value)}
                        placeholder="https://acme-plumbing.com"
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bp-location" className="text-sm font-medium">
                      Location
                    </Label>
                    <Input
                      id="bp-location"
                      value={form.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder="Austin, TX"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bp-serviceArea" className="text-sm font-medium">
                      Service area
                    </Label>
                    <Input
                      id="bp-serviceArea"
                      value={form.serviceArea}
                      onChange={(e) => updateField('serviceArea', e.target.value)}
                      placeholder="Greater Austin, 30-mile radius"
                      className="text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Target Audience */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={Users}
                    title="Target Audience"
                    description="Who you serve and what they struggle with."
                  />
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bp-targetCustomer" className="text-sm font-medium">
                      Ideal customer
                    </Label>
                    <Textarea
                      id="bp-targetCustomer"
                      value={form.targetCustomer}
                      onChange={(e) => updateField('targetCustomer', e.target.value)}
                      placeholder="Homeowners aged 35-65 in suburban Austin, busy professionals who value reliability over cheap prices."
                      className="min-h-[70px] text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bp-painPoints" className="text-sm font-medium">
                      Customer pain points
                    </Label>
                    <Textarea
                      id="bp-painPoints"
                      value={form.customerPainPoints}
                      onChange={(e) => updateField('customerPainPoints', e.target.value)}
                      placeholder="Can't get a same-day appointment, tired of no-shows, worried about hidden fees."
                      className="min-h-[70px] text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Brand Voice */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={MessageSquare}
                    title="Brand Voice"
                    description="How you sound — tone, style, and what to never say."
                  />
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="bp-tone" className="text-sm font-medium">
                        Tone
                      </Label>
                      <Select
                        value={form.tone}
                        onValueChange={(v) => updateField('tone', v)}
                      >
                        <SelectTrigger id="bp-tone" className="text-sm">
                          <SelectValue placeholder="Select a tone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="bp-cta" className="text-sm font-medium">
                        Default call-to-action
                      </Label>
                      <Input
                        id="bp-cta"
                        value={form.defaultCta}
                        onChange={(e) => updateField('defaultCta', e.target.value)}
                        placeholder="Book online today"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bp-voice" className="text-sm font-medium">
                      Voice description
                    </Label>
                    <Textarea
                      id="bp-voice"
                      value={form.voiceDescription}
                      onChange={(e) => updateField('voiceDescription', e.target.value)}
                      placeholder="Warm and knowledgeable. Speak like a friendly neighbour who happens to be an expert. Use plain English, not trade jargon."
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                  <TagInput
                    label="Forbidden phrases"
                    description="Words or phrases the AI should never use (e.g. 'cheap', 'discount', 'free estimate')."
                    placeholder="Add a phrase…"
                    values={form.forbiddenPhrases}
                    onChange={(next) => updateField('forbiddenPhrases', next)}
                  />
                </CardContent>
              </Card>

              {/* Offering */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={Package}
                    title="Offering"
                    description="What you sell, what makes you different, and any active promotions."
                  />
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <TagInput
                    label="Services"
                    description="Press Enter or comma to add. List your core service offerings."
                    placeholder="Drain cleaning, Water heater repair…"
                    values={form.services}
                    onChange={(next) => updateField('services', next)}
                  />
                  <TagInput
                    label="Products"
                    description="Physical products or packages you sell (optional)."
                    placeholder="Water heaters, Filtration systems…"
                    values={form.products}
                    onChange={(next) => updateField('products', next)}
                  />
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bp-usps" className="text-sm font-medium">
                      Unique selling points (USPs)
                    </Label>
                    <Textarea
                      id="bp-usps"
                      value={form.usps}
                      onChange={(e) => updateField('usps', e.target.value)}
                      placeholder="Family-owned since 1998, upfront flat-rate pricing, 5-star rated on Google, 1-year warranty on all repairs."
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bp-offers" className="text-sm font-medium">
                      Current offers
                    </Label>
                    <Textarea
                      id="bp-offers"
                      value={form.currentOffers}
                      onChange={(e) => updateField('currentOffers', e.target.value)}
                      placeholder="$50 off first service, free whole-home plumbing inspection with any repair over $300."
                      className="min-h-[70px] text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Competitors */}
              <Card>
                <CardHeader>
                  <SectionHeader
                    icon={Trophy}
                    title="Competitors"
                    description="We'll differentiate from them — never mention by name unless you ask."
                  />
                </CardHeader>
                <CardContent>
                  <TagInput
                    label="Competitor URLs"
                    placeholder="https://competitor-site.com"
                    values={form.competitors}
                    onChange={(next) => updateField('competitors', next)}
                    urlMode
                  />
                </CardContent>
              </Card>
            </div>

            {/* ── RIGHT: live preview ─────────────────────────────────── */}
            <aside className="lg:sticky lg:top-[100px] lg:h-fit lg:max-h-[calc(100vh-120px)]">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-600" />
                    <CardTitle className="text-sm font-semibold">AI Live Preview</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    This is the brand context the AI sees when generating content for you.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {/* Brand snapshot (AI-generated summary) */}
                  <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      <Brain className="size-3.5" />
                      Brand snapshot
                      {savedRecord?.aiGeneratedSummary && (
                        <CheckCircle2 className="ml-auto size-3.5" />
                      )}
                    </div>
                    {savedRecord?.aiGeneratedSummary ? (
                      <p className="text-xs leading-relaxed text-foreground">
                        {savedRecord.aiGeneratedSummary}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        Save your profile and the AI will synthesise a 2-3 sentence brand
                        snapshot shown here.
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Full system prompt preview */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-muted-foreground">
                        System prompt
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(previewString)
                            .then(() => toast.success('Copied to clipboard'))
                            .catch(() => toast.error('Copy failed'));
                        }}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-[11px] leading-relaxed text-foreground/90">
                      {previewString}
                    </pre>
                  </div>

                  {/* Status footer */}
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                    {savedRecord ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        <span>
                          Last saved {new Date(savedRecord.updatedAt).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="size-3.5 text-amber-500" />
                        <span>Not saved yet — fill the form and click Save.</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default BrandBrainView;
