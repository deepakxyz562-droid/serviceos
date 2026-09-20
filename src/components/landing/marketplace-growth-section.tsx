'use client';

import * as React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  Users,
  Repeat,
  DollarSign,
  Building2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export function MarketplaceGrowthSection() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1">
          <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Demand & Network Growth
        </Badge>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Need more work? Win it on Fieseros.
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          Bid on high-intent local jobs without paying upfront for every lead. Pay a completion fee only when you successfully win and finish the work.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Marketplace Bid Comparison Mockup */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-sm p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Verified Job Request</span>
                <h4 className="text-sm font-bold text-foreground">Emergency Boiler Diagnostic & Repair</h4>
                <p className="text-xs text-muted-foreground">London W8 · Today Morning · Photos attached</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold">Ready to Hire</Badge>
            </div>

            {/* 3 Tier Options */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl border border-border bg-background/80 space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Standard</span>
                <p className="text-sm font-bold text-foreground">£240</p>
                <div className="text-[10px] text-amber-500 font-semibold">4.8 ★</div>
                <span className="text-[9px] text-muted-foreground block">Tomorrow</span>
              </div>

              <div className="p-3 rounded-xl border border-primary/40 bg-primary/5 space-y-1 ring-1 ring-primary/30 relative">
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] px-1.5 py-0 bg-primary text-primary-foreground">
                  BEST VALUE
                </Badge>
                <span className="text-[10px] text-primary font-semibold">Fast Response</span>
                <p className="text-sm font-bold text-foreground">£285</p>
                <div className="text-[10px] text-amber-500 font-semibold">4.9 ★</div>
                <span className="text-[9px] text-emerald-600 font-semibold block">Today 10:30 AM</span>
              </div>

              <div className="p-3 rounded-xl border border-border bg-background/80 space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Premium</span>
                <p className="text-sm font-bold text-foreground">£340</p>
                <div className="text-[10px] text-amber-500 font-semibold">5.0 ★</div>
                <span className="text-[9px] text-muted-foreground block">Today 9:00 AM</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Contractor bidding fee:</span>
              <span className="font-bold text-emerald-600">£0.00 (Free to Bid)</span>
            </div>
          </div>
        </div>

        {/* The Growth Flywheel Story */}
        <div className="lg:col-span-6 space-y-4">
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-foreground">
              A marketplace job becomes a permanent customer relationship
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Most lead-generation platforms sell you dead contact info and disappear. With Fieseros, every won job flows straight into your CRM — where you dispatch technicians, send invoices, collect payments, and retain repeat business.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 text-xs">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div>
                <strong className="text-foreground">Bid with Zero Upfront Cost</strong>
                <p className="text-muted-foreground">Submit custom quotes to active homeowners in your service area for free.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div>
                <strong className="text-foreground">Won Jobs Flow Into Fieseros OS</strong>
                <p className="text-muted-foreground">Schedule technicians, track GPS, take photo proof, and get customer signatures on-site.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div>
                <strong className="text-foreground">Retain 100% of the Customer Relationship</strong>
                <p className="text-muted-foreground">Customer history, recurring maintenance reminders, and future direct bookings belong to you.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Button size="sm" asChild className="font-semibold text-xs h-9">
              <Link href="/request">
                Find Marketplace Jobs <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
            <Button size="sm" variant="ghost" asChild className="text-xs h-9 text-muted-foreground hover:text-foreground">
              <Link href="/request">
                Need a Local Pro? Post a Job →
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
