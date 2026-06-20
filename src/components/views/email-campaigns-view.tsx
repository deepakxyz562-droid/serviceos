'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Send, Loader2, Users, CheckCircle2, XCircle, Plus,
  ChevronDown, ChevronRight, RefreshCw, Sparkles,
  AlertTriangle, Plug, ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Group { id: string; name: string; memberCount: number; color?: string | null }
interface EmailProvider {
  id: string;
  name: string;
  providerType: string;
  usageType: string;
  isDefaultMarketing: boolean;
  isPlatform: boolean;
  status: string;
}

interface SendResult {
  contactId: string;
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

interface CampaignResponse {
  success: boolean;
  campaignName: string;
  totalAudience: number;
  sent: number;
  failed: number;
  skipped: number;
  results: SendResult[];
  error?: string;
  // Backend returns `message` alongside `error` on a 409 MARKETING_PROVIDER_REQUIRED
  // response (the body is a different shape than the success payload).
  message?: string;
}

interface LogEntry {
  id: string;
  recipient: string;
  recipientName: string | null;
  subject: string | null;
  status: string;
  externalId: string | null;
  createdAt: string;
  metadataJson: string;
}

export function EmailCampaignsView() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [emailProviders, setEmailProviders] = useState<EmailProvider[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Compose form state
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState(
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h1 style="color:#10b981">Hello {{name}} 👋</h1>
  <p>Thank you for being part of <strong>ServiceOS</strong>.</p>
  <p>Company: {{company}}<br>Location: {{city}}, {{country}}</p>
  <p>— The ServiceOS Team</p>
</div>`
  );
  const [groupId, setGroupId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [lastResult, setLastResult] = useState<CampaignResponse | null>(null);
  // Whether the tenant has at least one customer-connected marketing provider.
  // null = not yet loaded; false = show the "connect provider" banner.
  const [marketingConnected, setMarketingConnected] = useState<boolean | null>(null);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [g, p, st] = await Promise.all([
        fetch('/api/groups').then((r) => r.json()),
        fetch('/api/email-providers').then((r) => r.json()),
        fetch('/api/email-providers/status').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setGroups(g.data || []);
      const allProviders = (Array.isArray(p) ? p : (p.data || [])) as EmailProvider[];
      // Eligible: customer-connected (non-platform), marketing-capable, active providers.
      // Platform providers are excluded — bulk campaigns must never use the shared domain.
      const eligible = allProviders.filter(
        (x) =>
          !x.isPlatform &&
          (x.usageType === 'marketing' || x.usageType === 'both') &&
          x.status === 'active'
      );
      setEmailProviders(eligible);
      // Marketing connection status — prefer the authoritative status API,
      // fall back to the filtered provider list.
      if (st?.marketingEmail && typeof st.marketingEmail.connected === 'boolean') {
        setMarketingConnected(st.marketingEmail.connected);
      } else {
        setMarketingConnected(eligible.length > 0);
      }
      // Default: first with isDefaultMarketing=true, else first eligible, else first provider
      if (!providerId) {
        const defaultMkt = eligible.find((x) => x.isDefaultMarketing);
        const chosen = defaultMkt?.id || eligible[0]?.id || allProviders[0]?.id || '';
        if (chosen) setProviderId(chosen);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [providerId]);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/notification-logs?type=email&limit=20');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.data || []);
        if (Array.isArray(list)) setLogs(list);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }, []);

  useEffect(() => {
    load();
    loadLogs();
  }, [load, loadLogs]);

  const handleSend = async () => {
    if (!campaignName.trim() || !subject.trim() || !htmlBody.trim()) {
      toast.error('Campaign name, subject and body are required');
      return;
    }
    if (!groupId) {
      toast.error('Please select a target group');
      return;
    }

    setIsSending(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/email-campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          subject,
          html: htmlBody,
          groupIds: [groupId],
          providerId: providerId || undefined,
        }),
      });
      const data: CampaignResponse = await res.json();

      // Marketing provider gate — backend refuses with 409 MARKETING_PROVIDER_REQUIRED
      if (res.status === 409 || data.error === 'MARKETING_PROVIDER_REQUIRED') {
        setMarketingConnected(false);
        setDialogOpen(false);
        toast.error(data.message || 'Connect a marketing email provider before sending campaigns.', {
          duration: 6000,
        });
        return;
      }

      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to send campaign');
        setLastResult(data);
        return;
      }

      setLastResult(data);
      toast.success(
        `Campaign sent: ${data.sent}/${data.totalAudience} delivered` +
          (data.failed ? `, ${data.failed} failed` : '') +
          (data.skipped ? `, ${data.skipped} skipped` : '')
      );
      setDialogOpen(false);
      // Reset name (keep subject/body for easy re-use)
      setCampaignName('');
      loadLogs();
    } catch (err) {
      console.error(err);
      toast.error('Network error sending campaign');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Mail className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Email Campaigns</h2>
            <p className="text-sm text-muted-foreground">
              Send personalized email campaigns via your configured email providers
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { load(); loadLogs(); }}>
            <RefreshCw className="size-4 mr-1.5" /> Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowLogs((v) => !v)}
          >
            {showLogs ? <ChevronDown className="size-4 mr-1.5" /> : <ChevronRight className="size-4 mr-1.5" />}
            View Logs ({logs.length})
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-1.5" /> New Email Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Email Campaign</DialogTitle>
                <DialogDescription>
                  Send a personalized email to all contacts in a group. Variables: <code>{'{{name}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{company}}'}</code>, <code>{'{{city}}'}</code>, <code>{'{{country}}'}</code>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="e.g. Welcome Campaign June 2026"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Target Group</Label>
                    <Select value={groupId} onValueChange={setGroupId}>
                      <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name} ({g.memberCount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Provider</Label>
                    <Select value={providerId} onValueChange={setProviderId}>
                      <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                      <SelectContent>
                        {emailProviders.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} <span className="text-muted-foreground">({p.providerType.toUpperCase()})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subject (supports {'{{name}}'})</Label>
                  <Input
                    placeholder="Welcome to ServiceOS, {{name}}!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Body (HTML, supports variables)</Label>
                  <Textarea
                    rows={10}
                    className="font-mono text-xs"
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSending}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={isSending || !campaignName || !subject || !groupId}>
                  {isSending ? (
                    <><Loader2 className="size-4 mr-1.5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="size-4 mr-1.5" /> Send Campaign</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Marketing provider gate — campaigns require a customer-connected provider */}
      {marketingConnected === false && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex items-center justify-center size-10 rounded-lg bg-amber-500 shrink-0">
                  <AlertTriangle className="size-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    Marketing Email Provider Required
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-0.5">
                    Connect SMTP, Resend, SendGrid, Amazon SES, Mailgun or Brevo before sending
                    campaigns. Bulk email is sent through your own domain to protect platform
                    deliverability.
                  </p>
                </div>
              </div>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                onClick={() => setActiveView('communicationProviders')}
              >
                <Plug className="size-4 mr-1.5" /> Connect Provider
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Available Groups</span>
            <Users className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-1">{groups.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Email Providers</span>
            <Mail className="size-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold mt-1">{emailProviders.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Emails Sent (log)</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold mt-1">
            {logs.filter((l) => l.status === 'sent').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Failed</span>
            <XCircle className="size-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold mt-1">
            {logs.filter((l) => l.status === 'failed').length}
          </div>
        </Card>
      </div>

      {/* Last send result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-600" />
              Last Campaign Result — {lastResult.campaignName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-xs text-muted-foreground">Audience</div>
                <div className="text-lg font-semibold">{lastResult.totalAudience}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Sent</div>
                <div className="text-lg font-semibold text-emerald-600">{lastResult.sent}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Failed</div>
                <div className="text-lg font-semibold text-rose-600">{lastResult.failed}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Skipped</div>
                <div className="text-lg font-semibold text-amber-600">{lastResult.skipped}</div>
              </div>
            </div>
            <Separator className="mb-3" />
            <div className="rounded-md border max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message ID / Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lastResult.results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.email}</TableCell>
                      <TableCell>
                        {r.success ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="size-3 mr-1" /> Sent
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700">
                            <XCircle className="size-3 mr-1" /> Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.success ? (r.simulated ? 'SIMULATED' : r.messageId) : r.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      {showLogs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Email Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No email logs yet. Send a campaign to see logs here.
              </div>
            ) : (
              <ScrollArea className="max-h-96 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => {
                      const meta = (() => { try { return JSON.parse(l.metadataJson || '{}') } catch { return {} } })()
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-mono text-xs">
                            {l.recipient}
                            {l.recipientName ? <div className="text-muted-foreground">{l.recipientName}</div> : null}
                          </TableCell>
                          <TableCell className="text-xs">{l.subject?.slice(0, 60) || '—'}{meta.simulated ? ' (sim)' : ''}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                l.status === 'sent' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                l.status === 'failed' && 'bg-rose-100 text-rose-700 border-rose-200'
                              )}
                            >
                              {l.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(l.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
