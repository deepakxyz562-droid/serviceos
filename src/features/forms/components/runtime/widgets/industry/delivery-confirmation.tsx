'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Truck, Signature, Camera, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WidgetProps, str, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface DeliveryValue {
  eventId: string;
  fired: boolean;
  timestamp?: string;
  recipientName?: string;
  signatureDataUrl?: string;
  photoDataUrls: string[];
  notes?: string;
  geolocation?: { lat: number; lng: number };
}

export function DeliveryConfirmation({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Delivery confirmation');
  const requireSignature = bool(config.requireSignature, true);
  const requirePhoto = bool(config.requirePhoto, false);
  const captureGeolocation = bool(config.captureGeolocation, false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [v, setV] = useState<DeliveryValue>(
    value && typeof value === 'object' ? (value as DeliveryValue) : { eventId: 'delivery', fired: false, photoDataUrls: [] },
  );

  // Initialize canvas stroke style.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (v.signatureDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = v.signatureDataUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (patch: Partial<DeliveryValue>) => {
    const next: DeliveryValue = { ...v, ...patch };
    setV(next);
    onChange(next);
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * e.currentTarget.width,
      y: ((e.clientY - r.top) / r.height) * e.currentTarget.height,
    };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
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
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    emit({ signatureDataUrl: canvas.toDataURL('image/png'), timestamp: new Date().toISOString() });
  };
  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    emit({ signatureDataUrl: undefined });
  };

  const addPhoto = () => {
    if (disabled) return;
    // Mock photo (no real capture in Phase 3).
    emit({ photoDataUrls: [...v.photoDataUrls, `photo_${Date.now()}.png`] });
  };

  const confirm = () => {
    if (disabled) return;
    if (requireSignature && !v.signatureDataUrl) return;
    let geo: DeliveryValue['geolocation'] | undefined = v.geolocation;
    if (captureGeolocation && !geo && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => emit({ geolocation: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
        () => undefined,
        { timeout: 5000 },
      );
    }
    emit({
      eventId: 'delivery',
      fired: true,
      timestamp: new Date().toISOString(),
      geolocation: geo,
    });
  };

  const canConfirm = !requireSignature || !!v.signatureDataUrl;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-2">
        <Truck className="size-4 text-emerald-600" />
        <span className="text-xs font-semibold">Delivery Confirmation</span>
        {v.fired ? (
          <Badge variant="secondary" className="ml-auto text-[9px] gap-1">
            <CheckCircle2 className="size-2.5" /> Delivered
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[9px]">Pending</Badge>
        )}
      </div>

      <div>
        <label className="text-[11px] font-semibold text-muted-foreground">Recipient name</label>
        <Input
          value={v.recipientName ?? ''}
          onChange={(e) => emit({ recipientName: e.target.value })}
          disabled={disabled}
          placeholder="Who received the delivery?"
          className="h-8 text-xs"
          aria-label="Recipient name"
        />
      </div>

      {requireSignature && (
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
            <Signature className="size-3" /> Recipient signature
          </label>
          <div className="rounded-md border border-border bg-background p-1.5">
            <canvas
              ref={canvasRef}
              width={400}
              height={120}
              onPointerDown={start}
              onPointerMove={draw}
              onPointerUp={end}
              onPointerLeave={end}
              disabled={disabled}
              aria-label="Signature pad"
              className={cn(
                'w-full h-24 touch-none rounded-sm',
                disabled && 'opacity-60',
                !v.signatureDataUrl && 'bg-muted/20',
              )}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-2.5" />
              {v.timestamp ? new Date(v.timestamp).toLocaleString() : 'Not signed yet'}
            </span>
            {v.signatureDataUrl && !disabled && (
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={clearSig}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {requirePhoto && (
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={addPhoto} className="text-[11px] h-7 gap-1">
          <Camera className="size-3" /> Add photo ({v.photoDataUrls.length})
        </Button>
      )}

      {captureGeolocation && v.geolocation && (
        <p className="text-[10px] text-muted-foreground font-mono">
          GPS: {v.geolocation.lat.toFixed(5)}, {v.geolocation.lng.toFixed(5)}
        </p>
      )}

      <Button
        type="button"
        disabled={disabled || !canConfirm}
        onClick={confirm}
        className="w-full h-8 text-xs gap-1"
      >
        <CheckCircle2 className="size-3" /> Confirm delivery
      </Button>
    </div>
  );
}

export default DeliveryConfirmation;
