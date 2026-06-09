'use client';

import { useState } from 'react';
import {
  Globe, Plus, Search, Eye, Settings, BarChart3,
  ExternalLink, MousePointer, TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Webview {
  id: string;
  name: string;
  type: 'booking' | 'payment' | 'quote_approval' | 'portal' | 'invoice';
  url: string;
  views: number;
  clicks: number;
  conversions: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_WEBVIEWS: Webview[] = [
  { id: 'w1', name: 'Book Service', type: 'booking', url: 'https://app.serviceos.com/book', views: 1245, clicks: 892, conversions: 456, status: 'active', createdAt: '2025-01-15' },
  { id: 'w2', name: 'Pay Invoice', type: 'payment', url: 'https://app.serviceos.com/pay', views: 890, clicks: 734, conversions: 612, status: 'active', createdAt: '2025-02-01' },
  { id: 'w3', name: 'Approve Quote', type: 'quote_approval', url: 'https://app.serviceos.com/quote', views: 456, clicks: 345, conversions: 234, status: 'active', createdAt: '2025-02-20' },
  { id: 'w4', name: 'Customer Portal', type: 'portal', url: 'https://app.serviceos.com/portal', views: 2345, clicks: 1890, conversions: 1567, status: 'active', createdAt: '2025-01-01' },
  { id: 'w5', name: 'View Invoice', type: 'invoice', url: 'https://app.serviceos.com/invoice', views: 678, clicks: 567, conversions: 445, status: 'inactive', createdAt: '2025-03-01' },
];

const WEBVIEW_TYPES = [
  { value: 'booking', label: 'Booking', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'payment', label: 'Payment', color: 'bg-blue-100 text-blue-700' },
  { value: 'quote_approval', label: 'Quote Approval', color: 'bg-purple-100 text-purple-700' },
  { value: 'portal', label: 'Portal', color: 'bg-amber-100 text-amber-700' },
  { value: 'invoice', label: 'Invoice', color: 'bg-orange-100 text-orange-700' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function WebviewEngineView() {
  const [webviews, setWebviews] = useState<Webview[]>(MOCK_WEBVIEWS);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedWebview, setSelectedWebview] = useState<Webview | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const [createForm, setCreateForm] = useState({ name: '', type: 'booking' as Webview['type'], url: '' });

  const filteredWebviews = webviews.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!createForm.name || !createForm.url) { toast.error('Name and URL are required'); return; }
    const newWv: Webview = {
      id: `w-${Date.now()}`, name: createForm.name, type: createForm.type, url: createForm.url,
      views: 0, clicks: 0, conversions: 0, status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setWebviews(prev => [newWv, ...prev]);
    setShowCreateDialog(false);
    setCreateForm({ name: '', type: 'booking', url: '' });
    toast.success('Webview created');
  };

  const totalViews = webviews.reduce((s, w) => s + w.views, 0);
  const totalConversions = webviews.reduce((s, w) => s + w.conversions, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Globe className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Webview Engine</h2>
            <p className="text-sm text-muted-foreground">WhatsApp webview management</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> Create Webview
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Webviews', value: webviews.length, icon: Globe, color: 'text-foreground' },
          { label: 'Total Views', value: totalViews.toLocaleString(), icon: Eye, color: 'text-blue-600' },
          { label: 'Total Clicks', value: webviews.reduce((s, w) => s + w.clicks, 0).toLocaleString(), icon: MousePointer, color: 'text-purple-600' },
          { label: 'Conversions', value: totalConversions.toLocaleString(), icon: TrendingUp, color: 'text-emerald-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2"><Icon className={`size-4 ${stat.color}`} /><div><p className="text-xs text-muted-foreground">{stat.label}</p><p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p></div></div>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search webviews..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Webview Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredWebviews.map(wv => {
          const typeInfo = WEBVIEW_TYPES.find(t => t.value === wv.type);
          const convRate = wv.views > 0 ? Math.round(wv.conversions / wv.views * 100) : 0;
          return (
            <Card key={wv.id} className="hover:shadow-md transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{wv.name}</h4>
                    <Badge className={`${typeInfo?.color || ''} text-[10px] mt-1`}>{typeInfo?.label || wv.type}</Badge>
                  </div>
                  <Badge variant="outline" className={wv.status === 'active' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-slate-100 text-slate-600 text-[10px]'}>{wv.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ExternalLink className="size-3" />{wv.url}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                  <div><p className="text-sm font-bold text-blue-600">{wv.views.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Views</p></div>
                  <div><p className="text-sm font-bold text-purple-600">{wv.clicks.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Clicks</p></div>
                  <div><p className="text-sm font-bold text-emerald-600">{convRate}%</p><p className="text-[10px] text-muted-foreground">Conv.</p></div>
                </div>
                <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => { setSelectedWebview(wv); setShowConfigDialog(true); }}>
                  <Settings className="size-3 mr-1" /> Configure
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Webview</DialogTitle>
            <DialogDescription>Add a new webview for WhatsApp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="e.g., Book Service" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v as Webview['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEBVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input placeholder="https://app.serviceos.com/..." value={createForm.url} onChange={e => setCreateForm({ ...createForm, url: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name || !createForm.url}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedWebview?.name} - Configuration</DialogTitle>
          </DialogHeader>
          {selectedWebview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{selectedWebview.type}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{selectedWebview.status}</span></div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs">Webview URL</Label>
                <Input value={selectedWebview.url} readOnly className="text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Analytics</Label>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50"><p className="font-bold">{selectedWebview.views.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Views</p></div>
                  <div className="p-2 rounded-lg bg-muted/50"><p className="font-bold">{selectedWebview.clicks.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Clicks</p></div>
                  <div className="p-2 rounded-lg bg-muted/50"><p className="font-bold">{selectedWebview.conversions.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Conversions</p></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
