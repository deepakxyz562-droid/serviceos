'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps, str, num, bool } from './widget-props';

export interface ImageWithNoteItem {
  id: string;
  name: string;
  size: number;
  previewUrl: string;
  note: string;
}

/**
 * Image Upload with Notes widget.
 *
 * Accepts standard WidgetProps and reads all settings from config:
 * - noteFieldTitle: label above the note textarea
 * - notePlaceholder: placeholder text for the note textarea
 * - requireNotes: whether notes are required before submit
 * - limitPhotos: whether to enforce min/max photo count
 * - minPhotos: minimum number of photos required
 * - maxPhotos: maximum number of photos allowed (alias: maxFiles)
 * - allowedImageTypes: array of allowed file extensions (alias: allowedTypes)
 * - maxFileSizeMb: maximum file size in MB
 */
export function ImageUploadWithNotes({ value, onChange, config, disabled, field }: WidgetProps) {
  // Read settings from config with sensible defaults
  const maxFiles = Math.max(1, num(config.maxPhotos, num(config.maxFiles, 10)));
  const maxFileSizeMb = Math.max(1, num(config.maxFileSizeMb, 10));
  const noteFieldTitle = str(config.noteFieldTitle, 'Notes');
  const notePlaceholder = str(config.notePlaceholder, 'Add notes or description for this file...');
  const requireNotes = bool(config.requireNotes, false);
  const limitPhotos = bool(config.limitPhotos, false);
  const minPhotos = Math.max(0, num(config.minPhotos, 1));

  // Parse allowed image types from config
  const rawTypes = config.allowedImageTypes || config.allowedTypes || config.allowedFileTypes;
  const allowedTypes: string[] = Array.isArray(rawTypes)
    ? rawTypes.map((t: string) => {
        const ext = String(t).toLowerCase().replace(/^\./, '');
        // Convert common extensions to MIME types for the accept attribute
        const mimeMap: Record<string, string> = {
          'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
          'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf',
          'heic': 'image/heic', 'bmp': 'image/bmp', 'tiff': 'image/tiff',
        };
        return mimeMap[ext] || `.${ext}`;
      })
    : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  const items: ImageWithNoteItem[] = Array.isArray(value) ? value : [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return;
    const newItems: ImageWithNoteItem[] = [...items];

    for (let i = 0; i < files.length; i++) {
      if (newItems.length >= maxFiles) break;
      const file = files[i];
      if (file.size > maxFileSizeMb * 1024 * 1024) continue;

      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : '';

      newItems.push({
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        previewUrl,
        note: '',
      });
    }

    onChange(newItems);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeItem = (id: string) => {
    if (disabled) return;
    onChange(items.filter((item) => item.id !== id));
  };

  const updateNote = (id: string, note: string) => {
    if (disabled) return;
    onChange(
      items.map((item) => (item.id === id ? { ...item, note } : item))
    );
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
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
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-border/80 hover:border-emerald-400/80 bg-muted/20 hover:bg-muted/40'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
            <Upload className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              Click to upload or drag and drop
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              PNG, JPG, WEBP, PDF up to {maxFileSizeMb}MB (Max {maxFiles} files)
            </p>
          </div>
        </div>
      </div>

      {/* Min photos validation hint */}
      {limitPhotos && minPhotos > 0 && items.length < minPhotos && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Please upload at least {minPhotos} photo{minPhotos > 1 ? 's' : ''}.
        </p>
      )}

      {/* Uploaded items with note inputs */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 bg-card border border-border/80 rounded-xl shadow-xs flex flex-col sm:flex-row gap-3 items-start relative group"
            >
              {/* Thumbnail / Icon */}
              <div className="size-20 rounded-lg overflow-hidden bg-muted border border-border/60 shrink-0 flex items-center justify-center relative">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <FileText className="size-6 text-emerald-600" />
                    <span className="text-[9px] mt-1 font-mono uppercase">
                      {item.name.split('.').pop() || 'FILE'}
                    </span>
                  </div>
                )}
              </div>

              {/* Note / Details */}
              <div className="flex-1 min-w-0 space-y-1.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                    {idx + 1}. {item.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(item.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {noteFieldTitle}
                  {requireNotes && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
                <Textarea
                  value={item.note}
                  disabled={disabled}
                  onChange={(e) => updateNote(item.id, e.target.value)}
                  placeholder={notePlaceholder}
                  className="text-xs min-h-[55px] resize-none"
                  rows={2}
                />
              </div>

              {/* Remove button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-red-500 p-1 rounded-md transition-colors"
                  title="Remove file"
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

export default ImageUploadWithNotes;
