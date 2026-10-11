/**
 * Reviews Screen (NEW)
 *
 * PWA-matching "My Reviews" screen:
 *   - Fetch GET /api/reviews → Review[] (customer's submitted reviews)
 *   - Summary card: average rating + count
 *   - Cards: provider name, star rating, date, comment, provider response (if any)
 *   - Empty: "You haven't left any reviews yet"
 *   - "Write a Review" CTA → marketplace (user picks a provider)
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Plus, MessageSquareReply, AlertCircle, Star, Calendar } from 'lucide-react-native';
import { useMyReviews } from '@/hooks/use-reviews';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Review } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={COLORS.accent}
          fill={i <= rating ? COLORS.accent : 'transparent'}
        />
      ))}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────

export default function MyReviewsScreen() {
  const { data, isLoading, isRefetching, refetch, isError, error } = useMyReviews();
  const reviews = useMemo(() => data ?? [], [data]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((s, r) => s + (r.rating ?? 0), 0);
    return sum / reviews.length;
  }, [reviews]);

  const renderItem = ({ item }: { item: Review }) => (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-foreground">
            {item.provider?.name ?? 'Provider'}
          </Text>
          <View className="mt-1 flex-row items-center">
            <Calendar size={12} color={COLORS.mutedForeground} />
            <Text className="ml-1 text-xs text-muted-foreground">
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
        <StarRow rating={item.rating} size={16} />
      </View>

      {item.comment ? (
        <Text className="mt-3 text-sm leading-5 text-foreground">{item.comment}</Text>
      ) : (
        <Text className="mt-3 text-sm italic text-muted-foreground">No comment provided</Text>
      )}

      {item.response ? (
        <View className="mt-3 rounded-lg border border-border bg-muted p-3">
          <View className="flex-row items-center">
            <MessageSquareReply size={12} color={COLORS.primary} />
            <Text className="ml-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
              Provider Response
            </Text>
          </View>
          <Text className="mt-1 text-sm text-foreground">{item.response}</Text>
          {item.respondedAt ? (
            <Text className="mt-1 text-xs text-muted-foreground">
              {formatDate(item.respondedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* Top bar */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
          My Reviews
        </Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          reviews.length > 0 ? (
            <Card className="mb-4 items-center">
              <Text className="text-5xl font-bold text-foreground">
                {avgRating.toFixed(1)}
              </Text>
              <View className="mt-2">
                <StarRow rating={Math.round(avgRating)} size={20} />
              </View>
              <Text className="mt-2 text-xs text-muted-foreground">
                Based on {reviews.length} review{reviews.length === 1 ? '' : 's'}
              </Text>
              <View className="mt-3 w-full">
                <Button
                  variant="outline"
                  onPress={() => router.push('/(customer)/marketplace')}
                  fullWidth
                >
                  <View className="flex-row items-center">
                    <Plus size={14} color={COLORS.primary} />
                    <Text className="ml-1.5 text-sm font-semibold text-primary-600">
                      Write a Review
                    </Text>
                  </View>
                </Button>
              </View>
            </Card>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList count={4} />
          ) : isError ? (
            <EmptyState
              icon={<AlertCircle size={48} color={COLORS.destructive} />}
              title="Couldn't load reviews"
              description={error instanceof Error ? error.message : 'Please try again later.'}
              actionLabel="Retry"
              onAction={() => refetch()}
            />
          ) : (
            <EmptyState
              icon={<Star size={48} color={COLORS.mutedForeground} />}
              title="No reviews yet"
              description="Share your experiences with service providers to help other customers."
              actionLabel="Browse Marketplace"
              onAction={() => router.replace('/(customer)/marketplace')}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
