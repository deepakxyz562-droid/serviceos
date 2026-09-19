'use client';

/**
 * Fieseros Universal Studio - Global Styles & Design System Modal
 * Elementor Site Settings: Global Colors, Fonts, Corner Styles, Buttons, Cards.
 */

import React from 'react';
import { Palette, Check, Sparkles, Sliders, Type } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudioGlobalTheme } from '@/lib/studio/schema/project';

const THEME_PALETTES = [
  { id: 'emerald', name: 'Emerald Mint', primary: '#059669', bg: '#f0fdf4', surface: '#ffffff' },
  { id: 'ocean', name: 'Sky Blue', primary: '#0284c7', bg: '#f0f9ff', surface: '#ffffff' },
  { id: 'sunset', name: 'Sunset Orange', primary: '#ea580c', bg: '#fff7ed', surface: '#ffffff' },
  { id: 'amethyst', name: 'Amethyst Purple', primary: '#9333ea', bg: '#faf5ff', surface: '#ffffff' },
  { id: 'rose', name: 'Cherry Rose', primary: '#e11d48', bg: '#fff1f2', surface: '#ffffff' },
  { id: 'slate', name: 'Mono Slate', primary: '#0f172a', bg: '#f8fafc', surface: '#ffffff' },
];

const GOOGLE_FONTS = [
  'Inter',
  'Plus Jakarta Sans',
  'Outfit',
  'Poppins',
  'Bricolage Grotesque',
  'Roboto',
  'Montserrat',
];

interface GlobalStylesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  globalTheme: StudioGlobalTheme;
  onUpdateGlobalTheme: (theme: Partial<StudioGlobalTheme>) => void;
}

export function StudioGlobalStylesModal({
  open,
  onOpenChange,
  globalTheme,
  onUpdateGlobalTheme,
}: GlobalStylesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            Global Design System &amp; Site Styles
          </DialogTitle>
          <DialogDescription className="text-xs">
            Configure global colors, typography, and corner rounding synchronized across all pages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* 1. Theme Color Palettes */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">Brand Color Palette</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {THEME_PALETTES.map((palette) => {
                const isSelected = globalTheme.primaryColor === palette.primary;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() =>
                      onUpdateGlobalTheme({
                        primaryColor: palette.primary,
                        backgroundColor: palette.bg,
                        surfaceColor: palette.surface,
                      })
                    }
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected ? 'border-primary ring-2 ring-primary/30 shadow-xs' : 'border-border/60 hover:border-border'
                    }`}
                  >
                    <div
                      className="size-7 rounded-full shadow-inner flex items-center justify-center mb-1"
                      style={{ backgroundColor: palette.primary }}
                    >
                      {isSelected && <Check className="size-3.5 text-white" />}
                    </div>
                    <span className="text-[10px] font-semibold truncate max-w-full">{palette.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Theme Mode Switcher */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">App Theme Mode</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateGlobalTheme({
                    themeMode: 'light',
                    backgroundColor: '#f8fafc',
                    surfaceColor: '#ffffff',
                    textColor: '#0f172a',
                  })
                }
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  globalTheme.themeMode === 'light'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/40 hover:bg-muted border-border'
                }`}
              >
                ☀️ Light Mode
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateGlobalTheme({
                    themeMode: 'dark',
                    backgroundColor: '#0f172a',
                    surfaceColor: '#1e293b',
                    textColor: '#f8fafc',
                  })
                }
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  globalTheme.themeMode === 'dark'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/40 hover:bg-muted border-border'
                }`}
              >
                🌙 Dark Mode
              </button>
            </div>
          </div>

          {/* 3. Corner Style Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">Global Corner Rounding</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { radius: '0px', label: 'Square' },
                { radius: '8px', label: 'Soft (8px)' },
                { radius: '16px', label: 'Rounded (16px)' },
                { radius: '9999px', label: 'Pill (Full)' },
              ].map((c) => {
                const isSelected = globalTheme.borderRadius === c.radius;
                return (
                  <button
                    key={c.radius}
                    type="button"
                    onClick={() => onUpdateGlobalTheme({ borderRadius: c.radius as any })}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 hover:bg-muted border-border'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Global Typography */}
          <div className="space-y-2">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Type className="size-3.5 text-primary" /> Global Font Family
            </Label>
            <Select
              value={globalTheme.fontFamily || 'Inter'}
              onValueChange={(val) => onUpdateGlobalTheme({ fontFamily: val, headingFontFamily: val })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOOGLE_FONTS.map((font) => (
                  <SelectItem key={font} value={font} className="text-xs font-medium">
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={() => onOpenChange(false)} className="font-bold">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
