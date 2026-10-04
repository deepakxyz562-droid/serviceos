import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  SafeAreaView,
  StatusBar,
  Modal,
  Share,
  Alert,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import { API_PATHS } from '@/lib/constants';
import { apiRequest } from '@/lib/api';

interface BookingItem {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  service: string;
  time: string;
  dateKey: 'today' | 'tomorrow' | 'this_week';
  duration: string;
  depositPaid: boolean;
  amount: number;
  meetingType: 'video' | 'in_person' | 'phone';
  meetingLocation: string;
  intakeAnswers: { question: string; answer: string }[];
  status: 'confirmed' | 'rescheduled' | 'cancelled';
}

interface EventType {
  id: string;
  title: string;
  duration: string;
  price: number;
  description: string;
  slug: string;
  iconColor: string;
}

const EVENT_TYPES: EventType[] = [
  {
    id: 'evt-1',
    title: '15-Min Quick Discovery',
    duration: '15 min',
    price: 0,
    description: 'Initial intake, qualification & scoping call',
    slug: 'discovery-15m',
    iconColor: '#10B981',
  },
  {
    id: 'evt-2',
    title: '30-Min Consultation',
    duration: '30 min',
    price: 35,
    description: 'Detailed project or service evaluation',
    slug: 'consultation-30m',
    iconColor: '#3B82F6',
  },
  {
    id: 'evt-3',
    title: '45-Min Technical Inspection',
    duration: '45 min',
    price: 50,
    description: 'On-site diagnostics and estimator inspection',
    slug: 'inspection-45m',
    iconColor: '#8b5cf6',
  },
];

