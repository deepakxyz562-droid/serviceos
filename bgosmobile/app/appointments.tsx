import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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
} from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { DateTimeField } from '../src/components/booking/date-time-field';
import { localDay, futureLocalTime } from '../src/lib/dates';
import { WEB_URL } from '../src/lib/constants';
import { withProtectedRoute } from '../src/components/navigation/protected-route';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

type Booking = { id: string; title: string; customerName?: string; scheduledAt?: string; status: string };

function AppointmentsScreen() {
  const router = useRouter();
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  const liveBookingUrl = workspace.data?.links?.booking
    ? (workspace.data.links.booking.startsWith('http')
        ? workspace.data.links.booking
        : `${WEB_URL}${workspace.data.links.booking}`)
    : null;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7 + i);
    return d;
  });

  const startOfWindow = new Date(days[0]);
  startOfWindow.setHours(0,0,0,0);
  const endOfWindow = new Date(days[6]);
  endOfWindow.setHours(23,59,59,999);
  const [bookingPage,setBookingPage] = useState(1);
  useEffect(()=>{setBookingPage(1);setSelectedDate(days[0]);},[weekOffset]);
  const resource = useResource<{ bookings: Booking[]; pagination?: {totalPages?:number} }>(
    `/api/bookings?limit=50&page=${bookingPage}&dateFrom=${encodeURIComponent(startOfWindow.toISOString())}&dateTo=${encodeURIComponent(endOfWindow.toISOString())}&sortBy=scheduledAt&sortOrder=asc`
  );

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [bookModal, setBookModal] = useState(false);
  const [newClient, setNewClient] = useState('');
  const [newService, setNewService] = useState('');
  const [serviceId,setServiceId] = useState<string | null>(null);
  const [customerId,setCustomerId] = useState<string | null>(null);
  const [clientSearch,setClientSearch] = useState('');
  useEffect(()=>{const timer=setTimeout(()=>setClientSearch(newClient),300);return()=>clearTimeout(timer);},[newClient]);
  const serviceOptions=useResource<{services:{id:string;name:string;duration:number}[]}>(`/api/services?active=true&limit=20&search=${encodeURIComponent(newService)}`,0,bookModal);
  const customerOptions=useResource<{data:{id:string;name:string;phone?:string;email?:string}[]}>(`/api/contacts?limit=5&search=${encodeURIComponent(clientSearch)}`,0,bookModal && clientSearch.length>1 && !customerId);
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
      const scheduledIso = futureLocalTime(newDate, newTime);
      if (!scheduledIso) { setError('Choose a valid future date and time.'); return; }
      await apiRequest('/api/bookings', {
        method: 'POST',
        body: {
          title: newService.trim(),
          customerName: newClient.trim(),
          ...(customerId ? {customerPhone: customerOptions.data?.data.find(c=>c.id===customerId)?.phone, customerEmail: customerOptions.data?.data.find(c=>c.id===customerId)?.email} : {}),
          ...(serviceId ? {serviceId, duration: serviceOptions.data?.services.find(s=>s.id===serviceId)?.duration} : {}),
          scheduledAt: scheduledIso,
          status: 'confirmed',
        },
      });
      setBookModal(false);
      setNewClient('');
      setNewService('');
      setServiceId(null); setCustomerId(null);
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
          compact
          label="＋ Book"
          icon="add"
          onPress={() => {
            setError(null);
            setBookModal(true);
          }}
        />
      }
    >
      <ErrorNotice message={error || resource.error} retry={resource.refresh} />

      {/* Quick Share Online Booking Link Banner */}
      {liveBookingUrl && (
        <Card style={{ padding: 12, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="event-available" size={18} color="#009F50" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
                  Online Booking Page
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: '#64748B' }}>
                  {liveBookingUrl}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => {
                  const waText = encodeURIComponent(`Hello! You can view our services and schedule an appointment online here: ${liveBookingUrl}`);
                  void Linking.openURL(`https://wa.me/?text=${waText}`);
                }}
                hitSlop={8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#25D366',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 14,
                }}
              >
                <MaterialIcons name="chat" size={13} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>WhatsApp</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void Share.share({ message: liveBookingUrl, url: liveBookingUrl });
                }}
                hitSlop={8}
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: 6,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              >
                <MaterialIcons name="share" size={16} color="#0F172A" />
              </Pressable>

              <Pressable
                onPress={() => router.push('/booking-page')}
                hitSlop={8}
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: 6,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              >
                <MaterialIcons name="tune" size={16} color="#0F172A" />
              </Pressable>
            </View>
          </View>
        </Card>
      )}

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
        <View>
          <Empty
            title="No bookings for this date"
            detail="Time slots are open. Book an appointment or share your direct booking link."
            actionLabel="＋ Book New Appointment"
            onAction={() => setBookModal(true)}
          />
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <Pressable
              onPress={() => router.push('/booking-page')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#EFF6FF',
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#BFDBFE',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <MaterialIcons name="tune" size={16} color="#1D4ED8" />
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1D4ED8' }}>
                Manage Booking Page & Services
              </Text>
            </Pressable>
          </View>
        </View>
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
                      const original = b.scheduledAt ? new Date(b.scheduledAt) : new Date();
                      setDateStr(localDay(original));
                      setTimeStr(`${String(original.getHours()).padStart(2,'0')}:${String(original.getMinutes()).padStart(2,'0')}`);
                    }}
                  />
                </View>
              </View>
            )}
          </Card>
        ))
      )}

      {!!resource.data?.pagination?.totalPages && resource.data.pagination.totalPages > 1 && <View style={[ui.row,{gap:12}]}><Action secondary label="Previous page" disabled={bookingPage===1} onPress={()=>setBookingPage(p=>p-1)}/><Text style={ui.caption}>Page {bookingPage}</Text><Action secondary label="Next page" disabled={bookingPage>=resource.data.pagination.totalPages} onPress={()=>setBookingPage(p=>p+1)}/></View>}
      {/* Book New Appointment Modal */}
      <Modal visible={bookModal} animationType="slide" onRequestClose={() => {if(!busy)setBookModal(false);}}>
        <Screen
          title="Book Appointment"
          subtitle="Reserve a slot on your business calendar."
          showBack={true}
          onBack={() => {if(!busy)setBookModal(false);}}
        >
          <Card style={{ gap: 12 }}>
            <ErrorNotice message={error}/><Field label="Customer name" value={newClient} onChangeText={v=>{setNewClient(v);setCustomerId(null);}} placeholder="e.g. Priya Singh" />
            {!!customerOptions.error && !customerId && <ErrorNotice message={customerOptions.error} retry={customerOptions.refresh}/>}
            {!customerId && clientSearch.length>1 && customerOptions.data?.data.map(c=><Action key={c.id} secondary label={c.name} onPress={()=>{setCustomerId(c.id);setNewClient(c.name);}}/>)}
            <Field label="Service" value={newService} onChangeText={v=>{setNewService(v);setServiceId(null);}} placeholder="e.g. Hair Spa or Consultation" />
            <ErrorNotice message={serviceOptions.error} retry={serviceOptions.refresh}/>
            {!serviceId && serviceOptions.data?.services.slice(0,5).map(service=><Action key={service.id} secondary label={`${service.name} · ${service.duration} min`} onPress={()=>{setServiceId(service.id);setNewService(service.name);}}/>)}
            <DateTimeField day={newDate} time={newTime} onDay={setNewDate} onTime={setNewTime}/>


            <Action
              label={busy ? 'Saving Booking…' : 'Add appointment'}
              icon="event-available"
              disabled={busy || !newClient.trim() || !newService.trim()}
              onPress={createBooking}
            />
            <Action secondary label="Cancel" disabled={busy} onPress={() => setBookModal(false)} />
          </Card>
        </Screen>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={!!selectedBooking} onRequestClose={() => {if(!busy)setSelectedBooking(null);}} animationType="slide">
        {selectedBooking && (
          <Screen
            title="Reschedule Appointment"
            subtitle={selectedBooking.customerName || selectedBooking.title}
            showBack={true}
            onBack={() => {if(!busy)setSelectedBooking(null);}}
          >
            <ErrorNotice message={error} />
            <Card style={{ gap: 12 }}>
              <DateTimeField day={dateStr} time={timeStr} onDay={setDateStr} onTime={setTimeStr}/>
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

export default withProtectedRoute(AppointmentsScreen);
