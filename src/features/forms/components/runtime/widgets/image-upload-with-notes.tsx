'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export interface ImageWithNoteItem {
  id: string;
  name: string;
  size: number;
  previewUrl: string;
  note: string;
}

interface ImageUploadWithNotesProps {
  value?: ImageWithNoteItem[];
  onChange: (items: ImageWithNoteItem[]) => void;
  maxFiles?: number;
  maxFileSizeMb?: number;
  allowedTypes?: string[];
  disabled?: boolean;
}

export function ImageUploadWithNotes({
  value = [],
  onChange,
  maxFiles = 10,
  maxFileSizeMb = 10,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  disabled = false,
}: ImageUploadWithNotesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return;
    const newItems: ImageWithNoteItem[] = [...value];

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
    onChange(value.filter((item) => item.id !== id));
  };

  const updateNote = (id: string, note: string) => {
    if (disabled) return;
    onChange(
      value.map((item) => (item.id === id ? { ...item, note } : item))
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

      {/* Uploaded items with note inputs */}
      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((item, idx) => (
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
                <Textarea
                  value={item.note}
                  disabled={disabled}
                  onChange={(e) => updateNote(item.id, e.target.value)}
                  placeholder="Add notes or description for this file (e.g. 'Front bumper scratch', 'Serial tag')..."
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
