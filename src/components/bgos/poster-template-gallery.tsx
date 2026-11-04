'use client';
import {DESIGN_FONT_CSS,designFontFamily} from '../../../shared/design-fonts';

/**
 * Poster Template Gallery — Flyer-Maker-style visual entry for the marketing studio.
 *
 * Renders live, pixel-consistent thumbnails straight from the shared design model
 * (same composition used by the canvas editor and server-side PNG export), so what
 * the user sees in the gallery is exactly what they get on the canvas.
 */

import React, { useMemo, useState } from 'react';
import { Search, Sparkles, Wand2, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    const base =
      activeCategory === 'for_you'
        ? forYouTemplates
        : activeCategory === 'all'
        ? orderedTemplates
        : activeOccasionIds.has(activeCategory)
        ? orderedTemplates.filter((t) => t.occasionId === activeCategory)
        : orderedTemplates.filter((t) => t.category === activeCategory || t.collection === activeCategory || (activeCategory==='professional'&&t.id.startsWith('professional-')));
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.headline.toLowerCase().includes(q) ||
        t.category.includes(q) || (t.industries || []).some(industry => industry.includes(q))
    );
  }, [activeCategory, forYouTemplates, orderedTemplates, search]);

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
