'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  Loader2,
  Lock,
  MessageSquare,
  Phone,
  Play,
  QrCode,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import {
  DEFAULT_REVIEW_PERSONAL_NOTE,
  sanitizeReviewPersonalNote,
} from '@/lib/bgos-meta-templates';

export interface SeoUpdateMilestone {
  id: string;
  title: string;
  badge?: string;
  bullets: string[];
}

const DEFAULT_MILESTONES: SeoUpdateMilestone[] = [
  {
    id: 'm1',
    title: 'AI Replies Synced to Past Un-replied Reviews',
    badge: 'Active',
    bullets: ['Synced and replied to historical un-replied Google reviews'],
  },
  {
    id: 'm2',
    title: 'GBP Performance Telemetry Synced',
    badge: 'Active',
    bullets: [
      'Stores Search Views, Maps Views, Calls, and Direction Requests',
      'Tracks real weekly review momentum against your weekly goal',
    ],
  },
  {
    id: 'm3',
    title: 'AI Replies Using Original Review Timestamps',
    badge: 'Active',
    bullets: [
      'Defined brand-aligned review reply guidelines',
      'Preserves original Google create timestamps for honest weekly metrics',
    ],
  },
  {
    id: 'm4',
    title: 'GBP Post Topics & Autopilot Calendar Ready',
    badge: 'Active',
    bullets: [
      'Curated business-specific Google post topics',
      'Supports instant publishing and daily/weekly scheduling',
    ],
  },
  {
    id: 'm5',
    title: 'Best Local SEO Keywords Identified',
    badge: 'Active',
    bullets: [
      'Analyzed business profile & service keywords for local ranking',
    ],
  },
  {
    id: 'm6',
    title: 'Bulk Review Invites (5/Day)',
    badge: 'Active',
    bullets: [
      'Staggers CSV uploads, pasted lists, and CRM contacts at 5/day',
    ],
  },
  {
    id: 'm7',
    title: 'AI Media Title, SEO Description & Tags',
    badge: 'Active',
    bullets: [
      'Auto-generates editable title, SEO description, tags, and category on every photo/video upload',
    ],
  },
  {
    id: 'm8',
    title: 'Scheduled Media Queue',
    badge: 'Active',
    bullets: [
      'Keeps your Google Business Profile active with scheduled photos & videos',
    ],
  },
];

export interface ReviewMetaTemplatePreset {
  name: string;
  displayName: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DRAFT';
  bodyText: string;
  supportsCustomNote?: boolean;
  hasDynamicUrlButton?: boolean;
  buttonText?: string;
}

const FALLBACK_META_TEMPLATES: ReviewMetaTemplatePreset[] = [
  {
    name: 'bgos_review_clean_feedback',
    displayName: 'Clean Feedback (Recommended)',
    language: 'en_US',
    status: 'APPROVED',
    bodyText:
      'Hello {{1}},\n\nPlease share your feedback on your recent experience at {{2}}:\n{{3}}\n\n{{2}} Team',
    supportsCustomNote: false,
    hasDynamicUrlButton: false,
    buttonText: 'Leave Review',
  },
  {
    name: 'bgos_review_invite_en',
    displayName: 'Friendly (EN)',
    language: 'en_US',
    status: 'PENDING',
    bodyText:
      'Hi {{1}}, thank you for choosing {{2}}! Could you take 30 seconds to share your experience on Google? Your review helps local customers find us.',
    supportsCustomNote: false,
    hasDynamicUrlButton: true,
    buttonText: 'Leave Google Review',
  },
  {
    name: 'bgos_review_invite_hi',
    displayName: 'Hindi (हिन्दी)',
    language: 'hi',
    status: 'PENDING',
    bodyText:
      'नमस्ते {{1}}, {{2}} को सेवा का अवसर देने के लिए धन्यवाद! कृपया 30 सेकंड निकालकर Google पर अपना अनुभव शेयर करें। आपका रिव्यू हमारे लिए बहुत महत्वपूर्ण है।',
    supportsCustomNote: false,
    hasDynamicUrlButton: true,
    buttonText: 'Google Review Likhen',
  },
  {
    name: 'bgos_review_invite_note',
    displayName: 'Friendly + Note',
    language: 'en_US',
    status: 'PENDING',
    bodyText:
      'Hi {{1}}, thank you for choosing {{2}}! {{3}} Tap below whenever you have a moment to leave us a quick Google review.',
    supportsCustomNote: true,
    hasDynamicUrlButton: true,
    buttonText: 'Leave Google Review',
  },
  {
    name: 'bgos_review_request',
    displayName: 'Service Feedback',
    language: 'en_US',
    status: 'PENDING',
    bodyText:
      'Hi {{1}}, thank you for choosing {{2}}! How was your service experience with {{3}}? Tap below to share a quick Google review and help us improve.',
    supportsCustomNote: false,
    hasDynamicUrlButton: true,
    buttonText: 'Leave Google Review',
  },
];

