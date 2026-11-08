'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Camera,
  PenLine,
  ClipboardList,
  FileText,
  Loader2,
  AlertCircle,
  Mic,
  MicOff,
  Sparkles,
  Plus,
  Minus,
  Trash2,
  Wrench,
  Clock,
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PhotoCapture, type JobPhoto } from './photo-capture';
import { SignaturePad, type SavedSignature } from './signature-pad';
import { useQueryClient } from '@tanstack/react-query';
import { getJobInvalidations } from '@/lib/invalidation-helpers';

interface WrapUpLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  amount: number;
  type?: 'material' | 'labor' | 'service';
}

const TRADE_PRESETS: Array<{ name: string; rate: number; type: 'material' | 'labor' }> = [
  { name: '45uF Capacitor', rate: 45, type: 'material' },
  { name: 'Extra Labor 30m', rate: 50, type: 'labor' },
  { name: 'Pipe Fitting 3/4"', rate: 25, type: 'material' },
  { name: 'Refrigerant 2 lbs', rate: 85, type: 'material' },
  { name: 'Flush Drain Line', rate: 40, type: 'labor' },
  { name: 'Service Call Fee', rate: 75, type: 'labor' },
];

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
  const queryClient = useQueryClient();

  // ── Materials, hardware & extra labor state ──────────────────────
  const [lineItems, setLineItems] = useState<WrapUpLineItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setSpeechTranscript(currentTranscript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    } catch {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Reset transient state whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setBeforePhotos([]);
      setAfterPhotos([]);
      setCustomerSigs([]);
      setEmployeeSigs([]);
      setCompletionNotes('');
      setSpeechTranscript('');
      setIsListening(false);
    }
  }, [open, jobId]);

  // Fetch initial job lineItems & completion notes
  useEffect(() => {
    if (!open || !jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) return;
        const job = await res.json();
        if (cancelled) return;
        if (job.lineItemsJson) {
          try {
            const parsed = typeof job.lineItemsJson === 'string' ? JSON.parse(job.lineItemsJson) : job.lineItemsJson;
            if (Array.isArray(parsed)) setLineItems(parsed);
          } catch {}
        }
        if (job.completionNotes) {
          setCompletionNotes((prev) => prev || job.completionNotes);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [open, jobId]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      if (speechTranscript.trim()) {
        handleVoiceWrapUp(speechTranscript);
      }
    } else {
      setSpeechTranscript('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          setIsListening(true);
        }
      }
    }
  };

  const handleVoiceWrapUp = async (textToProcess?: string) => {
    const text = (textToProcess || speechTranscript).trim();
    if (!text) {
      toast.error('Please speak or type extra parts / work first.');
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setIsProcessingVoice(true);

    try {
      const res = await fetch('/api/ai/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          jobId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.spokenFeedback || data.error || 'Could not understand wrap-up command.');
        return;
      }

      toast.success(data.spokenFeedback || 'Materials and extra labor logged!');
      setSpeechTranscript('');

      if (data.data?.newItems && Array.isArray(data.data.newItems)) {
        setLineItems((prev) => [...prev, ...data.data.newItems]);
      }
      if (data.data?.completionNotes) {
        setCompletionNotes((prev) =>
          prev ? `${prev}\n${data.data.completionNotes}` : data.data.completionNotes
        );
      }
    } catch (err: any) {
      console.error('Wrap up error:', err);
      toast.error(err.message || 'Failed to process voice command.');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleAddManualItem = () => {
    const newItem: WrapUpLineItem = {
      id: `item_${Date.now()}`,
      name: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      type: 'material',
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  const handleAddPresetItem = (name: string, rate: number, type: 'material' | 'labor') => {
    const newItem: WrapUpLineItem = {
      id: `${type === 'labor' ? 'lab' : 'mat'}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name,
      quantity: 1,
      rate,
      amount: rate,
      type,
    };
    setLineItems((prev) => [...prev, newItem]);
    toast.success(`Added ${name} ($${rate})`);
  };

  const handleIncrementQty = (index: number) => {
    const current = lineItems[index];
    const qty = (Number(current?.quantity) || 1) + 1;
    handleUpdateItem(index, { quantity: qty });
  };

  const handleDecrementQty = (index: number) => {
    const current = lineItems[index];
    const currentQty = Number(current?.quantity) || 1;
    if (currentQty > 1) {
      handleUpdateItem(index, { quantity: currentQty - 1 });
    }
  };

  const handleToggleItemType = (index: number) => {
    const current = lineItems[index];
    const newType = current?.type === 'labor' ? 'material' : 'labor';
    handleUpdateItem(index, { type: newType });
  };

  const handleUpdateItem = (index: number, updates: Partial<WrapUpLineItem>) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], ...updates };
      item.amount = (Number(item.quantity) || 1) * (Number(item.rate) || 0);
      copy[index] = item;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

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
      // Sync any local line items changes to the job so invoice has the updated items
      if (lineItems.length > 0) {
        const subtotal = lineItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
        await fetch(`/api/jobs/${jobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineItemsJson: JSON.stringify(lineItems),
            quotedAmount: subtotal > 0 ? subtotal : undefined,
          }),
        }).catch(() => null);
      }

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
      // Invalidate via centralized helper — same contract as useJobLifecycleTransition.
      // This closes the dialog mutation gap (Phase 1.9f performance review finding).
      for (const key of getJobInvalidations({ mutation: 'update', variables: { id: jobId } })) {
        queryClient.invalidateQueries({ queryKey: key });
      }
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
      <DialogContent className="max-w-4xl h-[92dvh] sm:h-[88dvh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/30 shrink-0">
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
        <div className="px-6 py-3 border-b border-border/60 bg-background shrink-0">
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

        {/* Scrollable body — flex-1 + min-h-0 + overflow-y-auto so it fills
            the remaining dialog height and scrolls internally. We use a plain
            div instead of Radix ScrollArea because the latter wraps children
            in a `display: table` div that collapses inside flex containers.
            Custom scrollbar styling for better visibility. */}
        <div className="flex-1 min-h-0 overflow-y-auto job-completion-scroll">
          <style>{`
            .job-completion-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgb(203 213 225) transparent;
            }
            .job-completion-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .job-completion-scroll::-webkit-scrollbar-track {
              background: transparent;
            }
            .job-completion-scroll::-webkit-scrollbar-thumb {
              background-color: rgb(203 213 225);
              border-radius: 4px;
              border: 2px solid transparent;
              background-clip: content-box;
            }
            .job-completion-scroll::-webkit-scrollbar-thumb:hover {
              background-color: rgb(148 163 184);
            }
          `}</style>
          <div className="px-6 py-5 space-y-6">
            {/* AI Voice Wrap-Up Hero Card */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-600 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-emerald-200" />
                  <span className="text-[11px] font-black tracking-wider uppercase text-emerald-100">
                    AI Field Copilot · One-Tap Wrap-Up
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Speak to log parts, extra work & wrap up
                </h3>
                <p className="text-xs text-emerald-100/90">
                  Say: "Used 45uF capacitor $45 and 30m extra labor $50, completed and tested"
                </p>
              </div>

              <Button
                type="button"
                variant={isListening ? 'destructive' : 'secondary'}
                onClick={toggleListening}
                disabled={isProcessingVoice}
                className="h-10 px-4 text-xs font-bold gap-2 shrink-0 bg-white text-emerald-900 hover:bg-emerald-50 shadow-sm"
              >
                {isProcessingVoice ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-emerald-700" />
                    <span>AI Processing...</span>
                  </>
                ) : isListening ? (
                  <>
                    <MicOff className="size-4 animate-pulse text-red-600" />
                    <span>Stop & Log Work</span>
                  </>
                ) : (
                  <>
                    <Mic className="size-4 text-emerald-700" />
                    <span>Voice Wrap-Up</span>
                  </>
                )}
              </Button>
            </div>

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

            {/* Materials, Hardware & Extra Work (Voice AI) */}
            <section className="space-y-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
                    <Wrench className="size-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">Materials, Hardware & Extra Work</h3>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-[10px] gap-1">
                        <Sparkles className="size-3" /> Voice AI
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Speak or log any additional parts used or extra labor to include on the invoice.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={isListening ? 'destructive' : 'default'}
                    onClick={toggleListening}
                    disabled={isProcessingVoice}
                    className={cn(
                      'h-8 px-3 text-xs gap-1.5 font-medium shadow-xs',
                      !isListening && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    )}
                  >
                    {isProcessingVoice ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : isListening ? (
                      <>
                        <MicOff className="size-3.5 animate-pulse" />
                        <span>Stop & Log</span>
                      </>
                    ) : (
                      <>
                        <Mic className="size-3.5" />
                        <span>Voice Log Parts</span>
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddManualItem}
                    className="h-8 px-2.5 text-xs gap-1"
                  >
                    <Plus className="size-3" />
                    <span>Add Item</span>
                  </Button>
                </div>
              </div>

              {/* Quick Add Presets Ribbon */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Quick Add Presets (1-Click):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TRADE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddPresetItem(preset.name, preset.rate, preset.type)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border/80 bg-background hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 transition-colors shadow-2xs"
                    >
                      <Plus className="size-3 text-muted-foreground" />
                      <span>{preset.name}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">${preset.rate}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Listening Banner */}
              {isListening && (
                <div className="p-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                    <span className="size-2 rounded-full bg-red-500 animate-ping" />
                    <span className="font-medium">Listening:</span>
                    <span className="italic">{speechTranscript || 'Speak parts used (e.g. "Used 45uF capacitor $45 and 30m extra pipe flushing labor $50")...'}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs px-2"
                    onClick={() => handleVoiceWrapUp(speechTranscript)}
                    disabled={!speechTranscript.trim()}
                  >
                    Done Speaking
                  </Button>
                </div>
              )}

              {/* Items Table / List */}
              {lineItems.length > 0 ? (
                <div className="space-y-2 mt-2">
                  <div className="rounded-lg border border-border/80 bg-background overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 p-2 bg-muted/40 text-[11px] font-medium text-muted-foreground uppercase border-b border-border/60">
                      <span className="col-span-5 sm:col-span-6">Item / Work</span>
                      <span className="col-span-3 sm:col-span-2 text-center">Qty</span>
                      <span className="col-span-2 text-right">Price</span>
                      <span className="col-span-2 sm:col-span-1 text-right">Total</span>
                      <span className="col-span-1 text-center"></span>
                    </div>
                    <div className="divide-y divide-border/40">
                      {lineItems.map((item, idx) => (
                        <div key={item.id || idx} className="grid grid-cols-12 gap-2 p-2 items-center text-xs">
                          <div className="col-span-5 sm:col-span-6 flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleItemType(idx)}
                              title="Click to toggle between Part and Labor"
                              className="shrink-0"
                            >
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[9px] px-1 py-0 h-4 cursor-pointer hover:opacity-80 transition-opacity',
                                  item.type === 'labor' ? 'border-blue-400 text-blue-600 bg-blue-50/50' : 'border-amber-400 text-amber-600 bg-amber-50/50'
                                )}
                              >
                                {item.type === 'labor' ? 'Labor' : 'Part'}
                              </Badge>
                            </button>
                            <Input
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                              className="h-7 text-xs px-1.5"
                              placeholder="Part name or work"
                            />
                          </div>
                          <div className="col-span-3 sm:col-span-2 flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDecrementQty(idx)}
                              className="size-6 flex items-center justify-center rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="min-w-[20px] text-center font-bold text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleIncrementQty(idx)}
                              className="size-6 flex items-center justify-center rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min={0}
                              value={item.rate}
                              onChange={(e) => handleUpdateItem(idx, { rate: Number(e.target.value) || 0 })}
                              className="h-7 text-xs px-1.5 text-right font-mono"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1 text-right font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                            ${((item.quantity || 1) * (item.rate || 0)).toFixed(2)}
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                              title="Remove item"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Total Badge */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <span className="font-medium text-emerald-800 dark:text-emerald-300">
                      Total Added to Job Invoice ({lineItems.length} items):
                    </span>
                    <span className="font-bold text-sm font-mono text-emerald-700 dark:text-emerald-300">
                      ${lineItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 border border-dashed border-border rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground">
                    No extra hardware or labor added yet. Tap <span className="font-semibold text-emerald-600">Voice Log Parts</span> or speak what you used.
                  </p>
                </div>
              )}
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
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/30 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={!allPass || submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
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
