'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Trash2,
  RotateCw,
  LayoutGrid,
  List,
  Facebook,
  Instagram,
  MapPin,
  Linkedin,
  ImageIcon,
  Twitter,
  Loader2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Send,
  Eye,
  Calendar,
  Share2,
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

// ─── Types ─────────────────────────────────────────────────────────────────

interface PublishTarget {
  platform: string;
  socialAccountId: string;
  externalPostId?: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  error?: string;
  publishedAt?: string;
}

export interface SocialPost {
  id: string;
  status: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null;
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

type WorkstationFilter =
  | 'all'
  | 'published'
  | 'scheduled'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'failed';

const STATUS_PILLS: Array<{
  id: WorkstationFilter;
  label: string;
  icon: React.ElementType;
  colorClass: string;
}> = [
  { id: 'all', label: 'All', icon: List, colorClass: 'text-foreground' },
  { id: 'published', label: 'Published', icon: CheckCircle2, colorClass: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar, colorClass: 'text-blue-600 dark:text-blue-400' },
  { id: 'pending', label: 'Pending Approval', icon: AlertTriangle, colorClass: 'text-amber-600 dark:text-amber-400' },
  { id: 'approved', label: 'Approved', icon: ThumbsUp, colorClass: 'text-teal-600 dark:text-teal-400' },
  { id: 'rejected', label: 'Rejected', icon: ThumbsDown, colorClass: 'text-rose-600 dark:text-rose-400' },
  { id: 'failed', label: 'Failed', icon: XCircle, colorClass: 'text-red-600 dark:text-red-400' },
];

// ─── Platform icons & colors ────────────────────────────────────────────────

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

export function PostsListView({ embedded = false }: { embedded?: boolean } = {}) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<WorkstationFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [viewPost, setViewPost] = useState<SocialPost | null>(null);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '30');

      // Map filter pills to API params
      if (activeFilter === 'published') params.set('status', 'published');
      else if (activeFilter === 'scheduled') params.set('status', 'scheduled');
      else if (activeFilter === 'failed') params.set('status', 'failed');
      else if (activeFilter === 'pending') params.set('approval', 'pending');
      else if (activeFilter === 'approved') params.set('approval', 'approved');
      else if (activeFilter === 'rejected') params.set('approval', 'rejected');

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
  }, [page, activeFilter, platformFilter, search]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleApproval = async (postId: string, approvalStatus: 'approved' | 'rejected') => {
    setActingOnId(postId);
    try {
      const res = await authFetch(`/api/social/posts/${postId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus }),
      });
      if (res.ok) {
        toast.success(approvalStatus === 'approved' ? 'Post approved! Moved to publishing queue.' : 'Post rejected.');
        loadPosts();
      } else {
        toast.error('Failed to update approval status');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActingOnId(null);
    }
  };

  const handlePublishNow = async (post: SocialPost) => {
    setActingOnId(post.id);
    try {
      const res = await authFetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      if (res.ok) {
        toast.success('Publishing started! Updating status...');
        setTimeout(loadPosts, 1500);
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || 'Publish failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setActingOnId(null);
    }
  };

  const handleDelete = async (post: SocialPost) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    setActingOnId(post.id);
    try {
      const res = await authFetch(`/api/social/posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Post removed');
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

  const platformsInPost = useCallback((post: SocialPost) => {
    const list = Array.isArray(post.publishTargets) ? post.publishTargets : [];
    const set = new Set(list.map((t) => t.platform));
    return Array.from(set);
  }, []);

  return (
    <div className="space-y-5">
      {/* ─── Top Bar: Title & View Switcher ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Posts & Content Library</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your published content, approval queue, scheduled drafts, and social history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid / List View Toggle */}
          <div className="flex items-center border border-border rounded-xl bg-card p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Cards Grid"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List Table"
            >
              <List className="size-4" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadPosts}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs font-semibold rounded-xl bg-card border-border"
          >
            <RefreshCw className={cn('size-3.5', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ─── 6 Status Filter Pills Row ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/60">
        {STATUS_PILLS.map((pill) => {
          const isActive = activeFilter === pill.id;
          const Icon = pill.icon;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setActiveFilter(pill.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
              }`}
            >
              <Icon className={cn('size-3.5', isActive ? 'text-primary-foreground' : pill.colorClass)} />
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Search & Platform Filter Bar ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <form onSubmit={onSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by caption, headline or keyword..."
            className="pl-9 h-9 text-xs bg-card rounded-xl"
          />
        </form>

        <Select
          value={platformFilter}
          onValueChange={(v) => {
            setPlatformFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44 h-9 text-xs rounded-xl bg-card border-border">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="googlebusiness">Google Business</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Main Content Display ───────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-card/60">
              <div className="h-44 bg-muted/50 rounded-t-xl" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-muted/60 rounded w-3/4" />
                <div className="h-3 bg-muted/40 rounded w-full" />
                <div className="h-3 bg-muted/40 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-dashed bg-card/40">
          <CardContent className="p-12 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-muted/50 text-muted-foreground flex items-center justify-center mx-auto">
              <ImageIcon className="size-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">No posts found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeFilter !== 'all'
                  ? `No posts match the '${activeFilter}' filter. Try switching tabs.`
                  : 'Start by creating your first post in Marketing Studio!'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* ─── CARDS GRID VIEW ────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => {
            const platforms = platformsInPost(post);
            const mediaUrl = post.mediaUrls?.[0];
            const isPendingApproval = post.approvalStatus === 'pending';
            const isApproved = post.approvalStatus === 'approved';
            const isRejected = post.approvalStatus === 'rejected';

            let statusBadgeClass = 'bg-muted text-muted-foreground';
            let statusText = post.status.toUpperCase();
            if (post.status === 'published') {
              statusBadgeClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
              statusText = 'Published 🟢';
            } else if (post.status === 'scheduled') {
              statusBadgeClass = 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
              statusText = 'Scheduled 📅';
            } else if (post.status === 'failed') {
              statusBadgeClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
              statusText = 'Failed 🔴';
            }

            return (
              <Card
                key={post.id}
                className="overflow-hidden border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail / Creative Header */}
                  <div className="relative h-44 bg-muted/40 overflow-hidden">
                    {mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt="Creative"
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full p-5 bg-gradient-to-br from-primary/10 via-background to-muted flex flex-col justify-center">
                        <span className="text-[10px] font-extrabold text-primary tracking-widest uppercase">
                          AI Creative Post
                        </span>
                        <p className="text-xs font-serif font-bold text-foreground line-clamp-3 mt-1">
                          {post.content || 'Marketing offer'}
                        </p>
                      </div>
                    )}

                    {/* Status Badge Overlay */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] font-bold ${statusBadgeClass}`}>
                        {statusText}
                      </Badge>
                      {isPendingApproval && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                          Needs Approval ⚠️
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30">
                          Approved 👍
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">
                          Rejected 👎
                        </Badge>
                      )}
                    </div>

                    {/* Platform Icons Overlay */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-1 rounded-full">
                      {platforms.length > 0 ? (
                        platforms.map((p) => {
                          const IconComp = PLATFORM_ICONS[p] || Share2;
                          return <IconComp key={p} className="size-3 text-white" />;
                        })
                      ) : (
                        <span className="text-[10px] text-white font-medium">All Channels</span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-foreground leading-relaxed line-clamp-3 select-text">
                      {post.content || '(No caption provided)'}
                    </p>

                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                      <Clock className="size-3" />
                      <span>
                        {post.publishedAt
                          ? `Published ${new Date(post.publishedAt).toLocaleDateString()}`
                          : post.scheduledAt
                          ? `Scheduled for ${new Date(post.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                          : `Created ${new Date(post.createdAt).toLocaleDateString()}`}
                      </span>
                    </p>
                  </CardContent>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewPost(post)}
                      className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1"
                    >
                      <Eye className="size-3.5" />
                      <span>Preview</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post)}
                      disabled={actingOnId === post.id}
                      className="h-8 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {/* Contextual Action Button */}
                  {isPendingApproval ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        disabled={actingOnId === post.id}
                        onClick={() => handleApproval(post.id, 'approved')}
                        className="h-8 px-2.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1"
                      >
                        <ThumbsUp className="size-3" />
                        <span>Approve</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actingOnId === post.id}
                        onClick={() => handleApproval(post.id, 'rejected')}
                        className="h-8 px-2 text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50"
                      >
                        <ThumbsDown className="size-3" />
                      </Button>
                    </div>
                  ) : post.status === 'failed' || post.status === 'draft' ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={actingOnId === post.id}
                      onClick={() => handlePublishNow(post)}
                      className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                    >
                      <Send className="size-3" />
                      <span>Publish Now</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = post.content + (post.linkUrl ? `\n\n${post.linkUrl}` : '');
                        navigator.clipboard.writeText(text);
                        toast.success('Caption copied!');
                      }}
                      className="h-8 px-2.5 text-xs font-semibold"
                    >
                      <Copy className="size-3 mr-1" />
                      <span>Copy</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ─── TABLE VIEW ─────────────────────────────────────────────────────── */
        <Card className="border border-border/80 overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-64">Preview</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => {
                  const platforms = platformsInPost(post);
                  return (
                    <TableRow key={post.id} className="hover:bg-muted/40">
                      <TableCell>
                        <button
                          type="button"
                          className="text-left max-w-md flex items-center gap-3"
                          onClick={() => setViewPost(post)}
                        >
                          {post.mediaUrls?.[0] && (
                            <img
                              src={post.mediaUrls[0]}
                              alt=""
                              className="size-10 rounded-lg object-cover border border-border shrink-0"
                            />
                          )}
                          <span className="text-xs font-medium text-foreground line-clamp-2">
                            {post.content || '(empty)'}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {platforms.map((p) => {
                            const IconComp = PLATFORM_ICONS[p] || Share2;
                            return (
                              <div
                                key={p}
                                className={cn(
                                  'size-6 rounded-full text-white flex items-center justify-center',
                                  PLATFORM_COLORS[p] || 'bg-muted-foreground'
                                )}
                              >
                                <IconComp className="size-3" />
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString()
                          : new Date(post.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewPost(post)}
                          className="h-8 px-2 text-xs"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── MODAL: View Post Details ───────────────────────────────────────── */}
      <Dialog open={Boolean(viewPost)} onOpenChange={(open) => !open && setViewPost(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {viewPost && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center justify-between">
                  <span>Post Details</span>
                  <Badge variant="outline" className="text-xs">
                    {viewPost.status.toUpperCase()}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              {viewPost.mediaUrls?.[0] && (
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-border">
                  <img src={viewPost.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Caption
                </span>
                <p className="text-xs leading-relaxed text-foreground select-text">{viewPost.content}</p>
              </div>

              {viewPost.linkUrl && (
                <div className="text-xs text-primary flex items-center gap-1.5">
                  <ExternalLink className="size-3.5" />
                  <a href={viewPost.linkUrl} target="_blank" rel="noreferrer" className="hover:underline">
                    {viewPost.linkUrl}
                  </a>
                </div>
              )}

              {viewPost.failureReason && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                  <strong>Failure reason:</strong> {viewPost.failureReason}
                </div>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const text = viewPost.content + (viewPost.linkUrl ? `\n\n${viewPost.linkUrl}` : '');
                    navigator.clipboard.writeText(text);
                    toast.success('Caption copied!');
                  }}
                  className="text-xs"
                >
                  <Copy className="size-3.5 mr-1" />
                  Copy caption
                </Button>

                {(viewPost.status === 'failed' || viewPost.status === 'draft') && (
                  <Button
                    size="sm"
                    onClick={() => {
                      handlePublishNow(viewPost);
                      setViewPost(null);
                    }}
                    className="bg-primary text-primary-foreground font-bold text-xs"
                  >
                    Publish Now
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

export default PostsListView;
