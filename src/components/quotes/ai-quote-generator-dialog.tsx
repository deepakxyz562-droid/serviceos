'use client';

// ─────────────────────────────────────────────────────────────────────────────
// AI Quote Generator Dialog
//
// Mounted inside the Quotes view. The parent opens this dialog from two places:
//   1. The "✨ Generate with AI" button next to the "Create Quote" button in the
//      quotes list header.
//   2. The "✨ Auto-fill with AI" button at the top of the New Quote form.
//
// Flow:
//   1. User selects a customer (required — the API needs a customerId to scope
//      the new Quote row).
//   2. User describes the job in free text + optional service type / customer
//      notes / budget range.
//   3. We POST /api/ai/smart-quote with { problemDescription, customerId }.
//      The API calls the LLM (or falls back to a template) and persists a
//      draft Quote row.
//   4. On success we render a preview of the created quote (line items, total,
//      timeline, risk assessment) with two actions:
//        - "Open Quote" → calls onQuoteCreated(rawQuote) and closes the dialog.
//          The parent normalizes the raw quote, prepends it to the list, and
//          opens it in the edit form.
//        - "Generate Another" → resets the form (keeps customer + service type
//          for convenience) so the user can build another quote.
//   5. On error we render an inline error banner with a Retry button.
//
// Plan gating happens at the BUTTON level in the parent — if the user's plan
// doesn't include `ai_quote_generator`, the button click opens the global
// UpgradeModal instead of this dialog. So this component assumes the user has
// access.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  Sparkles, Loader2, AlertCircle, RefreshCw, ArrowRight,
  CheckCircle2, Clock, ShieldAlert, User,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useCompanyCurrency } from '@/hooks/use-company-currency';

// ─── Types ─────────────────────────────────────────────────────────────────

/** Minimal customer shape — only what this dialog needs. */
export interface AiDialogCustomer {
  id: string;
  name: string;
}

/** AI metadata returned by /api/ai/smart-quote. */
export interface AiQuoteMeta {
  estimatedHours?: number;
  estimatedDurationDays?: number;
  timeline?: string;
  riskAssessment?: string;
  termsAndConditions?: string;
  depositPct?: number;
  depositAmount?: number;
  generatedBy?: 'ai' | 'template-fallback';
  templateId?: string | null;
  aiError?: string;
}

export interface AiLineItem {
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  total: number;
}

/** Raw quote shape returned by /api/ai/smart-quote (flat, with aiMeta nested). */
export interface AiGeneratedQuote {
  id: string;
  title?: string;
  description?: string;
  customerId?: string | null;
  itemsJson?: AiLineItem[] | string;
  addOnsJson?: AiLineItem[] | string;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  total?: number;
  currency?: string;
  status?: string;
  validUntil?: string | null;
  createdAt?: string;
  aiMeta?: AiQuoteMeta;
  // Some response shapes wrap the quote under `quote` — handle defensively.
  quote?: AiGeneratedQuote;
}

interface AiQuoteGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: AiDialogCustomer[];
  tenantId: string | null;
  /** Called when the user clicks "Open Quote" on the success screen. */
  onQuoteCreated: (rawQuote: AiGeneratedQuote) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseItems(raw: AiLineItem[] | string | undefined): AiLineItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Unwrap the API response into a flat { quote, aiMeta } pair.
 *
 * The /api/ai/smart-quote route returns a flat object with `aiMeta` nested
 * inside (see route.ts line 749-772). The spec mentioned `{ quote, aiMeta }`
 * as the shape — we support both to be safe.
 */
