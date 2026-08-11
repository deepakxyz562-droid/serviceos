/**
 * Performance (Employee) — productivity stats + leaderboard.
 *
 * Mirrors the PWA employee portal's "performance" card:
 *  - Stats cards: Jobs Completed, Total Hours, Avg Rating, Revenue.
 *  - This week summary: jobs, hours.
 *  - Leaderboard: ranked list of employees with jobsCompleted + hours.
 *  - Highlight the current user's row.
 *
 * APIs:
 *   GET /api/employees/[id]/performance        → { jobsCompleted, totalHours, avgRating, revenue, thisWeek }
 *   GET /api/employees/performance/leaderboard  → { entries: [{ id, name, jobsCompleted, hours, rank }] }
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase,
  Clock,
  Star,
  DollarSign,
  Trophy,
  Medal,
  TrendingUp,
  CalendarDays,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface PerformanceData {
  jobsCompleted: number;
  totalHours: number;
  avgRating: number | null;
  revenue: number | null;
  thisWeek?: {
    jobs?: number;
    hours?: number;
  };
  ratingTrend?: { period: string; rating: number }[];
}

interface LeaderboardEntry {
  id: string;
  name: string;
  jobsCompleted: number;
  hours: number;
  rank: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

const formatCurrency = (
  n: number | null | undefined,
  currency?: string | null
): string => {
  if (n === null || n === undefined) return '—';
  // Tenant currency formatter (caches per currency). Keep maximumFractionDigits=0
  // to match the previous behavior for revenue displays.
  try {
    const code = (currency && typeof currency === 'string' && currency.trim()) || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  }
};

const formatRating = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  return n.toFixed(1);
};

function usePerformance(employeeId: string | null | undefined) {
  return useQuery({
    queryKey: ['performance', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await api.get<PerformanceData | { data: PerformanceData }>(
        `/api/employees/${employeeId}/performance`
      );
      if (res && typeof res === 'object' && 'data' in res) return res.data;
      return res as PerformanceData;
    },
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  });
}

function useLeaderboard() {
  return useQuery({
    queryKey: ['performance', 'leaderboard'],
    queryFn: async () => {
      const res = await api.get<LeaderboardResponse | LeaderboardEntry[] | { data: LeaderboardEntry[] }>(
        '/api/employees/performance/leaderboard'
      );
      if (Array.isArray(res)) return res;
      if (res && typeof res === 'object') {
        if (Array.isArray((res as { entries?: LeaderboardEntry[] }).entries)) {
          return (res as LeaderboardResponse).entries;
        }
        if (Array.isArray((res as { data?: LeaderboardEntry[] }).data)) {
          return (res as { data: LeaderboardEntry[] }).data;
        }
      }
      return [];
    },
    staleTime: 60 * 1000,
  });
}

export default function PerformanceScreen() {
  const user = useAuthStore((s) => s.user);
  const tenantCurrency = useAuthStore((s) => s.tenant?.currency ?? null);
  const employeeId = user?.employeeId ?? user?.id ?? null;

  const performance = usePerformance(employeeId);
  const leaderboard = useLeaderboard();

  const isLoading =
    (performance.isLoading && !performance.data) ||
    (leaderboard.isLoading && !leaderboard.data);

  const refetchAll = async () => {
    await Promise.all([performance.refetch(), leaderboard.refetch()]);
  };

  const leaderboardEntries = useMemo<LeaderboardEntry[]>(
    () => leaderboard.data ?? [],
    [leaderboard.data]
  );

  const myEntry = useMemo(
    () => leaderboardEntries.find((e) => e.id === employeeId || e.id === user?.id),
    [leaderboardEntries, employeeId, user?.id]
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="px-4 pt-2">
          <Text className="mb-3 text-2xl font-bold text-foreground">Performance</Text>
          <SkeletonList count={3} />
        </View>
      </SafeAreaView>
    );
  }

  const hasData =
    performance.data &&
    (performance.data.jobsCompleted > 0 ||
      performance.data.totalHours > 0 ||
      performance.data.revenue != null);

  if (!hasData && leaderboardEntries.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <EmptyState
          icon={<TrendingUp size={48} color={COLORS.mutedForeground} />}
          title="No performance data yet"
          description="Your stats will appear here once you complete jobs and clock shifts."
          actionLabel="Refresh"
          onAction={() => refetchAll()}
        />
      </SafeAreaView>
    );
  }

  const data = performance.data;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={performance.isRefetching || leaderboard.isRefetching}
            onRefresh={refetchAll}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <Text className="mb-3 mt-2 text-2xl font-bold text-foreground">Performance</Text>

        {/* Stat cards */}
        <View className="mb-3 flex-row gap-2">
          <StatCard
            icon={<Briefcase size={16} color={COLORS.primary} />}
            label="Jobs Done"
            value={String(data?.jobsCompleted ?? 0)}
          />
          <StatCard
            icon={<Clock size={16} color={COLORS.accent} />}
            label="Total Hours"
            value={`${(data?.totalHours ?? 0).toFixed(1)}h`}
          />
          <StatCard
            icon={<Star size={16} color={COLORS.warning} />}
            label="Avg Rating"
            value={formatRating(data?.avgRating)}
          />
        </View>

        <View className="mb-4 flex-row gap-2">
          <StatCard
            icon={<DollarSign size={16} color={COLORS.success} />}
            label="Revenue"
            value={formatCurrency(data?.revenue, tenantCurrency)}
          />
          <StatCard
            icon={<CalendarDays size={16} color={COLORS.info} />}
            label="Week Jobs"
            value={String(data?.thisWeek?.jobs ?? 0)}
          />
          <StatCard
            icon={<Clock size={16} color={COLORS.info} />}
            label="Week Hours"
            value={`${(data?.thisWeek?.hours ?? 0).toFixed(1)}h`}
          />
        </View>

        {/* My rank card */}
        {myEntry ? (
          <Card className="mb-4 border-primary-200 bg-primary-50">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                  <Trophy size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text className="text-sm font-semibold uppercase tracking-wide text-primary-700">
                    Your Rank
                  </Text>
                  <Text className="text-lg font-bold text-primary-700">
                    #{myEntry.rank} of {leaderboardEntries.length}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-xs font-medium text-primary-600">
                  {myEntry.jobsCompleted} jobs · {myEntry.hours.toFixed(1)}h
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Leaderboard */}
        <View className="mb-2 mt-1 flex-row items-center">
          <Trophy size={18} color={COLORS.foreground} />
          <Text className="ml-2 text-base font-bold text-foreground">
            Team Leaderboard
          </Text>
        </View>

        {leaderboardEntries.length === 0 ? (
          <Card>
            <Text className="text-center text-sm text-muted-foreground">
              No leaderboard entries yet.
            </Text>
          </Card>
        ) : (
          <View>
            {leaderboardEntries.map((entry) => {
              const isMe =
                entry.id === employeeId || entry.id === user?.id;
              const isTop3 = entry.rank <= 3;
              const medalColor =
                entry.rank === 1
                  ? '#F59E0B'
                  : entry.rank === 2
                    ? '#9CA3AF'
                    : entry.rank === 3
                      ? '#B45309'
                      : COLORS.mutedForeground;
              return (
                <Card
                  key={entry.id}
                  className={cn(
                    'mb-2.5',
                    isMe && 'border-primary-300 bg-primary-50/50'
                  )}
                >
                  <View className="flex-row items-center">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: isTop3 ? `${medalColor}20` : COLORS.muted,
                      }}
                    >
                      {isTop3 ? (
                        <Medal size={18} color={medalColor} />
                      ) : (
                        <Text className="text-sm font-bold text-muted-foreground">
                          {entry.rank}
                        </Text>
                      )}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text
                        className={cn(
                          'text-base',
                          isMe ? 'font-bold text-primary-700' : 'font-semibold text-foreground'
                        )}
                        numberOfLines={1}
                      >
                        {entry.name}
                        {isMe ? '  ·  You' : ''}
                      </Text>
                      <Text className="mt-0.5 text-xs text-muted-foreground">
                        {entry.jobsCompleted} jobs · {entry.hours.toFixed(1)}h
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-bold text-foreground">
                        #{entry.rank}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Rating trend (if available) */}
        {data?.ratingTrend && data.ratingTrend.length > 0 ? (
          <>
            <View className="mb-2 mt-4 flex-row items-center">
              <TrendingUp size={18} color={COLORS.foreground} />
              <Text className="ml-2 text-base font-bold text-foreground">
                Rating Trend
              </Text>
            </View>
            <Card>
              {data.ratingTrend.map((point, i) => (
                <View
                  key={`${point.period}-${i}`}
                  className="flex-row items-center justify-between py-1.5"
                >
                  <Text className="text-sm text-muted-foreground">
                    {point.period}
                  </Text>
                  <View className="flex-row items-center">
                    <Star size={12} color={COLORS.warning} />
                    <Text className="ml-1 text-sm font-semibold text-foreground">
                      {point.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-xl border border-border bg-white p-3">
      <View className="mb-1.5 flex-row items-center">{icon}</View>
      <Text className="text-lg font-bold text-foreground">{value}</Text>
      <Text className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}
