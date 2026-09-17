'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, PenLine, Eraser, User, CalendarClock, CheckCircle2, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface ParentConsentValue {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childDob: string;
  activityName: string;
  consentText: string;
  agreed: boolean;
  signature?: string; // dataURL
  signedDate?: string;
  timestamp?: string;
}

export function ParentConsent({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Parent consent form');
  const requireSignature = bool(config.requireSignature, true);
  const defaultActivity = str(config.activityName, '');
  const consentStatement = str(
    config.consentStatement,
    'I, the undersigned parent/legal guardian, hereby give consent for my child to participate in the above activity.',
  );

  const v: ParentConsentValue = value && typeof value === 'object'
    ? (value as ParentConsentValue)
    : { parentName: '', parentEmail: '', parentPhone: '', childName: '', childDob: '', activityName: defaultActivity, consentText: consentStatement, agreed: false };

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
  const patch = (p: Partial<ParentConsentValue>) => onChange({ ...v, ...p });

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
    patch({
      signature: dataUrl,
      signedDate: new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
    });
  };
  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    patch({ signature: undefined, signedDate: undefined, timestamp: undefined });
  };

  const fullyComplete = v.parentName && v.childName && v.agreed && (!requireSignature || v.signature);

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Parent / guardian consent</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Activity / event name</Label>
          <Input value={v.activityName} disabled={disabled}
            onChange={(e) => patch({ activityName: e.target.value })}
            aria-label="Activity name" className="text-xs h-9" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <User className="size-3" /> Parent / guardian name
          </Label>
          <Input value={v.parentName} disabled={disabled}
            onChange={(e) => patch({ parentName: e.target.value })}
            aria-label="Parent name" className="text-xs h-9" placeholder="Parent full name" />
        </div>
        <Input type="email" value={v.parentEmail} disabled={disabled}
          onChange={(e) => patch({ parentEmail: e.target.value })}
          aria-label="Parent email" placeholder="Email" className="text-xs h-9" />
        <Input value={v.parentPhone} disabled={disabled}
          onChange={(e) => patch({ parentPhone: e.target.value })}
          aria-label="Parent phone" placeholder="Phone" className="text-xs h-9" />
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Child name</Label>
          <Input value={v.childName} disabled={disabled}
            onChange={(e) => patch({ childName: e.target.value })}
            aria-label="Child name" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Child DOB</Label>
          <Input type="date" value={v.childDob} disabled={disabled}
            onChange={(e) => patch({ childDob: e.target.value })}
            aria-label="Child date of birth" className="text-xs h-9" />
        </div>
      </div>

      <Textarea
        value={v.consentText}
        disabled={disabled}
        onChange={(e) => patch({ consentText: e.target.value })}
        aria-label="Consent statement"
        className="text-[11px] min-h-[60px]"
      />

      <div className="flex items-start gap-2">
        <Checkbox
          id={`pc-${str(field?.id, 'field')}`}
          checked={v.agreed}
          disabled={disabled}
          onCheckedChange={(c) => patch({
            agreed: c === true,
            timestamp: c === true ? new Date().toISOString() : undefined,
          })}
          className="mt-0.5"
        />
        <label htmlFor={`pc-${str(field?.id, 'field')}`} className="text-[11px] text-muted-foreground cursor-pointer">
          I have read and agree to the consent statement above.
        </label>
      </div>

      {requireSignature && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <PenLine className="size-3" /> Parent / guardian signature
          </Label>
          <div className="rounded-md border border-border bg-background p-1.5 relative">
            <canvas
              ref={canvasRef} width={400} height={100}
              onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerLeave={endDraw}
              disabled={disabled}
              aria-label="Parent signature pad"
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
              {v.signedDate ? `Signed ${v.signedDate}` : 'Not yet signed'}
            </span>
            {hasSig && !disabled && (
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={clearSig}>
                <Eraser className="size-3" /> Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {fullyComplete && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Consent recorded</p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              {v.parentName} for {v.childName}{v.signedDate ? ` · ${v.signedDate}` : ''}
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

export default ParentConsent;
