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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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
  AlertCircle,
  Zap,
  Navigation,
  Phone,
  ShieldCheck,
  Sparkles,
  ShieldAlert,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FieldCopilotModal } from '@/components/ai/FieldCopilotModal';
import { SosModal } from '@/components/safety/SosModal';
import { DailyPrestartModal } from '@/components/safety/DailyPrestartModal';
import { OnMyWayModal } from '@/components/job/OnMyWayModal';
import { OfflineStatusBar } from '@/components/ui/OfflineStatusBar';
import { useEmployeeJobs, useJobLifecycle } from '@/hooks/use-jobs';
import { useAuthStore } from '@/stores/auth-store';
import {
  useTodayShift,
  useWeekShifts,
  useClockIn,
  useClockOut,
  useReportTimeOff,
} from '@/hooks/use-shift';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { downloadAndCacheTodayJobPack } from '@/lib/offline-job-pack';
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
    staleTime: 30_000,
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
  const user = useAuthStore((s) => s.user);
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';
  const [ownerScope, setOwnerScope] = useState<'my' | 'all'>('my');
  const [showCopilot, setShowCopilot] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [onMyWayJob, setOnMyWayJob] = useState<Job | null>(null);

  const lifecycle = useJobLifecycle();

  // 7-day horizontal date strip around today (Mon, Tue, Today, Thu, Fri...)
  const todayDate = useMemo(() => new Date(), []);
  const todayDateKey = useMemo(() => {
    return `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  }, [todayDate]);

  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayDateKey);
  const [showPrestartModal, setShowPrestartModal] = useState(false);
  const [prestartDone, setPrestartDone] = useState(false);

  // Daily Pre-Start SWMS Check: Run once on startup each day.
  // If not completed or dismissed for today's dateKey, show DailyPrestartModal.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(`fieseros_prestart_${todayDateKey}`);
        const dismissed = await AsyncStorage.getItem(`fieseros_prestart_dismissed_${todayDateKey}`);
        if (!isMounted) return;
        if (done === 'completed') {
          setPrestartDone(true);
        } else {
          setPrestartDone(false);
          if (!dismissed) {
            setShowPrestartModal(true);
          }
        }
      } catch (e) {
        console.warn('Prestart check error:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [todayDateKey]);

  const dateStrip = useMemo(() => {
    const days: { dateKey: string; dayAbbr: string; dayNum: number; isToday: boolean }[] = [];
    const base = new Date();
    for (let i = -2; i <= 4; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dateKey: k,
        dayAbbr: i === 0 ? 'Today' : d.toLocaleDateString([], { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  const jobCountsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    const list = allJobs.data ?? [];
    for (const j of list) {
      if (j.scheduledAt) {
        const k = j.scheduledAt.slice(0, 10);
        counts[k] = (counts[k] || 0) + 1;
      }
    }
    return counts;
  }, [allJobs.data]);

  const todaysJobs = useMemo<Job[]>(() => {
    const list = todayJobs.data ?? [];
    const filtered = list.filter((j) => isToday(j.scheduledAt));
    return filtered.length > 0 ? filtered : list; // trust the API if it returned something
  }, [todayJobs.data]);

  const selectedDateJobs = useMemo<Job[]>(() => {
    const list = allJobs.data ?? [];
    return list.filter((j) => {
      if (!j.scheduledAt) return false;
      return j.scheduledAt.slice(0, 10) === selectedDateKey;
    });
  }, [allJobs.data, selectedDateKey]);

  const displayJobs = useMemo<Job[]>(() => {
    if (selectedDateKey === todayDateKey) {
      return todaysJobs;
    }
    return selectedDateJobs;
  }, [selectedDateKey, todayDateKey, todaysJobs, selectedDateJobs]);

  const completedJobs = useMemo<Job[]>(() => {
    const list = allJobs.data ?? [];
    return list.filter(
      (j) =>
        j.lifecycleState === 'completed' ||
        j.status === 'completed' ||
        j.status === 'invoice_generated' ||
        j.status === 'paid' ||
        !!j.completedAt
    );
  }, [allJobs.data]);

  const completedToday = useMemo<Job[]>(() => {
    return completedJobs.filter((j) => isToday(j.completedAt));
  }, [completedJobs]);

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

  const refreshAll = useCallback(async () => {
    downloadAndCacheTodayJobPack().catch(() => {});
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['shift'] }),
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
  }, [queryClient]);

  const handleConfirmTravel = useCallback(
    async (etaMinutes: number) => {
      if (!onMyWayJob) return;
      try {
        await lifecycle.mutateAsync({
          id: onMyWayJob.id,
          action: 'start_travel',
          etaMinutes,
        });
        show(`En route to ${onMyWayJob.customer?.name || 'customer'}!`, 'success');
        refreshAll();
      } catch (err) {
        show(
          err instanceof Error ? err.message : 'Failed to update travel status',
          'error'
        );
      }
    },
    [onMyWayJob, lifecycle, show, refreshAll]
  );

  // Active or Next Up Job (Jobber / Housecall Pro Hero Card)
  const activeJob = useMemo<Job | null>(() => {
    const list = allJobs.data ?? [];
    const activeStates = ['working', 'paused', 'arrived', 'travelling'];
    const active = list.find((j) => {
      const state = (j.lifecycleState || j.status || '').toLowerCase();
      return activeStates.includes(state);
    });
    if (active) return active;

    if (pending.length > 0) return pending[0];

    return (
      list.find(
        (j) =>
          j.status !== 'completed' &&
          j.status !== 'invoice_generated' &&
          j.status !== 'cancelled'
      ) ?? null
    );
  }, [allJobs.data, pending]);

  const weekHours = useMemo(
    () => computeWeekHours(weekShifts.data),
    [weekShifts.data, now]
  );

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

  const reportTimeOff = useReportTimeOff();

  const handleReportSick = useCallback(() => {
    Alert.alert(
      'Report Sick / Call Out',
      "Report sick or request absence for today? Dispatch will be alerted and today's jobs will be rebalanced.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report Sick Today',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await reportTimeOff.mutateAsync({
                reason: 'sick',
                note: 'Technician reported sick from mobile today tab',
              });
              show(res?.message || 'Sick call-out submitted. Get well soon!', 'success');
              refreshAll();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Failed to report sick';
              show(msg, 'error');
            }
          },
        },
      ]
    );
  }, [reportTimeOff, show, refreshAll]);

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
    !todayJobs.data && !allJobs.data && (todayJobs.isLoading || allJobs.isLoading);
  const isRefetching =
    todayShift.isRefetching ||
    todayJobs.isRefetching ||
    allJobs.isRefetching;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <FlatList
        data={displayJobs}
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
          <View className="mb-3">
            <OfflineStatusBar />

            {/* Top Bar: Personalized greeting + Action cluster */}
            <View className="mb-3 mt-1.5 flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-xl font-extrabold text-foreground" numberOfLines={1}>
                  Hey, {user?.name ? user.name.split(' ')[0] : 'Technician'} 👋
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground font-medium">
                  {new Date().toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' · '}
                  <Text className={isClockedIn ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                    {isClockedIn ? 'On Duty' : 'Off Duty'}
                  </Text>
                </Text>
              </View>

              <View className="flex-row items-center gap-1.5">
                {/* Pre-Start Safety Checklist Badge */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setShowPrestartModal(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Daily Pre-Start Safety Checklist"
                  className={`flex-row items-center gap-1 h-9 px-2.5 rounded-full border shadow-xs ${
                    prestartDone
                      ? 'bg-emerald-50 border-emerald-300 active:bg-emerald-100'
                      : 'bg-amber-50 border-amber-300 active:bg-amber-100'
                  }`}
                >
                  <ShieldCheck size={13} color={prestartDone ? '#059669' : '#D97706'} />
                  <Text
                    className={`text-[11px] font-bold ${
                      prestartDone ? 'text-emerald-800' : 'text-amber-800'
                    }`}
                  >
                    {prestartDone ? 'Safety ✓' : 'Safety !'}
                  </Text>
                </Pressable>

                {/* AI Copilot shortcut icon */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    setShowCopilot(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Field AI Copilot"
                  className="h-9 w-9 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 active:bg-emerald-100 shadow-xs"
                >
                  <Sparkles size={16} color="#059669" />
                </Pressable>

                {/* SOS Emergency button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
                    setShowSosModal(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Emergency SOS Distress Signal"
                  className="h-9 w-9 items-center justify-center rounded-full bg-red-50 border border-red-200 active:bg-red-100 shadow-xs"
                >
                  <ShieldAlert size={16} color="#DC2626" />
                </Pressable>

                {/* Notification bell */}
                <Pressable
                  onPress={() => router.push('/(employee)/notifications')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                  className="relative h-9 w-9 items-center justify-center rounded-full bg-slate-100 border border-slate-200 active:bg-slate-200"
                >
                  <Bell size={16} color={COLORS.foreground} />
                  {unread.data ? (
                    <View className="absolute -right-1 -top-1 min-w-[16px] h-[16px] px-0.5 items-center justify-center rounded-full bg-destructive">
                      <Text className="text-[9px] font-bold text-white">
                        {unread.data > 99 ? '99+' : unread.data}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>

            {/* Smart Shift & Attendance Action Bar */}
            <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-1.5">
                    <View
                      className={`h-2.5 w-2.5 rounded-full ${
                        isClockedIn ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <Text className="text-xs font-bold text-slate-900">
                      {isClockedIn ? 'Clocked In' : 'Off Duty'}
                    </Text>
                    {isClockedIn && shift ? (
                      <Text className="text-xs font-semibold text-emerald-700">
                        · {computeElapsed(shift.startTime)}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="mt-0.5 text-[11px] text-muted-foreground">
                    {isClockedIn && shift
                      ? `Started at ${formatTime(shift.startTime)}`
                      : 'Clock in to log hours & start jobs'}
                  </Text>
                </View>

                <View className="flex-row items-center gap-1.5">
                  {isClockedIn ? (
                    <>
                      <Pressable
                        onPress={handleReportSick}
                        hitSlop={8}
                        className="h-8 px-2.5 items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200"
                      >
                        <Text className="text-[11px] font-medium text-slate-600">Sick</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleClockOut}
                        className="h-8 px-3 flex-row items-center justify-center gap-1.5 rounded-xl bg-red-600 active:bg-red-700 shadow-xs"
                      >
                        <LogOut size={13} color="#fff" />
                        <Text className="text-xs font-bold text-white">Clock Out</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={handleClockIn}
                      className="h-8 px-3.5 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-600 active:bg-emerald-700 shadow-xs"
                    >
                      <LogIn size={13} color="#fff" />
                      <Text className="text-xs font-bold text-white">Clock In</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>

            {/* 7-Day Date Scroller Ribbon (Calendar Navigator) */}
            <View className="mb-3">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 2, gap: 8 }}
              >
                {dateStrip.map((item) => {
                  const isSelected = selectedDateKey === item.dateKey;
                  const count = jobCountsByDate[item.dateKey] || 0;
                  return (
                    <Pressable
                      key={item.dateKey}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setSelectedDateKey(item.dateKey);
                      }}
                      className={`min-w-[54px] items-center justify-center rounded-2xl py-2 px-1.5 border transition-all ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-600 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isSelected ? 'text-emerald-100' : 'text-muted-foreground'
                        }`}
                      >
                        {item.dayAbbr}
                      </Text>
                      <Text
                        className={`text-base font-extrabold mt-0.5 ${
                          isSelected ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {item.dayNum}
                      </Text>
                      {count > 0 ? (
                        <View
                          className={`mt-1 size-1.5 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-emerald-600'
                          }`}
                        />
                      ) : (
                        <View className="mt-1 size-1.5" />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Owner / Admin Workspace Scope Toggle */}
            {isOwnerOrAdmin ? (
              <View className="mb-3 flex-row rounded-xl bg-muted p-1 border border-border/60">
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setOwnerScope('my');
                  }}
                  className={`flex-1 items-center justify-center rounded-lg py-1.5 ${
                    ownerScope === 'my' ? 'bg-white shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      ownerScope === 'my' ? 'text-primary-700 font-extrabold' : 'text-muted-foreground'
                    }`}
                  >
                    My Assigned Jobs
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setOwnerScope('all');
                  }}
                  className={`flex-1 items-center justify-center rounded-lg py-1.5 ${
                    ownerScope === 'all' ? 'bg-white shadow-xs' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      ownerScope === 'all' ? 'text-primary-700 font-extrabold' : 'text-muted-foreground'
                    }`}
                  >
                    All Company Jobs
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* "Next Up / Active Job" Hero Card (Housecall Pro Style) */}
            {activeJob ? (
              <Card className="mb-3 border-2 border-emerald-300 bg-emerald-50/30 p-4 shadow-sm">
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center rounded-full bg-emerald-100 px-2.5 py-0.5">
                    <Zap size={12} color="#059669" />
                    <Text className="ml-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      {activeJob.lifecycleState === 'working'
                        ? 'In Progress Now'
                        : activeJob.lifecycleState === 'travelling'
                        ? 'En Route'
                        : activeJob.lifecycleState === 'arrived'
                        ? 'Arrived on Site'
                        : 'Next Up Today'}
                    </Text>
                  </View>
                  <StatusBadge status={activeJob.lifecycleState || activeJob.status} />
                </View>

                <Text className="text-lg font-extrabold text-foreground" numberOfLines={1}>
                  {activeJob.customer?.name || activeJob.title}
                </Text>

                {activeJob.service ? (
                  <Text className="mt-0.5 text-xs font-semibold text-emerald-700">
                    {activeJob.service.name}
                  </Text>
                ) : null}

                {activeJob.address ? (
                  <View className="mt-2 flex-row items-center">
                    <MapPin size={13} color={COLORS.mutedForeground} />
                    <Text className="ml-1.5 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
                      {activeJob.address}
                    </Text>
                  </View>
                ) : null}

                {/* Hero Action Buttons */}
                <View className="mt-3.5 flex-row gap-2">
                  {activeJob.lifecycleState === 'working' ? (
                    <Button
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                        router.push({
                          pathname: '/(employee)/jobs/[id]',
                          params: { id: activeJob.id },
                        });
                      }}
                      className="flex-1 bg-emerald-600 active:bg-emerald-700"
                      size="md"
                    >
                      <View className="flex-row items-center justify-center">
                        <Briefcase size={15} color="#fff" />
                        <Text className="ml-1.5 font-bold text-white">Open Active Job</Text>
                      </View>
                    </Button>
                  ) : activeJob.lifecycleState === 'travelling' ? (
                    <Button
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                        router.push({
                          pathname: '/(employee)/jobs/[id]',
                          params: { id: activeJob.id },
                        });
                      }}
                      className="flex-1 bg-blue-600 active:bg-blue-700"
                      size="md"
                    >
                      <View className="flex-row items-center justify-center">
                        <Navigation size={15} color="#fff" />
                        <Text className="ml-1.5 font-bold text-white">En Route · Open Job</Text>
                      </View>
                    </Button>
                  ) : activeJob.lifecycleState === 'arrived' ? (
                    <Button
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                        router.push({
                          pathname: '/(employee)/jobs/[id]',
                          params: { id: activeJob.id },
                        });
                      }}
                      className="flex-1 bg-emerald-600 active:bg-emerald-700"
                      size="md"
                    >
                      <View className="flex-row items-center justify-center">
                        <Briefcase size={15} color="#fff" />
                        <Text className="ml-1.5 font-bold text-white">Arrived · Start Work</Text>
                      </View>
                    </Button>
                  ) : (
                    <Button
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                        setOnMyWayJob(activeJob);
                      }}
                      className="flex-1 bg-emerald-600 active:bg-emerald-700"
                      size="md"
                    >
                      <View className="flex-row items-center justify-center">
                        <Navigation size={15} color="#fff" />
                        <Text className="ml-1.5 font-bold text-white">On My Way</Text>
                      </View>
                    </Button>
                  )}

                  {activeJob.address ? (
                    <Button
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        const encoded = encodeURIComponent(activeJob.address!);
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
                      }}
                      variant="outline"
                      size="md"
                      className="border-slate-300"
                    >
                      <MapPin size={16} color="#059669" />
                    </Button>
                  ) : null}

                  {activeJob.customer?.phone ? (
                    <Button
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        Linking.openURL(`tel:${activeJob.customer.phone}`);
                      }}
                      variant="outline"
                      size="md"
                      className="border-slate-300"
                    >
                      <Phone size={16} color="#059669" />
                    </Button>
                  ) : null}
                </View>
              </Card>
            ) : null}

            {/* Consolidated 4-Metric Stats Bar */}
            <View className="mb-3 flex-row rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xs justify-between">
              <View className="flex-1 items-center border-r border-slate-100">
                <Text className="text-base font-extrabold text-slate-900">{todaysJobs.length}</Text>
                <Text className="text-[10px] font-semibold uppercase text-muted-foreground">Today</Text>
              </View>
              <View className="flex-1 items-center border-r border-slate-100">
                <Text className="text-base font-extrabold text-emerald-600">
                  {completedToday.length > 0 ? completedToday.length : completedJobs.length}
                </Text>
                <Text className="text-[10px] font-semibold uppercase text-muted-foreground">Done</Text>
              </View>
              <View className="flex-1 items-center border-r border-slate-100">
                <Text className="text-base font-extrabold text-amber-600">{pending.length}</Text>
                <Text className="text-[10px] font-semibold uppercase text-muted-foreground">Pending</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-base font-extrabold text-blue-600">{weekHours.toFixed(1)}h</Text>
                <Text className="text-[10px] font-semibold uppercase text-muted-foreground">Week</Text>
              </View>
            </View>

            {/* Today's Jobs Section Header */}
            <View className="mb-2 mt-0.5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-bold text-foreground">
                  Today's Jobs
                </Text>
                <View className="rounded-full bg-slate-100 px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-slate-600">
                    {displayJobs.length}
                  </Text>
                </View>
              </View>

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
          ) : completedJobs.length > 0 ? (
            <View className="py-2">
              <View className="items-center rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CircleCheck size={26} color={COLORS.success} />
                </View>
                <Text className="text-base font-bold text-foreground">
                  No active jobs for today
                </Text>
                <Text className="mt-1 text-center text-xs text-muted-foreground">
                  You have {completedJobs.length} completed {completedJobs.length === 1 ? 'job' : 'jobs'} on your account. Tap below to view your full history.
                </Text>
                <View className="mt-3.5">
                  <Button
                    onPress={() => router.push('/(employee)/jobs')}
                    size="sm"
                  >
                    <View className="flex-row items-center">
                      <Briefcase size={14} color="#fff" />
                      <Text className="ml-1.5 text-xs font-semibold text-white">
                        View All Completed Jobs ({completedJobs.length})
                      </Text>
                    </View>
                  </Button>
                </View>
              </View>

              {/* Show preview of recently completed jobs right on Today */}
              <View className="mt-5">
                <View className="mb-2.5 flex-row items-center justify-between">
                  <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Recently Completed
                  </Text>
                  <Pressable onPress={() => router.push('/(employee)/jobs')}>
                    <Text className="text-xs font-semibold text-primary-700">
                      See all ({completedJobs.length})
                    </Text>
                  </Pressable>
                </View>
                {completedJobs.slice(0, 3).map((job) => (
                  <View key={job.id} className="mb-1">
                    {renderJob({ item: job })}
                  </View>
                ))}
              </View>
            </View>
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

      <DailyPrestartModal
        visible={showPrestartModal}
        onClose={() => setShowPrestartModal(false)}
        onCompleted={() => setPrestartDone(true)}
        technicianName={user?.name || user?.email}
        dateKey={todayDateKey}
      />

      <FieldCopilotModal
        visible={showCopilot}
        onClose={() => setShowCopilot(false)}
      />

      <SosModal
        visible={showSosModal}
        onClose={() => setShowSosModal(false)}
        activeJobId={activeJob?.id}
        activeJobAddress={activeJob?.address}
      />

      {onMyWayJob ? (
        <OnMyWayModal
          visible={!!onMyWayJob}
          onClose={() => setOnMyWayJob(null)}
          job={onMyWayJob}
          onConfirmTravel={handleConfirmTravel}
        />
      ) : null}
    </SafeAreaView>
  );
}


