'use client';

import React, { useMemo, useState } from 'react';
import {
  Flame,
  Phone,
  Send,
  QrCode,
  Calendar,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Upload,
  X,
  PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface SeoUpdateMilestone {
  id: string;
  title: string;
  badge?: string;
  bullets: string[];
}

const DEFAULT_MILESTONES: SeoUpdateMilestone[] = [
  {
    id: 'm1',
    title: 'AI Replies Sent to All Past Un-replied Reviews',
    badge: '⚡ New',
    bullets: ['Synced and replied to all past un-replied reviews'],
  },
  {
    id: 'm2',
    title: 'GBP Ranking Benchmark Data Collection Completed',
    badge: '⚡ New',
    bullets: [
      'Stored Views, Calls, Directions, etc. as the benchmark',
      'Prepared the profile for future optimisations by the agent',
    ],
  },
  {
    id: 'm3',
    title: 'AI Replies to GBP Reviews Enabled',
    badge: '⚡ New',
    bullets: [
      'Defined review reply guidelines',
      'Enabled periodic review sync',
      'Enabled auto-replies to new un-replied reviews',
    ],
  },
  {
    id: 'm4',
    title: 'GBP Post Topics Generated',
    badge: '⚡ New',
    bullets: [
      'Generated an in-depth Business Fingerprint',
      'Curated relevant post topics',
    ],
  },
  {
    id: 'm5',
    title: 'GBP Best SEO Keywords Identified',
    badge: '⚡ New',
    bullets: [
      'Analysed business details & shared information',
      'Identified missing keywords',
      'Selected the most suitable keywords',
    ],
  },
  {
    id: 'm6',
    title: 'GBP Ranking Benchmark Data Collection Started',
    badge: '⚡ New',
    bullets: [
      'Generated an internal rank report for chosen keywords',
      'Collected GBP performance data to measure against',
      'Identified opportunities for growth',
    ],
  },
  {
    id: 'm7',
    title: 'GBP Review Request Through WhatsApp Configured',
    badge: '⚡ New',
    bullets: ['Enabled review requests through WhatsApp'],
  },
  {
    id: 'm8',
    title: 'AI Auto-Publishing Enabled for Photos & Videos',
    badge: '⚡ New',
    bullets: [
      'Enabled media publishing to GBP',
      'Configured an optimal media publishing schedule',
    ],
  },
];

interface UrgentReviewCardProps {
  businessName: string;
  reviewUrl: string;
  lastReviewDays?: number;
  totalReviews?: number;
  onOpenBulk?: () => void;
  onOpenQr?: () => void;
}

export function UrgentReviewCard({
  businessName,
  reviewUrl,
  lastReviewDays = 69,
  totalReviews = 0,
  onOpenBulk,
  onOpenQr,
}: UrgentReviewCardProps) {
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [seoModalOpen, setSeoModalOpen] = useState(false);

  const handleSendLink = () => {
    const clean = phone.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsSending(true);
    try {
      const message = `Hi! Thank you for choosing ${businessName}. We’d truly appreciate your feedback! Could you take 30 seconds to leave us a quick Google review? Tap here: ${reviewUrl}`;
      const waNumber = clean.length === 10 ? `91${clean}` : clean;
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      toast.success('WhatsApp review request opened!');
      setPhone('');
    } catch {
      toast.error('Could not open WhatsApp. Please check your browser popup blocker.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4">
        {/* Top Header: Target Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-300">This Week&apos;s Reviews</h2>
          </div>
          <span className="text-sm font-extrabold text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
            0/12
          </span>
        </div>

        {/* Urgency Alert (Fire Icon & Days count) */}
        <div className="flex items-start gap-3 bg-red-950/60 border border-red-800/40 rounded-xl p-3">
          <div className="size-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Flame className="size-3.5 text-red-400" />
          </div>
          <p className="text-xs text-red-200 leading-relaxed">
            Your last review was{' '}
            <strong className="text-red-400 font-bold underline underline-offset-2">
              {lastReviewDays} days ago
            </strong>
            , reviews are vital for good Google ranking.
          </p>
        </div>

        {/* Bulk Review Automation Box */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2.5">
          <h3 className="text-xs font-bold text-slate-100">Get Reviews Every Day, Automatically</h3>
          <p className="text-[11px] text-slate-400">Upload in bulk and we&apos;ll send 5 review messages/day</p>
          <Button
            type="button"
            onClick={onOpenBulk}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Upload className="size-3.5" />
            Schedule Review Messages in Bulk
          </Button>
        </div>

        {/* Direct Customer Phone Input */}
        <div className="space-y-2">
          <div className="relative">
            <Phone className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="tel"
              placeholder="Customer Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9 pr-4 h-10 bg-slate-950/80 border-slate-700 text-slate-100 placeholder:text-slate-500 text-xs rounded-xl focus-visible:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSending}
              onClick={handleSendLink}
              className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-blue-400 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
            >
              <Send className="size-3.5" />
              Send Review Link
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onOpenQr}
              className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-blue-400 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
            >
              <QrCode className="size-3.5" />
              Review QR
            </Button>
          </div>
        </div>

        {/* Footer Link: How it works? */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
          <span className="text-slate-400">How it works?</span>
          <button
            type="button"
            onClick={() => setSeoModalOpen(true)}
            className="text-blue-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>See AI Agent Actions</span>
            <PlayCircle className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Profile SEO Updates Modal (Benchmark Screenshot 6) */}
      <Dialog open={seoModalOpen} onOpenChange={setSeoModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-slate-800 text-left">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <DialogTitle className="text-base font-bold text-slate-100">
                Google Business Profile AI Agent
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Profile SEO Updates completed for <strong className="text-slate-200">{businessName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 overflow-y-auto space-y-3.5">
            {DEFAULT_MILESTONES.map((m) => (
              <div
                key={m.id}
                className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5 space-y-2 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 text-blue-400 shrink-0 mt-0.5" />
                    <h4 className="text-xs font-bold text-slate-200 leading-snug">{m.title}</h4>
                  </div>
                  {m.badge && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                      {m.badge}
                    </span>
                  )}
                </div>

                <ul className="pl-6 space-y-1">
                  {m.bullets.map((b, i) => (
                    <li key={i} className="text-[11px] text-slate-400 list-disc">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">8 milestones active</span>
            <Button
              type="button"
              onClick={() => setSeoModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 px-4 rounded-lg"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
