'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Megaphone, Plus, Search, Play, Pause, Copy, Eye, Calendar,
  Users, Send, BarChart3, Clock, CheckCircle2, XCircle,
  MessageSquare, TrendingUp, Loader2, Trash2, Pencil,
  Mail, AlertTriangle, Plug, ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';

// ─── Types ──────────────────────────────────────────────────────────────────

type CampaignType = 'promotional' | 'transactional' | 'reminder' | 'seasonal' | 're_engagement' | 'follow_up';
type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
type CampaignChannel = 'whatsapp' | 'email' | 'sms' | 'multi';

interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  channel: CampaignChannel;
  audienceType: string;
  audienceId?: string;
  audienceFiltersJson?: string;
  messageContent: string;
  scheduledAt: string | null;
  timezone: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  clickedCount: number;
  repliedCount: number;
  convertedCount: number;
  failedCount: number;
  createdAt: string;
  ctaText?: string;
  ctaUrl?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: 'promotional', label: 'Promotional' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 're_engagement', label: 'Re-engagement' },
  { value: 'follow_up', label: 'Follow-up' },
];

const CAMPAIGN_CHANNELS: { value: CampaignChannel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'multi', label: 'Multi-channel' },
];

const AUDIENCE_TYPES = [
  'all', 'leads', 'customers', 'vip', 'inactive_30', 'recent',
  'unpaid', 'upcoming_bookings', 'custom',
];

const AUDIENCE_LABELS: Record<string, string> = {
  all: 'All Contacts',
  leads: 'All Leads',
  customers: 'All Customers',
  vip: 'VIP Customers',
  inactive_30: 'Inactive 30 Days',
  recent: 'Recent Customers',
  unpaid: 'Unpaid Invoices',
  upcoming_bookings: 'Upcoming Bookings',
  custom: 'Custom Segment',
  segment: 'Specific Group',
  contact_list: 'Specific Group',
  mixed: 'Group + Manual Emails',
};

// ─── Audience Mode helpers ────────────────────────────────────────────────
// The form exposes 4 conceptual audience modes that map to the backend
// Campaign fields `audienceType` (all|segment|contact_list|custom),
// `audienceId` (group id), and `audienceFiltersJson` (JSON string carrying
// `{ manualEmails: "a@b.com,c@d.com" }` when manual recipients are present).

type AudienceMode = 'all' | 'segment' | 'custom' | 'mixed';

const AUDIENCE_MODES: { value: AudienceMode; label: string }[] = [
  { value: 'all', label: 'All Contacts' },
  { value: 'segment', label: 'Specific Group' },
  { value: 'custom', label: 'Manual Emails' },
  { value: 'mixed', label: 'Group + Manual Emails' },
];

interface GroupOption {
  id: string;
  name: string;
  type: string;
  memberCount: number;
}

function parseManualEmails(filtersJson: string | null | undefined): string {
  if (!filtersJson) return '';
  try {
    const parsed = JSON.parse(filtersJson) as Record<string, unknown>;
    const val = parsed?.manualEmails;
    return typeof val === 'string' ? val : '';
  } catch {
    return '';
  }
}

function deriveAudienceMode(
  audienceType: string,
  audienceId: string | null | undefined,
  filtersJson: string | null | undefined,
): { mode: AudienceMode; groupId: string; manualEmails: string } {
  const manualEmails = parseManualEmails(filtersJson);
  const hasGroup = !!audienceId;
  const hasManual = !!manualEmails.trim();

  if (audienceType === 'segment' || audienceType === 'contact_list') {
    if (hasManual) return { mode: 'mixed', groupId: audienceId || '', manualEmails };
    if (hasGroup) return { mode: 'segment', groupId: audienceId || '', manualEmails: '' };
  }
  if (audienceType === 'custom') {
    if (hasGroup && hasManual) return { mode: 'mixed', groupId: audienceId || '', manualEmails };
    if (hasManual) return { mode: 'custom', groupId: '', manualEmails };
  }
  if (audienceType === 'all' && !hasGroup && !hasManual) {
    return { mode: 'all', groupId: '', manualEmails: '' };
  }
  // Legacy audience types (leads, customers, vip, etc.)
  if (hasManual) return { mode: 'custom', groupId: '', manualEmails };
  return { mode: 'all', groupId: '', manualEmails: '' };
}

function buildAudiencePayload(
  mode: AudienceMode,
  groupId: string,
  manualEmails: string,
): { audienceType: string; audienceId?: string; audienceFiltersJson?: string } {
  const cleanEmails = manualEmails
    .split(/[\s,\n]+/)
    .map(e => e.trim())
    .filter(Boolean)
    .join(', ');
  switch (mode) {
    case 'all':
      return { audienceType: 'all' };
    case 'segment':
      return {
        audienceType: 'segment',
        audienceId: groupId || undefined,
        audienceFiltersJson: '{}',
      };
    case 'custom':
      return {
        audienceType: 'custom',
        audienceFiltersJson: JSON.stringify({ manualEmails: cleanEmails }),
      };
    case 'mixed':
      // Backend has no 'mixed' type — keep audienceId for the group and stash
      // the manual emails in audienceFiltersJson, using 'custom' as the type.
      return {
        audienceType: 'custom',
        audienceId: groupId || undefined,
        audienceFiltersJson: JSON.stringify({ manualEmails: cleanEmails }),
      };
  }
}

function getAudienceDisplayLabel(campaign: {
  audienceType: string;
  audienceId?: string;
  audienceFiltersJson?: string;
}): string {
  const { mode } = deriveAudienceMode(
    campaign.audienceType,
    campaign.audienceId,
    campaign.audienceFiltersJson,
  );
  return AUDIENCE_MODES.find(a => a.value === mode)?.label || campaign.audienceType;
}

// ─── Email provider helpers (for Send Now flow) ─────────────────────────────
// Mirrors the eligible-provider filter from email-campaigns-view.tsx: a
// marketing-capable provider is one whose usageType is 'marketing' or 'both',
// is active, and is NOT the shared platform provider (bulk email must always
// go through the tenant's own domain).

