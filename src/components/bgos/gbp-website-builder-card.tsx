'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

interface GbpWebsiteBuilderCardProps {
  businessSlug?: string;
  businessName?: string;
  isGbpConnected?: boolean;
  presenceMode?: 'no_website' | 'bgos_hosted' | 'custom_domain';
  hostedTier?: 'A' | 'B' | 'C' | null;
  websiteScore?: number | null;
  onOpenSeoAudit?: () => void;
}

export function GbpWebsiteBuilderCard({
  businessSlug = 'business',
  businessName,
  isGbpConnected = false,
  presenceMode,
  hostedTier,
  websiteScore,
  onOpenSeoAudit,
}: GbpWebsiteBuilderCardProps) {
  const [generating, setGenerating] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(`https://${businessSlug}.bgos.site`);
  const [synced, setSynced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    setWebsiteUrl(`https://${businessSlug}.bgos.site`);
    setQrDataUrl('');
  }, [businessSlug]);

  useEffect(() => {
    if (!qrOpen || qrDataUrl) return;
    QRCode.toDataURL(websiteUrl, { width: 320, margin: 2 })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [qrOpen, qrDataUrl, websiteUrl]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(websiteUrl);
      setCopied(true);
      toast.success('Business page link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleShareWhatsApp = () => {
    const label = businessName ? `${businessName} — ` : '';
    const text = encodeURIComponent(
      `${label}View services, hours, directions & book online: ${websiteUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      toast.info('Generating branded website & compiling Google Business Profile data...');
      const res = await authFetch('/api/gbp/website/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncToGoogle: isGbpConnected }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate website');
      }

      setWebsiteUrl(data.websiteUrl);
      setSynced(Boolean(data.syncedToGoogle));
      toast.success(data.message || 'Website generated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate website');
    } finally {
      setGenerating(false);
    }
  };

  const handleEnrichSeo = async () => {
    try {
      setEnriching(true);
      const res = await authFetch('/api/seo/fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', actionKey: 'hosted_seo_enrich' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Could not enrich hosted SEO copy');
      }
      if (data?.result?.websiteUrl) setWebsiteUrl(data.result.websiteUrl);
      toast.success(data?.result?.message || 'Hosted SEO copy & FAQ schema enriched!');
    } catch (err: any) {
      toast.error(err.message || 'SEO enrichment failed');
    } finally {
      setEnriching(false);
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
              Instant mobile-ready, AI-indexable business website with LocalBusiness &amp; FAQ schema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {presenceMode && (
            <Badge variant="outline" className="text-[10px] font-bold">
              {presenceMode === 'custom_domain'
                ? 'Custom Domain'
                : presenceMode === 'bgos_hosted'
                  ? `Hosted${hostedTier ? ` · Tier ${hostedTier}` : ''}`
                  : 'No Website Yet'}
            </Badge>
          )}
          {websiteScore != null && (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              SEO {websiteScore}/100
            </Badge>
          )}
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
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs">
        <div className="space-y-0.5 min-w-0">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Public Business Page URL</span>
          <p className="font-semibold text-foreground truncate select-all">{websiteUrl}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(websiteUrl, '_blank')}
            className="h-8 text-xs gap-1 font-semibold"
          >
            <ExternalLink className="size-3" /> Preview Page
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyUrl}
            className="h-8 text-xs gap-1 font-semibold"
          >
            {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy Link'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleShareWhatsApp}
            className="h-8 text-xs gap-1 font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <MessageCircle className="size-3" /> WhatsApp
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setQrOpen(true)}
            className="h-8 text-xs gap-1 font-semibold"
          >
            <QrCode className="size-3" /> QR
          </Button>

          {onOpenSeoAudit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenSeoAudit}
              className="h-8 text-xs gap-1 font-semibold"
            >
              <ShieldCheck className="size-3 text-[#009F50]" /> AI SEO Audit
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleEnrichSeo}
            disabled={enriching || generating}
            className="h-8 text-xs gap-1 font-semibold border-[#009F50]/30 text-[#009F50]"
          >
            {enriching ? (
              <RefreshCw className="size-3 animate-spin" />
            ) : (
              <Wrench className="size-3" />
            )}
            Enrich AI Schema
          </Button>

          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating || enriching}
            className="h-8 text-xs bg-[#009F50] hover:bg-[#008A45] text-white font-bold gap-1 shadow-xs"
          >
            {generating ? (
              <RefreshCw className="size-3 animate-spin mr-1" />
            ) : (
              <Sparkles className="size-3 mr-1" />
            )}
            Generate &amp; Sync to Google
          </Button>
        </div>
      </div>

      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Business Page QR Code</h4>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-border bg-white p-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Business Page QR" className="size-44" />
              ) : (
                <div className="flex size-44 items-center justify-center text-xs text-slate-400">
                  Generating...
                </div>
              )}
              <p className="mt-2 max-w-full truncate text-[11px] text-slate-500">{websiteUrl}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={handleShareWhatsApp} className="text-xs gap-1">
                <MessageCircle className="size-3" /> WhatsApp
              </Button>
              <Button
                size="sm"
                disabled={!qrDataUrl}
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = qrDataUrl;
                  a.download = `${businessSlug}-qr.png`;
                  a.click();
                }}
                className="text-xs gap-1 bg-[#009F50] hover:bg-[#008A45] text-white"
              >
                <Download className="size-3" /> Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
