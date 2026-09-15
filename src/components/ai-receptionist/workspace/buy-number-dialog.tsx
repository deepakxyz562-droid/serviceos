'use client';

/**
 * BuyNumberDialog
 * ===============
 *
 * Reusable dialog for searching and purchasing phone numbers.
 * Used by both the Phone Numbers tab (workspace) and onboarding flows.
 *
 * Features:
 *   - Quick Area Code presets (NYC, LA, SF, Chicago, Miami, Dallas, etc.)
 *   - Clear voice + SMS capability badges
 *   - Multi-step animated provisioning loader
 *   - Error handling for addon limits & conflicts
 *
 * NEVER exposes provider IDs (Twilio SID, Vapi number ID).
 */

import { useState } from 'react';
import {
  Phone,
  Loader2,
  CheckCircle2,
  Search,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Check,
} from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SearchNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

interface BuyNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const POPULAR_AREA_CODES = [
  { code: '212', city: 'New York' },
  { code: '312', city: 'Chicago' },
  { code: '415', city: 'San Francisco' },
  { code: '305', city: 'Miami' },
  { code: '214', city: 'Dallas' },
  { code: '404', city: 'Atlanta' },
  { code: '206', city: 'Seattle' },
  { code: '303', city: 'Denver' },
];

export function BuyNumberDialog({ open, onOpenChange, onSuccess }: BuyNumberDialogProps) {
  const [step, setStep] = useState<'search' | 'results' | 'purchasing'>('search');
  const [loading, setLoading] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [numbers, setNumbers] = useState<SearchNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provisionStep, setProvisionStep] = useState(1);

  const handleSearch = async (customCode?: string) => {
    setLoading(true);
    setError(null);
    const codeToUse = customCode !== undefined ? customCode : areaCode;
    try {
      const params = new URLSearchParams({
        countryCode: 'US',
        capabilities: 'voice,sms',
      });
      if (codeToUse) params.set('areaCode', codeToUse);

      const res = await fetch(`/api/addons/phones/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNumbers(data.numbers || []);
        setStep('results');
        if ((data.numbers || []).length === 0) {
          setError(`No numbers available for area code ${codeToUse || 'selected'}. Try searching nationwide or another area code.`);
        }
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to search numbers');
        toast.error(err.error || 'Failed to search numbers');
      }
    } catch {
      setError('Network error. Please try again.');
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (phoneNumber: string) => {
    setStep('purchasing');
    setSelectedNumber(phoneNumber);
    setLoading(true);
    setError(null);
    setProvisionStep(1);

    // Step progression animation
    const timer1 = setTimeout(() => setProvisionStep(2), 1200);
    const timer2 = setTimeout(() => setProvisionStep(3), 2400);

    try {
      const idempotencyKey = `buy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const res = await fetch('/api/addons/phones/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          phoneNumber,
          friendlyName: 'Business Line',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        clearTimeout(timer1);
        clearTimeout(timer2);
        toast.success(`Phone number ${phoneNumber} activated successfully!`);
        handleClose();
        onSuccess?.();
      } else if (res.status === 409) {
        clearTimeout(timer1);
        clearTimeout(timer2);
        setError(data.error || 'This number was just taken. Please choose another.');
        toast.error(data.error || 'Number already taken');
        setStep('results');
      } else if (res.status === 403) {
        clearTimeout(timer1);
        clearTimeout(timer2);
        if (data.code === 'ADDON_REQUIRED') {
          setError('AI Receptionist subscription required to purchase a phone number.');
          toast.error('Purchase the AI Receptionist add-on first');
        } else if (data.code === 'LIMIT_REACHED') {
          setError(`You've reached your included phone number limit (${data.included || 1} included). Upgrade your plan or release an inactive line.`);
          toast.error(`Limit reached: ${data.included || 1} numbers included`);
        } else {
          setError(data.error || 'Purchase not allowed');
          toast.error(data.error || 'Purchase failed');
        }
        setStep('results');
      } else {
        clearTimeout(timer1);
        clearTimeout(timer2);
        setError(data.error || 'Failed to purchase number');
        toast.error(data.error || 'Failed to purchase number');
        setStep('results');
      }
    } catch {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setError('Network error occurred during provisioning.');
      toast.error('Network error');
      setStep('results');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('search');
    setNumbers([]);
    setSelectedNumber(null);
    setError(null);
    setAreaCode('');
    setProvisionStep(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 text-primary">
              <Phone className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base">Get a Dedicated Business Number</DialogTitle>
              <DialogDescription className="text-xs">
                Search available local or toll-free numbers connected to your AI Receptionist.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Search */}
        {step === 'search' && (
          <div className="space-y-4 py-2">
            {/* Features banner */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-muted/40 border text-center text-xs">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span className="font-medium">HD Voice & SMS</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Zap className="size-4 text-primary" />
                <span className="font-medium">Instant Setup</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Globe className="size-4 text-blue-600" />
                <span className="font-medium">US Nationwide</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="area-code" className="text-xs font-medium">Area Code (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="area-code"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="e.g. 415"
                  className="h-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="h-9 gap-1.5 px-4 font-medium"
                >
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                  Search
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave empty to search all nationwide numbers.
              </p>
            </div>

            {/* Popular Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Popular Cities
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_AREA_CODES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setAreaCode(item.code);
                      handleSearch(item.code);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted border border-border/60 text-xs text-foreground transition-colors"
                  >
                    <span className="font-semibold text-primary">{item.code}</span>
                    <span className="text-muted-foreground">({item.city})</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Results */}
        {step === 'results' && (
          <div className="space-y-3 py-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available Numbers ({numbers.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('search')}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Change Search
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {numbers.length === 0 && !error && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No numbers found for this area code.
                </div>
              )}
              {numbers.map((n) => (
                <div
                  key={n.phoneNumber}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-150"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm tracking-tight text-foreground">{n.friendlyName || n.phoneNumber}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{n.locality ? `${n.locality}, ${n.region}` : n.region || 'United States'}</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Voice & SMS</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePurchase(n.phoneNumber)}
                    disabled={loading}
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    Select Line
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Provisioning */}
        {step === 'purchasing' && (
          <div className="flex flex-col items-center justify-center py-8 gap-5">
            <div className="relative">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary shadow-inner">
                <Phone className="size-8 animate-pulse" />
              </div>
              <span className="absolute -inset-2 rounded-2xl border-2 border-primary/30 animate-ping opacity-75" />
            </div>

            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-foreground">Activating {selectedNumber}</p>
              <p className="text-xs text-muted-foreground">Setting up your dedicated AI voice line</p>
            </div>

            <div className="w-full max-w-xs space-y-2 text-xs">
              <div className={cn(
                'flex items-center gap-2.5 p-2 rounded-lg border transition-all',
                provisionStep >= 1 ? 'bg-primary/5 border-primary/30 text-foreground font-medium' : 'text-muted-foreground opacity-50'
              )}>
                {provisionStep > 1 ? <Check className="size-3.5 text-emerald-600" /> : <Loader2 className="size-3.5 animate-spin text-primary" />}
                <span>1. Reserving phone line with carrier</span>
              </div>
              <div className={cn(
                'flex items-center gap-2.5 p-2 rounded-lg border transition-all',
                provisionStep >= 2 ? 'bg-primary/5 border-primary/30 text-foreground font-medium' : 'text-muted-foreground opacity-50'
              )}>
                {provisionStep > 2 ? <Check className="size-3.5 text-emerald-600" /> : provisionStep === 2 ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <span className="size-3.5 rounded-full border" />}
                <span>2. Configuring HD voice channels</span>
              </div>
              <div className={cn(
                'flex items-center gap-2.5 p-2 rounded-lg border transition-all',
                provisionStep >= 3 ? 'bg-primary/5 border-primary/30 text-foreground font-medium' : 'text-muted-foreground opacity-50'
              )}>
                {provisionStep === 3 ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <span className="size-3.5 rounded-full border" />}
                <span>3. Connecting AI Receptionist brain</span>
              </div>
            </div>
          </div>
        )}

        {step !== 'purchasing' && (
          <DialogFooter className="pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
