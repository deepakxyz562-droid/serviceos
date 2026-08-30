'use client';

/**
 * PhotoCaptureDialog — Phase 6A1 extraction from employee-portal-view.tsx.
 *
 * Self-contained dialog for capturing / uploading a job photo. The parent
 * opens it by passing `open`, `jobId`, and `initialPhotoType`; the dialog
 * owns:
 *   - the photoType toggle (before / after / progress / issue)
 *   - the captured/selected image data URL
 *   - the hidden file input + compression pipeline (uses the shared
 *     `compressImage` helper from `@/components/job/photo-capture`)
 *   - the upload mutation (POST /api/jobs/[id]/photos)
 *
 * Calls `onUploaded()` when the upload succeeds so the parent can re-fetch
 * jobs to refresh the photo counts. Calls `onClose()` when the user dismisses
 * the dialog (or after a successful upload).
 */

import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { compressImage } from '@/components/job/photo-capture';
import type { PhotoType } from '@/features/employee-portal/types';

export interface PhotoCaptureDialogProps {
  open: boolean;
  jobId: string | null;
  initialPhotoType?: PhotoType;
  onClose: () => void;
  onUploaded: () => void | Promise<void>;
}

const PHOTO_TYPES: PhotoType[] = ['before', 'after', 'progress', 'issue'];

export function PhotoCaptureDialog({
  open,
  jobId,
  initialPhotoType = 'before',
  onClose,
  onUploaded,
}: PhotoCaptureDialogProps) {
  const [photoType, setPhotoType] = useState<PhotoType>(initialPhotoType);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state every time the dialog opens for a fresh capture.
  useEffect(() => {
    if (open) {
      setPhotoType(initialPhotoType);
      setPhotoDataUrl(null);
      setUploading(false);
    }
  }, [open, initialPhotoType]);

  const capturePhoto = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reject files larger than 10MB before compression (same limit as PhotoCapture)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} is too large`, {
        description: 'Maximum file size is 10MB.',
        duration: 6000,
      });
      e.target.value = '';
      return;
    }
    try {
      // Compress + resize the image before uploading (same helper as PhotoCapture).
      // Without this, raw phone photos (5-12MB) would exceed the server's body
      // limit and fail with a cryptic JSON parse error.
      const dataUrl = await compressImage(file, 1280, 0.8);
      setPhotoDataUrl(dataUrl);
    } catch {
      toast.error('Failed to process image. Try a different file.');
    }
    e.target.value = '';
  };

  const confirmUpload = async () => {
    if (!jobId || !photoDataUrl) return;
    setUploading(true);
    try {
      const res = await authFetch(`/api/jobs/${jobId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoType,
          file: photoDataUrl,
        }),
      });
      if (res.ok) {
        toast.success(`${photoType} photo uploaded`);
        await onUploaded();
        onClose();
      } else {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        toast.error(err.error);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-5" />
            {photoType === 'before' && 'Before Photo'}
            {photoType === 'after' && 'After Photo'}
            {photoType === 'progress' && 'Progress Photo'}
            {photoType === 'issue' && 'Issue Photo'}
          </DialogTitle>
          <DialogDescription>
            Capture or upload a photo. This will be saved to the job record.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {photoDataUrl ? (
            <div className="relative rounded-lg overflow-hidden border">
              <img src={photoDataUrl} alt="Preview" className="w-full h-48 object-cover" />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 size-7 p-0"
                onClick={() => setPhotoDataUrl(null)}
              >
                <XCircle className="size-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={capturePhoto}
              className="w-full h-48 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors flex flex-col items-center justify-center gap-2 text-slate-500"
            >
              <Camera className="size-8" />
              <span className="text-sm font-medium">Tap to take or choose a photo</span>
            </button>
          )}
          <div className="flex gap-2">
            {PHOTO_TYPES.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={photoType === t ? 'default' : 'outline'}
                className={`h-8 flex-1 capitalize ${photoType === t ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                onClick={() => setPhotoType(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={confirmUpload}
            disabled={!photoDataUrl || uploading}
          >
            {uploading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4 mr-2" />
            )}
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
