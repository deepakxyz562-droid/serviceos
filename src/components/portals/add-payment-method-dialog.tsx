'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a payment method is successfully added */
  onAdded?: () => void;
}

type MethodType = 'card' | 'upi';

function detectBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  if (/^(60|65|81|82|508|352|353|354|355|356|357|358)/.test(digits)) return 'RuPay';
  return 'Card';
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19);
  // Group in 4s (Amex is 4-6-5 but 4s is fine for the demo UI)
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function AddPaymentMethodDialog({
  open,
  onOpenChange,
  onAdded,
}: AddPaymentMethodDialogProps) {
  const [methodType, setMethodType] = useState<MethodType>('card');

  // Card state
  const [holderName, setHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // UPI state
  const [upiId, setUpiId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setMethodType('card');
        setHolderName('');
        setCardNumber('');
        setExpiry('');
        setCvv('');
        setIsDefault(false);
        setUpiId('');
        setError(null);
        setSuccess(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const detectedBrand = cardNumber.replace(/\D/g, '').length >= 1
    ? detectBrand(cardNumber)
    : null;

  const validateCard = (): string | null => {
    if (!holderName.trim() || holderName.trim().length < 2) {
      return 'Please enter the cardholder name.';
    }
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) {
      return 'Please enter a valid card number.';
    }
    // Luhn check
    let sum = 0;
    let dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i], 10);
      if (dbl) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      dbl = !dbl;
    }
    if (sum % 10 !== 0) return 'The card number is invalid. Please double-check.';

    const [mm, yy] = expiry.split('/');
    if (!mm || !yy || mm.length !== 2 || yy.length !== 2) {
      return 'Please enter the expiry as MM/YY.';
    }
    const month = parseInt(mm, 10);
    const year = 2000 + parseInt(yy, 10);
    if (month < 1 || month > 12) return 'Invalid expiry month.';
    const now = new Date();
    const expEnd = new Date(year, month, 0, 23, 59, 59); // end of expiry month
    if (expEnd < now) return 'This card has expired.';

    if (cvv.replace(/\D/g, '').length < 3) {
      return 'Please enter the CVV/CVC.';
    }
    return null;
  };

  const validateUpi = (): string | null => {
    const v = upiId.trim();
    if (!v) return 'Please enter your UPI ID.';
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v)) {
      return 'Please enter a valid UPI ID (e.g. name@bank).';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const v = methodType === 'card' ? validateCard() : validateUpi();
    if (v) {
      setError(v);
      return;
    }

    let body: Record<string, unknown>;
    if (methodType === 'card') {
      const [mm, yy] = expiry.split('/');
      body = {
        type: 'card',
        holderName: holderName.trim(),
        cardNumber: cardNumber.replace(/\D/g, ''),
        expMonth: parseInt(mm, 10),
        expYear: 2000 + parseInt(yy, 10),
        cvv: cvv.replace(/\D/g, ''),
        isDefault,
      };
    } else {
      body = {
        type: 'upi',
        upiId: upiId.trim(),
        isDefault,
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/customer/payment-methods?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save payment method.');
      }
      setSuccess(true);
      toast.success('Payment method saved!', {
        description:
          methodType === 'card'
            ? `${detectedBrand} ending in ${cardNumber.replace(/\D/g, '').slice(-4)} added.`
            : `UPI ID ${upiId} added.`,
      });
      onAdded?.();
      setTimeout(() => onOpenChange(false), 1400);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save payment method.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-teal-600" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Save a card or UPI ID for faster checkout. Your details are tokenized and stored securely.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 flex flex-col items-center text-center gap-3">
            <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Payment method saved!</p>
              <p className="text-sm text-muted-foreground mt-1">
                You can use this method for future invoice payments.
              </p>
            </div>
          </div>
        ) : (
          <>
            <Tabs value={methodType} onValueChange={(v) => setMethodType(v as MethodType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="card" className="text-xs">
                  <CreditCard className="size-3.5 mr-1.5" /> Card
                </TabsTrigger>
                <TabsTrigger value="upi" className="text-xs">
                  <span className="text-sm font-semibold mr-1">₹</span> UPI
                </TabsTrigger>
              </TabsList>

              {/* Card Tab */}
              <TabsContent value="card" className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-4" id="pm-card-form">
                  {/* Cardholder name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pm-holder" className="text-xs font-medium">
                      Cardholder Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="pm-holder"
                        placeholder="Name on card"
                        value={holderName}
                        onChange={(e) => setHolderName(e.target.value)}
                        className="pl-9 h-10"
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>

                  {/* Card number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="pm-number" className="text-xs font-medium">
                      Card Number <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="pm-number"
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        className={cn('pl-9 pr-16 h-10 font-mono', detectedBrand && 'pr-24')}
                        disabled={submitting}
                        required
                      />
                      {detectedBrand && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">
                          {detectedBrand}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expiry + CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pm-expiry" className="text-xs font-medium">
                        Expiry <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="pm-expiry"
                          inputMode="numeric"
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                          className="pl-9 h-10 font-mono"
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pm-cvv" className="text-xs font-medium">
                        CVV <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="pm-cvv"
                          type="password"
                          inputMode="numeric"
                          placeholder="•••"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="pl-9 h-10 font-mono"
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </TabsContent>

              {/* UPI Tab */}
              <TabsContent value="upi" className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-4" id="pm-upi-form">
                  <div className="space-y-1.5">
                    <Label htmlFor="pm-upi" className="text-xs font-medium">
                      UPI ID <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        id="pm-upi"
                        placeholder="yourname@bank"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="pl-9 h-10"
                        disabled={submitting}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your VPA / UPI ID (e.g. name@okhdfcbank, name@ybl).
                    </p>
                  </div>
                </form>
              </TabsContent>
            </Tabs>

            {/* Set as default toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-teal-600" />
                <div>
                  <p className="text-sm font-medium text-foreground">Set as default</p>
                  <p className="text-xs text-muted-foreground">Use this method for one-click payments.</p>
                </div>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} disabled={submitting} />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-xs text-red-800 dark:text-red-200">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form={methodType === 'card' ? 'pm-card-form' : 'pm-upi-form'}
                disabled={submitting}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Lock className="size-4 mr-1.5" /> Save Securely
                  </>
                )}
              </Button>
            </DialogFooter>

            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
              <Lock className="size-3" />
              We never store your full card number or CVV. All data is tokenized.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AddPaymentMethodDialog;
