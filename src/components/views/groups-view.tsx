'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderTree, Plus, Search, Trash2, Edit, ChevronRight, ChevronDown,
  Users, X, Loader2, Mail, Phone, UserPlus, UserMinus, Folder,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  type: string;
  parentGroupId: string | null;
  smartRulesJson: string | null;
  memberCount: number;
  isDefault: boolean;
  tenantId: string;
  createdAt: string;
}

interface GroupContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags?: string | null;
  contactTags?: { tag: { id: string; name: string; color: string | null } }[];
}

interface ContactPick {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Slate', value: '#64748b' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function GroupsView() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupContacts, setGroupContacts] = useState<GroupContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [showAddContactsDialog, setShowAddContactsDialog] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0].value,
    type: 'manual',
    parentGroupId: '',
    smartRulesJson: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const [addSearch, setAddSearch] = useState('');
  const [pickableContacts, setPickableContacts] = useState<ContactPick[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [pickLoading, setPickLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // ── Load groups ──
  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/groups?limit=200');
      if (res.ok) {
        const result = await res.json();
        setGroups(result.data || []);
      } else {
        setError('Failed to load groups');
        toast.error('Failed to load groups');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading groups');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // Build tree from flat list
  const buildTree = (flat: Group[]): Group[] => {
    const byParent = new Map<string | null, Group[]>();
    flat.forEach(g => {
      const key = g.parentGroupId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(g);
    });
    byParent.forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
    return byParent.get(null) || [];
  };

  const tree = buildTree(filteredGroups);

  const getChildren = (id: string): Group[] => {
    return groups.filter(g => g.parentGroupId === id)
      .filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Create / Edit ──
  const openCreate = () => {
    setEditTarget(null);
    setCreateForm({
      name: '', description: '', color: PRESET_COLORS[0].value,
      type: 'manual', parentGroupId: '', smartRulesJson: '',
    });
    setShowCreateDialog(true);
  };

  const openEdit = (group: Group) => {
    setEditTarget(group);
    setCreateForm({
      name: group.name,
      description: group.description ?? '',
      color: group.color ?? PRESET_COLORS[0].value,
      type: group.type ?? 'manual',
      parentGroupId: group.parentGroupId ?? '',
      smartRulesJson: group.smartRulesJson ?? '',
    });
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!createForm.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        color: createForm.color,
        type: createForm.type,
      };
      if (createForm.parentGroupId) payload.parentGroupId = createForm.parentGroupId;
      if (createForm.type === 'smart' && createForm.smartRulesJson.trim()) {
        payload.smartRulesJson = createForm.smartRulesJson.trim();
      }

      const url = editTarget ? `/api/groups/${editTarget.id}` : '/api/groups';
      const method = editTarget ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        const data: Group = result.data ?? result;
        if (editTarget) {
          setGroups(prev => prev.map(g => g.id === data.id ? { ...g, ...data } : g));
          toast.success('Group updated');
        } else {
          setGroups(prev => [data, ...prev]);
          toast.success('Group created');
        }
        setShowCreateDialog(false);
      } else {
        const errText = await res.text().catch(() => '');
        toast.error(`Failed to save group${errText ? `: ${errText}` : ''}`);
      }
    } catch {
      toast.error('Network error saving group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/groups/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setGroups(prev => prev.filter(g => g.id !== deleteTarget.id && g.parentGroupId !== deleteTarget.id));
        toast.success('Group deleted');
        setDeleteTarget(null);
      } else {
        toast.error('Failed to delete group');
      }
    } catch {
      toast.error('Network error deleting group');
    }
  };

  // ── Group contacts ──
  const openGroupContacts = async (group: Group) => {
    setSelectedGroup(group);
    setShowContactsDialog(true);
    setContactsLoading(true);
    setGroupContacts([]);
    try {
      const res = await fetch(`/api/groups/${group.id}/contacts?limit=100`);
      if (res.ok) {
        const result = await res.json();
        setGroupContacts(result.data || []);
      } else {
        toast.error('Failed to load group contacts');
      }
    } catch {
      toast.error('Network error loading contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  const loadPickableContacts = useCallback(async () => {
    setPickLoading(true);
    try {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(addSearch)}&limit=50`);
      if (res.ok) {
        const result = await res.json();
        const list: ContactPick[] = Array.isArray(result) ? result : (result.data || []);
        // exclude contacts already in group
        const existing = new Set(groupContacts.map(c => c.id));
        setPickableContacts(list.filter(c => !existing.has(c.id)));
      }
    } catch {
      toast.error('Failed to load contacts');
    } finally {
      setPickLoading(false);
    }
  }, [addSearch, groupContacts]);

  useEffect(() => {
    if (showAddContactsDialog) {
      setSelectedContactIds(new Set());
      loadPickableContacts();
    }
  }, [showAddContactsDialog, loadPickableContacts]);

  const togglePick = (id: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddContacts = async () => {
    if (!selectedGroup || selectedContactIds.size === 0) {
      toast.error('Select at least one contact to add');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: Array.from(selectedContactIds) }),
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(`Added ${result.added ?? selectedContactIds.size} contacts`);
        setShowAddContactsDialog(false);
        // refresh group contacts + bump member count
        await openGroupContacts(selectedGroup);
        setGroups(prev => prev.map(g =>
          g.id === selectedGroup.id
            ? { ...g, memberCount: g.memberCount + (result.added ?? selectedContactIds.size) }
            : g
        ));
      } else {
        toast.error('Failed to add contacts');
      }
    } catch {
      toast.error('Network error adding contacts');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromGroup = async (contactId: string) => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: [contactId] }),
      });
      if (res.ok) {
        const result = await res.json();
        setGroupContacts(prev => prev.filter(c => c.id !== contactId));
        setGroups(prev => prev.map(g =>
          g.id === selectedGroup.id
            ? { ...g, memberCount: Math.max(0, g.memberCount - (result.removed ?? 1)) }
            : g
        ));
        toast.success('Contact removed');
      } else {
        toast.error('Failed to remove contact');
      }
    } catch {
      toast.error('Network error removing contact');
    }
  };

  // ── Render ──
  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
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
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full mt-2" />
            </Card>
          ))}
        </div>
        <Card className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <FolderTree className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load groups</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadGroups}>
          <Loader2 className="size-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const totalMembers = groups.reduce((s, g) => s + (g.memberCount || 0), 0);
  const topLevelCount = groups.filter(g => !g.parentGroupId).length;

  const renderGroupNode = (group: Group, depth: number) => {
    const children = getChildren(group.id);
    const hasChildren = children.length > 0 || groups.some(g => g.parentGroupId === group.id);
    const isExpanded = expandedIds.has(group.id);
    const dotColor = group.color || '#10b981';

    return (
      <div key={group.id}>
        <div
          className={cn(
            'group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-emerald-500/5 transition-colors cursor-pointer',
            depth > 0 && 'ml-4'
          )}
          style={{ paddingLeft: `${8 + depth * 18}px` }}
          onClick={() => openGroupContacts(group)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(group.id);
            }}
            className={cn('size-5 flex items-center justify-center text-muted-foreground hover:text-foreground', !hasChildren && 'invisible')}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          <span
            className="size-3 rounded-full shrink-0 border border-black/10"
            style={{ backgroundColor: dotColor }}
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{group.name}</span>
              {group.type === 'smart' && (
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-amber-500/10 text-amber-700 border-amber-500/30">
                  SMART
                </Badge>
              )}
              {group.isDefault && (
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-slate-500/10 text-slate-600 border-slate-500/30">
                  DEFAULT
                </Badge>
              )}
            </div>
            {group.description && (
              <p className="text-xs text-muted-foreground truncate">{group.description}</p>
            )}
          </div>
          <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
            <Users className="size-3 mr-1" />
            {group.memberCount}
          </Badge>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={(e) => { e.stopPropagation(); openEdit(group); }}
              aria-label="Edit group"
            >
              <Edit className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-rose-600 hover:text-rose-700"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(group); }}
              aria-label="Delete group"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {children.map(child => renderGroupNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <FolderTree className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Groups</h2>
            <p className="text-sm text-muted-foreground">Organize contacts into groups &amp; sub-groups</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" /> New Group
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Folder className="size-4 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Groups</p>
              <p className="text-lg font-bold">{groups.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <FolderTree className="size-4 text-teal-600" />
            <div>
              <p className="text-xs text-muted-foreground">Top-level</p>
              <p className="text-lg font-bold">{topLevelCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Members</p>
              <p className="text-lg font-bold">{totalMembers.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tree */}
      {tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderTree className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No groups yet</p>
          <p className="text-sm mt-1">Create your first contact group to organize your audience</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
            <Plus className="size-4 mr-1.5" /> New Group
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-2">
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-0.5">
                {tree.map(g => renderGroupNode(g, 0))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Group' : 'New Group'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update group details.' : 'Create a new contact group.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="g-name">Name</Label>
              <Input
                id="g-name"
                placeholder="e.g. VIP Customers"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-desc">Description</Label>
              <Textarea
                id="g-desc"
                placeholder="Optional description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, color: c.value })}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-all',
                      createForm.color === c.value
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-border hover:border-emerald-400'
                    )}
                  >
                    <span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: c.value }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(v) => setCreateForm({ ...createForm, type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="smart">Smart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parent Group</Label>
                <Select
                  value={createForm.parentGroupId || 'none'}
                  onValueChange={(v) => setCreateForm({ ...createForm, parentGroupId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {groups
                      .filter(g => g.id !== editTarget?.id)
                      .map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {createForm.type === 'smart' && (
              <div className="space-y-2">
                <Label htmlFor="g-rules">Smart Rules (JSON)</Label>
                <Textarea
                  id="g-rules"
                  placeholder='[{"field":"country","op":"equals","value":"US"}]'
                  value={createForm.smartRulesJson}
                  onChange={(e) => setCreateForm({ ...createForm, smartRulesJson: e.target.value })}
                  rows={3}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Smart groups auto-populate based on contact attributes.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editTarget ? 'Save Changes' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete group?</DialogTitle>
            <DialogDescription>
              This will remove <strong>{deleteTarget?.name}</strong> and unlink all its contacts.
              Sub-groups will be promoted to top-level. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="size-4 mr-1.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Contacts Dialog */}
      <Dialog open={showContactsDialog} onOpenChange={setShowContactsDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedGroup && (
                <span
                  className="size-3 rounded-full border border-black/10"
                  style={{ backgroundColor: selectedGroup.color || '#10b981' }}
                  aria-hidden
                />
              )}
              {selectedGroup?.name ?? 'Group'} — Members
            </DialogTitle>
            <DialogDescription>
              {selectedGroup?.description || 'Contacts assigned to this group.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {groupContacts.length} contact(s)
            </p>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setShowAddContactsDialog(true)}
            >
              <UserPlus className="size-4 mr-1.5" /> Add Contacts
            </Button>
          </div>
          <Separator />
          <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
            {contactsLoading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : groupContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Users className="size-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">No contacts in this group</p>
                <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAddContactsDialog(true)}>
                  <UserPlus className="size-4 mr-1.5" /> Add Contacts
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupContacts.map(c => {
                    const initials = (c.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{c.name || '—'}</p>
                              {c.company && <p className="text-[10px] text-muted-foreground">{c.company}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.email ? (
                            <span className="inline-flex items-center gap-1"><Mail className="size-3" />{c.email}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.phone ? (
                            <span className="inline-flex items-center gap-1"><Phone className="size-3" />{c.phone}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-rose-600 hover:text-rose-700"
                            onClick={() => handleRemoveFromGroup(c.id)}
                            aria-label="Remove from group"
                          >
                            <UserMinus className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Contacts Picker */}
      <Dialog open={showAddContactsDialog} onOpenChange={setShowAddContactsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Contacts to {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Search and select contacts to add to this group.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{selectedContactIds.size} selected</span>
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => setSelectedContactIds(new Set(pickableContacts.map(c => c.id)))}
            >
              Select all
            </button>
          </div>
          <Separator />
          <ScrollArea className="flex-1 min-h-0 max-h-[45vh]">
            {pickLoading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : pickableContacts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No contacts available</p>
            ) : (
              <div className="space-y-1">
                {pickableContacts.map(c => {
                  const sel = selectedContactIds.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => togglePick(c.id)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                        sel ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30' : 'hover:bg-muted'
                      )}
                    >
                      <div
                        className={cn(
                          'size-4 rounded border flex items-center justify-center shrink-0',
                          sel ? 'bg-emerald-600 border-emerald-600' : 'border-input'
                        )}
                      >
                        {sel && <svg viewBox="0 0 24 24" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <Avatar className="size-6">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
                          {(c.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name || '—'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.email || c.phone || 'No contact info'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContactsDialog(false)} disabled={adding}>
              <X className="size-4 mr-1.5" /> Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleAddContacts}
              disabled={adding || selectedContactIds.size === 0}
            >
              {adding && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Add {selectedContactIds.size > 0 ? `(${selectedContactIds.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
