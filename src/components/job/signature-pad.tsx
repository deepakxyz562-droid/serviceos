'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Loader2, PenLine, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type SignatoryType = 'customer' | 'employee';

interface SignaturePadProps {
  jobId: string;
  signatoryType: SignatoryType;
  /** Optional pre-filled signatory name (e.g. the logged-in employee). */
  defaultSignatoryName?: string;
  /** Optional pre-filled role label. */
  defaultSignatoryRole?: string;
  /** Called after a signature is successfully saved. */
  onSaved?: (signature: SavedSignature) => void;
  /** Visual height of the pad in pixels (CSS px). Defaults to 200. */
  height?: number;
  /** Optional className to override the outer container. */
  className?: string;
}

export interface SavedSignature {
  id: string;
  signatoryType: string;
  signatoryName: string;
  signatoryRole: string | null;
  signatureUrl: string;
  signedAt: string;
}

interface Point {
  x: number;
  y: number;
}

const PEN_COLOR = '#0f172a'; // slate-900 — close to black, but slightly softer

/**
 * Canvas-based digital signature pad.
 *
 * Features:
 *  - Pointer events (works with mouse, touch, and stylus)
 *  - Smooth quadratic-curve interpolation between points
 *  - High-DPI aware (canvas backing store scaled by devicePixelRatio)
 *  - Responsive — re-renders on window resize while preserving the drawing
 *  - Clear + Save buttons
 *  - Required signatory name + optional role
 *  - Captures geolocation (best-effort) at save time
 */
export function SignaturePad({
  jobId,
  signatoryType,
  defaultSignatoryName = '',
  defaultSignatoryRole,
  onSaved,
  height = 200,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const hasDrawingRef = useRef(false);
  // Stash the current drawing as a data URL so it survives canvas resize.
  const savedImageRef = useRef<string | null>(null);

  const [hasInk, setHasInk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(defaultSignatoryName);
  const [role, setRole] = useState(defaultSignatoryRole ?? '');

  // ── Canvas setup (high-DPI + responsive) ──────────────────────────
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cssWidth = container.clientWidth;
    const cssHeight = height;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // Save the current drawing so we can re-apply after resize.
    const prevDataUrl = savedImageRef.current ?? (hasDrawingRef.current ? canvas.toDataURL('image/png') : null);

    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    ctx.strokeStyle = PEN_COLOR;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Restore the previous drawing (so resizes don't wipe the signature).
    if (prevDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
      };
      img.src = prevDataUrl;
    }
  }, [height]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  // ── Pointer event handlers ────────────────────────────────────────
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Capture pointer so we keep receiving move events even if it leaves the canvas.
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers may throw if the pointer was already released — ignore.
    }
    drawingRef.current = true;
    const p = getCanvasPoint(e);
    pointsRef.current = [p];

    // Draw a dot immediately (so a single tap leaves a mark).
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
      ctx.fillStyle = PEN_COLOR;
      ctx.fill();
    }
    hasDrawingRef.current = true;
    setHasInk(true);
  };

  const continueStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = getCanvasPoint(e);
    const pts = pointsRef.current;
    pts.push(p);
    if (pts.length < 3) return;

    // Quadratic-curve smoothing: midpoint between the last two points
    // becomes the end of the segment, with the previous point as the control.
    const prev = pts[pts.length - 2];
    const curr = pts[pts.length - 1];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 3].x, pts[pts.length - 3].y);
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    ctx.stroke();
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    drawingRef.current = false;
    pointsRef.current = [];
    // Stash the latest drawing so a future resize preserves it.
    if (canvas) savedImageRef.current = canvas.toDataURL('image/png');
  };

  // ── Clear ─────────────────────────────────────────────────────────
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = PEN_COLOR;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    hasDrawingRef.current = false;
    savedImageRef.current = null;
    setHasInk(false);
  };

  // ── Save ──────────────────────────────────────────────────────────
  const save = async () => {
    if (!hasInk) {
      toast.error('Please draw a signature first.');
      return;
    }
    if (!name.trim()) {
      toast.error('Signatory name is required.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    try {
      const signatureData = canvas.toDataURL('image/png');

      // Best-effort geolocation (don't block save on it).
      let latitude: number | undefined;
      let longitude: number | undefined;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const gps = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
          const t = setTimeout(() => resolve(null), 6000);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(t);
              resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            },
            () => {
              clearTimeout(t);
              resolve(null);
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        });
        if (gps) {
          latitude = gps.latitude;
          longitude = gps.longitude;
        }
      }

      const res = await fetch(`/api/jobs/${jobId}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatoryType,
          signatoryName: name.trim(),
          signatoryRole: role.trim() || undefined,
          signatureData,
          latitude,
          longitude,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Include the HTTP status + server error message so the user sees
        // what actually went wrong (auth, validation, server error, etc.)
        const detail = err.error || res.statusText || 'Unknown error';
        throw new Error(`Save failed (${res.status}): ${detail}`);
      }
      const data = await res.json();
      toast.success(
        `${signatoryType === 'customer' ? 'Customer' : 'Employee'} signature saved`
      );
      clear();
      onSaved?.(data.signature as SavedSignature);
    } catch (err) {
      console.error('[SignaturePad] save error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save signature';
      toast.error('Failed to save signature', {
        description: msg,
        duration: 6000,
      });
    } finally {
      setSaving(false);
    }
  };

  const isCustomer = signatoryType === 'customer';
  const accentColor = isCustomer ? 'emerald' : 'blue';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-lg border-2 border-dashed border-border/70 bg-white overflow-hidden"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="block touch-none cursor-crosshair"
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={(e) => {
            // Don't end on leave — pointer capture keeps drawing active.
            if (!drawingRef.current) return;
            // Still draw a segment up to the leave point.
            continueStroke(e);
          }}
        />
        {/* Signature line */}
        <div className="pointer-events-none absolute left-4 right-4 bottom-6 border-b border-slate-300" />
        <div className="pointer-events-none absolute left-4 bottom-2 text-[11px] text-slate-400 font-medium tracking-wide">
          {isCustomer ? 'Customer signature' : 'Employee signature'}
        </div>
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-slate-400 italic">Sign here</span>
          </div>
        )}
      </div>

      {/* Signatory fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`sig-name-${signatoryType}`} className="text-xs">
            Signatory name <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`sig-name-${signatoryType}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isCustomer ? 'Customer name' : 'Your name'}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`sig-role-${signatoryType}`} className="text-xs">
            Role <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id={`sig-role-${signatoryType}`}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder={isCustomer ? 'e.g. Homeowner' : 'e.g. Technician'}
            className="h-9"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={clear}
          disabled={!hasInk || saving}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="size-4 mr-1.5" /> Clear
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={!hasInk || !name.trim() || saving}
          className={cn(
            'ml-auto text-white',
            isCustomer ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {saving ? (
            <Loader2 className="size-4 mr-1.5 animate-spin" />
          ) : (
            <Check className="size-4 mr-1.5" />
          )}
          Save Signature
        </Button>
      </div>
    </div>
  );
}

export default SignaturePad;
