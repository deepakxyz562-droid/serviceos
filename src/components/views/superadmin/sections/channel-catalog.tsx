'use client';

/**
 * Superadmin — Channel Catalog Management
 * ========================================
 *
 * O1.5 Superadmin UI for the ChannelCatalog. Controls which channels Fieseros
 * offers to tenants:
 *
 *   enabled=true,  comingSoon=false → "Available"   (tenant can connect)
 *   enabled=false, comingSoon=true  → "Coming Soon" (tenant sees badge, can't connect)
 *   enabled=false, comingSoon=false → "Hidden"      (not shown to tenants at all)
 *
 * The tenant channel config page reads this catalog to decide what to render.
 *
 * API: GET/PATCH /api/superadmin/channel-catalog
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, RefreshCw, Save, GripVertical, Eye, EyeOff, Clock, CheckCircle2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChannelCatalogEntry {
  id: string;
  channel: string;
  enabled: boolean;
  comingSoon: boolean;
  displayName: string;
  description: string;
  icon: string | null;
  color: string | null;
  connectionMethod: string;
  sortOrder: number;
  provider: string | null;
  updatedAt: string;
}

type Status = 'available' | 'coming_soon' | 'hidden';

function getStatus(c: ChannelCatalogEntry): Status {
  if (!c.enabled && !c.comingSoon) return 'hidden';
  if (!c.enabled && c.comingSoon) return 'coming_soon';
  return 'available';
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ChannelCatalogSection() {
  const [catalog, setCatalog] = useState<ChannelCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // channel being saved

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/channel-catalog');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCatalog(data.catalog || []);
    } catch (err) {
      console.error('[ChannelCatalog] load failed:', err);
      toast.error('Failed to load channel catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Update a single channel field locally (before saving)
  const updateField = (channel: string, field: keyof ChannelCatalogEntry, value: unknown) => {
    setCatalog((prev) =>
      prev.map((c) => (c.channel === channel ? { ...c, [field]: value } : c)),
    );
  };

  // Save a single channel's updates
  const saveChannel = async (channel: string) => {
    const entry = catalog.find((c) => c.channel === channel);
    if (!entry) return;

    setSaving(channel);
    try {
      const res = await fetch('/api/superadmin/channel-catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          updates: {
            enabled: entry.enabled,
            comingSoon: entry.comingSoon,
            displayName: entry.displayName,
            description: entry.description,
            sortOrder: entry.sortOrder,
            connectionMethod: entry.connectionMethod,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`${entry.displayName} updated`);
    } catch (err) {
      console.error('[ChannelCatalog] save failed:', err);
      toast.error(`Failed to update ${entry.displayName}`);
    } finally {
      setSaving(null);
    }
  };

  // Quick toggle: cycle through available → coming_soon → hidden
  const cycleStatus = async (channel: string) => {
    const entry = catalog.find((c) => c.channel === channel);
    if (!entry) return;
    const currentStatus = getStatus(entry);
    let newEnabled: boolean;
    let newComingSoon: boolean;
    if (currentStatus === 'available') {
      newEnabled = false; newComingSoon = true; // → coming soon
    } else if (currentStatus === 'coming_soon') {
      newEnabled = false; newComingSoon = false; // → hidden
    } else {
      newEnabled = true; newComingSoon = false; // → available
    }
    updateField(channel, 'enabled', newEnabled);
    updateField(channel, 'comingSoon', newComingSoon);
    // Auto-save the toggle
    setTimeout(() => {
      setCatalog((prev) => {
        const e = prev.find((c) => c.channel === channel);
        if (!e) return prev;
        setSaving(channel);
        fetch('/api/superadmin/channel-catalog', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel,
            updates: { enabled: newEnabled, comingSoon: newComingSoon },
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            toast.success(`${e.displayName} → ${newEnabled ? 'Available' : newComingSoon ? 'Coming Soon' : 'Hidden'}`);
          })
          .catch((err) => {
            console.error('[ChannelCatalog] toggle failed:', err);
            toast.error(`Failed to update ${e.displayName}`);
          })
          .finally(() => setSaving(null));
        return prev;
      });
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group channels by status for the UI
  const available = catalog.filter((c) => getStatus(c) === 'available');
  const comingSoon = catalog.filter((c) => getStatus(c) === 'coming_soon');
  const hidden = catalog.filter((c) => getStatus(c) === 'hidden');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Channel Catalog</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Control which communication channels Fieseros offers to tenants. Hidden channels are
            not shown in the tenant UI at all.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{available.length}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{comingSoon.length}</p>
              <p className="text-xs text-muted-foreground">Coming Soon</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <EyeOff className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{hidden.length}</p>
              <p className="text-xs text-muted-foreground">Hidden</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available channels */}
      <ChannelGroup
        title="Available Channels"
        description="Tenants can connect these channels in their workspace."
        channels={available}
        onCycleStatus={cycleStatus}
        onUpdateField={updateField}
        onSave={saveChannel}
        saving={saving}
      />

      {/* Coming soon */}
      {comingSoon.length > 0 && (
        <ChannelGroup
          title="Coming Soon"
          description="Shown to tenants with a badge — they can't connect yet."
          channels={comingSoon}
          onCycleStatus={cycleStatus}
          onUpdateField={updateField}
          onSave={saveChannel}
          saving={saving}
        />
      )}

      {/* Hidden */}
      {hidden.length > 0 && (
        <ChannelGroup
          title="Hidden Channels"
          description="Not shown to tenants. Kept in schema for future use."
          channels={hidden}
          onCycleStatus={cycleStatus}
          onUpdateField={updateField}
          onSave={saveChannel}
          saving={saving}
          muted
        />
      )}
    </div>
  );
}

