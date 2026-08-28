/**
 * Job Detail (Employee) — rewrite.
 *
 * PWA-parity features:
 *   - Sticky bottom footer with stage-aware action buttons (assigned /
 *     accepted / travelling / arrived / working / paused / completed /
 *     invoice_generated) — mirrors the PWA employee-portal-layout footer
 *     with per-stage colors (emerald / sky / teal / orange / red) and
 *     lucide icons. Replaces the old inline "Job Progress" card.
 *   - Customer PIN verification modal before `start_work` (4-digit pad).
 *   - POST /api/employee/jobs/[id]/lifecycle { action, pin? } with per-action
 *     loading spinners (TanStack Query mutation variables).
 *   - Customer info card: name, phone (call), address (directions), service,
 *     scheduled time, notes, internal notes.
 *   - Quick action grid: Photos, Checklist, Signature, Expenses, Visits,
 *     Time Entries, Completion Proof, Notes — each with count badges.
 *   - Line items preview (if any).
 *   - Lifecycle timestamps timeline.
 *   - Loading skeleton + error retry.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Navigation,
  Clock,
  Camera,
  SquareCheck,
  PenLine,
  Timer,
  Calendar,
  StickyNote,
  Receipt,
  CalendarClock,
  ClipboardCheck,
  ChevronRight,
  KeyRound,
  Delete,
  CircleCheck,
  CheckCircle2,
  Wrench,
  Pause,
  Play,
  X,
  Briefcase,
  DollarSign,
  AlertCircle,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useToast } from '@/components/ui/Toast';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useJob, useJobLifecycle } from '@/hooks/use-jobs';
import { useLiveTracking } from '@/hooks/use-live-tracking';
import { COLORS, API_BASE_URL } from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';
import { captureGps } from '@/lib/gps';
import { getStatusVariant } from '@/lib/status-colors';
import { useAuthStore } from '@/stores/auth-store';
import type { Job } from '@/types';
import { format, parseISO } from 'date-fns';

const formatDateTime = (iso: string | null): string => {
  if (!iso) return 'Not scheduled';
  try {
    return format(parseISO(iso), "EEE, MMM d · h:mm a");
  } catch {
    return new Date(iso).toLocaleString();
  }
};

// Format a duration (in minutes) as `Xh Ym` / `Ym` / `Xh` — matches the
// PWA's formatDuration helper (employee-portal-layout.tsx).
function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Compact "time ago" formatter for the live-tracking banner — e.g. "12s ago",
// "3m ago". Kept inline to avoid pulling in date-fns's formatDistanceToNow
// (which has a larger locale bundle).
function formatDistanceToNowShort(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// V1.5 lifecycle stages in canonical order. Used by the LifecycleProgress
// pill row + the timestamp grid. Ported from the PWA's LIFECYCLE_STAGES.
const LIFECYCLE_STAGES = [
  'assigned',
  'accepted',
  'travelling',
  'arrived',
  'working',
  'completed',
  'invoice_generated',
] as const;

// Short labels for the lifecycle pills (mobile has limited horizontal space).
const STAGE_SHORT_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  accepted: 'Accept',
  travelling: 'Travel',
  arrived: 'Arrive',
  working: 'Work',
  completed: 'Done',
  invoice_generated: 'Invoice',
};

// Resolve the work-started timestamp using the same precedence the PWA's
// JobDetailSheet uses: lifecycleTimestamps.working → actualStartTime →
// metadataJson.workStarted → notificationLogJson `start_work` entry.
// Returns null if no timestamp can be found (the Time Elapsed card hides).
function getWorkStartedTimestamp(job: Job): string | null {
  if (job.lifecycleTimestamps?.working) return job.lifecycleTimestamps.working;
  if (job.actualStartTime) return job.actualStartTime;
  if (job.metadataJson) {
    try {
      const meta = JSON.parse(job.metadataJson) as Record<string, unknown>;
      if (typeof meta.workStarted === 'string') return meta.workStarted;
    } catch {
      /* ignore */
    }
  }
  return null;
}

