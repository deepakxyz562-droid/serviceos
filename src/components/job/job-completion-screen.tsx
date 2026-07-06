'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Camera,
  PenLine,
  ClipboardList,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PhotoCapture, type JobPhoto } from './photo-capture';
import { SignaturePad, type SavedSignature } from './signature-pad';

interface JobCompletionScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle?: string;
  /** Linked checklist IDs — if non-empty, a checklist is "required". */
  linkedChecklistIds?: string[];
  /** Names of the linked checklists (for display only). */
  linkedChecklistNames?: string[];
  /** Default employee name (pre-fills the employee signature pad). */
  employeeName?: string;
  /** Called after the job is successfully completed. */
  onCompleted?: () => void;
  /**
   * Override the lifecycle endpoint that the "Complete Job" button calls.
   * Defaults to `/api/jobs/${jobId}/lifecycle` (admin endpoint).
   * Set to `/api/employee/jobs/${jobId}/lifecycle` when used from the
   * employee portal — that endpoint enforces assignee ownership and
   * validates that before/after photos + customer signature exist.
   */
  lifecycleEndpoint?: string;
  /** Extra payload to merge into the complete request body (e.g. latitude/longitude). */
  extraPayload?: Record<string, unknown>;
}

interface ValidationItem {
  key: string;
  label: string;
  icon: typeof Camera;
  /** 'pass' | 'fail' | 'warn' | 'skip' */
  status: 'pass' | 'fail' | 'warn' | 'skip';
  detail: string;
}

/**
 * Full-screen-like Dialog that walks the technician through job completion:
 * before/after photos, customer + employee signatures, and completion notes.
 *
 * The "Complete Job" button is disabled until all validation items pass.
 * On submit, calls POST /api/jobs/[id]/lifecycle with { action: 'complete', completionNotes }.
 */
