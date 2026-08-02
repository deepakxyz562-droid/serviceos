'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Facebook, Instagram, Save, Copy, CheckCircle2, AlertCircle,
  Loader2, Users, TrendingUp, DollarSign, Megaphone, RefreshCw, Search,
  ArrowRight, Webhook, KeyRound, Settings2, ExternalLink, Mail, Phone,
  MapPin, UserPlus, Check, Clock, Filter,
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

interface MetaConfig {
  id?: string;
  appId: string | null;
  appSecret: string | null;
  verifyToken: string | null;
  pageId: string | null;
  pageName: string | null;
  pageAccessToken: string | null;
  subscriptionVerified: boolean;
  autoCreateLeads: boolean;
  webhookUrl?: string;
}

interface MetaLead {
  id: string;
  leadgenId: string;
  formId: string;
  formName: string | null;
  pageId: string;
  platform: string;
  adName: string | null;
  campaignName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  leadStatus: string;
  convertedContactId: string | null;
  receivedAt: string;
}

const SECRET_MASK = '••••••';

// ─── Component ──────────────────────────────────────────────────────────────

interface MetaAdsDetailProps {
  onBack: () => void;
  connectionStatus: string;
  onConnectionChange: () => void;
}

export function MetaAdsDetail({ onBack, connectionStatus, onConnectionChange }: MetaAdsDetailProps) {
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [form, setForm] = useState({
    appId: '', appSecret: '', verifyToken: '', pageId: '', pageName: '', pageAccessToken: '', autoCreateLeads: true,
  });
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const [leads, setLeads] = useState<MetaLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadFilter, setLeadFilter] = useState('all');
  const [leadSearch, setLeadSearch] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/integrations/meta/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setForm({
          appId: data.appId || '',
          appSecret: data.appSecret ? SECRET_MASK : '',
          verifyToken: data.verifyToken || '',
          pageId: data.pageId || '',
          pageName: data.pageName || '',
          pageAccessToken: data.pageAccessToken ? SECRET_MASK : '',
          autoCreateLeads: data.autoCreateLeads ?? true,
        });
      }
    } catch {
      toast.error('Failed to load Meta config');
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
      const res = await fetch(`/api/integrations/meta/leads?${params}`);
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
      const res = await fetch('/api/integrations/meta/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Meta configuration saved');
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

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConvert = async (leadId: string) => {
    setConvertingId(leadId);
    try {
      const res = await fetch(`/api/integrations/meta/leads/${leadId}/convert`, { method: 'POST' });
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

  const isConnected = connectionStatus === 'connected';
  const webhookUrl = config?.webhookUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/meta/webhook`;

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
          <div className="flex items-center justify-center size-11 rounded-lg bg-gradient-to-br from-[#1877F2] to-[#833AB4]">
            <Facebook className="size-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Meta Business Platform
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Facebook + Instagram</Badge>
            </h2>
            <p className="text-sm text-muted-foreground">Capture leads from Facebook & Instagram lead-form ads</p>
          </div>
        </div>
        <Badge className={isConnected ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>
          {isConnected ? <><CheckCircle2 className="size-3 mr-1" /> Connected</> : <><AlertCircle className="size-3 mr-1" /> Not Configured</>}
        </Badge>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="config" className="gap-1.5"><Settings2 className="size-3.5" /> Configuration</TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5"><Users className="size-3.5" /> Leads ({totalLeads})</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><TrendingUp className="size-3.5" /> Analytics</TabsTrigger>
        </TabsList>

        {/* ─── Configuration Tab ─── */}
        <TabsContent value="config" className="space-y-4">
          {/* Webhook Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Webhook className="size-4 text-blue-600" /> Webhook Setup</CardTitle>
              <CardDescription>Configure this URL in your Meta App to receive lead-form submissions in real time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Callback URL</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-xs bg-muted/50" />
                  <Button variant="outline" size="icon" onClick={() => handleCopy(webhookUrl, 'url')} className="shrink-0">
                    {copied === 'url' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Verify Token</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={config?.verifyToken || '—'} className="font-mono text-xs bg-muted/50" />
                  <Button variant="outline" size="icon" onClick={() => handleCopy(config?.verifyToken || '', 'token')} className="shrink-0" disabled={!config?.verifyToken}>
                    {copied === 'token' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={config?.subscriptionVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                  {config?.subscriptionVerified ? <><CheckCircle2 className="size-3 mr-1" /> Subscription Verified</> : <><Clock className="size-3 mr-1" /> Pending Verification</>}
                </Badge>
                <span className="text-xs text-muted-foreground">Add the callback URL & verify token in your Meta App → Webhooks → Page → Subscribe to <code className="text-xs px-1 py-0.5 bg-muted rounded">leadgen</code>.</span>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-900">
                <p className="font-medium flex items-center gap-1.5 mb-1"><AlertCircle className="size-3.5" /> Setup Steps</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-1 text-blue-800 dark:text-blue-300">
                  <li>Create a Meta App at developers.facebook.com → Add <strong>Lead Generation</strong> product.</li>
                  <li>Copy the Callback URL above into Webhooks → Page → Add Callback.</li>
                  <li>Use the Verify Token above when prompted.</li>
                  <li>Subscribe to the <code className="px-1 bg-blue-100 dark:bg-blue-900 rounded">leadgen</code> field.</li>
                  <li>Fill in the credentials below and save.</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Credentials Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><KeyRound className="size-4 text-blue-600" /> Credentials</CardTitle>
              <CardDescription>App and Page access tokens from your Meta Business account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingConfig ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="appId">App ID</Label>
                      <Input id="appId" placeholder="1234567890123456" value={form.appId} onChange={e => setForm({ ...form, appId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appSecret">App Secret</Label>
                      <Input id="appSecret" type="password" placeholder="Leave as •••••• to keep existing" value={form.appSecret} onChange={e => setForm({ ...form, appSecret: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pageId">Page ID</Label>
                      <Input id="pageId" placeholder="e.g., 109876543210" value={form.pageId} onChange={e => setForm({ ...form, pageId: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pageName">Page Name</Label>
                      <Input id="pageName" placeholder="e.g., My Business Page" value={form.pageName} onChange={e => setForm({ ...form, pageName: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pageAccessToken">Page Access Token</Label>
                    <Input id="pageAccessToken" type="password" placeholder="Leave as •••••• to keep existing" value={form.pageAccessToken} onChange={e => setForm({ ...form, pageAccessToken: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Required to fetch lead field data (name, email, phone) from submitted forms.</p>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoCreate" className="text-sm">Auto-create leads in CRM</Label>
                      <p className="text-xs text-muted-foreground">Automatically add captured leads to your contacts.</p>
                    </div>
                    <Switch id="autoCreate" checked={form.autoCreateLeads} onCheckedChange={v => setForm({ ...form, autoCreateLeads: v })} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onBack}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#1877F2] hover:bg-[#1864D2]">
                      {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
                      Save Configuration
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Leads Tab ─── */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-3">
              <div>
                <CardTitle className="text-base">Captured Leads</CardTitle>
                <CardDescription>Leads from Facebook & Instagram lead-form ads.</CardDescription>
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
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">Once your Meta webhook is verified and your lead-form ads start receiving submissions, captured leads will appear here automatically.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Contact</TableHead>
                        <TableHead className="text-xs">Platform</TableHead>
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
                          <TableCell>
                            {lead.platform === 'instagram' ? (
                              <Badge variant="outline" className="text-[10px] bg-pink-50 text-pink-700 border-pink-200"><Instagram className="size-3 mr-1" />Instagram</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"><Facebook className="size-3 mr-1" />Facebook</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium truncate max-w-[160px]">{lead.formName || lead.formId}</div>
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
              { label: 'Total Leads', value: totalLeads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'New Leads', value: newLeads, icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50' },
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
              <CardTitle className="text-base">Lead Capture Flow</CardTitle>
              <CardDescription>How leads flow from your ads into your CRM.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-2 flex-wrap py-4">
                {[
                  { icon: Megaphone, label: 'FB/IG Lead Ad', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { icon: Webhook, label: 'Webhook', color: 'bg-violet-50 text-violet-700 border-violet-200' },
                  { icon: Users, label: 'Lead Captured', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { icon: UserPlus, label: 'Convert to CRM', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { icon: TrendingUp, label: 'Follow-up Automation', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                ].map((step, i, arr) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-2">
                      <div className={cn('flex flex-col items-center gap-1.5 p-3 rounded-lg border', step.color)}>
                        <Icon className="size-5" />
                        <span className="text-[10px] font-medium text-center max-w-[80px]">{step.label}</span>
                      </div>
                      {i < arr.length - 1 && <ArrowRight className="size-4 text-muted-foreground shrink-0" />}
                    </div>
                  );
                })}
              </div>
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
