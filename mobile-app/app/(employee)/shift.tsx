/**
 * Shift / Time Tracking (Employee)
 *
 * Mirrors the PWA employee portal's "attendance" view:
 *  - Big clock + live elapsed timer (updates every second when clocked in).
 *  - Clock In (with GPS coords) / Clock Out / Start Break / End Break.
 *  - Today's totals: hours worked + break minutes.
 *  - This week overview: total hours, total shifts.
 *  - Week history: list of past shifts (date, hours, status).
 *
 * APIs:
 *   GET  /api/employee/shift/today  → { shift: Shift | null }
 *   GET  /api/employee/shift/week   → { shifts, totalHours, totalShifts }
 *   POST /api/employee/shift        → { action, latitude?, longitude? }
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, parseISO, isToday as isDateToday } from 'date-fns';
import {
  LogIn,
  LogOut,
  Clock,
  CalendarDays,
  Coffee,
  Play,
  MapPin,
  History,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  useShiftToday,
  useShiftWeek,
  useClockIn,
  useClockOut,
  useBreakStart,
  useBreakEnd,
} from '@/hooks/use-shift';
import { COLORS } from '@/lib/constants';
import { getCurrentPosition } from '@/lib/location';
import { cn } from '@/lib/cn';
import type { Shift } from '@/types';

const formatClock = (d: Date): string =>
  format(d, 'h:mm:ss a');

const formatTime = (iso: string): string => {
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return '—';
  }
};

const formatDate = (iso: string): string => {
  try {
    return format(parseISO(iso), 'EEE, MMM d');
  } catch {
    return '—';
  }
};

const computeElapsed = (startIso: string, now: number): { h: string; m: string; s: string } => {
  const start = new Date(startIso).getTime();
  const diff = Math.max(0, now - start);
  const totalSeconds = Math.floor(diff / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return {
    h: h.toString().padStart(2, '0'),
    m: m.toString().padStart(2, '0'),
    s: s.toString().padStart(2, '0'),
  };
};

/** Compute hours for a single shift, optionally counting up if active. */
const shiftHours = (s: Shift, now: number): number => {
  const start = new Date(s.startTime).getTime();
  if (s.endTime === null) {
    return Math.round(((now - start) / 3600000) * 10) / 10;
  }
  if (typeof s.totalHours === 'number') return s.totalHours;
  const end = new Date(s.endTime).getTime();
  return Math.round(((end - start) / 3600000) * 10) / 10;
};

const computeWeekHours = (shifts: Shift[] | undefined, now: number): number => {
  if (!shifts || shifts.length === 0) return 0;
  let totalMinutes = 0;
  for (const s of shifts) {
    const start = new Date(s.startTime).getTime();
    if (s.endTime === null) {
      totalMinutes += Math.max(0, Math.floor((now - start) / 60000));
    } else if (typeof s.totalHours === 'number') {
      totalMinutes += Math.round(s.totalHours * 60);
    } else {
      const end = new Date(s.endTime).getTime();
      totalMinutes += Math.max(0, Math.floor((end - start) / 60000));
    }
  }
  return Math.round((totalMinutes / 60) * 10) / 10;
};

const statusLabel = (s: Shift): string => {
  const st = (s.status || '').toLowerCase();
  if (st === 'on_break' || st === 'break') return 'On Break';
  if (s.endTime === null) return 'Clocked In';
  return 'Clocked Out';
};

