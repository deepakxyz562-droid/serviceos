import React, { useState } from 'react';
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
} from 'react-native';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  Share2,
  Copy,
  Video,
  MapPin,
  X,
  CalendarCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from 'lucide-react-native';
import { hapticFeedback } from '@/lib/haptics';

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
    iconColor: '#A855F7',
  },
  {
    id: 'evt-4',
    title: '60-Min Full Assessment',
    duration: '60 min',
    price: 100,
    description: 'Comprehensive audit & deployment review',
    slug: 'assessment-60m',
    iconColor: '#EC4899',
  },
];

const INITIAL_BOOKINGS: BookingItem[] = [
  {
    id: 'b-1',
    customerName: 'Priya Sharma',
    phone: '+15125550143',
    email: 'priya.sharma@example.com',
    service: 'Dental Routine Consultation',
    time: '10:00 AM - 10:30 AM',
    dateKey: 'today',
    duration: '30 min',
    depositPaid: true,
    amount: 35,
    meetingType: 'video',
    meetingLocation: 'meet.google.com/gpt-kons-fms',
    intakeAnswers: [
      { question: 'Primary concern', answer: 'Routine 6-month checkup & sensitivity' },
      { question: 'Previous visit', answer: 'September 2025' },
    ],
    status: 'confirmed',
  },
  {
    id: 'b-2',
    customerName: 'John Smith',
    phone: '+15125550192',
    email: 'john.smith@acpros.io',
    service: 'HVAC Diagnostics & Inspection',
    time: '11:30 AM - 12:15 PM',
    dateKey: 'today',
    duration: '45 min',
    depositPaid: true,
    amount: 50,
    meetingType: 'in_person',
    meetingLocation: '402 Oakridge Ave, Austin, TX',
    intakeAnswers: [
      { question: 'Equipment age', answer: 'Approx 5 years, Lennox XP21' },
      { question: 'Symptom', answer: 'Blowing warm air in afternoon peak hours' },
    ],
    status: 'confirmed',
  },
  {
    id: 'b-3',
    customerName: 'Rahul Verma',
    phone: '+15125550177',
    email: 'rahul@cloudtech.dev',
    service: 'GPTForm Webhook Integration',
    time: '04:15 PM - 05:15 PM',
    dateKey: 'today',
    duration: '60 min',
    depositPaid: false,
    amount: 100,
    meetingType: 'video',
    meetingLocation: 'zoom.us/j/9812480192',
    intakeAnswers: [
      { question: 'Tech stack', answer: 'Next.js 15, Supabase, Stripe' },
      { question: 'Target go-live', answer: 'Within 2 weeks' },
    ],
    status: 'confirmed',
  },
  {
    id: 'b-4',
    customerName: 'Emily Watson',
    phone: '+15125550188',
    email: 'emily.w@designcraft.co',
    service: '30-Min Consultation',
    time: '02:00 PM - 02:30 PM',
    dateKey: 'tomorrow',
    duration: '30 min',
    depositPaid: true,
    amount: 35,
    meetingType: 'video',
    meetingLocation: 'meet.google.com/evt-watson-des',
    intakeAnswers: [
      { question: 'Goals', answer: 'Automating multi-step lead qualification forms' },
    ],
    status: 'confirmed',
  },
  {
    id: 'b-5',
    customerName: 'Carlos Morales',
    phone: '+15125550221',
    email: 'carlos@realtymar.com',
    service: 'Commercial Property Inspection',
    time: '11:00 AM - 12:00 PM',
    dateKey: 'this_week',
    duration: '60 min',
    depositPaid: true,
    amount: 100,
    meetingType: 'in_person',
    meetingLocation: '880 Congress Ave, Suite 400',
    intakeAnswers: [
      { question: 'Property size', answer: '4,500 sq ft office space' },
    ],
    status: 'confirmed',
  },
];