export function JobCompletionScreen({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  linkedChecklistIds = [],
  linkedChecklistNames = [],
  employeeName,
  onCompleted,
  lifecycleEndpoint,
  extraPayload,
}: JobCompletionScreenProps) {
  const [beforePhotos, setBeforePhotos] = useState<JobPhoto[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<JobPhoto[]>([]);
  const [customerSigs, setCustomerSigs] = useState<SavedSignature[]>([]);
  const [employeeSigs, setEmployeeSigs] = useState<SavedSignature[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset transient state whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setBeforePhotos([]);
      setAfterPhotos([]);
      setCustomerSigs([]);
      setEmployeeSigs([]);
      setCompletionNotes('');
    }
  }, [open, jobId]);

  // ── Initial fetch of existing signatures (so reopening reflects reality) ──
  useEffect(() => {
    if (!open || !jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/signatures`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const sigs: SavedSignature[] = data.signatures || [];
        setCustomerSigs(sigs.filter((s) => s.signatoryType === 'customer'));
        setEmployeeSigs(sigs.filter((s) => s.signatoryType === 'employee'));
      } catch {
        // best-effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, jobId]);

  // Each PhotoCapture instance fetches the full list of photos for the job
  // and calls onChange with it. We split locally by photoType so each
  // section shows only its own slice.
  const handleBeforeChange = useCallback((all: JobPhoto[]) => {
    setBeforePhotos(all.filter((p) => p.photoType === 'before'));
  }, []);
  const handleAfterChange = useCallback((all: JobPhoto[]) => {
    setAfterPhotos(all.filter((p) => p.photoType === 'after'));
  }, []);

  const handleCustomerSigSaved = useCallback((sig: SavedSignature) => {
    setCustomerSigs((cur) => [...cur, sig]);
  }, []);
  const handleEmployeeSigSaved = useCallback((sig: SavedSignature) => {
    setEmployeeSigs((cur) => [...cur, sig]);
  }, []);

  // ── Validation ────────────────────────────────────────────────────
  const hasChecklist = linkedChecklistIds.length > 0;
  const validationItems: ValidationItem[] = [
    {
      key: 'before',
      label: 'Before photos',
      icon: Camera,
      status: beforePhotos.length >= 1 ? 'pass' : 'fail',
      detail:
        beforePhotos.length >= 1
          ? `${beforePhotos.length} before photo${beforePhotos.length > 1 ? 's' : ''} captured`
          : 'At least 1 before photo required',
    },
    {
      key: 'after',
      label: 'After photos',
      icon: Camera,
      status: afterPhotos.length >= 1 ? 'pass' : 'fail',
      detail:
        afterPhotos.length >= 1
          ? `${afterPhotos.length} after photo${afterPhotos.length > 1 ? 's' : ''} captured`
          : 'At least 1 after photo required',
    },
    {
      key: 'checklist',
      label: 'Checklist',
      icon: ClipboardList,
      status: hasChecklist ? 'warn' : 'pass',
      detail: hasChecklist
        ? `${linkedChecklistNames.length || linkedChecklistIds.length} linked — verify completion before finishing`
        : 'No checklist required',
    },
    {
      key: 'customerSig',
      label: 'Customer signature',
      icon: PenLine,
      status: customerSigs.length >= 1 ? 'pass' : 'fail',
      detail:
        customerSigs.length >= 1
          ? `Signed by ${customerSigs[customerSigs.length - 1].signatoryName}`
          : 'Customer signature required',
    },
    {
      key: 'employeeSig',
      label: 'Employee signature',
      icon: PenLine,
      status: employeeSigs.length >= 1 ? 'pass' : 'fail',
      detail:
        employeeSigs.length >= 1
          ? `Signed by ${employeeSigs[employeeSigs.length - 1].signatoryName}`
          : 'Employee signature required',
    },
  ];

  // "warn" doesn't block completion (only 'fail' does).
  const allPass = validationItems.every((item) => item.status !== 'fail');

  // ── Submit ────────────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!allPass) {
      toast.error('Please complete all required items first.');
      return;
    }
    setSubmitting(true);
    try {
      // Use the override endpoint if provided (e.g. employee portal uses
      // /api/employee/jobs/[id]/lifecycle for assignee-scoped validation).
      const endpoint = lifecycleEndpoint || `/api/jobs/${jobId}/lifecycle`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          jobId,
          completionNotes,
          ...(extraPayload || {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to complete job');
      }
      toast.success('Job completed successfully');
      onOpenChange(false);
      onCompleted?.();
    } catch (err) {
      console.error('[JobCompletion] complete error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to complete job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="inline-flex items-center justify-center size-7 rounded-lg bg-emerald-600 text-white">
              <CheckCircle2 className="size-4" />
            </span>
            Complete Job{jobTitle ? `: ${jobTitle}` : ''}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Capture before/after photos, collect signatures, and finalize the job. All required items must be completed.
          </DialogDescription>
        </DialogHeader>

        {/* Validation checklist (always visible, sticky at top of body) */}
        <div className="px-6 py-3 border-b border-border/60 bg-background">
          <div className="flex flex-wrap items-center gap-2">
            {validationItems.map((item) => {
              const Icon = item.icon;
              const colorMap: Record<ValidationItem['status'], string> = {
                pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                fail: 'bg-red-50 text-red-700 border-red-200',
                warn: 'bg-amber-50 text-amber-700 border-amber-200',
                skip: 'bg-muted text-muted-foreground border-border',
              };
              const IconToRender =
                item.status === 'pass' ? CheckCircle2 : item.status === 'fail' ? XCircle : AlertCircle;
              return (
                <div
                  key={item.key}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-medium',
                    colorMap[item.status]
                  )}
                  title={item.detail}
                >
                  <IconToRender className="size-3.5" />
                  <span>{item.label}</span>
                  <span className="text-[10px] opacity-70 hidden sm:inline">· {item.detail}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="flex-1" style={{ maxHeight: 'calc(92vh - 220px)' }}>
          <div className="px-6 py-5 space-y-6">
            {/* Before Photos */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-amber-600" />
                <h3 className="text-sm font-semibold">Before Photos</h3>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                  Required
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Capture the state of the site before work begins.
              </p>
              <PhotoCapture
                jobId={jobId}
                photoType="before"
                showTabs={false}
                onChange={handleBeforeChange}
                compact
              />
            </section>

            {/* After Photos */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-emerald-600" />
                <h3 className="text-sm font-semibold">After Photos</h3>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  Required
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Capture the finished work to verify completion.
              </p>
              <PhotoCapture
                jobId={jobId}
                photoType="after"
                showTabs={false}
                onChange={handleAfterChange}
                compact
              />
            </section>

            {/* Checklist (informational) */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-blue-600" />
                <h3 className="text-sm font-semibold">Job Checklist</h3>
                {hasChecklist ? (
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    Verify
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                    None
                  </Badge>
                )}
              </div>
              {hasChecklist ? (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5">
                  {linkedChecklistNames.length > 0
                    ? linkedChecklistNames.map((n, i) => (
                        <p key={i} className="text-sm text-foreground inline-flex items-center gap-2">
                          <ClipboardList className="size-3.5 text-muted-foreground" />
                          {n}
                        </p>
                      ))
                    : linkedChecklistIds.map((id, i) => (
                        <p key={i} className="text-sm text-foreground inline-flex items-center gap-2">
                          <ClipboardList className="size-3.5 text-muted-foreground" />
                          <span className="font-mono text-xs">{id}</span>
                        </p>
                      ))}
                  <p className="text-xs text-muted-foreground pt-1">
                    Confirm each checklist item has been completed on-site before finishing the job.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No checklist linked to this job.</p>
              )}
            </section>

            {/* Customer Signature */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <PenLine className="size-4 text-emerald-600" />
                <h3 className="text-sm font-semibold">Customer Signature</h3>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  Required
                </Badge>
                {customerSigs.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({customerSigs.length} collected)
                  </span>
                )}
              </div>
              {customerSigs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customerSigs.map((sig) => (
                    <div
                      key={sig.id}
                      className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1"
                    >
                      <img
                        src={sig.signatureUrl}
                        alt={`Signature by ${sig.signatoryName}`}
                        className="h-6 w-auto"
                      />
                      <span className="text-xs text-muted-foreground">{sig.signatoryName}</span>
                    </div>
                  ))}
                </div>
              )}
              <SignaturePad
                jobId={jobId}
                signatoryType="customer"
                onSaved={handleCustomerSigSaved}
                defaultSignatoryRole="Customer"
              />
            </section>

            {/* Employee Signature */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <PenLine className="size-4 text-blue-600" />
                <h3 className="text-sm font-semibold">Employee Signature</h3>
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                  Required
                </Badge>
                {employeeSigs.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({employeeSigs.length} collected)
                  </span>
                )}
              </div>
              {employeeSigs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {employeeSigs.map((sig) => (
                    <div
                      key={sig.id}
                      className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1"
                    >
                      <img
                        src={sig.signatureUrl}
                        alt={`Signature by ${sig.signatoryName}`}
                        className="h-6 w-auto"
                      />
                      <span className="text-xs text-muted-foreground">{sig.signatoryName}</span>
                    </div>
                  ))}
                </div>
              )}
              <SignaturePad
                jobId={jobId}
                signatoryType="employee"
                onSaved={handleEmployeeSigSaved}
                defaultSignatoryName={employeeName}
                defaultSignatoryRole="Technician"
              />
            </section>

            {/* Completion Notes */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Completion Notes</h3>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any final notes about the job — work performed, issues encountered, follow-up recommendations, etc."
                rows={3}
                className="resize-y"
              />
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/30">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={!allPass || submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4 mr-1.5" />
            )}
            Complete Job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default JobCompletionScreen;
