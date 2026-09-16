'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  value?: string; // base64 data url
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  penColor?: string;
}

export function SignaturePad({
  value,
  onChange,
  disabled = false,
  penColor = '#0f172a',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = penColor;

    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
    }
  }, [value, penColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="border border-border/80 rounded-xl overflow-hidden bg-background relative shadow-xs">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-36 touch-none cursor-crosshair ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        />

        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/50 text-xs font-medium gap-1.5">
            <PenTool className="size-4" />
            <span>Sign with mouse or finger here</span>
          </div>
        )}

        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="border-b border-border/60 w-full mb-1" />
        </div>
      </div>

      <div className="flex justify-between items-center text-[11px] text-muted-foreground">
        <span>Draw signature above</span>
        {!disabled && hasDrawn && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            className="h-6 text-xs text-muted-foreground hover:text-red-500 gap-1 px-2"
          >
            <RotateCcw className="size-3" /> Clear Signature
          </Button>
        )}
      </div>
    </div>
  );
}
