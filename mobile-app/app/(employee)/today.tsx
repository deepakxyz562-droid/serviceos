/**
 * Today Dashboard (Employee) — rewrite.
 *
 * Fixes the PWA-parity gap items for the Today screen:
 *   1. Today filter bug — uses `GET /api/employee/jobs?filter=today` (no longer
 *      shows ALL non-completed jobs).
 *   2. Shift status card — clock-in/out via POST /api/employee/shift with
 *      live elapsed timer.
 *   3. Stat cards row — Today's Jobs / Completed / Pending / Hours.
 *   4. Inventory card — links to /(employee)/inventory.
 *   5. Schedule card — links to /(employee)/schedule.
 *   6. Notifications bell in the header — unread count badge +
 *      router.push('/(employee)/notifications').
 *   7. Pull-to-refresh.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  CircleCheck,
  CalendarDays,
  MapPin,
  ChevronRight,
  LogIn,
  LogOut,
  Briefcase,
  Bell,
  CalendarClock,
  Hourglass,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useEmployeeJobs } from '@/hooks/use-jobs';
import {
  useTodayShift,
  useWeekShifts,
  useClockIn,
  useClockOut,
} from '@/hooks/use-shift';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import type { Job, ShiftWeek } from '@/types';

const isToday = (iso: string | null): boolean => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const formatTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const computeElapsed = (startIso: string): string => {
  const start = new Date(startIso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - start);
  const totalMinutes = Math.floor(diff / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const computeWeekHours = (week: ShiftWeek | undefined): number => {
  const shifts = week?.shifts;
  if (!shifts || shifts.length === 0) return week?.totalHours ?? 0;
  let totalMinutes = 0;
  for (const s of shifts) {
    const start = new Date(s.startTime).getTime();
    if (s.endTime === null) {
      totalMinutes += Math.max(0, Math.floor((Date.now() - start) / 60000));
    } else if (typeof s.totalHours === 'number') {
      totalMinutes += Math.round(s.totalHours * 60);
    } else {
      totalMinutes += Math.max(0, Math.floor((new Date(s.endTime).getTime() - start) / 60000));
    }
  }
  return Math.round((totalMinutes / 60) * 10) / 10;
};

function useUnreadNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const r = await api.get<unknown>('/api/notifications/unread-count');
      const obj = r as { count?: number };
      return typeof obj?.count === 'number' ? obj.count : 0;
    },
    refetchInterval: 60_000,
  });
}

export default function TodayScreen() {
  const queryClient = useQueryClient();
  const { show } = useToast();
  const [now, setNow] = useState<number>(Date.now());

  const todayShift = useTodayShift();
  const weekShifts = useWeekShifts();
  const todayJobs = useEmployeeJobs('today');
  const allJobs = useEmployeeJobs('all');
  const unread = useUnreadNotifications();

  const clockIn = useClockIn();
  const clockOut = useClockOut();

  // Re-render every 30s while a shift is active so elapsed time updates.
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => setNow(Date.now()), 30_000);
      return () => clearInterval(interval);
    }, [])
  );

  const shift = todayShift.data ?? null;
  const isClockedIn = !!shift && !shift.endTime;

  // Use the dedicated ?filter=today endpoint result, but keep a defensive
  // client-side filter on scheduledAt too (in case the API returns future
  // scheduled items along with today's).
  const todaysJobs = useMemo<Job[]>(() => {
    const list = todayJobs.data ?? [];
    const filtered = list.filter((j) => isToday(j.scheduledAt));
    return filtered.length > 0 ? filtered : list; // trust the API if it returned something
  }, [todayJobs.data]);

  const completedToday = useMemo<Job[]>(() => {
    const list = allJobs.data ?? todayJobs.data ?? [];
    return list.filter(
      (j) =>
        (j.lifecycleState === 'completed' || j.status === 'completed') &&
        isToday(j.completedAt)
    );
  }, [allJobs.data, todayJobs.data]);

  const pending = useMemo<Job[]>(() => {
    const list = todaysJobs;
    return list.filter(
      (j) =>
        j.lifecycleState !== 'completed' &&
        j.lifecycleState !== 'invoice_generated' &&
        j.status !== 'completed' &&
        j.status !== 'cancelled'
    );
  }, [todaysJobs]);

  const weekHours = useMemo(
    () => computeWeekHours(weekShifts.data),
    [weekShifts.data, now]
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shift'] }),
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
  }, [queryClient]);

  const handleClockIn = useCallback(async () => {
    try {
      await clockIn.mutateAsync({});
      await queryClient.invalidateQueries({ queryKey: ['shift'] });
      show('Clocked in. Have a great shift!', 'success');
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Clock-in failed.',
        'error'
      );
    }
  }, [clockIn, queryClient, show]);

  const handleClockOut = useCallback(async () => {
    Alert.alert(
      'Clock Out',
      'End your shift now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await clockOut.mutateAsync();
              await queryClient.invalidateQueries({ queryKey: ['shift'] });
              show('Clocked out. Shift recorded.', 'success');
            } catch (err) {
              show(
                err instanceof Error ? err.message : 'Clock-out failed.',
                'error'
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [clockOut, queryClient, show]);

  const renderJob = ({ item }: { item: Job }) => {
    const time = item.scheduledAt ? formatTime(item.scheduledAt) : '—';
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(employee)/jobs/[id]',
            params: { id: item.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Open job for ${item.customer.name}`}
        className="active:opacity-70"
      >
        <Card className="mb-2.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-foreground">
                {item.customer.name}
              </Text>
              <View className="mt-1 flex-row items-center">
                <Clock size={12} color={COLORS.mutedForeground} />
                <Text className="ml-1 text-xs text-muted-foreground">{time}</Text>
              </View>
            </View>
            <StatusBadge status={item.lifecycleState || item.status} />
          </View>

          {item.service ? (
            <Text className="mt-1.5 text-xs font-medium text-primary-700">
              {item.service.name}
            </Text>
          ) : null}

          {item.address ? (
            <View className="mt-2 flex-row items-center">
              <MapPin size={12} color={COLORS.mutedForeground} />
              <Text
                className="ml-1 flex-1 text-xs text-muted-foreground"
                numberOfLines={1}
              >
                {item.address}
              </Text>
            </View>
          ) : null}
        </Card>
      </Pressable>
    );
  };

  const isLoading =
    todayShift.isLoading || todayJobs.isLoading || allJobs.isLoading;
  const isRefetching =
    todayShift.isRefetching ||
    todayJobs.isRefetching ||
    allJobs.isRefetching;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <FlatList
        data={todaysJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJob}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refreshAll}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <View className="mb-4">
            {/* Header row: title + notification bell */}
            <View className="mb-3 mt-2 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-2xl font-bold text-foreground">Today</Text>
                <Text className="mt-0.5 text-sm text-muted-foreground">
                  {new Date().toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/(employee)/notifications')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                className="relative h-10 w-10 items-center justify-center rounded-full bg-muted"
              >
                <Bell size={20} color={COLORS.foreground} />
                {unread.data ? (
                  <View className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-destructive">
                    <Text className="text-[10px] font-bold text-white">
                      {unread.data > 99 ? '99+' : unread.data}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {/* Shift status card */}
            <Card className="mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Current Shift
                  </Text>
                  {isClockedIn && shift ? (
                    <>
                      <Text className="mt-1 text-lg font-bold text-foreground">
                        Clocked in at {formatTime(shift.startTime)}
                      </Text>
                      <Text className="mt-0.5 text-sm text-primary-700">
                        Elapsed: {computeElapsed(shift.startTime)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="mt-1 text-lg font-bold text-foreground">
                        Off duty
                      </Text>
                      <Text className="mt-0.5 text-sm text-muted-foreground">
                        Tap below to start your shift
                      </Text>
                    </>
                  )}
                </View>
                <View
                  className={`h-12 w-12 items-center justify-center rounded-full ${
                    isClockedIn ? 'bg-primary-100' : 'bg-muted'
                  }`}
                >
                  <Clock
                    size={22}
                    color={isClockedIn ? COLORS.primary : COLORS.mutedForeground}
                  />
                </View>
              </View>

              <View className="mt-3">
                {isClockedIn ? (
                  <Button
                    variant="destructive"
                    onPress={handleClockOut}
                    loading={clockOut.isPending}
                    fullWidth
                  >
                    <View className="flex-row items-center justify-center">
                      <LogOut size={16} color="#fff" />
                      <Text className="ml-2 font-semibold text-white">
                        Clock Out
                      </Text>
                    </View>
                  </Button>
                ) : (
                  <Button
                    onPress={handleClockIn}
                    loading={clockIn.isPending}
                    fullWidth
                  >
                    <View className="flex-row items-center justify-center">
                      <LogIn size={16} color="#fff" />
                      <Text className="ml-2 font-semibold text-white">
                        Clock In
                      </Text>
                    </View>
                  </Button>
                )}
              </View>
            </Card>

            {/* Stats row */}
            <View className="mb-3 flex-row gap-2">
              <StatCard
                icon={<Briefcase size={16} color={COLORS.primary} />}
                label="Today"
                value={String(todaysJobs.length)}
              />
              <StatCard
                icon={<CircleCheck size={16} color={COLORS.success} />}
                label="Done"
                value={String(completedToday.length)}
              />
              <StatCard
                icon={<Hourglass size={16} color={COLORS.accent} />}
                label="Pending"
                value={String(pending.length)}
              />
              <StatCard
                icon={<CalendarDays size={16} color={COLORS.info} />}
                label="Hrs/Wk"
                value={weekHours.toFixed(1)}
              />
            </View>

            {/* Quick-link card: Schedule (Inventory moved to Profile screen) */}
            <View className="mb-3 flex-row gap-2">
              <QuickLinkCard
                icon={<CalendarClock size={20} color={COLORS.info} />}
                title="My Schedule"
                subtitle="Upcoming appointments"
                onPress={() => router.push('/(employee)/schedule')}
              />
            </View>

            {/* Section header */}
            <View className="mb-2 mt-1 flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">
                Today's Jobs
              </Text>
              <Pressable
                onPress={() => router.push('/(employee)/jobs')}
                hitSlop={8}
              >
                <View className="flex-row items-center">
                  <Text className="text-xs font-semibold text-primary-700">
                    View all
                  </Text>
                  <ChevronRight size={14} color={COLORS.primary} />
                </View>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList count={3} />
          ) : (
            <EmptyState
              icon={<Briefcase size={48} color={COLORS.mutedForeground} />}
              title="No jobs scheduled for today"
              description="When jobs are assigned to you for today, they will appear here."
              actionLabel="Refresh"
              onAction={() => refreshAll()}
            />
          )
        }
      />
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
      <Text className="text-xl font-bold text-foreground">{value}</Text>
      <Text className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

function QuickLinkCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Card className="items-start">
        <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-primary-50">
          {icon}
        </View>
        <Text className="text-sm font-bold text-foreground">{title}</Text>
        <Text className="mt-0.5 text-xs text-muted-foreground">{subtitle}</Text>
        <View className="mt-2 flex-row items-center">
          <Text className="text-[11px] font-semibold text-primary-700">Open</Text>
          <ChevronRight size={12} color={COLORS.primary} />
        </View>
      </Card>
    </Pressable>
  );
}
