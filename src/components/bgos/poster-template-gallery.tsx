'use client';
import {DESIGN_FONT_CSS,designFontFamily} from '../../../shared/design-fonts';

/**
 * Poster Template Gallery — Flyer-Maker-style visual entry for the marketing studio.
 *
 * Renders live, pixel-consistent thumbnails straight from the shared design model
 * (same composition used by the canvas editor and server-side PNG export), so what
 * the user sees in the gallery is exactly what they get on the canvas.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, Wand2, ArrowRight, Loader2, RefreshCw, Send, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  POSTER_CATEGORIES,
  buildTemplateDesignDoc,
  getActivePosterOccasions,
  matchIndustryScore,
  orderTemplatesForGallery,
  type PosterAspect,
  type PosterCategoryMeta,
  type PosterTemplate,
} from '../../../shared/poster-templates';
import { getFestivalGroupsWithCounts } from '../../../shared/festival-catalog';
import type { DesignLayer, MarketingDesign } from '../../../shared/marketing-design';

export interface PosterGalleryBusinessContext {
  businessName?: string;
  category?: string;
  phone?: string;
  website?: string;
  logoUrl?: string | null;
  tagline?: string;
}

interface PosterTemplateGalleryProps {
  business: PosterGalleryBusinessContext;
  onSelect: (template: PosterTemplate) => void;
  onStartFromPrompt: () => void;
  busyTemplateId?: string | null;
}

const ASPECT_CSS: Record<PosterAspect, string> = {
  '1:1': '1 / 1',
  '4:5': '4 / 5',
  '9:16': '9 / 16',
  '16:9': '16 / 9',
};

function PosterPhoto({layer}:{layer:DesignLayer}) {
  const [failed,setFailed] = useState(false);
  if(failed)return <div className="flex h-full items-center justify-center bg-muted p-2 text-center text-[10px] text-muted-foreground">Image unavailable — replace photo</div>;
  const thumbnail = layer.src?.startsWith('https://images.unsplash.com/') ? layer.src.replace(/w=\d+/, 'w=720') : layer.src;
  return <img src={thumbnail} alt="" draggable={false} loading="lazy" onError={()=>setFailed(true)} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${layer.cropX??50}% ${layer.cropY??50}%`}}/>;
}

/** Static, scaled rendering of a design document (no edit chrome). */
function DesignThumb({ doc, className }: { doc: MarketingDesign; className?: string }) {
  return (
    <div
      className={cn('relative overflow-hidden select-none pointer-events-none', className)}
      style={{
        containerType: 'inline-size',
        width: '100%',
        aspectRatio: `${doc.width} / ${doc.height}`,
        backgroundColor: doc.background,
      }}
      aria-hidden="true"
    >
      <style>{DESIGN_FONT_CSS}</style>
      {doc.layers.map((l: DesignLayer) => (
        <div
          key={l.id}
          style={{
            position: 'absolute',
            left: `${(l.x / doc.width) * 100}%`,
            top: `${(l.y / doc.height) * 100}%`,
            width: `${(l.width / doc.width) * 100}%`,
            height: `${(l.height / doc.height) * 100}%`,
            color: l.color,
            backgroundColor: l.background === 'transparent' ? undefined : l.background,
            opacity: l.opacity,
            fontSize: `${(l.fontSize / doc.width) * 100}cqw`,
            fontWeight: (l as DesignLayer & { fontWeight?: number }).fontWeight ?? 400,
            letterSpacing: (l as DesignLayer & { letterSpacing?: number }).letterSpacing
              ? `${(l as DesignLayer & { letterSpacing?: number }).letterSpacing}px`
              : undefined,
            lineHeight: l.lineHeight??1.15,
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            display: 'flex',
            alignItems: (l as DesignLayer & { alignItems?: string }).alignItems || 'flex-start',
            justifyContent:
              (l as DesignLayer & { justifyContent?: string }).justifyContent || 'flex-start',
            borderRadius: (l as DesignLayer & { borderRadius?: number }).borderRadius
              ? `${((l.borderRadius || 0) / doc.width) * 100}cqw`
              : undefined,
            borderWidth: (l as DesignLayer & { borderWidth?: number }).borderWidth || undefined,
            borderColor: (l as DesignLayer & { borderColor?: string }).borderColor,
            borderStyle:
              (l as DesignLayer & { borderWidth?: number }).borderWidth ? 'solid' : undefined,
            transform: `rotate(${l.rotation ?? 0}deg)`,
            fontFamily: designFontFamily(l),
            textAlign: l.textAlign || 'left',
          }}
        >
          {l.type === 'image' && l.src ? (
            <PosterPhoto key={l.src} layer={l} />
          ) : l.type === 'text' ? (
            <span style={{ width: '100%' }}>{l.text}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CategoryChip({
  active,
  label,
  emoji,
  onClick,
}: {
  active: boolean;
  label: string;
  emoji?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
          : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
      )}
    >
      {emoji && <span aria-hidden="true">{emoji}</span>}
      {label}
    </button>
  );
}

function TemplateCard({
  template,
  doc,
  isLive,
  busy,
  onSelect,
}: {
  template: PosterTemplate;
  doc: MarketingDesign;
  isLive: boolean;
  busy: boolean;
  onSelect: (t: PosterTemplate) => void;
}) {
  const categoryName = POSTER_CATEGORIES.find((c) => c.id === template.category)?.name ?? '';
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      disabled={busy}
      className="group relative rounded-2xl overflow-hidden border border-border/80 bg-card shadow-2xs hover:shadow-md hover:border-primary/40 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      aria-label={`Use ${template.name} template`}
    >
      <div className="relative">
        <DesignThumb doc={doc} />
        {isLive && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-500/95 text-white text-[10px] font-bold px-2 py-0.5 shadow-xs">
            <span aria-hidden="true">🪔</span> Live now
          </span>
        )}
        {busy && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] flex items-center justify-center">
            <Loader2 className="size-5 text-primary animate-spin" aria-hidden="true" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold px-4 py-2 shadow-md">
            <Wand2 className="size-3.5" /> Use template
          </span>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-foreground truncate">{template.name}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {categoryName} · {template.aspect}
        </p>
      </div>
    </button>
  );
}

export function PosterTemplateGallery({
  business,
  onSelect,
  onStartFromPrompt,
  busyTemplateId,
}: PosterTemplateGalleryProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'for_you' | 'all' | string>('for_you');
  const [selectedFestivalKey, setSelectedFestivalKey] = useState<string>('all');

  // ── AI Image & Post Studio Modal State ──
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'4:5' | '1:1' | '9:16'>('4:5');
  const [generatedPhotoUrl, setGeneratedPhotoUrl] = useState<string | null>(null);
  const [generatedSeo, setGeneratedSeo] = useState<{
    title: string;
    description: string;
    tags: string[];
    category?: string;
  } | null>(null);
  const [activeGeneratingStep, setActiveGeneratingStep] = useState<string>('');
  const [refreshingSuggestions, setRefreshingSuggestions] = useState(false);

  const [businessSuggestions, setBusinessSuggestions] = useState<
    Array<{ id: string; title: string; promptBlueprint: string; icon?: string; badge?: string }>
  >([]);
  const [generatingImages, setGeneratingImages] = useState(false);

  const festivalGroups = useMemo(() => getFestivalGroupsWithCounts(), []);

  const fetchSuggestions = async (refresh = false) => {
    if (!business.category && !business.businessName) return;
    if (refresh) setRefreshingSuggestions(true);
    try {
      const params = new URLSearchParams();
      if (business.category) params.set('category', business.category);
      if (business.businessName) params.set('businessName', business.businessName);
      if (refresh) params.set('refresh', 'true');
      const res = await fetch(`/api/social/designs/business-images/suggestions?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.suggestions && data.suggestions.length > 0) {
        setBusinessSuggestions(data.suggestions);
      }
    } catch (err) {
      console.warn('Failed to load business image suggestions:', err);
    } finally {
      setRefreshingSuggestions(false);
    }
  };

  useEffect(() => {
    void fetchSuggestions(false);
  }, [business.category, business.businessName]);

  const handleGenerateScene = async (sug: { id: string; title: string; promptBlueprint: string }) => {
    if (generatingImages) return;
    setGeneratingImages(true);
    setActiveGeneratingStep('1. Directing scene with Cloudflare FLUX.2...');

    const timer1 = setTimeout(() => {
      setActiveGeneratingStep('2. Compressing & optimizing WebP (~180 KB)...');
    }, 4500);
    const timer2 = setTimeout(() => {
      setActiveGeneratingStep('3. Crafting SEO title, caption & tags with Gemini...');
    }, 7500);

    try {
      const res = await fetch('/api/social/designs/business-images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: sug.id,
          sceneTitle: sug.title,
          promptBlueprint: sug.promptBlueprint,
          category: business.category,
          aspectRatio: selectedAspectRatio,
        }),
      });
      clearTimeout(timer1);
      clearTimeout(timer2);

      const data = await res.json();
      const finalUrl = data?.url || data?.urls?.[0];
      if (res.ok && data?.success && finalUrl) {
        setGeneratedPhotoUrl(finalUrl);
        if (data.seo) {
          setGeneratedSeo(data.seo);
        } else {
          setGeneratedSeo({
            title: `${sug.title} | ${business.businessName || 'Local Business'}`,
            description: `Quality commercial solutions at ${business.businessName || 'our business'}. Top rated services and dedicated customer care.`,
            tags: ['#LocalBusiness', '#TopRated', '#ServiceExcellence'],
          });
        }
        toast.success(data.message || 'Commercial photo & SEO content created!');
      } else {
        const errMsg = data?.error || data?.message || 'Failed to generate image';
        const mailto =
          data?.supportMailto ||
          `mailto:${data?.supportEmail || 'support@fieseros.com'}?subject=${encodeURIComponent(`AI Image Generation Issue: ${business.businessName || 'Business'}`)}&body=${encodeURIComponent(`Error: ${errMsg}`)}`;
        toast.error(
          <div className="flex flex-col gap-1 text-left">
            <span className="font-medium">{errMsg}</span>
            <a
              href={mailto}
              className="text-xs text-amber-200 underline hover:text-white mt-1"
            >
              Contact Support ({data?.supportEmail || 'support@fieseros.com'})
            </a>
          </div>,
          { duration: 8000 }
        );
      }
    } catch {
      toast.error('Network error during image generation. Please check your connection or contact support.');
    } finally {
      setGeneratingImages(false);
      setActiveGeneratingStep('');
    }
  };

  const handlePublishPost = () => {
    if (!generatedPhotoUrl) return;
    setCreateModalOpen(false);
    const createdTemplate: PosterTemplate = {
      id: `ai-gen-${Date.now()}`,
      name: generatedSeo?.title || `${business.businessName || 'Business'} Showcase`,
      category: 'service_spotlight',
      aspect: selectedAspectRatio as PosterAspect,
      photo: generatedPhotoUrl,
      headline: generatedSeo?.title || `${business.businessName || 'Business'} Showcase`,
      badge: 'AI PHOTO',
      cta: 'Book Now',
      theme: 'clean_light',
      layout: 'editorial',
      defaultBullets: generatedSeo?.tags || [],
    };
    onSelect(createdTemplate);
  };

  const activeOccasions = useMemo(() => getActivePosterOccasions(), []);
  const activeOccasionIds = useMemo(
    () => new Set(activeOccasions.map((o) => o.id)),
    [activeOccasions]
  );

  const orderedTemplates = useMemo(
    () => orderTemplatesForGallery(),
    []
  );

  const forYouTemplates = useMemo(() => {
    return [...orderedTemplates]
      .map((t) => ({ t, score: matchIndustryScore(t, business.category) }))
      .sort((a, b) => b.score - a.score)
      .filter(({ score }) => score > 0)
      .slice(0, 8)
      .map(({ t }) => t);
  }, [orderedTemplates, business.category]);

  const filteredTemplates = useMemo(() => {
    let base =
      activeCategory === 'for_you'
        ? forYouTemplates
        : activeCategory === 'all'
        ? orderedTemplates
        : activeOccasionIds.has(activeCategory)
        ? orderedTemplates.filter((t) => t.occasionId === activeCategory)
        : orderedTemplates.filter((t) => t.category === activeCategory || t.collection === activeCategory || (activeCategory==='professional'&&t.id.startsWith('professional-')));

    if (activeCategory === 'festival' && selectedFestivalKey !== 'all') {
      base = base.filter(
        (t) =>
          t.occasionId === selectedFestivalKey ||
          t.id.includes(selectedFestivalKey) ||
          t.headline.toLowerCase().includes(selectedFestivalKey) ||
          t.name.toLowerCase().includes(selectedFestivalKey)
      );
    }

    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q) ||
        t.category.includes(q) || (t.industries || []).some(industry => industry.includes(q))
    );
  }, [activeCategory, forYouTemplates, orderedTemplates, search, selectedFestivalKey, activeOccasionIds]);

  const docs = useMemo(() => {
    const map = new Map<string, MarketingDesign>();
    for (const t of filteredTemplates) {
      map.set(
        t.id,
        buildTemplateDesignDoc(t, {
          businessName: business.businessName,
          phone: business.phone,
          website: business.website,
          logoUrl: business.logoUrl || undefined,
          tagline: business.tagline,
        })
      );
    }
    return map;
  }, [filteredTemplates, business]);

  const surpriseMe = () => {
    const pool = orderedTemplates.filter(
      (t) => !t.occasionId || activeOccasionIds.has(t.occasionId)
    );
    const pick = pool[Math.floor(Math.random() * pool.length)] || orderedTemplates[0];
    if (pick) onSelect(pick);
  };

  const categoryChips: Array<{ id: string; label: string; emoji?: string }> = [
    { id: 'for_you', label: 'For you', emoji: '✨' },
    { id: 'all', label: 'All templates', emoji: '🗂️' },
    { id: 'professional', label: 'Professional collection' },
    { id: 'creative', label: 'Creative' },
    { id: 'standard', label: 'Standard' },
    ...POSTER_CATEGORIES.map(
      (c: PosterCategoryMeta) => ({ id: c.id as string, label: c.name, emoji: c.emoji })
    ),
  ];

  const showForYouEmpty =
    activeCategory === 'for_you' && forYouTemplates.length === 0 && !search.trim();

  return (
    <div className="space-y-4">
      {/* Hero: AI surprise + prompt entry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={surpriseMe}
          className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 text-left hover:border-primary/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                Surprise me — AI poster in 1 tap
                <ArrowRight className="size-4 text-primary group-hover:translate-x-0.5 transition-transform" />
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                We pick a trending design{activeOccasions.length > 0 ? ` for ${activeOccasions[0].name}` : ''}, brand it with your business details and open it on the canvas.
              </p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onStartFromPrompt}
          className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 text-left hover:border-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Wand2 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                Describe your own idea
                <ArrowRight className="size-4 text-primary group-hover:translate-x-0.5 transition-transform" />
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Start from the AI copilot — type a prompt like &ldquo;Diwali 20% off sweets&rdquo; and get a complete branded post.
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Occasion strip */}
      {activeOccasions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeOccasions.map((o) => {
            const count = orderedTemplates.filter((t) => t.occasionId === o.id).length;
            if (count === 0) return null;
            const isSelected = activeCategory === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setActiveCategory(isSelected ? 'all' : o.id)}
                className={`inline-flex items-center gap-1.5 shrink-0 rounded-full border text-xs font-semibold py-1.5 px-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                }`}
              >
                <span aria-hidden="true">{o.emoji}</span>
                <span>{o.name}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search + category chips */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search designs…"
            aria-label="Search templates"
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryChips.map((c) => (
            <CategoryChip
              key={c.id}
              active={activeCategory === c.id}
              label={c.label}
              emoji={c.emoji}
              onClick={() => setActiveCategory(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Festival Sub-Category Filter (When in Festival mode) */}
      {activeCategory === 'festival' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSelectedFestivalKey('all')}
            className={cn(
              'shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer',
              selectedFestivalKey === 'all'
                ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                : 'bg-card text-muted-foreground border-border hover:border-amber-500/40 hover:text-foreground'
            )}
          >
            <span>✨</span> All Festivals (242)
          </button>
          {festivalGroups.map((group) => {
            const active = selectedFestivalKey === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedFestivalKey(group.id)}
                className={cn(
                  'shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer',
                  active
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:border-amber-500/40 hover:text-foreground'
                )}
              >
                <span>{group.emoji}</span>
                <span>{group.label}</span>
                <span className="text-[10px] opacity-75">({group.count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Single Clean AI Creation Entry Banner */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">AI Photo &amp; Post Studio</p>
            <p className="text-[11px] text-muted-foreground truncate">
              Create commercial photos &amp; SEO posts with zero typing
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="size-3.5" />
          <span>Create Image with AI</span>
        </button>
      </div>

      {/* AI Photo & Post Creator Studio Modal Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="size-4 text-emerald-600" />
              <span>AI Photo &amp; Post Studio</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Aspect Ratio Row */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Aspect Ratio</p>
              <div className="grid grid-cols-3 gap-2">
                {(['4:5', '1:1', '9:16'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedAspectRatio(r)}
                    className={cn(
                      'py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                      selectedAspectRatio === r
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                    )}
                  >
                    {r === '4:5' ? '4:5 Post' : r === '1:1' ? '1:1 Square' : '9:16 Story'}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Preview Area */}
            <div
              className={cn(
                'w-full rounded-2xl border-2 border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center relative transition-all',
                selectedAspectRatio === '1:1'
                  ? 'aspect-square max-h-[320px]'
                  : selectedAspectRatio === '4:5'
                  ? 'aspect-[4/5] max-h-[360px]'
                  : 'aspect-[9/16] max-h-[400px]'
              )}
            >
              {generatingImages ? (
                <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                  <Loader2 className="size-8 text-emerald-600 animate-spin" />
                  <p className="text-sm font-bold text-foreground">Directing Commercial Scene</p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {activeGeneratingStep}
                  </p>
                </div>
              ) : generatedPhotoUrl ? (
                <div className="relative w-full h-full">
                  <img src={generatedPhotoUrl} alt="AI Generated" className="w-full h-full object-cover" />
                  <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="size-3 text-emerald-400" />
                    <span>WebP Optimized (~180 KB)</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center gap-2">
                  <div className="size-12 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-6" />
                  </div>
                  <p className="text-xs font-bold text-foreground">Blank Canvas</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs">
                    Select a scene idea below to generate a photorealistic commercial photo for{' '}
                    {business.businessName || 'your business'}.
                  </p>
                </div>
              )}
            </div>

            {/* SEO Content (Once Generated) */}
            {generatedSeo && (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-emerald-600" />
                  <span>Generated SEO Content</span>
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">SEO Title</label>
                  <Input
                    value={generatedSeo.title}
                    onChange={(e) => setGeneratedSeo({ ...generatedSeo, title: e.target.value })}
                    className="h-8 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Post Caption</label>
                  <textarea
                    value={generatedSeo.description}
                    onChange={(e) => setGeneratedSeo({ ...generatedSeo, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Keywords &amp; Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {generatedSeo.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Scene Suggestions Tray */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground">
                  Scene Ideas for {business.category || 'Business'}
                </p>
                <button
                  type="button"
                  disabled={refreshingSuggestions || generatingImages}
                  onClick={() => fetchSuggestions(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={cn('size-3', refreshingSuggestions && 'animate-spin')} />
                  <span>Refresh Ideas</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {businessSuggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    disabled={generatingImages}
                    onClick={() => handleGenerateScene(sug)}
                    className="p-2.5 rounded-xl border border-border/80 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left flex flex-col justify-between gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base">{sug.icon || '🏢'}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {sug.badge || 'SCENE'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground leading-snug">{sug.title}</p>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      Tap to generate <Wand2 className="size-2.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Publish Post CTA */}
            {generatedPhotoUrl && (
              <button
                type="button"
                onClick={handlePublishPost}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 shadow-sm transition-colors cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>🚀 Publish / Use on Canvas</span>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template grid */}
      {filteredTemplates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No designs match your search</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different keyword or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              doc={docs.get(t.id)!}
              isLive={!!(t.occasionId && activeOccasionIds.has(t.occasionId))}
              busy={busyTemplateId === t.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
