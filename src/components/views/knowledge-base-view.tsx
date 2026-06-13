'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookMarked,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreHorizontal,
  FileText,
  FolderOpen,
  Eye,
  Globe,
  Lock,
  ThumbsUp,
  ThumbsDown,
  X,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────
interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tagsJson: string;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  authorId: string | null;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ArticlesResponse {
  articles: KnowledgeArticle[];
  pagination: Pagination;
}

// ── Constants ──────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'getting_started', label: 'Getting Started' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'faq', label: 'FAQ' },
  { value: 'guides', label: 'Guides' },
  { value: 'policies', label: 'Policies' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  getting_started: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  troubleshooting: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  faq: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  guides: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  policies: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  getting_started: 'Getting Started',
  troubleshooting: 'Troubleshooting',
  faq: 'FAQ',
  guides: 'Guides',
  policies: 'Policies',
};

interface ArticleFormData {
  title: string;
  content: string;
  category: string;
  tagsInput: string;
  isPublic: boolean;
  isActive: boolean;
}

const EMPTY_FORM: ArticleFormData = {
  title: '',
  content: '',
  category: 'general',
  tagsInput: '',
  isPublic: false,
  isActive: true,
};

// ── Helpers ────────────────────────────────────────────────────
function tagsJsonToString(tagsJson: string): string {
  try {
    const arr = JSON.parse(tagsJson);
    if (Array.isArray(arr)) return arr.join(', ');
    return tagsJson;
  } catch {
    return tagsJson;
  }
}

