'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Filter, Trash2, Pencil, RefreshCw,
  Eye, Clock, Target,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Segment {
  id: string;
  name: string;
  description: string | null;
  type: string;
  rulesJson: string;
  matchLogic: string;
  memberCount: number;
  lastCalculated: string | null;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  tenantId: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SegmentForm {
  name: string;
  description: string;
  type: string;
  matchLogic: string;
  rulesJson: string;
  color: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DEFAULT_FORM: SegmentForm = {
  name: '',
  description: '',
  type: 'dynamic',
  matchLogic: 'and',
  rulesJson: '[]',
  color: '#10b981',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '--';
  }
}

function formatRelativeTime(dateStr: string | null) {
  if (!dateStr) return 'Never';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '--';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SegmentsView() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [deletingSegment, setDeletingSegment] = useState<Segment | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<SegmentForm>(DEFAULT_FORM);

  // ─── Fetch segments ─────────────────────────────────────────────────────
  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/segments');
      if (res.ok) {
        const json = await res.json();
        setSegments(Array.isArray(json) ? json : json.data || []);
      }
    } catch {
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  // ─── Filtered list ──────────────────────────────────────────────────────
  const filteredSegments = segments.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // ─── Create ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name) { toast.error('Segment name is required'); return; }
    setSaving(true);
    try {
      const res = await authFetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          memberCount: 0,
        }),
      });
      if (res.ok) {
        toast.success('Segment created');
        setShowCreateDialog(false);
        setForm(DEFAULT_FORM);
        fetchSegments();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create segment');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit ───────────────────────────────────────────────────────────────
  const openEdit = (segment: Segment) => {
    setEditingSegment(segment);
    setForm({
      name: segment.name,
      description: segment.description || '',
      type: segment.type,
      matchLogic: segment.matchLogic,
      rulesJson: segment.rulesJson || '[]',
      color: segment.color || '#10b981',
    });
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!editingSegment || !form.name) { toast.error('Segment name is required'); return; }
    setSaving(true);
    try {
      const res = await authFetch(`/api/segments/${editingSegment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Segment updated');
        setShowEditDialog(false);
        setEditingSegment(null);
        setForm(DEFAULT_FORM);
        fetchSegments();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update segment');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────
  const openDelete = (segment: Segment) => {
    if (segment.isDefault) {
      toast.error('Cannot delete default segment');
      return;
    }
    setDeletingSegment(segment);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingSegment) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/segments/${deletingSegment.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Segment deleted');
        setShowDeleteDialog(false);
        setDeletingSegment(null);
        fetchSegments();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete segment');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────────────
  const totalMembers = segments.reduce((s, seg) => s + seg.memberCount, 0);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={Users}
        title="Segments"
        description="Customer segmentation engine"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => { setForm(DEFAULT_FORM); setShowCreateDialog(true); }}>
            <Plus className="size-4 mr-1.5" /> Create Segment
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total Segments" value={segments.length} icon={Users} />
        <StatCard label="Total Members" value={totalMembers.toLocaleString()} icon={Users} color="text-teal-600" />
        <StatCard label="Dynamic" value={segments.filter(s => s.type === 'dynamic').length} icon={Filter} color="text-amber-600" />
        <StatCard label="Static" value={segments.filter(s => s.type === 'static').length} icon={Target} color="text-emerald-600" />
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search segments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchSegments()}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSegments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No segments found"
          description={search ? 'Try adjusting your search' : 'Create your first customer segment to target specific audiences'}
          actionLabel={!search ? 'Create Segment' : undefined}
          onAction={!search ? () => { setForm(DEFAULT_FORM); setShowCreateDialog(true); } : undefined}
        />
      ) : (
        /* Segments List */
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredSegments.map(segment => {
            let parsedRules: unknown[] = [];
            try { parsedRules = JSON.parse(segment.rulesJson || '[]'); } catch { /* ignore */ }

            return (
              <Card key={segment.id} className="hover:shadow-md transition-all group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm truncate">{segment.name}</h4>
                        <Badge variant="outline" className={`text-[9px] shrink-0 ${segment.type === 'dynamic' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {segment.type}
                        </Badge>
                        {segment.isDefault && (
                          <Badge variant="outline" className="text-[9px] shrink-0 bg-slate-50 text-slate-600 border-slate-200">
                            Default
                          </Badge>
                        )}
                      </div>
                      {segment.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{segment.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(segment)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      {!segment.isDefault && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => openDelete(segment)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Color indicator + member count + match logic */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {segment.color && (
                      <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: segment.color }} />
                    )}
                    <Badge variant="outline" className="text-[10px] bg-muted/50">
                      <Users className="size-3 mr-1" /> {segment.memberCount.toLocaleString()} members
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-muted/50 uppercase">
                      {segment.matchLogic} logic
                    </Badge>
                  </div>

                  {/* Last calculated */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span>Calculated: {formatRelativeTime(segment.lastCalculated)}</span>
                  </div>

                  {/* Parsed rules preview */}
                  {Array.isArray(parsedRules) && parsedRules.length > 0 && (
                    <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                      {parsedRules.slice(0, 3).map((rule: unknown, idx: number) => {
                        const r = rule as Record<string, string>;
                        return (
                          <div key={idx} className="flex items-center gap-1 flex-wrap">
                            {idx > 0 && <Badge variant="secondary" className="text-[8px] h-4 px-1 shrink-0 uppercase">{segment.matchLogic}</Badge>}
                            <span className="font-medium">{r.field || 'field'}</span>
                            <span>{r.operator || 'equals'}</span>
                            <span className="font-medium text-emerald-600">&quot;{r.value || ''}&quot;</span>
                          </div>
                        );
                      })}
                      {parsedRules.length > 3 && (
                        <span className="text-muted-foreground">+{parsedRules.length - 3} more rules</span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-[10px] text-muted-foreground pt-2 border-t">
                    Created {formatDate(segment.createdAt)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Segment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Segment</DialogTitle>
            <DialogDescription>Build a dynamic customer segment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Segment Name *</Label>
              <Input placeholder="e.g., Inactive Customers" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="What is this segment for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dynamic">Dynamic</SelectItem>
                    <SelectItem value="static">Static</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Match Logic</Label>
                <Select value={form.matchLogic} onValueChange={v => setForm({ ...form, matchLogic: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">Match ALL (AND)</SelectItem>
                    <SelectItem value="or">Match ANY (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rules (JSON)</Label>
              <Textarea
                placeholder='[{"field":"last_booking","operator":"more_than","value":"30"}]'
                value={form.rulesJson}
                onChange={e => setForm({ ...form, rulesJson: e.target.value })}
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">JSON array of rule objects with field, operator, and value</p>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="size-8 rounded cursor-pointer border"
                />
                <Input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!form.name || saving}>
              {saving ? 'Creating...' : 'Create Segment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Segment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Segment</DialogTitle>
            <DialogDescription>Update segment configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Segment Name *</Label>
              <Input placeholder="e.g., Inactive Customers" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="What is this segment for?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dynamic">Dynamic</SelectItem>
                    <SelectItem value="static">Static</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Match Logic</Label>
                <Select value={form.matchLogic} onValueChange={v => setForm({ ...form, matchLogic: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">Match ALL (AND)</SelectItem>
                    <SelectItem value="or">Match ANY (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rules (JSON)</Label>
              <Textarea
                placeholder='[{"field":"last_booking","operator":"more_than","value":"30"}]'
                value={form.rulesJson}
                onChange={e => setForm({ ...form, rulesJson: e.target.value })}
                rows={4}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">JSON array of rule objects with field, operator, and value</p>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })}
                  className="size-8 rounded cursor-pointer border"
                />
                <Input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="flex-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!form.name || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Segment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingSegment?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