// ─── Select Template helpers (Create/Edit dialogs) ──────────────────────────
// Templates are loaded from different endpoints based on the campaign
// channel:
//   - whatsapp / sms  → /api/campaign-templates  (generic message templates,
//                          since no whatsapp-templates endpoint exists)
//   - email            → /api/email-templates     (real email templates with
//                          subject + htmlBody)
//   - multi            → both endpoints, merged
// The two endpoints return differently-shaped objects, so we normalize them
// into a single Template[] for the dropdown.

interface Template {
  id: string;
  name: string;
  content: string;           // normalized message body
  subject?: string;          // email templates only
  category?: string;
  source: 'campaign' | 'email';
}

const TEMPLATE_NONE_VALUE = '__none__';

// Extract a stored email subject from audienceFiltersJson (set by the
// Create/Edit dialog when a user picks an email template). Returns '' if no
// subject is stored.
function parseStoredSubject(filtersJson: string | null | undefined): string {
  if (!filtersJson) return '';
  try {
    const parsed = JSON.parse(filtersJson) as Record<string, unknown>;
    const val = parsed?.subject;
    return typeof val === 'string' ? val : '';
  } catch {
    return '';
  }
}

interface EmailProvider {
  id: string;
  name: string;
  providerType: string;
  usageType: string;
  isDefaultMarketing: boolean;
  isPlatform: boolean;
  status: string;
}

/**
 * Determine whether a provider can be used for campaign/broadcast sending.
 *
 * PREVIOUSLY this was very strict: it excluded platform providers AND any
 * provider whose usageType was 'transactional'. That meant a user who
 * connected a single SMTP provider and left it at the default 'both' could
 * still be blocked if the isPlatform flag was set, and a user who chose
 * 'transactional' (or whose provider was seeded as platform) saw the
 * "Marketing Email Provider Required" banner with a DISABLED dropdown —
 * even though they had a working provider in Settings.
 *
 * FIX: Accept ANY active provider. When the user explicitly selects a
 * provider in the Send Now dropdown, the backend's resolveSmtpConfig()
 * uses it directly (it does NOT re-check isPlatform/usageType when a
 * providerId is passed). This lets the user send campaigns through
 * whichever provider they've configured, while still warning them when
 * there are literally zero providers connected.
 */
function isMarketingEligible(p: EmailProvider): boolean {
  return p.status === 'active';
}

