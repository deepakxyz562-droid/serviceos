'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  Check,
  Palette,
  Image as ImageIcon,
  Sliders,
  Film,
  MapPin,
  Eye,
  Trash2,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { FormTheme, FormMediaPanel } from '@/lib/forms/form-schema-types';
import { FormSplitMediaInspector } from './form-split-media-inspector';

export interface FormThemePreset {
  id: string;
  name: string;
  category: 'popular' | 'minimal' | 'bold' | 'dark';
  primaryColor: string;
  backgroundColor: string;
  cardBackground: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  accentLineColor: string;
  buttonColor: string;
  buttonTextColor: string;
  inputBorderRadius?: string;
  inputHeight?: 'compact' | 'medium' | 'large';
  backgroundImageUrl?: string;
}

export const THEME_GALLERY_PRESETS: FormThemePreset[] = [
  {
    id: 'fieseros-emerald',
    name: 'Fieseros Emerald',
    category: 'popular',
    primaryColor: '#059669',
    backgroundColor: '#f0fdf4',
    cardBackground: '#ffffff',
    textColor: '#064e3b',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1rem',
    inputBorderRadius: '12px',
    inputHeight: 'medium',
    accentLineColor: '#34d399',
    buttonColor: '#059669',
    buttonTextColor: '#ffffff',
  },
  {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    category: 'popular',
    primaryColor: '#0d9488',
    backgroundColor: '#f0fdfa',
    cardBackground: '#ffffff',
    textColor: '#134e4a',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.75rem',
    inputBorderRadius: '10px',
    inputHeight: 'medium',
    accentLineColor: '#2dd4bf',
    buttonColor: '#0d9488',
    buttonTextColor: '#ffffff',
  },
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    category: 'popular',
    primaryColor: '#2563eb',
    backgroundColor: '#f8fafc',
    cardBackground: '#ffffff',
    textColor: '#1e293b',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.75rem',
    inputBorderRadius: '8px',
    inputHeight: 'medium',
    accentLineColor: '#60a5fa',
    buttonColor: '#2563eb',
    buttonTextColor: '#ffffff',
  },
  {
    id: 'pearl-white',
    name: 'Pearl White',
    category: 'minimal',
    primaryColor: '#0f172a',
    backgroundColor: '#ffffff',
    cardBackground: '#f8fafc',
    textColor: '#0f172a',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.5rem',
    accentLineColor: '#cbd5e1',
    buttonColor: '#0f172a',
    buttonTextColor: '#ffffff',
  },
  {
    id: 'amber-glow',
    name: 'Amber Glow',
    category: 'popular',
    primaryColor: '#d97706',
    backgroundColor: '#fffbeb',
    cardBackground: '#ffffff',
    textColor: '#78350f',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.75rem',
    accentLineColor: '#fbbf24',
    buttonColor: '#d97706',
    buttonTextColor: '#ffffff',
  },
  {
    id: 'sunset-coral',
    name: 'Sunset Coral',
    category: 'bold',
    primaryColor: '#e11d48',
    backgroundColor: '#fff1f2',
    cardBackground: '#ffffff',
    textColor: '#881337',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1rem',
    accentLineColor: '#fb7185',
    buttonColor: '#e11d48',
    buttonTextColor: '#ffffff',
  },
  {
    id: 'midnight-obsidian',
    name: 'Midnight Obsidian',
    category: 'dark',
    primaryColor: '#10b981',
    backgroundColor: '#020617',
    cardBackground: '#0f172a',
    textColor: '#f8fafc',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1.25rem',
    accentLineColor: '#34d399',
    buttonColor: '#10b981',
    buttonTextColor: '#ffffff',
  },
  {
    id: 'cyber-violet',
    name: 'Cyber Violet',
    category: 'bold',
    primaryColor: '#8b5cf6',
    backgroundColor: '#faf5ff',
    cardBackground: '#ffffff',
    textColor: '#581c87',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1rem',
    accentLineColor: '#c084fc',
    buttonColor: '#8b5cf6',
    buttonTextColor: '#ffffff',
  },
];

// 8 Curated 4K Unsplash Form Background Presets
const BACKGROUND_PHOTO_PRESETS = [
  {
    id: 'modern_office',
    label: 'Modern Studio',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'construction_trade',
    label: 'Construction & Trade',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'medical_clinic',
    label: 'Medical & Dental',
    url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'luxury_estate',
    label: 'Luxury Real Estate',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'automotive_pro',
    label: 'Automotive & Garage',
    url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'wedding_event',
    label: 'Event & Hospitality',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'tech_saas',
    label: 'Technology & SaaS',
    url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80',
  },
  {
    id: 'nature_stone',
    label: 'Architectural Stone',
    url: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=1600&q=80',
  },
];

interface StudioThemeGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentThemeId?: string;
  showTopBorder?: boolean;
  onToggleTopBorder?: (enabled: boolean) => void;
  onSelectTheme: (theme: FormThemePreset) => void;
  themeData?: FormTheme;
  onUpdateTheme?: (updates: Partial<FormTheme>) => void;
  mediaPanel?: FormMediaPanel;
  onUpdateMediaPanel?: (panel: FormMediaPanel) => void;
  formName?: string;
}

