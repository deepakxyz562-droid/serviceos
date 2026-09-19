'use client';

import React from 'react';
import {
  Video,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  Layers,
  CheckCircle2,
  Plus,
  Trash2,
  Sliders,
  Smartphone,
  Eye,
  Type,
  Youtube,
  Film,
  Award,
  Compass,
  MessageSquareQuote,
  Palette,
  Check,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormMediaPanel } from '@/lib/forms/form-schema-types';

export interface FormSplitMediaInspectorProps {
  mediaPanel: FormMediaPanel;
  onChange: (updated: FormMediaPanel) => void;
  formName?: string;
}

const BG_COLOR_PRESETS = [
  { label: 'Midnight Slate', value: '#0f172a' },
  { label: 'Deep Obsidian', value: '#020617' },
  { label: 'Indigo Navy', value: '#1e1b4b' },
  { label: 'Emerald Forest', value: '#064e3b' },
  { label: 'Teal Lagoon', value: '#134e4a' },
  { label: 'Royal Charcoal', value: '#18181b' },
  { label: 'Pure White', value: '#ffffff' },
  { label: 'Soft Slate', value: '#f8fafc' },
];

const CURATED_UNSPLASH_HEROES = [
  {
    name: 'Plumbing & Repairs',
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'HVAC & AC Service',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Electrician & Power',
    url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Roofing & Construction',
    url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Modern Architecture',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Healthcare & Wellness',
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Tech & Digital MVP',
    url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Luxury Concierge',
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  },
];