// Build the audience body for POST /api/email-campaigns/send from a campaign.
// Returns null when the audience shape can't be mapped (e.g. manual emails),
// in which case the UI shows a notice instead of dispatching.
function buildEmailSendAudience(campaign: Campaign): {
  allContacts?: boolean;
  groupIds?: string[];
  contactIds?: string[];
} | null {
  const { mode, groupId } = deriveAudienceMode(
    campaign.audienceType,
    campaign.audienceId,
    campaign.audienceFiltersJson,
  );
  switch (mode) {
    case 'all':
      return { allContacts: true };
    case 'segment':
      return groupId ? { groupIds: [groupId] } : null;
    case 'mixed':
      // Best effort: send to the group; manual-email recipients are skipped
      // (the email-campaigns API doesn't accept raw emails, only contactIds).
      return groupId ? { groupIds: [groupId] } : null;
    case 'custom':
      // Manual emails only — not supported by Send Now.
      return null;
  }
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    scheduled: 'bg-sky-100 text-sky-700 border-sky-200',
    running: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    paused: 'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}

function getStatusIcon(status: string) {
  const map: Record<string, React.ReactNode> = {
    draft: <Clock className="size-3" />,
    scheduled: <Calendar className="size-3" />,
    running: <Play className="size-3" />,
    paused: <Pause className="size-3" />,
    completed: <CheckCircle2 className="size-3" />,
    cancelled: <XCircle className="size-3" />,
  };
  return map[status] || null;
}

function getChannelColor(channel: string) {
  const map: Record<string, string> = {
    whatsapp: 'bg-emerald-100 text-emerald-700',
    email: 'bg-sky-100 text-sky-700',
    sms: 'bg-purple-100 text-purple-700',
    multi: 'bg-amber-100 text-amber-700',
  };
  return map[channel] || 'bg-slate-100 text-slate-600';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CampaignsView() {
  const setActiveView = useAppStore((s) => s.setActiveView);
  // Cross-view "New Campaign" create signal — when the sidebar's "+ Create"
  // dropdown or a dashboard quick action sets pendingCreate to 'campaign',
  // we open the create dialog and clear the signal so a refresh doesn't
  // re-open it.
  const pendingCreate = useAppStore((s) => s.pendingCreate);
  const setPendingCreate = useAppStore((s) => s.setPendingCreate);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(pendingCreate === 'campaign');

  // Consume the cross-view "New Campaign" signal — opens the dialog, then clears.
  useEffect(() => {
    if (pendingCreate === 'campaign') {
      setShowCreateDialog(true);
      setPendingCreate(null);
    }
  }, [pendingCreate]);

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Send Now (email-channel campaigns) ──
  const [showSendNowDialog, setShowSendNowDialog] = useState(false);
  const [sendNowCampaign, setSendNowCampaign] = useState<Campaign | null>(null);
  const [sendNowForm, setSendNowForm] = useState({
    subject: '',
    html: '',
    providerId: '',
  });
  const [isSendingNow, setIsSendingNow] = useState(false);
  const [emailProviders, setEmailProviders] = useState<EmailProvider[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [marketingConnected, setMarketingConnected] = useState<boolean | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '', type: 'promotional' as CampaignType, channel: 'whatsapp' as CampaignChannel,
    audienceMode: 'all' as AudienceMode, audienceId: '', manualEmails: '',
    messageContent: '', ctaText: '', ctaUrl: '', subject: '',
    scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
  });
  const [editForm, setEditForm] = useState({
    name: '', type: 'promotional' as CampaignType, channel: 'whatsapp' as CampaignChannel,
    audienceMode: 'all' as AudienceMode, audienceId: '', manualEmails: '',
    messageContent: '', ctaText: '', ctaUrl: '', subject: '',
    scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
  });

  // ── Select Template dropdown state (Create/Edit dialogs) ──
  // `templates` is shared between dialogs (only one is open at a time).
  // `createSelectedTemplateId` / `editSelectedTemplateId` track the picker
  // value per dialog so opening one doesn't bleed into the other.
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [createSelectedTemplateId, setCreateSelectedTemplateId] = useState<string>('');
  const [editSelectedTemplateId, setEditSelectedTemplateId] = useState<string>('');

  // ── Load campaigns from API ──
  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '50');
      // Exclude broadcasts from campaigns view
      params.set('type', 'promotional,reminder,seasonal,re_engagement,follow_up');

      const res = await authFetch(`/api/campaigns?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setCampaigns(result.data || []);
      } else {
        setError('Failed to load campaigns');
        toast.error('Failed to load campaigns');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading campaigns');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // ── Load groups for the audience selector ──
  const loadGroups = useCallback(async () => {
    setIsLoadingGroups(true);
    try {
      const res = await authFetch('/api/groups');
      if (res.ok) {
        const result = await res.json();
        setGroups((result.data || []) as GroupOption[]);
      }
    } catch {
      // Non-blocking — the selector just shows an empty list.
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // ── Load email providers for the Send Now flow ──
  // Fetches all providers and filters to active ones. We no longer rely on
  // the /api/email-providers/status "marketingEmail.connected" flag because
  // that flag uses a strict filter (excludes platform + transactional-only
  // providers). Instead, we compute "connected" = "has at least one active
  // provider" so the dropdown is enabled for any configured provider.
  const loadEmailProviders = useCallback(async () => {
    setIsLoadingProviders(true);
    try {
      const [pRes, stRes] = await Promise.all([
        authFetch('/api/email-providers'),
        authFetch('/api/email-providers/status').catch(() => null),
      ]);
      if (pRes.ok) {
        const raw = await pRes.json();
        const all = (Array.isArray(raw) ? raw : (raw?.data || [])) as EmailProvider[];
        const eligible = all.filter(isMarketingEligible);
        setEmailProviders(eligible);
        // Use our relaxed definition: connected = has at least one active
        // provider. Ignore the strict marketingEmail.connected from the
        // status endpoint (which would block platform/transactional providers).
        setMarketingConnected(eligible.length > 0);
        // Optionally pre-select the default marketing provider (or the first
        // provider) so the user doesn't have to manually pick every time.
        if (eligible.length > 0) {
          const defaultMkt = eligible.find(p => p.isDefaultMarketing);
          const first = defaultMkt || eligible[0];
          setSendNowForm(prev => prev.providerId ? prev : { ...prev, providerId: first.id });
        }
      }
      // stRes is fetched but not used for the gate anymore — kept for
      // potential future use (e.g. showing provider health status).
      void stRes;
    } catch {
      // Non-blocking — the Send Now dialog will show the empty state.
    } finally {
      setIsLoadingProviders(false);
    }
  }, []);

  // ── Load templates for the Select Template dropdown ──
  // Fetches from /api/campaign-templates (whatsapp/sms/multi) and/or
  // /api/email-templates (email/multi) and normalizes both into a single
  // Template[] shape. Errors are swallowed — the dropdown just renders empty.
  const loadTemplates = useCallback(async (channel: CampaignChannel): Promise<Template[]> => {
    setIsLoadingTemplates(true);
    try {
      const fetchCampaignTemplates = async (): Promise<Template[]> => {
        const res = await authFetch('/api/campaign-templates?limit=50');
        if (!res.ok) return [];
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data?.data || []);
        return (arr as Record<string, unknown>[]).map((t) => ({
          id: String(t.id ?? ''),
          name: String(t.name ?? 'Untitled'),
          content: String(t.content ?? t.messageContent ?? ''),
          subject: undefined,
          category: typeof t.category === 'string' ? t.category : undefined,
          source: 'campaign' as const,
        }));
      };
      const fetchEmailTemplates = async (): Promise<Template[]> => {
        const res = await authFetch('/api/email-templates');
        if (!res.ok) return [];
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data?.data || []);
        return (arr as Record<string, unknown>[]).map((t) => ({
          id: String(t.id ?? ''),
          name: String(t.name ?? 'Untitled'),
          content: String(t.htmlBody ?? t.body ?? t.textBody ?? ''),
          subject: typeof t.subject === 'string' && t.subject ? t.subject : undefined,
          category: typeof t.category === 'string' ? t.category : undefined,
          source: 'email' as const,
        }));
      };

      if (channel === 'email') return await fetchEmailTemplates();
      if (channel === 'whatsapp' || channel === 'sms') return await fetchCampaignTemplates();
      // multi → merge both lists (WhatsApp + Email)
      const [wa, em] = await Promise.all([
        fetchCampaignTemplates().catch(() => [] as Template[]),
        fetchEmailTemplates().catch(() => [] as Template[]),
      ]);
      return [...wa, ...em];
    } catch {
      return [];
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  // Refresh templates whenever the create dialog's channel changes (or the
  // dialog opens). Clears the picker so a stale selection doesn't bleed in.
  useEffect(() => {
    if (!showCreateDialog) return;
    setCreateSelectedTemplateId('');
    loadTemplates(createForm.channel).then(setTemplates);
  }, [createForm.channel, showCreateDialog, loadTemplates]);

  // Same for the edit dialog.
  useEffect(() => {
    if (!showEditDialog) return;
    setEditSelectedTemplateId('');
    loadTemplates(editForm.channel).then(setTemplates);
  }, [editForm.channel, showEditDialog, loadTemplates]);

  // Open the Send Now dialog pre-populated from the campaign record.
  // Prefer a stored email subject (set by the Create/Edit dialog when an
  // email template was applied); fall back to the campaign name (the
  // BE-FIX-2 default behavior).
  const openSendNowDialog = useCallback((campaign: Campaign) => {
    const storedSubject = parseStoredSubject(campaign.audienceFiltersJson);
    setSendNowCampaign(campaign);
    setSendNowForm({
      subject: storedSubject || campaign.name,
      html: campaign.messageContent || '',
      providerId: '',
    });
    setShowDetailDialog(false);
    setShowSendNowDialog(true);
    // Load providers fresh each time (in case the user just connected one).
    loadEmailProviders().then(() => {
      // After loading, default-select the tenant's default marketing provider
      // (or the first eligible one). The setState below runs in a microtask so
      // the emailProviders state has been committed.
      setEmailProviders(prev => {
        const def = prev.find(p => p.isDefaultMarketing);
        const chosen = def?.id || prev[0]?.id || '';
        if (chosen) {
          setSendNowForm(f => (f.providerId ? f : { ...f, providerId: chosen }));
        }
        return prev;
      });
    });
  }, [loadEmailProviders]);

  // Submit the Send Now form to POST /api/email-campaigns/send.
  const handleSendNow = async () => {
    if (!sendNowCampaign) return;
    if (!sendNowForm.subject.trim() || !sendNowForm.html.trim()) {
      toast.error('Subject and HTML body are required');
      return;
    }
    const audience = buildEmailSendAudience(sendNowCampaign);
    if (!audience) {
      toast.error(
        'Manual-email audiences are not supported by Send Now. Use individual contacts or a group.',
        { duration: 6000 },
      );
      return;
    }

    setIsSendingNow(true);
    try {
      const res = await authFetch('/api/email-campaigns/send', {
        method: 'POST',
        body: JSON.stringify({
          name: sendNowCampaign.name,
          subject: sendNowForm.subject,
          html: sendNowForm.html,
          providerId: sendNowForm.providerId || undefined,
          campaignId: sendNowCampaign.id,
          ...audience,
        }),
      });
      const data = await res.json().catch(() => ({}));

      // Marketing provider gate — backend refuses with 409 MARKETING_PROVIDER_REQUIRED.
      if (res.status === 409 || data?.error === 'MARKETING_PROVIDER_REQUIRED') {
        setMarketingConnected(false);
        setShowSendNowDialog(false);
        toast.error(
          data?.message ||
            'Connect a marketing email provider before sending campaigns.',
          { duration: 6000 },
        );
        return;
      }

      if (!res.ok || !data?.success) {
        toast.error(data?.error || 'Failed to send campaign');
        return;
      }

      // Surface the actual SMTP error when there are failures, so the user
      // can diagnose provider misconfiguration (e.g. "Invalid login",
      // "connect ETIMEDOUT", "Email address is not verified", etc.).
      const results = Array.isArray(data.results) ? data.results : [];
      const firstError = results.find((r: { success?: boolean; error?: string }) => !r.success && r.error);

      if (data.failed && firstError) {
        toast.error(
          `Campaign sent — ${data.sent ?? 0} sent, ${data.failed} failed.\n` +
          `First error: ${firstError.error}`,
          { duration: 10000 },
        );
      } else {
        toast.success(
          `Campaign sent — Sent ${data.sent ?? 0}, Delivered ${data.sent ?? 0}` +
            (data.failed ? `, Failed ${data.failed}` : '') +
            (data.skipped ? `, Skipped ${data.skipped}` : '') +
            (data.totalAudience !== undefined ? ` (of ${data.totalAudience})` : ''),
          { duration: 6000 },
        );
      }
      setShowSendNowDialog(false);
      setSendNowCampaign(null);
      // Refresh so the user sees updated sentCount/status (backend flips to 'completed').
      loadCampaigns();
    } catch {
      toast.error('Network error sending campaign');
    } finally {
      setIsSendingNow(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleStatusChange = async (id: string, newStatus: CampaignStatus) => {
    try {
      const res = await authFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
        toast.success(`Campaign ${newStatus}`);
      }
    } catch {
      toast.error('Failed to update campaign');
    }
  };

  const handleClone = async (campaign: Campaign) => {
    try {
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: `${campaign.name} (Copy)`,
          type: campaign.type,
          channel: campaign.channel,
          audienceType: campaign.audienceType,
          audienceId: campaign.audienceId,
          audienceFiltersJson: campaign.audienceFiltersJson || '{}',
          messageContent: campaign.messageContent,
          status: 'draft',
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setCampaigns(prev => [result.data, ...prev]);
        toast.success('Campaign cloned');
      }
    } catch {
      toast.error('Failed to clone campaign');
    }
  };

  const handleCreate = async () => {
    if (!createForm.name) { toast.error('Campaign name is required'); return; }
    if (!createForm.messageContent) { toast.error('Message content is required'); return; }
    if ((createForm.audienceMode === 'segment' || createForm.audienceMode === 'mixed') && !createForm.audienceId) {
      toast.error('Please select a group for the audience'); return;
    }
    if ((createForm.audienceMode === 'custom' || createForm.audienceMode === 'mixed') && !createForm.manualEmails.trim()) {
      toast.error('Please enter at least one email address'); return;
    }

    const audience = buildAudiencePayload(createForm.audienceMode, createForm.audienceId, createForm.manualEmails);

    // For email-channel campaigns, the Campaign model has no dedicated
    // `subject` column — stash the email subject inside audienceFiltersJson
    // (merged with any manualEmails). The Send Now dialog reads it back via
    // parseStoredSubject().
    let audienceFiltersJson = audience.audienceFiltersJson;
    if (createForm.channel === 'email' && createForm.subject.trim()) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(audienceFiltersJson || '{}') as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      parsed.subject = createForm.subject.trim();
      audienceFiltersJson = JSON.stringify(parsed);
    }

    setIsCreating(true);
    try {
      const res = await authFetch('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name,
          type: createForm.type,
          channel: createForm.channel,
          audienceType: audience.audienceType,
          audienceId: audience.audienceId,
          audienceFiltersJson,
          messageContent: createForm.messageContent,
          ctaText: createForm.ctaText || undefined,
          ctaUrl: createForm.ctaUrl || undefined,
          status: createForm.scheduleDate ? 'scheduled' : 'draft',
          scheduledAt: createForm.scheduleDate ? `${createForm.scheduleDate}T${createForm.scheduleTime || '09:00'}:00` : undefined,
          timezone: createForm.timezone,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setCampaigns(prev => [result.data, ...prev]);
        setShowCreateDialog(false);
        setCreateForm({
          name: '', type: 'promotional', channel: 'whatsapp',
          audienceMode: 'all', audienceId: '', manualEmails: '',
          messageContent: '', ctaText: '', ctaUrl: '', subject: '',
          scheduleDate: '', scheduleTime: '', timezone: 'Asia/Kolkata',
        });
        setCreateSelectedTemplateId('');
        toast.success('Campaign created');
      } else {
        toast.error('Failed to create campaign');
      }
    } catch {
      toast.error('Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Open the edit dialog pre-populated with a campaign's current values ──
  const openEditDialog = (campaign: Campaign) => {
    const derived = deriveAudienceMode(campaign.audienceType, campaign.audienceId, campaign.audienceFiltersJson);
    const scheduled = campaign.scheduledAt ? new Date(campaign.scheduledAt) : null;
    setEditingId(campaign.id);
    setEditForm({
      name: campaign.name,
      type: campaign.type,
      channel: campaign.channel,
      audienceMode: derived.mode,
      audienceId: derived.groupId,
      manualEmails: derived.manualEmails,
      messageContent: campaign.messageContent || '',
      ctaText: campaign.ctaText || '',
      ctaUrl: campaign.ctaUrl || '',
      subject: parseStoredSubject(campaign.audienceFiltersJson),
      scheduleDate: scheduled ? scheduled.toISOString().split('T')[0] : '',
      scheduleTime: scheduled ? scheduled.toTimeString().slice(0, 5) : '',
      timezone: campaign.timezone || 'Asia/Kolkata',
    });
    setEditSelectedTemplateId('');
    setShowDetailDialog(false);
    setShowEditDialog(true);
    if (groups.length === 0) loadGroups();
  };

  // ── Save edits via PUT /api/campaigns/[id] ──
  const handleEdit = async () => {
    if (!editingId) return;
    const id = editingId;
    if (!editForm.name) { toast.error('Campaign name is required'); return; }
    if (!editForm.messageContent) { toast.error('Message content is required'); return; }
    if ((editForm.audienceMode === 'segment' || editForm.audienceMode === 'mixed') && !editForm.audienceId) {
      toast.error('Please select a group for the audience'); return;
    }
    if ((editForm.audienceMode === 'custom' || editForm.audienceMode === 'mixed') && !editForm.manualEmails.trim()) {
      toast.error('Please enter at least one email address'); return;
    }

    const audience = buildAudiencePayload(editForm.audienceMode, editForm.audienceId, editForm.manualEmails);

    // For email-channel campaigns, persist the email subject inside
    // audienceFiltersJson (Campaign has no `subject` column). The Send Now
    // dialog reads it back via parseStoredSubject().
    let audienceFiltersJson = audience.audienceFiltersJson;
    if (editForm.channel === 'email' && editForm.subject.trim()) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(audienceFiltersJson || '{}') as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      parsed.subject = editForm.subject.trim();
      audienceFiltersJson = JSON.stringify(parsed);
    }

    setIsEditing(true);
    try {
      const res = await authFetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          type: editForm.type,
          channel: editForm.channel,
          audienceType: audience.audienceType,
          audienceId: audience.audienceId,
          audienceFiltersJson,
          messageContent: editForm.messageContent,
          ctaText: editForm.ctaText || undefined,
          ctaUrl: editForm.ctaUrl || undefined,
          status: editForm.scheduleDate ? 'scheduled' : 'draft',
          scheduledAt: editForm.scheduleDate ? `${editForm.scheduleDate}T${editForm.scheduleTime || '09:00'}:00` : undefined,
          timezone: editForm.timezone,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setCampaigns(prev => prev.map(c => c.id === id ? result.data : c));
        setShowEditDialog(false);
        setEditingId(null);
        setEditSelectedTemplateId('');
        toast.success('Campaign updated');
      } else {
        toast.error('Failed to update campaign');
      }
    } catch {
      toast.error('Failed to update campaign');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        toast.success('Campaign deleted');
      }
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    totalSent: campaigns.reduce((s, c) => s + c.sentCount, 0),
    avgReadRate: campaigns.filter(c => c.sentCount > 0).length > 0
      ? Math.round(campaigns.filter(c => c.sentCount > 0).reduce((s, c) => s + (c.readCount / c.sentCount * 100), 0) / campaigns.filter(c => c.sentCount > 0).length)
      : 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-44 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="flex items-center gap-2"><Skeleton className="size-4" /><div><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-10 mt-1" /></div></div></Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-10 w-full" /></div></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <Megaphone className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load campaigns</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadCampaigns}>
          <Loader2 className="size-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Megaphone className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Campaigns</h2>
            <p className="text-sm text-muted-foreground">Multi-channel campaign engine</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Campaigns', value: stats.total, icon: Megaphone, color: 'text-foreground' },
          { label: 'Active', value: stats.running, icon: Play, color: 'text-emerald-600' },
          { label: 'Total Sent', value: stats.totalSent.toLocaleString(), icon: Send, color: 'text-sky-600' },
          { label: 'Avg Read Rate', value: `${stats.avgReadRate}%`, icon: Eye, color: 'text-purple-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs">Draft</TabsTrigger>
            <TabsTrigger value="scheduled" className="text-xs">Scheduled</TabsTrigger>
            <TabsTrigger value="running" className="text-xs">Running</TabsTrigger>
            <TabsTrigger value="paused" className="text-xs">Paused</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Megaphone className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No campaigns found</p>
          <p className="text-sm mt-1">Create your first campaign to get started</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Campaign
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {filteredCampaigns.map(campaign => (
            <Card key={campaign.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => { setSelectedCampaign(campaign); setShowDetailDialog(true); }}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm">{campaign.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`${getStatusColor(campaign.status)} text-[10px]`}>
                        {getStatusIcon(campaign.status)}
                        <span className="ml-1">{campaign.status}</span>
                      </Badge>
                      <Badge variant="secondary" className={`${getChannelColor(campaign.channel)} text-[10px]`}>
                        {campaign.channel}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">{campaign.type}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {campaign.channel === 'email' && campaign.status !== 'completed' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-sky-600 hover:text-sky-700" onClick={() => openSendNowDialog(campaign)}><Send className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Send Now (email blast)</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    {campaign.status === 'running' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleStatusChange(campaign.id, 'paused')}><Pause className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Pause</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    {campaign.status === 'paused' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleStatusChange(campaign.id, 'running')}><Play className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Resume</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    {campaign.status === 'draft' && (
                      <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleStatusChange(campaign.id, 'running')}><Play className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Start</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => openEditDialog(campaign)}><Pencil className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleClone(campaign)}><Copy className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Clone</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(campaign.id)}><Trash2 className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></TooltipProvider>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3" />{getAudienceDisplayLabel(campaign)}</span>
                  <span className="flex items-center gap-1"><Calendar className="size-3" />{new Date(campaign.createdAt).toLocaleDateString()}</span>
                </div>
                {campaign.sentCount > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    {[
                      { label: 'Sent', value: campaign.sentCount, icon: Send },
                      { label: 'Read', value: campaign.readCount, icon: Eye },
                      { label: 'Replied', value: campaign.repliedCount, icon: MessageSquare },
                    ].map(stat => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="text-center">
                          <Icon className="size-3 text-muted-foreground mx-auto" />
                          <p className="font-medium text-sm">{stat.value.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>Set up a new multi-channel campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g., Summer Cleaning Promo" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v as CampaignType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={createForm.channel} onValueChange={v => setCreateForm({ ...createForm, channel: v as CampaignChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={createForm.audienceMode} onValueChange={v => setCreateForm({ ...createForm, audienceMode: v as AudienceMode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_MODES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {(createForm.audienceMode === 'segment' || createForm.audienceMode === 'mixed') && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Group</Label>
                  <Select value={createForm.audienceId || undefined} onValueChange={v => setCreateForm({ ...createForm, audienceId: v })}>
                    <SelectTrigger><SelectValue placeholder={isLoadingGroups ? 'Loading groups...' : 'Select a group'} /></SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 ? (
                        <SelectItem value="_none" disabled>No groups available</SelectItem>
                      ) : (
                        groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ({g.memberCount || 0})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(createForm.audienceMode === 'custom' || createForm.audienceMode === 'mixed') && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Manual Emails (comma or newline separated)</Label>
                  <Textarea
                    placeholder="alice@example.com, bob@example.com"
                    value={createForm.manualEmails}
                    onChange={e => setCreateForm({ ...createForm, manualEmails: e.target.value })}
                    rows={3}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {createForm.manualEmails.split(/[\s,\n]+/).map(s => s.trim()).filter(Boolean).length} email(s) entered
                  </p>
                </div>
              )}
            </div>
            {/* Template (optional) — pre-fills the message body (and subject for email) */}
            <div className="space-y-2">
              <Label>Template (optional)</Label>
              <Select
                value={createSelectedTemplateId || TEMPLATE_NONE_VALUE}
                onValueChange={(v) => {
                  if (v === TEMPLATE_NONE_VALUE) {
                    setCreateSelectedTemplateId('');
                    return;
                  }
                  const tpl = templates.find(t => t.id === v);
                  if (!tpl) return;
                  setCreateSelectedTemplateId(v);
                  setCreateForm(prev => ({
                    ...prev,
                    messageContent: tpl.content || prev.messageContent,
                    ...(tpl.subject !== undefined ? { subject: tpl.subject } : {}),
                  }));
                  toast.success(`Template applied: ${tpl.name}`);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingTemplates ? 'Loading templates...' : '— No template —'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TEMPLATE_NONE_VALUE}>— No template —</SelectItem>
                  {templates.length === 0 && !isLoadingTemplates && (
                    <SelectItem value="_empty_create" disabled>No templates available</SelectItem>
                  )}
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.category ? ` [${t.category}]` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Pick a template to pre-fill the message. You can edit after selecting.
              </p>
              {createSelectedTemplateId && (() => {
                const tpl = templates.find(t => t.id === createSelectedTemplateId);
                if (!tpl) return null;
                const preview = tpl.content.slice(0, 200);
                const truncated = tpl.content.length > 200;
                return (
                  <div className="bg-muted/50 rounded p-2 text-xs">
                    <p className="text-[10px] text-muted-foreground mb-1">Applied to message body</p>
                    <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words">{preview}{truncated ? '…' : ''}</div>
                  </div>
                );
              })()}
            </div>
            {/* Email Subject — only for email-channel campaigns */}
            {createForm.channel === 'email' && (
              <div className="space-y-2">
                <Label>Email Subject</Label>
                <Input
                  placeholder="Email subject (supports {{name}})"
                  value={createForm.subject}
                  onChange={e => setCreateForm({ ...createForm, subject: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Message Content *</Label>
              <Textarea placeholder="Type your message... Use {{name}}, {{service}}, {{amount}} as placeholders" value={createForm.messageContent} onChange={e => setCreateForm({ ...createForm, messageContent: e.target.value })} rows={4} />
              <p className="text-[10px] text-muted-foreground">{createForm.messageContent.length} characters</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input placeholder="e.g., Book Now" value={createForm.ctaText} onChange={e => setCreateForm({ ...createForm, ctaText: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CTA URL</Label>
                <Input placeholder="https://..." value={createForm.ctaUrl} onChange={e => setCreateForm({ ...createForm, ctaUrl: e.target.value })} />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Schedule (optional)</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input type="date" value={createForm.scheduleDate} onChange={e => setCreateForm({ ...createForm, scheduleDate: e.target.value })} />
                <Input type="time" value={createForm.scheduleTime} onChange={e => setCreateForm({ ...createForm, scheduleTime: e.target.value })} />
                <Select value={createForm.timezone} onValueChange={v => setCreateForm({ ...createForm, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">IST (India)</SelectItem>
                    <SelectItem value="America/New_York">EST (New York)</SelectItem>
                    <SelectItem value="America/Chicago">CST (Chicago)</SelectItem>
                    <SelectItem value="America/Los_Angeles">PST (LA)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name || !createForm.messageContent || isCreating}>
              {isCreating ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              {createForm.scheduleDate ? 'Schedule Campaign' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`${getStatusColor(selectedCampaign?.status || '')} text-xs`}>
                  {selectedCampaign?.status}
                </Badge>
                <Badge variant="secondary" className={`${getChannelColor(selectedCampaign?.channel || '')} text-xs`}>
                  {selectedCampaign?.channel}
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{selectedCampaign.type}</span></div>
                <div><span className="text-muted-foreground">Audience:</span> <span className="font-medium">{getAudienceDisplayLabel(selectedCampaign)}</span></div>
                <div><span className="text-muted-foreground">Channel:</span> <span className="font-medium">{selectedCampaign.channel}</span></div>
                <div><span className="text-muted-foreground">Timezone:</span> <span className="font-medium">{selectedCampaign.timezone}</span></div>
              </div>

              {selectedCampaign.messageContent && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{selectedCampaign.messageContent}</p>
                  {selectedCampaign.ctaText && (
                    <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
                      {selectedCampaign.ctaText}
                    </Button>
                  )}
                </div>
              )}

              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">Campaign Analytics</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sent', value: selectedCampaign.sentCount, color: 'text-sky-600' },
                    { label: 'Delivered', value: selectedCampaign.deliveredCount, color: 'text-emerald-600' },
                    { label: 'Read', value: selectedCampaign.readCount, color: 'text-purple-600' },
                    { label: 'Clicked', value: selectedCampaign.clickedCount, color: 'text-orange-600' },
                    { label: 'Replied', value: selectedCampaign.repliedCount, color: 'text-amber-600' },
                    { label: 'Converted', value: selectedCampaign.convertedCount, color: 'text-green-600' },
                  ].map(stat => (
                    <Card key={stat.label} className="p-2 text-center">
                      <p className={`text-lg font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </Card>
                  ))}
                </div>
                {selectedCampaign.sentCount > 0 && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Delivery Rate</span><span>{Math.round(selectedCampaign.deliveredCount / selectedCampaign.sentCount * 100)}%</span></div>
                      <Progress value={selectedCampaign.deliveredCount / selectedCampaign.sentCount * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Read Rate</span><span>{Math.round(selectedCampaign.readCount / selectedCampaign.sentCount * 100)}%</span></div>
                      <Progress value={selectedCampaign.readCount / selectedCampaign.sentCount * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span>Conversion Rate</span><span>{Math.round(selectedCampaign.convertedCount / selectedCampaign.sentCount * 100)}%</span></div>
                      <Progress value={selectedCampaign.convertedCount / selectedCampaign.sentCount * 100} className="h-2" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            {selectedCampaign && selectedCampaign.channel === 'email' && selectedCampaign.status !== 'completed' && (
              <Button
                className="bg-sky-600 hover:bg-sky-700"
                onClick={() => selectedCampaign && openSendNowDialog(selectedCampaign)}
              >
                <Send className="size-4 mr-1.5" /> Send Now
              </Button>
            )}
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => selectedCampaign && openEditDialog(selectedCampaign)}>
              <Pencil className="size-4 mr-1.5" /> Edit Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update campaign details and audience</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input placeholder="e.g., Summer Cleaning Promo" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v as CampaignType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={editForm.channel} onValueChange={v => setEditForm({ ...editForm, channel: v as CampaignChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={editForm.audienceMode} onValueChange={v => setEditForm({ ...editForm, audienceMode: v as AudienceMode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_MODES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {(editForm.audienceMode === 'segment' || editForm.audienceMode === 'mixed') && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Group</Label>
                  <Select value={editForm.audienceId || undefined} onValueChange={v => setEditForm({ ...editForm, audienceId: v })}>
                    <SelectTrigger><SelectValue placeholder={isLoadingGroups ? 'Loading groups...' : 'Select a group'} /></SelectTrigger>
                    <SelectContent>
                      {groups.length === 0 ? (
                        <SelectItem value="_none" disabled>No groups available</SelectItem>
                      ) : (
                        groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ({g.memberCount || 0})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(editForm.audienceMode === 'custom' || editForm.audienceMode === 'mixed') && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Manual Emails (comma or newline separated)</Label>
                  <Textarea
                    placeholder="alice@example.com, bob@example.com"
                    value={editForm.manualEmails}
                    onChange={e => setEditForm({ ...editForm, manualEmails: e.target.value })}
                    rows={3}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {editForm.manualEmails.split(/[\s,\n]+/).map(s => s.trim()).filter(Boolean).length} email(s) entered
                  </p>
                </div>
              )}
            </div>
            {/* Template (optional) — pre-fills the message body (and subject for email) */}
            <div className="space-y-2">
              <Label>Template (optional)</Label>
              <Select
                value={editSelectedTemplateId || TEMPLATE_NONE_VALUE}
                onValueChange={(v) => {
                  if (v === TEMPLATE_NONE_VALUE) {
                    setEditSelectedTemplateId('');
                    return;
                  }
                  const tpl = templates.find(t => t.id === v);
                  if (!tpl) return;
                  setEditSelectedTemplateId(v);
                  setEditForm(prev => ({
                    ...prev,
                    messageContent: tpl.content || prev.messageContent,
                    ...(tpl.subject !== undefined ? { subject: tpl.subject } : {}),
                  }));
                  toast.success(`Template applied: ${tpl.name}`);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingTemplates ? 'Loading templates...' : '— No template —'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TEMPLATE_NONE_VALUE}>— No template —</SelectItem>
                  {templates.length === 0 && !isLoadingTemplates && (
                    <SelectItem value="_empty_edit" disabled>No templates available</SelectItem>
                  )}
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.category ? ` [${t.category}]` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Pick a template to pre-fill the message. You can edit after selecting.
              </p>
              {editSelectedTemplateId && (() => {
                const tpl = templates.find(t => t.id === editSelectedTemplateId);
                if (!tpl) return null;
                const preview = tpl.content.slice(0, 200);
                const truncated = tpl.content.length > 200;
                return (
                  <div className="bg-muted/50 rounded p-2 text-xs">
                    <p className="text-[10px] text-muted-foreground mb-1">Applied to message body</p>
                    <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words">{preview}{truncated ? '…' : ''}</div>
                  </div>
                );
              })()}
            </div>
            {/* Email Subject — only for email-channel campaigns */}
            {editForm.channel === 'email' && (
              <div className="space-y-2">
                <Label>Email Subject</Label>
                <Input
                  placeholder="Email subject (supports {{name}})"
                  value={editForm.subject}
                  onChange={e => setEditForm({ ...editForm, subject: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Message Content *</Label>
              <Textarea placeholder="Type your message... Use {{name}}, {{service}}, {{amount}} as placeholders" value={editForm.messageContent} onChange={e => setEditForm({ ...editForm, messageContent: e.target.value })} rows={4} />
              <p className="text-[10px] text-muted-foreground">{editForm.messageContent.length} characters</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA Button Text</Label>
                <Input placeholder="e.g., Book Now" value={editForm.ctaText} onChange={e => setEditForm({ ...editForm, ctaText: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CTA URL</Label>
                <Input placeholder="https://..." value={editForm.ctaUrl} onChange={e => setEditForm({ ...editForm, ctaUrl: e.target.value })} />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Schedule (optional)</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input type="date" value={editForm.scheduleDate} onChange={e => setEditForm({ ...editForm, scheduleDate: e.target.value })} />
                <Input type="time" value={editForm.scheduleTime} onChange={e => setEditForm({ ...editForm, scheduleTime: e.target.value })} />
                <Select value={editForm.timezone} onValueChange={v => setEditForm({ ...editForm, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">IST (India)</SelectItem>
                    <SelectItem value="America/New_York">EST (New York)</SelectItem>
                    <SelectItem value="America/Chicago">CST (Chicago)</SelectItem>
                    <SelectItem value="America/Los_Angeles">PST (LA)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!editForm.name || !editForm.messageContent || isEditing}>
              {isEditing ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Now (Email Blast) Dialog */}
      <Dialog open={showSendNowDialog} onOpenChange={(open) => {
        setShowSendNowDialog(open);
        if (!open) setSendNowCampaign(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Now: {sendNowCampaign?.name}</DialogTitle>
            <DialogDescription>
              Dispatch this campaign as an email blast via your marketing email provider.
              Variables <code>{'{{name}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{company}}'}</code>, <code>{'{{city}}'}</code>, <code>{'{{country}}'}</code> are supported.
            </DialogDescription>
          </DialogHeader>

          {sendNowCampaign && (() => {
            const derived = deriveAudienceMode(
              sendNowCampaign.audienceType,
              sendNowCampaign.audienceId,
              sendNowCampaign.audienceFiltersJson,
            );
            const matchedGroup = groups.find(g => g.id === derived.groupId);
            const groupName = matchedGroup?.name;
            const groupCount = matchedGroup?.memberCount;
            return (
              <div className="space-y-4 py-2">
                {/* Read-only audience summary */}
                <div className="rounded-md border bg-slate-50 dark:bg-slate-900 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Users className="size-3.5" /> Audience (read-only — set on the campaign)
                  </div>
                  {derived.mode === 'all' && (
                    <p className="text-sm font-medium">All Contacts</p>
                  )}
                  {derived.mode === 'segment' && (
                    <p className="text-sm font-medium">
                      Group: {groupName || 'Unknown'}{groupCount !== undefined ? ` (${groupCount} contacts)` : ''}
                    </p>
                  )}
                  {derived.mode === 'mixed' && (
                    <p className="text-sm font-medium">
                      Group: {groupName || 'Unknown'}{groupCount !== undefined ? ` (${groupCount} contacts)` : ''}
                      <span className="text-muted-foreground"> + manual emails (skipped — only the group will receive this blast)</span>
                    </p>
                  )}
                  {derived.mode === 'custom' && (
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Manual-email audience — not supported by Send Now.
                    </p>
                  )}
                </div>

                {derived.mode === 'custom' && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-900 dark:text-amber-100">
                    Manual email audiences are sent via the standalone Email Campaigns feature.
                    For Send Now, please use individual contacts or a group audience.
                  </div>
                )}

                {/* Marketing provider not connected banner — only shows when
                    there are ZERO active providers at all. If the user has
                    connected any provider (even a "transactional" or "platform"
                    one), the dropdown below is enabled and they can pick it. */}
                {marketingConnected === false && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-start gap-2 flex-1">
                        <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            Email Provider Required
                          </p>
                          <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">
                            Connect SMTP, Resend, SendGrid, Amazon SES, Mailgun or Brevo in Settings → Providers before sending campaigns.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                        onClick={() => {
                          setShowSendNowDialog(false);
                          setActiveView('emailProviders');
                        }}
                      >
                        <Plug className="size-4 mr-1.5" /> Configure
                        <ArrowRight className="size-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    placeholder="Email subject (supports {{name}})"
                    value={sendNowForm.subject}
                    onChange={e => setSendNowForm({ ...sendNowForm, subject: e.target.value })}
                  />
                </div>

                {/* HTML body */}
                <div className="space-y-2">
                  <Label>Email Body (HTML, supports variables)</Label>
                  <Textarea
                    rows={10}
                    className="font-mono text-xs"
                    placeholder="<h1>Hello {{name}}</h1>"
                    value={sendNowForm.html}
                    onChange={e => setSendNowForm({ ...sendNowForm, html: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">{sendNowForm.html.length} characters</p>
                </div>

                {/* Email Provider dropdown */}
                <div className="space-y-2">
                  <Label>Email Provider</Label>
                  <Select
                    value={sendNowForm.providerId}
                    onValueChange={v => setSendNowForm({ ...sendNowForm, providerId: v })}
                    disabled={emailProviders.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingProviders
                            ? 'Loading providers...'
                            : emailProviders.length === 0
                              ? 'No providers connected'
                              : 'Select a provider'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {emailProviders.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} <span className="text-muted-foreground">({p.providerType.toUpperCase()})</span>
                          {p.isDefaultMarketing ? ' ★' : ''}
                          {p.isPlatform && <span className="text-muted-foreground ml-1">· platform</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Mail className="size-3" />
                    All active email providers are listed. If none appear, connect one in Settings → Providers.
                  </p>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendNowDialog(false)} disabled={isSendingNow}>
              Cancel
            </Button>
            <Button
              className="bg-sky-600 hover:bg-sky-700"
              onClick={handleSendNow}
              disabled={
                isSendingNow ||
                !sendNowForm.subject.trim() ||
                !sendNowForm.html.trim() ||
                (sendNowCampaign ? buildEmailSendAudience(sendNowCampaign) === null : true)
              }
            >
              {isSendingNow ? (
                <><Loader2 className="size-4 mr-1.5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="size-4 mr-1.5" /> Send Now</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
