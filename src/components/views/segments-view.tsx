'use client';

import { useState } from 'react';
import {
  Users, Plus, Search, Filter, Trash2, Edit2, Save, X,
  ChevronDown, ChevronUp, Copy, Eye,
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
import { Input as InputComponent } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

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
  memberCount: number;
  matchLogic: 'AND' | 'OR';
  filters: FilterRow[];
  isPrebuilt: boolean;
  createdAt: string;
}

interface SegmentMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  revenue: number;
  lastBooking: string;
  tags: string[];
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_SEGMENTS: Segment[] = [
  { id: 'seg1', name: 'Inactive 30 Days', description: 'Customers with no activity in 30 days', memberCount: 145, matchLogic: 'AND', filters: [{ id: 'f1', field: 'last_message', operator: 'more_than', value: '30' }, { id: 'f2', field: 'last_booking', operator: 'more_than', value: '30' }], isPrebuilt: true, createdAt: '2025-01-15' },
  { id: 'seg2', name: 'VIP Customers', description: 'High-value customers with $1000+ revenue', memberCount: 67, matchLogic: 'OR', filters: [{ id: 'f3', field: 'revenue', operator: 'greater_than', value: '1000' }, { id: 'f4', field: 'customer_tags', operator: 'contains', value: 'VIP' }], isPrebuilt: true, createdAt: '2025-01-10' },
  { id: 'seg3', name: 'Window Cleaning Customers', description: 'Customers who booked window cleaning', memberCount: 89, matchLogic: 'AND', filters: [{ id: 'f5', field: 'service_type', operator: 'equals', value: 'window_cleaning' }], isPrebuilt: true, createdAt: '2025-02-01' },
  { id: 'seg4', name: 'New Customers (30 days)', description: 'Recently acquired customers', memberCount: 34, matchLogic: 'AND', filters: [{ id: 'f6', field: 'last_booking', operator: 'less_than', value: '30' }, { id: 'f7', field: 'revenue', operator: 'less_than', value: '500' }], isPrebuilt: false, createdAt: '2025-03-01' },
  { id: 'seg5', name: 'High Engagement', description: 'Customers who engage with campaigns', memberCount: 210, matchLogic: 'AND', filters: [{ id: 'f8', field: 'campaign_engagement', operator: 'greater_than', value: '50' }], isPrebuilt: false, createdAt: '2025-02-20' },
];

const MOCK_MEMBERS: SegmentMember[] = [
  { id: 'm1', name: 'Alex Rivera', email: 'alex@email.com', phone: '+1 555-0101', revenue: 4500, lastBooking: '2 days ago', tags: ['VIP'] },
  { id: 'm2', name: 'Maria Santos', email: 'maria@email.com', phone: '+1 555-0102', revenue: 2800, lastBooking: '5 min ago', tags: ['cleaning'] },
  { id: 'm3', name: 'Robert Kim', email: 'robert@email.com', phone: '+1 555-0105', revenue: 6200, lastBooking: '1 hr ago', tags: ['VIP', 'commercial'] },
  { id: 'm4', name: 'James Wilson', email: 'james@email.com', phone: '+1 555-0103', revenue: 800, lastBooking: '1 day ago', tags: ['plumbing'] },
  { id: 'm5', name: 'Sophie Chen', email: 'sophie@email.com', phone: '+1 555-0104', revenue: 1200, lastBooking: '3 days ago', tags: ['packing'] },
];

