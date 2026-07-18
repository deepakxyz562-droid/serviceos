'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star, ThumbsUp, MessageSquare, TrendingUp, Filter,
  Search, Pencil, Trash2, Plus, RefreshCw, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string | null;
  source: string;
  status: string;
  responseJson: string;
  reviewUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReviewListResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface EditForm {
  rating: number;
  authorName: string;
  comment: string;
  status: string;
  ownerResponse: string;
}

const emptyEditForm: EditForm = {
  rating: 5,
  authorName: '',
  comment: '',
  status: 'published',
  ownerResponse: '',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getSourceBadge(source: string): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  switch (source) {
    case 'google': return { label: 'Google', variant: 'default' };
    case 'facebook': return { label: 'Facebook', variant: 'default' };
    case 'manual': return { label: 'Manual', variant: 'secondary' };
    case 'internal': return { label: 'Internal', variant: 'secondary' };
    default: return { label: source, variant: 'outline' };
  }
}

function getStatusBadge(status: string): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  switch (status) {
    case 'published': return { label: 'Published', variant: 'default' };
    case 'pending': return { label: 'Pending', variant: 'secondary' };
    case 'hidden': return { label: 'Hidden', variant: 'outline' };
    default: return { label: status, variant: 'outline' };
  }
}

function getOwnerResponse(responseJson: string): string {
  if (!responseJson) return '';
  try {
    const parsed = JSON.parse(responseJson);
    return parsed?.text || '';
  } catch {
    return '';
  }
}

function renderStars(rating: number): React.ReactNode {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-4 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReviewsView() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit/Create dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>(emptyEditForm);
  const [saving, setSaving] = useState(false);

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Fetch reviews ──────────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (ratingFilter !== 'all') params.set('minRating', ratingFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '100');

      const res = await authFetch(`/api/reviews?${params.toString()}`, { method: 'GET' });
      if (!res.ok) {
        toast.error('Failed to load reviews');
        return;
      }
      const data: ReviewListResponse = await res.json();
      setReviews(data.reviews || []);
    } catch {
      toast.error('Network error loading reviews');
    } finally {
      setLoading(false);
    }
  }, [search, ratingFilter, statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ─── Computed stats ─────────────────────────────────────────────────────
  const total = reviews.length;
  const avgRating = total > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
    : 0;
  const responseCount = reviews.filter((r) => getOwnerResponse(r.responseJson)).length;
  const satisfaction = total > 0
    ? Math.round((reviews.filter((r) => r.rating >= 4).length / total) * 100)
    : 0;

  // ─── Dialog handlers ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyEditForm });
    setDialogOpen(true);
  };

  const openEdit = (review: Review) => {
    setEditingId(review.id);
    setForm({
      rating: review.rating,
      authorName: review.authorName || '',
      comment: review.comment || '',
      status: review.status,
      ownerResponse: getOwnerResponse(review.responseJson),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyEditForm);
  };

  const handleSave = async () => {
    if (form.rating < 1 || form.rating > 5) {
      toast.error('Rating must be between 1 and 5');
      return;
    }
    if (!form.authorName.trim()) {
      toast.error('Author name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        rating: form.rating,
        authorName: form.authorName.trim(),
        comment: form.comment.trim() || null,
        status: form.status,
        source: 'manual',
        responseJson: JSON.stringify(
          form.ownerResponse.trim()
            ? { text: form.ownerResponse.trim(), respondedAt: new Date().toISOString() }
            : {},
        ),
      };

      const url = editingId ? `/api/reviews/${editingId}` : '/api/reviews';
      const method = editingId ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to ${editingId ? 'update' : 'create'} review`);
        return;
      }

      toast.success(editingId ? 'Review updated' : 'Review added');
      closeDialog();
      fetchReviews();
    } catch {
      toast.error('Network error saving review');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authFetch(`/api/reviews/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error('Failed to delete review');
        return;
      }
      toast.success('Review deleted');
      setDeletingId(null);
      fetchReviews();
    } catch {
      toast.error('Network error deleting review');
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Star className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Reviews</h2>
            <p className="text-sm text-muted-foreground">
              Manage customer reviews — edit, respond, or remove any review on your profile.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReviews} disabled={loading}>
            <RefreshCw className={`size-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4 mr-1" />
            Add Review
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Star className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ThumbsUp className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <MessageSquare className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{responseCount}</p>
                <p className="text-xs text-muted-foreground">Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <TrendingUp className="size-4 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{satisfaction}%</p>
                <p className="text-xs text-muted-foreground">Satisfaction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews by comment..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchReviews(); }}
              />
            </div>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4+ Stars</SelectItem>
                <SelectItem value="3">3+ Stars</SelectItem>
                <SelectItem value="2">2+ Stars</SelectItem>
                <SelectItem value="1">1+ Stars</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchReviews} disabled={loading}>
              <Filter className="size-3 mr-1" /> Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews list */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Loading reviews...
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="size-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Star className="size-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold">No reviews yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                No reviews match your filters. Try clearing filters, or click{' '}
                <span className="font-medium">Add Review</span> to manually add a customer review.
              </p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4 mr-1" /> Add Review
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const sourceBadge = getSourceBadge(review.source);
            const statusBadge = getStatusBadge(review.status);
            const ownerResponse = getOwnerResponse(review.responseJson);
            return (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderStars(review.rating)}
                        <span className="font-medium text-sm">
                          {review.authorName || 'Anonymous'}
                        </span>
                        <Badge variant={sourceBadge.variant} className="text-xs">
                          {sourceBadge.label}
                        </Badge>
                        <Badge variant={statusBadge.variant} className="text-xs">
                          {statusBadge.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      )}
                      {ownerResponse && (
                        <div className="mt-2 pl-3 border-l-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded-r">
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-0.5">
                            Your response
                          </p>
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                            {ownerResponse}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(review)}
                        aria-label="Edit review"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(review.id)}
                        aria-label="Delete review"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Edit / Create Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Review' : 'Add Review'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the review details, status, or your response.'
                : 'Manually add a customer review to your public profile.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Rating */}
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rating: n }))}
                    className="p-1 rounded hover:bg-accent transition-colors"
                    aria-label={`Set rating to ${n} stars`}
                  >
                    <Star
                      className={`size-7 ${
                        n <= form.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-medium">{form.rating}.0</span>
              </div>
            </div>

            {/* Author name */}
            <div className="space-y-2">
              <Label htmlFor="authorName">Author name</Label>
              <Input
                id="authorName"
                value={form.authorName}
                onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                placeholder="e.g. Sarah M."
              />
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment">Review comment</Label>
              <Textarea
                id="comment"
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="What did the customer say?"
                rows={3}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published (visible on public hub)</SelectItem>
                  <SelectItem value="pending">Pending (hidden until approved)</SelectItem>
                  <SelectItem value="hidden">Hidden (not shown publicly)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Owner response */}
            <div className="space-y-2">
              <Label htmlFor="ownerResponse">Your response (optional)</Label>
              <Textarea
                id="ownerResponse"
                value={form.ownerResponse}
                onChange={(e) => setForm((f) => ({ ...f, ownerResponse: e.target.value }))}
                placeholder="Reply to this review publicly..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Shown on the public hub below the review as &ldquo;Your response&rdquo;.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ────────────────────────────────────────── */}
      <Dialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete review?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The review will be permanently removed
              from your public profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              <X className="size-4 mr-1" /> Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              <Trash2 className="size-4 mr-1" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
