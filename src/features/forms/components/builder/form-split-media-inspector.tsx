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
    <div className="space-y-5 text-xs">
      {/* Header Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/80 dark:from-indigo-950/30 dark:via-slate-900 dark:to-emerald-950/30 border border-border/80 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <span className="font-bold text-foreground text-xs block">
                Hero Media &amp; Map Panel
              </span>
              <span className="text-[10px] text-muted-foreground">
                2026 Interactive Side-by-Side Canvas
              </span>
            </div>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[9px] font-bold">
            Split Layout
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="media" className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-900 h-9 p-1 rounded-lg">
          <TabsTrigger value="media" className="text-[11px] font-semibold">
            🎥 Media Type
          </TabsTrigger>
          <TabsTrigger value="content" className="text-[11px] font-semibold">
            📝 Trust &amp; Copy
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-[11px] font-semibold">
            📐 Layout &amp; Grid
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MEDIA CONFIGURATION */}
        <TabsContent value="media" className="space-y-4 pt-3">
          {/* Media Type Switcher (Image, Video, Map, Gradient, Testimonial) */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Visual Media Format</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateField('mediaType', 'image')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-medium transition-all ${
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
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-medium transition-all ${
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
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-medium transition-all ${
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
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                  panel.mediaType === 'gradient'
                    ? 'border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/20 shadow-xs'
                    : 'border-border hover:border-slate-300'
                }`}
              >
                <Palette className="size-4 text-indigo-500" /> 2026 Mesh Glow
              </button>
            </div>
          </div>

          {/* Map Configuration */}
          {panel.mediaType === 'map' && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-rose-500" /> Business Address / Location Pin
                </Label>
                <Input
                  type="text"
                  value={panel.mapAddress || ''}
                  onChange={(e) => updateField('mapAddress', e.target.value)}
                  placeholder="e.g. 500 Congress Ave, Austin, TX 78701"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-foreground">Service Radius Badge</Label>
                <Input
                  type="text"
                  value={panel.mapServiceRadius || ''}
                  onChange={(e) => updateField('mapServiceRadius', e.target.value)}
                  placeholder="e.g. Serving Austin &amp; surrounding 35 miles"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          {/* Gradient Mesh Configuration */}
          {panel.mediaType === 'gradient' && (
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border">
              <Label className="text-[11px] font-semibold text-foreground">Gradient Palette Theme</Label>
              <Select
                value={panel.gradientPreset || 'cyber_emerald'}
                onValueChange={(val: any) => updateField('gradientPreset', val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select gradient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cyber_emerald">🟢 Cyber Emerald &amp; Slate</SelectItem>
                  <SelectItem value="electric_indigo">🟣 Electric Indigo &amp; Violet</SelectItem>
                  <SelectItem value="solar_amber">🟠 Solar Amber &amp; Crimson</SelectItem>
                  <SelectItem value="rose_obsidian">🔴 Rose Obsidian &amp; Charcoal</SelectItem>
                  <SelectItem value="deep_space">🌌 Deep Space Aurora</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Media URL Input (for Image & Video) */}
          {panel.mediaType !== 'map' && panel.mediaType !== 'gradient' && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-foreground">
                {panel.mediaType === 'video' ? 'Video URL (MP4, YouTube, Vimeo)' : 'Image URL or 4K Unsplash Link'}
              </Label>
              <Input
                type="url"
                value={panel.mediaUrl || ''}
                onChange={(e) => updateField('mediaUrl', e.target.value)}
                placeholder={
                  panel.mediaType === 'video'
                    ? 'https://www.youtube.com/watch?v=... or https://...mp4'
                    : 'https://images.unsplash.com/...'
                }
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                {panel.mediaType === 'video'
                  ? 'Supports YouTube, Vimeo, and direct MP4 video URLs with auto-loop.'
                  : 'Paste high-res photography, showroom photos, or brand banner.'}
              </p>
            </div>
          )}

          {/* Aspect Ratio */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Aspect Ratio / Fit</Label>
            <Select
              value={panel.aspectRatio || '16-9'}
              onValueChange={(val: any) => updateField('aspectRatio', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16-9">16:9 Widescreen (Standard Video &amp; Photo)</SelectItem>
                <SelectItem value="cover">Full Height Cover (Fills entire column)</SelectItem>
                <SelectItem value="4-3">4:3 Classic Display</SelectItem>
                <SelectItem value="1-1">1:1 Square (Product / Headshot)</SelectItem>
                <SelectItem value="auto">Natural Image Dimensions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Preset Imagery & Video */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              2026 Industry Presets
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  updateField('mediaType', 'image');
                  updateField('mediaUrl', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80');
                  updateField('headline', 'Certified Heating, Cooling & Air Quality Pros');
                  updateField('badgeText', '⭐ 4.9/5 Certified Master Techs');
                }}
                className="p-1.5 rounded-lg border text-left hover:border-primary text-[11px] truncate bg-card"
              >
                ❄️ HVAC &amp; AC Repair
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField('mediaType', 'image');
                  updateField('mediaUrl', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80');
                  updateField('headline', '24/7 Emergency Plumbing & Water Damage');
                  updateField('badgeText', '⚡ 15-Minute Response Guaranteed');
                }}
                className="p-1.5 rounded-lg border text-left hover:border-primary text-[11px] truncate bg-card"
              >
                🔧 Plumbing &amp; Drains
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField('mediaType', 'map');
                  updateField('mapAddress', '1000 Main Street, Metro Area');
                  updateField('mapServiceRadius', 'Active Dispatch in 45 Mile Radius');
                  updateField('headline', 'Find Local Technicians Near Your Neighborhood');
                }}
                className="p-1.5 rounded-lg border text-left hover:border-primary text-[11px] truncate bg-card"
              >
                🗺️ Local Service Map
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField('mediaType', 'video');
                  updateField('mediaUrl', 'https://assets.mixkit.co/videos/preview/mixkit-handyman-repairing-an-air-conditioner-41315-large.mp4');
                  updateField('headline', 'Watch How Our Master Technicians Work');
                }}
                className="p-1.5 rounded-lg border text-left hover:border-primary text-[11px] truncate bg-card"
              >
                🎬 Video Demonstration
              </button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CONTENT & VALUE PROPOSITIONS */}
        <TabsContent value="content" className="space-y-4 pt-3">
          {/* Trust Badge */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Award className="size-3.5 text-amber-500" /> Trust Badge &amp; Rating Text
            </Label>
            <Input
              type="text"
              value={panel.badgeText || ''}
              onChange={(e) => updateField('badgeText', e.target.value)}
              placeholder="e.g. ⭐ 4.9/5 Star Rated Pro • Licensed &amp; Insured"
              className="h-9 text-xs"
            />
          </div>

          {/* Headline */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Hero Headline Title</Label>
            <Input
              type="text"
              value={panel.headline || ''}
              onChange={(e) => updateField('headline', e.target.value)}
              placeholder="e.g. Fast &amp; Reliable Emergency Repairs"
              className="h-9 text-xs font-semibold"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Supporting Subtitle</Label>
            <Textarea
              value={panel.subtitle || ''}
              onChange={(e) => updateField('subtitle', e.target.value)}
              placeholder="e.g. Compare upfront estimates from top verified pros in minutes with zero obligation."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Bullet Benefits List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold text-foreground">
                Value Proposition Points ({panel.benefitsList?.length || 0})
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddBenefit}
                className="h-7 px-2 text-[11px] text-primary gap-1 hover:bg-primary/10"
              >
                <Plus className="size-3" /> Add Point
              </Button>
            </div>

            <div className="space-y-2">
              {(panel.benefitsList || []).map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  <Input
                    type="text"
                    value={benefit}
                    onChange={(e) => handleUpdateBenefit(idx, e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBenefit(idx)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: SPLIT RATIO & STEP BEHAVIOR */}
        <TabsContent value="layout" className="space-y-4 pt-3">
          {/* Split Ratio Presets */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Desktop Split Ratio</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: '50-50', label: '50 : 50 Balanced', desc: 'Equal media & form width' },
                { id: '40-60', label: '40 : 60 Form-Focused', desc: 'Compact media, wide form' },
                { id: '60-40', label: '60 : 40 Media-Focused', desc: 'Large hero, compact form' },
                { id: '35-65', label: '35 : 65 Slim Hero', desc: 'Maximized field area' },
                { id: '30-70', label: '30 : 70 Sidebar', desc: 'Ultra compact info column' },
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => updateField('splitRatio', ratio.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    (panel.splitRatio || '50-50') === ratio.id
                      ? 'border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/20 shadow-xs'
                      : 'border-border hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold">{ratio.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ratio.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Panel Position */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Media Position</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField('position', 'left')}
                className={`p-2 rounded-lg border text-center font-medium ${
                  (panel.position || 'left') === 'left'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border'
                }`}
              >
                Left Hero (Standard)
              </button>
              <button
                type="button"
                onClick={() => updateField('position', 'right')}
                className={`p-2 rounded-lg border text-center font-medium ${
                  panel.position === 'right'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border'
                }`}
              >
                Right Hero (Inverted)
              </button>
            </div>
          </div>

          {/* Multi-Step Hero Behavior */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Multi-Step Hero Behavior</Label>
            <Select
              value={panel.stepBehavior || 'persistent'}
              onValueChange={(val: any) => updateField('stepBehavior', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Step behavior" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="persistent">Persistent Sticky Hero (Stays visible across all steps)</SelectItem>
                <SelectItem value="per_step">Adaptive Step Hero (Changes headline per step)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Stacking Mode */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="size-3.5" /> Mobile Stacking Behavior
            </Label>
            <Select
              value={panel.mobileBehavior || 'stack_top'}
              onValueChange={(val: any) => updateField('mobileBehavior', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Mobile behavior" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stack_top">Show Hero Banner on Top (Recommended)</SelectItem>
                <SelectItem value="compact_banner">Compact Badge Header Only</SelectItem>
                <SelectItem value="hide">Hide Hero on Mobile (Prioritize Form)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
