'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ScanBarcode, Camera, CameraOff, RefreshCw, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

type DetectedBarcode = {
  rawValue: string;
  format?: string;
  boundingBox?: DOMRectReadOnly;
};

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
  return w.BarcodeDetector ?? null;
}

export interface BarcodeScanValue {
  value: string;
  format?: string;
  scannedAt: string;
}

export function BarcodeScannerWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const ariaLabel = String(field?.label ?? 'Barcode scanner');
  const facingMode = String(config?.facingMode ?? 'environment');
  const scanIntervalMs = Number(config?.scanIntervalMs ?? 250);
  const formatsRaw = config?.formats;
  const formats: string[] = Array.isArray(formatsRaw)
    ? formatsRaw.map((f) => String(f))
    : ['code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e'];

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef(0);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const detected: BarcodeScanValue | null =
    value && typeof value === 'object'
      ? (value as BarcodeScanValue)
      : null;

  const stopStream = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
    setScanning(false);
  }, []);

  const detectFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const detector = detectorRef.current;
    if (!video || !canvas || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectFrame);
      return;
    }
    const now = performance.now();
    if (now - lastScanRef.current >= scanIntervalMs) {
      lastScanRef.current = now;
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        const codes = await detector.detect(canvas);
        if (codes.length > 0) {
          onChange({
            value: codes[0].rawValue,
            format: codes[0].format,
            scannedAt: new Date().toISOString(),
          });
          stopStream();
          return;
        }
      } catch {
        /* swallow detection errors */
      }
    }
    rafRef.current = requestAnimationFrame(detectFrame);
  }, [onChange, scanIntervalMs, stopStream]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setUnsupported(true);
      setError('Camera API unavailable in this browser.');
      return;
    }
    const ctor = getBarcodeDetector();
    if (!ctor) {
      setUnsupported(true);
      setError('BarcodeDetector API not supported. Use file upload fallback.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      detectorRef.current = new ctor({ formats });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      setScanning(true);
      lastScanRef.current = 0;
      rafRef.current = requestAnimationFrame(detectFrame);
    } catch {
      setError('Camera access denied or unavailable.');
      setUnsupported(true);
    }
  }, [detectFrame, facingMode, formats]);

  useEffect(() => () => stopStream(), [stopStream]);

  const scanFromFile = async (file?: File) => {
    if (!file) return;
    const ctor = getBarcodeDetector();
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      if (!ctor) {
        setError('BarcodeDetector API not supported in this browser.');
        return;
      }
      const detector = new ctor({ formats });
      const codes = await detector.detect(img);
      if (codes.length > 0) {
        onChange({
          value: codes[0].rawValue,
          format: codes[0].format,
          scannedAt: new Date().toISOString(),
        });
      } else {
        setError('No barcode detected in the image.');
      }
    } catch {
      setError('Could not read the selected image.');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  if (detected) {
    return (
      <div className="space-y-2 p-3 border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Check className="size-4" />
          <span className="text-xs font-semibold">
            Barcode detected{detected.format ? ` · ${detected.format}` : ''}
          </span>
        </div>
        <pre className="text-[11px] whitespace-pre-wrap break-all rounded-md bg-background border border-border/60 p-2 max-h-32 overflow-auto">
          {detected.value}
        </pre>
        {!disabled && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange(null)}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Scan again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />
      {streaming ? (
        <div className="relative rounded-xl overflow-hidden border border-border/80 bg-black aspect-video">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-4/5 h-1/3 border-2 border-emerald-400/70 rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          {scanning && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-white/90 flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md">
              <ScanBarcode className="size-3.5 animate-pulse" /> Scanning…
            </div>
          )}
          {!disabled && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={stopStream}
              className="absolute top-2 right-2 text-xs gap-1.5 h-7"
            >
              Stop
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 border border-dashed border-border/80 rounded-xl bg-muted/20">
          {unsupported ? (
            <CameraOff className="size-6 text-muted-foreground" />
          ) : (
            <ScanBarcode className="size-6 text-muted-foreground" />
          )}
          <p className="text-[11px] text-muted-foreground text-center max-w-[260px]">
            {error ??
              (unsupported
                ? 'Live scanning unavailable. Upload a barcode image instead.'
                : `Scanning: ${formats.join(', ')}`)}
          </p>
          <div className="flex gap-2">
            {!unsupported && (
              <Button
                type="button"
                size="sm"
                onClick={startCamera}
                disabled={disabled}
                className="text-xs gap-1.5"
              >
                <Camera className="size-3.5" /> Start camera
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs gap-1.5"
            >
              <Upload className="size-3.5" /> Upload image
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            aria-label={ariaLabel}
            onChange={(e) => scanFromFile(e.target.files?.[0])}
          />
        </div>
      )}
    </div>
  );
}

export default BarcodeScannerWidget;
