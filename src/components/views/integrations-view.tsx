'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plug, Search, CheckCircle2, AlertCircle, Loader2, Star, ArrowLeft,
  ShoppingCart, Store, Package, Megaphone, Facebook, Search as SearchIcon,
  Linkedin, Music, Phone, Mail, MessageCircle, BookOpen, FileSpreadsheet,
  BookMarked, CreditCard, Wallet, Banknote, Calendar, Hash, FileText,
  Video, Briefcase, Settings2, Plus, X, KeyRound, ExternalLink, LayoutGrid,
  ShoppingBag, Calculator, MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DEFAULT_CATEGORIES, DEFAULT_INTEGRATIONS,
  type IntegrationCategoryDef, type IntegrationDef,
} from '@/lib/integration-catalog';
import { MetaAdsDetail } from '@/components/integrations/meta-ads-detail';
import { GoogleAdsDetail } from '@/components/integrations/google-ads-detail';

// ─── Icon map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingBag, ShoppingCart, Store, Package, Megaphone, Facebook, Search: SearchIcon,
  Linkedin, Music, Phone, Mail, MessageCircle, BookOpen, FileSpreadsheet, BookMarked,
  CreditCard, Wallet, Banknote, Calendar, Hash, FileText, Video, Briefcase, Calculator,
  MessageSquare,
};