function renderLockedMetaPreview(
  tpl: ReviewMetaTemplatePreset,
  businessName: string,
  customNote: string,
): string {
  const safeBiz = businessName.trim() || 'Our Business';
  const noteVal = customNote.trim()
    ? sanitizeReviewPersonalNote(customNote, 120)
    : DEFAULT_REVIEW_PERSONAL_NOTE;
  const thirdVal = tpl.supportsCustomNote ? noteVal : 'your recent visit';
  return tpl.bodyText
    .replace(/\{\{1\}\}/g, 'Priya')
    .replace(/\{\{2\}\}/g, safeBiz)
    .replace(/\{\{3\}\}/g, thirdVal)
    .replace(/\{\{4\}\}/g, safeBiz);
}

interface QueueItem {
  id: string;
  channel: string;
  phone: string;
  customerName: string;
  batchDay?: number;
  metaTemplateName?: string | null;
  metaTemplateStatus?: string | null;
  message: string;
  dueAt: string;
  status: string;
  lastError: string | null;
}

interface CrmCandidate {
  name: string;
  phone: string;
  source: 'booking' | 'crm';
  alreadyQueued: boolean;
}

interface QueueLocale {
  country?: string;
  countryName?: string;
  callingCode?: string;
  timeZone?: string;
  locale?: string;
}

interface QueueApiResponse {
  hasWhatsAppProvider?: boolean;
  waConfigSource?: string;
  smsAvailable?: boolean;
  locale?: QueueLocale;
  businessName?: string;
  reviewLink?: string;
  shortRedirectCode?: string;
  shortReviewUrl?: string;
  hasApprovedReviewTemplate?: boolean;
  activeMetaTemplateStatus?: string;
  metaTemplates?: ReviewMetaTemplatePreset[];
  queue?: {
    pending: number;
    sent: number;
    failed: number;
    items: QueueItem[];
  };
  candidates?: CrmCandidate[];
}

function normalizePhone(raw: string, callingCode = '+91'): string | null {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (raw.trim().startsWith('+')) return `+${digits}`;
  const cleanCode = callingCode.replace(/[^\d]/g, '') || '91';
  if (digits.length === 10) return `+${cleanCode}${digits}`;
  return `+${digits}`;
}

