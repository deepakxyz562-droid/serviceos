'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Globe,
  CheckCircle2,
  Briefcase,
  UserCheck,
  Send,
  Trash2,
  ExternalLink,
  Loader2,
  Clock,
  Sparkles,
  Copy,
  MessageSquare,
  CalendarCheck,
  FileText,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface FormSubmissionItem {
  id: string;
  formId: string;
  form: {
    id: string;
    name: string;
    type: string;
    slug?: string;
  };
  respondentName: string;
  respondent: string | null;
  data: Record<string, unknown>;
  source: string;
  leadId?: string | null;
  customerId?: string | null;
  jobId?: string | null;
  quoteId?: string | null;
  actionsResults?: Record<string, unknown>;
  createdAt: string;
}

interface SubmissionDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: FormSubmissionItem | null;
  onRefresh?: () => void;
}

export function SubmissionDetailDrawer({
  open,
  onOpenChange,
  submission,
  onRefresh,
}: SubmissionDetailDrawerProps) {
  const [convertingLead, setConvertingLead] = useState(false);
  const [convertingJob, setConvertingJob] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!submission) return null;

  const email = (submission.data.email as string) || (submission.respondent?.includes('@') ? submission.respondent : null);
  const phone = (submission.data.phone as string) || (!submission.respondent?.includes('@') ? submission.respondent : null);

  const handleConvert = async (target: 'lead' | 'job') => {
    if (target === 'lead') setConvertingLead(true);
    if (target === 'job') setConvertingJob(true);

    try {
      const res = await fetch(`/api/forms/responses/${submission.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');

      toast.success(target === 'lead' ? 'Successfully converted to CRM Lead!' : 'Successfully converted to Job!');
      if (onRefresh) onRefresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to convert');
    } finally {
      setConvertingLead(false);
      setConvertingJob(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/forms/responses?id=${submission.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete submission');
      toast.success('Submission deleted');
      if (onRefresh) onRefresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyDispatchBrief = () => {
    const urgencyVal = String(submission.data.f_urgency || submission.data.urgency || '').toLowerCase();
    const address = String(submission.data.f_address || submission.data.address || submission.data.location || 'Not specified');
    const notes = String(submission.data.f_notes || submission.data.notes || submission.data.message || submission.data.description || 'None provided');
    const service = String(submission.data.f_service || submission.data.service || submission.form?.name || 'Service Request');
    const brief = `🚨 INTAKE DISPATCH BRIEF
Customer: ${submission.respondentName}
Phone: ${phone || 'N/A'}
Email: ${email || 'N/A'}
Service: ${service}
Location: ${address}
Urgency: ${urgencyVal.includes('emergency') ? 'EMERGENCY 🚨' : 'Standard Routine'}
Customer Notes: ${notes}
Received: ${new Date(submission.createdAt).toLocaleString()}`;
    navigator.clipboard.writeText(brief);
    toast.success('Dispatch brief copied to clipboard!');
  };

  // Human friendly source badge
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'chatbot':
        return <Badge className="bg-purple-600 text-white gap-1"><Sparkles className="size-3" /> AI Chatbot</Badge>;
      case 'wordpress':
        return <Badge className="bg-blue-600 text-white gap-1"><Globe className="size-3" /> WordPress Plugin</Badge>;
      case 'embed':
        return <Badge className="bg-teal-600 text-white gap-1">JS Embed</Badge>;
      case 'whatsapp':
        return <Badge className="bg-emerald-600 text-white gap-1">WhatsApp</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1">Direct Web Form</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col justify-between">
        <div className="p-6 space-y-6">
          {/* Header */}
          <SheetHeader className="space-y-2 border-b pb-4 text-left">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {getSourceBadge(submission.source)}
                <Badge variant="outline" className="text-xs">
                  {submission.form?.name || 'Smart Form'}
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" />
                {new Date(submission.createdAt).toLocaleString()}
              </span>
            </div>
            <SheetTitle className="text-xl font-bold flex items-center gap-2 pt-1">
              <User className="size-5 text-emerald-600" />
              {submission.respondentName}
            </SheetTitle>
            <SheetDescription className="text-xs">
              Full submission answers and customer inquiry payload
            </SheetDescription>
          </SheetHeader>

          {/* Contact Fast-Actions */}
          <div className="grid grid-cols-2 gap-2">
            {phone ? (
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 text-xs font-semibold"
                asChild
              >
                <a href={`tel:${phone}`}>
                  <Phone className="size-3.5 text-emerald-600" /> {phone}
                </a>
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground italic flex items-center gap-1.5 px-3 py-2 bg-muted/40 rounded-lg">
                <Phone className="size-3.5 opacity-40" /> No phone provided
              </div>
            )}

            {email ? (
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 text-xs font-semibold truncate"
                asChild
              >
                <a href={`mailto:${email}`}>
                  <Mail className="size-3.5 text-blue-600" /> {email}
                </a>
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground italic flex items-center gap-1.5 px-3 py-2 bg-muted/40 rounded-lg">
                <Mail className="size-3.5 opacity-40" /> No email provided
              </div>
            )}
          </div>

          {/* AI Intake Dossier & Urgency Callout */}
          {(() => {
            const urgencyVal = String(submission.data.f_urgency || submission.data.urgency || '').toLowerCase();
            const isEmergency = urgencyVal.includes('emergency') || String(submission.data.notes || submission.data.f_notes || '').toLowerCase().includes('leak') || String(submission.data.notes || submission.data.f_notes || '').toLowerCase().includes('burst');
            const photoEntries = Object.entries(submission.data || {}).filter(([k, v]) =>
              (k.toLowerCase().includes('photo') || k.toLowerCase().includes('image') || k.toLowerCase().includes('file')) &&
              typeof v === 'string' &&
              (v.startsWith('http') || v.startsWith('/'))
            );

            return (
              <div className="space-y-3">
                <div className={cn(
                  'p-4 rounded-xl border space-y-2',
                  isEmergency
                    ? 'bg-rose-500/10 border-rose-500/30 dark:bg-rose-950/20'
                    : 'bg-emerald-500/10 border-emerald-500/25 dark:bg-emerald-950/20'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-emerald-600" /> AI Intake Dossier
                    </span>
                    <Badge className={cn(
                      'text-[10px] font-bold uppercase',
                      isEmergency
                        ? 'bg-rose-600 text-white'
                        : 'bg-emerald-600 text-white'
                    )}>
                      {isEmergency ? '🚨 Emergency Priority' : 'Standard Intake'}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    {String(submission.data.f_notes || submission.data.notes || submission.data.description || 'Customer inquiry captured via AI Intake.')}
                  </p>
                  {Boolean(submission.data.f_address) && (
                    <div className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <strong>Service Location:</strong> {String(submission.data.f_address)}
                    </div>
                  )}
                </div>

                {/* Uploaded Photos Gallery Preview */}
                {photoEntries.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                      Customer Uploaded Photos ({photoEntries.length})
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {photoEntries.map(([k, v]) => (
                        <a
                          key={k}
                          href={String(v)}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative rounded-xl overflow-hidden border border-border/80 aspect-video bg-muted block shadow-2xs"
                        >
                          <img
                            src={String(v)}
                            alt="Uploaded customer photo"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                            View Full Photo
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* CRM Status & Conversion Actions */}
          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                CRM Pipeline Status
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {submission.leadId ? (
                  <Badge className="bg-emerald-600 text-white gap-1">
                    <UserCheck className="size-3" /> Converted to Lead
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                    onClick={() => handleConvert('lead')}
                    disabled={convertingLead}
                  >
                    {convertingLead ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                    Convert to CRM Lead
                  </Button>
                )}

                {submission.jobId ? (
                  <Badge className="bg-blue-600 text-white gap-1">
                    <Briefcase className="size-3" /> Job Created
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 text-xs gap-1.5"
                    onClick={() => handleConvert('job')}
                    disabled={convertingJob}
                  >
                    {convertingJob ? <Loader2 className="size-3.5 animate-spin" /> : <Briefcase className="size-3.5" />}
                    Create Job / Booking
                  </Button>
                )}

                {phone && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 text-xs gap-1.5"
                    asChild
                  >
                    <a
                      href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${submission.respondentName || 'there'}, thanks for reaching out to us regarding ${submission.form?.name || 'your inquiry'}. How can we assist you?`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageSquare className="size-3.5 text-emerald-600" />
                      WhatsApp Follow-up
                    </a>
                  </Button>
                )}

                {/* One-click: Confirm Appointment — sends a confirmation email/SMS */}
                {email && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 text-xs gap-1.5"
                    onClick={() => {
                      const subject = encodeURIComponent('Appointment Confirmation');
                      const body = encodeURIComponent(`Hi ${submission.respondentName || 'there'},\n\nYour appointment has been confirmed. We'll see you soon!\n\nBest regards,\nThe Team`);
                      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                    }}
                  >
                    <CalendarCheck className="size-3.5" />
                    Confirm Appointment
                  </Button>
                )}

                {/* One-click: Send Quote — opens email with pre-filled quote template */}
                {email && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 text-xs gap-1.5"
                    onClick={() => {
                      const subject = encodeURIComponent(`Quote for: ${submission.form?.name || 'Your Service Request'}`);
                      const body = encodeURIComponent(`Hi ${submission.respondentName || 'there'},\n\nThank you for your interest. Here's a preliminary quote for your request:\n\nService: ${submission.form?.name || 'Service Request'}\n\n[Add your pricing details here]\n\nPlease reply to confirm or ask any questions.\n\nBest regards,\nThe Team`);
                      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                    }}
                  >
                    <DollarSign className="size-3.5" />
                    Send Quote
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={handleCopyDispatchBrief}
                >
                  <Copy className="size-3.5" />
                  Copy Dispatch Brief
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Answers Data Store */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Submitted Form Answers ({Object.keys(submission.data || {}).length} Fields)
            </h4>
            <div className="space-y-2">
              {Object.entries(submission.data || {}).map(([key, val]) => (
                <div
                  key={key}
                  className="p-3 rounded-lg border bg-card/60 space-y-1 text-xs"
                >
                  <p className="font-semibold text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                  </p>
                  <p className="text-foreground font-medium whitespace-pre-wrap break-words">
                    {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val || '—')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Metadata */}
          <div className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Submission Technical Details</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="font-medium">Record ID:</span> <code className="bg-muted px-1 rounded">{submission.id}</code></div>
              <div><span className="font-medium">Form ID:</span> <code className="bg-muted px-1 rounded">{submission.formId}</code></div>
              <div><span className="font-medium">Source:</span> {submission.source}</div>
              <div><span className="font-medium">Timestamp:</span> {new Date(submission.createdAt).toISOString()}</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
          <Button
            variant="destructive"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Delete Submission
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
