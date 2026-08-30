'use client';

/**
 * FormActionDialogs — Phase 6A2 extraction from form-builder-view.tsx.
 *
 * Bundles five action-prompt / preview dialogs used by the Form Builder:
 *
 *   - <ResponsesDialog /> — table of form submissions (data + action results
 *     + expandable detail rows). Pulls responses from the parent's fetched
 *     state.
 *   - <PreviewDialog /> — read-only rendered preview of the form's fields,
 *     with a "Open Live Form" button. Uses FieldRenderer for engine field
 *     types and an inline legacy render for the original 14 types.
 *   - <EmbedDialog /> — direct link + script embed + iframe embed + QR code
 *     for the selected form.
 *   - <WhatsAppSendDialog /> — phone-number input + simulated WhatsApp send.
 *   - <DeleteConfirmDialog /> — "are you sure?" prompt for form deletion.
 *
 * All dialogs are pure presentational — the parent owns the state and the
 * submit handlers.
 *
 * Extracted from src/components/views/form-builder-view.tsx (Phase 6A2).
 */

import { Fragment } from 'react';
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Code, Copy,
  ExternalLink, Eye, FileInput, Loader2, MessageCircle, Send, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldRenderer } from '@/components/forms/field-renderer';
import type { FormField as EngineFormField } from '@/lib/form-field-types';
import { isEngineFieldType } from '@/features/forms/utils/form-helpers';
import type { FormItem, FormResponse } from '@/features/forms/types';
import { QRCodePlaceholder, SubmissionFlowDiagram } from '@/features/forms/components/field-editor';

// ─── Helpers (local) ────────────────────────────────────────────────────────

function buildFormLink(siteOrigin: string, form: FormItem): string {
  const slug = form.slug || form.id;
  return `${siteOrigin}/f/${slug}`;
}

function buildEmbedScript(siteOrigin: string, form: FormItem): string {
  return `<script src="${siteOrigin}/embed.js" data-form-id="${form.id}" data-tenant="default"></script>`;
}

function buildEmbedIframe(siteOrigin: string, form: FormItem): string {
  return `<iframe src="${buildFormLink(siteOrigin, form)}" width="100%" height="600" frameborder="0" style="border-radius:8px;"></iframe>`;
}

// ─── Responses Dialog ───────────────────────────────────────────────────────

export interface ResponsesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormItem | null;
  responses: FormResponse[];
  loading: boolean;
  error: string | null;
  expandedResponseId: string | null;
  onExpandedResponseChange: (id: string | null) => void;
  onRetry: () => void;
  onGetDirectLink: () => void;
}

