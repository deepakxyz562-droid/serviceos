'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Facebook,
  Instagram,
  MapPin,
  Linkedin,
  Image as ImageIcon,
  Twitter,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
  Eye,
  RotateCw,
  Loader2,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Posts List View
 * ---------------
 * Table of SocialPosts with filters + actions.
 *
 * Columns: preview | platforms | status | scheduled/published date | actions
 * Filters: status (all/draft/scheduled/published/failed/partial), platform, search
 * Actions: edit draft, cancel scheduled, delete, retry failed
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface PublishTarget {
  platform: string;
  socialAccountId: string;
  externalPostId?: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  error?: string;
  publishedAt?: string;
}

interface SocialPost {
  id: string;
  status: string;
  content: string;
  mediaUrls: string[];
  linkUrl: string | null;
  publishTargets: PublishTarget[];
  scheduledAt: string | null;
  publishedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { metrics: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Platform icons ────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  googlebusiness: MapPin,
  linkedin: Linkedin,
  pinterest: ImageIcon,
  twitter: Twitter,
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-600',
  instagram: 'bg-pink-600',
  googlebusiness: 'bg-emerald-600',
  linkedin: 'bg-sky-700',
  pinterest: 'bg-red-600',
  twitter: 'bg-zinc-900',
};

// ─── Status badge helpers ──────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string; icon?: React.ElementType }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'outline', icon: Clock },
  publishing: { label: 'Publishing', variant: 'default', icon: Loader2, className: 'animate-pulse' },
  published: { label: 'Published', variant: 'default', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  partial: { label: 'Partial', variant: 'default', icon: AlertTriangle, className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, variant: 'outline' as const };
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className={cn('gap-1', meta.className)}>
      {Icon && <Icon className={cn('size-3', meta.className)} />}
      {meta.label}
    </Badge>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export function PostsListView() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewPost, setViewPost] = useState<SocialPost | null>(null);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (search) params.set('search', search);
      const res = await authFetch(`/api/social/posts?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setPosts(json.data || []);
        setPagination(json.pagination || null);
      } else {
        toast.error('Failed to load posts');
      }
    } catch {
      toast.error('Network error loading posts');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, platformFilter, search]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // ── Actions ──

  const handleRetry = async (post: SocialPost) => {
    setActingOnId(post.id);
    try {
      const res = await authFetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      if (res.ok) {
        toast.success('Retry started — check status in a moment.');
        setTimeout(loadPosts, 1500);
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Retry failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActingOnId(null);
    }
  };

  const handleDelete = async (post: SocialPost) => {
    if (!confirm('Delete this draft? This cannot be undone.')) return;
    setActingOnId(post.id);
    try {
      const res = await authFetch(`/api/social/posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Draft deleted');
        loadPosts();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActingOnId(null);
    }
  };

  // ── Derived ──

  const platformsInPost = useCallback((post: SocialPost) => {
    const set = new Set(post.publishTargets.map((t) => t.platform));
    return Array.from(set);
  }, []);

  const totalEngagement = useCallback((post: SocialPost) => {
    // _count.metrics is the total snapshot count, not engagement — we
    // don't have aggregated engagement here without an extra API call.
    // For the list view we just show the metric snapshot count.
    return post._count?.metrics || 0;
  }, []);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All your social posts — drafts, scheduled, published, and failed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPosts} disabled={isLoading}>
          <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={onSearchSubmit} className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search captions…"
                className="pl-8"
              />
            </form>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="size-3.5 mr-1" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="googlebusiness">Google Business</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="pinterest">Pinterest</SelectItem>
                <SelectItem value="twitter">X</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table — desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">Preview</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <div className="h-12 bg-muted/40 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    No posts found. Try changing filters or create a new post.
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id} className="hover:bg-muted/40">
                    <TableCell>
                      <button
                        className="text-left max-w-md"
                        onClick={() => setViewPost(post)}
                      >
                        <div className="line-clamp-2 text-sm">{post.content || '(empty)'}</div>
                        {post.mediaUrls.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {post.mediaUrls.slice(0, 3).map((url) => (
                              <div
                                key={url}
                                className="size-8 rounded border overflow-hidden bg-muted"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="size-full object-cover" />
                              </div>
                            ))}
                            {post.mediaUrls.length > 3 && (
                              <div className="size-8 rounded border flex items-center justify-center text-xs text-muted-foreground">
                                +{post.mediaUrls.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {platformsInPost(post).map((p) => {
                          const Icon = PLATFORM_ICONS[p];
                          const color = PLATFORM_COLORS[p];
                          if (!Icon || !color) return <span key={p} className="text-xs">{p}</span>;
                          return (
                            <div
                              key={p}
                              className={cn(
                                'flex items-center justify-center size-6 rounded text-white',
                                color,
                              )}
                              title={p}
                            >
                              <Icon className="size-3" />
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={post.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {post.publishedAt ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </div>
                      ) : post.scheduledAt ? (
                        <div className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(post.scheduledAt).toLocaleString()}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(post.createdAt).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 p-0"
                          onClick={() => setViewPost(post)}
                          title="View details"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        {(post.status === 'failed' || post.status === 'partial') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0"
                            disabled={actingOnId === post.id}
                            onClick={() => handleRetry(post)}
                            title="Retry publish"
                          >
                            <RotateCw className={cn('size-3.5', actingOnId === post.id && 'animate-spin')} />
                          </Button>
                        )}
                        {(post.status === 'draft' || post.status === 'cancelled') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-8 p-0 text-destructive hover:text-destructive"
                            disabled={actingOnId === post.id}
                            onClick={() => handleDelete(post)}
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card list — mobile */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <div className="h-16 bg-muted/40 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No posts found.
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={post.status} />
                  <div className="flex items-center gap-1">
                    {platformsInPost(post).map((p) => {
                      const Icon = PLATFORM_ICONS[p];
                      const color = PLATFORM_COLORS[p];
                      if (!Icon || !color) return null;
                      return (
                        <div
                          key={p}
                          className={cn(
                            'flex items-center justify-center size-5 rounded text-white',
                            color,
                          )}
                        >
                          <Icon className="size-2.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="line-clamp-3 text-sm">{post.content}</div>
                {post.mediaUrls.length > 0 && (
                  <div className="flex gap-1">
                    {post.mediaUrls.slice(0, 4).map((url) => (
                      <div
                        key={url}
                        className="size-12 rounded border overflow-hidden bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="size-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">
                    {post.publishedAt
                      ? `Published ${new Date(post.publishedAt).toLocaleDateString()}`
                      : post.scheduledAt
                        ? `Scheduled ${new Date(post.scheduledAt).toLocaleString()}`
                        : `Created ${new Date(post.createdAt).toLocaleDateString()}`}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setViewPost(post)}>
                    <Eye className="size-3.5" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} posts
          </p>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!viewPost} onOpenChange={(o) => !o && setViewPost(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post details</DialogTitle>
          </DialogHeader>
          {viewPost && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={viewPost.status} />
                <span className="text-xs text-muted-foreground">
                  {viewPost.publishedAt
                    ? `Published ${new Date(viewPost.publishedAt).toLocaleString()}`
                    : viewPost.scheduledAt
                      ? `Scheduled ${new Date(viewPost.scheduledAt).toLocaleString()}`
                      : `Created ${new Date(viewPost.createdAt).toLocaleString()}`}
                </span>
              </div>

              <div className="text-sm whitespace-pre-wrap">{viewPost.content}</div>

              {viewPost.mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {viewPost.mediaUrls.map((url) => (
                    <div
                      key={url}
                      className="aspect-square rounded-md overflow-hidden border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="size-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {viewPost.linkUrl && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Link: </span>
                  <a
                    href={viewPost.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:underline"
                  >
                    {viewPost.linkUrl}
                  </a>
                </div>
              )}

              {/* Per-target results */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Per-platform results</h4>
                <div className="space-y-1.5">
                  {viewPost.publishTargets.map((t, idx) => {
                    const Icon = PLATFORM_ICONS[t.platform];
                    const color = PLATFORM_COLORS[t.platform];
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded border bg-muted/30"
                      >
                        {Icon && color && (
                          <div className={cn('flex items-center justify-center size-6 rounded text-white', color)}>
                            <Icon className="size-3" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium capitalize">{t.platform}</div>
                          {t.externalPostId && (
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              ID: {t.externalPostId}
                            </div>
                          )}
                          {t.error && (
                            <div className="text-xs text-destructive truncate">{t.error}</div>
                          )}
                        </div>
                        <StatusBadge status={t.status} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {viewPost.failureReason && (
                <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <strong>Failure reason:</strong> {viewPost.failureReason}
                </div>
              )}

              {totalEngagement(viewPost) > 0 && (
                <div className="text-xs text-muted-foreground">
                  {totalEngagement(viewPost)} metric snapshot(s) recorded.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {(viewPost.status === 'failed' || viewPost.status === 'partial') && (
                  <Button
                    size="sm"
                    onClick={() => {
                      handleRetry(viewPost);
                      setViewPost(null);
                    }}
                    disabled={actingOnId === viewPost.id}
                  >
                    <RotateCw className={cn('size-3.5', actingOnId === viewPost.id && 'animate-spin')} />
                    Retry publish
                  </Button>
                )}
                {(viewPost.status === 'draft' || viewPost.status === 'cancelled') && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      handleDelete(viewPost);
                      setViewPost(null);
                    }}
                    disabled={actingOnId === viewPost.id}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
