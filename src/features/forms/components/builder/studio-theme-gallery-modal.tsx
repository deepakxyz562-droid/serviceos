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
    id: 'fieseros-emerald',
    name: 'Fieseros Emerald',
    category: 'popular',
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
    id: 'ocean-teal',
    name: 'Ocean Teal',
    category: 'popular',
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
  currentThemeId = 'fieseros-emerald',
  onSelectTheme,
}: StudioThemeGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'my_themes'>('gallery');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl bg-white dark:bg-slate-950">
        <DialogHeader className="p-4 px-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Palette className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                Theme Studio &amp; Design Presets
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Select high-conversion modern form design systems &amp; responsive typography
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Gallery Grid */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {THEME_GALLERY_PRESETS.map((theme) => {
              const isSelected = currentThemeId === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => {
                    onSelectTheme(theme);
                    onOpenChange(false);
                  }}
                  className={`group relative rounded-xl border p-3 cursor-pointer transition-all hover:shadow-lg ${
                    isSelected
                      ? 'border-emerald-600 dark:border-emerald-400 shadow-md ring-2 ring-emerald-600/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                  style={{ backgroundColor: theme.backgroundColor }}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 size-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}

                  {/* Visual Preview Box */}
                  <div
                    className="rounded-lg p-3 shadow-xs space-y-2 border border-black/5"
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderRadius: theme.borderRadius,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <div
                        className="h-2 w-16 rounded-full opacity-60"
                        style={{ backgroundColor: theme.textColor }}
                      />
                    </div>

                    <div
                      className="h-1.5 w-full rounded-full opacity-30"
                      style={{ backgroundColor: theme.accentLineColor }}
                    />
                    <div
                      className="h-1.5 w-3/4 rounded-full opacity-30"
                      style={{ backgroundColor: theme.accentLineColor }}
                    />

                    <div
                      className="mt-2 py-1 px-2.5 rounded text-[10px] font-bold text-center shadow-2xs"
                      style={{
                        backgroundColor: theme.buttonColor,
                        color: theme.buttonTextColor,
                      }}
                    >
                      Submit Button
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p
                        className="text-xs font-bold leading-tight"
                        style={{ color: theme.textColor }}
                      >
                        {theme.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {theme.category}
                      </p>
                    </div>

                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                      style={{
                        borderColor: theme.accentLineColor,
                        color: theme.primaryColor,
                      }}
                    >
                      Use
                    </span>
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
