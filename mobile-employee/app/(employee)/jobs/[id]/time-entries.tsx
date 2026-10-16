/**
 * Time Entries (Employee) — NEW (replaces the alert-only stub).
 *
 * PWA-parity features:
 *   - Fetches GET /api/jobs/[id]/time-entries → TimeEntry[].
 *   - List of entries: start time, end time, duration, type (work/break/travel),
 *     user name.
 *   - Total time summary at top.
 *   - Start/Stop timer button:
 *       • POST /api/jobs/[id]/time-entries { startTime }
 *       • PATCH /api/jobs/[id]/time-entries/[entryId] { endTime }
 *   - Pull-to-refresh + loading + empty + error states.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import {
  ArrowLeft,
  Timer,
  Play,
  Square,
  Clock,
  Coffee,
  Truck,
  Briefcase,
  User,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  useJob,
  useJobTimeEntries,
  useStartTimeEntry,
  useStopTimeEntry,
} from '@/hooks/use-jobs';
import { COLORS } from '@/lib/constants';
import type { TimeEntry } from '@/types';

const ENTRY_TYPE_META: Record<
  string,
  { label: string; icon: React.ReactNode; variant: 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info' }
> = {
  work: { label: 'Work', icon: <Briefcase size={12} color={COLORS.primary} />, variant: 'primary' },
  break: { label: 'Break', icon: <Coffee size={12} color={COLORS.warning} />, variant: 'warning' },
  travel: { label: 'Travel', icon: <Truck size={12} color={COLORS.info} />, variant: 'info' },
};

const formatTime = (iso: string): string => {
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return new Date(iso).toLocaleTimeString();
  }
};

const formatDate = (iso: string): string => {
  try {
    return format(parseISO(iso), 'EEE, MMM d');
  } catch {
    return new Date(iso).toLocaleDateString();
  }
};

const formatDurationFromMs = (ms: number): string => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const formatDurationMinutes = (mins: number | null | undefined): string => {
  if (!mins || mins <= 0) return '—';
  return formatDurationFromMs(mins * 60000);
};

export default function JobTimeEntriesScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const { show } = useToast();

  const jobQuery = useJob(id);
  const timeEntriesQuery = useJobTimeEntries(id);
  const startTimeEntry = useStartTimeEntry();
  const stopTimeEntry = useStopTimeEntry();

  const [now, setNow] = useState(Date.now());

  // Re-render every 30s while a timer is active.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      timeEntriesQuery.refetch();
       
    }, [id])
  );

  const entries: TimeEntry[] =
    timeEntriesQuery.data ?? jobQuery.data?.timeEntries ?? [];

  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => {
      const ta = new Date(a.startTime).getTime();
      const tb = new Date(b.startTime).getTime();
      return tb - ta; // newest first
    });
  }, [entries]);

  const activeEntry = useMemo(
    () => entries.find((e) => !e.endTime) ?? null,
    [entries]
  );

  const totalMs = useMemo(() => {
    let total = 0;
    for (const e of entries) {
      const start = new Date(e.startTime).getTime();
      const end = e.endTime ? new Date(e.endTime).getTime() : now;
      if (e.durationMinutes && e.endTime) {
        total += e.durationMinutes * 60000;
      } else {
        total += Math.max(0, end - start);
      }
    }
    return total;
  }, [entries, now]);

  const handleStart = useCallback(async () => {
    try {
      await startTimeEntry.mutateAsync({ jobId: id });
      show('Timer started.', 'success');
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Failed to start timer.',
        'error'
      );
    }
  }, [id, startTimeEntry, show]);

  const handleStop = useCallback(async () => {
    if (!activeEntry) return;
    try {
      await stopTimeEntry.mutateAsync({ jobId: id, entryId: activeEntry.id });
      show('Timer stopped.', 'success');
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Failed to stop timer.',
        'error'
      );
    }
  }, [activeEntry, id, stopTimeEntry, show]);

  if (jobQuery.isLoading && !jobQuery.data && !timeEntriesQuery.data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Time Entries" />
        <View className="mt-4 px-4">
          <Card className="h-24"><View /></Card>
        </View>
      </SafeAreaView>
    );
  }

  if (jobQuery.error || (!jobQuery.data && !timeEntriesQuery.data)) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Time Entries" />
        <EmptyState
          icon={<Timer size={48} color={COLORS.mutedForeground} />}
          title="Job not found"
          description={
            jobQuery.error instanceof Error
              ? jobQuery.error.message
              : 'Please go back and try again.'
          }
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={() => router.back()} title="Time Entries" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!timeEntriesQuery.isRefetching}
            onRefresh={() => timeEntriesQuery.refetch()}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Total + active timer card */}
        <Card className="mb-3 mt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total Time Tracked
              </Text>
              <Text className="mt-0.5 text-2xl font-bold text-foreground">
                {formatDurationFromMs(totalMs)}
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <Timer size={22} color={COLORS.primary} />
            </View>
          </View>

          {/* Active timer indicator */}
          {activeEntry ? (
            <View className="mt-3 rounded-lg bg-primary-50 p-3">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                    Active Timer
                  </Text>
                  <Text className="mt-0.5 text-sm font-bold text-foreground">
                    Started at {formatTime(activeEntry.startTime)}
                  </Text>
                </View>
                <Text className="text-lg font-bold text-primary-700">
                  {formatDurationFromMs(
                    now - new Date(activeEntry.startTime).getTime()
                  )}
                </Text>
              </View>
            </View>
          ) : null}

          <View className="mt-3">
            {activeEntry ? (
              <Button
                variant="destructive"
                onPress={handleStop}
                loading={stopTimeEntry.isPending}
                fullWidth
              >
                <View className="flex-row items-center justify-center">
                  <Square size={16} color="#fff" />
                  <Text className="ml-2 font-semibold text-white">Stop Timer</Text>
                </View>
              </Button>
            ) : (
              <Button
                onPress={handleStart}
                loading={startTimeEntry.isPending}
                fullWidth
              >
                <View className="flex-row items-center justify-center">
                  <Play size={16} color="#fff" />
                  <Text className="ml-2 font-semibold text-white">Start Timer</Text>
                </View>
              </Button>
            )}
          </View>
        </Card>

        {/* Entries list */}
        {timeEntriesQuery.isLoading && entries.length === 0 ? (
          <Card>
            <Text className="text-sm text-muted-foreground">Loading…</Text>
          </Card>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Timer size={48} color={COLORS.mutedForeground} />}
            title="No time entries yet"
            description="Tap Start Timer above to begin tracking time on this job."
          />
        ) : (
          sorted.map((entry) => {
            const typeMeta =
              ENTRY_TYPE_META[entry.type || 'work'] ?? ENTRY_TYPE_META.work;
            const isActive = !entry.endTime;
            const duration = entry.endTime
              ? entry.durationMinutes
                ? formatDurationMinutes(entry.durationMinutes)
                : formatDurationFromMs(
                    new Date(entry.endTime).getTime() -
                      new Date(entry.startTime).getTime()
                  )
              : formatDurationFromMs(
                  now - new Date(entry.startTime).getTime()
                );
            return (
              <Card key={entry.id} className="mb-2.5">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center">
                      <Badge variant={typeMeta.variant}>{typeMeta.label}</Badge>
                      {isActive ? (
                        <View className="ml-2 flex-row items-center">
                          <View className="mr-1 h-2 w-2 animate-pulse rounded-full bg-primary-500" />
                          <Text className="text-[10px] font-bold uppercase text-primary-700">
                            Active
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-1.5 text-sm font-semibold text-foreground">
                      {formatDate(entry.startTime)} ·{' '}
                      {formatTime(entry.startTime)}
                      {entry.endTime ? ` → ${formatTime(entry.endTime)}` : ''}
                    </Text>
                    {entry.user?.name ? (
                      <View className="mt-1 flex-row items-center">
                        <User size={11} color={COLORS.mutedForeground} />
                        <Text className="ml-1 text-xs text-muted-foreground">
                          {entry.user.name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View className="items-end">
                    <View className="flex-row items-center">
                      <Clock size={12} color={COLORS.mutedForeground} />
                      <Text className="ml-1 text-sm font-bold text-foreground">
                        {duration}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <LoadingOverlay
        visible={startTimeEntry.isPending || stopTimeEntry.isPending}
        message={startTimeEntry.isPending ? 'Starting timer…' : 'Stopping timer…'}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="flex-row items-center border-b border-border bg-white px-4 py-3">
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={22} color={COLORS.foreground} />
      </Pressable>
      <Text className="ml-3 text-lg font-bold text-foreground">{title}</Text>
    </View>
  );
}
