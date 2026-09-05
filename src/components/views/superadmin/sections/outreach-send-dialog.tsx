'use client';

// ─────────────────────────────────────────────────────────────────────────────
// OutreachSendDialog — shared "Send Outreach Email" dialog.
//
// Used by:
//   - TenantsTab "View Tenant" dialog footer (Task 5-b quick action).
//   - OutreachSection → History tab "Send Email" button (Task 5-a).
//
// Loads pre-flight stats (`GET /stats?tenantId=X`) on open and templates
// (`GET /api/email-templates?category=outreach`) on mount. Templates whose
// `tagsJson` contains the `claim` sub-category are filtered out when the
// tenant is already claimed (cannot re-send "Claim Your Business" to a
// claimed tenant).
//
// On submit → `POST /send`. On 200 → toast success + `onSent()` callback +
// close. On 400 → toast the pre-flight failure reason + refresh stats. On
// 502 → toast the provider error + refresh stats.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Mail, Send, Loader2, CheckCircle2, XCircle, Eye, ChevronDown,
  AlertTriangle, ShieldAlert,
} from 'lucide-react';
import { authFetch } from '@/lib/client-auth';
import { wrapInMasterOutreachLayout } from '@/lib/email-templates/outreach-templates';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface OutreachSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  tenantClaimed: boolean;
  /** Called after a successful send — caller can refetch history/stats. */
  onSent?: () => void;
}

// ─── API response shapes ─────────────────────────────────────────────────────

interface OutreachStats {
  dailyLimit: number;
  sentToday: number;
  remaining: number;
  lastSentAt: string | null;
  cooldownUntil: string | null;
  isSuppressed: boolean;
  suppressionReason: string | null;
  outreachDisabled: boolean;
}

interface StatsResponse {
  stats: OutreachStats;
  tenant: {
    id: string;
    name: string;
    email: string | null;
    claimed: boolean;
    industry: string | null;
    city: string | null;
  };
}

interface EmailTemplateRow {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  category: string;
  tagsJson: string;
}

interface SendResponseOk {
  ok: true;
  communication: {
    id: string;
    status: 'sent';
    providerMessageId: string | null;
    sentAt: string;
  };
  stats: OutreachStats;
}

