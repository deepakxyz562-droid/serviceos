/**
 * Booking Form Screen
 *
 * Reads providerId + slug (+ optional serviceId) from route params.
 * Fetches the provider profile (services, name, city) and renders a form
 * with a NATIVE date/time picker (NOT free-text input).
 *
 * Two booking types via SegmentedControl:
 *   - Instant Booking → POST /api/marketplace/book/instant
 *   - Request Quote   → POST /api/marketplace/quote-request
 *
 * Both endpoints accept { providerId, serviceId?, scheduledAt, address, notes }.
 *
 * Validation: service selection (or "Custom Service"), date, and address are
 * required. Inline error text appears under each invalid field.
 *
 * On success: toast + router.replace('/(customer)/bookings').
 *
 * BUG FIX: the submit button now correctly binds `loading={isPending}` to the
 * mutation state, so the spinner shows for the entire request and the button
 * is disabled while pending.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
} from 'lucide-react-native';
import { useProvider, useBookInstant, useRequestQuote } from '@/hooks/use-marketplace';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Service } from '@/types';

type BookingType = 'instant' | 'quote';
type ServiceSelection =
  | { kind: 'none' }
  | { kind: 'custom' }
  | { kind: 'service'; id: string };

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '';
  return `$${price.toFixed(2)}`;
}

function formatDuration(min: number | null | undefined): string {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export default function BookingFormScreen() {
  const { show } = useToast();
  const params = useLocalSearchParams<{
    providerId: string;
    slug: string;
    serviceId?: string;
  }>();

  const providerId = typeof params.providerId === 'string' ? params.providerId : '';
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const initialServiceId =
    typeof params.serviceId === 'string' ? params.serviceId : undefined;

  const { data: provider, isLoading, isError, error, refetch } = useProvider(slug || undefined);

  const bookInstant = useBookInstant();
  const requestQuote = useRequestQuote();

  const services = useMemo(() => provider?.services ?? [], [provider]);

  // ── Form state ────────────────────────────────────────────────────
  const [bookingType, setBookingType] = useState<BookingType>('instant');
  const [serviceSelection, setServiceSelection] = useState<ServiceSelection>(
    initialServiceId
      ? { kind: 'service', id: initialServiceId }
      : { kind: 'none' }
  );
  const [servicePickerOpen, setServicePickerOpen] = useState(false);

  // Native date/time picker state.
  const [date, setDate] = useState<Date | null>(null);
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [androidMode, setAndroidMode] = useState<'date' | 'time' | null>(null);

  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Inline validation errors.
  const [errors, setErrors] = useState<{
    service?: string;
    date?: string;
    address?: string;
  }>({});

  const selectedService = useMemo<Service | null>(() => {
    if (serviceSelection.kind !== 'service') return null;
    return services.find((s) => s.id === serviceSelection.id) ?? null;
  }, [serviceSelection, services]);

  // ── Date picker helpers ───────────────────────────────────────────
  const openDatePicker = () => {
    if (Platform.OS === 'ios') {
      setTempDate(date ?? roundToNextHalfHour(new Date()));
      setIosPickerVisible(true);
    } else {
      setAndroidMode('date');
    }
  };

  const onIosChange = (_e: DateTimePickerEvent, d?: Date) => {
    if (d) setTempDate(d);
  };

  const confirmIos = () => {
    setDate(tempDate);
    setIosPickerVisible(false);
  };

  const onAndroidChange = (_e: DateTimePickerEvent, d?: Date) => {
    if (_e.type === 'set' && d) {
      if (androidMode === 'date') {
        const base = date ?? new Date();
        const next = new Date(d);
        next.setHours(base.getHours(), base.getMinutes(), 0, 0);
        setDate(next);
        setAndroidMode('time');
      } else if (androidMode === 'time') {
        const base = date ?? new Date();
        const next = new Date(base);
        next.setHours(d.getHours(), d.getMinutes(), 0, 0);
        setDate(next);
        setAndroidMode(null);
      }
    } else {
      setAndroidMode(null);
    }
  };

  // ── Validation ────────────────────────────────────────────────────
  const validate = (): boolean => {
    const next: typeof errors = {};
    if (serviceSelection.kind === 'none') next.service = 'Please select a service.';
    if (!date) next.date = 'Please choose a date and time.';
    if (!address.trim()) next.address = 'Service address is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!providerId) {
      show('Provider information is missing.', 'error');
      return;
    }
    if (!validate()) {
      show('Please complete the required fields.', 'warning');
      return;
    }

    const payload = {
      providerId,
      serviceId: serviceSelection.kind === 'service' ? serviceSelection.id : undefined,
      scheduledAt: date!.toISOString(),
      address: address.trim(),
      notes: notes.trim() || undefined,
    };

    try {
      if (bookingType === 'instant') {
        await bookInstant.mutateAsync(payload);
        show('Booking confirmed!', 'success');
      } else {
        await requestQuote.mutateAsync(payload);
        show('Quote request sent!', 'success');
      }
      router.replace('/(customer)/bookings');
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Booking failed. Please try again.',
        'error'
      );
    }
  };

  const isSubmitting = bookInstant.isPending || requestQuote.isPending;

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Spinner />
      </SafeAreaView>
    );
  }

  // ── Error / missing provider ──────────────────────────────────────
  if (isError || !provider) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <View className="flex-row items-center py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color={COLORS.foreground} />
          </Pressable>
        </View>
        <EmptyState
          icon={<AlertCircle size={48} color={COLORS.destructive} />}
          title="Couldn&apos;t load provider"
          description={
            error instanceof Error
              ? error.message
              : 'We could not load this provider. Please try again.'
          }
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  const serviceLabel =
    serviceSelection.kind === 'custom'
      ? 'Custom Service'
      : selectedService
        ? selectedService.name
        : services.length > 0
          ? 'Select a service'
          : 'Custom Service';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* Top bar */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-bold text-foreground">Book a service</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Provider summary */}
          <Card className="mb-4">
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Provider
            </Text>
            <Text className="mt-1 text-base font-bold text-foreground">{provider.name}</Text>
            {provider.city ? (
              <View className="mt-1 flex-row items-center">
                <MapPin size={12} color={COLORS.mutedForeground} />
                <Text className="ml-1 text-sm text-muted-foreground">{provider.city}</Text>
              </View>
            ) : null}
          </Card>

          {/* Booking type toggle */}
          <Text className="mb-2 text-sm font-medium text-foreground">Booking type</Text>
          <SegmentedControl<BookingType>
            options={[
              { value: 'instant', label: 'Instant' },
              { value: 'quote', label: 'Request Quote' },
            ]}
            value={bookingType}
            onChange={setBookingType}
            activeColor={COLORS.customerAccent}
            className="mb-4"
          />
          <Text className="mb-4 text-xs text-muted-foreground">
            {bookingType === 'instant'
              ? 'Confirm right away — the provider will be notified instantly.'
              : 'Get a custom price quote. The provider will respond with a price.'}
          </Text>

          {/* Service select */}
          <Text className="mb-1.5 text-sm font-medium text-foreground">Service *</Text>
          <Pressable
            onPress={() => setServicePickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Select a service"
            className={cn(
              'mb-1 flex-row items-center justify-between rounded-xl border bg-white px-4 py-3',
              errors.service ? 'border-destructive' : 'border-border'
            )}
          >
            <View className="flex-1 pr-2">
              {serviceSelection.kind === 'service' && selectedService ? (
                <View>
                  <Text className="text-base font-medium text-foreground">
                    {selectedService.name}
                  </Text>
                  <View className="mt-0.5 flex-row items-center">
                    {selectedService.price != null ? (
                      <Text className="text-sm font-semibold text-primary-700">
                        {formatPrice(selectedService.price)}
                      </Text>
                    ) : null}
                    {selectedService.durationMinutes ? (
                      <View className="ml-2 flex-row items-center">
                        <Clock size={11} color={COLORS.mutedForeground} />
                        <Text className="ml-1 text-xs text-muted-foreground">
                          {formatDuration(selectedService.durationMinutes)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : (
                <Text
                  className={cn(
                    'text-base',
                    serviceSelection.kind === 'none' ? 'text-gray-400' : 'text-foreground'
                  )}
                >
                  {serviceLabel}
                </Text>
              )}
            </View>
            <ChevronDown size={18} color={COLORS.mutedForeground} />
          </Pressable>
          {errors.service ? (
            <Text className="mb-3 mt-1 text-sm text-destructive">{errors.service}</Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* Date / time picker — native, not free text */}
          <Text className="mb-1.5 text-sm font-medium text-foreground">Date &amp; time *</Text>
          <Pressable
            onPress={openDatePicker}
            accessibilityRole="button"
            accessibilityLabel="Pick a date and time"
            className={cn(
              'mb-1 flex-row items-center justify-between rounded-xl border bg-white px-4 py-3',
              errors.date ? 'border-destructive' : 'border-border'
            )}
          >
            <View className="flex-row items-center flex-1">
              <Calendar size={16} color={date ? COLORS.primary : COLORS.mutedForeground} />
              <Text
                className={cn(
                  'ml-2 text-base',
                  date ? 'text-foreground' : 'text-gray-400'
                )}
              >
                {date
                  ? format(date, "EEE, MMM d, yyyy 'at' h:mm a")
                  : 'Tap to choose date & time'}
              </Text>
            </View>
            <Clock size={16} color={COLORS.mutedForeground} />
          </Pressable>
          {errors.date ? (
            <Text className="mb-3 mt-1 text-sm text-destructive">{errors.date}</Text>
          ) : (
            <View className="mb-3" />
          )}

          {/* Address */}
          <Input
            label="Service address *"
            value={address}
            onChangeText={(v) => {
              setAddress(v);
              if (errors.address) setErrors((e) => ({ ...e, address: undefined }));
            }}
            placeholder="Street, city, postal code"
            multiline
            numberOfLines={2}
            style={{ minHeight: 64 }}
            textAlignVertical="top"
            error={errors.address}
          />

          {/* Notes */}
          <Input
            label={bookingType === 'instant' ? 'Notes (optional)' : 'Describe the work *'}
            value={notes}
            onChangeText={setNotes}
            placeholder={
              bookingType === 'instant'
                ? 'Any special instructions for the provider'
                : 'Describe what you need done — scope, materials, access, etc.'
            }
            multiline
            numberOfLines={4}
            style={{ minHeight: 96 }}
            textAlignVertical="top"
          />

          {/* Submit */}
          <Button
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || !providerId}
            fullWidth
            size="lg"
          >
            {bookingType === 'instant' ? 'Confirm Booking' : 'Send Quote Request'}
          </Button>

          {/* Service picker modal */}
          <Modal
            visible={servicePickerOpen}
            onClose={() => setServicePickerOpen(false)}
            position="bottom"
          >
            <View className="px-4 pb-2">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-foreground">Select service</Text>
                <Pressable onPress={() => setServicePickerOpen(false)} hitSlop={8}>
                  <Text className="text-sm font-semibold text-primary-600">Done</Text>
                </Pressable>
              </View>
            </View>
            <FlatList
              data={[
                {
                  id: '__custom__',
                  name: 'Custom Service',
                  description: null,
                  price: null,
                  durationMinutes: null,
                } as Service,
                ...services,
              ]}
              keyExtractor={(s) => s.id}
              renderItem={({ item: s }: { item: Service }) => {
                const isCustom = s.id === '__custom__';
                const selected =
                  (isCustom && serviceSelection.kind === 'custom') ||
                  (!isCustom &&
                    serviceSelection.kind === 'service' &&
                    serviceSelection.id === s.id);
                return (
                  <Pressable
                    onPress={() => {
                      setServiceSelection(isCustom ? { kind: 'custom' } : { kind: 'service', id: s.id });
                      setServicePickerOpen(false);
                      if (errors.service) setErrors((e) => ({ ...e, service: undefined }));
                    }}
                    className={cn(
                      'mx-4 mb-2 flex-row items-center justify-between rounded-xl border px-3 py-3',
                      selected ? 'border-primary-500 bg-primary-50' : 'border-border'
                    )}
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-base font-medium text-foreground">{s.name}</Text>
                      {s.description ? (
                        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                          {s.description}
                        </Text>
                      ) : null}
                      <View className="mt-1 flex-row items-center">
                        {s.price != null ? (
                          <Badge variant="primary">{formatPrice(s.price)}</Badge>
                        ) : null}
                        {s.durationMinutes ? (
                          <View className="ml-2">
                            <Badge variant="default">
                              {formatDuration(s.durationMinutes)}
                            </Badge>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    {selected ? <Check size={18} color={COLORS.primary} /> : null}
                  </Pressable>
                );
              }}
              style={{ maxHeight: 480 }}
              contentContainerStyle={{ paddingBottom: 12 }}
            />
          </Modal>

          {/* iOS date/time picker bottom sheet */}
          {iosPickerVisible ? (
            <Modal
              visible={iosPickerVisible}
              onClose={() => setIosPickerVisible(false)}
              position="bottom"
              showHandle={false}
            >
              <View className="px-4 pb-2">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-foreground">Choose date &amp; time</Text>
                  <Pressable onPress={() => setIosPickerVisible(false)} hitSlop={8}>
                    <Text className="text-sm font-semibold text-muted-foreground">Cancel</Text>
                  </Pressable>
                </View>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                onChange={onIosChange}
                minimumDate={new Date()}
                style={{ width: '100%' }}
              />
              <View className="px-4 pb-4 pt-2">
                <Button onPress={confirmIos} fullWidth size="lg">
                  Done
                </Button>
              </View>
            </Modal>
          ) : null}

          {/* Android: render the picker when active — it pops a system modal */}
          {androidMode ? (
            <DateTimePicker
              value={date ?? new Date()}
              mode={androidMode}
              display="default"
              onChange={onAndroidChange}
              minimumDate={new Date()}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Round a Date up to the next half-hour so the default picker value is sane. */
function roundToNextHalfHour(d: Date): Date {
  const next = new Date(d);
  next.setSeconds(0, 0);
  const min = next.getMinutes();
  if (min <= 30) {
    next.setMinutes(30);
  } else {
    next.setHours(next.getHours() + 1, 0);
  }
  return next;
}