const INITIAL_BOOKINGS: BookingItem[] = [
  {
    id: 'b-1',
    customerName: 'Sarah Jenkins',
    phone: '+1 (415) 992-0192',
    email: 'sarah.j@example.com',
    service: 'Emergency Pipe Leak Repair',
    time: 'Today · 10:00 AM',
    dateKey: 'today',
    duration: '45 min',
    depositPaid: true,
    amount: 50,
    meetingType: 'in_person',
    meetingLocation: '742 Evergreen Terrace, San Francisco, CA',
    intakeAnswers: [
      { question: 'What is the main issue?', answer: 'Pipe burst under kitchen sink, water leaking continuously.' },
      { question: 'Can you locate main water shutoff?', answer: 'Yes, shut off main valve already.' },
    ],
    status: 'confirmed',
  },
  {
    id: 'b-2',
    customerName: 'Marcus Vance',
    phone: '+1 (408) 552-3310',
    email: 'm.vance@techcorp.com',
    service: '30-Min Commercial HVAC Scoping',
    time: 'Today · 2:30 PM',
    dateKey: 'today',
    duration: '30 min',
    depositPaid: false,
    amount: 0,
    meetingType: 'video',
    meetingLocation: 'https://meet.google.com/abc-wxyz-123',
    intakeAnswers: [
      { question: 'Building size?', answer: 'Approx 3,500 sq ft retail space with 2 rooftop units.' },
      { question: 'Primary goal?', answer: 'Quarterly maintenance agreement and seasonal tune-up.' },
    ],
    status: 'confirmed',
  },
  {
    id: 'b-3',
    customerName: 'Elena Rostova',
    phone: '+1 (650) 201-9988',
    email: 'elena.rostova@gmail.com',
    service: 'Dental Implant Consultation',
    time: 'Tomorrow · 11:15 AM',
    dateKey: 'tomorrow',
    duration: '30 min',
    depositPaid: true,
    amount: 35,
    meetingType: 'in_person',
    meetingLocation: 'Suite 400, Medical Plaza, Palo Alto, CA',
    intakeAnswers: [
      { question: 'First-time patient?', answer: 'Yes, referred by Dr. Adams.' },
      { question: 'Any dental insurance?', answer: 'Delta Dental Premier.' },
    ],
    status: 'confirmed',
  },
];

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'event_types' | 'settings'>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'tomorrow'>('all');
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [googleCalendarSync, setGoogleCalendarSync] = useState(true);
  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const res = await apiRequest<any>(API_PATHS.bookings);
      const list = Array.isArray(res) ? res : res?.bookings || [];
      if (list.length > 0) {
        setBookings(
          list.map((it: any, idx: number) => ({
            id: it.id || `b-${idx}`,
            customerName: it.customerName || it.name || 'Customer',
            phone: it.customerPhone || it.phone || '',
            email: it.customerEmail || it.email || '',
            service: it.serviceName || it.title || 'Consultation',
            time: it.scheduledAt ? new Date(it.scheduledAt).toLocaleString() : 'Scheduled',
            dateKey: 'today',
            duration: it.duration || '30 min',
            depositPaid: !!it.depositPaid,
            amount: Number(it.price || it.amount || 0),
            meetingType: (it.meetingType === 'video' || it.meetingType === 'phone') ? it.meetingType : 'in_person',
            meetingLocation: it.location || 'Store / Office',
            intakeAnswers: Array.isArray(it.answers) ? it.answers : [],
            status: it.status || 'confirmed',
          }))
        );
        return;
      }
    } catch {}
    setBookings(INITIAL_BOOKINGS);
  };

  useEffect(() => {
    fetchBookings().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    await fetchBookings();
    setRefreshing(false);
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterDate === 'all') return true;
    return b.dateKey === filterDate;
  });

  const handleShareLink = async (slug: string) => {
    await hapticFeedback.light();
    try {
      await Share.share({
        title: 'Book an appointment',
        message: `Book a session directly on our calendar: https://fieseros.com/book/${slug}`,
      });
    } catch {}
  };

  const handleCall = async (phone: string) => {
    await hapticFeedback.medium();
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            hapticFeedback.light();
            router.back();
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookings &amp; Calendar</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.container}>
        {/* Navigation Tabs */}
        <View style={styles.tabsRow}>
          {[
            { id: 'upcoming', label: 'Appointments', icon: 'event' },
            { id: 'event_types', label: 'Event Types', icon: 'schedule' },
            { id: 'settings', label: 'Calendar Sync', icon: 'sync' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={async () => {
                  await hapticFeedback.light();
                  setActiveTab(tab.id as any);
                }}
                style={[styles.tabItem, active && styles.tabItemActive]}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={15}
                  color={active ? '#ffffff' : '#64748b'}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab 1: Upcoming Appointments */}
        {activeTab === 'upcoming' && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
            showsVerticalScrollIndicator={false}
          >
            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              {(['all', 'today', 'tomorrow'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={async () => {
                    await hapticFeedback.light();
                    setFilterDate(filter);
                  }}
                  style={[styles.pill, filterDate === filter && styles.pillActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, filterDate === filter && styles.pillTextActive]}>
                    {filter === 'all' ? 'All Slots' : filter === 'today' ? 'Today' : 'Tomorrow'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredBookings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingCard}
                onPress={() => {
                  hapticFeedback.light();
                  setSelectedBooking(b);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.bookingCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingCustomer}>{b.customerName}</Text>
                    <Text style={styles.bookingService}>{b.service}</Text>
                  </View>
                  <View style={styles.bookingStatusBadge}>
                    <Text style={styles.bookingStatusText}>Confirmed</Text>
                  </View>
                </View>

                <View style={styles.bookingDetailsRow}>
                  <View style={styles.detailItem}>
                    <MaterialIcons name="access-time" size={14} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.detailText}>{b.time} ({b.duration})</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialIcons
                      name={b.meetingType === 'video' ? 'videocam' : b.meetingType === 'phone' ? 'phone' : 'place'}
                      size={14}
                      color="#64748b"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.detailText}>
                      {b.meetingType === 'video' ? 'Google Meet' : b.meetingType === 'phone' ? 'Phone' : 'In-Person'}
                    </Text>
                  </View>
                </View>

                {b.depositPaid && (
                  <View style={styles.depositRow}>
                    <MaterialIcons name="check-circle" size={14} color="#10b981" style={{ marginRight: 4 }} />
                    <Text style={styles.depositText}>Deposit Paid: ${b.amount}</Text>
                  </View>
                )}

                <View style={styles.bookingFooter}>
                  <Text style={styles.viewIntakeLink}>View Intake Details →</Text>
                  <TouchableOpacity
                    onPress={() => handleCall(b.phone)}
                    style={styles.callIconBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="phone" size={16} color="#10b981" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Tab 2: Event Types */}
        {activeTab === 'event_types' && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.eventTypeList}>
              {EVENT_TYPES.map((evt) => (
                <View key={evt.id} style={styles.eventTypeCard}>
                  <View style={styles.evtHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.evtTitle}>{evt.title}</Text>
                      <Text style={styles.evtDuration}>{evt.duration} • {evt.price > 0 ? `$${evt.price}` : 'Free'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleShareLink(evt.slug)}
                      style={styles.shareBtn}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="share" size={16} color="#3b82f6" style={{ marginRight: 4 }} />
                      <Text style={styles.shareBtnText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.evtDesc}>{evt.description}</Text>
                  <View style={styles.evtLinkRow}>
                    <Text style={styles.evtLinkText}>fieseros.com/book/{evt.slug}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Tab 3: Calendar Sync & Settings */}
        {activeTab === 'settings' && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.settingsCard}>
              <View style={styles.settingsRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.settingsLabel}>Auto-Confirm Bookings</Text>
                  <Text style={styles.settingsSubtitle}>Instantly reserve calendar slots without manual review</Text>
                </View>
                <Switch
                  value={autoConfirm}
                  onValueChange={setAutoConfirm}
                  trackColor={{ false: '#cbd5e1', true: '#10b981' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.settingsDivider} />

              <View style={styles.settingsRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.settingsLabel}>Google Calendar 2-Way Sync</Text>
                  <Text style={styles.settingsSubtitle}>Automatically block out busy slots and push new meetings</Text>
                </View>
                <Switch
                  value={googleCalendarSync}
                  onValueChange={setGoogleCalendarSync}
                  trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Appointment Detail Modal */}
      <Modal
        visible={!!selectedBooking}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedBooking(null)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{selectedBooking?.customerName}</Text>
              <Text style={styles.modalSubtitle}>{selectedBooking?.service}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedBooking(null)}
              style={styles.modalCloseBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalCard}>
              <View style={styles.modalFieldRow}>
                <MaterialIcons name="access-time" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.modalFieldText}>{selectedBooking?.time}</Text>
              </View>
              <View style={styles.modalFieldRow}>
                <MaterialIcons name="phone" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.modalFieldText}>{selectedBooking?.phone}</Text>
              </View>
              <View style={styles.modalFieldRow}>
                <MaterialIcons name="place" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <Text style={styles.modalFieldText}>{selectedBooking?.meetingLocation}</Text>
              </View>
            </View>

            {/* Intake Questions & Answers */}
            <Text style={styles.intakeHeading}>Customer Intake Answers</Text>
            <View style={styles.intakeBox}>
              {selectedBooking?.intakeAnswers.map((item, idx) => (
                <View key={idx} style={styles.intakeItem}>
                  <Text style={styles.intakeQuestion}>{item.question}</Text>
                  <Text style={styles.intakeAnswer}>{item.answer}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                onPress={() => handleCall(selectedBooking?.phone || '')}
                style={styles.modalCallBtn}
                activeOpacity={0.7}
              >
                <MaterialIcons name="phone" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.modalCallBtnText}>Call Customer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerRight: {
    width: 36,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  tabItemActive: {
    backgroundColor: '#0f172a',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 12,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookingCustomer: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  bookingService: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 2,
  },
  bookingStatusBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  bookingDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  depositText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  viewIntakeLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  callIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTypeList: {
    gap: 12,
  },
  eventTypeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  evtHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  evtTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  evtDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  evtDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 10,
  },
  evtLinkRow: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  evtLinkText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  settingsSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalScroll: {
    flex: 1,
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalFieldText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  intakeHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  intakeBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    marginBottom: 20,
  },
  intakeItem: {
    gap: 4,
  },
  intakeQuestion: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  intakeAnswer: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  modalActionRow: {
    paddingBottom: 20,
  },
  modalCallBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
  },
  modalCallBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
