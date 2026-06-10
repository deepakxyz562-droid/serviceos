'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  Globe, Plus, Search, Link2, Clock, Mail, MessageCircle,
  Copy, RefreshCw, Users, CheckCircle2, XCircle, Key,
  ExternalLink, Trash2, Settings, Shield, Smartphone,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type OTPMethod = 'email' | 'whatsapp' | 'both';

interface PortalSession {
  id: string;
  token: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  isActive: boolean;
  lastAccessedAt: string | null;
  expiresAt: string;
  accessCount: number;
  createdAt: string;
}

interface PortalConfig {
  otpMethod: OTPMethod;
  sessionDuration: number;
  autoApprove: boolean;
  enableJobTracking: boolean;
  enableInvoiceView: boolean;
  enableReviewSubmission: boolean;
  enableReschedule: boolean;
  enableWhatsAppContact: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { value: '1', label: '1 Day' },
  { value: '3', label: '3 Days' },
  { value: '7', label: '7 Days' },
  { value: '14', label: '14 Days' },
  { value: '30', label: '30 Days' },
];

const DEFAULT_CONFIG: PortalConfig = {
  otpMethod: 'whatsapp',
  sessionDuration: 7,
  autoApprove: false,
  enableJobTracking: true,
  enableInvoiceView: true,
  enableReviewSubmission: true,
  enableReschedule: true,
  enableWhatsAppContact: true,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CustomerPortalView() {
  const [sessions, setSessions] = useState<PortalSession[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; email: string; phone: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('sessions');

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [generating, setGenerating] = useState(false);

  const [config, setConfig] = useState<PortalConfig>(DEFAULT_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch portal sessions from API
      const res = await authFetch('/api/customer-portal?list=true');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // Silently handle - portal session listing may not be fully implemented
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await authFetch('/api/contacts?limit=100');
      if (res.ok) {
        const data = await res.json();
        const customerList = (data.contacts || []).map((c: { id: string; name: string; email: string | null; phone: string }) => ({
          id: c.id,
          name: c.name,
          email: c.email || '',
          phone: c.phone,
        }));
        setCustomers(customerList);
      }
    } catch {
      // Silently handle
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchCustomers();
  }, [fetchSessions, fetchCustomers]);

  // ─── Computed ────────────────────────────────────────────────────────────

  const filteredSessions = sessions.filter((s) => {
    const expired = isExpired(s.expiresAt);
    if (statusFilter === 'active' && expired) return false;
    if (statusFilter === 'expired' && !expired) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.customerName?.toLowerCase().includes(q) || s.customerEmail?.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    activeSessions: sessions.filter((s) => !isExpired(s.expiresAt)).length,
    totalCustomers: customers.length,
    expiredSessions: sessions.filter((s) => isExpired(s.expiresAt)).length,
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleGenerateLink = useCallback(async () => {
    if (!selectedCustomer) { toast.error('Please select a customer'); return; }
    setGenerating(true);
    try {
      const customer = customers.find((c) => c.id === selectedCustomer);
      const res = await authFetch('/api/customer-portal', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer,
          expiresInHours: config.sessionDuration * 24,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate');

      const data = await res.json();
      const newSession: PortalSession = {
        id: data.session?.id || `ps_${Date.now()}`,
        token: data.session?.token || '',
        customerId: selectedCustomer,
        customerName: customer?.name || '',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        isActive: true,
        lastAccessedAt: null,
        expiresAt: data.session?.expiresAt || new Date(Date.now() + config.sessionDuration * 24 * 60 * 60 * 1000).toISOString(),
        accessCount: 0,
        createdAt: new Date().toISOString(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setShowGenerateDialog(false);
      setSelectedCustomer('');
      toast.success('Portal link generated successfully');
    } catch (err) {
      console.error('Error generating portal link:', err);
      toast.error('Failed to generate portal link');
    } finally {
      setGenerating(false);
    }
  }, [selectedCustomer, customers, config.sessionDuration]);

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Portal link copied to clipboard');
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await authFetch(`/api/customer-portal/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, isActive: false } : s));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await authFetch(`/api/customer-portal/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session deleted');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      // Save config to API or localStorage for now
      localStorage.setItem('portal_config', JSON.stringify(config));
      toast.success('Portal configuration saved');
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // ─── Loading Skeletons ──────────────────────────────────────────────────

  const renderLoadingSkeletons = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-10" />
                </div>
                <Skeleton className="size-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-60" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ViewHeader
        icon={Globe}
        iconBg="bg-cyan-600"
        title="Customer Portal"
        description="Manage portal sessions, access links, and configuration"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowGenerateDialog(true)}>
            <Link2 className="size-4 mr-1.5" /> Generate Link
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Sessions', value: stats.activeSessions, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { label: 'Expired Sessions', value: stats.expiredSessions, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg font-bold truncate">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-xl shrink-0`}><Icon className={`size-4 ${stat.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-9">
          <TabsTrigger value="sessions" className="text-xs">Portal Sessions</TabsTrigger>
          <TabsTrigger value="configuration" className="text-xs">Configuration</TabsTrigger>
          <TabsTrigger value="links" className="text-xs">Access Links</TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-3">Active</TabsTrigger>
                <TabsTrigger value="expired" className="text-xs px-3">Expired</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search sessions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>

          {loading ? renderLoadingSkeletons() : filteredSessions.length === 0 ? (
            <EmptyState icon={Globe} title="No portal sessions" description="Generate a new portal link for a customer to create a session" actionLabel="Generate Link" onAction={() => setShowGenerateDialog(true)} />
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => {
                const expired = isExpired(session.expiresAt);
                return (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-9 rounded-full bg-cyan-50 shrink-0">
                          <span className="text-sm font-semibold text-cyan-700">{session.customerName?.[0] || '?'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{session.customerName || 'Unknown Customer'}</p>
                            {expired ? (
                              <Badge variant="outline" className="text-[10px] h-5 bg-red-50 text-red-700 border-red-200"><XCircle className="size-3 mr-0.5" /> Expired</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="size-3 mr-0.5" /> Active</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{session.token.slice(0, 12)}...</code>
                            <span className="flex items-center gap-1"><Clock className="size-3" /> Expires: {formatDateTime(session.expiresAt)}</span>
                            <span className="flex items-center gap-1"><RefreshCw className="size-3" /> Last: {formatDateTime(session.lastAccessedAt)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(session.token)} title="Copy link">
                            <Copy className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/portal/${session.token}`, '_blank')} title="Open portal">
                            <ExternalLink className="size-3.5" />
                          </Button>
                          {!expired && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => handleRevokeSession(session.id)} title="Revoke">
                              <Shield className="size-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSession(session.id)} title="Delete">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Settings className="size-4 text-cyan-600" /> Portal Configuration</CardTitle>
              <CardDescription>Configure how the customer portal works</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">OTP Method</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'email' as OTPMethod, label: 'Email OTP', desc: 'Send via email', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { value: 'whatsapp' as OTPMethod, label: 'WhatsApp OTP', desc: 'Send via WhatsApp', icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { value: 'both' as OTPMethod, label: 'Both', desc: 'Customer can choose', icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map((method) => (
                    <button
                      key={method.value}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        config.otpMethod === method.value ? 'border-emerald-500 bg-emerald-50/50' : 'border-muted hover:border-muted-foreground/20'
                      }`}
                      onClick={() => setConfig((p) => ({ ...p, otpMethod: method.value }))}
                    >
                      <div className={`inline-flex items-center justify-center size-8 rounded-lg ${method.bg} mb-2`}>
                        <method.icon className={`size-4 ${method.color}`} />
                      </div>
                      <p className="text-sm font-semibold">{method.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{method.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Duration</Label>
                  <Select value={String(config.sessionDuration)} onValueChange={(v) => setConfig((p) => ({ ...p, sessionDuration: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auto-Approve Access</Label>
                  <Select value={config.autoApprove ? 'yes' : 'no'} onValueChange={(v) => setConfig((p) => ({ ...p, autoApprove: v === 'yes' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">Manual Approval</SelectItem>
                      <SelectItem value="yes">Auto-Approve</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Portal Features</Label>
                {[
                  { key: 'enableJobTracking' as const, label: 'Job Tracking', desc: 'Allow customers to track job progress', icon: CheckCircle2 },
                  { key: 'enableInvoiceView' as const, label: 'Invoice View', desc: 'Let customers view and pay invoices', icon: Mail },
                  { key: 'enableReviewSubmission' as const, label: 'Review Submission', desc: 'Enable customers to submit reviews', icon: MessageCircle },
                  { key: 'enableReschedule' as const, label: 'Reschedule', desc: 'Allow customers to request rescheduling', icon: RefreshCw },
                  { key: 'enableWhatsAppContact' as const, label: 'WhatsApp Contact', desc: 'Show WhatsApp contact button', icon: MessageCircle },
                ].map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-cyan-50"><Icon className="size-4 text-cyan-600" /></div>
                        <div>
                          <p className="text-sm font-medium">{feature.label}</p>
                          <p className="text-xs text-muted-foreground">{feature.desc}</p>
                        </div>
                      </div>
                      <Button
                        variant={config[feature.key] ? 'default' : 'outline'}
                        size="sm"
                        className={config[feature.key] ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                        onClick={() => setConfig((p) => ({ ...p, [feature.key]: !p[feature.key] }))}
                      >
                        {config[feature.key] ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveConfig} disabled={savingConfig}>
                  {savingConfig ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Links Tab */}
        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Link2 className="size-4 text-cyan-600" /> Access Links</CardTitle>
              <CardDescription>Quick access to customer portal links</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <EmptyState icon={Link2} title="No access links" description="Generate portal links for your customers to enable self-service access" />
              ) : (
                <div className="space-y-3">
                  {sessions.filter((s) => !isExpired(s.expiresAt)).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{session.customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{window.location.origin}/portal/{session.token.slice(0, 16)}...</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleCopyLink(session.token)}>
                        <Copy className="size-3.5 mr-1" /> Copy
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Link Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="size-5 text-cyan-600" /> Generate Portal Link</DialogTitle>
            <DialogDescription>Create a new portal access link for a customer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.phone}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p>The customer will receive a unique portal link with OTP verification via <strong>{config.otpMethod === 'both' ? 'their preferred method' : config.otpMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}</strong>.</p>
              <p>Session will expire in <strong>{config.sessionDuration} day{config.sessionDuration > 1 ? 's' : ''}</strong>.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} disabled={generating}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleGenerateLink} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