export function StudioThemeGalleryModal({
  open,
  onOpenChange,
  currentThemeId = 'fieseros-emerald',
  showTopBorder = false,
  onToggleTopBorder,
  onSelectTheme,
  themeData,
  onUpdateTheme,
  mediaPanel,
  onUpdateMediaPanel,
  formName,
}: StudioThemeGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'background' | 'hero_media'>('presets');
  const [customBgUrl, setCustomBgUrl] = useState(themeData?.backgroundImageUrl || '');

  const handleApplyBackground = (url: string | null) => {
    setCustomBgUrl(url || '');
    onUpdateTheme?.({ backgroundImageUrl: url });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl bg-white dark:bg-slate-950">
        <DialogHeader className="p-4 px-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Palette className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                Theme, Design &amp; Background Studio
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Customize 2026 form design presets, 4K background images, and split hero media panels
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
            <TabsList className="h-10 bg-transparent p-0 gap-6">
              <TabsTrigger
                value="presets"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent text-xs font-bold px-1"
              >
                <Palette className="size-3.5 mr-1.5" /> Design Presets
              </TabsTrigger>
              <TabsTrigger
                value="background"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent text-xs font-bold px-1"
              >
                <ImageIcon className="size-3.5 mr-1.5" /> Form Background Image
              </TabsTrigger>
              <TabsTrigger
                value="hero_media"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent text-xs font-bold px-1"
              >
                <Film className="size-3.5 mr-1.5" /> Split Hero Media Panel
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ════ TAB 1: THEME PRESETS ════ */}
          <TabsContent value="presets" className="m-0 p-0">
            {/* Quick Style Options */}
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-muted/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Top Accent Line</p>
                <p className="text-[10px] text-muted-foreground">Show glowing colored accent line at the top of the form</p>
              </div>
              <Switch
                checked={showTopBorder}
                onCheckedChange={(checked) => onToggleTopBorder?.(checked)}
              />
            </div>

            {/* Gallery Grid */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                {THEME_GALLERY_PRESETS.map((theme) => {
                  const isSelected = currentThemeId === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => onSelectTheme(theme)}
                      className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground truncate">{theme.name}</span>
                        {isSelected && (
                          <div className="size-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="size-2.5" />
                          </div>
                        )}
                      </div>

                      {/* Micro Color Palette Swatches */}
                      <div className="flex items-center gap-1.5">
                        <div className="size-5 rounded-full border shadow-2xs" style={{ backgroundColor: theme.primaryColor }} title="Primary" />
                        <div className="size-5 rounded-full border shadow-2xs" style={{ backgroundColor: theme.backgroundColor }} title="Background" />
                        <div className="size-5 rounded-full border shadow-2xs" style={{ backgroundColor: theme.buttonColor }} title="Button" />
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className={`w-full text-xs h-7 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : ''}`}
                      >
                        {isSelected ? 'Active Theme' : 'Apply Theme'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ════ TAB 2: FORM BACKGROUND & BACKDROP ════ */}
          <TabsContent value="background" className="m-0 p-6 space-y-6 max-h-[65vh] overflow-y-auto">
            {/* Direct Custom Image URL */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="size-4 text-emerald-600" />
                Custom Form Background Image URL
              </Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={customBgUrl}
                  onChange={(e) => setCustomBgUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-... or custom image URL"
                  className="text-xs h-9 bg-white dark:bg-slate-900"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleApplyBackground(customBgUrl)}
                  className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  Apply
                </Button>
                {themeData?.backgroundImageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyBackground(null)}
                    className="h-9 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                  >
                    <Trash2 className="size-3.5 mr-1" /> Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Paste any high-resolution image URL to use as the full-page or form backdrop.
              </p>
            </div>

            {/* 8 Curated 4K Unsplash Backdrops */}
            <div className="space-y-2.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-amber-500" />
                1-Click Curated 4K Unsplash Presets
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BACKGROUND_PHOTO_PRESETS.map((preset) => {
                  const isCurrent = themeData?.backgroundImageUrl === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyBackground(preset.url)}
                      className={`group relative rounded-xl overflow-hidden aspect-video border transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-emerald-600 border-emerald-600 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-end">
                        <p className="text-[10px] font-bold text-white leading-tight">
                          {preset.label}
                        </p>
                      </div>
                      {isCurrent && (
                        <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="size-2.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Overlay & Blur Adjustments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-2 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Dark Vignette Overlay</Label>
                  <span className="text-xs font-semibold text-emerald-600">
                    {themeData?.backgroundOverlayOpacity ?? 60}%
                  </span>
                </div>
                <Slider
                  value={[themeData?.backgroundOverlayOpacity ?? 60]}
                  min={0}
                  max={95}
                  step={5}
                  onValueChange={([val]) => onUpdateTheme?.({ backgroundOverlayOpacity: val })}
                  className="py-1"
                />
                <p className="text-[10px] text-muted-foreground">Darkens background for maximum form readability.</p>
              </div>

              <div className="space-y-2 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <Label className="text-xs font-bold text-foreground">Backdrop Glass Blur</Label>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {(['none', 'sm', 'md'] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => onUpdateTheme?.({ backgroundBlur: b })}
                      className={`h-7 rounded-lg text-xs font-semibold border transition-all ${
                        (themeData?.backgroundBlur || 'none') === b
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {b === 'none' ? 'None' : b === 'sm' ? 'Soft' : 'Strong'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Applies frosted glass blur effect to the backdrop.</p>
              </div>
            </div>
          </TabsContent>

          {/* ════ TAB 3: SPLIT HERO MEDIA PANEL ════ */}
          <TabsContent value="hero_media" className="m-0 p-6 max-h-[65vh] overflow-y-auto">
            {mediaPanel && onUpdateMediaPanel ? (
              <FormSplitMediaInspector
                mediaPanel={mediaPanel}
                onChange={onUpdateMediaPanel}
                formName={formName}
              />
            ) : (
              <div className="text-center py-8 space-y-3">
                <Film className="size-10 mx-auto text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  Switch the form layout to <strong>2-Part Split Hero</strong> in the canvas to customize the hero media panel.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