// Priority → {bg, text, dot} color tokens for the Priority badge. Matches
// the PWA's getPriorityDot (red=high, amber=medium, emerald=low).
function getPriorityColors(priority: string | null | undefined): {
  bg: string;
  text: string;
  dot: string;
} {
  switch ((priority ?? '').toLowerCase()) {
    case 'high':
      return { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' };
    case 'medium':
      return { bg: '#ffedd5', text: '#c2410c', dot: '#f59e0b' };
    case 'low':
      return { bg: '#d1fae5', text: '#047857', dot: '#10b981' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' };
  }
}

const LIFECYCLE_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  accepted: 'Accepted',
  start_travel: 'Started Travel',
  travelling: 'Travelling',
  arrive: 'Arrived',
  arrived: 'Arrived',
  start_work: 'Started Work',
  working: 'Working',
  pause: 'Paused',
  paused: 'Paused',
  resume: 'Resumed',
  complete: 'Completed',
  completed: 'Completed',
  invoice_generated: 'Invoice Generated',
  cancelled: 'Cancelled',
};

// Color tokens are provided by the shared status-colors helper (T3.1) so the
// job list / detail / today screens all render 'working' as success/green,
// 'pending' as warning/amber, etc. — matching the PWA's 11-state palette.
function LifecycleBadge({ state }: { state: string }) {
  const variant = getStatusVariant(state);
  const label = LIFECYCLE_LABELS[state] ?? state.replace(/_/g, ' ');
  return <Badge variant={variant}>{label}</Badge>;
}

// Resolve the effective V1.5 lifecycle stage for a job: prefer lifecycleState
// (returned by /api/jobs/[id] — now enriched), fall back to a status-derived
// mapping so legacy jobs without lifecycleState still render the right footer
// buttons. Ported from the PWA's resolveLifecycleStage.
//
// FIX: Previously missing cases for 'travelling', 'arrived', 'paused' — all
// three fell through to default 'assigned', which broke the lifecycle flow
// (after start_travel/arrive/pause the footer snapped back to "Accept Job").
// Also added assignmentStatus==='accepted' check for the 'assigned' case,
// mirroring the PWA (the employee backend route keeps status='assigned' but
// sets assignmentStatus='accepted' after the accept action).
function resolveLifecycleStage(job: Job | undefined | null): string {
  if (!job) return 'assigned';
  if (job.lifecycleState) return job.lifecycleState;
  switch (job.status) {
    case 'accepted':
      return 'accepted';
    case 'travelling':
    case 'en_route':
      return 'travelling';
    case 'arrived':
    case 'on_site':
      return 'arrived';
    case 'in_progress':
    case 'working':
      return 'working';
    case 'paused':
    case 'on_hold':
      return 'paused';
    case 'completed':
    case 'invoice_generated':
      return job.status;
    case 'cancelled':
      return 'cancelled';
    case 'assigned':
      // The employee lifecycle route keeps status='assigned' but sets
      // assignmentStatus='accepted' after accept. Detect that here.
      return job.assignmentStatus === 'accepted' ? 'accepted' : 'assigned';
    case 'pending':
      return 'assigned';
    default:
      return 'assigned';
  }
}

// Extract the completed timestamp from the job. Tries completedAt first,
// then lifecycleTimestamps.completed, then metadataJson.completedAt.
function getCompletedTimestamp(job: Job): string | null {
  if (job.completedAt) return job.completedAt;
  if (job.lifecycleTimestamps?.completed) return job.lifecycleTimestamps.completed;
  if (job.metadataJson) {
    try {
      const meta = JSON.parse(job.metadataJson) as Record<string, unknown>;
      if (typeof meta.completedAt === 'string') return meta.completedAt;
    } catch {
      /* ignore parse errors */
    }
  }
  return null;
}

export default function JobDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const { show } = useToast();
  const tenantCurrency = useAuthStore((s) => s.tenant?.currency ?? null);
  const employeeId = useAuthStore((s) => s.user?.employeeId ?? null);

  const { data: job, isLoading, error, refetch, isRefetching } = useJob(id);
  const lifecycle = useJobLifecycle();

  const [pendingAction, setPendingAction] = useState<{
    action: string;
    label: string;
    requiresPin: boolean;
  } | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        // refetch on focus
        refetch();
      }
    }, [id, refetch])
  );

  // V1.5: derive the effective lifecycle stage (lifecycleState preferred,
  // falling back to a status-derived mapping for legacy jobs). This drives
  // both the LifecycleBadge and the sticky footer's stage-aware buttons.
  const currentState = resolveLifecycleStage(job).toLowerCase();

  // ── Continuous live GPS tracking ────────────────────────────────────
  // While the active job is in the `travelling` state, start a foreground
  // GPS watch + background location task + 60s heartbeat so the Live
  // Dispatch dashboard shows the technician's position in real time and
  // the employee never appears "Offline" mid-route.
  // Stops automatically when the job transitions to `arrived` / `working`
  // / `completed` (because `enabled` becomes false).
  const liveTracking = useLiveTracking({
    enabled: currentState === 'travelling',
    employeeId,
    jobId: job?.id ?? null,
    apiBaseUrl: API_BASE_URL,
  });

  const handleCall = useCallback(() => {
    if (!job?.customer?.phone) return;
    Linking.openURL(`tel:${job.customer.phone}`).catch(() => {
      show('Unable to open phone app.', 'error');
    });
  }, [job, show]);

  const handleDirections = useCallback(() => {
    if (!job?.address) return;
    const encoded = encodeURIComponent(job.address);
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encoded}`
    ).catch(() => {
      show('Unable to open maps.', 'error');
    });
  }, [job, show]);

  // Smart back button: try router.back() first (works when there's a previous
  // screen in the stack). If the stack is empty (deep link, notification tap),
  // fall back to the Jobs tab so the user isn't stuck. This fixes the reported
  // "back button not going to job page" issue.
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(employee)/jobs');
    }
  }, []);

  const runLifecycle = useCallback(
    async (
      action: string,
      label: string,
      pinValue?: string,
      coords?: { latitude: number; longitude: number } | null
    ) => {
      if (!job) return;
      try {
        await lifecycle.mutateAsync({
          id: job.id,
          action,
          ...(pinValue !== undefined ? { pin: pinValue } : {}),
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        });
        show(`${label} ✓`, 'success');
        setPendingAction(null);
        setPin('');
        setPinError(null);
      } catch (err) {
        show(
          err instanceof Error ? err.message : 'Action failed. Please try again.',
          'error'
        );
        if (pendingAction?.requiresPin) {
          setPinError(
            err instanceof Error ? err.message : 'PIN verification failed.'
          );
        }
      }
    },
    [job, lifecycle, show, pendingAction]
  );

  const handleActionPress = useCallback(
    async (action: string, label: string) => {
      // Footgun guard: 'complete' is special-cased. The bare "Complete Job"
      // button used to call lifecycle.mutateAsync({ action: 'complete' })
      // DIRECTLY, which let employees finalize a job with zero proof (no
      // photos, no signatures). We now route to the /completion sub-route
      // which collects checklist + photos + signature + notes + customer
      // name confirmation before calling complete-proof + lifecycle complete.
      // Only 'complete' is intercepted; every other transition (accept,
      // start_travel, arrive, start_work, pause, resume) still calls the
      // API directly.
      if (action === 'complete' && job) {
        router.push({
          pathname: '/(employee)/jobs/[id]/completion',
          params: { id: job.id },
        });
        return;
      }
      // start_work requires a PIN when the job has a verificationPin
      // (preferred) / customerPin (legacy) or requiresPin is not explicitly
      // false.
      const needsPin =
        action === 'start_work' &&
        (job?.requiresPin !== false ||
          !!job?.verificationPin ||
          !!job?.customerPin);
      if (needsPin) {
        setPendingAction({ action, label, requiresPin: true });
        setPin('');
        setPinError(null);
        return;
      }
      // V1.5 GPS capture: attach best-effort lat/long to the lifecycle
      // POST for `start_travel` / `arrive` (and `complete`, though that's
      // intercepted above and routed to the completion screen which does
      // its own capture). Matches the PWA's captureOnce-on-transition
      // pattern. GPS is best-effort — failure doesn't block the action.
      const wantsGps =
        action === 'start_travel' ||
        action === 'arrive' ||
        action === 'complete';
      const coords = wantsGps ? await captureGps() : null;
      // Otherwise execute directly.
      runLifecycle(action, label, undefined, coords);
    },
    [job, runLifecycle]
  );

  const submitPin = useCallback(() => {
    if (!pendingAction) return;
    if (pin.length !== 4) {
      setPinError('Enter a 4-digit PIN.');
      return;
    }
    // Local pre-validation against the verificationPin (preferred) or
    // customerPin (legacy). If neither is set on the job, let the API
    // validate (it has access to the canonical record).
    const expectedPin = job?.verificationPin ?? job?.customerPin;
    if (expectedPin && pin !== expectedPin) {
      setPinError('Incorrect PIN. Please try again.');
      setPin('');
      return;
    }
    // start_work is the only PIN-gated action — no GPS capture needed.
    runLifecycle(pendingAction.action, pendingAction.label, pin);
  }, [pendingAction, pin, job, runLifecycle]);

  if (isLoading && !job) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <Header onBack={handleBack} title="Job Details" />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 + insets.bottom }}>
          <SkeletonList count={3} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <Header onBack={handleBack} title="Job Details" />
        <EmptyState
          icon={<StickyNote size={48} color={COLORS.mutedForeground} />}
          title="Job not found"
          description={
            error instanceof Error ? error.message : 'This job may have been removed.'
          }
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  // The job detail API (`/api/jobs/[id]`) returns photo counts under
  // `_counts.photos` (a number), NOT under `photos` (an array). The previous
  // `job.photos?.length ?? 0` always returned 0 because `job.photos` was
  // undefined → the Photos quick-action badge rendered "0" even when photos
  // existed. Fall back to the array length for legacy endpoints that still
  // embed the photos array.
  const photoCount =
    job._counts?.photos ?? job.photos?.length ?? 0;
  const checklistItems = job.checklist ?? [];
  const checklistDone = checklistItems.filter((c) => c.completed).length;
  const signatureCount = job.signatures?.length ?? 0;
  const timeEntryCount = job.timeEntries?.length ?? 0;
  const expenseCount = job.expenses?.length ?? 0;
  const visitCount = job.visits?.length ?? 0;
  const lineItems = job.lineItems ?? [];

  const lifecycleTimestamps = job.lifecycleTimestamps ?? {};
  const timestampEntries = Object.entries(lifecycleTimestamps).filter(
    ([, v]) => !!v
  ) as [string, string][];

  // edges=['top'] only — the sticky LifecycleFooter handles the bottom
  // safe-area inset itself (matching the PWA's
  // pb-[max(0.75rem,env(safe-area-inset-bottom))]). This avoids
  // double-padding when SafeAreaView also applies paddingBottom.
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={handleBack} title="Job Details" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Live tracking status banner — only visible while the job is in
            the `travelling` state. Shows a green confirmation when tracking
            is active, or a red warning if the employee denied location
            permission (which means dispatch can't see their position). */}
        {currentState === 'travelling' &&
          (liveTracking.permissionDenied ? (
            <View
              style={{
                backgroundColor: '#FEF2F2',
                borderColor: '#FECACA',
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MapPin size={16} color="#DC2626" />
              <Text style={{ fontSize: 13, color: '#991B1B', flex: 1 }}>
                Location permission denied — dispatch can't see your live position.
                Enable location in Settings to share your ETA.
              </Text>
            </View>
          ) : liveTracking.isTracking ? (
            <View
              style={{
                backgroundColor: '#ECFDF5',
                borderColor: '#A7F3D0',
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Navigation size={16} color="#059669" />
              <Text style={{ fontSize: 13, color: '#065F46', flex: 1 }}>
                Live tracking active — dispatch can see your position
                {liveTracking.lastPingAt
                  ? ` · last ping ${formatDistanceToNowShort(liveTracking.lastPingAt)}`
                  : ''}
              </Text>
            </View>
          ) : null)}

        {/* Customer / Service header card */}
        <Card className="mb-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xl font-bold text-foreground" numberOfLines={2}>
                {job.title || job.customer?.name || 'Job'}
              </Text>
              <Text className="mt-0.5 text-sm text-muted-foreground" numberOfLines={1}>
                {job.customer?.name || 'Customer'}
              </Text>
              {job.jobNumber ? (
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  Job #{job.jobNumber}
                </Text>
              ) : null}
              {job.service ? (
                <Text className="mt-1 text-sm font-medium text-primary-700">
                  {job.service.name}
                </Text>
              ) : null}
            </View>
            <View className="items-end">
              {/* Status badges stack — the primary LifecycleBadge plus the
                  V1.5 extras: "Awaiting Acceptance" (amber) when stage is
                  `assigned`, "Paused" (orange) when stage is `paused`.
                  Mirrors the PWA's JobDetailSheet header badge row. */}
              <View className="flex-row flex-wrap justify-end gap-1">
                <LifecycleBadge state={currentState} />
                {currentState === 'assigned' ? (
                  <View className="rounded-full bg-amber-100 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-amber-700">
                      Awaiting
                    </Text>
                  </View>
                ) : null}
                {currentState === 'paused' ? (
                  <View className="rounded-full bg-orange-100 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-orange-700">
                      Paused
                    </Text>
                  </View>
                ) : null}
              </View>
              {/* Count chips: photos + signatures. Matches the PWA's
                  `📸 N · ✍ N` header chips. Uses the photo/signature arrays
                  embedded in the job payload (populated by /api/jobs/[id]). */}
              <View className="mt-2 flex-row items-center gap-2">
                <View className="flex-row items-center gap-0.5">
                  <Camera size={11} color={COLORS.mutedForeground} />
                  <Text className="text-[10px] text-muted-foreground">
                    {photoCount}
                  </Text>
                </View>
                <View className="flex-row items-center gap-0.5">
                  <PenLine size={11} color={COLORS.mutedForeground} />
                  <Text className="text-[10px] text-muted-foreground">
                    {signatureCount}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {job.customer.phone ? (
            <Pressable
              onPress={handleCall}
              className="mt-3 flex-row items-center"
              accessibilityRole="button"
              accessibilityLabel={`Call ${job.customer.phone}`}
            >
              <View className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-primary-100">
                <Phone size={16} color={COLORS.primary} />
              </View>
              <Text className="text-sm font-semibold text-primary-700">
                {job.customer.phone}
              </Text>
            </Pressable>
          ) : null}
        </Card>

        {/* V1.5 Lifecycle Progress — 7-stage pill row + timestamp grid.
            Mirrors the PWA's LifecycleProgress component. Placed above the
            Schedule/Address card per Phase-4 task spec. */}
        <LifecycleProgress job={job} stage={currentState} />

        {/* Schedule & Address */}
        <Card className="mb-3">
          <DetailRow
            icon={<Calendar size={16} color={COLORS.mutedForeground} />}
            label="Scheduled"
            value={formatDateTime(job.scheduledAt)}
          />
          <View style={{ height: 12 }} />
          <DetailRow
            icon={<Clock size={16} color={COLORS.mutedForeground} />}
            label="Status"
            value={LIFECYCLE_LABELS[currentState] ?? currentState}
          />
          {job.address ? (
            <>
              <View style={{ height: 12 }} />
              <View className="flex-row items-start">
                <View className="mr-2 mt-0.5">
                  <MapPin size={16} color={COLORS.mutedForeground} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Address
                  </Text>
                  <Text className="mt-0.5 text-sm text-foreground">
                    {job.address}
                  </Text>
                  <Pressable
                    onPress={handleDirections}
                    className="mt-2 flex-row items-center self-start rounded-lg bg-primary-50 px-3 py-1.5"
                    accessibilityRole="button"
                    accessibilityLabel="Get directions to job"
                  >
                    <Navigation size={14} color={COLORS.primary} />
                    <Text className="ml-1.5 text-xs font-semibold text-primary-700">
                      Get Directions
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : null}
        </Card>

        {/* Job Details Grid — Quoted Amount / Estimated Duration / Job Type /
            Priority. Mirrors the PWA's JobDetailSheet details grid. Only
            renders rows whose value is present (don't show empty rows). */}
        {(job.quotedAmount != null ||
          job.estimatedDuration != null ||
          job.type ||
          job.priority) ? (
          <Card className="mb-3">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Job Details
            </Text>
            {job.quotedAmount != null && job.quotedAmount > 0 ? (
              <DetailRow
                icon={<DollarSign size={16} color={COLORS.mutedForeground} />}
                label="Quoted Amount"
                value={formatCurrency(job.quotedAmount, tenantCurrency)}
              />
            ) : null}
            {job.estimatedDuration != null ? (
              <>
                {job.quotedAmount != null && job.quotedAmount > 0 ? (
                  <View style={{ height: 12 }} />
                ) : null}
                <DetailRow
                  icon={<Clock size={16} color={COLORS.mutedForeground} />}
                  label="Estimated Duration"
                  value={formatDuration(Number(job.estimatedDuration))}
                />
              </>
            ) : null}
            {job.type ? (
              <>
                {job.quotedAmount != null || job.estimatedDuration != null ? (
                  <View style={{ height: 12 }} />
                ) : null}
                <DetailRow
                  icon={<Briefcase size={16} color={COLORS.mutedForeground} />}
                  label="Job Type"
                  value={
                    job.type.charAt(0).toUpperCase() + job.type.slice(1)
                  }
                />
              </>
            ) : null}
            {job.priority ? (
              <>
                {job.quotedAmount != null ||
                job.estimatedDuration != null ||
                job.type ? (
                  <View style={{ height: 12 }} />
                ) : null}
                <View className="flex-row items-center">
                  <View className="mr-2">
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: getPriorityColors(job.priority).dot,
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Priority
                    </Text>
                    <View
                      style={{
                        marginTop: 4,
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 999,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        backgroundColor: getPriorityColors(job.priority).bg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: getPriorityColors(job.priority).text,
                          textTransform: 'capitalize',
                        }}
                      >
                        {job.priority}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : null}
          </Card>
        ) : null}

        {/* Live Time Elapsed card — only visible when work is in progress
            (working / paused). Auto-updates every 60s via setInterval so
            the elapsed minutes count up while the screen is open. Mirrors
            the PWA's elapsed-time row in the JobDetailSheet details grid. */}
        <TimeElapsedCard
          workStartedTs={getWorkStartedTimestamp(job)}
          active={currentState === 'working' || currentState === 'paused'}
          paused={currentState === 'paused'}
        />

        {/* Notes */}
        {(job.notes || job.internalNotes) ? (
          <Card className="mb-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <StickyNote size={16} color={COLORS.mutedForeground} />
                <Text className="ml-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(employee)/jobs/[id]/notes',
                    params: { id: job.id },
                  })
                }
                hitSlop={8}
              >
                <Text className="text-xs font-semibold text-primary-700">Edit</Text>
              </Pressable>
            </View>
            {job.notes ? (
              <View className="mt-2">
                <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer Notes
                </Text>
                <Text className="mt-1 text-sm text-foreground">{job.notes}</Text>
              </View>
            ) : null}
            {job.internalNotes ? (
              <View className="mt-3 rounded-lg bg-amber-50 p-2.5">
                <Text className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Internal Notes
                </Text>
                <Text className="mt-1 text-sm text-foreground">
                  {job.internalNotes}
                </Text>
              </View>
            ) : null}
          </Card>
        ) : (
          <Card className="mb-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-muted-foreground">No notes yet</Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(employee)/jobs/[id]/notes',
                    params: { id: job.id },
                  })
                }
                hitSlop={8}
              >
                <Text className="text-xs font-semibold text-primary-700">
                  Add Notes
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Quick action grid */}
        <Text className="mb-2 mt-1 text-base font-bold text-foreground">
          Job Tools
        </Text>
        <View className="flex-row flex-wrap justify-between">
          <QuickAction
            icon={<Camera size={20} color={COLORS.primary} />}
            label="Photos"
            count={photoCount}
            onPress={() =>
              router.push({
                pathname: '/(employee)/jobs/[id]/photos',
                params: { id: job.id },
              })
            }
          />
          <QuickAction
            icon={<SquareCheck size={20} color={COLORS.primary} />}
            label="Checklist"
            countLabel={
              checklistItems.length > 0
                ? `${checklistDone}/${checklistItems.length}`
                : undefined
            }
            onPress={() =>
              router.push({
                pathname: '/(employee)/jobs/[id]/checklist',
                params: { id: job.id },
              })
            }
          />
          <QuickAction
            icon={<PenLine size={20} color={COLORS.primary} />}
            label="Signature"
            count={signatureCount}
            onPress={() =>
              router.push({
                pathname: '/(employee)/jobs/[id]/signature',
                params: { id: job.id },
              })
            }
          />
          <QuickAction
            icon={<Receipt size={20} color={COLORS.primary} />}
            label="Expenses"
            count={expenseCount}
            onPress={() =>
              router.push({
                pathname: '/(employee)/jobs/[id]/expenses',
                params: { id: job.id },
              })
            }
          />
          <QuickAction
            icon={<CalendarClock size={20} color={COLORS.primary} />}
            label="Visits"
            count={visitCount}
            onPress={() =>
              router.push({
                pathname: '/(employee)/jobs/[id]/visits',
                params: { id: job.id },
              })
            }
          />
          <QuickAction
            icon={<Timer size={20} color={COLORS.primary} />}
            label="Time Entries"
            count={timeEntryCount}
            onPress={() =>
              router.push({
                pathname: '/(employee)/jobs/[id]/time-entries',
                params: { id: job.id },
              })
            }
          />
          <QuickAction
            icon={<ClipboardCheck size={20} color={COLORS.primary} />}
            label="Complete Proof"
            onPress={() =>
              router.push({
                pathname: '/(employee)/jobs/[id]/completion',
                params: { id: job.id },
              })
            }
          />
          <QuickAction
            icon={<StickyNote size={20} color={COLORS.primary} />}
            label="Notes"
            onPress={() =>
              router.push({
                pathname: '/(employee)/jobs/[id]/notes',
                params: { id: job.id },
              })
            }
          />
        </View>

        {/* Line items preview */}
        {lineItems.length > 0 ? (
          <Card className="mt-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Line Items ({lineItems.length})
            </Text>
            {lineItems.map((li, idx) => (
              <View
                key={li.id ?? idx}
                className="flex-row items-center justify-between py-1.5"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-medium text-foreground">
                    {li.description}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {li.quantity} × {formatCurrency(li.unitPrice, tenantCurrency)}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-foreground">
                  {formatCurrency(li.total, tenantCurrency)}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Lifecycle timestamps timeline */}
        {timestampEntries.length > 0 ? (
          <Card className="mt-4">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Lifecycle Timeline
            </Text>
            {timestampEntries.map(([key, value], idx) => {
              const isLast = idx === timestampEntries.length - 1;
              const label = LIFECYCLE_LABELS[key] ?? key.replace(/_/g, ' ');
              let formatted = '';
              try {
                formatted = format(parseISO(value), "MMM d, h:mm a");
              } catch {
                formatted = new Date(value).toLocaleString();
              }
              return (
                <View key={key} className="flex-row">
                  <View className="mr-3 items-center">
                    <View
                      className={`mt-1 h-4 w-4 items-center justify-center rounded-full ${
                        isLast ? 'bg-primary-500' : 'bg-primary-200'
                      }`}
                    >
                      <CircleCheck
                        size={10}
                        color={isLast ? '#fff' : COLORS.primary}
                      />
                    </View>
                    {!isLast ? (
                      <View style={{ width: 2, flex: 1, backgroundColor: COLORS.border, marginTop: 2 }} />
                    ) : null}
                  </View>
                  <View className="pb-3 flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {label}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{formatted}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        ) : null}
      </ScrollView>

      {/* Sticky lifecycle footer — stage-aware action buttons.
          Mirrors the PWA employee-portal-layout.tsx sticky footer: each
          lifecycle stage renders different buttons with stage-specific
          colors and lucide icons. The footer handles its own bottom
          safe-area inset via paddingBottom: max(12, insets.bottom). */}
      <LifecycleFooter
        stage={currentState}
        job={job}
        lifecycle={lifecycle}
        bottomInset={insets.bottom}
        onAction={handleActionPress}
        onReject={() =>
          show(
            'Reject is not supported in V1.5 — contact your manager to reassign this job.',
            'info'
          )
        }
      />

      {/* Customer PIN modal */}
      <Modal
        visible={!!pendingAction?.requiresPin}
        onClose={() => {
          setPendingAction(null);
          setPin('');
          setPinError(null);
        }}
        position="center"
        showHandle={false}
      >
        <View className="p-6">
          <View className="mb-3 flex-row items-center justify-center">
            <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-primary-100">
              <KeyRound size={20} color={COLORS.primary} />
            </View>
            <Text className="text-lg font-bold text-foreground">
              Customer PIN
            </Text>
          </View>
          <Text className="mb-4 text-center text-sm text-muted-foreground">
            Ask the customer for their 4-digit PIN to start work.
          </Text>

          {/* PIN dots */}
          <View className="mb-3 flex-row justify-center">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className={`mx-2 h-4 w-4 rounded-full ${
                  i < pin.length ? 'bg-primary-500' : 'bg-muted'
                }`}
              />
            ))}
          </View>

          {pinError ? (
            <Text className="mb-2 text-center text-sm text-destructive">
              {pinError}
            </Text>
          ) : null}

          {/* Numeric pad */}
          <View className="flex-row flex-wrap justify-center">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
              <PinKey
                key={n}
                label={n}
                onPress={() => {
                  if (pin.length < 4) setPin(pin + n);
                  setPinError(null);
                }}
              />
            ))}
            <View style={{ width: 64, height: 64, margin: 6 }} />
            <PinKey
              label="0"
              onPress={() => {
                if (pin.length < 4) setPin(pin + '0');
                setPinError(null);
              }}
            />
            <PinKey
              label="⌫"
              onPress={() => {
                setPin(pin.slice(0, -1));
                setPinError(null);
              }}
              icon={<Delete size={22} color={COLORS.foreground} />}
            />
          </View>

          <View className="mt-4 flex-row gap-2">
            <View className="flex-1">
              <Button
                variant="outline"
                onPress={() => {
                  setPendingAction(null);
                  setPin('');
                  setPinError(null);
                }}
                disabled={lifecycle.isPending}
              >
                Cancel
              </Button>
            </View>
            <View className="flex-1">
              <Button
                onPress={submitPin}
                loading={lifecycle.isPending}
                disabled={pin.length !== 4}
              >
                Verify & Start
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <LoadingOverlay visible={lifecycle.isPending && !pendingAction} message="Updating job…" />
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

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="mr-2">{icon}</View>
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Text>
        <Text className="mt-0.5 text-sm text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  count,
  countLabel,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  countLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2.5 w-[48%] active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Card className="items-center">
        <View className="mb-2 h-10 w-10 items-center justify-center rounded-full bg-primary-50">
          {icon}
        </View>
        <Text className="text-sm font-semibold text-foreground">{label}</Text>
        {typeof count === 'number' && count > 0 ? (
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {countLabel ?? count}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function PinKey({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="m-1.5 h-16 w-16 items-center justify-center rounded-full border border-border bg-white active:bg-muted"
      accessibilityRole="button"
      accessibilityLabel={`PIN key ${label}`}
    >
      {icon ?? (
        <Text className="text-2xl font-semibold text-foreground">{label}</Text>
      )}
    </Pressable>
  );
}

// ── Lifecycle progress pill row + live Time Elapsed card ──────────────
// LifecycleProgress — port of the PWA's LifecycleProgress component
// (employee-portal-layout.tsx). Renders the 7 lifecycle stages as a
// horizontal row of small pills (wraps via flexWrap). Reached stages
// turn emerald; the current stage is solid emerald with white text;
// future stages are gray. Below the pills, a 2-column grid of
// timestamps for reached stages (skipping `assigned` which is implied
// and not displayed by the PWA either).
function LifecycleProgress({ job, stage }: { job: Job; stage: string }) {
  const ts = job.lifecycleTimestamps ?? {};
  // Compute which stages have a timestamp (i.e. have been reached).
  // Matches the PWA's reached map (with the same fallbacks).
  const reached: Record<string, boolean> = {
    assigned: !!ts.assigned || !!job.createdAt,
    accepted: !!ts.accepted,
    travelling: !!ts.travelling,
    arrived: !!ts.arrived,
    working: !!ts.working || !!job.actualStartTime,
    completed:
      stage === 'completed' || !!ts.completed || !!job.completedAt,
    invoice_generated: stage === 'invoice_generated',
  };
  // `paused` is a working sub-state — visually demote to `working` for
  // the pill row, but show "Paused" on the working pill label.
  const effectiveStage = stage === 'paused' ? 'working' : stage;

  // Reached timestamp entries for the grid (skip assigned — too noisy).
  const tsEntries: { label: string; value: string }[] = [];
  if (ts.accepted)
    tsEntries.push({ label: 'Accepted', value: ts.accepted });
  if (ts.travelling)
    tsEntries.push({ label: 'Travelling', value: ts.travelling });
  if (ts.arrived)
    tsEntries.push({ label: 'Arrived', value: ts.arrived });
  if (ts.working)
    tsEntries.push({ label: 'Work started', value: ts.working });
  if (ts.completed)
    tsEntries.push({ label: 'Completed', value: ts.completed });

  return (
    <Card className="mb-3">
      <Text className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Lifecycle
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {LIFECYCLE_STAGES.map((s) => {
          const isCurrent = effectiveStage === s;
          const isReached = reached[s] || isCurrent;
          const label =
            isCurrent && stage === 'paused' && s === 'working'
              ? 'Paused'
              : STAGE_SHORT_LABELS[s] ?? s;
          return (
            <View
              key={s}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 1,
                backgroundColor: isCurrent
                  ? '#059669'
                  : isReached
                    ? '#d1fae5'
                    : '#f3f4f6',
                borderColor: isCurrent
                  ? '#059669'
                  : isReached
                    ? '#a7f3d0'
                    : '#e5e7eb',
              }}
            >
              {isReached && !isCurrent ? (
                <CheckCircle2 size={10} color="#059669" />
              ) : null}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isCurrent ? '700' : '500',
                  color: isCurrent
                    ? '#ffffff'
                    : isReached
                      ? '#065f46'
                      : '#9ca3af',
                  marginLeft: isReached && !isCurrent ? 3 : 0,
                }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      {tsEntries.length > 0 ? (
        <View
          style={{
            marginTop: 12,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {tsEntries.map(({ label, value }) => {
            let formatted = '';
            try {
              formatted = format(parseISO(value), "MMM d, h:mm a");
            } catch {
              formatted = new Date(value).toLocaleString();
            }
            return (
              <View
                key={label}
                style={{
                  width: '48%',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#f3f4f6',
                  backgroundColor: '#fafafa',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    color: '#9ca3af',
                  }}
                >
                  {label}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: COLORS.foreground,
                    marginTop: 1,
                  }}
                >
                  {formatted}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

// TimeElapsedCard — live "Time Elapsed: Xh Ym" card shown only when
// work is in progress (working / paused). Re-renders every 60s while
// visible so the elapsed minutes count up while the screen is open.
// Mirrors the PWA's elapsed-time row in the JobDetailSheet details
// grid, with a blue-tinted card to make the live timer visually
// distinct from static detail rows.
function TimeElapsedCard({
  workStartedTs,
  active,
  paused,
}: {
  workStartedTs: string | null;
  active: boolean;
  paused: boolean;
}) {
  const [, setTick] = useState(0);

  // Re-render every 60s while visible so the elapsed value stays fresh.
  // Cleanup on unmount / when card is hidden (active=false).
  useEffect(() => {
    if (!active || !workStartedTs) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [active, workStartedTs]);

  if (!active || !workStartedTs) return null;

  const elapsedMs = Date.now() - new Date(workStartedTs).getTime();
  const elapsedMin = Math.max(0, Math.round(elapsedMs / 60000));
  const formatted = formatDuration(elapsedMin);

  return (
    <View
      style={{
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#bfdbfe',
        gap: 10,
      }}
    >
      <Timer size={18} color="#2563eb" />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 11,
            color: '#2563eb',
            fontWeight: '500',
          }}
        >
          {paused ? 'Time Elapsed (Paused)' : 'Time Elapsed'}
        </Text>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: '#1d4ed8',
            marginTop: 1,
          }}
        >
          {formatted}
        </Text>
      </View>
      {paused ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff7ed',
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: '#fed7aa',
            gap: 4,
          }}
        >
          <AlertCircle size={11} color="#c2410c" />
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: '#c2410c',
            }}
          >
            Paused
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Sticky lifecycle footer helpers ──────────────────────────────────
// LifecycleButton — custom Pressable-based button with full color control
// (solid or outline). Used by the stage-aware sticky footer so we can
// match the PWA's emerald / sky / teal / orange / red palette, which the
// shared Button component (primary/outline/destructive) can't express.
// Shows an ActivityIndicator instead of the icon when `loading` is true.

type LifecycleButtonIcon = React.ComponentType<{
  size?: number;
  color?: string;
}>;

function LifecycleButton({
  label,
  icon: Icon,
  color,
  mode,
  onPress,
  loading = false,
  disabled = false,
  flex = false,
}: {
  label: string;
  icon: LifecycleButtonIcon;
  color: string;
  mode: 'solid' | 'outline';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  flex?: boolean;
}) {
  const isOutline = mode === 'outline';
  const textColor = isOutline ? color : '#ffffff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          backgroundColor: isOutline ? 'transparent' : color,
          borderWidth: 2,
          borderColor: color,
        },
        flex ? { flex: 1 } : { alignSelf: 'stretch' },
        (disabled || loading) && { opacity: 0.6 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} style={{ marginRight: 8 }} />
      ) : (
        <Icon size={18} color={textColor} />
      )}
      <Text
        style={{
          color: textColor,
          fontSize: 15,
          fontWeight: '600',
          marginLeft: 8,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// LifecycleFooter — stage-aware sticky footer that mirrors the PWA's
// employee-portal-layout.tsx action buttons. Each lifecycle stage renders
// different buttons with stage-specific colors and lucide icons:
//   assigned    → Accept Job (emerald) + Reject (red outline)
//   accepted    → Start Travel (sky)
//   travelling  → Mark Arrived (teal)
//   arrived     → Start Work (emerald) → opens PIN modal
//   working     → Pause (orange outline) + Complete (emerald)
//   paused      → Resume Work (emerald)
//   completed   → centered "Job Completed" + timestamp
//   invoice_generated → centered "Invoice Generated" + timestamp
function LifecycleFooter({
  stage,
  job,
  lifecycle,
  bottomInset,
  onAction,
  onReject,
}: {
  stage: string;
  job: Job;
  lifecycle: ReturnType<typeof useJobLifecycle>;
  bottomInset: number;
  onAction: (action: string, label: string) => void;
  onReject: () => void;
}) {
  const isPending = lifecycle.isPending;
  // Per-action loading: TanStack Query exposes the last submitted variables
  // via `lifecycle.variables`, so we can show a spinner only on the button
  // whose action is in flight (not on every button).
  const inFlight = (action: string) =>
    isPending && lifecycle.variables?.action === action;

  const isCompleted = stage === 'completed' || stage === 'invoice_generated';

  let content: React.ReactNode;

  if (stage === 'assigned') {
    content = (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <LifecycleButton
          label="Accept Job"
          icon={CheckCircle2}
          color="#059669"
          mode="solid"
          flex
          loading={inFlight('accept')}
          disabled={isPending}
          onPress={() => onAction('accept', 'Accepting...')}
        />
        <LifecycleButton
          label="Reject"
          icon={X}
          color="#dc2626"
          mode="outline"
          flex
          disabled={isPending}
          onPress={onReject}
        />
      </View>
    );
  } else if (stage === 'accepted') {
    content = (
      <LifecycleButton
        label="Start Travel"
        icon={Navigation}
        color="#0284c7"
        mode="solid"
        loading={inFlight('start_travel')}
        disabled={isPending}
        onPress={() => onAction('start_travel', 'Starting travel...')}
      />
    );
  } else if (stage === 'travelling') {
    content = (
      <LifecycleButton
        label="Mark Arrived"
        icon={MapPin}
        color="#0d9488"
        mode="solid"
        loading={inFlight('arrive')}
        disabled={isPending}
        onPress={() => onAction('arrive', 'Marking arrived...')}
      />
    );
  } else if (stage === 'arrived') {
    // Start Work opens the PIN modal (handleActionPress sets pendingAction
    // when PIN is required). The button's loading state only activates
    // after the PIN is submitted and runLifecycle is in flight.
    content = (
      <LifecycleButton
        label="Start Work"
        icon={Wrench}
        color="#059669"
        mode="solid"
        loading={inFlight('start_work')}
        disabled={isPending}
        onPress={() => onAction('start_work', 'Starting work...')}
      />
    );
  } else if (stage === 'working') {
    content = (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <LifecycleButton
          label="Pause"
          icon={Pause}
          color="#ea580c"
          mode="outline"
          flex
          loading={inFlight('pause')}
          disabled={isPending}
          onPress={() => onAction('pause', 'Pausing...')}
        />
        <LifecycleButton
          label="Complete"
          icon={CheckCircle2}
          color="#059669"
          mode="solid"
          flex
          disabled={isPending}
          onPress={() => onAction('complete', 'Completing...')}
        />
      </View>
    );
  } else if (stage === 'paused') {
    content = (
      <LifecycleButton
        label="Resume Work"
        icon={Play}
        color="#059669"
        mode="solid"
        loading={inFlight('resume')}
        disabled={isPending}
        onPress={() => onAction('resume', 'Resuming...')}
      />
    );
  } else if (isCompleted) {
    // Centered completion state — matches the PWA's isCompleted block.
    // invoice_generated shows a Receipt icon (violet); completed shows
    // CheckCircle2 (emerald).
    const ts = getCompletedTimestamp(job);
    let formatted = '';
    if (ts) {
      try {
        formatted = format(parseISO(ts), "MMM d 'at' h:mm a");
      } catch {
        formatted = new Date(ts).toLocaleString();
      }
    }
    const isInvoice = stage === 'invoice_generated';
    content = (
      <View style={{ alignItems: 'center', paddingVertical: 14 }}>
        {isInvoice ? (
          <Receipt size={48} color="#8b5cf6" />
        ) : (
          <CheckCircle2 size={48} color="#10b981" />
        )}
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: isInvoice ? '#7c3aed' : '#059669',
            marginTop: 8,
          }}
        >
          {isInvoice ? 'Invoice Generated' : 'Job Completed'}
        </Text>
        {formatted ? (
          <Text
            style={{
              fontSize: 12,
              color: COLORS.mutedForeground,
              marginTop: 4,
            }}
          >
            Completed {formatted}
          </Text>
        ) : null}
      </View>
    );
  } else {
    // Fallback for cancelled / unknown stages.
    content = (
      <View style={{ alignItems: 'center', paddingVertical: 14 }}>
        <Text style={{ fontSize: 14, color: COLORS.mutedForeground }}>
          {stage === 'cancelled' ? 'Job cancelled' : 'No actions available'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        // The footer handles its own bottom safe-area inset (SafeAreaView
        // uses edges=['top'] only). max(12, bottomInset) ensures devices
        // without a home indicator still get sensible breathing room.
        paddingBottom: Math.max(12, bottomInset),
      }}
    >
      {content}
    </View>
  );
}