export default function ShiftScreen() {
  const toast = useToast();
  const [now, setNow] = useState<number>(Date.now());

  const todayShift = useShiftToday();
  const weekQuery = useShiftWeek();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const breakStart = useBreakStart();
  const breakEnd = useBreakEnd();

  // Update clock every second while screen is mounted (so elapsed timer ticks).
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const shift = todayShift.data ?? null;
  const isClockedIn = !!shift && !shift.endTime;
  const isOnBreak =
    !!shift &&
    !shift.endTime &&
    (shift.status || '').toLowerCase() === 'on_break';
  const elapsed = isClockedIn && shift
    ? computeElapsed(shift.startTime, now)
    : { h: '00', m: '00', s: '00' };

  const weekShifts = weekQuery.data?.shifts ?? [];
  const weekHours = weekQuery.data?.totalHours ?? computeWeekHours(weekShifts, now);
  const weekShiftsCount = weekQuery.data?.totalShifts ?? weekShifts.length;

  const todayHours = (() => {
    if (!shift) return 0;
    return shiftHours(shift, now);
  })();

  const todayBreakMinutes = shift?.breakMinutes ?? 0;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      todayShift.refetch(),
      weekQuery.refetch(),
    ]);
  }, [todayShift, weekQuery]);

  const handleClockIn = async () => {
    // Try to attach GPS coordinates as required by the PWA contract.
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const pos = await getCurrentPosition();
      latitude = pos.latitude;
      longitude = pos.longitude;
    } catch (err) {
      // GPS unavailable — proceed without coordinates (backend may allow it).
      console.warn('[shift] GPS unavailable for clock-in:', err);
    }

    try {
      await clockIn.mutateAsync({ latitude, longitude });
      toast.show(
        latitude
          ? `Clocked in at ${format(new Date(), 'h:mm a')}`
          : 'Clocked in',
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      toast.show(`Clock in failed: ${msg}`, 'error');
    }
  };

  const handleClockOut = () => {
    Alert.alert('Clock Out', 'End your shift now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clock Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await clockOut.mutateAsync();
            toast.show('Clocked out. Nice work today!', 'success');
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Please try again.';
            toast.show(`Clock out failed: ${msg}`, 'error');
          }
        },
      },
    ]);
  };

  const handleBreakStart = async () => {
    try {
      await breakStart.mutateAsync();
      toast.show('Break started', 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      toast.show(`Couldn't start break: ${msg}`, 'error');
    }
  };

  const handleBreakEnd = async () => {
    try {
      await breakEnd.mutateAsync();
      toast.show('Back to work', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      toast.show(`Couldn't end break: ${msg}`, 'error');
    }
  };

  const anyActionPending =
    clockIn.isPending ||
    clockOut.isPending ||
    breakStart.isPending ||
    breakEnd.isPending;

  const isLoading = todayShift.isLoading && !todayShift.data;

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="px-4 pt-2">
          <Text className="mb-3 text-2xl font-bold text-foreground">Shift</Text>
          <SkeletonList count={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={todayShift.isRefetching || weekQuery.isRefetching}
            onRefresh={refreshAll}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <Text className="mb-3 mt-2 text-2xl font-bold text-foreground">Shift</Text>

        {/* ── Active shift card / clock-in CTA ─────────────────────────── */}
        <Card className="mb-4 items-center">
          <View className="mb-1 flex-row items-center">
            <Clock size={14} color={COLORS.mutedForeground} />
            <Text className="ml-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Current Time
            </Text>
          </View>
          <Text className="text-4xl font-bold tabular-nums text-foreground">
            {formatClock(new Date(now))}
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {format(new Date(now), 'EEEE, MMMM d')}
          </Text>

          {/* Status pill */}
          <View
            className={cn(
              'mt-4 rounded-full px-4 py-1.5',
              isOnBreak ? 'bg-amber-100' : isClockedIn ? 'bg-primary-100' : 'bg-muted'
            )}
          >
            <View className="flex-row items-center">
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isOnBreak
                    ? COLORS.warning
                    : isClockedIn
                      ? COLORS.primary
                      : COLORS.mutedForeground,
                  marginRight: 8,
                }}
              />
              <Text
                className={cn(
                  'text-sm font-semibold',
                  isOnBreak
                    ? 'text-amber-700'
                    : isClockedIn
                      ? 'text-primary-700'
                      : 'text-muted-foreground'
                )}
              >
                {isOnBreak
                  ? 'On Break'
                  : isClockedIn
                    ? 'Clocked In'
                    : 'Off the Clock'}
              </Text>
            </View>
          </View>

          {/* Elapsed time */}
          {isClockedIn && shift ? (
            <View className="mt-4 items-center">
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Elapsed
              </Text>
              <Text
                className={cn(
                  'mt-1 text-3xl font-bold tabular-nums',
                  isOnBreak ? 'text-amber-600' : 'text-primary-600'
                )}
              >
                {elapsed.h}:{elapsed.m}:{elapsed.s}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Started at {formatTime(shift.startTime)}
              </Text>
              {shift.location ? (
                <View className="mt-1 flex-row items-center">
                  <MapPin size={11} color={COLORS.mutedForeground} />
                  <Text
                    className="ml-1 text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    {shift.location}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Action buttons */}
          <View className="mt-5 w-full gap-2">
            {isClockedIn ? (
              <>
                {/* Break + Clock Out row */}
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    {isOnBreak ? (
                      <Button
                        variant="outline"
                        onPress={handleBreakEnd}
                        loading={breakEnd.isPending}
                        disabled={anyActionPending}
                        fullWidth
                      >
                        <View className="flex-row items-center justify-center">
                          <Play size={16} color={COLORS.primary} />
                          <Text className="ml-2 font-semibold text-primary-700">
                            End Break
                          </Text>
                        </View>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onPress={handleBreakStart}
                        loading={breakStart.isPending}
                        disabled={anyActionPending}
                        fullWidth
                      >
                        <View className="flex-row items-center justify-center">
                          <Coffee size={16} color={COLORS.warning} />
                          <Text className="ml-2 font-semibold text-amber-700">
                            Start Break
                          </Text>
                        </View>
                      </Button>
                    )}
                  </View>
                  <View className="flex-1">
                    <Button
                      variant="destructive"
                      onPress={handleClockOut}
                      loading={clockOut.isPending}
                      disabled={anyActionPending}
                      fullWidth
                    >
                      <View className="flex-row items-center justify-center">
                        <LogOut size={16} color="#fff" />
                        <Text className="ml-2 font-semibold text-white">
                          Clock Out
                        </Text>
                      </View>
                    </Button>
                  </View>
                </View>
              </>
            ) : (
              <Button
                onPress={handleClockIn}
                loading={clockIn.isPending}
                disabled={anyActionPending}
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

        {/* ── Today's totals ─────────────────────────────────────────── */}
        <View className="mb-2 flex-row gap-2">
          <StatCard
            icon={<Clock size={16} color={COLORS.primary} />}
            label="Hours Today"
            value={`${todayHours.toFixed(1)}h`}
          />
          <StatCard
            icon={<Coffee size={16} color={COLORS.warning} />}
            label="Break Today"
            value={`${todayBreakMinutes}m`}
          />
          <StatCard
            icon={<CalendarDays size={16} color={COLORS.accent} />}
            label="Week Hours"
            value={`${weekHours.toFixed(1)}h`}
          />
        </View>

        {/* ── This week overview ─────────────────────────────────────── */}
        <View className="mb-2 mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <History size={18} color={COLORS.foreground} />
            <Text className="ml-2 text-base font-bold text-foreground">
              This Week
            </Text>
          </View>
          <Badge variant="primary">{weekShiftsCount} shifts</Badge>
        </View>

        {weekShifts.length === 0 ? (
          <EmptyState
            icon={<Clock size={48} color={COLORS.mutedForeground} />}
            title="No shifts this week yet"
            description="Clock in to start tracking your time."
          />
        ) : (
          <View>
            {weekShifts.map((s) => {
              const active = s.endTime === null;
              const onBreak =
                active && (s.status || '').toLowerCase() === 'on_break';
              const hours = shiftHours(s, now);
              return (
                <Card key={s.id} className="mb-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-sm font-bold text-foreground">
                        {formatDate(s.startTime)}
                        {isDateToday(parseISO(s.startTime)) ? '  ·  Today' : ''}
                      </Text>
                      <Text className="mt-0.5 text-xs text-muted-foreground">
                        {formatTime(s.startTime)} —{' '}
                        {active ? 'in progress' : s.endTime ? formatTime(s.endTime) : '—'}
                      </Text>
                      {s.location ? (
                        <View className="mt-1 flex-row items-center">
                          <MapPin size={11} color={COLORS.mutedForeground} />
                          <Text
                            className="ml-1 text-[11px] text-muted-foreground"
                            numberOfLines={1}
                          >
                            {s.location}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-bold text-foreground">
                        {hours.toFixed(1)}h
                      </Text>
                      {active ? (
                        <View className="mt-0.5 flex-row items-center">
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: onBreak
                                ? COLORS.warning
                                : COLORS.primary,
                              marginRight: 4,
                            }}
                          />
                          <Text
                            className={cn(
                              'text-[10px] font-semibold uppercase',
                              onBreak ? 'text-amber-700' : 'text-primary-700'
                            )}
                          >
                            {onBreak ? 'On Break' : 'Active'}
                          </Text>
                        </View>
                      ) : (
                        <Text className="mt-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          {statusLabel(s)}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })}

            {/* Week total */}
            <Card className="mt-2 bg-primary-50">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-primary-700">
                  Week Total
                </Text>
                <Text className="text-xl font-bold text-primary-700">
                  {weekHours.toFixed(1)}h
                </Text>
              </View>
            </Card>
          </View>
        )}
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
