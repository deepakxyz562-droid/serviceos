'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Theme & Branding — platform-wide branding (logo, colors, fonts) and email
// template theme. Includes a live preview mock of how the brand renders.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Palette, Upload, Image as ImageIcon, Save, Mail } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  const [platformName, setPlatformName] = useState('ServiceOS');
  const [tagline, setTagline] = useState('Run your service business on one platform.');
  const [brandedHeader, setBrandedHeader] = useState(true);
  const [brandedFooter, setBrandedFooter] = useState(true);

  function saveBranding() { toast.success('Branding updated'); }

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Theme & Branding"
        description="Platform-wide branding — logo, colors, fonts, email templates."
        icon={Palette}
        actions={<DemoDataPill />}
      />

      {/* Row 1 — 60/40 split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Brand Identity */}
        <Card className="card-shadow lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Brand Identity</CardTitle>
            <CardDescription>Logo, name, and core color palette.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <button
                type="button"
                onClick={() => toast.info('Logo upload is a demo action')}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                  <Upload className="size-5 text-muted-foreground" />
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

            <Button onClick={saveBranding}><Save className="size-4 mr-2" />Save Branding</Button>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Live Preview</CardTitle>
            <CardDescription>How your brand renders in-app.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              {/* mock browser chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/40">
                <span className="size-2.5 rounded-full bg-red-400/70" />
                <span className="size-2.5 rounded-full bg-amber-400/70" />
                <span className="size-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-[10px] text-muted-foreground truncate">app.ServiceOS.io</span>
              </div>
              <div className="p-4 space-y-3">
                {/* fake header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{platformName}</span>
                  <span className="h-6 px-2 inline-flex items-center rounded bg-emerald-500 text-white text-[10px] font-medium">Primary</span>
                </div>
                <div className="h-2 w-3/4 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
                <div className="flex gap-2 pt-1">
                  <span className="h-7 px-3 inline-flex items-center rounded-md bg-emerald-500 text-white text-[10px] font-medium">Get Started</span>
                  <span className="h-7 px-3 inline-flex items-center rounded-md border border-border text-[10px] font-medium">Learn More</span>
                </div>
                {/* fake success toast */}
                <div className="mt-2 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Saved successfully</span>
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