const FILTER_FIELDS = [
  { value: 'service_type', label: 'Service Type' },
  { value: 'city', label: 'City' },
  { value: 'country', label: 'Country' },
  { value: 'customer_tags', label: 'Customer Tags' },
  { value: 'revenue', label: 'Revenue ($)' },
  { value: 'last_booking', label: 'Last Booking (days)' },
  { value: 'last_message', label: 'Last Message (days)' },
  { value: 'campaign_engagement', label: 'Campaign Engagement (%)' },
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
  const [segments, setSegments] = useState<Segment[]>(MOCK_SEGMENTS);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', description: '', matchLogic: 'AND' as 'AND' | 'OR',
    filters: [{ id: 'f-new-1', field: 'service_type', operator: 'equals', value: '' }] as FilterRow[],
  });

  const filteredSegments = segments.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!createForm.name) { toast.error('Segment name is required'); return; }
    const newSegment: Segment = {
      id: `seg-${Date.now()}`, name: createForm.name, description: createForm.description,
      memberCount: Math.floor(Math.random() * 200), matchLogic: createForm.matchLogic,
      filters: createForm.filters, isPrebuilt: false, createdAt: new Date().toISOString().split('T')[0],
    };
    setSegments(prev => [newSegment, ...prev]);
    setShowCreateDialog(false);
    setCreateForm({ name: '', description: '', matchLogic: 'AND', filters: [{ id: 'f-new-1', field: 'service_type', operator: 'equals', value: '' }] });
    toast.success('Segment created');
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

  const handleDelete = (id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
    toast.success('Segment deleted');
  };

  const totalMembers = segments.reduce((s, seg) => s + seg.memberCount, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={Users}
        title="Segments"
        description="Customer segmentation engine"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> Create Segment
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Total Segments" value={segments.length} icon={Users} />
        <StatCard label="Total Members" value={totalMembers.toLocaleString()} icon={Users} color="text-teal-600" />
        <StatCard label="Pre-built" value={segments.filter(s => s.isPrebuilt).length} icon={Filter} color="text-amber-600" />
        <StatCard label="Custom" value={segments.filter(s => !s.isPrebuilt).length} icon={Plus} color="text-emerald-600" />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search segments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Segments List */}
      {filteredSegments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No segments found"
          description={search ? 'Try adjusting your search' : 'Create your first customer segment to target specific audiences'}
          actionLabel={!search ? 'Create Segment' : undefined}
          onAction={!search ? () => setShowCreateDialog(true) : undefined}
        />
      ) : (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredSegments.map(segment => (
          <Card key={segment.id} className="hover:shadow-md transition-all group">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm truncate">{segment.name}</h4>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${segment.isPrebuilt ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {segment.isPrebuilt ? 'Pre-built' : 'Dynamic'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{segment.description}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedSegment(segment); setShowMembersDialog(true); }}>
                    <Eye className="size-3.5" />
                  </Button>
                  {!segment.isPrebuilt && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleDelete(segment.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-muted/50">
                  <Users className="size-3 mr-1" /> {segment.memberCount.toLocaleString()} members
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-muted/50">{segment.matchLogic} logic</Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                {segment.filters.map((filter, idx) => (
                  <div key={filter.id} className="flex items-center gap-1 flex-wrap">
                    {idx > 0 && <Badge variant="secondary" className="text-[8px] h-4 px-1 shrink-0">{segment.matchLogic}</Badge>}
                    <span className="font-medium">{FILTER_FIELDS.find(f => f.value === filter.field)?.label || filter.field}</span>
                    <span>{OPERATORS.find(o => o.value === filter.operator)?.label || filter.operator}</span>
                    <span className="font-medium text-emerald-600">&quot;{filter.value}&quot;</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
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
              <InputComponent placeholder="e.g., Inactive Customers" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <InputComponent placeholder="What is this segment for?" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Match Logic</Label>
              <Select value={createForm.matchLogic} onValueChange={v => setCreateForm({ ...createForm, matchLogic: v as 'AND' | 'OR' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">Match ALL conditions (AND)</SelectItem>
                  <SelectItem value="OR">Match ANY condition (OR)</SelectItem>
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
                  {idx > 0 && <Badge variant="secondary" className="text-[9px] shrink-0">{createForm.matchLogic}</Badge>}
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
                  <InputComponent className="h-8 text-xs" placeholder="Value" value={filter.value} onChange={e => updateFilterRow(filter.id, 'value', e.target.value)} />
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
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name}>Save Segment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSegment?.name} - Members</DialogTitle>
            <DialogDescription>{selectedSegment?.memberCount} customers in this segment</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Last Booking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_MEMBERS.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6"><AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{member.name[0]}</AvatarFallback></Avatar>
                        <div><p className="text-sm font-medium">{member.name}</p><p className="text-[10px] text-muted-foreground">{member.email}</p></div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">${member.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{member.lastBooking}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
