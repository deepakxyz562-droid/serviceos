'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Check, Upload, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

interface CapturedPhoto {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export function TakePhotoWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  // Settings write `cameraFacing` ('user'/'environment'). Legacy runtime read
  // `facingMode`. Read settings key first, fall back to legacy key.
  const facingMode = String(config?.cameraFacing ?? config?.facingMode ?? 'environment');
  const ariaLabel = String(field?.label ?? 'Take photo');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photo: CapturedPhoto | null = value
    ? (value as CapturedPhoto)
    : null;

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setUnsupported(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      setError(null);
    } catch {
      setError('Camera access denied. Please use the file upload fallback.');
      setUnsupported(true);
    }
  }, [facingMode]);

  useEffect(() => () => stopStream(), [stopStream]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    onChange({
      name: `photo-${Date.now()}.png`,
      size: Math.round((dataUrl.length - 22) * 0.75),
      type: 'image/png',
      dataUrl,
    });
    stopStream();
  };

  const retake = () => {
    onChange(null);
    startCamera();
  };

  if (photo) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden border border-border/80 bg-muted">
          <img src={photo.dataUrl} alt={ariaLabel} className="w-full" />
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retake}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Retake
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
          {!disabled && (
            <Button
              type="button"
              onClick={capture}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full size-12 p-0 gap-0"
              aria-label="Capture photo"
            >
              <Check className="size-5" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 border border-dashed border-border/80 rounded-xl bg-muted/20">
          {unsupported ? (
            <CameraOff className="size-6 text-muted-foreground" />
          ) : (
            <Camera className="size-6 text-muted-foreground" />
          )}
          <p className="text-[11px] text-muted-foreground text-center max-w-[260px]">
            {error ??
              (unsupported
                ? 'Camera unavailable. Use file upload instead.'
                : 'Camera access required to take a photo.')}
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
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-xs gap-1.5"
            >
              <Upload className="size-3.5" /> Upload instead
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () =>
                onChange({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  dataUrl: reader.result as string,
                });
              reader.readAsDataURL(file);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default TakePhotoWidget;
