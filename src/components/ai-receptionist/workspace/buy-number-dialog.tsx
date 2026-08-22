'use client';

/**
 * BuyNumberDialog
 * ===============
 *
 * Reusable dialog for searching and purchasing phone numbers.
 * Used by both the Phone Numbers tab (workspace) and could be used by onboarding.
 *
 * Flow:
 *   1. Enter area code (optional — leave blank for nationwide)
 *   2. Search via /api/addons/phones/search
 *   3. Select a number from results
 *   4. Purchase via /api/addons/phones/buy (with Idempotency-Key)
 *   5. On success: call onSuccess() so the parent can refresh
 *
 * The backend enforces:
 *   - AI Receptionist entitlement required (403 ADDON_REQUIRED)
 *   - Duplicate number prevention (409 NUMBER_ALREADY_TAKEN)
 *   - Included numbers limit (403 LIMIT_REACHED)
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
import { toast } from 'sonner';

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

export function BuyNumberDialog({ open, onOpenChange, onSuccess }: BuyNumberDialogProps) {
  const [step, setStep] = useState<'search' | 'results' | 'purchasing'>('search');
  const [loading, setLoading] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [numbers, setNumbers] = useState<SearchNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        countryCode: 'US',
        capabilities: 'voice,sms',
      });
      if (areaCode) params.set('areaCode', areaCode);

      const res = await fetch(`/api/addons/phones/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNumbers(data.numbers || []);
        setStep('results');
        if ((data.numbers || []).length === 0) {
          setError('No numbers found. Try a different area code or leave blank for nationwide.');
        }
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to search numbers');
        toast.error(err.error || 'Failed to search numbers');
      }
    } catch {
      setError('Network error');
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
          friendlyName: 'Fieseros Number',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Phone number ${phoneNumber} purchased!`);
        handleClose();
        onSuccess?.();
      } else if (res.status === 409) {
        // NUMBER_ALREADY_TAKEN
        setError(data.error || 'This number is already assigned to another account.');
        toast.error(data.error || 'Number already taken');
        setStep('results');
      } else if (res.status === 403) {
        if (data.code === 'ADDON_REQUIRED') {
          setError('AI Receptionist subscription required to purchase a phone number.');
          toast.error('Purchase the AI Receptionist add-on first');
        } else if (data.code === 'LIMIT_REACHED') {
          setError(`You've reached your phone number limit (${data.included} included). Release a number or upgrade your plan.`);
          toast.error(`Limit reached: ${data.included} numbers included`);
        } else {
          setError(data.error || 'Purchase not allowed');
          toast.error(data.error || 'Purchase failed');
        }
        setStep('results');
      } else {
        setError(data.error || 'Failed to purchase number');
        toast.error(data.error || 'Failed to purchase number');
        setStep('results');
      }
    } catch {
      setError('Network error');
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="size-5 text-emerald-600" />
            Buy a Phone Number
          </DialogTitle>
          <DialogDescription>
            Search for an available phone number to connect to your AI Receptionist.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Search */}
        {step === 'search' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="area-code">Area Code (optional)</Label>
              <Input
                id="area-code"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="312"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to search nationwide. Numbers include voice + SMS.
              </p>
            </div>
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                {error}
              </p>
            )}
            <Button onClick={handleSearch} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Search Numbers
            </Button>
          </div>
        )}

        {/* Step 2: Results */}
        {step === 'results' && (
          <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
            {error && (
              <p className="text-xs text-amber-500 flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                {error}
              </p>
            )}
            {numbers.length === 0 && !error && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No numbers found. Try a different area code.
              </p>
            )}
            {numbers.map((n) => (
              <div
                key={n.phoneNumber}
                className="flex items-center justify-between p-3 rounded-lg border hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium">{n.friendlyName}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.locality ? `${n.locality}, ${n.region}` : n.region || 'United States'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePurchase(n.phoneNumber)}
                  disabled={loading}
                  className="gap-1.5 shrink-0"
                >
                  Select
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setStep('search')} className="w-full">
              Search Again
            </Button>
          </div>
        )}

        {/* Step 3: Purchasing */}
        {step === 'purchasing' && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="size-8 animate-spin text-emerald-600" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Purchasing {selectedNumber}...</p>
              <p className="text-xs text-muted-foreground">
                Provisioning on Twilio + Vapi + Fieseros
              </p>
            </div>
          </div>
        )}

        {step !== 'purchasing' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