function parseRecipientsText(rawText: string, callingCode = '+91'): Array<{ name?: string; phone: string }> {
  const seen = new Set<string>();
  const out: Array<{ name?: string; phone: string }> = [];
  const lines = rawText.split(/\r?\n|;/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const parts = line
      .split(/[,\t|]/)
      .map((p) => p.replace(/^["']|["']$/g, '').trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const phones = parts.map((p) => normalizePhone(p, callingCode));
      if (phones.every(Boolean)) {
        for (const p of phones) {
          if (p && !seen.has(p)) {
            seen.add(p);
            out.push({ phone: p });
          }
        }
        continue;
      }
      if (phones[1] && !phones[0]) {
        if (!seen.has(phones[1])) {
          seen.add(phones[1]);
          out.push({ name: parts[0], phone: phones[1] });
        }
        continue;
      }
      if (phones[0]) {
        if (!seen.has(phones[0])) {
          seen.add(phones[0]);
          out.push({ name: !phones[1] ? parts[1] : undefined, phone: phones[0] });
        }
        continue;
      }
      continue;
    }

    const single = normalizePhone(line, callingCode);
    if (single && !seen.has(single)) {
      seen.add(single);
      out.push({ phone: single });
    }
  }
  return out;
}

interface UrgentReviewCardProps {
  businessName: string;
  reviewUrl: string;
  thisWeekCount?: number;
  weeklyTarget?: number;
  lastReviewDays?: number | null;
  totalReviews?: number;
  onOpenBulk?: () => void;
  onOpenQr?: () => void;
}

export function UrgentReviewCard({
  businessName,
  reviewUrl,
  thisWeekCount = 0,
  weeklyTarget = 12,
  lastReviewDays = null,
  totalReviews = 0,
  onOpenBulk,
  onOpenQr,
}: UrgentReviewCardProps) {
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [seoModalOpen, setSeoModalOpen] = useState(false);

  // Built-in Bulk Review Scheduler Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSource, setBulkSource] = useState<'paste' | 'csv' | 'crm'>('paste');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [preferredTime, setPreferredTime] = useState('10:00');
  const [pasteText, setPasteText] = useState('');
  const [csvName, setCsvName] = useState<string | null>(null);
  const [csvRecipients, setCsvRecipients] = useState<Array<{ name?: string; phone: string }>>([]);
  const [selectedCrm, setSelectedCrm] = useState<Record<string, boolean>>({});
  const [queueData, setQueueData] = useState<QueueApiResponse | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [schedulingBulk, setSchedulingBulk] = useState(false);
  const [runningQueueAction, setRunningQueueAction] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('bgos_review_clean_feedback');
  const [customNote, setCustomNote] = useState('');
  const [customFreeformMessage, setCustomFreeformMessage] = useState(
    () =>
      `Hello {firstName},\n\nPlease share your feedback on your recent experience at *${businessName}*:\n${reviewUrl}\n\n*${businessName}* Team`,
  );
  const hasEditedFreeformRef = useRef(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasEditedFreeformRef.current) {
      setCustomFreeformMessage(
        `Hello {firstName},\n\nPlease share your feedback on your recent experience at *${businessName}*:\n${reviewUrl}\n\n*${businessName}* Team`,
      );
    }
  }, [businessName, reviewUrl]);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await authFetch('/api/reviews/request');
      if (res.ok) {
        const json = (await res.json()) as QueueApiResponse;
        setQueueData(json);
        if (Array.isArray(json.metaTemplates) && json.metaTemplates.length > 0) {
          const approved = json.metaTemplates.find((t) => t.status === 'APPROVED');
          if (approved) {
            setSelectedTemplateName((prev) => {
              const currentMatch = json.metaTemplates?.find((t) => t.name === prev);
              return currentMatch && currentMatch.status === 'APPROVED' ? prev : approved.name;
            });
          }
        }
      }
    } catch {
      // silent fallback
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const waCloudConnected = Boolean(queueData?.hasWhatsAppProvider);
  const isLockedMetaMode = channel === 'whatsapp' && waCloudConnected;
  const availableTemplates = useMemo<ReviewMetaTemplatePreset[]>(
    () =>
      queueData?.metaTemplates && queueData.metaTemplates.length > 0
        ? queueData.metaTemplates
        : FALLBACK_META_TEMPLATES,
    [queueData?.metaTemplates],
  );
  const selectedTemplate = useMemo<ReviewMetaTemplatePreset>(
    () =>
      availableTemplates.find((t) => t.name === selectedTemplateName) ||
      availableTemplates.find((t) => t.status === 'APPROVED') ||
      availableTemplates[0],
    [availableTemplates, selectedTemplateName],
  );
  const displayShortCtaUrl = useMemo(() => {
    if (queueData?.shortReviewUrl) return queueData.shortReviewUrl;
    if (queueData?.shortRedirectCode) return `https://fieseros.com/r/${queueData.shortRedirectCode}`;
    return reviewUrl;
  }, [queueData?.shortReviewUrl, queueData?.shortRedirectCode, reviewUrl]);

  const activeCallingCode = queueData?.locale?.callingCode || '+91';
  const activeTimeZone = useMemo(() => {
    if (queueData?.locale?.timeZone) return queueData.locale.timeZone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    } catch {
      return 'Asia/Kolkata';
    }
  }, [queueData?.locale?.timeZone]);

  const parsedPasted = useMemo(
    () => parseRecipientsText(pasteText, activeCallingCode),
    [pasteText, activeCallingCode],
  );
  const selectedCrmRecipients = useMemo(
    () =>
      (queueData?.candidates || [])
        .filter((c) => selectedCrm[c.phone])
        .map((c) => ({ name: c.name, phone: c.phone })),
    [queueData?.candidates, selectedCrm],
  );
  const activeRecipients =
    bulkSource === 'csv'
      ? csvRecipients
      : bulkSource === 'crm'
        ? selectedCrmRecipients
        : parsedPasted;
  const estimatedDays = activeRecipients.length > 0 ? Math.ceil(activeRecipients.length / 5) : 0;

  const isHealthy = thisWeekCount >= 1 || (lastReviewDays !== null && lastReviewDays <= 7);
  const progressPct = Math.min(
    100,
    Math.max(thisWeekCount > 0 ? 8 : 0, Math.round((thisWeekCount / Math.max(1, weeklyTarget)) * 100)),
  );

  const handleSendLink = () => {
    const clean = phone.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 7) {
      toast.error('Please enter a valid mobile number.');
      return;
    }
    setIsSending(true);
    try {
      const message = `Hi! Thank you for choosing ${businessName}. We’d truly appreciate your feedback! Could you take 30 seconds to leave us a quick Google review? Tap here: ${reviewUrl}`;
      const codeDigits = activeCallingCode.replace(/[^\d]/g, '') || '91';
      const waNumber = clean.length === 10 && !phone.trim().startsWith('+') ? `${codeDigits}${clean}` : clean;
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      toast.success('WhatsApp review request opened!');
      setPhone('');
    } catch {
      toast.error('Could not open WhatsApp. Please check your browser popup blocker.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseRecipientsText(text, activeCallingCode);
      if (!parsed.length) {
        toast.error(`No valid phone numbers found in ${file.name}. Use mobile numbers or Name,Phone columns.`);
        return;
      }
      setCsvName(file.name);
      setCsvRecipients(parsed);
      setBulkSource('csv');
      toast.success(`Loaded ${parsed.length} unique numbers from ${file.name}`);
    } catch {
      toast.error('Could not read the selected CSV file.');
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleScheduleBulk = async () => {
    if (!activeRecipients.length) {
      toast.error('Add customer numbers first via Paste, CSV Upload, or CRM Contacts.');
      return;
    }
    setSchedulingBulk(true);
    try {
      const cleanClosing = customNote.trim() ? sanitizeReviewPersonalNote(customNote, 120) : '';
      const res = await authFetch('/api/reviews/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'scheduled',
          waDeliveryMode: isLockedMetaMode ? 'template' : 'direct_queue',
          channel,
          dailyLimit: 5,
          preferredTime,
          timeZone: activeTimeZone,
          country: queueData?.locale?.country,
          source: bulkSource,
          reviewLink: reviewUrl,
          businessName,
          includeDirectLink: true,
          ...(isLockedMetaMode
            ? {
                templateName: selectedTemplate.name,
                templateLanguage: selectedTemplate.language,
                customNote: selectedTemplate.supportsCustomNote && cleanClosing ? cleanClosing : undefined,
              }
            : {
                messageTemplate: customFreeformMessage.trim() || undefined,
              }),
          recipients: activeRecipients,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not schedule bulk review invites');
      }
      toast.success(data.message || 'Scheduled 5/day bulk review invites!');
      if (bulkSource === 'paste') setPasteText('');
      if (bulkSource === 'csv') {
        setCsvName(null);
        setCsvRecipients([]);
      }
      if (bulkSource === 'crm') setSelectedCrm({});
      await loadQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk scheduling failed');
    } finally {
      setSchedulingBulk(false);
    }
  };

  const handleRunQueueAction = async (action: 'dispatch_now' | 'retry_failed') => {
    setRunningQueueAction(true);
    try {
      const res = await authFetch('/api/reviews/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || data.success === false) {
        toast.error(data.error || data.message || 'Could not dispatch queued invites.');
      } else {
        toast.success(data.message || 'Dispatched review invites!');
      }
      await loadQueue();
    } catch {
      toast.error('Network error while dispatching review queue.');
    } finally {
      setRunningQueueAction(false);
    }
  };

  const handleMarkSent = async (id: string) => {
    try {
      const res = await authFetch('/api/reviews/request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'mark_sent' }),
      });
      if (res.ok) await loadQueue();
    } catch {}
  };

  const handleDeleteQueueItem = async (id: string) => {
    try {
      const res = await authFetch(`/api/reviews/request?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) await loadQueue();
    } catch {}
  };

  const pendingItems = (queueData?.queue?.items || []).filter((i) => i.status === 'pending');

  return (
    <>
      <div className="bg-card text-foreground border border-border rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4">
        {/* Top Header: Target Indicator */}
        <div className="space-y-2 border-b border-border/60 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-foreground">This Week&apos;s Reviews</h2>
              <p className="text-[11px] text-muted-foreground">
                {thisWeekCount > 0
                  ? `${thisWeekCount} received in the last 7 days · ${totalReviews} total`
                  : totalReviews > 0
                    ? `0 received in the last 7 days · ${totalReviews} total`
                    : 'No Google reviews synced yet'}
              </p>
            </div>
            <span
              className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                isHealthy
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}
            >
              {thisWeekCount}/{weeklyTarget}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isHealthy ? 'bg-primary' : 'bg-amber-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Status Callout */}
        <div
          className={`flex items-start gap-3 rounded-xl p-3 border ${
            isHealthy
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div
            className={`size-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <TrendingUp className="size-3.5" />
          </div>
          <p className="text-xs leading-relaxed">
            {lastReviewDays === null ? (
              'Invite recent customers below — consistent weekly reviews improve local Google Maps rank.'
            ) : isHealthy ? (
              <>
                Last review received{' '}
                <strong className="font-bold">
                  {lastReviewDays === 0
                    ? 'today'
                    : lastReviewDays === 1
                      ? 'yesterday'
                      : `${lastReviewDays} days ago`}
                </strong>
                . Keep inviting customers toward your {weeklyTarget}/week target.
              </>
            ) : (
              <>
                Last review was{' '}
                <strong className="font-bold underline underline-offset-2">
                  {lastReviewDays} days ago
                </strong>
                . Regular weekly reviews boost local Google search visibility.
              </>
            )}
          </p>
        </div>

        {/* Bulk Review Automation Box */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-foreground">Get Reviews Every Day, Automatically</h3>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              5 / day
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Upload a CSV, paste numbers, or select CRM contacts — BGOS queues and sends 5 review invites/day.
          </p>
          <Button
            type="button"
            onClick={() => (onOpenBulk ? onOpenBulk() : setBulkModalOpen(true))}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 rounded-lg flex items-center justify-center gap-2 shadow-xs"
          >
            <Upload className="size-3.5" />
            Schedule Review Messages in Bulk
          </Button>
        </div>

        {/* Direct Customer Phone Input */}
        <div className="space-y-2">
          <div className="relative">
            <Phone className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="tel"
              placeholder={`Customer Phone Number (${activeCallingCode} or local)`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9 pr-4 h-10 bg-background border-border text-foreground text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSending}
              onClick={handleSendLink}
              className="border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
            >
              <Send className="size-3.5" />
              Send Review Link
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onOpenQr}
              className="border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-1.5"
            >
              <QrCode className="size-3.5" />
              Review QR
            </Button>
          </div>
        </div>

        {/* Footer Link */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px]">
          <span className="text-muted-foreground font-medium">
            Weekly Goal: {thisWeekCount}/{weeklyTarget} reviews
          </span>
          <button
            type="button"
            onClick={() => setSeoModalOpen(true)}
            className="text-primary font-bold hover:underline flex items-center gap-1"
          >
            <span>See AI Agent Actions</span>
            <Sparkles className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Built-In Bulk Review Scheduler Dialog */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] flex flex-col p-0 overflow-hidden bg-card text-foreground border-border">
          <DialogHeader className="p-5 pb-3 border-b border-border text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Calendar className="size-4 text-primary" />
              Schedule Bulk Review Invites (5/Day)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add customers from CSV, paste list, or CRM bookings. BGOS queues 5 messages/day in your local timezone ({activeTimeZone}).
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Guide Banner */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-foreground space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-primary">
                <HelpCircle className="size-3.5" /> How Bulk Scheduling Works
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                1. Paste numbers, upload CSV (<code className="text-[10px]">Name,Phone</code>), or check CRM customers.
                2. Pick your preferred local send time ({activeTimeZone}). 3. Choose SMS for automated dispatch or WhatsApp (Cloud API if connected, or 1-tap Send WA).
              </p>
            </div>

            {/* Channel + Send Time Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold">Delivery Channel &amp; Local Send Time</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="h-7 px-2 rounded-lg border border-border bg-background text-[11px] font-semibold"
                >
                  <option value="10:00">10:00 AM ({activeTimeZone})</option>
                  <option value="14:00">02:00 PM ({activeTimeZone})</option>
                  <option value="18:00">06:00 PM ({activeTimeZone})</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                    channel === 'whatsapp'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  <MessageSquare className="size-3.5" />
                  WhatsApp {queueData?.hasWhatsAppProvider ? '(Auto)' : '(Queue + 1-Tap)'}
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                    channel === 'sms'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-background border-border text-muted-foreground'
                  }`}
                >
                  <Phone className="size-3.5" />
                  SMS {queueData?.smsAvailable ? '(Auto 5/Day)' : '(Requires SMS Gateway)'}
                </button>
              </div>
              {channel === 'whatsapp' && queueData && !queueData.hasWhatsAppProvider && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  WhatsApp Cloud API is not connected — queued invites include 1-tap &ldquo;Send WA&rdquo; buttons so you can send directly.
                </p>
              )}
              {channel === 'sms' && queueData && queueData.smsAvailable === false && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  SMS gateway is not configured in Integrations — switch to WhatsApp for 1-tap manual send or connect Twilio/SMS.
                </p>
              )}
            </div>

            {/* Source Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBulkSource('paste')}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 ${
                  bulkSource === 'paste'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-border text-muted-foreground'
                }`}
              >
                Paste List
              </button>
              <button
                type="button"
                onClick={() => setBulkSource('csv')}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 ${
                  bulkSource === 'csv'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-border text-muted-foreground'
                }`}
              >
                <FileSpreadsheet className="size-3.5" /> CSV Upload
              </button>
              <button
                type="button"
                onClick={() => setBulkSource('crm')}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 ${
                  bulkSource === 'crm'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-border text-muted-foreground'
                }`}
              >
                <Users className="size-3.5" /> CRM ({queueData?.candidates?.length ?? 0})
              </button>
            </div>

            {bulkSource === 'paste' && (
              <div className="space-y-1.5">
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={4}
                  placeholder={'Ramesh Kumar, 9876543210\nPriya Sharma, +919811122233\n9900112233'}
                  className="rounded-xl text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  One customer per line (Name, Phone or plain 10-digit numbers). Duplicates are removed automatically.
                </p>
              </div>
            )}

            {bulkSource === 'csv' && (
              <div className="space-y-2">
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="w-full py-5 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary text-xs font-bold flex flex-col items-center gap-1.5 hover:bg-primary/10"
                >
                  <FileSpreadsheet className="size-5" />
                  <span>
                    {csvName ? `${csvName} (${csvRecipients.length} customers)` : 'Select CSV or TXT File'}
                  </span>
                </button>
              </div>
            )}

            {bulkSource === 'crm' && (
              <div className="space-y-2">
                {queueLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-primary" />
                  </div>
                ) : !(queueData?.candidates?.length) ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">
                    No CRM customer numbers found yet — paste numbers or upload a CSV above.
                  </p>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {queueData.candidates.map((cand) => {
                      const checked = Boolean(selectedCrm[cand.phone]);
                      return (
                        <label
                          key={cand.phone}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs cursor-pointer ${
                            checked ? 'bg-primary/5 border-primary' : 'bg-background border-border'
                          } ${cand.alreadyQueued ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              disabled={cand.alreadyQueued}
                              checked={checked}
                              onChange={() =>
                                setSelectedCrm((prev) => ({ ...prev, [cand.phone]: !prev[cand.phone] }))
                              }
                            />
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{cand.name}</div>
                              <div className="text-[11px] text-muted-foreground">{cand.phone}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {cand.alreadyQueued ? 'Queued' : cand.source}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Channel-Aware Invite Message Preview */}
            {isLockedMetaMode ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Lock className="size-3.5 text-emerald-700" />
                    <span>Meta Cloud API Template Preview</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/5 border border-border text-foreground inline-flex items-center gap-1">
                      <Lock className="size-2.5" /> Locked for Meta Cloud API
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedTemplate.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : selectedTemplate.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {selectedTemplate.status === 'APPROVED'
                        ? 'Approved'
                        : selectedTemplate.status === 'REJECTED'
                          ? 'Rejected'
                          : 'Pending Meta Approval'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {availableTemplates.map((tpl) => {
                    const active = tpl.name === selectedTemplate.name;
                    return (
                      <button
                        key={tpl.name}
                        type="button"
                        onClick={() => setSelectedTemplateName(tpl.name)}
                        className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {tpl.displayName}
                      </button>
                    );
                  })}
                </div>

                {selectedTemplate.status !== 'APPROVED' && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2 text-[11px] text-amber-800">
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                    <span>
                      Wording is locked by Meta template rules. Sync/approve{' '}
                      <code className="font-mono font-bold">{selectedTemplate.name}</code> in Marketing → Meta Templates before live Cloud API delivery, or use 1-Tap &ldquo;Send WA&rdquo; on queued rows.
                    </span>
                  </div>
                )}

                <div className="rounded-xl bg-[#ECE5DD] p-3 border border-border/60">
                  <div className="rounded-lg bg-white p-2.5 shadow-2xs space-y-2">
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {renderLockedMetaPreview(selectedTemplate, businessName, customNote)}
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-[#128C7E]">
                      <ExternalLink className="size-3 shrink-0" />
                      <span className="truncate">
                        {selectedTemplate.buttonText || 'Leave Google Review'} → {displayShortCtaUrl}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedTemplate.supportsCustomNote ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                      <label>Optional 1-Line Closing Note</label>
                      <span className="text-muted-foreground">{customNote.length}/120</span>
                    </div>
                    <Input
                      value={customNote}
                      maxLength={120}
                      onChange={(e) =>
                        setCustomNote(e.target.value.replace(/[\r\n\t]+/g, ' ').slice(0, 120))
                      }
                      placeholder={DEFAULT_REVIEW_PERSONAL_NOTE}
                      className="h-8 text-xs bg-background border-border"
                    />
                    <p className="text-[10.5px] text-muted-foreground">
                      Only this 1-line note can be personalized — URLs and line breaks are stripped automatically for Meta compliance.
                    </p>
                  </div>
                ) : (
                  <p className="text-[10.5px] text-muted-foreground">
                    Meta Cloud API locks template wording so invites deliver 24/7. Choose &ldquo;Friendly + Note&rdquo; above if you want a custom closing line.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">Invite Message Preview</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Editable ({channel === 'sms' ? 'SMS' : '1-Tap WhatsApp'})
                  </span>
                </div>
                <Textarea
                  value={customFreeformMessage}
                  onChange={(e) => {
                    hasEditedFreeformRef.current = true;
                    setCustomFreeformMessage(e.target.value);
                  }}
                  rows={3}
                  className="text-xs bg-background border-border rounded-xl"
                />
                <p className="text-[10.5px] text-muted-foreground">
                  Use <code className="font-mono">{'{firstName}'}</code> to personalize each invite with the customer&apos;s first name.
                </p>
              </div>
            )}

            {activeRecipients.length > 0 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-900 font-medium">
                {activeRecipients.length} customer{activeRecipients.length === 1 ? '' : 's'} ready → scheduled over{' '}
                <strong>{estimatedDays} day{estimatedDays === 1 ? '' : 's'}</strong> (5/day).
              </div>
            )}

            <Button
              type="button"
              disabled={schedulingBulk || activeRecipients.length === 0}
              onClick={handleScheduleBulk}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-1.5"
            >
              {schedulingBulk ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
              Schedule {activeRecipients.length || ''} Review Invites (5/Day)
            </Button>

            {/* Existing Queue Tracker */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs font-bold flex-wrap">
                <span>
                  Scheduled Queue ({pendingItems.length} pending · {queueData?.queue?.sent ?? 0} sent
                  {(queueData?.queue?.failed ?? 0) > 0 ? ` · ${queueData?.queue?.failed} failed` : ''})
                </span>
                <div className="flex items-center gap-1.5">
                  {pendingItems.length > 0 && (waCloudConnected || queueData?.smsAvailable) && (
                    <button
                      type="button"
                      disabled={runningQueueAction}
                      onClick={() => void handleRunQueueAction('dispatch_now')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10.5px] font-bold hover:bg-primary/20 disabled:opacity-50"
                    >
                      <Play className="size-2.5" /> Run Due
                    </button>
                  )}
                  {(queueData?.queue?.failed ?? 0) > 0 && (
                    <button
                      type="button"
                      disabled={runningQueueAction}
                      onClick={() => void handleRunQueueAction('retry_failed')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10.5px] font-bold hover:bg-amber-200 disabled:opacity-50"
                    >
                      <RefreshCw className="size-2.5" /> Retry Failed
                    </button>
                  )}
                </div>
              </div>
              {!(queueData?.queue?.items?.length) ? (
                <p className="text-[11px] text-muted-foreground">No queued review invites yet.</p>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {queueData.queue.items.slice(0, 15).map((item) => {
                    const cleanDigits = item.phone.replace(/[^\d]/g, '');
                    const waUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(item.message)}`;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border bg-muted/20 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate">
                              {item.customerName || item.phone}
                            </span>
                            {item.metaTemplateName && (
                              <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                {item.metaTemplateName}
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-muted-foreground truncate">
                            {item.phone} · {item.channel.toUpperCase()} ·{' '}
                            {new Date(item.dueAt).toLocaleString(queueData?.locale?.locale || 'en', {
                              timeZone: activeTimeZone,
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                            {item.batchDay ? ` · Day ${item.batchDay}` : ''}
                          </div>
                          {item.lastError && (
                            <p className="text-[10px] text-rose-600 truncate mt-0.5">{item.lastError}</p>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.status === 'failed'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.status === 'pending' && item.channel === 'whatsapp' && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => void handleMarkSent(item.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 shrink-0"
                          >
                            Send WA <ExternalLink className="size-2.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteQueueItem(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1"
                          aria-label="Remove queued invite"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Light Mode Profile SEO Updates Modal */}
      <Dialog open={seoModalOpen} onOpenChange={setSeoModalOpen}>
        <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border text-left">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <DialogTitle className="text-base font-bold text-foreground">
                Google Business Profile AI Agent
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Active automations running for <strong className="text-foreground">{businessName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 overflow-y-auto space-y-3">
            {DEFAULT_MILESTONES.map((m) => (
              <div
                key={m.id}
                className="bg-muted/30 border border-border rounded-xl p-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <h4 className="text-xs font-bold text-foreground leading-snug">{m.title}</h4>
                  </div>
                  {m.badge && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                      {m.badge}
                    </span>
                  )}
                </div>

                <ul className="pl-6 space-y-1">
                  {m.bullets.map((b, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground list-disc">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">8 agent workflows active</span>
            <Button
              type="button"
              onClick={() => setSeoModalOpen(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-4 rounded-lg"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
