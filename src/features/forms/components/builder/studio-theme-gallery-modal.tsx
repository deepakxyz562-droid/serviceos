'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Check, Palette, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
}

export const THEME_GALLERY_PRESETS: FormThemePreset[] = [
  {
    id: 'washed-purple',
    name: 'Washed Purple',
    category: 'popular',
    primaryColor: '#9333ea',
    backgroundColor: '#faf5ff',
    cardBackground: '#ffffff',
    textColor: '#581c87',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1rem',
    accentLineColor: '#c084fc',
    buttonColor: '#9333ea',
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
    accentLineColor: '#60a5fa',
    buttonColor: '#2563eb',
    buttonTextColor: '#ffffff',
  },
  {
    id: 'inky-black',
    name: 'Inky Black',
    category: 'dark',
    primaryColor: '#10b981',
    backgroundColor: '#09090b',
    cardBackground: '#18181b',
    textColor: '#f4f4f5',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.75rem',
    accentLineColor: '#3f3f46',
    buttonColor: '#ffffff',
    buttonTextColor: '#09090b',
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
    id: 'neon-emerald',
    name: 'Neon Emerald',
    category: 'bold',
    primaryColor: '#059669',
    backgroundColor: '#f0fdf4',
    cardBackground: '#ffffff',
    textColor: '#064e3b',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '1rem',
    accentLineColor: '#34d399',
    buttonColor: '#059669',
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
    id: 'ocean-teal',
    name: 'Ocean Teal',
    category: 'minimal',
    primaryColor: '#0d9488',
    backgroundColor: '#f0fdfa',
    cardBackground: '#ffffff',
    textColor: '#134e4a',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.75rem',
    accentLineColor: '#2dd4bf',
    buttonColor: '#0d9488',
    buttonTextColor: '#ffffff',
  },
];

interface StudioThemeGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentThemeId?: string;
  onSelectTheme: (theme: FormThemePreset) => void;
}

export function StudioThemeGalleryModal({
  open,
  onOpenChange,
  currentThemeId = 'washed-purple',
  onSelectTheme,
}: StudioThemeGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'my_themes'>('gallery');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl bg-white dark:bg-slate-950">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Palette className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">Theme &amp; Design Studio</DialogTitle>
              <p className="text-xs text-muted-foreground">Pick a curated visual theme or create your own brand style</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'gallery'
                  ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Gallery
            </button>
            <button
              onClick={() => setActiveTab('my_themes')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'my_themes'
                  ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Themes
            </button>
          </div>
        </div>

        {/* Theme Cards Grid */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {THEME_GALLERY_PRESETS.map((preset) => {
              const isSelected = currentThemeId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    onSelectTheme(preset);
                  }}
                  className={`group relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden p-3 flex flex-col justify-between h-44 ${
                    isSelected
                      ? 'border-purple-600 dark:border-purple-400 shadow-md ring-2 ring-purple-600/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm'
                  }`}
                  style={{ backgroundColor: preset.backgroundColor }}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 size-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="size-3" />
                    </div>
                  )}

                  {/* Theme Sample Preview Card */}
                  <div
                    className="rounded-lg p-2.5 space-y-1.5 shadow-xs border border-black/5"
                    style={{ backgroundColor: preset.cardBackground, color: preset.textColor }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold" style={{ color: preset.primaryColor }}>
                        Question
                      </span>
                      <div className="h-1.5 w-6 rounded-full" style={{ backgroundColor: preset.accentLineColor }} />
                    </div>
                    <p className="text-[9px] font-medium opacity-80">Answer text input...</p>
                    <div className="h-1 w-full rounded-full" style={{ backgroundColor: preset.accentLineColor }} />
                    <div
                      className="h-4 rounded text-[8px] font-bold text-center flex items-center justify-center mt-1"
                      style={{
                        backgroundColor: preset.buttonColor,
                        color: preset.buttonTextColor,
                      }}
                    >
                      Button
                    </div>
                  </div>

                  {/* Theme Name Label */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {preset.name}
                    </span>
                    <span
                      className="size-3 rounded-full border border-black/10 shadow-xs"
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-xs text-muted-foreground">
            Changes apply instantly to your live multi-step canvas.
          </p>
          <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
