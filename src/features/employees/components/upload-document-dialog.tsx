'use client';

/**
 * Upload Document Dialog (Phase 2).
 *
 * Records document metadata only — no actual file upload to S3/storage.
 * The user pastes a file URL (e.g. a Google Drive link, an S3 URL, etc.)
 * and we POST { name, description, type, accessLevel, fileUrl, employeeId }
 * to /api/documents, which already enforces the Documents-tab role gate
 * (owner/admin/manager) server-side.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useState, useEffect } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authFetch } from '@/lib/client-auth';
import type { PayrollError } from '../types';
import { apiUrl, DOCUMENT_TYPES, DOCUMENT_ACCESS_LEVELS } from '../utils/employee-helpers';

export function UploadDocumentDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  presetType,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  presetType: string | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('general');
  const [accessLevel, setAccessLevel] = useState('admin');
  const [fileUrl, setFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // When the dialog opens with a preset type (e.g. user clicked "Upload" on
  // the "Driving License" card), seed both the type field and the name field
  // with a friendly default. The dialog resets state on close, so re-opening
  // with a different preset always starts fresh.
  useEffect(() => {
    if (open && presetType) {
      setType(presetType);
      const presetLabel = DOCUMENT_TYPES.find((t) => t.key === presetType)?.label;
      if (presetLabel) setName(presetLabel);
    }
    if (!open) {
      // Reset on close so the dialog doesn't carry stale state across opens.
      setName('');
      setDescription('');
      setType('general');
      setAccessLevel('admin');
      setFileUrl('');
    }
  }, [open, presetType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fileUrl.trim()) {
      toast.error('Name and file URL are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch(apiUrl('/api/documents'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          type: type || 'general',
          accessLevel: accessLevel || 'admin',
          fileUrl: fileUrl.trim(),
          employeeId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as PayrollError;
        throw new Error(body.error || `Upload failed (HTTP ${res.status})`);
      }
      toast.success(`Document uploaded for ${employeeName}`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4 text-emerald-600" /> Upload Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            Record a document for {employeeName}. Paste a publicly-accessible file URL — no actual file upload is performed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="doc-name" className="text-xs font-medium">Name *</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Driving License"
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-desc" className="text-xs font-medium">Description</Label>
            <Textarea
              id="doc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes (expiry, version, etc.)"
              rows={2}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-type" className="text-xs font-medium">Type</Label>
              <Select value={type} onValueChange={setType} disabled={submitting}>
                <SelectTrigger id="doc-type" className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.key} value={dt.key}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-access" className="text-xs font-medium">Access Level</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel} disabled={submitting}>
                <SelectTrigger id="doc-access" className="h-9">
                  <SelectValue placeholder="Select access" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_ACCESS_LEVELS.map((al) => (
                    <SelectItem key={al.value} value={al.value}>{al.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-url" className="text-xs font-medium">File URL *</Label>
            <Input
              id="doc-url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              type="url"
              required
              disabled={submitting}
            />
            <p className="text-[10px] text-muted-foreground">Direct link to the document. Must be accessible to viewers.</p>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Upload className="size-3.5 mr-1" /> Save Document
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
