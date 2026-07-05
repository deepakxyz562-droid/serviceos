'use client';

/**
 * AssetsSection — Customer 360 "Equipment & Assets" tab.
 *
 * Shows:
 *   • Asset cards with type-specific icons, brand/model, serial, install date,
 *     warranty status badge, location, and an expandable service history list.
 *   • Add-asset dialog with full form (name, type, brand, model, serial, dates,
 *     warranty, location, notes).
 *   • Edit-asset dialog (re-uses the same form).
 *   • Asset detail dialog with service history + add-service-history form.
 *   • Soft-delete (status='disposed') via DELETE.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Package, Wind, Zap, Sun, Droplet, Wrench, Trash2, Pencil,
  ChevronDown, ChevronRight, Calendar, MapPin, Settings2, History,
  Loader2, ShieldCheck, ShieldAlert, ShieldX, X, Save, DollarSign,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CustomerAsset {
  id: string;
  customerId: string;
  name: string;
  assetType: string; // ac | generator | solar | purifier | other
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  installationDate?: string | null;
  warrantyStart?: string | null;
  warrantyEnd?: string | null;
  warrantyStatus: string; // active | expired | none
  location?: string | null;
  notes?: string | null;
  photosJson?: string;
  documentsJson?: string;
  status: string; // active | inactive | disposed
  createdAt: string;
  updatedAt: string;
}

export interface AssetServiceHistoryEntry {
  id: string;
  assetId: string;
  jobId?: string | null;
  serviceDate: string;
  serviceType?: string | null;
  performedBy?: string | null;
  performedByName?: string | null;
  notes?: string | null;
  cost: number;
  partsReplaced?: string | null;
  nextServiceDate?: string | null;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ASSET_TYPE_META: Record<string, { label: string; icon: typeof Wind; color: string }> = {
  ac: { label: 'AC', icon: Wind, color: 'text-sky-500 bg-sky-50' },
  generator: { label: 'Generator', icon: Zap, color: 'text-amber-500 bg-amber-50' },
  solar: { label: 'Solar', icon: Sun, color: 'text-orange-500 bg-orange-50' },
  purifier: { label: 'Purifier', icon: Droplet, color: 'text-emerald-500 bg-emerald-50' },
  other: { label: 'Other', icon: Package, color: 'text-muted-foreground bg-muted' },
};

const ASSET_TYPES = [
  { value: 'ac', label: 'AC' },
  { value: 'generator', label: 'Generator' },
  { value: 'solar', label: 'Solar' },
  { value: 'purifier', label: 'Water Purifier' },
  { value: 'other', label: 'Other' },
];

const WARRANTY_STATUS_META: Record<string, { label: string; icon: typeof ShieldCheck; className: string }> = {
  active: { label: 'Under warranty', icon: ShieldCheck, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  expired: { label: 'Warranty expired', icon: ShieldAlert, className: 'bg-red-100 text-red-700 border-red-200' },
  none: { label: 'No warranty', icon: ShieldX, className: 'bg-gray-100 text-gray-700 border-gray-200' },
};

const SERVICE_TYPES = [
  { value: 'install', label: 'Installation' },
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

function getAssetTypeMeta(type: string) {
  return ASSET_TYPE_META[type] || ASSET_TYPE_META.other;
}
function getWarrantyMeta(status: string) {
  return WARRANTY_STATUS_META[status] || WARRANTY_STATUS_META.none;
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function toDateInput(d?: string | null): string {
  if (!d) return '';
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

// ─── Form state ─────────────────────────────────────────────────────────────

interface AssetFormState {
  name: string;
  assetType: string;
  brand: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  warrantyStart: string;
  warrantyEnd: string;
  location: string;
  notes: string;
}

const EMPTY_FORM: AssetFormState = {
  name: '',
  assetType: 'ac',
  brand: '',
  model: '',
  serialNumber: '',
  installationDate: '',
  warrantyStart: '',
  warrantyEnd: '',
  location: '',
  notes: '',
};

function formFromAsset(a: CustomerAsset): AssetFormState {
  return {
    name: a.name,
    assetType: a.assetType,
    brand: a.brand || '',
    model: a.model || '',
    serialNumber: a.serialNumber || '',
    installationDate: toDateInput(a.installationDate),
    warrantyStart: toDateInput(a.warrantyStart),
    warrantyEnd: toDateInput(a.warrantyEnd),
    location: a.location || '',
    notes: a.notes || '',
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AssetsSection({ customerId }: { customerId: string }) {
  const [assets, setAssets] = useState<CustomerAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [serviceHistoryMap, setServiceHistoryMap] = useState<Record<string, AssetServiceHistoryEntry[]>>({});
  const [loadingHistoryFor, setLoadingHistoryFor] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CustomerAsset | null>(null);
  const [form, setForm] = useState<AssetFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteAsset, setDeleteAsset] = useState<CustomerAsset | null>(null);

  const [detailAsset, setDetailAsset] = useState<CustomerAsset | null>(null);

  // ── Load assets ───────────────────────────────────────────────────────
  const loadAssets = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/assets`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load assets');
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // ── Load service history for an asset (when expanded) ─────────────────
  const loadServiceHistory = useCallback(async (assetId: string) => {
    setLoadingHistoryFor(assetId);
    try {
      const res = await fetch(`/api/customers/${customerId}/assets/${assetId}/service-history`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load service history');
      const data = await res.json();
      setServiceHistoryMap((prev) => ({ ...prev, [assetId]: data.serviceHistory || [] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load service history');
    } finally {
      setLoadingHistoryFor(null);
    }
  }, [customerId]);

  const toggleExpand = useCallback((assetId: string) => {
    setExpandedAssetId((prev) => {
      const next = prev === assetId ? null : assetId;
      if (next && !serviceHistoryMap[next]) {
        void loadServiceHistory(next);
      }
      return next;
    });
  }, [serviceHistoryMap, loadServiceHistory]);

  // ── Add/Edit handlers ─────────────────────────────────────────────────
  const openAdd = () => {
    setEditingAsset(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };
  const openEdit = (asset: CustomerAsset) => {
    setEditingAsset(asset);
    setForm(formFromAsset(asset));
    setDialogOpen(true);
  };

  const handleSaveAsset = async () => {
    if (!form.name.trim()) {
      toast.error('Asset name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        assetType: form.assetType,
        brand: form.brand || null,
        model: form.model || null,
        serialNumber: form.serialNumber || null,
        installationDate: form.installationDate || null,
        warrantyStart: form.warrantyStart || null,
        warrantyEnd: form.warrantyEnd || null,
        location: form.location || null,
        notes: form.notes || null,
      };
      let res: Response;
      if (editingAsset) {
        res = await fetch(`/api/customers/${customerId}/assets/${editingAsset.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/customers/${customerId}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to save');
      }
      const data = await res.json();
      toast.success(editingAsset ? 'Asset updated' : 'Asset added');
      setDialogOpen(false);
      if (editingAsset) {
        setAssets((prev) => prev.map((a) => (a.id === editingAsset.id ? data.asset : a)));
      } else {
        setAssets((prev) => [data.asset, ...prev]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAsset) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/assets/${deleteAsset.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to delete');
      }
      toast.success('Asset removed');
      setAssets((prev) => prev.filter((a) => a.id !== deleteAsset.id));
      setDeleteAsset(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const onServiceHistoryAdded = (assetId: string) => {
    void loadServiceHistory(assetId);
    loadAssets();
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-emerald-600" />
        <span className="ml-2 text-sm text-muted-foreground">Loading equipment…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="size-4 text-emerald-600" />
            Equipment & Assets
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track installed equipment, warranties, and service history.
          </p>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={openAdd}>
          <Plus className="size-3.5" /> Add Asset
        </Button>
      </div>

      {/* Asset cards */}
      {assets.length === 0 ? (
        <Card>
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <Package className="size-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">No equipment tracked yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Add ACs, generators, solar panels, water purifiers, or any other equipment
              installed at this customer&apos;s site to keep a full service history.
            </p>
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openAdd}>
              <Plus className="size-3.5" /> Add your first asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {assets.map((asset) => {
            const typeMeta = getAssetTypeMeta(asset.assetType);
            const warrantyMeta = getWarrantyMeta(asset.warrantyStatus);
            const Icon = typeMeta.icon;
            const expanded = expandedAssetId === asset.id;
            const history = serviceHistoryMap[asset.id] || [];
            return (
              <Card key={asset.id} className="form-card overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Top: icon + name + actions */}
                  <div className="flex items-start gap-3">
                    <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', typeMeta.color)}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setDetailAsset(asset)}
                        className="text-left"
                      >
                        <p className="text-sm font-semibold text-foreground hover:text-emerald-700 truncate">
                          {asset.name}
                        </p>
                      </button>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          {typeMeta.label}
                        </Badge>
                        {asset.brand && (
                          <span className="text-[11px] text-muted-foreground">
                            {asset.brand}{asset.model ? ` · ${asset.model}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => openEdit(asset)}
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteAsset(asset)}
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Warranty badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-[10px] py-0 px-1.5 gap-0.5', warrantyMeta.className)}>
                      <warrantyMeta.icon className="size-3" />
                      {warrantyMeta.label}
                      {asset.warrantyEnd && ` · ${formatDate(asset.warrantyEnd)}`}
                    </Badge>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    {asset.serialNumber && (
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Serial</p>
                        <p className="font-mono text-foreground truncate">{asset.serialNumber}</p>
                      </div>
                    )}
                    {asset.installationDate && (
                      <div>
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Installed</p>
                        <p className="text-foreground inline-flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground" />
                          {formatDate(asset.installationDate)}
                        </p>
                      </div>
                    )}
                    {asset.location && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-[10px] uppercase tracking-wide">Location</p>
                        <p className="text-foreground inline-flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground" />
                          {asset.location}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Service history expandable */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(asset.id)}
                    className="w-full flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 hover:bg-muted/60 transition-colors"
                  >
                    <span className="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
                      <History className="size-3.5 text-emerald-600" />
                      Service history
                      {history.length > 0 && (
                        <Badge className="text-[9px] py-0 px-1.5 bg-emerald-100 text-emerald-700">
                          {history.length}
                        </Badge>
                      )}
                    </span>
                    {loadingHistoryFor === asset.id ? (
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                    ) : expanded ? (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {expanded && (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {history.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic px-1">No service records yet.</p>
                      ) : (
                        history.map((h) => (
                          <div key={h.id} className="rounded-md border border-border/60 bg-background px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium capitalize text-foreground">
                                {h.serviceType || 'Service'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(h.serviceDate)}
                              </span>
                            </div>
                            {h.notes && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{h.notes}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              {h.performedByName && <span>by {h.performedByName}</span>}
                              {h.cost > 0 && (
                                <span className="inline-flex items-center gap-0.5">
                                  <DollarSign className="size-2.5" />
                                  {h.cost.toFixed(2)}
                                </span>
                              )}
                              {h.nextServiceDate && (
                                <span>Next: {formatDate(h.nextServiceDate)}</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Add/Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit asset' : 'Add new asset'}</DialogTitle>
            <DialogDescription>
              Track installed equipment and warranty info for this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="asset-name">Asset name *</Label>
                <Input
                  id="asset-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Living Room AC"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-type">Type *</Label>
                <Select value={form.assetType} onValueChange={(v) => setForm({ ...form, assetType: v })}>
                  <SelectTrigger id="asset-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-brand">Brand</Label>
                <Input
                  id="asset-brand"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="e.g. Daikin"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-model">Model</Label>
                <Input
                  id="asset-model"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="e.g. FTKM50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-serial">Serial number</Label>
                <Input
                  id="asset-serial"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  placeholder="Serial / asset tag"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-install">Installation date</Label>
                <Input
                  id="asset-install"
                  type="date"
                  value={form.installationDate}
                  onChange={(e) => setForm({ ...form, installationDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-location">Location</Label>
                <Input
                  id="asset-location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Living Room, Rooftop"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-warr-start">Warranty start</Label>
                <Input
                  id="asset-warr-start"
                  type="date"
                  value={form.warrantyStart}
                  onChange={(e) => setForm({ ...form, warrantyStart: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asset-warr-end">Warranty end</Label>
                <Input
                  id="asset-warr-end"
                  type="date"
                  value={form.warrantyEnd}
                  onChange={(e) => setForm({ ...form, warrantyEnd: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="asset-notes">Notes</Label>
                <Textarea
                  id="asset-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Any extra details about this equipment"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={handleSaveAsset} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {editingAsset ? 'Save changes' : 'Add asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Asset detail dialog (with service history + add entry) ──── */}
      <AssetDetailDialog
        asset={detailAsset}
        onClose={() => setDetailAsset(null)}
        customerId={customerId}
        onServiceHistoryAdded={onServiceHistoryAdded}
      />

      {/* ─── Delete confirmation ─────────────────────────────────────── */}
      <AlertDialog open={!!deleteAsset} onOpenChange={(o) => !o && setDeleteAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAsset && (
                <>
                  <strong>{deleteAsset.name}</strong> will be marked as disposed. The record
                  and its service history are retained for audit purposes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Asset detail dialog with service history ───────────────────────────────

function AssetDetailDialog({
  asset,
  onClose,
  customerId,
  onServiceHistoryAdded,
}: {
  asset: CustomerAsset | null;
  onClose: () => void;
  customerId: string;
  onServiceHistoryAdded: (assetId: string) => void;
}) {
  const [history, setHistory] = useState<AssetServiceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    serviceDate: new Date().toISOString().slice(0, 10),
    serviceType: 'maintenance',
    performedByName: '',
    notes: '',
    cost: '',
    partsReplaced: '',
    nextServiceDate: '',
  });

  useEffect(() => {
    if (!asset) return;
    setLoading(true);
    setShowAddForm(false);
    setForm({
      serviceDate: new Date().toISOString().slice(0, 10),
      serviceType: 'maintenance',
      performedByName: '',
      notes: '',
      cost: '',
      partsReplaced: '',
      nextServiceDate: '',
    });
    fetch(`/api/customers/${customerId}/assets/${asset.id}/service-history`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : { serviceHistory: [] })
      .then((d) => setHistory(d.serviceHistory || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [asset, customerId]);

  const handleAddHistory = async () => {
    if (!asset) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/assets/${asset.id}/service-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceDate: form.serviceDate,
          serviceType: form.serviceType,
          performedByName: form.performedByName || null,
          notes: form.notes || null,
          cost: form.cost ? Number(form.cost) : 0,
          partsReplaced: form.partsReplaced || null,
          nextServiceDate: form.nextServiceDate || null,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to add');
      }
      const data = await res.json();
      setHistory((prev) => [data.serviceHistory, ...prev]);
      toast.success('Service record added');
      setShowAddForm(false);
      setForm({
        serviceDate: new Date().toISOString().slice(0, 10),
        serviceType: 'maintenance',
        performedByName: '',
        notes: '',
        cost: '',
        partsReplaced: '',
        nextServiceDate: '',
      });
      onServiceHistoryAdded(asset.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add service record');
    } finally {
      setAdding(false);
    }
  };

  if (!asset) return null;
  const typeMeta = getAssetTypeMeta(asset.assetType);
  const warrantyMeta = getWarrantyMeta(asset.warrantyStatus);
  const Icon = typeMeta.icon;

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn('size-8 rounded-md flex items-center justify-center', typeMeta.color)}>
              <Icon className="size-4" />
            </div>
            {asset.name}
            <Badge variant="outline" className="text-[10px]">{typeMeta.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            Asset details and full service history.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-1">
          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem label="Brand" value={asset.brand} />
            <DetailItem label="Model" value={asset.model} />
            <DetailItem label="Serial" value={asset.serialNumber} mono />
            <DetailItem label="Location" value={asset.location} />
            <DetailItem label="Installed" value={formatDate(asset.installationDate)} />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Warranty</p>
              <Badge variant="outline" className={cn('text-[10px] gap-0.5 mt-0.5', warrantyMeta.className)}>
                <warrantyMeta.icon className="size-3" />
                {warrantyMeta.label}
              </Badge>
              {asset.warrantyEnd && (
                <p className="text-[11px] text-muted-foreground mt-0.5">until {formatDate(asset.warrantyEnd)}</p>
              )}
            </div>
          </div>

          {asset.notes && (
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{asset.notes}</p>
            </div>
          )}

          {/* Service history */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold inline-flex items-center gap-1.5">
                <History className="size-4 text-emerald-600" />
                Service history
                {history.length > 0 && (
                  <Badge className="text-[9px] bg-emerald-100 text-emerald-700">{history.length}</Badge>
                )}
              </h4>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddForm((s) => !s)}>
                {showAddForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                {showAddForm ? 'Cancel' : 'Add record'}
              </Button>
            </div>

            {showAddForm && (
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Service date</Label>
                    <Input
                      type="date"
                      value={form.serviceDate}
                      onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Type</Label>
                    <Select value={form.serviceType} onValueChange={(v) => setForm({ ...form, serviceType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SERVICE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Performed by</Label>
                    <Input
                      value={form.performedByName}
                      onChange={(e) => setForm({ ...form, performedByName: e.target.value })}
                      placeholder="Technician name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Cost</Label>
                    <Input
                      type="number"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px]">Parts replaced</Label>
                    <Input
                      value={form.partsReplaced}
                      onChange={(e) => setForm({ ...form, partsReplaced: e.target.value })}
                      placeholder="e.g. Filter, capacitor"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[11px]">Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={2}
                      placeholder="What was done"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Next service date</Label>
                    <Input
                      type="date"
                      value={form.nextServiceDate}
                      onChange={(e) => setForm({ ...form, nextServiceDate: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                  onClick={handleAddHistory}
                  disabled={adding}
                >
                  {adding ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  Save record
                </Button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                No service records yet.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="rounded-md border border-border/60 bg-background px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium capitalize text-foreground">
                        {h.serviceType || 'Service'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(h.serviceDate)}</span>
                    </div>
                    {h.notes && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{h.notes}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                      {h.performedByName && <span>by {h.performedByName}</span>}
                      {h.cost > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <DollarSign className="size-2.5" /> {h.cost.toFixed(2)}
                        </span>
                      )}
                      {h.partsReplaced && <span>Parts: {h.partsReplaced}</span>}
                      {h.nextServiceDate && <span>Next: {formatDate(h.nextServiceDate)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-sm text-foreground', mono && 'font-mono')}>{value || '—'}</p>
    </div>
  );
}

export default AssetsSection;