function stringToTagsJson(input: string): string {
  if (!input.trim()) return '[]';
  const tags = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return JSON.stringify(tags);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

// ── Component ──────────────────────────────────────────────────
export function KnowledgeBaseView() {
  // State
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [publicFilter, setPublicFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Form
  const [form, setForm] = useState<ArticleFormData>(EMPTY_FORM);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [viewArticle, setViewArticle] = useState<KnowledgeArticle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch articles ─────────────────────────────────────────
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('isActive', 'false'); // Show all articles (both active and inactive)
      if (search.trim()) params.set('search', search.trim());
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (publicFilter && publicFilter !== 'all') params.set('isPublic', publicFilter);

      const data = await apiGet<ArticlesResponse>(`/api/knowledge-base?${params.toString()}`);
      setArticles(data.articles);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, publicFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ── Stats ──────────────────────────────────────────────────
  const totalArticles = pagination?.total ?? articles.length;
  const uniqueCategories = new Set(articles.map((a) => a.category)).size;
  const publishedCount = articles.filter((a) => a.isPublic).length;

  // ── Create ─────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      await apiPost('/api/knowledge-base', {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        tagsJson: stringToTagsJson(form.tagsInput),
        isPublic: form.isPublic,
        isActive: form.isActive,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      fetchArticles();
    } catch (err) {
      console.error('Failed to create article:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────
  const openEdit = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setForm({
      title: article.title,
      content: article.content,
      category: article.category,
      tagsInput: tagsJsonToString(article.tagsJson),
      isPublic: article.isPublic,
      isActive: article.isActive,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedArticle || !form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      await apiPut(`/api/knowledge-base/${selectedArticle.id}`, {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        tagsJson: stringToTagsJson(form.tagsInput),
        isPublic: form.isPublic,
        isActive: form.isActive,
      });
      setEditOpen(false);
      setSelectedArticle(null);
      setForm(EMPTY_FORM);
      fetchArticles();
    } catch (err) {
      console.error('Failed to update article:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── View ───────────────────────────────────────────────────
  const openView = async (article: KnowledgeArticle) => {
    setViewArticle(article);
    setViewOpen(true);
    try {
      const full = await apiGet<KnowledgeArticle>(`/api/knowledge-base/${article.id}`);
      setViewArticle(full);
    } catch (err) {
      console.error('Failed to fetch article:', err);
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const confirmDelete = (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedArticle) return;
    try {
      await apiDelete(`/api/knowledge-base/${selectedArticle.id}`);
      setDeleteOpen(false);
      setSelectedArticle(null);
      fetchArticles();
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  // ── Render: Article Form Dialog ────────────────────────────
  const renderFormDialog = (
    open: boolean,
    onOpenChange: (open: boolean) => void,
    title: string,
    description: string,
    onSubmit: () => void,
    submitLabel: string,
  ) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="article-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="article-title"
              placeholder="Article title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="article-content">
              Content <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="article-content"
              placeholder="Write the article content here..."
              className="min-h-[200px]"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="article-category">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger id="article-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="article-tags">Tags</Label>
            <Input
              id="article-tags"
              placeholder="Enter tags separated by commas"
              value={form.tagsInput}
              onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
            />
          </div>

          {/* Switches */}
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            <div className="flex items-center gap-3">
              <Switch
                id="article-public"
                checked={form.isPublic}
                onCheckedChange={(v) => setForm({ ...form, isPublic: v })}
              />
              <Label htmlFor="article-public" className="flex items-center gap-1.5 cursor-pointer">
                {form.isPublic ? (
                  <Globe className="size-3.5 text-emerald-600" />
                ) : (
                  <Lock className="size-3.5 text-muted-foreground" />
                )}
                Public
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="article-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="article-active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || !form.title.trim() || !form.content.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? 'Saving...' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Render: View Article Dialog ────────────────────────────
  const renderViewDialog = () => (
    <Dialog open={viewOpen} onOpenChange={setViewOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        {viewArticle && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl">{viewArticle.title}</DialogTitle>
                <Badge className={CATEGORY_COLORS[viewArticle.category] || CATEGORY_COLORS.general}>
                  {CATEGORY_LABELS[viewArticle.category] || viewArticle.category}
                </Badge>
                {viewArticle.isPublic ? (
                  <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-300">
                    <Globe className="size-3" /> Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Lock className="size-3" /> Private
                  </Badge>
                )}
                {!viewArticle.isActive && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    Inactive
                  </Badge>
                )}
              </div>
              <DialogDescription>
                Created {formatDate(viewArticle.createdAt)} · Updated {formatDate(viewArticle.updatedAt)}
              </DialogDescription>
            </DialogHeader>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="size-4" /> {viewArticle.viewCount} views
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="size-4 text-emerald-600" /> {viewArticle.helpfulCount} helpful
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDown className="size-4 text-red-500" /> {viewArticle.notHelpfulCount} not helpful
              </span>
            </div>

            {/* Tags */}
            {(() => {
              try {
                const tags = JSON.parse(viewArticle.tagsJson);
                if (Array.isArray(tags) && tags.length > 0) {
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  );
                }
              } catch {
                // ignore
              }
              return null;
            })()}

            {/* Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed border rounded-lg p-4 bg-muted/30">
              {viewArticle.content}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setViewOpen(false);
                  openEdit(viewArticle);
                }}
              >
                <Pencil className="size-4 mr-1.5" /> Edit
              </Button>
              <Button variant="outline" onClick={() => setViewOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  // ── Render: Delete Confirmation ────────────────────────────
  const renderDeleteDialog = () => (
    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Article</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{selectedArticle?.title}&rdquo;? This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ── Render: Skeleton Loading ───────────────────────────────
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/3 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center justify-between mt-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ── Render: Empty State ────────────────────────────────────
  const renderEmpty = () => (
    <Card>
      <CardContent className="p-12">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <BookMarked className="size-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold">
            {search || categoryFilter !== 'all' || publicFilter !== 'all'
              ? 'No articles match your filters'
              : 'No articles yet'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {search || categoryFilter !== 'all' || publicFilter !== 'all'
              ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
              : 'Create your first knowledge base article to start building your documentation library.'}
          </p>
          {!search && categoryFilter === 'all' && publicFilter === 'all' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setForm(EMPTY_FORM);
                setCreateOpen(true);
              }}
            >
              <Plus className="size-4 mr-1.5" /> Create Article
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ── Render: Article Card ───────────────────────────────────
  const renderArticleCard = (article: KnowledgeArticle) => {
    const tags: string[] = (() => {
      try {
        const parsed = JSON.parse(article.tagsJson);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    return (
      <Card
        key={article.id}
        className="group hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => openView(article)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base leading-snug line-clamp-2">
                {article.title}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    openView(article);
                  }}
                >
                  <Eye className="size-4 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(article);
                  }}
                >
                  <Pencil className="size-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(article);
                  }}
                >
                  <Trash2 className="size-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <Badge className={`text-xs ${CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general}`}>
              {CATEGORY_LABELS[article.category] || article.category}
            </Badge>
            {article.isPublic ? (
              <Badge variant="outline" className="text-xs gap-0.5 text-emerald-600 border-emerald-300">
                <Globe className="size-2.5" /> Public
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-0.5 text-muted-foreground">
                <Lock className="size-2.5" /> Private
              </Badge>
            )}
            {!article.isActive && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Inactive
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {truncate(article.content, 120)}
          </p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Eye className="size-3" /> {article.viewCount}
            </span>
            <span>{formatDate(article.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Main Render ────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <BookMarked className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Knowledge Base</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage help articles and documentation
            </p>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreateOpen(true);
          }}
        >
          <Plus className="size-4 mr-1.5" /> New Article
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <FileText className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : totalArticles}</p>
                <p className="text-xs text-muted-foreground">Total Articles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <FolderOpen className="size-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : uniqueCategories}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Globe className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{loading ? '—' : publishedCount}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="size-4" />
              Filters
              {(categoryFilter !== 'all' || publicFilter !== 'all') && (
                <span className="size-2 rounded-full bg-emerald-600" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end mt-3 pt-3 border-t">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">Visibility</Label>
                <Select value={publicFilter} onValueChange={setPublicFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Public</SelectItem>
                    <SelectItem value="false">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(categoryFilter !== 'all' || publicFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => {
                    setCategoryFilter('all');
                    setPublicFilter('all');
                  }}
                >
                  <X className="size-3 mr-1" /> Clear filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Articles Grid */}
      {loading ? (
        renderSkeletons()
      ) : articles.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map(renderArticleCard)}
        </div>
      )}

      {/* Dialogs */}
      {renderFormDialog(
        createOpen,
        setCreateOpen,
        'Create Article',
        'Add a new article to the knowledge base.',
        handleCreate,
        'Create',
      )}
      {renderFormDialog(
        editOpen,
        setEditOpen,
        'Edit Article',
        'Update the article details.',
        handleEdit,
        'Save Changes',
      )}
      {renderViewDialog()}
      {renderDeleteDialog()}
    </div>
  );
}
