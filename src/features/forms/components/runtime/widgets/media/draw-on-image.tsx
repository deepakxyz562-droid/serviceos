'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Upload, Eraser, Save, Pencil, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface AnnotationValue {
  baseImage?: { name: string; size: number; type: string; dataUrl: string };
  annotation?: string; // PNG data url of overlay
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#000000'];

export function DrawOnImageWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'Draw on image');
  const defaultColor = String(config?.penColor ?? '#ef4444');
  const brushSize = Number(config?.brushSize ?? 4);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);

  const [color, setColor] = useState(defaultColor);
  const [hasDrawn, setHasDrawn] = useState(false);

  const current: AnnotationValue = (value as AnnotationValue) ?? {};

  // Load image + restore annotation overlay if present.
  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !current.baseImage?.dataUrl) return;

    const setup = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = img.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (current.annotation) {
        const overlay = new Image();
        overlay.onload = () => ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
        overlay.src = current.annotation;
      }
    };
    if (img.complete) setup();
    else img.addEventListener('load', setup, { once: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.baseImage?.dataUrl]);

  const pushHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 20) historyRef.current.shift();
  };

  const pointer = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !current.baseImage) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    pushHistory();
    const { x, y } = pointer(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawingRef.current = true;
    setHasDrawn(true);
  };

  const move = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pointer(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange({
        ...current,
        annotation: canvas.toDataURL('image/png'),
      });
    }
  };

  const clearAnnotation = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    setHasDrawn(false);
    onChange({ ...current, annotation: '' });
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const last = historyRef.current.pop();
    if (last) ctx.putImageData(last, 0, 0);
  };

  const loadBaseImage = async (file?: File) => {
    if (!file || disabled) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange({ baseImage: { name: file.name, size: file.size, type: file.type, dataUrl }, annotation: '' });
    setHasDrawn(false);
    historyRef.current = [];
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => loadBaseImage(e.target.files?.[0])}
      />

      {!current.baseImage ? (
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed border-border/80 hover:border-emerald-400/80 rounded-xl p-6 text-center transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <Upload className="size-6 mx-auto text-muted-foreground" />
          <p className="text-xs mt-2 font-semibold">Upload a base image to annotate</p>
        </button>
      ) : (
        <>
          <div className="relative inline-block w-full">
            <img
              ref={imgRef}
              src={current.baseImage.dataUrl}
              alt={current.baseImage.name}
              className="w-full max-h-[420px] object-contain rounded-xl border border-border/80 bg-muted/30"
            />
            <canvas
              ref={canvasRef}
              onMouseDown={start}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={end}
              onTouchStart={start}
              onTouchMove={move}
              onTouchEnd={end}
              className="absolute inset-0 w-full h-full touch-none cursor-crosshair rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Use color ${c}`}
                  onClick={() => setColor(c)}
                  className={`size-5 rounded-full border-2 ${
                    color === c ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || !hasDrawn}
                onClick={undo}
                className="text-xs gap-1 px-2 h-7"
              >
                <Undo2 className="size-3.5" /> Undo
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || !hasDrawn}
                onClick={clearAnnotation}
                className="text-xs gap-1 px-2 h-7 text-muted-foreground hover:text-red-500"
              >
                <Eraser className="size-3.5" /> Clear
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs gap-1 px-2 h-7"
              >
                <Pencil className="size-3.5" /> New
              </Button>
            </div>
          </div>

          {current.annotation && (
            <p className="text-[11px] text-emerald-600 flex items-center gap-1">
              <Save className="size-3.5" /> Annotations saved
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default DrawOnImageWidget;