// ─── Channel Group (a status section) ──────────────────────────────────────

interface ChannelGroupProps {
  title: string;
  description: string;
  channels: ChannelCatalogEntry[];
  onCycleStatus: (channel: string) => void;
  onUpdateField: (channel: string, field: keyof ChannelCatalogEntry, value: unknown) => void;
  onSave: (channel: string) => void;
  saving: string | null;
  muted?: boolean;
}

function ChannelGroup({
  title, description, channels, onCycleStatus, onUpdateField, onSave, saving, muted,
}: ChannelGroupProps) {
  if (channels.length === 0) return null;
  return (
    <Card className={muted ? 'opacity-60' : ''}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {channels.map((c) => (
          <ChannelRow
            key={c.channel}
            entry={c}
            onCycleStatus={() => onCycleStatus(c.channel)}
            onUpdateField={(field, value) => onUpdateField(c.channel, field, value)}
            onSave={() => onSave(c.channel)}
            saving={saving === c.channel}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Single Channel Row ─────────────────────────────────────────────────────

interface ChannelRowProps {
  entry: ChannelCatalogEntry;
  onCycleStatus: () => void;
  onUpdateField: (field: keyof ChannelCatalogEntry, value: unknown) => void;
  onSave: () => void;
  saving: boolean;
}

function ChannelRow({ entry, onCycleStatus, onUpdateField, onSave, saving }: ChannelRowProps) {
  const status = getStatus(entry);
  return (
    <div className="flex items-start gap-4 py-3 border-b last:border-0">
      {/* Drag handle (visual only — reordering not implemented in O1.5) */}
      <GripVertical className="h-5 w-5 text-muted-foreground/40 mt-2 flex-shrink-0" />

      {/* Color dot */}
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: (entry.color || '#6b7280') + '20' }}
      >
        <div
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: entry.color || '#6b7280' }}
        />
      </div>

      {/* Channel info + editable fields */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            value={entry.displayName}
            onChange={(e) => onUpdateField('displayName', e.target.value)}
            className="h-8 w-auto font-medium"
            placeholder="Display name"
          />
          <Badge variant="outline" className="font-mono text-xs">
            {entry.channel}
          </Badge>
          <StatusBadge status={status} />
        </div>
        <Input
          value={entry.description}
          onChange={(e) => onUpdateField('description', e.target.value)}
          className="h-8 text-sm"
          placeholder="Description shown in tenant UI"
        />
      </div>

      {/* Sort order */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <Label className="text-xs text-muted-foreground">Order</Label>
        <Input
          type="number"
          value={entry.sortOrder}
          onChange={(e) => onUpdateField('sortOrder', parseInt(e.target.value) || 0)}
          className="h-8 w-16 text-center"
        />
      </div>

      {/* Status cycle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onCycleStatus}
        disabled={saving}
        className="flex-shrink-0"
        title="Click to cycle: Available → Coming Soon → Hidden → Available"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === 'available' ? (
          <>
            <Eye className="h-4 w-4 mr-1" /> Available
          </>
        ) : status === 'coming_soon' ? (
          <>
            <Clock className="h-4 w-4 mr-1" /> Coming Soon
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4 mr-1" /> Hidden
          </>
        )}
      </Button>

      {/* Save */}
      <Button
        size="sm"
        onClick={onSave}
        disabled={saving}
        className="flex-shrink-0"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  if (status === 'available') {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Available</Badge>;
  }
  if (status === 'coming_soon') {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Coming Soon</Badge>;
  }
  return <Badge variant="secondary">Hidden</Badge>;
}
