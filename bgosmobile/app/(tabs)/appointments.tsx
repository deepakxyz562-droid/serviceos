import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Field,
  Action,
  Empty,
  ErrorNotice,
  Loading,
  ui,
  Badge,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { localDay, futureLocalTime } from '../../src/lib/dates';

type Booking = { id: string; title: string; customerName?: string; scheduledAt?: string; status: string };

export default function AppointmentsScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7 + i);
    return d;
  });

  const resource = useResource<{ bookings: Booking[] }>(
    '/api/bookings?limit=100&sortBy=scheduledAt&sortOrder=asc'
  );

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [bookModal, setBookModal] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newService, setNewService] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(booking: Booking, body: object) {
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/bookings/${booking.id}`, { method: 'PUT', body });
      setSelectedBooking(null);
      await resource.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reschedule() {
    const parsed = futureLocalTime(dateStr, timeStr);
    if (!parsed) {
      setError('Enter a valid future date and time.');
      return;
    }
    if (selectedBooking) save(selectedBooking, { scheduledAt: parsed });
  }

  async function createBooking() {
    if (!newClient.trim() || !newService.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const scheduledIso = (newDate && newTime ? futureLocalTime(newDate, newTime) : null) || new Date().toISOString();
      await apiRequest('/api/bookings', {
        method: 'POST',
        body: {
          title: newService.trim(),
          customerName: newClient.trim(),
          scheduledAt: scheduledIso,
          status: 'confirmed',
        },
      });
      setBookModal(false);
      setNewClient('');
      setNewService('');
      setNewDate('');
      setNewTime('');
      await resource.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const activeDayKey = localDay(selectedDate);
  const filtered =
    resource.data?.bookings.filter(
      (b) => b.scheduledAt && localDay(new Date(b.scheduledAt)) === activeDayKey
    ) || [];

  const monthYearLabel = selectedDate.toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <Screen
      title="Appointments"
      subtitle="Calendar schedule, customer bookings & rescheduling."
      showBack={true}
      onRefresh={resource.refresh}
      rightAction={
        <Action
          label="＋ Book Slot"
          onPress={() => {
            setError(null);
            setBookModal(true);
          }}
        />
      }
    >
      <ErrorNotice message={error || resource.error} retry={resource.refresh} />

      {/* Month Navigator (Screens 19 & 14 in mockups) */}
      <Card style={{ padding: 14 }}>
        <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
          <Text style={[ui.heading, { fontSize: 18 }]}>{monthYearLabel}</Text>
          <View style={[ui.row, { gap: 6 }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setWeekOffset((prev) => prev - 1)}
              style={styles.navArrow}
            >
              <MaterialIcons name="chevron-left" size={24} color={colors.ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setWeekOffset((prev) => prev + 1)}
              style={styles.navArrow}
            >
              <MaterialIcons name="chevron-right" size={24} color={colors.ink} />
            </Pressable>
          </View>
        </View>

        {/* Circular Horizontal Day Strip (Screen 19) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {days.map((d) => {
              const isSelected = localDay(d) === activeDayKey;
              const isToday = localDay(d) === localDay(new Date());

              return (
                <Pressable
                  key={localDay(d)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedDate(d)}
                  style={[
                    styles.dayPill,
                    isSelected && { backgroundColor: colors.brand, borderColor: colors.brand },
                  ]}
                >
                  <Text style={[styles.dayText, isSelected && { color: '#FFFFFF' }]}>
                    {d.toLocaleDateString([], { weekday: 'short' })}
                  </Text>
                  <View
                    style={[
                      styles.dateCircle,
                      isSelected && { backgroundColor: '#FFFFFF' },
                      isToday && !isSelected && { backgroundColor: colors.soft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateNumber,
                        isSelected ? { color: colors.brand } : { color: colors.ink },
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Card>

      {/* Agenda Section */}
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.heading}>
          Agenda for {selectedDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
        <Badge label={`${filtered.length} Bookings`} accent />
      </View>

      {resource.loading ? (
        <Loading />
      ) : !filtered.length ? (
        <Empty
          title="No bookings for this date"
          detail="Time slots are open. Book an appointment or share your direct booking link."
          actionLabel="＋ Book New Appointment"
          onAction={() => setBookModal(true)}
        />
      ) : (
        filtered.map((b) => (
          <Card key={b.id} style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={[ui.row, { gap: 8 }]}>
                <View style={[ui.iconTile, { width: 34, height: 34 }]}>
                  <MaterialIcons name="schedule" size={18} color={colors.brand} />
                </View>
                <Text style={[ui.heading, { fontSize: 16 }]}>
                  {b.scheduledAt
                    ? new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Time not set'}
                </Text>
              </View>
              <Badge label={b.status.toUpperCase()} success={b.status === 'confirmed'} />
            </View>

            <View style={{ gap: 2 }}>
              <Text style={[ui.heading, { fontSize: 17 }]}>{b.customerName || 'Customer Client'}</Text>
              <Text style={ui.body}>{b.title}</Text>
            </View>

            {!['cancelled', 'completed'].includes(b.status) && (
              <View style={[ui.row, { gap: 10, marginTop: 4 }]}>
                <View style={{ flex: 1 }}>
                  <Action
                    label="Confirm Slot"
                    disabled={busy || b.status === 'confirmed'}
                    onPress={() => save(b, { status: 'confirmed' })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    label="Reschedule"
                    secondary
                    disabled={busy}
                    onPress={() => {
                      setSelectedBooking(b);
                      setDateStr('');
                      setTimeStr('');
                    }}
                  />
                </View>
              </View>
            )}
          </Card>
        ))
      )}

      {/* Book New Appointment Modal */}
      <Modal visible={bookModal} animationType="slide" onRequestClose={() => setBookModal(false)}>
        <Screen
          title="Book Appointment"
          subtitle="Reserve a slot on your business calendar."
          showBack={true}
          onBack={() => setBookModal(false)}
        >
          <Card style={{ gap: 12 }}>
            <Field label="Customer Full Name" value={newClient} onChangeText={setNewClient} placeholder="e.g. Priya Singh" />
            <Field label="Service / Treatment" value={newService} onChangeText={setNewService} placeholder="e.g. Hair Spa or Consultation" />
            <Field label="Date (YYYY-MM-DD)" value={newDate} onChangeText={setNewDate} placeholder="2026-10-15" />
            <Field label="Time (HH:MM, 24-hr)" value={newTime} onChangeText={setNewTime} placeholder="14:30" />

            <Action
              label={busy ? 'Saving Booking…' : 'Confirm & Add Booking'}
              icon="event-available"
              disabled={busy || !newClient.trim() || !newService.trim()}
              onPress={createBooking}
            />
            <Action secondary label="Cancel" disabled={busy} onPress={() => setBookModal(false)} />
          </Card>
        </Screen>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={!!selectedBooking} onRequestClose={() => setSelectedBooking(null)} animationType="slide">
        {selectedBooking && (
          <Screen
            title="Reschedule Appointment"
            subtitle={selectedBooking.customerName || selectedBooking.title}
            showBack={true}
            onBack={() => setSelectedBooking(null)}
          >
            <ErrorNotice message={error} />
            <Card style={{ gap: 12 }}>
              <Field label="New Date (YYYY-MM-DD)" value={dateStr} onChangeText={setDateStr} placeholder="2026-10-16" />
              <Field label="New Time (HH:MM, 24-hr)" value={timeStr} onChangeText={setTimeStr} placeholder="15:00" />
              <Action label={busy ? 'Saving…' : 'Save New Time'} disabled={busy} onPress={reschedule} />
              <Action secondary label="Cancel" disabled={busy} onPress={() => setSelectedBooking(null)} />
            </Card>
          </Screen>
        )}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPill: {
    width: 58,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: {
    fontSize: 15,
    fontWeight: '800',
  },
});
