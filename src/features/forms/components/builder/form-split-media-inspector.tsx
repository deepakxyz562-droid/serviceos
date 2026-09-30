'use client';

import React from 'react';
import {
  Video,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  Sliders,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Columns,
  Maximize2,
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
    showBadge: false,
    showHeadline: false,
    showSubtitle: false,
    showMedia: false,
    showBenefits: false,
    showTestimonial: false,
    backgroundColor: '#0f172a',
    verticalAlign: 'top',
    contentAlign: 'left',
    padding: 'normal',
  };

  const updateField = <K extends keyof FormMediaPanel>(key: K, value: FormMediaPanel[K]) => {
    onChange({
      ...panel,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Clean Header Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Columns className="size-4" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-xs">Column Settings</h4>
            <p className="text-[10px] text-muted-foreground">Background, padding &amp; alignment</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-semibold capitalize bg-background">
          {panel.position || 'left'} column
        </Badge>
      </div>

      <Tabs defaultValue="background" className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-900 h-9 p-1 rounded-lg">
          <TabsTrigger value="background" className="text-[11px] font-semibold">
            🎨 Background
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-[11px] font-semibold">
            📐 Layout &amp; Align
          </TabsTrigger>
          <TabsTrigger value="media" className="text-[11px] font-semibold">
            🎥 Media
          </TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════════════════════════════════════
            TAB 1: COLUMN BACKGROUND (Color, Image Backdrop, Overlay, Blur)
           ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="background" className="space-y-4 pt-3">
          {/* Column Background Color */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold text-foreground flex items-center justify-between">
              <span>Background Color</span>
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
                  className={`p-1 rounded-lg border text-center text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
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

          {/* Column Background Image / Backdrop */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <Label className="text-[11px] font-bold text-foreground flex items-center justify-between">
              <span>Backdrop Image (Optional)</span>
              {panel.backgroundImageUrl && (
                <button
                  type="button"
                  onClick={() => updateField('backgroundImageUrl', null)}
                  className="text-[10px] text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  Clear Backdrop
                </button>
              )}
            </Label>

            <Input
              type="url"
              value={panel.backgroundImageUrl || ''}
              onChange={(e) => updateField('backgroundImageUrl', e.target.value || null)}
              placeholder="Paste image URL (e.g. Unsplash)..."
              className="h-8 text-xs"
            />

            {/* Backdrop Blur */}
            {panel.backgroundImageUrl && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-[10.5px] font-medium text-muted-foreground">Backdrop Blur</Label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'sm', label: 'Subtle' },
                    { id: 'md', label: 'Medium' },
                    { id: 'lg', label: 'Heavy' },
                  ].map((blur) => (
                    <button
                      key={blur.id}
                      type="button"
                      onClick={() => updateField('backgroundBlur', blur.id)}
                      className={`py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                        (panel.backgroundBlur || 'none') === blur.id
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {blur.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dark Overlay Opacity */}
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <Label>Backdrop Overlay Opacity</Label>
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

            {/* Curated Backdrop Presets */}
            <div className="space-y-1 pt-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                1-Click Preset Backdrops
              </span>
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {CURATED_UNSPLASH_HEROES.map((hero) => (
                  <button
                    key={hero.url}
                    type="button"
                    onClick={() => updateField('backgroundImageUrl', hero.url)}
                    className={`group relative h-11 rounded-lg overflow-hidden border text-left p-1.5 flex flex-col justify-end transition-all cursor-pointer ${
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
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════════
            TAB 2: LAYOUT & GENERIC POSITIONING (Wix-style Parity)
           ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="layout" className="space-y-4 pt-3">
          {/* Vertical Alignment */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold">Vertical Alignment</Label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'top', label: 'Top' },
                { id: 'center', label: 'Center' },
                { id: 'bottom', label: 'Bottom' },
                { id: 'space_between', label: 'Distribute' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => updateField('verticalAlign', v.id as any)}
                  className={`py-1.5 text-[10.5px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    (panel.verticalAlign || 'top') === v.id
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal Content Alignment */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="text-[11px] font-bold">Content Alignment</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'left', label: 'Left', icon: AlignLeft },
                { id: 'center', label: 'Center', icon: AlignCenter },
                { id: 'right', label: 'Right', icon: AlignRight },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = (panel.contentAlign || 'left') === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateField('contentAlign', item.id as any)}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-border hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column Padding */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="text-[11px] font-bold">Column Padding</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'compact', label: 'Compact' },
                { id: 'normal', label: 'Normal' },
                { id: 'spacious', label: 'Spacious' },
              ].map((pad) => (
                <button
                  key={pad.id}
                  type="button"
                  onClick={() => updateField('padding', pad.id as any)}
                  className={`py-1.5 text-[10.5px] font-semibold rounded-lg border transition-all cursor-pointer ${
                    (panel.padding || 'normal') === pad.id
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {pad.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Split Ratio */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="text-[11px] font-bold">Desktop Width Ratio</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: '50-50', label: '50 : 50 Balanced' },
                { id: '40-60', label: '40 : 60 Form Wide' },
                { id: '60-40', label: '60 : 40 Column Wide' },
                { id: '35-65', label: '35 : 65 Slim' },
                { id: '30-70', label: '30 : 70 Sidebar' },
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => updateField('splitRatio', ratio.id as any)}
                  className={`p-2 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
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

          {/* Panel Position (Left / Right) */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <Label className="text-[11px] font-bold">Column Position</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateField('position', 'left')}
                className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                  (panel.position || 'left') === 'left' ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs' : 'border-border'
                }`}
              >
                👈 Left Column
              </button>
              <button
                type="button"
                onClick={() => updateField('position', 'right')}
                className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                  panel.position === 'right' ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs' : 'border-border'
                }`}
              >
                👉 Right Column
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════════════
            TAB 3: MEDIA (Optional Photo / Map / Video / Glow)
           ═════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="media" className="space-y-4 pt-3">
          <div className="flex items-center justify-between p-2.5 rounded-xl border bg-card">
            <div className="space-y-0.5">
              <Label className="text-[11px] font-bold">Display Visual Media</Label>
              <p className="text-[10px] text-muted-foreground">Add hero image, video, map, or glow</p>
            </div>
            <Switch
              checked={panel.showMedia ?? false}
              onCheckedChange={(checked) => updateField('showMedia', checked)}
            />
          </div>

          {(panel.showMedia ?? false) && (
            <div className="space-y-3 pt-1">
              {/* Media Type Switcher */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateField('mediaType', 'image')}
                  className={`p-2 rounded-xl border flex items-center gap-2 font-medium transition-all cursor-pointer ${
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
                  className={`p-2 rounded-xl border flex items-center gap-2 font-medium transition-all cursor-pointer ${
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
                  className={`p-2 rounded-xl border flex items-center gap-2 font-medium transition-all cursor-pointer ${
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
                  className={`p-2 rounded-xl border flex items-center gap-2 font-medium transition-all cursor-pointer ${
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
      </Tabs>
    </div>
  );
}
