/**
 * Live Job Tracking Screen (NEW)
 *
 * Fetches `GET /api/portal/[id]` (public portal endpoint) → LiveTrackingInfo.
 *
 * Features:
 *   - Live status timeline (pending → confirmed → assigned → en_route → in_progress → completed)
 *   - Employee name + phone (call button) if available
 *   - ETA if available
 *   - Scheduled time
 *   - Auto-refresh every 15 seconds (useQuery `refetchInterval`) while job is active
 *   - Map view with live technician position (visual map card with coordinates)
 *   - Completed state: show completed time + "Leave a Review" CTA
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Phone,
  Navigation,
  Clock,
  CheckCircle2,
  MapPin,
  User,
  Star,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { COLORS, BOOKING_TIMELINE_STEPS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { LiveTrackingInfo } from '@/types';

// ── Timeline step labels ─────────────────────────────────────────────

const STEP_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  en_route: 'En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
};

function getTimelineIndex(status: string): number {
  const idx = BOOKING_TIMELINE_STEPS.indexOf(
    status as (typeof BOOKING_TIMELINE_STEPS)[number]
  );
  return idx;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled';
  try {
    return format(parseISO(iso), "EEE, MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

function formatEta(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  if (minutes < 1) return 'Arriving now';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function LiveTrackingScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : undefined;

  const { data: info, isLoading, isError, error, refetch, isFetching } = useQuery<LiveTrackingInfo>({
    queryKey: ['portal-tracking', id],
    queryFn: () => api.get<LiveTrackingInfo>(`/api/portal/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d && (d.status === 'completed' || d.status === 'cancelled')) return false;
      return 15000; // 15s while active
    },
    refetchOnWindowFocus: true,
  });

  const timelineIdx = info ? getTimelineIndex(info.status) : -1;
  const isCompleted = info?.status === 'completed';
  const isCancelled = info?.status === 'cancelled';

  const handleCall = (phone: string | null | undefined) => {
    if (!phone) return;
    const url = `tel:${phone.replace(/[^\d+]/g, '')}`;
    Linking.openURL(url).catch(() => Alert.alert('Unable to make a call.'));
  };

  const hasCoordinates = useMemo(
    () =>
      !!info &&
      info.currentLatitude != null &&
      info.currentLongitude != null &&
      info.currentLatitude !== 0 &&
      info.currentLongitude !== 0,
    [info]
  );

  const mapsUrl = useMemo(() => {
    if (!info || !hasCoordinates) return null;
    return `https://www.openstreetmap.org/?mlat=${info.currentLatitude}&mlon=${info.currentLongitude}#map=15/${info.currentLatitude}/${info.currentLongitude}`;
  }, [info, hasCoordinates]);

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color={COLORS.foreground} />
          </Pressable>
        </View>
        <Spinner />
      </SafeAreaView>
    );
  }

  if (isError || !info) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <View className="flex-row items-center px-1 py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color={COLORS.foreground} />
          </Pressable>
          <Text className="ml-3 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
            Live Tracking
          </Text>
        </View>
        <EmptyState
          icon={<AlertCircle size={48} color={COLORS.destructive} />}
          title="Tracking unavailable"
          description={
            error instanceof Error
              ? error.message
              : 'This job may have been removed or is no longer trackable.'
          }
          actionLabel="Back to bookings"
          onAction={() => router.replace('/(customer)/bookings')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* Top bar */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
          Live Tracking
        </Text>
        <Pressable
          onPress={() => refetch()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <RefreshCw size={20} color={COLORS.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status hero */}
        <Card
          style={{
            backgroundColor: isCompleted
              ? '#ECFDF5'
              : isCancelled
                ? '#FEF2F2'
                : '#EFF6FF',
            borderColor: isCompleted
              ? '#A7F3D0'
              : isCancelled
                ? '#FECACA'
                : '#BFDBFE',
          }}
        >
          <View className="flex-row items-center">
            {isCompleted ? (
              <CheckCircle2 size={28} color={COLORS.success} />
            ) : isCancelled ? (
              <AlertTriangle size={28} color={COLORS.destructive} />
            ) : (
              <Navigation size={28} color={COLORS.info} />
            )}
            <View className="ml-3 flex-1">
              <Text className="text-lg font-bold text-foreground">
                {isCompleted
                  ? 'Job Completed'
                  : isCancelled
                    ? 'Job Cancelled'
                    : info.status === 'en_route'
                      ? 'On the way'
                      : info.status === 'in_progress'
                        ? 'Work in progress'
                        : info.status === 'assigned'
                          ? 'Technician assigned'
                          : info.status === 'confirmed'
                            ? 'Booking confirmed'
                            : 'Tracking job'}
              </Text>
              {info.status ? (
                <View className="mt-1">
                  <StatusBadge status={info.status} />
                </View>
              ) : null}
            </View>
          </View>
          {isCompleted && info.completedAt ? (
            <Text className="mt-3 text-sm text-foreground">
              Completed {formatRelative(info.completedAt)} · {formatDateTime(info.completedAt)}
            </Text>
          ) : null}
          {!isCompleted && !isCancelled ? (
            <Text className="mt-2 text-xs text-muted-foreground">
              {isFetching ? 'Updating…' : 'Auto-refreshes every 15 seconds'}
            </Text>
          ) : null}
        </Card>

        {/* ETA + Scheduled row */}
        <View className="mt-3 flex-row gap-3">
          <Card className="flex-1">
            <View className="flex-row items-center">
              <Clock size={18} color={COLORS.primary} />
              <Text className="ml-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Scheduled
              </Text>
            </View>
            <Text className="mt-1 text-sm font-semibold text-foreground">
              {formatDateTime(info.scheduledAt)}
            </Text>
          </Card>
          <Card className="flex-1">
            <View className="flex-row items-center">
              <Navigation size={18} color={COLORS.info} />
              <Text className="ml-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ETA
              </Text>
            </View>
            <Text className="mt-1 text-sm font-semibold text-foreground">
              {isCompleted ? '—' : formatEta(info.etaMinutes)}
            </Text>
          </Card>
        </View>

        {/* Technician card */}
        {info.employeeName || info.employeePhone || info.provider ? (
          <Card className="mt-3">
            <View className="flex-row items-center">
              <User size={18} color={COLORS.primary} />
              <Text className="ml-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Technician
              </Text>
            </View>
            <View className="mt-3 flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-500">
                <Text className="text-base font-bold text-white">
                  {getInitials(info.employeeName ?? info.provider?.name ?? '?')}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-foreground">
                  {info.employeeName ?? info.provider?.name ?? 'Technician'}
                </Text>
                {info.provider?.name && info.employeeName ? (
                  <Text className="text-xs text-muted-foreground">{info.provider.name}</Text>
                ) : null}
              </View>
              {info.employeePhone ? (
                <Pressable
                  onPress={() => handleCall(info.employeePhone)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-primary-50"
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Call technician"
                >
                  <Phone size={18} color={COLORS.primary} />
                </Pressable>
              ) : null}
            </View>
            {info.employeePhone ? (
              <Text className="mt-2 text-xs text-muted-foreground">{info.employeePhone}</Text>
            ) : null}
          </Card>
        ) : null}

        {/* Live location card — visual map with technician position */}
        <Card className="mt-3">
          <View className="flex-row items-center">
            <MapPin size={18} color={COLORS.primary} />
            <Text className="ml-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live Location
            </Text>
            {hasCoordinates && !isCompleted && (
              <View className="ml-auto flex-row items-center">
                <View className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <Text className="ml-1.5 text-xs font-semibold text-green-600">Live</Text>
              </View>
            )}
          </View>
          {hasCoordinates && mapsUrl ? (
            <View className="mt-3">
              {/* Visual map representation — gradient background with position marker */}
              <View className="relative overflow-hidden rounded-xl" style={{ height: 180, backgroundColor: '#e8f5e9' }}>
                {/* Grid lines to simulate a map */}
                <View style={{ position: 'absolute', top: 40, left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                <View style={{ position: 'absolute', top: 90, left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                <View style={{ position: 'absolute', top: 130, left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: '25%', width: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: '75%', width: 1, backgroundColor: 'rgba(0,0,0,0.06)' }} />

                {/* Pulsing position marker in center */}
                <View style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }] }}>
                  <View className="items-center justify-center" style={{ width: 40, height: 40 }}>
                    <View className="absolute h-12 w-12 rounded-full bg-primary-200 opacity-30" />
                    <View className="absolute h-8 w-8 rounded-full bg-primary-300 opacity-50" />
                    <MapPin size={28} color={COLORS.primary} fill={COLORS.primary} />
                  </View>
                </View>

                {/* Coordinates overlay */}
                <View className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-1">
                  <Text className="text-xs font-mono text-white">
                    {info.currentLatitude?.toFixed(4)}, {info.currentLongitude?.toFixed(4)}
                  </Text>
                </View>

                {/* Technician label */}
                <View className="absolute top-2 right-2 rounded-md bg-primary-600 px-2 py-1">
                  <Text className="text-xs font-semibold text-white">
                    {info.employeeName || 'Technician'}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() =>
                  Linking.openURL(mapsUrl).catch(() => Alert.alert('Unable to open maps.'))
                }
                className="mt-2 flex-row items-center justify-center rounded-lg bg-primary-50 py-2.5"
              >
                <Navigation size={16} color={COLORS.primary} />
                <Text className="ml-1.5 text-sm font-semibold text-primary-600">Open in Maps</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-3 items-center py-6">
              <MapPin size={32} color={COLORS.mutedForeground} />
              <Text className="mt-2 text-sm text-muted-foreground text-center">
                {isCompleted
                  ? 'Job completed — no live location.'
                  : 'Live location will appear here once the technician starts travelling.'}
              </Text>
            </View>
          )}
        </Card>

        {/* Timeline */}
        {!isCancelled ? (
          <Card className="mt-3">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status Timeline
            </Text>
            <View>
              {BOOKING_TIMELINE_STEPS.map((step, i) => {
                const isDone = timelineIdx >= 0 && i <= timelineIdx;
                const isCurrent = timelineIdx === i;
                const isLast = i === BOOKING_TIMELINE_STEPS.length - 1;
                return (
                  <View key={step} className="flex-row">
                    <View className="items-center">
                      <View
                        className={cn(
                          'mt-0.5 h-6 w-6 items-center justify-center rounded-full',
                          isDone ? 'bg-primary-500' : 'bg-muted'
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 size={14} color="#fff" />
                        ) : (
                          <View className="h-2 w-2 rounded-full bg-gray-400" />
                        )}
                      </View>
                      {!isLast ? (
                        <View
                          className={cn(
                            'mt-1 w-0.5',
                            isDone && i < timelineIdx ? 'bg-primary-500' : 'bg-border'
                          )}
                          style={{ height: 28 }}
                        />
                      ) : null}
                    </View>
                    <View className="ml-3 pb-2">
                      <Text
                        className={cn(
                          'text-sm font-semibold',
                          isDone ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {STEP_LABELS[step] ?? step}
                      </Text>
                      {isCurrent ? (
                        <Text className="text-xs font-semibold text-primary-700">
                          Current step
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        ) : null}

        {/* Completed CTA */}
        {isCompleted ? (
          <View className="mt-5">
            <Button
              onPress={() =>
                router.push({
                  pathname: '/(customer)/bookings/[id]',
                  params: { id: info.jobId },
                })
              }
              fullWidth
              size="lg"
            >
              <View className="flex-row items-center">
                <Star size={18} color="#fff" />
                <Text className="ml-2 text-base font-semibold text-white">Leave a Review</Text>
              </View>
            </Button>
          </View>
        ) : null}

        {isCancelled ? (
          <View className="mt-5">
            <Button
              variant="outline"
              onPress={() => router.replace('/(customer)/bookings')}
              fullWidth
            >
              Back to Bookings
            </Button>
          </View>
        ) : null}
      </ScrollView>

      <LoadingOverlay visible={isFetching && !isLoading} message="Updating…" />
    </SafeAreaView>
  );
}
