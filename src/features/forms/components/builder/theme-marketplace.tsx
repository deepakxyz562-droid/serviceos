'use client';

/**
 * Theme Marketplace
 * -----------------
 * UI showing 10 preset themes. Each theme has primaryColor, backgroundColor,
 * borderRadius, and fontFamily. Click to apply via `onApply`.
 *
 * Uses shadcn/ui + lucide-react + Tailwind only.
 */
import { Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ThemePreset {
  id: string;
  name: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'modern', name: 'Modern', primaryColor: '#2563eb', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '0.5rem', fontFamily: 'Inter, sans-serif' },
  { id: 'classic', name: 'Classic', primaryColor: '#1f2937', backgroundColor: '#ffffff', textColor: '#111827', borderRadius: '0.25rem', fontFamily: 'Georgia, serif' },
  { id: 'minimal', name: 'Minimal', primaryColor: '#000000', backgroundColor: '#fafafa', textColor: '#0a0a0a', borderRadius: '0.375rem', fontFamily: 'system-ui, sans-serif' },
  { id: 'bold', name: 'Bold', primaryColor: '#dc2626', backgroundColor: '#ffffff', textColor: '#171717', borderRadius: '0.625rem', fontFamily: 'Arial Black, sans-serif' },
  { id: 'dark', name: 'Dark', primaryColor: '#8b5cf6', backgroundColor: '#0f172a', textColor: '#f1f5f9', borderRadius: '0.5rem', fontFamily: 'Inter, sans-serif' },
  { id: 'pastel', name: 'Pastel', primaryColor: '#f472b6', backgroundColor: '#fdf2f8', textColor: '#831843', borderRadius: '1rem', fontFamily: 'Quicksand, sans-serif' },
  { id: 'gradient', name: 'Gradient', primaryColor: '#6366f1', backgroundColor: '#ffffff', textColor: '#1e1b4b', borderRadius: '0.75rem', fontFamily: 'Poppins, sans-serif' },
  { id: 'corporate', name: 'Corporate', primaryColor: '#0f766e', backgroundColor: '#f8fafc', textColor: '#0f172a', borderRadius: '0.375rem', fontFamily: 'Roboto, sans-serif' },
  { id: 'playful', name: 'Playful', primaryColor: '#f97316', backgroundColor: '#fffbeb', textColor: '#7c2d12', borderRadius: '1.25rem', fontFamily: 'Comic Sans MS, cursive' },
  { id: 'elegant', name: 'Elegant', primaryColor: '#9f1239', backgroundColor: '#fff7ed', textColor: '#4c0519', borderRadius: '0.25rem', fontFamily: 'Playfair Display, serif' },
];

export interface ThemeMarketplaceProps {
  activeThemeId?: string;
  onApply?: (preset: ThemePreset) => void;
  className?: string;
}

export function ThemeMarketplace({ activeThemeId, onApply, className }: ThemeMarketplaceProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-4 w-4" />
          Theme Marketplace
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {THEME_PRESETS.map((preset) => {
            const isActive = preset.id === activeThemeId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApply?.(preset)}
                className={cn(
                  'group relative overflow-hidden rounded-lg border p-3 text-left transition hover:shadow-md',
                  isActive ? 'border-primary ring-2 ring-primary' : 'border-border',
                )}
                style={{
                  backgroundColor: preset.backgroundColor,
                  borderRadius: preset.borderRadius,
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div
                    className="h-6 w-6 rounded-full"
                    style={{ backgroundColor: preset.primaryColor, borderRadius: preset.borderRadius }}
                  />
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-sm font-semibold" style={{ color: preset.textColor, fontFamily: preset.fontFamily }}>
                  {preset.name}
                </div>
                <div className="mt-1 text-[10px]" style={{ color: preset.textColor, opacity: 0.7 }}>
                  {preset.fontFamily.split(',')[0]}
                </div>
              </button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={() => onApply?.(THEME_PRESETS[0])}
          disabled={!onApply}
        >
          Apply Modern Theme
        </Button>
      </CardContent>
    </Card>
  );
}

export default ThemeMarketplace;
