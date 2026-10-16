/**
 * Schedule (Employee) — calendar-style week view of scheduled jobs.
 *
 * Mirrors the PWA employee portal's "schedule" view:
 *  - Week navigator: Mon–Sun, prev/next buttons, "Today" shortcut.
 *  - Toggle: Week (full Mon–Sun list) / Day (today only).
 *  - Jobs grouped by day with date headers, today highlighted.
 *  - Tap a job → router.push('/(employee)/jobs/[id]').
 *
 * API: GET /api/employee/jobs?filter=scheduled&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
  User,
  Wrench,
  Briefcase,
} from 'lucide-react-native';
import {
  format,
  isToday as isDateToday,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  addDays,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Job } from '@/types';

type ViewMode = 'week' | 'day';

/** Fetch scheduled jobs inside the [from, to] window. */
function useScheduledJobs(from: string, to: string) {
  return useQuery({
    queryKey: ['jobs', 'scheduled', from, to],
    queryFn: async () => {
      const res = await api.get<Job[] | { data: Job[] }>(
        '/api/employee/jobs',
        { filter: 'scheduled', from, to }
      );
      if (Array.isArray(res)) return res;
      return res?.data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function formatHeaderRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
  }
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

function getJobDay(job: Job): Date | null {
  if (job.scheduledAt) {
    try {
      return parseISO(job.scheduledAt);
    } catch {
      return null;
    }
  }
  if (job.startedAt) {
    try {
      return parseISO(job.startedAt);
    } catch {
      return null;
    }
  }
  return null;
}

export default function ScheduleScreen() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  // Anchor: the day currently selected in Day view, or any day inside the
  // week currently shown in Week view.
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const weekStart = useMemo(
    () => startOfWeek(anchor, { weekStartsOn: 1 }),
    [anchor]
  );
  const weekEnd = useMemo(
    () => endOfWeek(anchor, { weekStartsOn: 1 }),
    [anchor]
  );

  const { data, isLoading, isRefetching, refetch, error } = useScheduledJobs(
    isoDate(weekStart),
    isoDate(weekEnd)
  );

  // Refresh whenever the screen is focused (e.g. returning from a job detail).
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'scheduled'] });
    }, [queryClient])
  );

  /** Group jobs by their date. */
  const groupedByDay = useMemo(() => {
    const list = data ?? [];
    const days = viewMode === 'day'
      ? [startOfDay(anchor), endOfDay(anchor)]
      : [weekStart, weekEnd];
    const dayInterval = eachDayOfInterval({ start: days[0], end: days[1] });

    const map = new Map<string, Job[]>();
    for (const day of dayInterval) {
      map.set(isoDate(day), []);
    }

    for (const job of list) {
      const jobDay = getJobDay(job);
      if (!jobDay) continue;
      const key = isoDate(jobDay);
      if (viewMode === 'day' && !isSameDay(jobDay, anchor)) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
    }

    // Sort jobs within each day by scheduled time (nulls last).
    for (const [, jobs] of map) {
      jobs.sort((a, b) => {
        const at = a.scheduledAt ? Date.parse(a.scheduledAt) : Infinity;
        const bt = b.scheduledAt ? Date.parse(b.scheduledAt) : Infinity;
        return at - bt;
      });
    }

    return dayInterval.map((day) => ({
      date: day,
      key: isoDate(day),
      jobs: map.get(isoDate(day)) ?? [],
    }));
  }, [data, viewMode, anchor, weekStart, weekEnd]);

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['jobs', 'scheduled'] });
    refetch();
  }, [queryClient, refetch]);

  const goPrev = () => {
    setAnchor((prev) =>
      viewMode === 'week' ? addDays(prev, -7) : addDays(prev, -1)
    );
  };
  const goNext = () => {
    setAnchor((prev) =>
      viewMode === 'week' ? addDays(prev, 7) : addDays(prev, 1)
    );
  };
  const goToday = () => setAnchor(new Date());

  const totalJobsThisWeek = (data ?? []).length;

  if (isLoading && !data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="px-4 pt-2">
          <Text className="mb-3 text-2xl font-bold text-foreground">Schedule</Text>
          <SkeletonList count={5} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <EmptyState
          icon={<CalendarDays size={48} color={COLORS.mutedForeground} />}
          title="Couldn't load your schedule"
          description={
            error instanceof Error ? error.message : 'Something went wrong.'
          }
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refreshAll}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View className="mb-3 mt-2">
          <Text className="text-2xl font-bold text-foreground">Schedule</Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">
            {totalJobsThisWeek} job{totalJobsThisWeek === 1 ? '' : 's'} this week
          </Text>
        </View>

        {/* View toggle */}
        <View className="mb-3">
          <SegmentedControl<ViewMode>
            options={[
              { value: 'week', label: 'Week' },
              { value: 'day', label: 'Day' },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        </View>

        {/* Week navigator */}
        <Card className="mb-3" padded>
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={goPrev}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Previous period"
              className="h-9 w-9 items-center justify-center rounded-lg bg-muted"
            >
              <ChevronLeft size={18} color={COLORS.foreground} />
            </Pressable>

            <Pressable
              onPress={goToday}
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
              className="flex-1 items-center px-2"
            >
              <Text className="text-center text-base font-bold text-foreground">
                {viewMode === 'day'
                  ? format(anchor, 'EEEE, MMM d, yyyy')
                  : formatHeaderRange(weekStart, weekEnd)}
              </Text>
              <Text className="mt-0.5 text-xs font-medium text-primary-700">
                Tap to jump to today
              </Text>
            </Pressable>

            <Pressable
              onPress={goNext}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Next period"
              className="h-9 w-9 items-center justify-center rounded-lg bg-muted"
            >
              <ChevronRight size={18} color={COLORS.foreground} />
            </Pressable>
          </View>
        </Card>

        {/* Day sections */}
        {groupedByDay.every((d) => d.jobs.length === 0) ? (
          <EmptyState
            icon={<CalendarDays size={48} color={COLORS.mutedForeground} />}
            title="No jobs scheduled"
            description={
              viewMode === 'day'
                ? `You have nothing scheduled for ${format(anchor, 'EEEE')}.`
                : 'No jobs are scheduled for this week.'
            }
            actionLabel="Jump to today"
            onAction={goToday}
          />
        ) : (
          groupedByDay.map(({ date, key, jobs }) => (
            <DaySection key={key} date={date} jobs={jobs} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DaySection({ date, jobs }: { date: Date; jobs: Job[] }) {
  const today = isDateToday(date);
  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text
            className={cn(
              'text-sm font-bold',
              today ? 'text-primary-700' : 'text-foreground'
            )}
          >
            {format(date, 'EEEE')}
          </Text>
          <View
            className={cn(
              'ml-2 rounded-full px-2 py-0.5',
              today ? 'bg-primary-100' : 'bg-muted'
            )}
          >
            <Text
              className={cn(
                'text-xs font-semibold',
                today ? 'text-primary-700' : 'text-muted-foreground'
              )}
            >
              {format(date, 'MMM d')}
            </Text>
          </View>
        </View>
        <Text className="text-xs font-medium text-muted-foreground">
          {jobs.length} job{jobs.length === 1 ? '' : 's'}
        </Text>
      </View>

      {jobs.length === 0 ? (
        <Card className="border-dashed">
          <Text className="text-center text-sm text-muted-foreground">
            Nothing scheduled
          </Text>
        </Card>
      ) : (
        jobs.map((job) => <ScheduleJobCard key={job.id} job={job} />)
      )}
    </View>
  );
}

function ScheduleJobCard({ job }: { job: Job }) {
  const time = job.scheduledAt
    ? format(parseISO(job.scheduledAt), 'h:mm a')
    : 'Unscheduled';

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(employee)/jobs/[id]',
          params: { id: job.id },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`Open job for ${job.customer.name}`}
      className="mb-2.5 active:opacity-70"
    >
      <Card>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center">
              <Clock size={14} color={COLORS.primary} />
              <Text className="ml-1.5 text-sm font-bold text-primary-700">
                {time}
              </Text>
            </View>
            <View className="mt-1 flex-row items-center">
              <User size={14} color={COLORS.mutedForeground} />
              <Text className="ml-1.5 text-base font-bold text-foreground">
                {job.customer.name}
              </Text>
            </View>
            {job.service ? (
              <View className="mt-1 flex-row items-center">
                <Wrench size={13} color={COLORS.mutedForeground} />
                <Text
                  className="ml-1.5 flex-1 text-xs text-muted-foreground"
                  numberOfLines={1}
                >
                  {job.service.name}
                </Text>
              </View>
            ) : null}
            {job.address ? (
              <View className="mt-1 flex-row items-center">
                <MapPin size={13} color={COLORS.mutedForeground} />
                <Text
                  className="ml-1.5 flex-1 text-xs text-muted-foreground"
                  numberOfLines={2}
                >
                  {job.address}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="items-end">
            <StatusBadge status={job.status} />
            <View className="mt-2 h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <Briefcase size={16} color={COLORS.primary} />
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
