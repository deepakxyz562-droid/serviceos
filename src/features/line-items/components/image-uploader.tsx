'use client';

import { useRef, useState } from 'react';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

export interface ImageUploaderProps {
  images: string[];
  onChange: (imgs: string[]) => void;
  max?: number;
  bucket?: string;
}

export function ImageUploader({
  images,
  onChange,
  max = 10,
  bucket = 'lead-images',
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = max - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${max} images reached`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('folder', 'leads');
        const res = await authFetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.url) urls.push(data.url);
        }
      }
      if (urls.length > 0) onChange([...images, ...urls]);
      if (urls.length < toUpload.length) toast.error('Some images failed to upload');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || images.length >= max}
        className="w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 hover:bg-muted/40 hover:border-emerald-400/50 transition-colors px-4 py-5 text-sm flex flex-col items-center gap-1.5 disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-emerald-600" />
        ) : (
          <ImagePlus className="size-5 text-emerald-600" />
        )}
        <span className="font-medium text-foreground">
          {uploading ? 'Uploading...' : 'Select or drag images here'}
        </span>
        <span className="text-xs text-muted-foreground">
          {images.length}/{max} uploaded
        </span>
      </button>
      {images.length > 0 && (
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-md overflow-hidden border bg-muted"
            >
              <img src={url} alt={`Upload ${idx + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
