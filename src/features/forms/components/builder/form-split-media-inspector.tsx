'use client';

import React from 'react';
import {
  Video,
  Image as ImageIcon,
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
  const panel = mediaPanel || {
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
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-200 dark:border-teal-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-teal-600 text-white">
              <Film className="size-3.5" />
            </div>
            <span className="font-bold text-teal-950 dark:text-teal-200 text-xs">
              Elementor Left Hero Panel
            </span>
          </div>
          <Badge className="bg-teal-600 text-white text-[9px]">2-Col Split</Badge>
        </div>
        <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 leading-relaxed">
          Showcase visual photos or video reels on the left while users fill out 5–6 fields on the right.
        </p>
      </div>

      <Tabs defaultValue="media" className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-slate-100 dark:bg-slate-900 h-9 p-1 rounded-lg">
          <TabsTrigger value="media" className="text-[11px] font-semibold">
            🎥 Media Hero
          </TabsTrigger>
          <TabsTrigger value="content" className="text-[11px] font-semibold">
            📝 Content &amp; Badges
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-[11px] font-semibold">
            📐 Split Ratio
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MEDIA CONFIGURATION */}
        <TabsContent value="media" className="space-y-4 pt-3">
          {/* Media Type Switcher */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Media Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField('mediaType', 'image')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${
                  panel.mediaType === 'image'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20'
                    : 'border-border hover:border-slate-300'
                }`}
              >
                <ImageIcon className="size-4 text-emerald-600" /> Photo / Image
              </button>
              <button
                type="button"
                onClick={() => updateField('mediaType', 'video')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${
                  panel.mediaType === 'video'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20'
                    : 'border-border hover:border-slate-300'
                }`}
              >
                <Video className="size-4 text-teal-600" /> Video (MP4 / YouTube)
              </button>
            </div>
          </div>

          {/* Media URL Input */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">
              {panel.mediaType === 'video' ? 'Video / YouTube / Vimeo Embed URL' : 'Image URL or Upload'}
            </Label>
            <Input
              type="url"
              value={panel.mediaUrl || ''}
              onChange={(e) => updateField('mediaUrl', e.target.value)}
              placeholder={
                panel.mediaType === 'video'
                  ? 'https://www.youtube.com/watch?v=... or .mp4'
                  : 'https://images.unsplash.com/...'
              }
              className="h-9 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              {panel.mediaType === 'video'
                ? 'Supports YouTube, Vimeo, and direct MP4 video URLs with auto-loop.'
                : 'Direct high-res image link from Unsplash, AWS S3, or CDN.'}
            </p>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Aspect Ratio</Label>
            <Select
              value={panel.aspectRatio || 'video'}
              onValueChange={(val: any) => updateField('aspectRatio', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">16:9 Widescreen (Standard Video)</SelectItem>
                <SelectItem value="square">1:1 Square (Product / Headshot)</SelectItem>
                <SelectItem value="tall">9:16 Vertical Reel (Modern Mobile)</SelectItem>
                <SelectItem value="wide">21:9 Ultra-Wide</SelectItem>
                <SelectItem value="auto">Natural Image Dimensions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Preset Images/Videos */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Industry Presets
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  updateField('mediaType', 'image');
                  updateField('mediaUrl', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80');
                  updateField('headline', 'Certified HVAC & AC Repair Pros');
                }}
                className="p-1.5 rounded-lg border text-left hover:border-emerald-500 text-[11px] truncate bg-card"
              >
                ❄️ HVAC &amp; AC Repair
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField('mediaType', 'image');
                  updateField('mediaUrl', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80');
                  updateField('headline', 'Emergency Plumbing & Drain Cleaning');
                }}
                className="p-1.5 rounded-lg border text-left hover:border-emerald-500 text-[11px] truncate bg-card"
              >
                🔧 Plumbing &amp; Drains
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField('mediaType', 'image');
                  updateField('mediaUrl', 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80');
                  updateField('headline', 'Roofing & Gutter Specialist');
                }}
                className="p-1.5 rounded-lg border text-left hover:border-emerald-500 text-[11px] truncate bg-card"
              >
                🏠 Roofing &amp; Gutters
              </button>
              <button
                type="button"
                onClick={() => {
                  updateField('mediaType', 'video');
                  updateField('mediaUrl', 'https://assets.mixkit.co/videos/preview/mixkit-handyman-repairing-an-air-conditioner-41315-large.mp4');
                  updateField('headline', 'Watch How Our Team Fixes It Fast');
                }}
                className="p-1.5 rounded-lg border text-left hover:border-emerald-500 text-[11px] truncate bg-card"
              >
                🎬 Live Video Demo
              </button>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CONTENT & VALUE PROPOSITIONS */}
        <TabsContent value="content" className="space-y-4 pt-3">
          {/* Trust Badge */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Award className="size-3.5 text-amber-500" /> Trust Badge Text
            </Label>
            <Input
              type="text"
              value={panel.badgeText || ''}
              onChange={(e) => updateField('badgeText', e.target.value)}
              placeholder="e.g. ⭐ 5-Star Rated Service Pro"
              className="h-9 text-xs"
            />
          </div>

          {/* Headline */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Headline Title</Label>
            <Input
              type="text"
              value={panel.headline || ''}
              onChange={(e) => updateField('headline', e.target.value)}
              placeholder="e.g. Fast & Reliable AC Repair & Installation"
              className="h-9 text-xs font-semibold"
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground">Supporting Subtitle</Label>
            <Textarea
              value={panel.subtitle || ''}
              onChange={(e) => updateField('subtitle', e.target.value)}
              placeholder="e.g. Compare upfront estimates from top verified pros in minutes."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Bullet Benefits List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-semibold text-foreground">
                Value Proposition Bullet Points ({panel.benefitsList?.length || 0})
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddBenefit}
                className="h-7 px-2 text-[11px] text-emerald-600 gap-1 hover:text-emerald-700"
              >
                <Plus className="size-3" /> Add Point
              </Button>
            </div>

            <div className="space-y-2">
              {(panel.benefitsList || []).map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
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
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: SPLIT RATIO & MOBILE SETTINGS */}
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
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => updateField('splitRatio', ratio.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    (panel.splitRatio || '50-50') === ratio.id
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-semibold ring-2 ring-emerald-500/20'
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
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-bold'
                    : 'border-border'
                }`}
              >
                Left Side (Standard)
              </button>
              <button
                type="button"
                onClick={() => updateField('position', 'right')}
                className={`p-2 rounded-lg border text-center font-medium ${
                  panel.position === 'right'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-bold'
                    : 'border-border'
                }`}
              >
                Right Side
              </button>
            </div>
          </div>

          {/* Mobile Stacking Mode */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="size-3.5" /> Mobile Stacking Behavior
            </Label>
            <Select
              value={panel.mobileBehavior || 'stack-top'}
              onValueChange={(val: any) => updateField('mobileBehavior', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Mobile behavior" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stack-top">Show Hero Banner on Top (Recommended)</SelectItem>
                <SelectItem value="compact-badge">Compact Badge Header Only</SelectItem>
                <SelectItem value="hide-mobile">Hide Hero on Mobile (Fastest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
