'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Signature, RotateCcw, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

const PEN_COLORS = ['#0f172a', '#1d4ed8', '#be123c', '#15803d'];

interface Point {
  x: number;
  y: number;
  t: number;
}

/**
 * Smooth-signature canvas: captures pointer timestamps and renders
 * quadratic Bezier segments between midpoints — the same technique
 * signature_pad uses, in a self-contained implementation.
 */
export function SmoothSignatureWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'Signature');
  const defaultColor = String(config?.penColor ?? '#0f172a');
  const penWidth = Number(config?.penWidth ?? 2.5);
  const width = Number(config?.width ?? 480);
  const height = Number(config?.height ?? 200);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const rafRef = useRef<number | null>(null);
  const [color, setColor] = useState(defaultColor);
  const [hasDrawn, setHasDrawn] = useState(Boolean(value));

  // Initialize canvas + restore prior value.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = penWidth;
    ctx.strokeStyle = color;
    ctxRef.current = ctx;
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = value as string;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const commit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  }, [onChange]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: e.timeStamp,
    };
  };

  // Quadratic Bezier smoothing between midpoint of the last 3 points.
  const drawSegment = () => {
    const ctx = ctxRef.current;
    const points = pointsRef.current;
    if (!ctx || points.length < 2) return;

    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      return;
    }

    const last = points.length - 1;
    const p0 = points[last - 2];
    const p1 = points[last - 1];
    const p2 = points[last];
    const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    ctx.stroke();
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    pointsRef.current = [pointerPos(e)];
    setHasDrawn(true);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    if (pointsRef.current.length === 0) return;
    e.preventDefault();
    pointsRef.current.push(pointerPos(e));
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        drawSegment();
      });
    }
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pointsRef.current.length > 0) {
      drawSegment();
    }
    pointsRef.current = [];
    commit();
  };

  const clear = () => {
    if (disabled) return;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, width, height);
    setHasDrawn(false);
    onChange('');
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `signature-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-2">
      <div
        className="relative rounded-xl border border-border/80 bg-white overflow-hidden mx-auto"
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          aria-label={ariaLabel}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={`block touch-none ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-crosshair'}`}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/50 text-xs gap-1.5">
            <Signature className="size-4" /> Sign smoothly here
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3 border-b border-border/40 pointer-events-none" />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Pen color ${c}`}
              disabled={disabled}
              onClick={() => {
                setColor(c);
                if (ctxRef.current) ctxRef.current.strokeStyle = c;
              }}
              className={`size-5 rounded-full border-2 ${
                color === c ? 'border-foreground' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          {hasDrawn && (
            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
              <Check className="size-3.5" /> Saved
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || !hasDrawn}
            onClick={download}
            className="size-8 p-0"
            aria-label="Download signature"
          >
            <Download className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || !hasDrawn}
            onClick={clear}
            className="text-xs gap-1 px-2 h-8 text-muted-foreground hover:text-red-500"
          >
            <RotateCcw className="size-3.5" /> Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SmoothSignatureWidget;
