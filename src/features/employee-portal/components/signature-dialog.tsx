'use client';

/**
 * SignatureDialog — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Self-contained dialog for capturing a customer signature on a job. The
 * parent opens it by passing `open`, `jobId`, and `initialSignatoryName`
 * (usually the employee's name as a fallback); the dialog owns:
 *   - the signatory name input
 *   - the canvas + drawing handlers (mouse + touch)
 *   - the save mutation (POST /api/jobs/[id]/signatures)
 *
 * Calls `onSaved()` when the signature is persisted so the parent can re-fetch
 * jobs to refresh the signature counts.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, PenLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

export interface SignatureDialogProps {
  open: boolean;
  jobId: string | null;
  initialSignatoryName?: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function SignatureDialog({
  open,
  jobId,
  initialSignatoryName = '',
  onClose,
  onSaved,
}: SignatureDialogProps) {
  const [signatoryName, setSignatoryName] = useState(initialSignatoryName);
  const [saving, setSaving] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Reset name + canvas whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setSignatoryName(initialSignatoryName);
      setSaving(false);
      // Re-init the canvas after the dialog mounts the canvas element.
      const t = setTimeout(initSignatureCanvas, 100);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSignatoryName]);

  const initSignatureCanvas = useCallback(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1f2937';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Remove any previously-attached listeners (re-init safety) by cloning.
    const fresh = canvas.cloneNode(false) as HTMLCanvasElement;
    canvas.parentNode?.replaceChild(fresh, canvas);
    signatureCanvasRef.current = fresh;
    const ctx2 = fresh.getContext('2d');
    if (!ctx2) return;
    ctx2.lineWidth = 2;
    ctx2.strokeStyle = '#1f2937';
    ctx2.lineCap = 'round';
    ctx2.lineJoin = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = fresh.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };
    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx2.beginPath();
      ctx2.moveTo(pos.x, pos.y);
    };
    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const pos = getPos(e);
      ctx2.lineTo(pos.x, pos.y);
      ctx2.stroke();
    };
    const stop = () => {
      isDrawingRef.current = false;
    };
    fresh.addEventListener('mousedown', start);
    fresh.addEventListener('mousemove', draw);
    fresh.addEventListener('mouseup', stop);
    fresh.addEventListener('mouseleave', stop);
    fresh.addEventListener('touchstart', start, { passive: false });
    fresh.addEventListener('touchmove', draw, { passive: false });
    fresh.addEventListener('touchend', stop);
  }, []);

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const confirmSignature = async () => {
    if (!jobId) return;
    if (!signatoryName.trim()) {
      toast.error('Please enter the signatory name');
      return;
    }
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSaving(true);
    try {
      const res = await authFetch(`/api/jobs/${jobId}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatoryType: 'customer',
          signatoryName: signatoryName.trim(),
          signatoryRole: 'Customer',
          signatureData: dataUrl,
        }),
      });
      if (res.ok) {
        toast.success('Signature captured');
        await onSaved();
        onClose();
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to save signature' }));
        toast.error(err.error);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="size-5" />
            Customer Signature
          </DialogTitle>
          <DialogDescription>
            Have the customer sign below to confirm the work was completed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Customer Name
            </label>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="e.g. James Wilson"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={signatureCanvasRef}
              width={400}
              height={200}
              className="w-full touch-none cursor-crosshair"
              style={{ maxHeight: '200px' }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Draw signature above using mouse or touch
          </p>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={clearSignature} className="gap-1.5">
            <Trash2 className="size-4" />
            Clear
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            onClick={confirmSignature}
            disabled={saving || !signatoryName.trim()}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Confirm Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
