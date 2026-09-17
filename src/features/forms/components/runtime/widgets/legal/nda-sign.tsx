'use client';

import React, { useRef, useState, useEffect } from 'react';
import { FileLock, PenLine, Eraser, CheckCircle2, Stamp, User, Building2, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface NDAValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  signature?: string;
  signedAt?: string;
  // Party info
  discloserName: string;
  discloserCompany: string;
  recipientName: string;
  recipientCompany: string;
  effectiveDate: string;
  purpose: string;
  durationMonths: number;
  agreedClauses: Record<string, boolean>;
}

const CLAUSES = [
  'Confidential Information includes any non-public technical, business, or financial data disclosed.',
  'Recipient agrees to use Confidential Information solely for the stated purpose.',
  'Recipient shall not disclose Confidential Information to third parties without prior written consent.',
  'Obligations survive for the stated duration after the date of disclosure.',
];

export function NdaSign({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'NDA signature');
  const version = str(config.version, '1.0.0');
  const requireSignature = bool(config.requireSignature, true);

  const v: NDAValue = value && typeof value === 'object'
    ? (value as NDAValue)
    : {
        accepted: false,
        discloserName: '', discloserCompany: '', recipientName: '', recipientCompany: '',
        effectiveDate: new Date().toISOString().slice(0, 10),
        purpose: '', durationMonths: 24,
        agreedClauses: {},
        version,
      };

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
  const allClauses = CLAUSES.every((_, i) => v.agreedClauses[String(i)]);
  const ready = v.discloserName && v.recipientName && allClauses && (!requireSignature || v.signature);

  const patch = (p: Partial<NDAValue>) => {
    onChange({
      ...v, ...p,
      accepted: !!ready,
      timestamp: p.signature || p.agreedClauses ? new Date().toISOString() : v.timestamp,
      version,
      signedAt: p.signature ? new Date().toISOString() : v.signedAt,
    });
  };

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

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileLock className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Non-disclosure agreement</span>
        </div>
        <Badge variant="outline" className="text-[9px]">v{version}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <User className="size-3" /> Discloser name
          </Label>
          <Input value={v.discloserName} disabled={disabled}
            onChange={(e) => patch({ discloserName: e.target.value })}
            aria-label="Discloser name" className="text-xs h-9" placeholder="Full legal name" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <Building2 className="size-3" /> Discloser company
          </Label>
          <Input value={v.discloserCompany} disabled={disabled}
            onChange={(e) => patch({ discloserCompany: e.target.value })}
            aria-label="Discloser company" className="text-xs h-9" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <User className="size-3" /> Recipient name
          </Label>
          <Input value={v.recipientName} disabled={disabled}
            onChange={(e) => patch({ recipientName: e.target.value })}
            aria-label="Recipient name" className="text-xs h-9" placeholder="Full legal name" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <Building2 className="size-3" /> Recipient company
          </Label>
          <Input value={v.recipientCompany} disabled={disabled}
            onChange={(e) => patch({ recipientCompany: e.target.value })}
            aria-label="Recipient company" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Effective date</Label>
          <Input type="date" value={v.effectiveDate} disabled={disabled}
            onChange={(e) => patch({ effectiveDate: e.target.value })}
            aria-label="Effective date" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Duration (months)</Label>
          <Input type="number" min={1} value={v.durationMonths} disabled={disabled}
            onChange={(e) => patch({ durationMonths: Math.max(1, Number(e.target.value) || 1) })}
            aria-label="Duration in months" className="text-xs h-9" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Purpose</Label>
          <Textarea value={v.purpose} disabled={disabled}
            onChange={(e) => patch({ purpose: e.target.value })}
            aria-label="Purpose of disclosure" placeholder="E.g. evaluating a potential business partnership"
            className="text-[11px] min-h-[50px]" />
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1.5">
        <p className="text-[11px] font-semibold">Key clauses — acknowledge each</p>
        {CLAUSES.map((clause, i) => (
          <div key={i} className="flex items-start gap-2">
            <Checkbox
              id={`nda-${i}-${str(field?.id, 'field')}`}
              checked={!!v.agreedClauses[String(i)]}
              disabled={disabled}
              onCheckedChange={(c) => patch({ agreedClauses: { ...v.agreedClauses, [String(i)]: c === true } })}
              className="mt-0.5"
            />
            <label htmlFor={`nda-${i}-${str(field?.id, 'field')}`} className="text-[11px] text-muted-foreground cursor-pointer leading-snug">
              {clause}
            </label>
          </div>
        ))}
      </div>

      {requireSignature && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <PenLine className="size-3" /> Recipient signature
          </Label>
          <div className="rounded-md border border-border bg-background p-1.5 relative">
            <canvas
              ref={canvasRef} width={400} height={100}
              onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerLeave={endDraw}
              disabled={disabled}
              aria-label="NDA signature pad"
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

      {ready && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">NDA executed</p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              {v.recipientName} agrees · {v.durationMonths} months
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

export default NdaSign;