interface SendResponseFail {
  ok: false;
  error?: string;
  code?: string;
  stats?: OutreachStats;
  communication?: { id: string; status: string; providerMessageId: null; sentAt: null };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ADHOC_VALUE = '__adhoc__';

// Extract the sub-category ('claim' | 'outreach') from tagsJson.
function extractSubCategory(tagsJson: string | null | undefined): 'claim' | 'outreach' {
  if (!tagsJson) return 'outreach';
  try {
    const arr = JSON.parse(tagsJson);
    if (Array.isArray(arr)) {
      for (const tag of arr) {
        if (typeof tag === 'string') {
          if (tag === 'claim') return 'claim';
          if (tag === 'outreach') return 'outreach';
        }
      }
    }
  } catch {
    // ignore
  }
  return 'outreach';
}

// Naive variable substitution for the Preview panel. The backend does the
// real substitution on send via `renderTemplate`; this is just a UI preview.
function previewRender(
  text: string,
  ctx: { businessName: string; recipientEmail: string; customLine: string },
): string {
  return text
    .replace(/\{\{businessName\}\}/g, ctx.businessName)
    .replace(/\{\{marketplaceUrl\}\}/g, `${typeof window !== 'undefined' ? window.location.origin : ''}/marketplace`)
    .replace(/\{\{claimLink\}\}/g, '[claim link generated on send]')
    .replace(/\{\{customLine\}\}/g, ctx.customLine)
    .replace(/\{\{recipientEmail\}\}/g, ctx.recipientEmail);
}

// Strip basic HTML tags for the preview textarea (so the superadmin sees
// readable text, not raw markup). NOT a security boundary — the actual
// HTML is sent to the recipient.
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OutreachSendDialog({
  open,
  onOpenChange,
  tenantId,
  tenantName,
  tenantEmail,
  tenantClaimed,
  onSent,
}: OutreachSendDialogProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(ADHOC_VALUE);
  const [recipientEmail, setRecipientEmail] = useState<string>(tenantEmail || '');
  const [subject, setSubject] = useState<string>('');
  const [htmlBody, setHtmlBody] = useState<string>('');
  const [customLine, setCustomLine] = useState<string>('');
  const [customOpen, setCustomOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [sending, setSending] = useState(false);

  // ── Effects ────────────────────────────────────────────────────────────

  // Load pre-flight stats whenever the dialog opens for a tenant.
  useEffect(() => {
    if (!open || !tenantId) return;
    let cancelled = false;
    setLoadingStats(true);
    setStats(null);
    authFetch(`/api/superadmin/outreach/stats?tenantId=${encodeURIComponent(tenantId)}&XTransformPort=3000`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: StatsResponse) => {
        if (cancelled) return;
        setStats(data.stats);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load outreach stats');
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tenantId]);

  // Load templates (once per open, since template list is small + stable).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingTemplates(true);
    // The `/api/email-templates` route's category allow-list doesn't include
    // 'outreach', so we fetch all global templates and filter client-side
    // by `category === 'outreach'`.
    authFetch(`/api/email-templates?XTransformPort=3000`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((rows: EmailTemplateRow[]) => {
        if (cancelled) return;
        const outreach = (rows || []).filter((t) => t.category === 'outreach');
        setTemplates(outreach);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Failed to load email templates');
      })
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset form fields when dialog opens.
  useEffect(() => {
    if (!open) return;
    setRecipientEmail(tenantEmail || '');
    setSelectedTemplateId(ADHOC_VALUE);
    setSubject('');
    setHtmlBody('');
    setCustomLine('');
    setCustomOpen(false);
    setPreviewOpen(false);
  }, [open, tenantEmail]);

  // When a template is selected, auto-fill subject + body.
  useEffect(() => {
    if (selectedTemplateId === ADHOC_VALUE) return;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    setSubject(tpl.subject);
    setHtmlBody(tpl.htmlBody);
  }, [selectedTemplateId, templates]);

  // ── Derived pre-flight checks ──────────────────────────────────────────

  const visibleTemplates = templates.filter((t) => {
    // Hide "claim" sub-category templates when the tenant is already claimed.
    if (tenantClaimed && extractSubCategory(t.tagsJson) === 'claim') return false;
    return true;
  });

  const dailyLimitReached = stats ? stats.sentToday >= stats.dailyLimit : false;
  const cooldownActive = stats ? !!stats.cooldownUntil && new Date(stats.cooldownUntil).getTime() > Date.now() : false;
  const suppressed = stats?.isSuppressed ?? false;
  const optedOut = stats?.outreachDisabled ?? false;
  const noEmailOnFile = !tenantEmail;

  const preflightBlocks = optedOut || (stats ? dailyLimitReached || cooldownActive || suppressed : false);
  const formIncomplete = !recipientEmail.trim() || !recipientEmail.includes('@')
    || !subject.trim() || !htmlBody.trim();
  const canSend = !loadingStats && !preflightBlocks && !formIncomplete && !sending;

  // ── Handlers ───────────────────────────────────────────────────────────

  const refreshStats = async () => {
    try {
      const r = await authFetch(`/api/superadmin/outreach/stats?tenantId=${encodeURIComponent(tenantId)}&XTransformPort=3000`);
      if (!r.ok) return;
      const data: StatsResponse = await r.json();
      setStats(data.stats);
    } catch {
      // ignore — non-fatal
    }
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const payload: {
        tenantId: string;
        templateId: string | null;
        recipientEmail: string;
        subject: string | null;
        htmlBody: string | null;
        customVariables?: Record<string, string>;
      } = {
        tenantId,
        templateId: selectedTemplateId === ADHOC_VALUE ? null : selectedTemplateId,
        recipientEmail: recipientEmail.trim(),
        subject: selectedTemplateId === ADHOC_VALUE ? subject.trim() : null,
        htmlBody: selectedTemplateId === ADHOC_VALUE ? htmlBody : null,
      };
      if (customLine.trim()) {
        payload.customVariables = { customLine: customLine.trim() };
      }

      const res = await authFetch('/api/superadmin/outreach/send?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: SendResponseOk | SendResponseFail = await res.json().catch(() => ({ ok: false }) as SendResponseFail);

      if (res.ok && data.ok === true) {
        toast.success('Outreach email sent', {
          description: `Provider message ID: ${data.communication.providerMessageId ?? 'simulated'}`,
        });
        onSent?.();
        onOpenChange(false);
        return;
      }

      // 400 — pre-flight failure (daily limit / cooldown / suppression / opt-out)
      if (res.status === 400) {
        toast.error('Pre-flight check failed', {
          description: (data as SendResponseFail).error || 'Cannot send at this time.',
        });
        // Refresh stats so the UI reflects why.
        if ((data as SendResponseFail).stats) {
          setStats((data as SendResponseFail).stats as OutreachStats);
        } else {
          await refreshStats();
        }
        return;
      }

      // 502 — provider rejected the send
      if (res.status === 502) {
        toast.error('Email provider rejected the send', {
          description: (data as SendResponseFail).error || 'Provider error.',
        });
        await refreshStats();
        return;
      }

      toast.error((data as SendResponseFail).error || 'Failed to send outreach email');
    } catch {
      toast.error('Network error — could not reach the server');
    } finally {
      setSending(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const renderedPreviewHtml = wrapInMasterOutreachLayout(
    previewRender(
      htmlBody,
      { businessName: tenantName, recipientEmail: recipientEmail || tenantEmail || '', customLine: customLine.trim() },
    ),
    {
      businessName: tenantName,
      customLine: customLine.trim(),
      categoryBadge: tenantClaimed ? 'MARKETPLACE' : 'CLAIM PROFILE',
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-5 text-primary" />
            Send Outreach Email
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{tenantName}</span>
            {tenantClaimed ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                Claimed
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                Unclaimed
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* ── Pre-flight checks panel ──────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pre-flight checks</p>
          {loadingStats ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="size-4 animate-spin" /> Checking send eligibility…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PreflightRow
                ok={!dailyLimitReached}
                okLabel={stats ? `${stats.sentToday}/${stats.dailyLimit} used today` : 'Daily limit OK'}
                badLabel={stats ? `Limit reached (${stats.sentToday}/${stats.dailyLimit})` : 'Limit reached'}
                icon={<CheckCircle2 className="size-4" />}
              />
              <PreflightRow
                ok={!cooldownActive}
                okLabel={stats?.lastSentAt ? `Last sent ${new Date(stats.lastSentAt).toLocaleDateString()}` : 'No prior sends'}
                badLabel={stats?.cooldownUntil ? `Cooldown until ${new Date(stats.cooldownUntil).toLocaleString()}` : 'Cooldown active'}
                icon={<CheckCircle2 className="size-4" />}
              />
              <PreflightRow
                ok={!suppressed}
                okLabel="Not suppressed"
                badLabel={stats?.suppressionReason ? `Suppressed (${stats.suppressionReason})` : 'Suppressed'}
                icon={<ShieldAlert className="size-4" />}
              />
              <PreflightRow
                ok={!optedOut}
                okLabel="Outreach enabled"
                badLabel="Business opted out"
                icon={<CheckCircle2 className="size-4" />}
              />
            </div>
          )}
          {noEmailOnFile && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                No email address on file for this tenant. Enter a recipient email below before sending.
              </span>
            </div>
          )}
        </div>

        {/* ── Recipient email ──────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="outreach-recipient">Recipient email</Label>
          <Input
            id="outreach-recipient"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="recipient@example.com"
            disabled={sending}
          />
        </div>

        {/* ── Template selector ────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="outreach-template">Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={(v) => setSelectedTemplateId(v)}
            disabled={loadingTemplates || sending}
          >
            <SelectTrigger id="outreach-template">
              <SelectValue placeholder={loadingTemplates ? 'Loading templates…' : 'Select a template'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ADHOC_VALUE}>Ad-hoc (no template)</SelectItem>
              {visibleTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tenantClaimed && (
            <p className="text-[11px] text-muted-foreground">
              "Claim Your Business" templates are hidden — this tenant is already claimed.
            </p>
          )}
        </div>

        {/* ── Subject ──────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="outreach-subject">Subject</Label>
          <Input
            id="outreach-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
            disabled={sending}
          />
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="outreach-body">Body (HTML)</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPreviewOpen((v) => !v)}
              disabled={!htmlBody.trim()}
            >
              <Eye className="size-3.5 mr-1" /> {previewOpen ? 'Hide preview' : 'Preview'}
            </Button>
          </div>
          <Textarea
            id="outreach-body"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            placeholder="<p>Hello {{businessName}}, …</p>"
            className="min-h-[200px] font-mono text-xs"
            disabled={sending}
          />
          <p className="text-[11px] text-muted-foreground">
            Supports <code className="font-mono">{`{{businessName}}`}</code>, <code className="font-mono">{`{{marketplaceUrl}}`}</code>, <code className="font-mono">{`{{claimLink}}`}</code> variables. Auto-personalized on send.
          </p>
          {previewOpen && (
            <div className="rounded-xl border border-border bg-slate-100 dark:bg-slate-900/60 p-3 max-h-72 overflow-y-auto flex justify-center">
              <div
                className="w-full max-w-[560px] shadow-sm rounded-xl overflow-hidden bg-white text-slate-800 text-xs"
                dangerouslySetInnerHTML={{
                  __html: renderedPreviewHtml || '<div style="padding: 16px; text-align: center; color: #64748b;">(empty body)</div>',
                }}
              />
            </div>
          )}
        </div>

        {/* ── Custom variables ─────────────────────────────────────────── */}
        <Collapsible open={customOpen} onOpenChange={setCustomOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary">
            <ChevronDown className={cn('size-4 transition-transform', customOpen ? '' : '-rotate-90')} />
            Custom opening line (optional)
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1.5">
            <Textarea
              value={customLine}
              onChange={(e) => setCustomLine(e.target.value)}
              placeholder="e.g. Saw your recent 5-star review — congrats!"
              rows={2}
              disabled={sending}
            />
            <p className="text-[11px] text-muted-foreground">
              Injected as <code className="font-mono">{`{{customLine}}`}</code> in the template body.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {sending ? (
              <><Loader2 className="size-4 mr-1.5 animate-spin" /> Sending…</>
            ) : (
              <><Mail className="size-4 mr-1.5" /> Send Email</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PreflightRow({
  ok, okLabel, badLabel, icon,
}: {
  ok: boolean;
  okLabel: string;
  badLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border p-2 text-xs',
        ok
          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
          : 'border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400',
      )}
    >
      {ok ? (
        <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="size-4 shrink-0 mt-0.5" />
      )}
      <span className="flex-1">{ok ? okLabel : badLabel}</span>
      {ok && <span className="sr-only">{icon}</span>}
    </div>
  );
}
