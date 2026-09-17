'use client';

import React, { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { PenLine, Eraser, CheckCircle2, Stamp, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface WitnessValue {
  witnessName: string;
  signature?: string; // dataURL
  signedAt?: string;
  ipHash?: string;
}

export function DigitalWitness({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Digital witness');
  const requireSignature = bool(config.requireSignature, true);
  const requireName = bool(config.requireName, true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  // `drawingNow` lets us hide the placeholder while the user is actively drawing
  // (before endDraw commits the dataURL via onChange).
  const [drawingNow, setDrawingNow] = useState(false);

  const v: WitnessValue = value && typeof value === 'object' ? (value as WitnessValue) : { witnessName: '' };

  const hasSignature = drawingNow || !!v.signature;

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
    onChange({ ...v, signature: dataUrl, signedAt: new Date().toISOString() });
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange({ ...v, signature: undefined, signedAt: undefined });
  };

  const setName = (name: string) => onChange({ ...v, witnessName: name, signedAt: v.signedAt ?? new Date().toISOString() });

  return (
    <div className="space-y-2.5" aria-label={ariaLabel}>
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
          <User className="size-3" /> Witness name
        </label>
        <Input
          value={v.witnessName || ''}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          aria-label="Witness name"
          placeholder="Full legal name"
          className="text-xs h-9"
        />
      </div>

      {requireSignature && (
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
            <PenLine className="size-3" /> Witness signature
          </label>
          <div className="rounded-md border border-border bg-background p-1.5 relative">
            <canvas
              ref={canvasRef}
              width={400}
              height={120}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              disabled={disabled}
              aria-label="Signature drawing pad"
              className={cn(
                'w-full h-24 touch-none rounded-sm',
                disabled && 'opacity-60',
                !hasSignature && 'bg-muted/20',
              )}
            />
            {!hasSignature && !disabled && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground pointer-events-none">
                Sign above using your finger or mouse.
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-2.5" />
              {v.signedAt ? format(new Date(v.signedAt), 'MMM d, yyyy · h:mm a') : 'Not yet signed'}
            </span>
            {hasSignature && !disabled && (
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={clear}>
                <Eraser className="size-3" /> Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {(!requireName || v.witnessName) && (!requireSignature || v.signature) && v.signedAt ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Witness signature captured
            </p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              {v.witnessName} · {v.signedAt ? new Date(v.signedAt).toLocaleString() : ''}
            </p>
          </div>
          <Badge variant="secondary" className="gap-1 text-[9px]">
            <Stamp className="size-2.5" /> Valid
          </Badge>
        </div>
      ) : null}
    </div>
  );
}

export default DigitalWitness;