// ─── Color map ──────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string; soft: string }> = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-200', soft: 'bg-emerald-50' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-200', soft: 'bg-amber-50' },
  sky: { bg: 'bg-sky-500', text: 'text-sky-600', ring: 'ring-sky-200', soft: 'bg-sky-50' },
  teal: { bg: 'bg-teal-500', text: 'text-teal-600', ring: 'ring-teal-200', soft: 'bg-teal-50' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-600', ring: 'ring-violet-200', soft: 'bg-violet-50' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', ring: 'ring-rose-200', soft: 'bg-rose-50' },
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface Connection {
  id: string;
  tenantId: string;
  integrationKey: string;
  status: string;
  configJson: string | Record<string, unknown> | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  errorMessage: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function IntegrationsView() {
  const [categories, setCategories] = useState<IntegrationCategoryDef[]>(DEFAULT_CATEGORIES);
  const [integrations, setIntegrations] = useState<IntegrationDef[]>(DEFAULT_INTEGRATIONS);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeCategory, setActiveCategory] = useState('marketing');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [connectDialogKey, setConnectDialogKey] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/catalog');
      if (res.ok) {
        const data = await res.json();
        if (data.categories?.length && data.integrations?.length) {
          setCategories(data.categories);
          setIntegrations(data.integrations);
          // If the active category isn't enabled, switch to the first enabled one
          if (!data.categories.find((c: IntegrationCategoryDef) => c.key === activeCategory && c.enabled)) {
            const firstEnabled = data.categories.find((c: IntegrationCategoryDef) => c.enabled);
            if (firstEnabled) setActiveCategory(firstEnabled.key);
          }
        }
      }
    } catch { /* use defaults */ } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/connections');
      if (res.ok) setConnections(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCatalog(); fetchConnections(); }, []);

  const getConnection = (key: string) => connections.find(c => c.integrationKey === key);

  // Resolve the selected integration detail view
  const selectedIntegration = integrations.find(i => i.key === selectedKey);
  if (selectedKey && selectedIntegration) {
    const conn = getConnection(selectedKey);
    const handleBack = () => setSelectedKey(null);
    const handleConnectionChange = () => { fetchConnections(); };

    if (selectedIntegration.detailType === 'meta-ads') {
      return <MetaAdsDetail onBack={handleBack} connectionStatus={conn?.status || 'disconnected'} onConnectionChange={handleConnectionChange} />;
    }
    if (selectedIntegration.detailType === 'google-ads') {
      return <GoogleAdsDetail onBack={handleBack} connectionStatus={conn?.status || 'disconnected'} onConnectionChange={handleConnectionChange} />;
    }
  }

  const enabledCategories = categories.filter(c => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const categoryIntegrations = integrations
    .filter(i => i.category === activeCategory && i.enabled)
    .filter(i => {
      if (!search) return true;
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.provider.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-11 rounded-lg bg-emerald-600">
            <Plug className="size-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Integrations</h2>
            <p className="text-sm text-muted-foreground">Connect your favourite tools and capture leads automatically</p>
          </div>
        </div>
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Available', value: integrations.filter(i => i.enabled).length, icon: LayoutGrid, color: 'text-emerald-600' },
          { label: 'Connected', value: connections.filter(c => c.status === 'connected').length, icon: CheckCircle2, color: 'text-blue-600' },
          { label: 'Categories', value: enabledCategories.length, icon: Briefcase, color: 'text-violet-600' },
          { label: 'Featured', value: integrations.filter(i => i.featured && i.enabled).length, icon: Star, color: 'text-amber-600' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-2"><Icon className={cn('size-4', s.color)} /><div><p className="text-xs text-muted-foreground">{s.label}</p><p className={cn('text-lg font-bold', s.color)}>{s.value}</p></div></div>
            </Card>
          );
        })}
      </div>

      {/* Category Tabs */}
      <div className="border-b pb-1">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="h-auto bg-transparent p-0 gap-1 flex-wrap">
            {enabledCategories.map(cat => {
              const catIntegrations = integrations.filter(i => i.category === cat.key && i.enabled);
              const connectedCount = catIntegrations.filter(i => getConnection(i.key)?.status === 'connected').length;
              const Icon = ICON_MAP[cat.icon] || Plug;
              const color = COLOR_MAP[cat.color] || COLOR_MAP.emerald;
              return (
                <TabsTrigger
                  key={cat.key}
                  value={cat.key}
                  className={cn(
                    'gap-1.5 rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-muted-foreground px-3 py-2 text-sm',
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="sm:hidden">{cat.label.slice(0, 4)}</span>
                  <Badge variant="outline" className={cn('text-[10px] h-4 px-1 ml-0.5', connectedCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground')}>
                    {connectedCount}/{catIntegrations.length}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Active category description */}
      {(() => {
        const cat = categories.find(c => c.key === activeCategory);
        if (!cat) return null;
        const Icon = ICON_MAP[cat.icon] || Plug;
        const color = COLOR_MAP[cat.color] || COLOR_MAP.emerald;
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={cn('size-6 rounded flex items-center justify-center', color.soft)}><Icon className={cn('size-3.5', color.text)} /></div>
            <span className="font-medium text-foreground">{cat.label}</span>
            <span>·</span>
            <span>{cat.description}</span>
          </div>
        );
      })()}

      {/* Integration cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-emerald-500" /></div>
      ) : categoryIntegrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3"><Plug className="size-6 text-muted-foreground" /></div>
          <p className="text-sm font-medium">No integrations found</p>
          <p className="text-xs text-muted-foreground mt-1">{search ? 'Try a different search term.' : 'No integrations available in this category yet.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categoryIntegrations.map(integration => {
            const conn = getConnection(integration.key);
            const isConnected = conn?.status === 'connected';
            const Icon = ICON_MAP[integration.icon] || Plug;
            const color = COLOR_MAP[integration.color] || COLOR_MAP.emerald;
            return (
              <Card
                key={integration.key}
                className="hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => {
                  if (integration.detailType === 'generic') setConnectDialogKey(integration.key);
                  else setSelectedKey(integration.key);
                }}
              >
                {integration.featured && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-0.5">
                    <Star className="size-2.5 fill-white" /> FEATURED
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', color.soft)}>
                      <Icon className={cn('size-5', color.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{integration.name}</h3>
                      <Badge variant="outline" className={cn('text-[10px] mt-0.5', isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200')}>
                        {isConnected ? <><CheckCircle2 className="size-2.5 mr-0.5" />Connected</> : <><AlertCircle className="size-2.5 mr-0.5" />Not Connected</>}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">{integration.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{integration.provider}</span>
                    <Button
                      variant={isConnected ? 'outline' : 'default'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (integration.detailType === 'generic') setConnectDialogKey(integration.key);
                        else setSelectedKey(integration.key);
                      }}
                    >
                      {isConnected ? <><Settings2 className="size-3 mr-1" />Configure</> : <><Plus className="size-3 mr-1" />Connect</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generic Connect Dialog */}
      <GenericConnectDialog
        integration={connectDialogKey ? integrations.find(i => i.key === connectDialogKey) || null : null}
        connection={connectDialogKey ? getConnection(connectDialogKey) : undefined}
        open={!!connectDialogKey}
        onOpenChange={(o) => { if (!o) setConnectDialogKey(null); }}
        onSaved={() => { fetchConnections(); }}
      />
    </div>
  );
}

// ─── Generic Connect Dialog ─────────────────────────────────────────────────

function GenericConnectDialog({
  integration, connection, open, onOpenChange, onSaved,
}: {
  integration: IntegrationDef | null;
  connection?: Connection;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(connection?.status === 'connected');
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => { setConnected(connection?.status === 'connected'); }, [connection?.status, open]);

  if (!integration) return null;
  const Icon = ICON_MAP[integration.icon] || Plug;
  const color = COLOR_MAP[integration.color] || COLOR_MAP.emerald;

  const handleToggle = async () => {
    setSaving(true);
    try {
      if (connected) {
        // Disconnect
        const res = await fetch(`/api/integrations/connections?integrationKey=${integration.key}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success(`${integration.name} disconnected`);
          setConnected(false);
          onSaved();
        } else { toast.error('Failed to disconnect'); }
      } else {
        // Connect
        const res = await fetch('/api/integrations/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integrationKey: integration.key,
            status: 'connected',
            credentialsJson: '{}',
            configJson: JSON.stringify({ autoSync }),
          }),
        });
        if (res.ok) {
          toast.success(`${integration.name} connected`);
          setConnected(true);
          onSaved();
        } else { toast.error('Failed to connect'); }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn('size-8 rounded-lg flex items-center justify-center', color.soft)}><Icon className={cn('size-4', color.text)} /></div>
            {integration.name}
          </DialogTitle>
          <DialogDescription>{integration.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Connection Status</span>
              <Badge variant="outline" className={connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}>
                {connected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            {connection?.connectedAt && (
              <p className="text-xs text-muted-foreground">Connected on {new Date(connection.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            )}
            {connection?.lastSyncAt && (
              <p className="text-xs text-muted-foreground">Last sync: {new Date(connection.lastSyncAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            )}
          </div>

          {!connected && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Auto-sync data</Label>
                  <p className="text-xs text-muted-foreground">Periodically sync data from this integration.</p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>
              <Separator />
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900 flex gap-2">
            <KeyRound className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">OAuth Setup Required</p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300">This integration uses OAuth2. Clicking connect will initiate the authorization flow with {integration.provider}.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button
            onClick={handleToggle}
            disabled={saving}
            variant={connected ? 'destructive' : 'default'}
            className={connected ? '' : 'bg-emerald-600 hover:bg-emerald-700'}
          >
            {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : connected ? <X className="size-4 mr-1.5" /> : <Plug className="size-4 mr-1.5" />}
            {connected ? 'Disconnect' : 'Connect Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