export function ResponsesDialog({
  open, onOpenChange, form, responses, loading, error,
  expandedResponseId, onExpandedResponseChange, onRetry, onGetDirectLink,
}: ResponsesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="size-4 text-emerald-600" />
            {form?.name} — Responses
          </DialogTitle>
          <DialogDescription>
            {loading ? 'Loading responses…' : `${responses.length} response${responses.length === 1 ? '' : 's'} received`}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {error ? (
            <div className="text-center py-10">
              <AlertCircle className="size-10 mx-auto text-red-500 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                <Loader2 className="size-3.5 mr-2" /> Retry
              </Button>
            </div>
          ) : loading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-10">
              <FileInput className="size-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium mb-1">No responses yet</p>
              <p className="text-xs text-muted-foreground mb-4">Share your form&apos;s direct link to start collecting responses.</p>
              <Button variant="outline" size="sm" onClick={onGetDirectLink}>
                <ExternalLink className="size-3.5 mr-2" /> Get Direct Link
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Respondent</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <Fragment key={response.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        onExpandedResponseChange(
                          expandedResponseId === response.id ? null : response.id,
                        )
                      }
                    >
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium">{response.respondentName || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground">{response.respondentPhone || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{response.submittedAt}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{response.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {response.leadId && <Badge className="bg-blue-100 text-blue-700 text-[9px]">Lead</Badge>}
                          {response.customerId && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Customer</Badge>}
                          {response.jobId && <Badge className="bg-cyan-100 text-cyan-700 text-[9px]">Job</Badge>}
                          {response.quoteId && <Badge className="bg-orange-100 text-orange-700 text-[9px]">Quote</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expandedResponseId === response.id ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </TableCell>
                    </TableRow>
                    {expandedResponseId === response.id && (
                      <TableRow key={`${response.id}-detail`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Form Data */}
                            <div>
                              <h5 className="text-xs font-semibold mb-2">Form Data</h5>
                              <div className="space-y-1">
                                {Object.entries(response.data).map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-medium">{value || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Action Results */}
                            <div>
                              <h5 className="text-xs font-semibold mb-2">Action Results</h5>
                              <div className="space-y-1">
                                {Object.entries(response.actionsResults).length > 0 ? (
                                  Object.entries(response.actionsResults).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-1.5 text-xs">
                                      <CheckCircle2 className="size-3 text-emerald-500" />
                                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                      <span className="font-medium">{value}</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground">No actions executed</p>
                                )}
                                {/* Created resources */}
                                <div className="pt-2 space-y-1">
                                  {response.leadId && (
                                    <Button variant="link" size="sm" className="h-5 text-xs p-0 text-blue-600">
                                      <ExternalLink className="size-3 mr-1" /> View Lead #{response.leadId.split('-')[1]}
                                    </Button>
                                  )}
                                  {response.jobId && (
                                    <Button variant="link" size="sm" className="h-5 text-xs p-0 text-cyan-600">
                                      <ExternalLink className="size-3 mr-1" /> View Job #{response.jobId.split('-')[1]}
                                    </Button>
                                  )}
                                  {response.customerId && (
                                    <Button variant="link" size="sm" className="h-5 text-xs p-0 text-emerald-600">
                                      <ExternalLink className="size-3 mr-1" /> View Customer
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preview Dialog ─────────────────────────────────────────────────────────

export interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormItem | null;
  onOpenLiveForm: (form: FormItem) => void;
}

export function PreviewDialog({
  open, onOpenChange, form, onOpenLiveForm,
}: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="size-4 text-emerald-600" /> Form Preview
          </DialogTitle>
          <DialogDescription>{form?.name}</DialogDescription>
        </DialogHeader>
        {form && (
          <div className="space-y-3">
            {/* Welcome */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm">{form.welcomeMessage || 'Welcome! Please fill out this form.'}</p>
            </div>

            {/* Submission Flow */}
            <SubmissionFlowDiagram actions={form.submissionActions} />

            {/* Fields */}
            <div className="space-y-3">
              {form.fields.map((field) => {
                // For the new engine field types, delegate to the
                // FieldRenderer which knows how to render all 15 types.
                if (isEngineFieldType(field.type)) {
                  return (
                    <FieldRenderer
                      key={field.id}
                      field={field as EngineFormField}
                      value={undefined}
                      onChange={() => { /* preview-only */ }}
                      compact
                      readOnly
                    />
                  );
                }
                // Legacy field types — keep the original inline render.
                return (
                  <div key={field.id} className="space-y-1">
                    <Label className="text-xs">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {field.type === 'select' ? (
                      <Select>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center gap-2"><Checkbox /><span className="text-xs">Yes</span></div>
                    ) : field.type === 'textarea' ? (
                      <Textarea className="text-xs" rows={2} placeholder={field.placeholder || field.label} />
                    ) : field.type === 'radio' ? (
                      <RadioGroup className="flex gap-2">
                        {(field.options || ['Option 1', 'Option 2']).map((o) => (
                          <div key={o} className="flex items-center gap-1.5">
                            <RadioGroupItem value={o} /><Label className="text-xs">{o}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : field.type === 'rating' ? (
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className="size-5 text-amber-400 cursor-pointer" />
                        ))}
                      </div>
                    ) : field.type === 'scale' ? (
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                          <button key={i} className="size-7 rounded border text-xs hover:bg-emerald-50">{i}</button>
                        ))}
                      </div>
                    ) : (
                      <Input
                        className="h-8 text-xs"
                        type={
                          field.type === 'number' ? 'number'
                          : field.type === 'date' ? 'date'
                          : field.type === 'email' ? 'email'
                          : field.type === 'phone' ? 'tel'
                          : field.type === 'url' ? 'url'
                          : 'text'
                        }
                        placeholder={field.placeholder || field.label}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => onOpenLiveForm(form)}>
                <ExternalLink className="size-3.5 mr-1.5" /> Open Live Form to Submit
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center -mt-1">
              This preview shows the form layout. Click above to open the live form and test a real submission.
            </p>

            {/* Completion */}
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <CheckCircle2 className="size-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{form.completionMessage || 'Thank you for your submission!'}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Embed Dialog ───────────────────────────────────────────────────────────

export interface EmbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormItem | null;
  siteOrigin: string;
  onCopy: (text: string, label: string) => void;
  onOpenLiveForm: (form: FormItem) => void;
}

export function EmbedDialog({
  open, onOpenChange, form, siteOrigin, onCopy, onOpenLiveForm,
}: EmbedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="size-4 text-emerald-600" /> Embed Form
          </DialogTitle>
          <DialogDescription>{form?.name}</DialogDescription>
        </DialogHeader>
        {form && (
          <div className="space-y-4">
            {/* Direct Link */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Direct Link</Label>
              <div className="flex gap-2">
                <Input readOnly className="text-xs font-mono" value={buildFormLink(siteOrigin, form)} />
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => onOpenLiveForm(form)} title="Open form in new tab">
                  <ExternalLink className="size-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => onCopy(buildFormLink(siteOrigin, form), 'Direct link')} title="Copy link">
                  <Copy className="size-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Share this link on WhatsApp, SMS, email, or social media. Anyone with the link can fill the form — no login required.
              </p>
            </div>

            {/* Script Embed */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Script Embed</Label>
              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 relative">
                <code className="text-xs font-mono break-all">{buildEmbedScript(siteOrigin, form)}</code>
                <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 text-xs text-slate-400 hover:text-white" onClick={() => onCopy(buildEmbedScript(siteOrigin, form), 'Script embed')}>
                  <Copy className="size-3" />
                </Button>
              </div>
            </div>

            {/* Iframe Embed */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Iframe Embed</Label>
              <div className="bg-slate-900 text-slate-100 rounded-lg p-3 relative">
                <code className="text-xs font-mono break-all">{buildEmbedIframe(siteOrigin, form)}</code>
                <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 text-xs text-slate-400 hover:text-white" onClick={() => onCopy(buildEmbedIframe(siteOrigin, form), 'Iframe embed')}>
                  <Copy className="size-3" />
                </Button>
              </div>
            </div>

            {/* QR Code */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">QR Code</Label>
              <QRCodePlaceholder formId={form.id} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── WhatsApp Send Dialog ───────────────────────────────────────────────────

export interface WhatsAppSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormItem | null;
  phone: string;
  onPhoneChange: (phone: string) => void;
  sending: boolean;
  onSend: () => void;
}

export function WhatsAppSendDialog({
  open, onOpenChange, form, phone, onPhoneChange, sending, onSend,
}: WhatsAppSendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="size-5 text-[#25D366]" /> Send via WhatsApp
          </DialogTitle>
          <DialogDescription>Send &quot;{form?.name}&quot; to a customer</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Recipient Phone Number *</Label>
            <Input
              placeholder="+1 555-000-0000"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              type="tel"
            />
            <p className="text-[10px] text-muted-foreground">Enter the customer&apos;s WhatsApp number</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">The customer will receive:</p>
            <ul className="text-[11px] text-emerald-700 dark:text-emerald-300 space-y-0.5">
              <li>✓ Form welcome message</li>
              <li>✓ Form fields as numbered steps</li>
              <li>✓ &quot;Fill Form&quot; button</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2"
            onClick={onSend}
            disabled={sending || !phone.trim()}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sending ? 'Sending...' : 'Send via WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ──────────────────────────────────────────────────

export interface DeleteConfirmDialogProps {
  form: FormItem | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (form: FormItem) => void;
}

export function DeleteConfirmDialog({
  form, onOpenChange, onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={!!form} onOpenChange={(nextOpen) => { if (!nextOpen) onOpenChange(false); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Form</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{form?.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => form && onConfirm(form)}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