function unwrapResponse(data: AiGeneratedQuote | undefined | null): {
  quote: AiGeneratedQuote | null;
  aiMeta: AiQuoteMeta | null;
} {
  if (!data) return { quote: null, aiMeta: null };
  // If wrapped: data.quote exists and contains the quote.
  if (data.quote && typeof data.quote === 'object' && data.quote.id) {
    return { quote: data.quote, aiMeta: data.quote.aiMeta ?? data.aiMeta ?? null };
  }
  return { quote: data, aiMeta: data.aiMeta ?? null };
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AiQuoteGeneratorDialog({
  open,
  onOpenChange,
  customers,
  tenantId,
  onQuoteCreated,
}: AiQuoteGeneratorDialogProps) {
  const { format } = useCompanyCurrency();

  // ── Form state ──────────────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [budgetRange, setBudgetRange] = useState('');

  // ── Async state ─────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<AiGeneratedQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCustomerId('');
    setJobDescription('');
    setServiceType('');
    setCustomerNotes('');
    setBudgetRange('');
    setResult(null);
    setError(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Defer the reset so the closing animation doesn't flash empty content.
      setTimeout(resetForm, 150);
    }
    onOpenChange(next);
  };

  const handleGenerate = async () => {
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (!jobDescription.trim()) {
      toast.error('Please describe the job');
      return;
    }

    // Combine the structured inputs into a single problemDescription string
    // (the /api/ai/smart-quote API expects one free-text field). We keep the
    // section labels so the LLM has the same context the user provided.
    const parts: string[] = [];
    if (serviceType.trim()) parts.push(`[Service type: ${serviceType.trim()}]`);
    parts.push(jobDescription.trim());
    if (customerNotes.trim()) parts.push(`Customer notes / concerns: ${customerNotes.trim()}`);
    if (budgetRange.trim()) parts.push(`Budget: ${budgetRange.trim()}`);
    const problemDescription = parts.join('\n\n');

    setGenerating(true);
    setError(null);
    try {
      const res = await authFetch('/api/ai/smart-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemDescription,
          customerId,
          tenantId,
        }),
      });
      const data = await res.json().catch(() => ({})) as AiGeneratedQuote & { error?: string; aiError?: string };
      if (!res.ok) {
        const msg = data.error || data.aiError || 'AI generation failed';
        throw new Error(msg);
      }
      // API returns a flat object with aiMeta nested inside.
      const { quote } = unwrapResponse(data);
      if (!quote || !quote.id) {
        throw new Error('AI returned an unexpected response shape');
      }
      setResult(quote);
      toast.success('✨ Quote generated successfully!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenQuote = () => {
    if (result) {
      onQuoteCreated(result);
      handleClose(false);
    }
  };

  const handleGenerateAnother = () => {
    setResult(null);
    setError(null);
    // Keep customerId + serviceType for convenience; clear the descriptive fields.
    setJobDescription('');
    setCustomerNotes('');
    setBudgetRange('');
  };

  // ── Derived display values for success view ─────────────────────────────
  const unwrapped = result ? unwrapResponse(result) : { quote: null, aiMeta: null };
  const successQuote = unwrapped.quote;
  const successMeta = unwrapped.aiMeta;
  const lineItems = successQuote ? parseItems(successQuote.itemsJson) : [];
  const addOns = successQuote ? parseItems(successQuote.addOnsJson) : [];
  const customer = customers.find((c) => c.id === (successQuote?.customerId ?? customerId));

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex items-center justify-center size-7 rounded-lg bg-emerald-600 shrink-0">
              <Sparkles className="size-4 text-white" />
            </span>
            AI Quote Generator
          </DialogTitle>
          <DialogDescription>
            Describe the job and let AI build the quote for you.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-3">
          <div className="space-y-4 pr-2">
            {/* ── Error banner ─────────────────────────────────────────── */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm flex items-start gap-2 dark:bg-red-950/30 dark:border-red-900">
                <AlertCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-red-800 dark:text-red-300 font-medium">Generation failed</p>
                  <p className="text-red-700 dark:text-red-400 mt-0.5 break-words">{error}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="shrink-0"
                >
                  <RefreshCw className="size-3 mr-1" /> Retry
                </Button>
              </div>
            )}

            {/* ── Success view ─────────────────────────────────────────── */}
            {successQuote ? (
              <div className="space-y-4">
                {/* Success header */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-950/30 dark:border-emerald-900">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                        Quote created
                      </p>
                      <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-0.5">
                        <span className="font-mono">#{successQuote.id.slice(-6).toUpperCase()}</span>
                        {' — '}
                        {successQuote.title || customer?.name || 'Untitled quote'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="bg-white/60 dark:bg-transparent text-emerald-700 border-emerald-300 dark:border-emerald-800"
                        >
                          <Sparkles className="size-3 mr-1" />
                          Generated by {successMeta?.generatedBy === 'template-fallback' ? 'template' : 'AI'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-white/60 dark:bg-transparent text-emerald-700 border-emerald-300 dark:border-emerald-800"
                        >
                          Total: {format(successQuote.total ?? 0)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Line items</h4>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left text-xs text-muted-foreground">
                          <th className="px-3 py-2 font-medium">Item</th>
                          <th className="px-3 py-2 font-medium text-center">Qty</th>
                          <th className="px-3 py-2 font-medium text-right">Unit</th>
                          <th className="px-3 py-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-xs">
                              No line items returned.
                            </td>
                          </tr>
                        ) : (
                          lineItems.map((li, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="px-3 py-2 font-medium text-foreground">
                                {li.name}
                                {li.description && (
                                  <span className="block text-xs text-muted-foreground font-normal line-clamp-2">
                                    {li.description}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center text-muted-foreground">
                                {li.quantity}
                                {li.unit ? <span className="text-[10px] ml-0.5">{li.unit}</span> : null}
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {format(li.unitPrice)}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-foreground">
                                {format(li.total)}
                              </td>
                            </tr>
                          ))
                        )}
                        {addOns.map((li, i) => (
                          <tr key={`addon-${i}`} className="border-t border-border/50 bg-muted/20">
                            <td className="px-3 py-2 font-medium text-foreground">
                              {li.name}
                              <span className="block text-xs text-muted-foreground font-normal">Add-on</span>
                            </td>
                            <td className="px-3 py-2 text-center text-muted-foreground">
                              {li.quantity}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {format(li.unitPrice)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-foreground">
                              {format(li.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-full max-w-xs space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{format(successQuote.subtotal ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tax ({successQuote.taxRate ?? 0}%)
                      </span>
                      <span className="font-medium">+{format(successQuote.tax ?? 0)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span className="text-emerald-700">
                        {format(successQuote.total ?? 0)}
                      </span>
                    </div>
                    {successMeta?.depositPct ? (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Deposit due ({successMeta.depositPct}%)</span>
                        <span>{format(successMeta.depositAmount ?? 0)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* AI meta: timeline + risk */}
                {(successMeta?.timeline || successMeta?.riskAssessment) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {successMeta.timeline && (
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                          <Clock className="size-3.5" /> Timeline
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {successMeta.timeline}
                        </p>
                      </div>
                    )}
                    {successMeta.riskAssessment && (
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                          <ShieldAlert className="size-3.5" /> Risk assessment
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {successMeta.riskAssessment}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {successMeta?.aiError && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 italic">
                    Note: {successMeta.aiError}
                  </p>
                )}
              </div>
            ) : (
              /* ── Form view ───────────────────────────────────────────── */
              <div className="space-y-4">
                {/* Customer selector */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <User className="size-3.5 text-muted-foreground" />
                    Customer <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={customerId}
                    onValueChange={setCustomerId}
                    disabled={generating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          No customers available
                        </SelectItem>
                      ) : (
                        customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Job description */}
                <div className="space-y-2">
                  <Label htmlFor="ai-job-description">
                    Job description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="ai-job-description"
                    placeholder="Customer needs a complete bathroom renovation — remove old tiles, install new waterproofing, retile shower and floor, install new vanity and toilet. Approx 50 sq ft."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={5}
                    disabled={generating}
                    className="text-sm resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe the work needed. The more detail, the more accurate the quote.
                  </p>
                </div>

                {/* Optional: service type */}
                <div className="space-y-2">
                  <Label htmlFor="ai-service-type">
                    Service type <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="ai-service-type"
                    placeholder="e.g., Plumbing, Electrical, Renovation"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    disabled={generating}
                    className="text-sm"
                  />
                </div>

                {/* Optional: customer notes */}
                <div className="space-y-2">
                  <Label htmlFor="ai-customer-notes">
                    Customer notes / concerns <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="ai-customer-notes"
                    placeholder="Any context the customer shared — preferences, concerns, access notes, etc."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    rows={2}
                    disabled={generating}
                    className="text-sm resize-y"
                  />
                </div>

                {/* Optional: budget range */}
                <div className="space-y-2">
                  <Label htmlFor="ai-budget-range">
                    Budget range <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="ai-budget-range"
                    placeholder='e.g., "Customer mentioned ~$5000 budget"'
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    disabled={generating}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {successQuote ? (
            <>
              <Button
                variant="outline"
                onClick={handleGenerateAnother}
                className="sm:mr-auto"
              >
                <RefreshCw className="size-4 mr-1.5" /> Generate Another
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleOpenQuote}
              >
                Open Quote <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={generating}
                className="sm:mr-auto"
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleGenerate}
                disabled={generating || !customerId || !jobDescription.trim()}
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 mr-1.5 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-1.5" /> Generate Quote
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
