'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PenLine, Eraser, CheckCircle2, Stamp, User, Clock, FileText, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface WitnessValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  signature?: string;
  signedAt?: string;
  witnessName: string;
  witnessEmail: string;
  statement: string;
  documentTitle: string;
  documentDate: string;
  agreedTruthful: boolean;
  location?: string;
}

export function DigitalWitnessV2({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Digital witness');
  const requireSignature = bool(config.requireSignature, true);
  const requireName = bool(config.requireName, true);
  const version = str(config.version, '2.0.0');
  const defaultDocTitle = str(config.documentTitle, '');
  const statementPreset = str(
    config.statementPreset,
    'I, the undersigned, hereby attest that to the best of my knowledge the events described above are true and accurate, and that I witnessed them personally.',
  );

  const v: WitnessValue = value && typeof value === 'object'
    ? (value as WitnessValue)
    : {
        accepted: false,
        witnessName: '', witnessEmail: '', statement: statementPreset,
        documentTitle: defaultDocTitle, documentDate: new Date().toISOString().slice(0, 10),
        agreedTruthful: false,
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
  const ready = (!requireName || v.witnessName) && v.agreedTruthful && (!requireSignature || v.signature);

  const patch = (p: Partial<WitnessValue>) => {
    const next: WitnessValue = { ...v, ...p, version };
    next.accepted = !!ready || (p.signature ? true : v.accepted);
    next.timestamp = p.signature || p.agreedTruthful || p.witnessName ? new Date().toISOString() : v.timestamp;
    onChange(next);
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
          <ScrollText className="size-3.5 text-primary" />
          <span className="text-xs font-semibold">Digital witness attestation</span>
        </div>
        <Badge variant="outline" className="text-[9px]">v{version}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <User className="size-3" /> Witness name
          </Label>
          <Input value={v.witnessName} disabled={disabled}
            onChange={(e) => patch({ witnessName: e.target.value })}
            aria-label="Witness name" className="text-xs h-9" placeholder="Full legal name" />
        </div>
        <Input type="email" value={v.witnessEmail} disabled={disabled}
          onChange={(e) => patch({ witnessEmail: e.target.value })}
          aria-label="Witness email" placeholder="Email" className="text-xs h-9" />
        <Input value={v.location ?? ''} disabled={disabled}
          onChange={(e) => patch({ location: e.target.value })}
          aria-label="Witness location" placeholder="City, Country" className="text-xs h-9" />
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <FileText className="size-3" /> Document being witnessed
          </Label>
          <Input value={v.documentTitle} disabled={disabled}
            onChange={(e) => patch({ documentTitle: e.target.value })}
            aria-label="Document title" className="text-xs h-9" placeholder="Document title" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Date of document</Label>
          <Input type="date" value={v.documentDate} disabled={disabled}
            onChange={(e) => patch({ documentDate: e.target.value })}
            aria-label="Date of document" className="text-xs h-9" />
        </div>
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">Witness statement</Label>
        <Textarea value={v.statement} disabled={disabled}
          onChange={(e) => patch({ statement: e.target.value })}
          aria-label="Witness statement"
          className="text-[11px] min-h-[80px]" />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id={`dw2-${str(field?.id, 'field')}`}
          checked={v.agreedTruthful}
          disabled={disabled}
          onCheckedChange={(c) => patch({ agreedTruthful: c === true })}
          className="mt-0.5"
        />
        <label htmlFor={`dw2-${str(field?.id, 'field')}`} className="text-[11px] text-muted-foreground cursor-pointer">
          I attest that the above statement is true and accurate to the best of my knowledge, under penalty of perjury.
        </label>
      </div>

      {requireSignature && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <PenLine className="size-3" /> Witness signature
          </Label>
          <div className="rounded-md border border-border bg-background p-1.5 relative">
            <canvas
              ref={canvasRef} width={400} height={100}
              onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerLeave={endDraw}
              disabled={disabled}
              aria-label="Witness signature pad"
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
              <Clock className="size-2.5" />
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
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Witness attestation captured
            </p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              {v.witnessName}{v.location ? ` · ${v.location}` : ''}
            </p>
          </div>
          <Badge variant="secondary" className="gap-1 text-[9px]">
            <Stamp className="size-2.5" /> Valid
          </Badge>
        </div>
      )}
    </div>
  );
}

export default DigitalWitnessV2;
