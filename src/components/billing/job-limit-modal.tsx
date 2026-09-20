'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Shield, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface JobLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count?: number;
}

export function JobLimitModal({ open, onOpenChange, count = 100 }: JobLimitModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push('/billing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-border/80 shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/20 px-2.5 py-0.5 text-xs font-semibold">
              <Zap className="w-3 h-3 mr-1" /> Milestone Achieved
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            You've reached {count} Free Lifetime Jobs! 🎉
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            You have successfully run your operations on Fieseros. Upgrade to{' '}
            <strong className="text-foreground font-semibold">Starter ($29/mo)</strong> to keep creating unlimited jobs and unlock multi-user dispatch.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Included in Starter Plan
            </h4>
            <div className="grid grid-cols-1 gap-2.5 text-xs text-foreground/90 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span><strong>Unlimited Jobs & Visits</strong> — never worry about caps</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span><strong>Up to 5 Users / Techs</strong> — assign and dispatch team members</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span><strong>Online Credit Card & Link Payments</strong> — get paid faster</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span><strong>Google Calendar 2-Way Sync</strong> & customer self-booking</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>No long-term contracts · Cancel anytime</span>
            <span className="font-semibold text-foreground">$29 / month</span>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-muted/20 border-t border-border/40 gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={handleUpgrade} className="gap-1.5 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Upgrade to Starter
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
