'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Theme & Branding — platform-wide branding (logo, colors, fonts) and email
// template theme. Includes a live preview mock of how the brand renders.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Palette, Upload, Image as ImageIcon, Save, Mail, Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { SectionHeader, DemoDataPill } from '@/components/views/superadmin/_shared';

// ─── Demo data ───────────────────────────────────────────────────────────────

interface ColorSwatch {
  name: string;
  hex: string;
  className: string;
}

const COLORS: ColorSwatch[] = [
  { name: 'Primary', hex: '#10b981', className: 'bg-emerald-500' },
  { name: 'Accent', hex: '#0ea5e9', className: 'bg-sky-500' },
  { name: 'Success', hex: '#22c55e', className: 'bg-green-500' },
  { name: 'Warning', hex: '#f59e0b', className: 'bg-amber-500' },
];

interface EmailTemplate {
  name: string;
  className: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  { name: 'Welcome Email', className: 'from-emerald-500/20 to-emerald-500/5' },
  { name: 'Invoice Email', className: 'from-sky-500/20 to-sky-500/5' },
  { name: 'Notification Email', className: 'from-amber-500/20 to-amber-500/5' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function ThemeBrandingSection() {
  const { theme, setTheme } = useTheme();
  const [platformName, setPlatformName] = useState('Fieseros');
  const [tagline, setTagline] = useState('Run your service business on one platform.');
  const [brandedHeader, setBrandedHeader] = useState(true);
  const [brandedFooter, setBrandedFooter] = useState(true);
  const [defaultPlatformTheme, setDefaultPlatformTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fieseros_platform_default_theme') as 'light' | 'dark' | 'system' | null;
      if (stored) {
        setDefaultPlatformTheme(stored);
      }
    }
  }, []);

