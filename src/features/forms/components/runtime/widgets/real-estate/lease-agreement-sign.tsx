'use client';

import React, { useRef, useState, useEffect } from 'react';
import { FileText, PenLine, Eraser, CheckCircle2, CalendarClock, Home, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface LeaseValue {
  propertyAddress: string;
  landlord: string;
  tenant: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  currency: string;
  acknowledgedClauses: Record<string, boolean>;
  signature?: string; // dataURL
  signedAt?: string;
}

export function LeaseAgreementSign({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Lease agreement');
  const currency = str(config.currency, 'USD');
  const requireSignature = bool(config.requireSignature, true);
  const clauses = Array.isArray(config.clauses) && config.clauses.length
    ? (config.clauses as string[])
    : [
        'I agree to pay rent on or before the 1st of each month.',
        'I will keep the premises clean and in good condition.',
        'I will not sublease without written landlord consent.',
        'I will provide 30 days written notice before vacating.',
      ];

  const v: LeaseValue = value && typeof value === 'object'
    ? (value as LeaseValue)
    : { propertyAddress: '', landlord: '', tenant: '', startDate: '', endDate: '', monthlyRent: 0, securityDeposit: 0, currency, acknowledgedClauses: {} };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [drawingNow, setDrawingNow] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (v.signature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = v.signature;
    }
  }, [v.signature]);

  const hasSig = drawingNow || !!v.signature;
  const patch = (p: Partial<LeaseValue>) => onChange({ ...v, ...p });

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    };
  };
  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    setDrawingNow(true);
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setDrawingNow(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    patch({ signature: dataUrl, signedAt: new Date().toISOString() });
  };
  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    patch({ signature: undefined, signedAt: undefined });
  };

  const allClausesAck = clauses.every((_, i) => v.acknowledgedClauses[String(i)]);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Home className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Lease agreement</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Property address</Label>
          <Input value={v.propertyAddress} disabled={disabled}
            onChange={(e) => patch({ propertyAddress: e.target.value })}
            aria-label="Property address" className="text-xs h-9" placeholder="123 Main St, City, ST" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Landlord</Label>
          <Input value={v.landlord} disabled={disabled}
            onChange={(e) => patch({ landlord: e.target.value })}
            aria-label="Landlord name" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Tenant</Label>
          <Input value={v.tenant} disabled={disabled}
            onChange={(e) => patch({ tenant: e.target.value })}
            aria-label="Tenant name" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Start date</Label>
          <Input type="date" value={v.startDate} disabled={disabled}
            onChange={(e) => patch({ startDate: e.target.value })}
            aria-label="Lease start date" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">End date</Label>
          <Input type="date" value={v.endDate} disabled={disabled}
            onChange={(e) => patch({ endDate: e.target.value })}
            aria-label="Lease end date" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Monthly rent</Label>
          <Input type="number" min={0} value={v.monthlyRent} disabled={disabled}
            onChange={(e) => patch({ monthlyRent: Math.max(0, num(Number(e.target.value), 0)) })}
            aria-label="Monthly rent" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Security deposit</Label>
          <Input type="number" min={0} value={v.securityDeposit} disabled={disabled}
            onChange={(e) => patch({ securityDeposit: Math.max(0, num(Number(e.target.value), 0)) })}
            aria-label="Security deposit" className="text-xs h-9" />
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1.5">
        <p className="text-[11px] font-semibold flex items-center gap-1">
          <FileText className="size-3" /> Lease clauses — acknowledge each
        </p>
        {clauses.map((clause, i) => (
          <div key={i} className="flex items-start gap-2">
            <Checkbox
              id={`lease-${i}-${str(field?.id, 'field')}`}
              checked={!!v.acknowledgedClauses[String(i)]}
              disabled={disabled}
              onCheckedChange={(c) => patch({ acknowledgedClauses: { ...v.acknowledgedClauses, [String(i)]: c === true } })}
              className="mt-0.5"
            />
            <label htmlFor={`lease-${i}-${str(field?.id, 'field')}`} className="text-[11px] text-muted-foreground cursor-pointer leading-snug">
              {clause}
            </label>
          </div>
        ))}
      </div>

      {requireSignature && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <PenLine className="size-3" /> Tenant signature
          </Label>
          <div className="rounded-md border border-border bg-background p-1.5 relative">
            <canvas
              ref={canvasRef} width={400} height={100}
              onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerLeave={endDraw}
              disabled={disabled}
              aria-label="Lease signature pad"
              className={cn('w-full h-20 touch-none rounded-sm', disabled && 'opacity-60', !hasSig && 'bg-muted/20')}
            />
            {!hasSig && !disabled && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground pointer-events-none">
                Sign above
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <CalendarClock className="size-2.5" />
              {v.signedAt ? new Date(v.signedAt).toLocaleString() : 'Not yet signed'}
            </span>
            {hasSig && !disabled && (
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={clearSig}>
                <Eraser className="size-3" /> Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {allClausesAck && (!requireSignature || v.signature) && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Lease executed</p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              {v.tenant || 'Tenant'} · {v.monthlyRent.toLocaleString()} {currency}/mo
            </p>
          </div>
          <Badge variant="secondary" className="gap-1 text-[9px]">
            <Stamp className="size-2.5" /> Signed
          </Badge>
        </div>
      )}
    </div>
  );
}

export default LeaseAgreementSign;
