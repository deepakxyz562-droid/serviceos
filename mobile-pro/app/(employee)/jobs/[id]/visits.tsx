/**
 * Scheduled Visits (Employee) — NEW.
 *
 * PWA-parity features:
 *   - Fetches GET /api/jobs/[id]/visits → ScheduledVisit[].
 *   - Timeline view if multiple visits, list otherwise.
 *   - Shows scheduled time, status, duration, notes.
 *   - Pull-to-refresh + empty + error states.
 */
import React, { useCallback, useMemo } from 'react';
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
  CalendarClock,
  CircleCheck,
  Circle,
  Clock,
  StickyNote,
  MapPin,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useJob,
  useJobVisits,
} from '@/hooks/use-jobs';
import { COLORS } from '@/lib/constants';
import type { ScheduledVisit } from '@/types';

const STATUS_VARIANT: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info'
> = {
  scheduled: 'info',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'destructive',
  missed: 'warning',
  in_progress: 'warning',
};

const formatDateTime = (iso: string): string => {
  try {
    return format(parseISO(iso), "EEE, MMM d · h:mm a");
  } catch {
    return new Date(iso).toLocaleString();
  }
};

const formatDuration = (mins: number | null | undefined): string => {
  if (!mins || mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
};

export default function JobVisitsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const jobQuery = useJob(id);
  const visitsQuery = useJobVisits(id);
  const { refetch: refetchVisits } = visitsQuery;

  useFocusEffect(
    useCallback(() => {
      refetchVisits();
    }, [refetchVisits])
  );

  const visits: ScheduledVisit[] = visitsQuery.data ?? jobQuery.data?.visits ?? [];

  const sorted = useMemo(() => {
    return [...visits].sort((a, b) => {
      const ta = new Date(a.scheduledAt).getTime();
      const tb = new Date(b.scheduledAt).getTime();
      return ta - tb;
    });
  }, [visits]);

  if (jobQuery.isLoading && !jobQuery.data && !visitsQuery.data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Scheduled Visits" />
        <Spinner />
      </SafeAreaView>
    );
  }

  if (jobQuery.error || (!jobQuery.data && !visitsQuery.data)) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Scheduled Visits" />
        <EmptyState
          icon={<CalendarClock size={48} color={COLORS.mutedForeground} />}
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
      <Header onBack={() => router.back()} title="Scheduled Visits" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!visitsQuery.isRefetching}
            onRefresh={() => visitsQuery.refetch()}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View className="mb-3 mt-2">
          <Text className="text-base font-bold text-foreground">
            {sorted.length} {sorted.length === 1 ? 'Visit' : 'Visits'}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            Scheduled service appointments for this job.
          </Text>
        </View>

        {visitsQuery.isLoading && sorted.length === 0 ? (
          <Card>
            <Text className="text-sm text-muted-foreground">Loading…</Text>
          </Card>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={48} color={COLORS.mutedForeground} />}
            title="No scheduled visits"
            description="Visits will be listed here once they are scheduled for this job."
          />
        ) : (
          <View>
            {sorted.map((v, idx) => {
              const isLast = idx === sorted.length - 1;
              const isCompleted =
                v.status === 'completed' ||
                v.status === 'completed_late';
              return (
                <View key={v.id} className="flex-row">
                  {/* Timeline column */}
                  <View className="mr-3 items-center">
                    <View
                      className={`mt-1 h-6 w-6 items-center justify-center rounded-full ${
                        isCompleted ? 'bg-primary-500' : 'bg-muted'
                      }`}
                    >
                      {isCompleted ? (
                        <CircleCheck size={14} color="#fff" />
                      ) : (
                        <Circle size={14} color={COLORS.mutedForeground} />
                      )}
                    </View>
                    {!isLast ? (
                      <View
                        style={{
                          width: 2,
                          flex: 1,
                          backgroundColor: COLORS.border,
                          marginTop: 2,
                          marginBottom: 8,
                        }}
                      />
                    ) : null}
                  </View>
                  {/* Content card */}
                  <View className="mb-3 flex-1">
                    <Card>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-bold text-foreground">
                            {formatDateTime(v.scheduledAt)}
                          </Text>
                        </View>
                        <Badge variant={STATUS_VARIANT[v.status] ?? 'default'}>
                          {v.status.replace(/_/g, ' ')}
                        </Badge>
                      </View>

                      <View className="mt-2 flex-row items-center">
                        <Clock size={13} color={COLORS.mutedForeground} />
                        <Text className="ml-1.5 text-xs text-muted-foreground">
                          Duration: {formatDuration(v.durationMinutes)}
                        </Text>
                      </View>

                      {v.notes ? (
                        <View className="mt-2 flex-row items-start rounded-md bg-muted p-2">
                          <StickyNote size={12} color={COLORS.mutedForeground} />
                          <Text className="ml-1.5 flex-1 text-xs text-foreground">
                            {v.notes}
                          </Text>
                        </View>
                      ) : null}
                    </Card>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