export default function BookingsScreen() {
  const [activeDateTab, setActiveDateTab] = useState<'today' | 'tomorrow' | 'this_week'>('today');
  const [isAcceptingBookings, setIsAcceptingBookings] = useState(true);
  const [blockedUntilTime, setBlockedUntilTime] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const toggleAvailability = async (val: boolean) => {
    await hapticFeedback.medium();
    setIsAcceptingBookings(val);
    if (!val) {
      showToast('Calendar intake paused for today');
    } else {
      showToast('🟢 Now accepting new bookings');
    }
  };

  // Emergency block next 2 hours
  const handleEmergencyBlock = async () => {
    await hapticFeedback.heavy();
    const now = new Date();
    now.setHours(now.getHours() + 2);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setBlockedUntilTime(timeStr);
    showToast(`🚫 Next 2 hours blocked (until ${timeStr})`);
  };

  const clearEmergencyBlock = async () => {
    await hapticFeedback.light();
    setBlockedUntilTime(null);
    showToast('Emergency block cleared. Slots reopened.');
  };

  const handleCall = (phone: string) => {
    hapticFeedback.medium();
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = (phone: string, customerName: string) => {
    hapticFeedback.medium();
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const msg = encodeURIComponent(
      `Hi ${customerName}, following up regarding your upcoming booking with us.`
    );
    Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${msg}`).catch(() => {
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
    });
  };

  const handleShareLink = async (eventType: EventType, method: 'whatsapp' | 'sms' | 'copy' | 'native') => {
    await hapticFeedback.light();
    const bookingUrl = `https://fieseros.com/book?type=${eventType.slug}`;
    const shareText = `Hi! You can book a ${eventType.title} directly on my calendar here: ${bookingUrl}`;

    if (method === 'whatsapp') {
      Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareText)}`).catch(() => {
        Share.share({ message: shareText, url: bookingUrl });
      });
    } else if (method === 'sms') {
      Linking.openURL(`sms:?body=${encodeURIComponent(shareText)}`);
    } else if (method === 'copy' || method === 'native') {
      try {
        await Share.share({
          title: `Book ${eventType.title}`,
          message: shareText,
          url: bookingUrl,
        });
        showToast(`Ready to share ${eventType.title}`);
      } catch (err) {
        // fallback
      }
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Cancel Booking?',
      'The client will be sent an automated cancellation notice via WhatsApp and Email.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await hapticFeedback.heavy();
            setBookings((prev) =>
              prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
            );
            if (selectedBooking?.id === bookingId) {
              setSelectedBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
            }
            showToast('Booking cancelled & client notified');
          },
        },
      ]
    );
  };

  const handleRescheduleBooking = async (bookingId: string) => {
    await hapticFeedback.medium();
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'rescheduled',
              time: 'Rescheduling requested (Client sent link)',
            }
          : b
      )
    );
    if (selectedBooking?.id === bookingId) {
      setSelectedBooking((prev) =>
        prev
          ? {
              ...prev,
              status: 'rescheduled',
              time: 'Rescheduling requested (Client sent link)',
            }
          : null
      );
    }
    showToast('Reschedule invite link sent to client via WhatsApp');
  };

  const currentBookings = bookings.filter((b) => b.dateKey === activeDateTab);
  const todayCount = bookings.filter((b) => b.dateKey === 'today' && b.status !== 'cancelled').length;
  const tomorrowCount = bookings.filter((b) => b.dateKey === 'tomorrow' && b.status !== 'cancelled').length;
  const weekCount = bookings.filter((b) => b.dateKey === 'this_week' && b.status !== 'cancelled').length;

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />

      {/* Floating Action Toast Banner */}
      {toastMessage && (
        <View className="absolute top-14 left-4 right-4 z-50 p-3.5 bg-emerald-500/90 rounded-2xl shadow-xl flex-row items-center justify-between border border-emerald-400">
          <View className="flex-row items-center gap-2">
            <CheckCircle2 size={16} color="#fff" />
            <Text className="text-xs font-bold text-white tracking-wide">{toastMessage}</Text>
          </View>
        </View>
      )}

      <View className="flex-1 px-4 sm:px-6 pt-3">
        {/* Header with Quick Share Trigger */}
        <View className="flex-row items-center justify-between py-2 mb-2">
          <View>
            <Text className="text-2xl font-black text-white tracking-tight">Calendar &amp; Bookings</Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              Calendly-grade scheduling &amp; availability command
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setShareSheetVisible(true);
            }}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 active:bg-purple-500/30"
          >
            <Share2 size={13} color="#C084FC" />
            <Text className="text-xs font-bold text-purple-300">Share Links</Text>
          </TouchableOpacity>
        </View>

        {/* Fast Availability Control Box */}
        <View className="p-4 rounded-3xl bg-slate-900 border border-slate-800 mb-3 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-2">
                <View
                  className={`size-2.5 rounded-full ${
                    isAcceptingBookings ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <Text className="text-xs font-bold text-white">
                  {isAcceptingBookings ? 'Accepting Bookings Today' : 'Schedule Paused Today'}
                </Text>
              </View>
              <Text className="text-[10px] text-slate-400 mt-0.5 ml-4">
                {isAcceptingBookings
                  ? 'AI Agent & website forms can book open slots'
                  : 'All calendar slots blocked from intake'}
              </Text>
            </View>

            <Switch
              value={isAcceptingBookings}
              onValueChange={toggleAvailability}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#fff"
            />
          </View>

          {/* Emergency Block Button */}
          <View className="mt-3 pt-3 border-t border-slate-800/80 flex-row items-center justify-between">
            {blockedUntilTime ? (
              <View className="flex-row items-center justify-between flex-1">
                <View className="flex-row items-center gap-1.5">
                  <ShieldAlert size={14} color="#F59E0B" />
                  <Text className="text-[11px] font-bold text-amber-400">
                    Blocked until {blockedUntilTime}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={clearEmergencyBlock}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700"
                >
                  <Text className="text-[10px] font-bold text-slate-300">Unblock</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleEmergencyBlock}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex-row items-center justify-center gap-2 active:bg-amber-500/20"
              >
                <Clock size={13} color="#F59E0B" />
                <Text className="text-xs font-bold text-amber-400">
                  🚫 Block Next 2 Hours (Emergency / On-Site)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Day Selector Segmented Tabs */}
        <View className="flex-row p-1 rounded-2xl bg-slate-900 border border-slate-800 mb-3">
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setActiveDateTab('today');
            }}
            className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
              activeDateTab === 'today' ? 'bg-slate-800 shadow' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeDateTab === 'today' ? 'text-white' : 'text-slate-400'
              }`}
            >
              Today
            </Text>
            <View className="px-1.5 py-0.5 rounded-full bg-slate-700">
              <Text className="text-[9px] font-black text-slate-300">{todayCount}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setActiveDateTab('tomorrow');
            }}
            className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
              activeDateTab === 'tomorrow' ? 'bg-slate-800 shadow' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeDateTab === 'tomorrow' ? 'text-white' : 'text-slate-400'
              }`}
            >
              Tomorrow
            </Text>
            <View className="px-1.5 py-0.5 rounded-full bg-slate-700">
              <Text className="text-[9px] font-black text-slate-300">{tomorrowCount}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setActiveDateTab('this_week');
            }}
            className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-1.5 ${
              activeDateTab === 'this_week' ? 'bg-slate-800 shadow' : ''
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeDateTab === 'this_week' ? 'text-white' : 'text-slate-400'
              }`}
            >
              This Week
            </Text>
            <View className="px-1.5 py-0.5 rounded-full bg-slate-700">
              <Text className="text-[9px] font-black text-slate-300">{weekCount}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Timeline Scroll Area */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Visual Open Slot (AI Permitted) */}
          {activeDateTab === 'today' && !blockedUntilTime && isAcceptingBookings && (
            <View className="mb-3 p-3 rounded-2xl bg-emerald-500/5 border border-dashed border-emerald-500/30 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <Text className="text-xs font-semibold text-emerald-400">
                  09:00 AM - 09:30 AM • Open Slot
                </Text>
              </View>
              <Text className="text-[10px] text-slate-400">AI Intake Ready</Text>
            </View>
          )}

          {/* Bookings List for Active Tab */}
          {currentBookings.length === 0 ? (
            <View className="p-8 rounded-3xl bg-slate-900 border border-slate-800 items-center justify-center my-6">
              <CalendarCheck size={36} color="#64748B" />
              <Text className="text-sm font-bold text-white mt-3">No Appointments Scheduled</Text>
              <Text className="text-xs text-slate-400 text-center mt-1">
                Share your booking link to let clients schedule instantly into open slots.
              </Text>
              <TouchableOpacity
                onPress={() => setShareSheetVisible(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40"
              >
                <Text className="text-xs font-bold text-purple-300">Share Booking Links</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-3">
              {currentBookings.map((booking) => {
                const isCancelled = booking.status === 'cancelled';
                const isRescheduled = booking.status === 'rescheduled';

                return (
                  <TouchableOpacity
                    key={booking.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      hapticFeedback.light();
                      setSelectedBooking(booking);
                    }}
                    className={`p-4 rounded-3xl bg-slate-900/90 border ${
                      isCancelled
                        ? 'border-red-500/20 opacity-60'
                        : isRescheduled
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-slate-800'
                    } shadow-md space-y-3`}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                        <View className="size-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 items-center justify-center">
                          {booking.meetingType === 'video' ? (
                            <Video size={18} color="#C084FC" />
                          ) : (
                            <MapPin size={18} color="#C084FC" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`text-sm font-bold ${
                              isCancelled ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {booking.customerName}
                          </Text>
                          <Text className="text-xs text-purple-400 font-semibold mt-0.5" numberOfLines={1}>
                            {booking.service}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-xs font-black text-white">{booking.time.split(' - ')[0]}</Text>
                        <Text className="text-[10px] text-slate-400 font-medium">{booking.duration}</Text>
                      </View>
                    </View>

                    {/* Meeting Location / Info */}
                    <View className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                        {booking.meetingType === 'video' ? (
                          <Video size={12} color="#94A3B8" />
                        ) : (
                          <MapPin size={12} color="#94A3B8" />
                        )}
                        <Text className="text-[11px] text-slate-300 font-medium" numberOfLines={1}>
                          {booking.meetingLocation}
                        </Text>
                      </View>
                      <ChevronRight size={13} color="#64748B" />
                    </View>

                    {/* Action Bar & Deposit Status */}
                    <View className="flex-row items-center justify-between pt-2 border-t border-slate-800/80">
                      <View className="flex-row items-center gap-1.5">
                        {booking.depositPaid ? (
                          <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                            <CheckCircle2 size={11} color="#10B981" />
                            <Text className="text-[10px] font-bold text-emerald-400">
                              ${booking.amount} Paid
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                            <AlertCircle size={11} color="#F59E0B" />
                            <Text className="text-[10px] font-bold text-amber-400">Pay on Arrival</Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                          onPress={() => handleWhatsApp(booking.phone, booking.customerName)}
                          className="h-8 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex-row items-center gap-1 active:bg-emerald-500/20"
                        >
                          <MessageCircle size={12} color="#10B981" />
                          <Text className="text-[10px] font-bold text-emerald-400">WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleCall(booking.phone)}
                          className="h-8 px-2.5 rounded-xl bg-slate-800 border border-slate-700 flex-row items-center gap-1 active:bg-slate-700"
                        >
                          <Phone size={12} color="#10B981" />
                          <Text className="text-[10px] font-bold text-slate-200">Call</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Another Visual Open Slot for Afternoon */}
          {activeDateTab === 'today' && !blockedUntilTime && isAcceptingBookings && (
            <View className="mt-3 p-3 rounded-2xl bg-emerald-500/5 border border-dashed border-emerald-500/30 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <Text className="text-xs font-semibold text-emerald-400">
                  02:00 PM - 03:00 PM • Open Slot
                </Text>
              </View>
              <Text className="text-[10px] text-slate-400">AI Intake Ready</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* MODAL 1: Share Booking Links Sheet */}
      <Modal
        visible={shareSheetVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShareSheetVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 max-h-[85%] space-y-4">
            <View className="flex-row items-center justify-between pb-2 border-b border-slate-800">
              <View>
                <Text className="text-lg font-black text-white">Share Booking Links</Text>
                <Text className="text-xs text-slate-400">
                  Send directly to clients via WhatsApp, SMS, or copy link
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShareSheetVisible(false)}
                className="size-8 rounded-full bg-slate-800 items-center justify-center"
              >
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="space-y-3">
              {EVENT_TYPES.map((evt) => (
                <View
                  key={evt.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-2">
                      <Text className="text-sm font-bold text-white">{evt.title}</Text>
                      <Text className="text-xs text-slate-400 mt-0.5">{evt.description}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs font-black text-purple-400">
                        {evt.price === 0 ? 'FREE' : `$${evt.price}`}
                      </Text>
                      <Text className="text-[10px] text-slate-500">{evt.duration}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2 pt-2 border-t border-slate-800/80">
                    <TouchableOpacity
                      onPress={() => handleShareLink(evt, 'whatsapp')}
                      className="flex-1 py-2 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex-row items-center justify-center gap-1 active:bg-emerald-500/20"
                    >
                      <MessageCircle size={12} color="#10B981" />
                      <Text className="text-[11px] font-bold text-emerald-400">WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShareLink(evt, 'sms')}
                      className="flex-1 py-2 px-2 rounded-xl bg-blue-500/10 border border-blue-500/30 flex-row items-center justify-center gap-1 active:bg-blue-500/20"
                    >
                      <Phone size={12} color="#3B82F6" />
                      <Text className="text-[11px] font-bold text-blue-400">SMS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShareLink(evt, 'copy')}
                      className="py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 flex-row items-center justify-center gap-1 active:bg-slate-700"
                    >
                      <Copy size={12} color="#CBD5E1" />
                      <Text className="text-[11px] font-bold text-slate-200">Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Customer Booking Dossier Sheet */}
      <Modal
        visible={!!selectedBooking}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedBooking(null)}
      >
        <View className="flex-1 justify-end bg-black/80">
          <View className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 max-h-[90%] space-y-4">
            {selectedBooking && (
              <>
                {/* Header */}
                <View className="flex-row items-start justify-between pb-3 border-b border-slate-800">
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xl font-black text-white">{selectedBooking.customerName}</Text>
                      {selectedBooking.status === 'confirmed' && (
                        <View className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                          <Text className="text-[9px] font-bold text-emerald-400">CONFIRMED</Text>
                        </View>
                      )}
                      {selectedBooking.status === 'rescheduled' && (
                        <View className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                          <Text className="text-[9px] font-bold text-amber-400">RESCHEDULED</Text>
                        </View>
                      )}
                      {selectedBooking.status === 'cancelled' && (
                        <View className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
                          <Text className="text-[9px] font-bold text-red-400">CANCELLED</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-purple-400 font-semibold mt-0.5">
                      {selectedBooking.service}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedBooking(null)}
                    className="size-8 rounded-full bg-slate-800 items-center justify-center"
                  >
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Date & Location Grid */}
                <View className="grid grid-cols-2 gap-2">
                  <View className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Date &amp; Time
                    </Text>
                    <Text className="text-xs font-bold text-white mt-1">{selectedBooking.time}</Text>
                    <Text className="text-[10px] text-slate-400">{selectedBooking.duration}</Text>
                  </View>

                  <View className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Location / Access
                    </Text>
                    <Text className="text-xs font-bold text-white mt-1" numberOfLines={1}>
                      {selectedBooking.meetingLocation}
                    </Text>
                    <Text className="text-[10px] text-slate-400">
                      {selectedBooking.meetingType === 'video' ? 'Video Meeting' : 'On-Site'}
                    </Text>
                  </View>
                </View>

                {/* Intake Form Answers */}
                <View className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Intake Form Responses
                  </Text>
                  {selectedBooking.intakeAnswers.map((item, idx) => (
                    <View key={idx} className="pb-1">
                      <Text className="text-[11px] font-semibold text-slate-400">{item.question}</Text>
                      <Text className="text-xs font-bold text-white mt-0.5">{item.answer}</Text>
                    </View>
                  ))}
                </View>

                {/* Contact Shortcuts */}
                <View className="flex-row items-center gap-2 pt-1">
                  <TouchableOpacity
                    onPress={() => handleCall(selectedBooking.phone)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 flex-row items-center justify-center gap-1.5 active:bg-slate-700"
                  >
                    <Phone size={14} color="#10B981" />
                    <Text className="text-xs font-bold text-white">Call Client</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleWhatsApp(selectedBooking.phone, selectedBooking.customerName)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex-row items-center justify-center gap-1.5 active:bg-emerald-500/20"
                  >
                    <MessageCircle size={14} color="#10B981" />
                    <Text className="text-xs font-bold text-emerald-400">WhatsApp</Text>
                  </TouchableOpacity>
                </View>

                {/* Reschedule & Cancel Row */}
                {selectedBooking.status !== 'cancelled' && (
                  <View className="flex-row items-center gap-2 pt-1">
                    <TouchableOpacity
                      onPress={() => handleRescheduleBooking(selectedBooking.id)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 flex-row items-center justify-center gap-1.5 active:bg-slate-700"
                    >
                      <RotateCcw size={13} color="#C084FC" />
                      <Text className="text-xs font-bold text-purple-300">Reschedule Link</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCancelBooking(selectedBooking.id)}
                      className="py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-500/30 flex-row items-center justify-center gap-1 active:bg-red-500/20"
                    >
                      <X size={13} color="#EF4444" />
                      <Text className="text-xs font-bold text-red-400">Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
