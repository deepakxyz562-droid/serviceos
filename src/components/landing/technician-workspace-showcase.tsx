'use client';

import * as React from 'react';
import {
  Smartphone,
  MapPin,
  Camera,
  CheckCircle2,
  Clock,
  KeyRound,
  FileSignature,
  WifiOff,
  Navigation,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function TechnicianWorkspaceShowcase() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1">
          <Smartphone className="w-3.5 h-3.5 mr-1.5" /> Field Workforce First
        </Badge>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Your technicians get their own mobile workspace
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          Give field engineers everything they need on their phone — daily schedules, live GPS turn-by-turn, photo uploads, and customer sign-off.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Mobile Phone Mockup */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[320px] rounded-[36px] border-[6px] border-border/80 bg-background shadow-2xl p-4 space-y-3.5 relative overflow-hidden">
            {/* Phone Notch */}
            <div className="w-28 h-4 bg-muted/80 rounded-full mx-auto mb-1 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-background/80" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Field Workspace</span>
                <p className="text-xs font-bold text-foreground">Dave Miller (Tech)</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] px-1.5 py-0.5 font-mono">
                <WifiOff className="w-2.5 h-2.5 mr-1" /> Offline Ready
              </Badge>
            </div>

            {/* Current Active Job Card */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">CURRENT JOB</Badge>
                <span className="text-[10px] text-muted-foreground font-mono">ETA: 8 mins</span>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Emergency Boiler Diagnostic</p>
                <p className="text-[11px] text-muted-foreground">Sarah Jenkins · 42 Kensington Gardens</p>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <div className="rounded bg-background/80 border border-border/60 p-1.5 text-center">
                  <span className="text-[9px] text-muted-foreground">Arrival PIN</span>
                  <p className="text-xs font-mono font-bold text-primary">8419</p>
                </div>
                <div className="rounded bg-background/80 border border-border/60 p-1.5 text-center">
                  <span className="text-[9px] text-muted-foreground">Est. Quoted</span>
                  <p className="text-xs font-bold text-emerald-600">£250.00</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                <Navigation className="w-3 h-3 text-primary" /> Turn-by-turn directions synced
              </div>
            </div>

            {/* Today's Schedule List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Today's Route (3 Jobs)</span>
              
              <div className="p-2 rounded-lg bg-card border border-border/60 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground font-mono">09:00 AM</span>
                  <p className="font-semibold text-foreground text-[11px]">HVAC Seasonal Maintenance</p>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">Done ✓</span>
              </div>

              <div className="p-2 rounded-lg bg-card border border-border/60 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground font-mono">14:00 PM</span>
                  <p className="font-semibold text-foreground text-[11px]">Commercial Heat Pump Inspection</p>
                </div>
                <span className="text-[10px] text-muted-foreground">Upcoming</span>
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="pt-1">
              <Button size="sm" className="w-full text-xs h-8 gap-1 font-semibold">
                <Camera className="w-3.5 h-3.5" />
                Upload Before/After Photos
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Arrival PIN Verification</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customers receive a 4-digit PIN via SMS. Technicians enter it on arrival to verify physical on-site presence.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Before & After Photo Proof</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Capture geotagged, timestamped photo evidence directly to the job file, preventing disputed claims.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileSignature className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Digital Sign-Off on Glass</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customers sign quotes and completed work directly on the technician's phone, triggering instant invoice delivery.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-foreground">GPS & Time Tracking</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automated travel and job timers record exact technician hours, giving you true job profitability reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