  function saveBranding() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fieseros_platform_default_theme', defaultPlatformTheme);
    }
    setTheme(defaultPlatformTheme);
    toast.success(`Platform theme & branding updated! Default theme is now ${defaultPlatformTheme.toUpperCase()}`);
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Theme & Branding"
        description="Platform-wide branding — default theme (Light/Dark), logo, colors, fonts, email templates."
        icon={Palette}
        actions={<DemoDataPill />}
      />

      {/* Row 1 — 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Brand Identity & Default Theme */}
        <Card className="card-shadow lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Platform Theme & Brand Identity</CardTitle>
            <CardDescription>Configure global default theme mode, logo, name, and core color palette.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Platform Default Theme Selector */}
            <div className="space-y-2.5 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Palette className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Site-Wide Default Theme
                </Label>
                <Badge variant="outline" className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Default: Light Mode
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose the default theme served to first-time visitors, unauthenticated landing pages, and new user signups.
              </p>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDefaultPlatformTheme('light');
                    setPreviewMode('light');
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all cursor-pointer',
                    defaultPlatformTheme === 'light'
                      ? 'border-emerald-600 bg-white dark:bg-slate-900 text-foreground shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  <Sun className={cn('size-5', defaultPlatformTheme === 'light' ? 'text-amber-500' : 'text-muted-foreground')} />
                  <span className="font-semibold">Light</span>
                  <span className="text-[10px] text-muted-foreground">(Recommended)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDefaultPlatformTheme('dark');
                    setPreviewMode('dark');
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all cursor-pointer',
                    defaultPlatformTheme === 'dark'
                      ? 'border-emerald-600 bg-slate-900 text-white shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  <Moon className={cn('size-5', defaultPlatformTheme === 'dark' ? 'text-teal-400' : 'text-muted-foreground')} />
                  <span className="font-semibold">Dark</span>
                  <span className="text-[10px] text-muted-foreground">Obsidian</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDefaultPlatformTheme('system');
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all cursor-pointer',
                    defaultPlatformTheme === 'system'
                      ? 'border-emerald-600 bg-white dark:bg-slate-900 text-foreground shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                  )}
                >
                  <Laptop className={cn('size-5', defaultPlatformTheme === 'system' ? 'text-emerald-500' : 'text-muted-foreground')} />
                  <span className="font-semibold">System</span>
                  <span className="text-[10px] text-muted-foreground">Auto Detect</span>
                </button>
              </div>
            </div>

            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <button
                type="button"
                onClick={() => toast.info('Logo upload is a demo action')}
                className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
                  <Upload className="size-4 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">Drop logo here or click to upload</span>
              </button>
              <div className="flex items-center gap-2 mt-2">
                <div className="size-8 rounded bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="size-4 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">current_logo.png · 4.2 KB</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-name">Platform Name</Label>
              <Input id="brand-name" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-tagline">Tagline</Label>
              <Input id="brand-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>

            <Separator />

            {/* Color swatches */}
            <div className="space-y-3">
              <Label>Color Palette</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COLORS.map((c) => (
                  <div key={c.name} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                    <div className={cn('size-8 rounded-full shrink-0 ring-2 ring-background border border-border', c.className)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">{c.name}</p>
                      <Input defaultValue={c.hex} className="h-7 mt-1 font-mono text-xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={saveBranding} className="bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"><Save className="size-4 mr-2" />Save Theme & Branding</Button>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="card-shadow lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Live Preview</CardTitle>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewMode('light')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer flex items-center gap-1',
                    previewMode === 'light' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                  )}
                >
                  <Sun className="size-3 text-amber-500" /> Light
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('dark')}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer flex items-center gap-1',
                    previewMode === 'dark' ? 'bg-slate-900 text-white shadow-xs' : 'text-muted-foreground'
                  )}
                >
                  <Moon className="size-3 text-teal-400" /> Dark
                </button>
              </div>
            </div>
            <CardDescription>Preview how your brand & theme mode renders to clients.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className={cn(
              'rounded-xl border overflow-hidden transition-all flex-1 flex flex-col',
              previewMode === 'dark'
                ? 'bg-slate-950 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            )}>
              {/* mock browser chrome */}
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-2 border-b text-[10px]',
                previewMode === 'dark' ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-slate-100/90 border-slate-200 text-slate-500'
              )}>
                <span className="size-2.5 rounded-full bg-red-400/80" />
                <span className="size-2.5 rounded-full bg-amber-400/80" />
                <span className="size-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 truncate font-mono">app.fieseros.com</span>
                <span className="ml-auto text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {previewMode} mode
                </span>
              </div>
              <div className="p-4 space-y-3.5 flex-1">
                {/* fake header */}
                <div className={cn(
                  'flex items-center justify-between pb-2 border-b',
                  previewMode === 'dark' ? 'border-slate-800' : 'border-slate-100'
                )}>
                  <div className="flex items-center gap-2">
                    <div className="size-5 rounded-md bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">F</div>
                    <span className="text-xs font-bold">{platformName}</span>
                  </div>
                  <span className="h-5 px-2 inline-flex items-center rounded-full bg-emerald-500 text-white text-[9px] font-semibold">Live</span>
                </div>
                <div className={cn(
                  'h-2.5 w-3/4 rounded',
                  previewMode === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                )} />
                <div className={cn(
                  'h-2 w-1/2 rounded',
                  previewMode === 'dark' ? 'bg-slate-850 bg-slate-800/60' : 'bg-slate-100/80'
                )} />

                {/* fake cards */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className={cn(
                    'p-2.5 rounded-lg border text-[10px]',
                    previewMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  )}>
                    <p className="text-[9px] text-muted-foreground">Total Bookings</p>
                    <p className="text-xs font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">1,248 jobs</p>
                  </div>
                  <div className={cn(
                    'p-2.5 rounded-lg border text-[10px]',
                    previewMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  )}>
                    <p className="text-[9px] text-muted-foreground">Revenue</p>
                    <p className="text-xs font-bold mt-0.5 text-foreground">$184,200</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <span className="h-7 px-3 inline-flex items-center rounded-lg bg-emerald-500 text-white text-[10px] font-semibold">New Work Order</span>
                  <span className={cn(
                    'h-7 px-3 inline-flex items-center rounded-lg border text-[10px] font-medium',
                    previewMode === 'dark' ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'
                  )}>Dispatch Map</span>
                </div>
                {/* fake success toast */}
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                  <Check className="size-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Theme initialized smoothly</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Email template theme */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="size-4 text-primary" />Email Template Theme
          </CardTitle>
          <CardDescription>Templates inherited by transactional and marketing emails.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {EMAIL_TEMPLATES.map((t) => (
              <div key={t.name} className="rounded-lg border border-border overflow-hidden">
                <div className={cn('aspect-[4/3] bg-gradient-to-br flex items-center justify-center', t.className)}>
                  <ImageIcon className="size-8 text-muted-foreground/50" />
                </div>
                <div className="p-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{t.name}</span>
                  <Button variant="outline" size="sm" onClick={() => toast.info(`Customizing ${t.name}`)}>Customize</Button>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Use branded email header</p>
                <p className="text-[11px] text-muted-foreground">Prepend the platform logo and name to all outgoing emails.</p>
              </div>
              <Switch checked={brandedHeader} onCheckedChange={setBrandedHeader} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Use branded email footer</p>
                <p className="text-[11px] text-muted-foreground">Append social links, legal address, and unsubscribe to all emails.</p>
              </div>
              <Switch checked={brandedFooter} onCheckedChange={setBrandedFooter} />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
