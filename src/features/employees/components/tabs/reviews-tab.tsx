'use client';

/**
 * Reviews Tab — customer reviews for an employee.
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useQuery } from '@tanstack/react-query';
import {
  Star, ThumbsUp, MessageSquare, TrendingUp, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';
import type { ReviewsResponse } from '../../types';
import { apiUrl, jobStatusBadgeClass } from '../../utils/employee-helpers';
import { StarRating } from '../employee-shared';

export function ReviewsTab({ employeeId, defaultRating }: { employeeId: string; defaultRating: number }) {
  const { data, isLoading } = useQuery<ReviewsResponse>({
    queryKey: ['employee-reviews', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/reviews?employeeId=${employeeId}&limit=50`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const reviews = data?.reviews ?? [];
  const total = data?.pagination?.total ?? reviews.length;
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : defaultRating;
  const positive = reviews.filter((r) => r.rating >= 4).length;
  const satisfaction = reviews.length > 0 ? Math.round((positive / reviews.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Star className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
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
              <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageSquare className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reviews.filter((r) => r.comment).length}</p>
                <p className="text-xs text-muted-foreground">With Comments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{satisfaction}%</p>
                <p className="text-xs text-muted-foreground">Satisfaction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Star className="size-4 text-amber-500" /> Customer Reviews
          </CardTitle>
          <CardDescription className="text-xs">Reviews left by customers for this employee</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center">
              <Star className="size-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">No reviews yet</p>
              <p className="text-xs text-muted-foreground mt-1">Customer reviews will appear here once submitted.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-border p-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-xs font-semibold">{review.rating}.0</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-foreground leading-relaxed mb-2">&ldquo;{review.comment}&rdquo;</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                    {(review.authorName || review.customerId) && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <User className="size-3" />
                        <span className="font-medium">{review.authorName || 'Anonymous'}</span>
                      </span>
                    )}
                    {review.source && review.source !== 'internal' && (
                      <Badge variant="secondary" className="text-[10px] capitalize">{review.source}</Badge>
                    )}
                    <Badge variant="outline" className={cn('text-[10px] capitalize', jobStatusBadgeClass(review.status))}>
                      {review.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
