'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  BookOpen, Plus, Search, Eye, Trash2, Pencil,
  Globe, Lock, Eye as EyeIcon, Tag, HelpCircle,
  FileText, FolderOpen, Clock,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type KBCategory = 'faq' | 'document' | 'sop' | 'service_guide' | 'pricing' | 'internal';

interface KBItem {
  id: string;
  title: string;
  category: string;
  isPublic: boolean;
  content: string;
  tagsJson: string;
  viewCount: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  authorId: string | null;
}

interface KBFormData {
  title: string;
  category: KBCategory;
  isPublic: boolean;
  content: string;
  tags: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  faq: { label: 'FAQ', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <HelpCircle className="size-3" /> },
  document: { label: 'Document', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: <FileText className="size-3" /> },
  sop: { label: 'SOP', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <BookOpen className="size-3" /> },
  service_guide: { label: 'Service Guide', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <FolderOpen className="size-3" /> },
  pricing: { label: 'Pricing', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: <Tag className="size-3" /> },
  internal: { label: 'Internal', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: <Lock className="size-3" /> },
};

const CATEGORY_TABS = [
  { value: 'all', label: 'All' },
  { value: 'faq', label: 'FAQs' },
  { value: 'document', label: 'Documents' },
  { value: 'sop', label: 'SOPs' },
  { value: 'service_guide', label: 'Service Guides' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'internal', label: 'Internal' },
];

const EMPTY_FORM = (): KBFormData => ({
  title: '', category: 'faq', isPublic: true, content: '', tags: '',
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function KnowledgeBaseView() {
  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);
  const [form, setForm] = useState<KBFormData>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KBItem | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('isActive', 'true');
      params.set('limit', '100');

      const res = await authFetch(`/api/knowledge-base?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.articles || []);
    } catch (err) {
      console.error('Error fetching knowledge articles:', err);
      toast.error('Failed to load knowledge base articles');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = {
    total: items.length,
    publicCount: items.filter((i) => i.isPublic).length,
    internalCount: items.filter((i) => !i.isPublic).length,
    categories: new Set(items.map((i) => i.category)).size,
  };

  // ─── Handlers ───────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM());
    setShowCreateDialog(true);
  };

  const openEditDialog = (item: KBItem) => {
    setEditingItem(item);
    setForm({
      title: item.title,
      category: item.category as KBCategory,
      isPublic: item.isPublic,
      content: item.content,
      tags: parseTags(item.tagsJson).join(', '),
    });
    setShowCreateDialog(true);
  };

  const openDetailDialog = (item: KBItem) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.content.trim()) { toast.error('Content is required'); return; }
    setSaving(true);
    try {
      const tagsArray = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        isPublic: form.isPublic,
        isActive: true,
        tagsJson: JSON.stringify(tagsArray),
      };

      if (editingItem) {
        const res = await authFetch(`/api/knowledge-base/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update');
        toast.success('Article updated');
      } else {
        const res = await authFetch('/api/knowledge-base', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create');
        toast.success('Article created');
      }
      setShowCreateDialog(false);
      setEditingItem(null);
      fetchArticles();
    } catch (err) {
      console.error('Error saving article:', err);
      toast.error('Failed to save article');
    } finally {
      setSaving(false);
    }
  }, [form, editingItem, fetchArticles]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await authFetch(`/api/knowledge-base/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Article deleted');
      if (selectedItem?.id === id) { setShowDetailDialog(false); setSelectedItem(null); }
      fetchArticles();
    } catch (err) {
      console.error('Error deleting article:', err);
      toast.error('Failed to delete article');
    }
  }, [selectedItem, fetchArticles]);

  // ─── Loading Skeletons ──────────────────────────────────────────────────

  const renderLoadingSkeletons = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="size-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-14" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ViewHeader
        icon={BookOpen}
        iconBg="bg-orange-600"
        title="Knowledge Base"
        description="Manage FAQs, documents, SOPs, service guides, and pricing"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1.5" /> Add Article
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Articles', value: stats.total, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Public', value: stats.publicCount, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Internal', value: stats.internalCount, icon: Lock, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Categories', value: stats.categories, icon: FolderOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg font-bold truncate">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-xl shrink-0`}><Icon className={`size-4 ${stat.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Category Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-auto">
          <TabsList className="h-9 flex-wrap">
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2">{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search articles, tags..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Content */}
      {loading ? renderLoadingSkeletons() : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No articles found"
          description={categoryFilter !== 'all' || searchQuery ? 'Adjust your filters or search query' : 'Start by adding your first knowledge base article'}
          actionLabel="Add Article"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.faq;
            const tags = parseTags(item.tagsJson);
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openDetailDialog(item)}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold truncate group-hover:text-emerald-700 transition-colors">{item.title}</CardTitle>
                      <CardDescription className="text-xs mt-0.5 truncate">{formatDate(item.updatedAt)}</CardDescription>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditDialog(item); }}>
                        <Pencil className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>
                      {catConfig.icon} {catConfig.label}
                    </Badge>
                    {item.isPublic ? (
                      <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200"><Globe className="size-3 mr-0.5" /> Public</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 bg-gray-100 text-gray-600 border-gray-200"><Lock className="size-3 mr-0.5" /> Internal</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{item.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <EyeIcon className="size-3" /> {item.viewCount} views
                    </div>
                    {tags.length > 0 && (
                      <div className="flex gap-1">
                        {tags.slice(0, 2).map((t) => <Badge key={t} variant="secondary" className="text-[10px] h-4">{t}</Badge>)}
                        {tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="size-5 text-orange-600" />
              {editingItem ? 'Edit Article' : 'Add Article'}
            </DialogTitle>
            <DialogDescription>{editingItem ? 'Update knowledge base article' : 'Add a new knowledge base article'}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-4 pr-3">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input placeholder="Article title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as KBCategory }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, val]) => <SelectItem key={key} value={key}>{val.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={form.isPublic ? 'public' : 'internal'} onValueChange={(v) => setForm((p) => ({ ...p, isPublic: v === 'public' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea placeholder="Article content..." value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={6} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input placeholder="e.g., booking, ac, installation" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${(CATEGORY_CONFIG[selectedItem.category] || CATEGORY_CONFIG.faq).bg} ${(CATEGORY_CONFIG[selectedItem.category] || CATEGORY_CONFIG.faq).text} ${(CATEGORY_CONFIG[selectedItem.category] || CATEGORY_CONFIG.faq).border}`}>
                    {(CATEGORY_CONFIG[selectedItem.category] || CATEGORY_CONFIG.faq).label}
                  </Badge>
                  {selectedItem.isPublic ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><Globe className="size-3 mr-0.5" /> Public</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-600 border-gray-200"><Lock className="size-3 mr-0.5" /> Internal</Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[55vh] pr-1">
                <div className="space-y-4 pr-3">
                  <div className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap">{selectedItem.content}</div>
                  {parseTags(selectedItem.tagsJson).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {parseTags(selectedItem.tagsJson).map((t) => <Badge key={t} variant="secondary" className="text-[10px] h-5">{t}</Badge>)}
                    </div>
                  )}
                  <Separator />
                  <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div><p className="font-medium">Views</p><p>{selectedItem.viewCount}</p></div>
                    <div><p className="font-medium">Created</p><p>{formatDate(selectedItem.createdAt)}</p></div>
                    <div><p className="font-medium">Updated</p><p>{formatDate(selectedItem.updatedAt)}</p></div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={() => { openEditDialog(selectedItem); setShowDetailDialog(false); }}>
                  <Pencil className="size-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDetailDialog(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
