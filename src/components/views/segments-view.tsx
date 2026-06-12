'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Filter, Trash2,
  Eye, X, Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  type: string;
  memberCount: number;
  matchLogic: string;
  rulesJson: string;
  isDefault: boolean;
  color?: string;
  icon?: string;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FILTER_FIELDS = [
  { value: 'service_type', label: 'Service Type' },
  { value: 'city', label: 'City' },
  { value: 'country', label: 'Country' },
  { value: 'customer_tags', label: 'Customer Tags' },
  { value: 'revenue', label: 'Revenue ($)' },
  { value: 'last_booking', label: 'Last Booking (days)' },
  { value: 'last_message', label: 'Last Message (days)' },
  { value: 'campaign_engagement', label: 'Campaign Engagement (%)' },
  { value: 'source', label: 'Lead Source' },
  { value: 'lead_status', label: 'Lead Status' },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'more_than', label: 'More Than (days)' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function SegmentsView() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', description: '', matchLogic: 'and',
    filters: [{ id: 'f-new-1', field: 'service_type', operator: 'equals', value: '' }] as FilterRow[],
  });

  // ── Load segments from API ──
  const loadSegments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/segments?limit=50');
      if (res.ok) {
        const result = await res.json();
        setSegments(result.data || []);
      } else {
        setError('Failed to load segments');
        toast.error('Failed to load segments');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading segments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  const filteredSegments = segments.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!createForm.name) { toast.error('Segment name is required'); return; }

    setIsCreating(true);
    try {
      const res = await fetch('/api/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description,
          type: 'dynamic',
          matchLogic: createForm.matchLogic,
          rulesJson: JSON.stringify(createForm.filters.filter(f => f.value)),
          memberCount: 0,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setSegments(prev => [result.data, ...prev]);
        setShowCreateDialog(false);
        setCreateForm({ name: '', description: '', matchLogic: 'and', filters: [{ id: 'f-new-1', field: 'service_type', operator: 'equals', value: '' }] });
        toast.success('Segment created');
      } else {
        toast.error('Failed to create segment');
      }
    } catch {
      toast.error('Failed to create segment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/segments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSegments(prev => prev.filter(s => s.id !== id));
        toast.success('Segment deleted');
      }
    } catch {
      toast.error('Failed to delete segment');
    }
  };

  const addFilterRow = () => {
    setCreateForm(prev => ({
      ...prev,
      filters: [...prev.filters, { id: `f-${Date.now()}`, field: 'service_type', operator: 'equals', value: '' }],
    }));
  };

  const removeFilterRow = (id: string) => {
    setCreateForm(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== id),
    }));
  };

  const updateFilterRow = (id: string, key: keyof FilterRow, value: string) => {
    setCreateForm(prev => ({
      ...prev,
      filters: prev.filters.map(f => f.id === id ? { ...f, [key]: value } : f),
    }));
  };

  const parseRules = (rulesJson: string): FilterRow[] => {
    try {
      const rules = JSON.parse(rulesJson || '[]');
      if (Array.isArray(rules)) return rules;
      return [];
    } catch {
      return [];
    }
  };

  const totalMembers = segments.reduce((s, seg) => s + seg.memberCount, 0);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-44 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="flex items-center gap-2"><Skeleton className="size-4" /><div><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-8 mt-1" /></div></div></Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4"><div className="space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /><Skeleton className="h-8 w-full" /></div></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <Users className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load segments</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadSegments}>
          <Loader2 className="size-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Segments</h2>
            <p className="text-sm text-muted-foreground">Customer segmentation engine</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
          <Plus className="size-4 mr-1.5" /> Create Segment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <Card className="p-4"><div className="flex items-center gap-2"><Users className="size-4 text-emerald-600" /><div><p className="text-xs text-muted-foreground">Total Segments</p><p className="text-lg font-bold">{segments.length}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><Users className="size-4 text-sky-600" /><div><p className="text-xs text-muted-foreground">Total Members</p><p className="text-lg font-bold">{totalMembers.toLocaleString()}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><Filter className="size-4 text-purple-600" /><div><p className="text-xs text-muted-foreground">Dynamic</p><p className="text-lg font-bold">{segments.filter(s => s.type === 'dynamic').length}</p></div></div></Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search segments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Segments List */}
      {filteredSegments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No segments found</p>
          <p className="text-sm mt-1">Create your first customer segment</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Segment
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredSegments.map(segment => {
            const rules = parseRules(segment.rulesJson);
            return (
              <Card key={segment.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{segment.name}</h4>
                        {segment.isDefault && <Badge variant="secondary" className="text-[9px] h-4">Default</Badge>}
                        <Badge variant="outline" className="text-[9px] h-4">{segment.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{segment.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedSegment(segment); setShowMembersDialog(true); }}>
                        <Eye className="size-3.5" />
                      </Button>
                      {!segment.isDefault && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(segment.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      <Users className="size-3 mr-1" /> {segment.memberCount} members
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{segment.matchLogic.toUpperCase()} logic</Badge>
                  </div>
                  {rules.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                      {rules.slice(0, 3).map((filter, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span className="font-medium">{FILTER_FIELDS.find(f => f.value === filter.field)?.label || filter.field}</span>
                          <span>{OPERATORS.find(o => o.value === filter.operator)?.label || filter.operator}</span>
                          <span className="font-medium text-emerald-600">&quot;{filter.value}&quot;</span>
                        </div>
                      ))}
                      {rules.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">+{rules.length - 3} more filters</p>
                      )}
                    </div>
                  )}
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
              <Input placeholder="e.g., Inactive Customers" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="What is this segment for?" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Match Logic</Label>
              <Select value={createForm.matchLogic} onValueChange={v => setCreateForm({ ...createForm, matchLogic: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">Match ALL conditions (AND)</SelectItem>
                  <SelectItem value="or">Match ANY condition (OR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Filter Conditions</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addFilterRow}>
                  <Plus className="size-3 mr-1" /> Add Filter
                </Button>
              </div>
              {createForm.filters.map((filter, idx) => (
                <div key={filter.id} className="flex items-center gap-2">
                  {idx > 0 && <Badge variant="secondary" className="text-[9px] shrink-0">{createForm.matchLogic.toUpperCase()}</Badge>}
                  <Select value={filter.field} onValueChange={v => updateFilterRow(filter.id, 'field', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FILTER_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filter.operator} onValueChange={v => updateFilterRow(filter.id, 'operator', v)}>
                    <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="h-8 text-xs" placeholder="Value" value={filter.value} onChange={e => updateFilterRow(filter.id, 'value', e.target.value)} />
                  {createForm.filters.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => removeFilterRow(filter.id)}>
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name || isCreating}>
              {isCreating ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Save Segment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSegment?.name} - Members</DialogTitle>
            <DialogDescription>{selectedSegment?.memberCount || 0} customers in this segment</DialogDescription>
          </DialogHeader>
          {selectedSegment && selectedSegment.memberCount > 0 ? (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Member list will be calculated dynamically when the segment is evaluated.
                  <br />
                  <span className="font-medium">{selectedSegment.memberCount} members matched</span>
                </p>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <Users className="size-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No members yet. This segment needs to be evaluated.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setShowMembersDialog(false); toast.info('Segment evaluation will run automatically'); }}>
                Evaluate Now
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
