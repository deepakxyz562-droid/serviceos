'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Tag as TagIcon, Plus, Search, Trash2, Edit, Loader2, Users,
  Mail, Phone, X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

interface Tag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  contactCount: number;
  createdAt?: string;
}

interface TagContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Stone', value: '#78716c' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function TagsView() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Tag | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [tagContacts, setTagContacts] = useState<TagContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsTotal, setContactsTotal] = useState(0);

  const [createForm, setCreateForm] = useState({
    name: '',
    color: PRESET_COLORS[0].value,
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // ── Load tags ──
  const loadTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tags?limit=200');
      if (res.ok) {
        const result = await res.json();
        setTags(result.data || []);
      } else {
        setError('Failed to load tags');
        toast.error('Failed to load tags');
      }
    } catch {
      setError('Network error. Please check your connection.');
      toast.error('Network error loading tags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadTags(); }, [loadTags]);

  const filteredTags = tags.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Create / Edit ──
  const openCreate = () => {
    setEditTarget(null);
    setCreateForm({ name: '', color: PRESET_COLORS[0].value, description: '' });
    setShowCreateDialog(true);
  };

  const openEdit = (tag: Tag) => {
    setEditTarget(tag);
    setCreateForm({
      name: tag.name,
      color: tag.color ?? PRESET_COLORS[0].value,
      description: tag.description ?? '',
    });
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!createForm.name.trim()) {
      toast.error('Tag name is required');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        color: createForm.color,
        description: createForm.description.trim(),
      };
      const url = editTarget ? `/api/tags/${editTarget.id}` : '/api/tags';
      const method = editTarget ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        const data: Tag = result.data ?? result;
        if (editTarget) {
          setTags(prev => prev.map(t => t.id === data.id ? { ...t, ...data } : t));
          toast.success('Tag updated');
        } else {
          setTags(prev => [{ ...data, contactCount: 0 }, ...prev]);
          toast.success('Tag created');
        }
        setShowCreateDialog(false);
      } else {
        const errText = await res.text().catch(() => '');
        toast.error(`Failed to save tag${errText ? `: ${errText}` : ''}`);
      }
    } catch {
      toast.error('Network error saving tag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/tags/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setTags(prev => prev.filter(t => t.id !== deleteTarget.id));
        toast.success('Tag deleted');
        setDeleteTarget(null);
      } else {
        toast.error('Failed to delete tag');
      }
    } catch {
      toast.error('Network error deleting tag');
    }
  };

  // ── Tag contacts ──
  const openTagContacts = async (tag: Tag, page = 1) => {
    setSelectedTag(tag);
    setShowContactsDialog(true);
    setContactsPage(page);
    setContactsLoading(true);
    setTagContacts([]);
    try {
      // Use the contacts API with tagId filter (paginated)
      const res = await fetch(`/api/contacts?tagId=${tag.id}&page=${page}&limit=20`);
      if (res.ok) {
        const result = await res.json();
        const list = Array.isArray(result) ? result : (result.data || []);
        setTagContacts(list);
        setContactsTotal(result.pagination?.total ?? list.length);
      } else {
        toast.error('Failed to load contacts');
      }
    } catch {
      toast.error('Network error loading contacts');
    } finally {
      setContactsLoading(false);
    }
  };

  const contactsTotalPages = Math.max(1, Math.ceil(contactsTotal / 20));

  // ── Render ──
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-40 mt-1" />
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full mt-2" />
            </Card>
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <TagIcon className="size-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">Failed to load tags</p>
        <p className="text-sm mt-1">{error}</p>
        <Button className="mt-4" variant="outline" onClick={loadTags}>
          <Loader2 className="size-4 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const totalTagged = tags.reduce((s, t) => s + (t.contactCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <TagIcon className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Tags</h2>
            <p className="text-sm text-muted-foreground">Labels for granular contact segmentation</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" /> New Tag
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TagIcon className="size-4 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Tags</p>
              <p className="text-lg font-bold">{tags.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-teal-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Tagged</p>
              <p className="text-lg font-bold">{totalTagged.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TagIcon className="size-4 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Avg / Tag</p>
              <p className="text-lg font-bold">
                {tags.length === 0 ? '0' : Math.round(totalTagged / tags.length)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <TagIcon className="size-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">No tags found</p>
          <p className="text-sm mt-1">Create your first tag to label contacts</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
            <Plus className="size-4 mr-1.5" /> New Tag
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredTags.map(tag => (
            <Card
              key={tag.id}
              className="group relative cursor-pointer hover:shadow-md hover:border-emerald-300 transition-all"
              onClick={() => openTagContacts(tag)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="size-5 rounded-md shrink-0 border border-black/10"
                      style={{ backgroundColor: tag.color || '#10b981' }}
                      aria-hidden
                    />
                    <h3 className="font-semibold text-sm truncate">{tag.name}</h3>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={(e) => { e.stopPropagation(); openEdit(tag); }}
                      aria-label="Edit tag"
                    >
                      <Edit className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-rose-600 hover:text-rose-700"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(tag); }}
                      aria-label="Delete tag"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 min-h-[2rem]">
                  {tag.description || 'No description'}
                </p>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    <Users className="size-3 mr-1" />
                    {tag.contactCount} contacts
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">Click to view</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Tag' : 'New Tag'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update tag details.' : 'Create a new tag to label contacts.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="t-name">Name</Label>
              <Input
                id="t-name"
                placeholder="e.g. Newsletter Subscriber"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-desc">Description</Label>
              <Textarea
                id="t-desc"
                placeholder="Optional description"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, color: c.value })}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-[10px] transition-all',
                      createForm.color === c.value
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-border hover:border-emerald-400'
                    )}
                  >
                    <span
                      className="size-5 rounded-md border border-black/10"
                      style={{ backgroundColor: c.value }}
                      aria-hidden
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editTarget ? 'Save Changes' : 'Create Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete tag?</DialogTitle>
            <DialogDescription>
              This will remove <strong>{deleteTarget?.name}</strong> and unlink it from all contacts.
              This cannot be undone.
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

      {/* Tag Contacts Dialog */}
      <Dialog open={showContactsDialog} onOpenChange={setShowContactsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTag && (
                <span
                  className="size-3 rounded-full border border-black/10"
                  style={{ backgroundColor: selectedTag.color || '#10b981' }}
                  aria-hidden
                />
              )}
              {selectedTag?.name ?? 'Tag'} — Contacts
            </DialogTitle>
            <DialogDescription>
              {contactsTotal} contact(s) tagged with this label.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
            {contactsLoading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : tagContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Users className="size-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">No contacts with this tag</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tagContacts.map(c => {
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          {contactsTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={contactsPage <= 1 || contactsLoading}
                onClick={() => selectedTag && openTagContacts(selectedTag, contactsPage - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {contactsPage} of {contactsTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={contactsPage >= contactsTotalPages || contactsLoading}
                onClick={() => selectedTag && openTagContacts(selectedTag, contactsPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
