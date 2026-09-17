'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, Trash2, MessageSquare, CheckCircle2, AlertTriangle, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num } from '../widget-props';
import { cn } from '@/lib/utils';

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}
interface SubmissionValue {
  assignmentTitle: string;
  studentName: string;
  studentId: string;
  courseId: string;
  files: AttachedFile[];
  comments: string;
  submittedAt?: string;
  late?: boolean;
  dueDate?: string;
}

export function AssignmentSubmission({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Assignment submission');
  const maxFiles = num(config.maxFiles, 5);
  const maxSizeMB = num(config.maxSizeMB, 25);
  const assignmentTitle = str(config.assignmentTitle, '');
  const courseId = str(config.courseId, '');
  const dueDate = str(config.dueDate, '');
  const inputRef = useRef<HTMLInputElement>(null);

  const v: SubmissionValue = value && typeof value === 'object'
    ? (value as SubmissionValue)
    : { assignmentTitle, courseId, studentName: '', studentId: '', files: [], comments: '' };

  const [dragOver, setDragOver] = useState(false);

  const patch = (p: Partial<SubmissionValue>) => {
    const next = { ...v, ...p };
    if (dueDate) {
      next.dueDate = dueDate;
      next.late = new Date() > new Date(dueDate);
    }
    next.submittedAt = new Date().toISOString();
    onChange(next);
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    const incoming = Array.from(fileList).slice(0, maxFiles - v.files.length);
    incoming.forEach((file) => {
      if (file.size > maxSizeMB * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = () => {
        const next: AttachedFile = {
          name: file.name, size: file.size, type: file.type, dataUrl: String(reader.result),
        };
        patch({ files: [...v.files, next] });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (idx: number) => patch({ files: v.files.filter((_, i) => i !== idx) });

  const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  const ready = v.files.length > 0 && v.studentName && v.studentId;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <FileText className="size-3.5 text-primary" />
        <span className="text-xs font-semibold">Assignment submission</span>
        {v.late && <Badge variant="destructive" className="text-[9px] ml-auto">LATE</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-[11px] text-muted-foreground mb-1 block">Assignment title</Label>
          <Input value={v.assignmentTitle} disabled={disabled}
            onChange={(e) => patch({ assignmentTitle: e.target.value })}
            aria-label="Assignment title" className="text-xs h-9" placeholder="Essay #1" />
        </div>
        <Input value={v.studentName} disabled={disabled}
          onChange={(e) => patch({ studentName: e.target.value })}
          aria-label="Student name" className="text-xs h-9" placeholder="Student name" />
        <Input value={v.studentId} disabled={disabled}
          onChange={(e) => patch({ studentId: e.target.value })}
          aria-label="Student ID" className="text-xs h-9 font-mono" placeholder="Student ID" />
        <div className="col-span-2">
          <Input value={v.courseId} disabled={disabled}
            onChange={(e) => patch({ courseId: e.target.value })}
            aria-label="Course ID" className="text-xs h-9" placeholder="CS 101" />
        </div>
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 block">
          Attachments ({v.files.length}/{maxFiles})
        </Label>
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!disabled) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'rounded-md border-2 border-dashed p-3 text-center cursor-pointer transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          <Upload className="size-4 mx-auto text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground mt-1">Drag & drop or click to upload</p>
          <p className="text-[9px] text-muted-foreground">Max {maxSizeMB} MB per file</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            disabled={disabled}
            className="hidden"
            aria-label="Upload assignment files"
            onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = ''; }}
          />
        </div>

        {v.files.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {v.files.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-md border border-border bg-background p-1.5">
                <Paperclip className="size-3 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] truncate font-medium">{f.name}</p>
                  <p className="text-[9px] text-muted-foreground">{fmtSize(f.size)}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" disabled={disabled}
                  onClick={() => removeFile(idx)}
                  className="size-6 p-0 text-muted-foreground hover:text-red-500"
                  aria-label={`Remove ${f.name}`}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
          <MessageSquare className="size-3" /> Comments (optional)
        </Label>
        <Textarea
          value={v.comments}
          disabled={disabled}
          onChange={(e) => patch({ comments: e.target.value })}
          aria-label="Submission comments"
          placeholder="Notes for the instructor"
          className="text-xs min-h-[60px]"
        />
      </div>

      {ready ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-2 flex items-center gap-1.5">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
            Submission ready{v.submittedAt ? ` · ${new Date(v.submittedAt).toLocaleString()}` : ''}
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="size-3" /> Student name, ID, and at least one file required.
        </p>
      )}
    </div>
  );
}

export default AssignmentSubmission;
