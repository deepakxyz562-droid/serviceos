/**
 * Booking Detail Screen
 *
 * PWA-matching booking detail with:
 *   - Provider info, service, scheduled time, address, notes, price, status
 *   - Customer info section
 *   - **FIXED TIMELINE** that includes the 'assigned' step (was missing — bug)
 *     Uses BOOKING_TIMELINE_STEPS from constants: pending → confirmed → assigned
 *     → en_route → in_progress → completed. Maps booking.lifecycleTimestamps
 *     to show actual times per step.
 *   - "Track Live" button → /(customer)/tracking/[id] (when job is active)
 *   - Cancel booking (pending / confirmed) with confirm dialog
 *   - Leave a review (completed, not yet reviewed) — star rating modal
 *   - Reschedule (pending / confirmed) — date/time picker modal
 *   - "Book again" → marketplace book screen with same provider/service
 *   - Loading skeleton, error retry, toast feedback
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  Star,
  Calendar,
  MapPin,
  FileText,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Navigation,
  RefreshCw,
  Repeat2,
  Phone,
  Mail,
} from 'lucide-react-native';
import { useBooking, useCancelBooking, useRescheduleBooking } from '@/hooks/use-bookings';
import { useCreateReview } from '@/hooks/use-reviews';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useToast } from '@/components/ui/Toast';
import { COLORS, BOOKING_TIMELINE_STEPS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Booking } from '@/types';

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
  // Map any booking status to its index in BOOKING_TIMELINE_STEPS.
  // 'cancelled' and unknown statuses return -1 (no progress shown).
  const idx = BOOKING_TIMELINE_STEPS.indexOf(
    status as (typeof BOOKING_TIMELINE_STEPS)[number]
  );
  return idx;
}

// ── Formatters ───────────────────────────────────────────────────────

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled';
  try {
    return format(parseISO(iso), "EEEE, MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

function formatShort(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return iso;
  }
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

// ── Screen ───────────────────────────────────────────────────────────

export default function BookingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : undefined;

  const toast = useToast();
  const { data: booking, isLoading, isError, error, refetch } = useBooking(id);
  const cancelBooking = useCancelBooking();
  const createReview = useCreateReview();
  const rescheduleBooking = useRescheduleBooking();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date());

  const [cancelOpen, setCancelOpen] = useState(false);

  // ── Derived flags ────────────────────────────────────────────────
  const isCancellable = useMemo(
    () => booking?.status === 'pending' || booking?.status === 'confirmed',
    [booking?.status]
  );
  const isReschedulable = isCancellable;
  const isCompleted = booking?.status === 'completed';
  const isCancelled = booking?.status === 'cancelled';
  const isTrackable = useMemo(
    () =>
      booking?.status === 'assigned' ||
      booking?.status === 'en_route' ||
      booking?.status === 'in_progress',
    [booking?.status]
  );

  // ── Handlers ─────────────────────────────────────────────────────

  const handleCancel = () => {
    if (!booking) return;
    Alert.alert(
      'Cancel booking?',
      'This will cancel your booking. The provider will be notified. This action cannot be undone.',
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelBooking.mutateAsync(booking.id);
              toast.show('Booking cancelled.', 'success');
              refetch();
            } catch (err) {
              toast.show(
                err instanceof Error ? err.message : 'Failed to cancel booking.',
                'error'
              );
            }
          },
        },
      ]
    );
  };

  const handleSubmitReview = async () => {
    if (!booking) return;
    if (rating < 1) {
      toast.show('Please tap a star to give a rating.', 'warning');
      return;
    }
    try {
      await createReview.mutateAsync({
        providerId: booking.provider.id,
        bookingId: booking.id,
        rating,
        comment: comment.trim() || undefined,
      });
      setReviewOpen(false);
      toast.show('Thank you! Your review has been submitted.', 'success');
      refetch();
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Failed to submit review.',
        'error'
      );
    }
  };

  const handleReschedule = async () => {
    if (!booking) return;
    try {
      await rescheduleBooking.mutateAsync({
        id: booking.id,
        scheduledAt: rescheduleDate.toISOString(),
      });
      setRescheduleOpen(false);
      toast.show('Booking rescheduled.', 'success');
      refetch();
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Failed to reschedule booking.',
        'error'
      );
    }
  };

  const handleRebook = () => {
    if (!booking) return;
    const params: Record<string, string> = {};
    if (booking.provider?.slug) params.slug = booking.provider.slug;
    if (booking.provider?.id) params.providerId = booking.provider.id;
    if (booking.service?.id) params.serviceId = booking.service.id;
    router.push({ pathname: '/(customer)/marketplace/book', params });
  };

  const handleTrack = () => {
    if (!booking) return;
    router.push({
      pathname: '/(customer)/tracking/[id]',
      params: { id: booking.id },
    });
  };

  const onDateChange = (_event: unknown, d?: Date) => {
    setShowDatePicker(false);
    if (d) {
      setRescheduleDate(d);
      setShowTimePicker(true);
    }
  };

  const onTimeChange = (_event: unknown, t?: Date) => {
    setShowTimePicker(false);
    if (t) {
      // Merge date + time
      const merged = new Date(rescheduleDate);
      merged.setHours(t.getHours());
      merged.setMinutes(t.getMinutes());
      setRescheduleDate(merged);
    }
  };

  // ── Loading / Error ──────────────────────────────────────────────

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

  if (isError || !booking) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <View className="flex-row items-center py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color={COLORS.foreground} />
          </Pressable>
        </View>
        <EmptyState
          icon={<AlertCircle size={48} color={COLORS.destructive} />}
          title="Booking not found"
          description={
            error instanceof Error ? error.message : 'This booking may have been removed.'
          }
          actionLabel="Back to bookings"
          onAction={() => router.replace('/(customer)/bookings')}
        />
      </SafeAreaView>
    );
  }

  const timelineIdx = getTimelineIndex(booking.status);
  const lifecycle = booking.lifecycleTimestamps ?? {};

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* Top bar */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
          Booking
        </Text>
        <StatusBadge status={booking.status} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Provider + service card */}
        <Card>
          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Provider
          </Text>
          <Text className="mt-1 text-lg font-bold text-foreground">{booking.provider.name}</Text>
          {booking.provider.city ? (
            <Text className="text-sm text-muted-foreground">{booking.provider.city}</Text>
          ) : null}

          <View className="my-3 h-px bg-border" />

          <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Service
          </Text>
          <Text className="mt-1 text-base font-semibold text-foreground">
            {booking.service?.name ?? 'Custom Service'}
          </Text>
          {booking.service?.description ? (
            <Text className="mt-1 text-sm text-muted-foreground">
              {booking.service.description}
            </Text>
          ) : null}

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-sm text-muted-foreground">Total price</Text>
            <Text className="text-lg font-bold text-primary-700">
              {formatPrice(booking.totalPrice)}
            </Text>
          </View>
        </Card>

        {/* Scheduled time */}
        <Card className="mt-3">
          <View className="flex-row items-center">
            <Calendar size={18} color={COLORS.primary} />
            <Text className="ml-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Scheduled
            </Text>
          </View>
          <Text className="mt-2 text-base text-foreground">
            {formatDateTime(booking.scheduledAt)}
          </Text>
        </Card>

        {/* Address (booking.address or job.address) */}
        {booking.address || booking.job?.address ? (
          <Card className="mt-3">
            <View className="flex-row items-center">
              <MapPin size={18} color={COLORS.primary} />
              <Text className="ml-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Address
              </Text>
            </View>
            <Text className="mt-2 text-base text-foreground">
              {booking.address ?? booking.job?.address}
            </Text>
          </Card>
        ) : null}

        {/* Notes */}
        {booking.notes ? (
          <Card className="mt-3">
            <View className="flex-row items-center">
              <FileText size={18} color={COLORS.primary} />
              <Text className="ml-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </Text>
            </View>
            <Text className="mt-2 text-sm leading-5 text-foreground">{booking.notes}</Text>
          </Card>
        ) : null}

        {/* Customer info section */}
        {booking.customer ? (
          <Card className="mt-3">
            <View className="flex-row items-center">
              <User size={18} color={COLORS.primary} />
              <Text className="ml-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Customer
              </Text>
            </View>
            <View className="mt-3 flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-500">
                <Text className="text-sm font-bold text-white">
                  {getInitials(booking.customer.name)}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-foreground">
                  {booking.customer.name}
                </Text>
                {booking.customer.phone ? (
                  <View className="mt-0.5 flex-row items-center">
                    <Phone size={12} color={COLORS.mutedForeground} />
                    <Text className="ml-1 text-xs text-muted-foreground">
                      {booking.customer.phone}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Card>
        ) : null}

        {/* Assigned technician */}
        {booking.job?.employee ? (
          <Card className="mt-3">
            <View className="flex-row items-center">
              <User size={18} color={COLORS.primary} />
              <Text className="ml-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Technician
              </Text>
            </View>
            <View className="mt-2 flex-row items-center">
              <Badge variant="primary">Assigned</Badge>
              <Text className="ml-2 text-sm text-foreground">
                {booking.job.employee.name}
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Timeline (FIXED — includes 'assigned') */}
        {!isCancelled ? (
          <Card className="mt-3">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Status timeline
            </Text>
            <View>
              {BOOKING_TIMELINE_STEPS.map((step, i) => {
                const isDone = timelineIdx >= 0 && i <= timelineIdx;
                const isCurrent = timelineIdx === i;
                const isLast = i === BOOKING_TIMELINE_STEPS.length - 1;
                const ts = lifecycle[step];
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
                      {ts ? (
                        <Text className="text-xs text-muted-foreground">{formatShort(ts)}</Text>
                      ) : null}
                      {isCurrent ? (
                        <Text className="text-xs font-semibold text-primary-700">In progress</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        ) : (
          <Card className="mt-3">
            <View className="flex-row items-center">
              <XCircle size={20} color={COLORS.destructive} />
              <Text className="ml-2 text-base font-semibold text-foreground">Booking cancelled</Text>
            </View>
            <Text className="mt-1 text-sm text-muted-foreground">
              This booking was cancelled. Book a new service from the marketplace.
            </Text>
          </Card>
        )}

        {/* Actions */}
        <View className="mt-5 gap-2">
          {isTrackable ? (
            <Button onPress={handleTrack} size="lg" fullWidth>
              <View className="flex-row items-center">
                <Navigation size={18} color="#fff" />
                <Text className="ml-2 text-base font-semibold text-white">Track Live</Text>
              </View>
            </Button>
          ) : null}

          {isReschedulable ? (
            <Button
              variant="outline"
              onPress={() => {
                if (booking.scheduledAt) {
                  try {
                    setRescheduleDate(parseISO(booking.scheduledAt));
                  } catch {
                    // ignore parse errors
                  }
                }
                setRescheduleOpen(true);
              }}
              fullWidth
            >
              <View className="flex-row items-center">
                <RefreshCw size={16} color={COLORS.primary} />
                <Text className="ml-2 text-sm font-semibold text-primary-600">Reschedule</Text>
              </View>
            </Button>
          ) : null}

          {isCompleted ? (
            <Button onPress={() => {
              setRating(5);
              setComment('');
              setReviewOpen(true);
            }} variant="outline" fullWidth>
              <View className="flex-row items-center">
                <Star size={16} color={COLORS.accent} />
                <Text className="ml-2 text-sm font-semibold text-primary-600">Leave Review</Text>
              </View>
            </Button>
          ) : null}

          <Button variant="ghost" onPress={handleRebook} fullWidth>
            <View className="flex-row items-center">
              <Repeat2 size={16} color={COLORS.primary} />
              <Text className="ml-2 text-sm font-semibold text-primary-600">Book Again</Text>
            </View>
          </Button>

          {isCancellable ? (
            <Button
              variant="destructive"
              onPress={handleCancel}
              loading={cancelBooking.isPending}
              fullWidth
            >
              Cancel Booking
            </Button>
          ) : null}

          {isCancelled ? (
            <Button
              variant="outline"
              onPress={() => router.replace('/(customer)/marketplace')}
              fullWidth
            >
              Browse Marketplace
            </Button>
          ) : null}
        </View>
      </ScrollView>

      {/* Reschedule modal */}
      <Modal
        visible={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        position="center"
        showHandle={false}
      >
        <View className="px-5 pb-6 pt-5">
          <Text className="text-lg font-bold text-foreground">Reschedule booking</Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            Pick a new date and time for your appointment.
          </Text>

          <View className="mt-4 rounded-xl border border-border p-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              New date &amp; time
            </Text>
            <Text className="mt-1 text-base font-semibold text-foreground">
              {format(rescheduleDate, "EEE, MMM d, yyyy · h:mm a")}
            </Text>
          </View>

          <View className="mt-3 flex-row gap-2">
            <Button variant="outline" onPress={() => setShowDatePicker(true)} className="flex-1">
              <View className="flex-row items-center">
                <Calendar size={14} color={COLORS.primary} />
                <Text className="ml-1.5 text-sm font-semibold text-primary-600">Date</Text>
              </View>
            </Button>
            <Button variant="outline" onPress={() => setShowTimePicker(true)} className="flex-1">
              <View className="flex-row items-center">
                <Calendar size={14} color={COLORS.primary} />
                <Text className="ml-1.5 text-sm font-semibold text-primary-600">Time</Text>
              </View>
            </Button>
          </View>

          <View className="mt-5 flex-row gap-2">
            <Button variant="ghost" onPress={() => setRescheduleOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onPress={handleReschedule}
              loading={rescheduleBooking.isPending}
              className="flex-1"
            >
              Confirm
            </Button>
          </View>
        </View>
      </Modal>

      {showDatePicker ? (
        <DateTimePicker
          value={rescheduleDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      ) : null}
      {showTimePicker ? (
        <DateTimePicker
          value={rescheduleDate}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      ) : null}

      {/* Review modal */}
      <Modal visible={reviewOpen} onClose={() => setReviewOpen(false)} position="center" showHandle={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 0 }}
        >
          <View className="px-5 pb-6 pt-5">
            <Text className="text-lg font-bold text-foreground">Leave a review</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              How was your experience with {booking.provider.name}?
            </Text>

            {/* Star rating */}
            <View className="mt-4 flex-row justify-center">
              {[1, 2, 3, 4, 5].map((i) => (
                <Pressable
                  key={i}
                  onPress={() => setRating(i)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${i} star${i === 1 ? '' : 's'}`}
                  className="px-2 py-2"
                >
                  <Star
                    size={36}
                    color={COLORS.accent}
                    fill={i <= rating ? COLORS.accent : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>
            <Text className="mt-1 text-center text-sm font-semibold text-foreground">
              {rating} / 5
            </Text>

            <Text className="mb-1.5 mt-4 text-sm font-medium text-foreground">
              Comment (optional)
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share details of your experience…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              style={{
                minHeight: 96,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                color: COLORS.foreground,
                textAlignVertical: 'top',
              }}
            />

            <View className="mt-4 flex-row gap-2">
              <Button variant="ghost" onPress={() => setReviewOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onPress={handleSubmitReview}
                loading={createReview.isPending}
                className="flex-1"
              >
                Submit
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <LoadingOverlay
        visible={cancelBooking.isPending || rescheduleBooking.isPending || createReview.isPending}
        message={
          cancelBooking.isPending
            ? 'Cancelling…'
            : rescheduleBooking.isPending
              ? 'Rescheduling…'
              : 'Submitting review…'
        }
      />
    </SafeAreaView>
  );
}
