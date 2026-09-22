'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WidgetProps } from '../widget-props';

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export function FileUploadWidget({
  value,
  onChange,
  config,
  disabled,
  field,
}: WidgetProps) {
  const maxFiles = Number(config?.maxFiles ?? 5);
  const maxFileSizeMb = Number(config?.maxFileSizeMb ?? 10);
  // Read allowedFileTypes (schema key) with fallback to extensions (legacy key).
  const extensionsRaw = config?.allowedFileTypes ?? config?.extensions;
  const extensions: string[] = Array.isArray(extensionsRaw)
    ? extensionsRaw.map((e) => String(e).toLowerCase().replace(/^\./, ''))
    : typeof extensionsRaw === 'string' && extensionsRaw.trim()
      ? extensionsRaw.split(',').map((e) => e.trim().toLowerCase().replace(/^\./, '')).filter(Boolean)
      : [];
  const acceptAttr = extensions.length ? `.${extensions.join(',.')}` : '*';
  const ariaLabel = String(field?.label ?? 'File upload');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items: UploadedFile[] = Array.isArray(value) ? (value as UploadedFile[]) : [];

  const isAllowed = (file: File) => {
    if (!extensions.length) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return extensions.includes(ext);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const next: UploadedFile[] = [...items];
      for (let i = 0; i < files.length; i++) {
        if (next.length >= maxFiles) break;
        const file = files[i];
        if (!isAllowed(file)) {
          setError(`Skipped ${file.name}: extension not allowed`);
          continue;
        }
        if (file.size > maxFileSizeMb * 1024 * 1024) {
          setError(`Skipped ${file.name}: exceeds ${maxFileSizeMb}MB`);
          continue;
        }
        const dataUrl = await readFileAsDataUrl(file);
        next.push({ name: file.name, size: file.size, type: file.type, dataUrl });
      }
      onChange(next);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (idx: number) => {
    if (disabled) return;
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        aria-label={ariaLabel}
        tabIndex={disabled ? -1 : 0}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-border/80 hover:border-emerald-400/80 bg-muted/20 hover:bg-muted/40'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptAttr}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="size-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          </div>
          <p className="text-xs font-semibold">Click or drop files here</p>
          <p className="text-[11px] text-muted-foreground">
            {extensions.length
              ? `${extensions.join(', ').toUpperCase()} · `
              : 'Any file type · '}
            up to {maxFiles} files, {maxFileSizeMb}MB each
          </p>
        </div>
      </div>

      {error && <p className="text-[11px] text-red-600">{error}</p>}

      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-card border border-border/80 rounded-lg flex items-center gap-3"
            >
              <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                <FileText className="size-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(item.size)} · {item.type || 'unknown'}
                </p>
              </div>
              <a
                href={item.dataUrl}
                download={item.name}
                aria-label={`Download ${item.name}`}
                className="text-muted-foreground hover:text-emerald-600 p-1 rounded-md"
              >
                <Download className="size-4" />
              </a>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(idx);
                  }}
                  className="text-muted-foreground hover:text-red-500 p-1 rounded-md"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUploadWidget;
