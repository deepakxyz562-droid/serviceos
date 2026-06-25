'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Save, Copy, CheckCircle2, AlertCircle, Loader2, Users,
  TrendingUp, Search, RefreshCw, KeyRound, Settings2, Mail, Phone,
  UserPlus, Check, Clock, Zap, Download, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GoogleAdsConfig {
  id?: string;
  clientId: string | null;
  clientSecret: string | null;
  developerToken: string | null;
  refreshToken: string | null;
  loginCustomerId: string | null;
  accountName: string | null;
  autoCreateLeads: boolean;
  lastPollAt: string | null;
}

interface GoogleAdsLead {
  id: string;
  leadId: string;
  formId: string | null;
  formName: string | null;
  campaignName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  postalCode: string | null;
  leadStatus: string;
  convertedContactId: string | null;
  receivedAt: string;
  submittedAt: string | null;
}

const SECRET_MASK = '••••••';

// ─── Component ──────────────────────────────────────────────────────────────

interface GoogleAdsDetailProps {
  onBack: () => void;
  connectionStatus: string;
  onConnectionChange: () => void;
}

export function GoogleAdsDetail({ onBack, connectionStatus, onConnectionChange }: GoogleAdsDetailProps) {
  const [config, setConfig] = useState<GoogleAdsConfig | null>(null);
  const [form, setForm] = useState({
    clientId: '', clientSecret: '', developerToken: '', refreshToken: '', loginCustomerId: '', accountName: '', autoCreateLeads: true,
  });
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [polling, setPolling] = useState(false);

  const [leads, setLeads] = useState<GoogleAdsLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadFilter, setLeadFilter] = useState('all');
  const [leadSearch, setLeadSearch] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/integrations/google-ads/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setForm({
          clientId: data.clientId || '',
          clientSecret: data.clientSecret ? SECRET_MASK : '',
          developerToken: data.developerToken ? SECRET_MASK : '',
          refreshToken: data.refreshToken ? SECRET_MASK : '',
          loginCustomerId: data.loginCustomerId || '',
          accountName: data.accountName || '',
          autoCreateLeads: data.autoCreateLeads ?? true,
        });
      }
    } catch {
      toast.error('Failed to load Google Ads config');
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const params = new URLSearchParams();
      if (leadFilter !== 'all') params.set('status', leadFilter);
      if (leadSearch) params.set('q', leadSearch);
      const res = await fetch(`/api/integrations/google-ads/leads?${params}`);
      if (res.ok) setLeads(await res.json());
      else setLeads([]);
    } catch {
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, [leadFilter, leadSearch]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/integrations/google-ads/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Google Ads configuration saved');
        await fetchConfig();
        onConnectionChange();
      } else {
        toast.error('Failed to save configuration');
      }
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handlePoll = async () => {
    setPolling(true);
    try {
      const res = await fetch('/api/integrations/google-ads/poll', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Polling complete — ${data.newLeads} new lead(s)`);
        await fetchConfig();
        await fetchLeads();
      } else {
        toast.error(data.error || 'Polling failed');
      }
    } catch {
      toast.error('Polling failed');
    } finally {
      setPolling(false);
    }
  };

  const handleConvert = async (leadId: string) => {
    setConvertingId(leadId);
    try {
      const res = await fetch(`/api/integrations/google-ads/leads/${leadId}/convert`, { method: 'POST' });
      if (res.ok) {
        toast.success('Lead converted to contact');
        await fetchLeads();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to convert lead');
      }
    } catch {
      toast.error('Failed to convert lead');
    } finally {
      setConvertingId(null);
    }
  };

  const isConfigured = !!(config?.clientId && config?.refreshToken && config?.developerToken);
  const isConnected = connectionStatus === 'connected';

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.leadStatus === 'new').length;
  const convertedLeads = leads.filter(l => l.leadStatus === 'converted').length;
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center justify-center size-11 rounded-lg bg-gradient-to-br from-[#4285F4] to-[#34A853]">
            <Search className="size-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Google Ads
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Lead Forms</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">Capture leads from Google Ads lead-form extensions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePoll} disabled={polling || !isConfigured} className="gap-1.5">
            {polling ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Poll Leads
          </Button>
          <Badge className={isConnected ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>
            {isConnected ? <><CheckCircle2 className="size-3 mr-1" /> Connected</> : <><AlertCircle className="size-3 mr-1" /> Not Configured</>}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="config" className="gap-1.5"><Settings2 className="size-3.5" /> Configuration</TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5"><Users className="size-3.5" /> Leads ({totalLeads})</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><TrendingUp className="size-3.5" /> Analytics</TabsTrigger>
        </TabsList>

        {/* ─── Configuration Tab ─── */}
        <TabsContent value="config" className="space-y-4">
          {/* How it works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Zap className="size-4 text-amber-600" /> How Lead Capture Works</CardTitle>
              <CardDescription>Google Ads does not push webhooks for lead forms — ServiceOS polls the Google Ads API on demand or via cron.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-2 flex-wrap py-2">
                {[
                  { label: 'Lead Form Ad', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { label: 'User Submits', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { label: 'Poll API', color: 'bg-violet-50 text-violet-700 border-violet-200' },
                  { label: 'Lead Captured', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { label: 'Convert to CRM', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className={cn('p-2.5 rounded-lg border text-xs font-medium', step.color)}>{step.label}</div>
                    {i < arr.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
                  </div>
                ))}
              </div>
              {config?.lastPollAt && (
                <p className="text-xs text-center text-muted-foreground mt-2">Last polled: {formatDateTime(config.lastPollAt)}</p>
              )}
            </CardContent>
          </Card>

          {/* Credentials Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><KeyRound className="size-4 text-amber-600" /> API Credentials</CardTitle>
              <CardDescription>OAuth2 + Developer Token from your Google Ads API account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingConfig ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="clientId">OAuth Client ID</Label>
                      <Input id="clientId" placeholder="xxxx.apps.googleusercontent.com" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientSecret">OAuth Client Secret</Label>
                      <Input id="clientSecret" type="password" placeholder="Leave as •••••• to keep existing" value={form.clientSecret} onChange={e => setForm({ ...form, clientSecret: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="developerToken">Developer Token</Label>
                      <Input id="developerToken" type="password" placeholder="Leave as •••••• to keep existing" value={form.developerToken} onChange={e => setForm({ ...form, developerToken: e.target.value })} />
                      <p className="text-xs text-muted-foreground">From Google Ads → Tools → API Center.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refreshToken">Refresh Token</Label>
                      <Input id="refreshToken" type="password" placeholder="Leave as •••••• to keep existing" value={form.refreshToken} onChange={e => setForm({ ...form, refreshToken: e.target.value })} />
                      <p className="text-xs text-muted-foreground">Obtained via OAuth2 flow with the ads scope.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loginCustomerId">Login Customer ID</Label>
                      <Input id="loginCustomerId" placeholder="123-456-7890 (manager account)" value={form.loginCustomerId} onChange={e => setForm({ ...form, loginCustomerId: e.target.value })} />
                      <p className="text-xs text-muted-foreground">Manager (MCC) account ID — required if using a manager account.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input id="accountName" placeholder="e.g., My Ads Account" value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoCreate" className="text-sm">Auto-create leads in CRM</Label>
                      <p className="text-xs text-muted-foreground">Automatically add polled leads to your contacts.</p>
                    </div>
                    <Switch id="autoCreate" checked={form.autoCreateLeads} onCheckedChange={v => setForm({ ...form, autoCreateLeads: v })} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onBack}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                      {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
                      Save Configuration
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Setup guide */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900">
            <p className="font-medium flex items-center gap-1.5 mb-2"><AlertCircle className="size-3.5" /> Setup Guide</p>
            <ol className="list-decimal list-inside space-y-1 ml-1 text-amber-800 dark:text-amber-300">
              <li>Apply for Google Ads API access at developers.google.com/google-ads/api/docs/first-call/overview.</li>
              <li>Create OAuth2 credentials (Web application) in Google Cloud Console with scope <code className="px-1 bg-amber-100 dark:bg-amber-900 rounded">https://www.googleapis.com/auth/adwords</code>.</li>
              <li>Complete the OAuth2 flow to obtain a refresh token.</li>
              <li>Copy your Developer Token from Google Ads → Tools → API Center.</li>
              <li>Fill in the credentials above and save, then click <strong>Poll Leads</strong> to fetch submissions.</li>
            </ol>
          </div>
        </TabsContent>

        {/* ─── Leads Tab ─── */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-3">
              <div>
                <CardTitle className="text-base">Captured Leads</CardTitle>
                <CardDescription>Leads from Google Ads lead-form extensions.</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search leads..." value={leadSearch} onChange={e => setLeadSearch(e.target.value)} className="pl-8 h-8 w-40 text-xs" />
                </div>
                <Select value={leadFilter} onValueChange={setLeadFilter}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchLeads} disabled={loadingLeads}>
                  <RefreshCw className={cn('size-3.5', loadingLeads && 'animate-spin')} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLeads ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3"><Users className="size-6 text-muted-foreground" /></div>
                  <p className="text-sm font-medium">No leads yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">Configure your Google Ads credentials, then click <strong>Poll Leads</strong> to fetch lead-form submissions from your campaigns.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Contact</TableHead>
                        <TableHead className="text-xs">Form / Campaign</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Received</TableHead>
                        <TableHead className="text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map(lead => (
                        <TableRow key={lead.id}>
                          <TableCell className="text-xs">
                            <div className="font-medium">{lead.contactName || 'Unknown'}</div>
                            {lead.email && <div className="text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="size-3" />{lead.email}</div>}
                            {lead.phone && <div className="text-muted-foreground flex items-center gap-1"><Phone className="size-3" />{lead.phone}</div>}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium truncate max-w-[160px]">{lead.formName || lead.formId || '—'}</div>
                            {lead.campaignName && <div className="text-muted-foreground truncate max-w-[160px]">{lead.campaignName}</div>}
                          </TableCell>
                          <TableCell><StatusBadge status={lead.leadStatus} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(lead.receivedAt)}</TableCell>
                          <TableCell className="text-right">
                            {lead.leadStatus === 'converted' ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><Check className="size-3 mr-1" />Converted</Badge>
                            ) : (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleConvert(lead.id)} disabled={convertingId === lead.id}>
                                {convertingId === lead.id ? <Loader2 className="size-3 mr-1 animate-spin" /> : <UserPlus className="size-3 mr-1" />}
                                Convert
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Analytics Tab ─── */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[
              { label: 'Total Leads', value: totalLeads, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'New Leads', value: newLeads, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Converted', value: convertedLeads, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Conv. Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('size-9 rounded-lg flex items-center justify-center', stat.bg)}><Icon className={cn('size-4', stat.color)} /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Polling Status</CardTitle>
              <CardDescription>Google Ads lead forms are fetched via API polling (no webhook).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-sm">Last Poll</span>
                </div>
                <span className="text-sm font-medium">{config?.lastPollAt ? formatDateTime(config.lastPollAt) : 'Never'}</span>
              </div>
              <Button onClick={handlePoll} disabled={polling || !isConfigured} className="w-full bg-amber-600 hover:bg-amber-700">
                {polling ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Download className="size-4 mr-1.5" />}
                Poll for New Leads Now
              </Button>
              {!isConfigured && <p className="text-xs text-center text-muted-foreground">Save your credentials first to enable polling.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700 border-blue-200',
    contacted: 'bg-amber-50 text-amber-700 border-amber-200',
    qualified: 'bg-violet-50 text-violet-700 border-violet-200',
    converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    lost: 'bg-red-50 text-red-700 border-red-200',
  };
  return <Badge variant="outline" className={cn('text-[10px] capitalize', map[status] || 'bg-slate-50 text-slate-600 border-slate-200')}>{status}</Badge>;
}

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}