export function FormSplitMediaInspector({
  mediaPanel,
  onChange,
  formName,
}: FormSplitMediaInspectorProps) {
  const panel: FormMediaPanel = mediaPanel || {
    enabled: true,
    position: 'left',
    splitRatio: '50-50',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
    headline: formName || 'Fast & Reliable Professional Service',
    subtitle: 'Fill out the form below to receive upfront pricing and schedule top-rated pros.',
    badgeText: '⭐ 5-Star Rated Service Pro',
    showBadge: true,
    showHeadline: true,
    showSubtitle: true,
    showMedia: true,
    showBenefits: true,
    showTestimonial: false,
    backgroundColor: '#0f172a',
    benefitsList: [
      'Guaranteed response within 15 minutes',
      'Licensed, insured & background-checked',
      '100% Price Match & Escrow Guarantee',
    ],
  };

  const updateField = <K extends keyof FormMediaPanel>(key: K, value: FormMediaPanel[K]) => {
    onChange({
      ...panel,
      [key]: value,
    });
  };

  const handleAddBenefit = () => {
    const list = panel.benefitsList || [];
    updateField('benefitsList', [...list, 'New key benefit / guarantee point']);
  };

  const handleUpdateBenefit = (index: number, text: string) => {
    const list = [...(panel.benefitsList || [])];
    list[index] = text;
    updateField('benefitsList', list);
  };

  const handleRemoveBenefit = (index: number) => {
    const list = [...(panel.benefitsList || [])];
    list.splice(index, 1);
    updateField('benefitsList', list);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/80 dark:from-indigo-950/30 dark:via-slate-900 dark:to-emerald-950/30 border border-border/80 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <span className="font-bold text-foreground text-xs block">
                Left Hero Column (Elementor Style)
              </span>
              <span className="text-[10px] text-muted-foreground">
                Modular Column Background &amp; Widgets
              </span>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[9px] font-bold">
            Split Layout
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid grid-cols-4 w-full bg-slate-100 dark:bg-slate-900 h-9 p-1 rounded-lg">
          <TabsTrigger value="style" className="text-[10.5px] font-semibold">
            🎨 Style &amp; BG
          </TabsTrigger>
          <TabsTrigger value="widgets" className="text-[10.5px] font-semibold">
            🧩 Widgets
          </TabsTrigger>
          <TabsTrigger value="media" className="text-[10.5px] font-semibold">
            🎥 Media
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-[10.5px] font-semibold">
            📐 Layout
          </TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════════════════════════════════════
            TAB 1: COLUMN STYLE & BACKGROUND (Elementor Parity)
           ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="style" className="space-y-4 pt-3">
          {/* Column Background Color */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-foreground flex items-center justify-between">
              <span>Left Column Background Color</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {panel.backgroundColor || '#0f172a'}
              </span>
            </Label>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={panel.backgroundColor || '#0f172a'}
                onChange={(e) => updateField('backgroundColor', e.target.value)}
                className="size-8 rounded-lg border border-border cursor-pointer shrink-0"
              />
              <Input
                type="text"
                value={panel.backgroundColor || '#0f172a'}
                onChange={(e) => updateField('backgroundColor', e.target.value)}
                className="h-8 text-xs font-mono flex-1"
                placeholder="#0f172a"
              />
            </div>

            {/* Quick Color Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {BG_COLOR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => updateField('backgroundColor', p.value)}
                  className={`p-1 rounded-lg border text-center text-[10px] font-semibold flex items-center gap-1.5 transition-all ${
                    panel.backgroundColor === p.value
                      ? 'border-primary ring-2 ring-primary/20 font-bold'
                      : 'border-border/80 hover:border-slate-300'
                  }`}
                >
                  <span className="size-3 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: p.value }} />
                  <span className="truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Column Background Image (Optional full column backdrop) */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label className="text-[11px] font-bold text-foreground flex items-center justify-between">
              <span>Column Backdrop Photo (Optional)</span>
              {panel.backgroundImageUrl && (
                <button
                  type="button"
                  onClick={() => updateField('backgroundImageUrl', null)}
                  className="text-[10px] text-rose-500 hover:underline font-semibold"
                >
                  Remove Backdrop
                </button>
              )}
            </Label>

            <Input
              type="url"
              value={panel.backgroundImageUrl || ''}
              onChange={(e) => updateField('backgroundImageUrl', e.target.value || null)}
              placeholder="Paste custom Unsplash or image URL..."
              className="h-8 text-xs"
            />

            {/* Curated Backdrop Photo Presets */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                1-Click 4K Presets
              </span>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {CURATED_UNSPLASH_HEROES.map((hero) => (
                  <button
                    key={hero.url}
                    type="button"
                    onClick={() => updateField('backgroundImageUrl', hero.url)}
                    className={`group relative h-12 rounded-lg overflow-hidden border text-left p-1.5 flex flex-col justify-end transition-all ${
                      panel.backgroundImageUrl === hero.url ? 'ring-2 ring-primary border-primary' : 'border-border'
                    }`}
                  >
                    <img src={hero.url} alt={hero.name} className="absolute inset-0 size-full object-cover brightness-50 group-hover:scale-105 transition-transform" />
                    <span className="relative z-10 text-[9.5px] font-bold text-white drop-shadow truncate">
                      {hero.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dark Vignette Overlay Opacity */}
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <Label>Backdrop Dark Overlay</Label>
                <span className="font-mono text-muted-foreground">{panel.overlayOpacity ?? 70}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={panel.overlayOpacity ?? 70}
                onChange={(e) => updateField('overlayOpacity', Number(e.target.value))}
                className="w-full accent-primary h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════════
            TAB 2: MODULAR WIDGETS & COPY (1-Click Toggle / Edit / Delete)
           ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="widgets" className="space-y-3.5 pt-3">
          <p className="text-[10px] text-muted-foreground">
            Toggle on/off or delete any block on the left panel.
          </p>

          {/* 1. Trust Badge Widget */}
          <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="size-3.5 text-amber-500" />
                <Label className="text-[11px] font-bold">⭐ Trust Badge Pill</Label>
              </div>
              <Switch
                checked={panel.showBadge ?? Boolean(panel.badgeText)}
                onCheckedChange={(checked) => updateField('showBadge', checked)}
              />
            </div>
            {(panel.showBadge ?? Boolean(panel.badgeText)) && (
              <Input
                type="text"
                value={panel.badgeText || ''}
                onChange={(e) => updateField('badgeText', e.target.value)}
                placeholder="⭐ 5-Star Rated Service Pro"
                className="h-8 text-xs"
              />
            )}
          </div>

          {/* 2. Hero Headline Widget */}
          <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="size-3.5 text-emerald-500" />
                <Label className="text-[11px] font-bold">🔤 Headline Title</Label>
              </div>
              <Switch
                checked={panel.showHeadline ?? true}
                onCheckedChange={(checked) => updateField('showHeadline', checked)}
              />
            </div>
            {(panel.showHeadline ?? true) && (
              <Input
                type="text"
                value={panel.headline || ''}
                onChange={(e) => updateField('headline', e.target.value)}
                placeholder="Fast & Reliable Professional Service"
                className="h-8 text-xs font-semibold"
              />
            )}
          </div>

          {/* 3. Subtitle Paragraph Widget */}
          <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="size-3.5 text-blue-500" />
                <Label className="text-[11px] font-bold">📝 Supporting Subtitle</Label>
              </div>
              <Switch
                checked={panel.showSubtitle ?? true}
                onCheckedChange={(checked) => updateField('showSubtitle', checked)}
              />
            </div>
            {(panel.showSubtitle ?? true) && (
              <Textarea
                value={panel.subtitle || ''}
                onChange={(e) => updateField('subtitle', e.target.value)}
                placeholder="Fill out the form below to receive upfront pricing."
                rows={2}
                className="text-xs resize-none"
              />
            )}
          </div>

          {/* 4. Value Benefits Checklist Widget */}
          <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-primary" />
                <Label className="text-[11px] font-bold">
                  ✅ Benefits Checklist ({panel.benefitsList?.length || 0})
                </Label>
              </div>
              <Switch
                checked={panel.showBenefits ?? (panel.benefitsList && panel.benefitsList.length > 0)}
                onCheckedChange={(checked) => updateField('showBenefits', checked)}
              />
            </div>

            {(panel.showBenefits ?? true) && (
              <div className="space-y-2 pt-1">
                {(panel.benefitsList || []).map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                    <Input
                      type="text"
                      value={benefit}
                      onChange={(e) => handleUpdateBenefit(idx, e.target.value)}
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBenefit(idx)}
                      className="size-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      title="Delete Benefit"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBenefit}
                  className="w-full h-7 text-[10.5px] font-semibold gap-1 border-dashed"
                >
                  <Plus className="size-3" /> Add Benefit Point
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════════
            TAB 3: MEDIA DISPLAY (Photo / Map / Video)
           ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="media" className="space-y-4 pt-3">
          <div className="flex items-center justify-between p-2.5 rounded-xl border bg-card">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold">Display Visual Media</Label>
              <p className="text-[10px] text-muted-foreground">Show hero photo, map, or video</p>
            </div>
            <Switch
              checked={panel.showMedia ?? true}
              onCheckedChange={(checked) => updateField('showMedia', checked)}
            />
          </div>

          {(panel.showMedia ?? true) && (
            <div className="space-y-3">
              {/* Media Type Switcher */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateField('mediaType', 'image')}
                  className={`p-2 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                    (panel.mediaType || 'image') === 'image'
                      ? 'border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20 shadow-xs'
                      : 'border-border hover:border-slate-300'
                  }`}
                >
                  <ImageIcon className="size-4 text-emerald-600" /> Photo / Image
                </button>
                <button
                  type="button"
                  onClick={() => updateField('mediaType', 'video')}
                  className={`p-2 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                    panel.mediaType === 'video' || panel.mediaType === 'youtube' || panel.mediaType === 'vimeo'
                      ? 'border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20 shadow-xs'
                      : 'border-border hover:border-slate-300'
                  }`}
                >
                  <Video className="size-4 text-teal-600" /> Video (MP4 / YT)
                </button>
                <button
                  type="button"
                  onClick={() => updateField('mediaType', 'map')}
                  className={`p-2 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                    panel.mediaType === 'map'
                      ? 'border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20 shadow-xs'
                      : 'border-border hover:border-slate-300'
                  }`}
                >
                  <MapPin className="size-4 text-rose-500" /> Interactive Map
                </button>
                <button
                  type="button"
                  onClick={() => updateField('mediaType', 'gradient')}
                  className={`p-2 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                    panel.mediaType === 'gradient'
                      ? 'border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20 shadow-xs'
                      : 'border-border hover:border-slate-300'
                  }`}
                >
                  <Palette className="size-4 text-indigo-500" /> 2026 Glow
                </button>
              </div>

              {/* Map Settings */}
              {panel.mediaType === 'map' && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border">
                  <Label className="text-[11px] font-bold">Google Map Location</Label>
                  <Input
                    type="text"
                    value={panel.mapAddress || ''}
                    onChange={(e) => updateField('mapAddress', e.target.value)}
                    placeholder="e.g. Austin, TX"
                    className="h-8 text-xs"
                  />
                  <Input
                    type="text"
                    value={panel.mapServiceRadius || ''}
                    onChange={(e) => updateField('mapServiceRadius', e.target.value)}
                    placeholder="e.g. 25-Mile Service Radius"
                    className="h-8 text-xs"
                  />
                </div>
              )}

              {/* Photo or Video URL */}
              {panel.mediaType !== 'map' && panel.mediaType !== 'gradient' && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">
                    {panel.mediaType === 'video' ? 'Video URL' : 'Image URL'}
                  </Label>
                  <Input
                    type="url"
                    value={panel.mediaUrl || ''}
                    onChange={(e) => updateField('mediaUrl', e.target.value)}
                    placeholder={panel.mediaType === 'video' ? 'https://youtube.com/...' : 'https://images.unsplash.com/...'}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════════
            TAB 4: LAYOUT & SPLIT RATIO
           ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="layout" className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold">Desktop Split Ratio</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: '50-50', label: '50 : 50 Balanced' },
                { id: '40-60', label: '40 : 60 Form Wide' },
                { id: '60-40', label: '60 : 40 Media Wide' },
                { id: '35-65', label: '35 : 65 Slim Media' },
                { id: '30-70', label: '30 : 70 Sidebar' },
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => updateField('splitRatio', ratio.id as any)}
                  className={`p-2 rounded-lg border text-left text-xs transition-all ${
                    (panel.splitRatio || '50-50') === ratio.id
                      ? 'border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20 shadow-xs'
                      : 'border-border hover:border-slate-300'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label className="text-[11px] font-bold">Panel Position</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateField('position', 'left')}
                className={`p-2 rounded-lg border text-xs font-semibold ${
                  (panel.position || 'left') === 'left' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'
                }`}
              >
                👈 Left Column
              </button>
              <button
                type="button"
                onClick={() => updateField('position', 'right')}
                className={`p-2 rounded-lg border text-xs font-semibold ${
                  panel.position === 'right' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'
                }`}
              >
                👉 Right Column
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
