'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  QrCode,
  Printer,
  Download,
  Share2,
  Sparkles,
  Loader2,
  Palette,
  Check,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

interface StandeeTemplate {
  id: string;
  name: string;
  themeColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  cardBorder: string;
}

interface StandeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName?: string;
}

export function GbpStandeeModal({ open, onOpenChange, businessName }: StandeeModalProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Standee data
  const [standeeData, setStandeeData] = useState<{
    businessName: string;
    tagline: string;
    rating: number;
    totalReviews: number;
    phone: string;
    address: string;
    reviewUrl: string;
    qrDataUrl: string;
    defaultSvg: string;
    templates: StandeeTemplate[];
    sizes: Array<{ id: string; name: string }>;
  } | null>(null);

  // Customization
  const [selectedTemplateId, setSelectedTemplateId] = useState('google_verified');
  const [selectedSize, setSelectedSize] = useState<'a5' | 'table_tent' | 'square_badge'>('a5');
  const [headline, setHeadline] = useState('Scan to Review Us on Google');
  const [subheadline, setSubheadline] = useState('Your feedback helps our local team grow!');
  const [showRating, setShowRating] = useState(true);
  const [showContact, setShowContact] = useState(true);

  // Current preview SVG
  const [previewSvg, setPreviewSvg] = useState<string>('');
  const [printableHtml, setPrintableHtml] = useState<string>('');

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/bgos/qr/standee');
      if (!res.ok) throw new Error('Failed to load standee studio');
      const data = await res.json();
      setStandeeData(data);
      setPreviewSvg(data.defaultSvg || '');
    } catch (err: unknown) {
      toast.error('Could not load standee details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  // Re-generate preview when options change
  useEffect(() => {
    if (!open || !standeeData) return;

    const timer = setTimeout(async () => {
      try {
        const res = await authFetch('/api/bgos/qr/standee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: selectedTemplateId,
            size: selectedSize,
            headline,
            subheadline,
            showRating,
            showContact,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.svg) setPreviewSvg(result.svg);
          if (result.html) setPrintableHtml(result.html);
        }
      } catch {}
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedTemplateId, selectedSize, headline, subheadline, showRating, showContact, open, standeeData]);

  const handlePrint = () => {
    if (!printableHtml && !previewSvg) {
      toast.error('Standee not ready yet.');
      return;
    }

    const htmlToPrint = printableHtml || `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;">${previewSvg}</body></html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlToPrint);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      toast.success('Print window opened!');
    } else {
      toast.error('Pop-up blocked. Please allow pop-ups to print standees.');
    }
  };

  const handleDownloadSvg = () => {
    if (!previewSvg) return;
    const blob = new Blob([previewSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(standeeData?.businessName || 'google-review').toLowerCase().replace(/\s+/g, '-')}-standee.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Print-ready SVG downloaded.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <QrCode className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Printable QR Standee Studio
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Design countertop table tents and review stickers featuring your verified live Google rating.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading && !standeeData ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-12">
            {/* LEFT COLUMN: Controls & Settings */}
            <div className="space-y-4 md:col-span-6">
              {/* Theme Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Palette className="size-3.5 text-primary" />
                  Design Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(standeeData?.templates || []).map((t) => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition ${
                          isSelected
                            ? 'border-primary bg-primary/5 font-semibold text-primary ring-1 ring-primary'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <span
                          className="size-3.5 shrink-0 rounded-full"
                          style={{ backgroundColor: t.themeColor }}
                        />
                        <span className="truncate">{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Standee Size */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Print Size</label>
                <Tabs value={selectedSize} onValueChange={(v) => setSelectedSize(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1">
                    <TabsTrigger value="a5" className="rounded-lg text-[11px] font-semibold">
                      A5 Standee
                    </TabsTrigger>
                    <TabsTrigger value="table_tent" className="rounded-lg text-[11px] font-semibold">
                      4×6 Table Tent
                    </TabsTrigger>
                    <TabsTrigger value="square_badge" className="rounded-lg text-[11px] font-semibold">
                      Sticker (100mm)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Custom Headline & Subtitle */}
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Callout Headline</label>
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Scan to Review Us on Google"
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Subtitle Note</label>
                  <Input
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    placeholder="Your feedback helps our team grow!"
                    className="rounded-xl border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <label className="flex cursor-pointer items-center justify-between text-xs font-medium text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Star className="size-3.5 text-amber-500 fill-amber-500" />
                    Show Verified Google Rating ({standeeData?.rating?.toFixed(1) || '5.0'} ★)
                  </span>
                  <input
                    type="checkbox"
                    checked={showRating}
                    onChange={(e) => setShowRating(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between text-xs font-medium text-slate-800">
                  <span>Show Store Phone & Address</span>
                  <input
                    type="checkbox"
                    checked={showContact}
                    onChange={(e) => setShowContact(e.target.checked)}
                    className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </label>
              </div>

              {/* Honest rating note */}
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-2.5 text-[11px] leading-relaxed text-amber-800">
                <span className="font-bold">Honest Rating Guarantee:</span> BGOS prints your verified live Google rating ({standeeData?.rating?.toFixed(1)} ★ from {standeeData?.totalReviews} reviews). We never fabricate fake 5.0 badges.
              </div>
            </div>

            {/* RIGHT COLUMN: Live SVG Standee Preview */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-100/60 p-4 md:col-span-6">
              <span className="mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Live Standee Preview
              </span>
              <div
                className="max-h-[380px] w-full overflow-hidden rounded-xl border border-slate-300/80 bg-white shadow-md flex items-center justify-center p-2"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
              <span className="mt-2 text-[10px] text-slate-400">
                Rendered at vector 300 DPI for sharp countertop printing
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSvg}
              className="gap-1.5 rounded-xl border-slate-200 text-xs font-semibold hover:bg-slate-50"
            >
              <Download className="size-3.5" />
              Download SVG
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90"
            >
              <Printer className="size-3.5" />
              Print Standee
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
