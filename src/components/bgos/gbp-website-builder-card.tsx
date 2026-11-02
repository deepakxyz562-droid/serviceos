'use client';

import React, { useState } from 'react';
import { Globe, Sparkles, ExternalLink, CheckCircle2, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

interface GbpWebsiteBuilderCardProps {
  businessSlug?: string;
  isGbpConnected?: boolean;
}

export function GbpWebsiteBuilderCard({
  businessSlug = 'business',
  isGbpConnected = false,
}: GbpWebsiteBuilderCardProps) {
  const [generating, setGenerating] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(`https://bgos.fieseros.com/b/${businessSlug}`);
  const [synced, setSynced] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      toast.info('Generating branded website & compiling Google Business Profile data...');
      const res = await authFetch('/api/gbp/website/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncToGoogle: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate website');
      }

      setWebsiteUrl(data.websiteUrl);
      setSynced(data.syncedToGoogle);
      toast.success(data.message || 'Website generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate website');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#009F50] flex items-center justify-center">
            <Globe className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Google Business Website Builder</h3>
            <p className="text-[11px] text-muted-foreground">
              Instant mobile-ready, SEO-optimized business website created directly from your profile.
            </p>
          </div>
        </div>

        <Badge
          variant="secondary"
          className={`text-[10px] font-bold ${
            synced
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800'
          }`}
        >
          {synced ? '● Synced to Google Maps' : '1-Click Site Ready'}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs">
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Public Website URL</span>
          <p className="font-semibold text-foreground truncate select-all">{websiteUrl}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(websiteUrl, '_blank')}
            className="h-8 text-xs gap-1 font-semibold"
          >
            <ExternalLink className="size-3" /> Preview Live Site
          </Button>

          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="h-8 text-xs bg-[#009F50] hover:bg-[#008A45] text-white font-bold gap-1 shadow-xs"
          >
            {generating ? (
              <RefreshCw className="size-3 animate-spin mr-1" />
            ) : (
              <Sparkles className="size-3 mr-1" />
            )}
            Generate & Sync to Google
          </Button>
        </div>
      </div>
    </div>
  );
}
