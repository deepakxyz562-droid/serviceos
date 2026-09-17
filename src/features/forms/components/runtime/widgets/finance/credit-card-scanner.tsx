'use client';

import React, { useRef, useState } from 'react';
import { Camera, CreditCard, ScanLine, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str } from '../widget-props';

interface ScanValue {
  cardNumber: string;
  cardHolder?: string;
  expiry?: string;
  brand?: string;
  last4?: string;
  valid: boolean;
  source: 'camera' | 'manual';
  timestamp?: string;
}

function detectBrand(num: string): string | undefined {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(?:011|5)/.test(n)) return 'Discover';
  if (/^35(?:2[89]|[3-8])/.test(n)) return 'JCB';
  return undefined;
}

function luhnOk(num: string): boolean {
  const n = num.replace(/\D/g, '');
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0, dbl = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = +n[i];
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

const fmt = (s: string) => s.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

export function CreditCardScanner({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Credit card scanner');
  const existing: ScanValue | undefined = value && typeof value === 'object' ? (value as ScanValue) : undefined;
  const [cardNumber, setCardNumber] = useState(existing?.cardNumber ?? '');
  const [cardHolder, setCardHolder] = useState(existing?.cardHolder ?? '');
  const [expiry, setExpiry] = useState(existing?.expiry ?? '');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  React.useEffect(() => () => stopStream(), []);

  const startScan = async () => {
    if (disabled) return;
    setCameraError('');
    setScanning(true);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not available in this environment.');
      }
      // Request back camera — Phase 3 placeholder; actual OCR happens server-side in Phase 4.
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      // Simulate scan + OCR with placeholder after 1.6s.
      setTimeout(() => {
        const demo = '4242 4242 4242 4242';
        setCardNumber(demo);
        setCardHolder('JANE A DOE');
        setExpiry('12/27');
        stopStream();
        setScanning(false);
        commitFrom(demo, 'JANE A DOE', '12/27', 'camera');
      }, 1600);
    } catch (e: unknown) {
      setCameraError(e instanceof Error ? e.message : 'Camera unavailable — enter card manually.');
      setScanning(false);
    }
  };

  const stopScan = () => { stopStream(); setScanning(false); };

  const commitFrom = (num: string, holder: string, exp: string, source: 'camera' | 'manual') => {
    const out: ScanValue = {
      cardNumber: num.replace(/\s/g, ''),
      cardHolder: holder || undefined,
      expiry: exp || undefined,
      brand: detectBrand(num),
      last4: num.replace(/\D/g, '').slice(-4) || undefined,
      valid: luhnOk(num) && !!exp,
      source,
      timestamp: new Date().toISOString(),
    };
    onChange(out);
  };

  const manualChange = (num: string, holder: string, exp: string) => {
    setCardNumber(num); setCardHolder(holder); setExpiry(exp);
    commitFrom(num, holder, exp, 'manual');
  };

  const brand = cardNumber ? detectBrand(cardNumber) : undefined;
  const valid = cardNumber ? luhnOk(cardNumber) : false;

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <CreditCard className="size-4 text-purple-600" />
        <span className="text-xs font-bold">Scan Card</span>
        {brand && <Badge variant="outline" className="text-[9px] ml-auto">{brand}</Badge>}
      </div>

      {/* Card preview */}
      <div className="rounded-xl border bg-gradient-to-br from-slate-800 to-slate-950 text-white p-3 shadow-md aspect-[1.6/1] flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-3 right-3 size-7 rounded-full bg-amber-400/80 border border-amber-200" />
        <div className="flex items-center gap-1.5 text-[10px] opacity-80">
          <ScanLine className="size-3" /> Card preview
        </div>
        <div className="font-mono text-sm tracking-wider">
          {cardNumber ? fmt(cardNumber) : '•••• •••• •••• ••••'}
        </div>
        <div className="flex items-end justify-between text-[10px]">
          <span className="uppercase truncate max-w-[60%]">{cardHolder || 'CARDHOLDER NAME'}</span>
          <span className="font-mono">{expiry || 'MM/YY'}</span>
        </div>
      </div>

      {scanning && (
        <div className="rounded-lg border border-purple-300/60 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/30 p-2 space-y-1.5">
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-md bg-black aspect-video" />
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
              <Loader2 className="size-3.5 animate-spin" /> Scanning card…
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={stopScan}>Cancel</Button>
          </div>
        </div>
      )}

      {cameraError && !scanning && (
        <p className="text-[11px] text-amber-600 flex items-center gap-1">
          <XCircle className="size-3" /> {cameraError}
        </p>
      )}

      <Button
        type="button"
        disabled={disabled || scanning}
        onClick={startScan}
        variant="outline"
        className="w-full h-9 text-xs gap-1.5"
      >
        {scanning ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-4" />}
        {scanning ? 'Scanning…' : 'Scan with camera'}
      </Button>

      <div className="space-y-1.5">
        <Input
          value={cardNumber ? fmt(cardNumber) : ''}
          onChange={(e) => manualChange(e.target.value, cardHolder, expiry)}
          disabled={disabled || scanning}
          placeholder="4242 4242 4242 4242"
          className="font-mono h-9 text-xs"
          aria-label="Card number"
          inputMode="numeric"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <Input
            value={cardHolder}
            onChange={(e) => manualChange(cardNumber, e.target.value.toUpperCase(), expiry)}
            disabled={disabled || scanning}
            placeholder="CARDHOLDER"
            className="h-9 text-xs uppercase"
            aria-label="Cardholder name"
          />
          <Input
            value={expiry}
            onChange={(e) => {
              let v = e.target.value.replace(/[^\d/]/g, '').slice(0, 5);
              if (/^\d{2}$/.test(v) && !v.includes('/')) v = v + '/';
              manualChange(cardNumber, cardHolder, v);
            }}
            disabled={disabled || scanning}
            placeholder="MM/YY"
            className="h-9 text-xs font-mono"
            aria-label="Expiry date"
          />
        </div>
      </div>

      {cardNumber && (
        <p className={`text-[11px] flex items-center gap-1 ${valid ? 'text-emerald-600' : 'text-red-500'}`}>
          {valid ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          {valid ? 'Card number passes Luhn check' : 'Card number failed Luhn check'}
        </p>
      )}

      {existing?.valid && (
        <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1 w-full" onClick={() => { setCardNumber(''); setCardHolder(''); setExpiry(''); onChange(null); }} disabled={disabled}>
          <RefreshCw className="size-3" /> Clear scanned card
        </Button>
      )}
    </div>
  );
}

export default CreditCardScanner;
