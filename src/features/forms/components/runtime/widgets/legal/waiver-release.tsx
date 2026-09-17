'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ShieldAlert, PenLine, Eraser, CheckCircle2, Stamp, User, CalendarClock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface WaiverValue {
  accepted: boolean;
  timestamp?: string;
  version?: string;
  signature?: string;
  signedAt?: string;
  participantName: string;
  participantDob: string;
  emergencyContact: string;
  emergencyPhone: string;
  activityName: string;
  activityDate: string;
  acknowledgedRisks: Record<string, boolean>;
  // captured separately as part of structured object for legal record
  risks: string[];
  witnessName?: string;
}

const DEFAULT_RISKS = [
  'Risk of physical injury, including sprains, fractures, or more serious harm.',
  'Risk of property damage or loss.',
  'Risk of exposure to weather and environmental hazards.',
  'I attest that I am in good physical condition and have no medical contraindications.',
];

export function WaiverRelease({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Liability waiver & release');
  const version = str(config.version, '1.0.0');
  const requireSignature = bool(config.requireSignature, true);
  const risks = Array.isArray(config.risks) ? (config.risks as string[]) : DEFAULT_RISKS;
  const activityName = str(config.activityName, '');

  const v: WaiverValue = value && typeof value === 'object'
    ? (value as WaiverValue)
    : {
        accepted: false,
        participantName: '', participantDob: '', emergencyContact: '', emergencyPhone: '',
        activityName, activityDate: new Date().toISOString().slice(0, 10),
        acknowledgedRisks: {}, risks, version,
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
  const allRisks = risks.every((_, i) => v.acknowledgedRisks[String(i)]);
  const isAdult = (() => {
    if (!v.participantDob) return false;
    const dob = new Date(v.participantDob);
    return (Date.now() - dob.getTime()) >= 18 * 365.25 * 24 * 3600 * 1000;
  })();
  const ready = v.participantName && allRisks && (!requireSignature || v.signature) && isAdult;

  const patch = (p: Partial<WaiverValue>) => {
    onChange({
      ...v, ...p,
      accepted: ready || (p.signature ? true : v.accepted),
      timestamp: new Date().toISOString(),
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
          <ShieldAlert className="size-3.5 text-amber-600" />
          <span className="text-xs font-semibold">Liability waiver & release</span>
        </div>
        <Badge variant="outline" className="text-[9px]">v{version}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <User className="size-3" /> Participant name
          </Label>
          <Input value={v.participantName} disabled={disabled}
            onChange={(e) => patch({ participantName: e.target.value })}
            aria-label="Participant name" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Date of birth</Label>
          <Input type="date" value={v.participantDob} disabled={disabled}
            onChange={(e) => patch({ participantDob: e.target.value })}
            aria-label="Participant date of birth" className="text-xs h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 block">Activity date</Label>
          <Input type="date" value={v.activityDate} disabled={disabled}
            onChange={(e) => patch({ activityDate: e.target.value })}
            aria-label="Activity date" className="text-xs h-9" />
        </div>
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Activity / event name</Label>
          <Input value={v.activityName} disabled={disabled}
            onChange={(e) => patch({ activityName: e.target.value })}
            aria-label="Activity name" className="text-xs h-9" />
        </div>
        <Input value={v.emergencyContact} disabled={disabled}
          onChange={(e) => patch({ emergencyContact: e.target.value })}
          aria-label="Emergency contact name" placeholder="Emergency contact" className="text-xs h-9 col-span-2" />
        <Input value={v.emergencyPhone} disabled={disabled}
          onChange={(e) => patch({ emergencyPhone: e.target.value })}
          aria-label="Emergency contact phone" placeholder="Emergency phone" className="text-xs h-9 col-span-2" />
      </div>

      {v.participantDob && !isAdult && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-2 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
          <span>Participant is under 18. A parent/guardian must sign on their behalf and complete a separate parental consent.</span>
        </div>
      )}

      <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1.5">
        <p className="text-[11px] font-semibold flex items-center gap-1">
          <ShieldAlert className="size-3" /> Acknowledgement of risks
        </p>
        {risks.map((risk, i) => (
          <div key={i} className="flex items-start gap-2">
            <Checkbox
              id={`wv-${i}-${str(field?.id, 'field')}`}
              checked={!!v.acknowledgedRisks[String(i)]}
              disabled={disabled}
              onCheckedChange={(c) => patch({ acknowledgedRisks: { ...v.acknowledgedRisks, [String(i)]: c === true } })}
              className="mt-0.5"
            />
            <label htmlFor={`wv-${i}-${str(field?.id, 'field')}`} className="text-[11px] text-muted-foreground cursor-pointer leading-snug">
              {risk}
            </label>
          </div>
        ))}
      </div>

      <Textarea
        value={'I, the participant (or parent/guardian if under 18), hereby release, indemnify, and hold harmless the organizers from any and all claims arising out of participation in the above activity.'}
        readOnly
        aria-label="Release of liability text"
        className="text-[11px] min-h-[60px] bg-muted/30"
      />

      {requireSignature && (
        <div>
          <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            <PenLine className="size-3" /> Participant signature
          </Label>
          <div className="rounded-md border border-border bg-background p-1.5 relative">
            <canvas
              ref={canvasRef} width={400} height={100}
              onPointerDown={startDraw} onPointerMove={draw} onPointerUp={endDraw} onPointerLeave={endDraw}
              disabled={disabled}
              aria-label="Waiver signature pad"
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
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Waiver executed</p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              {v.participantName} · {v.activityName || 'Activity'}
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

export default WaiverRelease;
