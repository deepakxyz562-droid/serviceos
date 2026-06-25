'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plug, Star, Briefcase, RefreshCw, Loader2, XCircle, Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CatalogCategory {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
  enabled: boolean;
}

interface CatalogIntegration {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  provider: string;
  enabled: boolean;
  featured: boolean;
  sortOrder: number;
  detailType: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function IntegrationsTab() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [integrations, setIntegrations] = useState<CatalogIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/integrations');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setIntegrations(data.integrations || []);
      } else {
        toast.error('Failed to load integration catalog');
      }
    } catch {
      toast.error('Failed to load integration catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  const persist = useCallback(async (newCats: CatalogCategory[], newInts: CatalogIntegration[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: newCats, integrations: newInts }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error((d as { error?: string }).error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleCategory = (key: string) => {
    const newCats = categories.map(c => c.key === key ? { ...c, enabled: !c.enabled } : c);
    setCategories(newCats);
    const cat = newCats.find(c => c.key === key);
    toast.success(`${cat?.label} ${cat?.enabled ? 'enabled' : 'disabled'}`);
    persist(newCats, integrations);
  };

  const toggleIntegration = (key: string) => {
    const newInts = integrations.map(i => i.key === key ? { ...i, enabled: !i.enabled } : i);
    setIntegrations(newInts);
    const integ = newInts.find(i => i.key === key);
    toast.success(`${integ?.name} ${integ?.enabled ? 'enabled' : 'disabled'}`);
    persist(categories, newInts);
  };

  const toggleFeatured = (key: string) => {
    const newInts = integrations.map(i => i.key === key ? { ...i, featured: !i.featured } : i);
    setIntegrations(newInts);
    persist(categories, newInts);
  };

  const enabledCount = integrations.filter(i => i.enabled).length;
  const enabledCatCount = categories.filter(c => c.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plug className="size-5 text-emerald-400" /> Integration Catalog
          </h3>
          <p className="text-sm text-slate-400">Globally enable/disable integration categories and individual integrations for all tenants.</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs"><Loader2 className="size-3 mr-1 animate-spin" />Saving...</Badge>}
          <Button variant="outline" size="sm" onClick={fetchCatalog} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
            <RefreshCw className="size-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Categories', value: `${enabledCatCount}/${categories.length}`, icon: Briefcase, color: 'text-emerald-400' },
          { label: 'Integrations', value: `${enabledCount}/${integrations.length}`, icon: Plug, color: 'text-sky-400' },
          { label: 'Featured', value: integrations.filter(i => i.featured).length, icon: Star, color: 'text-amber-400' },
          { label: 'Disabled', value: integrations.filter(i => !i.enabled).length, icon: XCircle, color: 'text-red-400' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="bg-slate-900 border-slate-800 p-4">
              <div className="flex items-center gap-2">
                <Icon className={cn('size-4', s.color)} />
                <div>
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Categories grid */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-1.5">
          <Briefcase className="size-4 text-emerald-400" /> Category Tabs
        </h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedCategories.map(cat => {
            const count = integrations.filter(i => i.category === cat.key).length;
            const enabledInCat = integrations.filter(i => i.category === cat.key && i.enabled).length;
            return (
              <Card key={cat.key} className={cn('border transition-colors', cat.enabled ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/50 border-slate-800 opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-white text-sm">{cat.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{cat.description}</p>
                    </div>
                    <Switch checked={cat.enabled} onCheckedChange={() => toggleCategory(cat.key)} />
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-300 border-slate-700">
                    {enabledInCat}/{count} integrations
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Integrations registry grouped by category */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h4 className="text-sm font-medium text-white flex items-center gap-1.5">
            <Plug className="size-4 text-emerald-400" /> Integrations Registry
          </h4>
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-48 text-xs bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
          </div>
        </div>

        {sortedCategories.map(cat => {
          const catInts = integrations
            .filter(i => i.category === cat.key)
            .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.provider.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.sortOrder - b.sortOrder);
          if (catInts.length === 0) return null;
          return (
            <div key={cat.key} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('size-2 rounded-full', cat.enabled ? 'bg-emerald-500' : 'bg-slate-600')} />
                <h5 className="text-xs font-medium text-slate-300 uppercase tracking-wide">{cat.label}</h5>
                <Separator className="flex-1 bg-slate-800" />
              </div>
              <div className="grid gap-2">
                {catInts.map(integ => (
                  <div
                    key={integ.key}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      integ.enabled ? 'bg-slate-900 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-60'
                    )}
                  >
                    <div className={cn('size-8 rounded flex items-center justify-center shrink-0', integ.featured ? 'bg-amber-500/10' : 'bg-slate-800')}>
                      {integ.featured ? <Star className="size-4 text-amber-400" /> : <Plug className="size-4 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white truncate">{integ.name}</p>
                        <Badge variant="outline" className="text-[9px] bg-slate-800 text-slate-400 border-slate-700 shrink-0">{integ.provider}</Badge>
                        {integ.detailType !== 'generic' && (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">{integ.detailType}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{integ.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Star className={cn('size-3.5', integ.featured ? 'text-amber-400 fill-amber-400' : 'text-slate-600')} />
                        <Switch checked={integ.featured} onCheckedChange={() => toggleFeatured(integ.key)} className="scale-75" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-xs', integ.enabled ? 'text-emerald-400' : 'text-slate-500')}>{integ.enabled ? 'On' : 'Off'}</span>
                        <Switch checked={integ.enabled} onCheckedChange={() => toggleIntegration(integ.key)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
