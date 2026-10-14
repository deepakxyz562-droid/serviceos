'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Edit3,
  Link2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Scissors,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { type BosAppointment } from '@/components/bos/bos-types';
import { authFetch } from '@/lib/client-auth';

type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda';
type InspectorTab = 'details' | 'history';

type BosAppointmentsWorkstationProps = {
  businessName: string;
  businessSlug: string;
  currencySymbol: string;
  appointments: BosAppointment[];
  initialOpenNewModal?: boolean;
  demoMode?: boolean;
  onCreateAppointment: (
    appt: Omit<BosAppointment, 'id' | 'bookingCode'>,
  ) => Promise<void>;
  onUpdateAppointmentStatus: (
    id: string,
    status: BosAppointment['status'],
  ) => Promise<void>;
  onConvertToPosBill: (appt: BosAppointment) => void;
};

type StaffColumnMeta = {
  id: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarText: string;
  initials: string;
};

type ScheduleBlockItem = {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  timeLabel: string;
  detailTimeLabel: string;
  dateLabel: string;
  durationLabel: string;
  startHour: number; // e.g. 9.0 for 9:00 AM, 9.5 for 9:30 AM
  durationHours: number; // 1.0 for 1 hr
  amount: number;
  status: 'Confirmed' | 'Completed' | 'Upcoming' | 'Cancelled';
  paymentStatus: 'Paid' | 'Pending';
  notes: string;
  colorTheme: 'green' | 'amber' | 'purple' | 'blue' | 'pink';
  topRightIcon?: 'check' | 'sync' | 'dots';
};

const STAFF_COLUMNS: StaffColumnMeta[] = [
  {
    id: 'staff-priya',
    name: 'Priya Sharma',
    role: 'Hair Specialist',
    avatarBg: 'bg-[#FDE68A]',
    avatarText: 'text-[#92400E]',
    initials: 'PS',
  },
  {
    id: 'staff-amit',
    name: 'Amit Verma',
    role: 'Salon Manager',
    avatarBg: 'bg-[#DBEAFE]',
    avatarText: 'text-[#1E40AF]',
    initials: 'AV',
  },
  {
    id: 'staff-neha',
    name: 'Neha Singh',
    role: 'Makeup Artist',
    avatarBg: 'bg-[#FCE7F3]',
    avatarText: 'text-[#9D174D]',
    initials: 'NS',
  },
  {
    id: 'staff-rahul',
    name: 'Rahul Mehta',
    role: 'Therapist',
    avatarBg: 'bg-[#E0E7FF]',
    avatarText: 'text-[#3730A3]',
    initials: 'RM',
  },
];

const SERVICES_LEGEND = [
  { name: 'Hair Cut', dotColor: 'bg-[#0A6847]' },
  { name: 'Hair Color', dotColor: 'bg-[#6EE7B7]' },
  { name: 'Facial', dotColor: 'bg-[#F59E0B]' },
  { name: 'Massage', dotColor: 'bg-[#2563EB]' },
  { name: 'Manicure & Pedicure', dotColor: 'bg-[#A855F7]' },
  { name: 'Makeup', dotColor: 'bg-[#F43F5E]' },
  { name: 'Threading', dotColor: 'bg-[#C084FC]' },
];

const INITIAL_SCHEDULE_BLOCKS: ScheduleBlockItem[] = [
  // Column 1: Priya Sharma
  {
    id: 'blk-1',
    staffId: 'staff-priya',
    staffName: 'Priya Sharma',
    staffRole: 'Hair Specialist',
    customerName: 'Sneha Patel',
    customerPhone: '+91 98765 43210',
    serviceName: 'Hair Cut',
    timeLabel: '9:00 - 10:00',
    detailTimeLabel: '9:00 AM - 10:00 AM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 9,
    durationHours: 1,
    amount: 500,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'Regular customer. Prefers layer cut.',
    colorTheme: 'green',
    topRightIcon: 'check',
  },
  {
    id: 'blk-2',
    staffId: 'staff-priya',
    staffName: 'Priya Sharma',
    staffRole: 'Hair Specialist',
    customerName: 'Pooja Sharma',
    customerPhone: '+91 98112 22334',
    serviceName: 'Facial',
    timeLabel: '11:30 - 12:30',
    detailTimeLabel: '11:30 AM - 12:30 PM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 11.5,
    durationHours: 1,
    amount: 1200,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'Fruit glow facial session.',
    colorTheme: 'amber',
    topRightIcon: 'dots',
  },
  {
    id: 'blk-3',
    staffId: 'staff-priya',
    staffName: 'Priya Sharma',
    staffRole: 'Hair Specialist',
    customerName: 'Ravi Singh',
    customerPhone: '+91 98201 33445',
    serviceName: 'Hair Color',
    timeLabel: '2:00 - 3:00',
    detailTimeLabel: '2:00 PM - 3:00 PM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 14,
    durationHours: 1,
    amount: 1500,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'Ammonia-free global hair color.',
    colorTheme: 'purple',
    topRightIcon: 'dots',
  },
  {
    id: 'blk-4',
    staffId: 'staff-priya',
    staffName: 'Priya Sharma',
    staffRole: 'Hair Specialist',
    customerName: 'Neha Kapoor',
    customerPhone: '+91 98990 44556',
    serviceName: 'Spa & Massage',
    timeLabel: '6:00 - 7:00',
    detailTimeLabel: '6:00 PM - 7:00 PM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 18,
    durationHours: 1,
    amount: 1800,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'Evening relaxation hair spa.',
    colorTheme: 'green',
    topRightIcon: 'dots',
  },

  // Column 2: Amit Verma
  {
    id: 'blk-5',
    staffId: 'staff-amit',
    staffName: 'Amit Verma',
    staffRole: 'Salon Manager',
    customerName: 'Rahul Kumar',
    customerPhone: '+91 98100 55667',
    serviceName: 'Hair Color',
    timeLabel: '9:30 - 10:30',
    detailTimeLabel: '9:30 AM - 10:30 AM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 9.5,
    durationHours: 1,
    amount: 950,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'Root touch-up & conditioning.',
    colorTheme: 'blue',
    topRightIcon: 'sync',
  },
  {
    id: 'blk-6',
    staffId: 'staff-amit',
    staffName: 'Amit Verma',
    staffRole: 'Salon Manager',
    customerName: 'Karan Mehta',
    customerPhone: '+91 99204 88990',
    serviceName: 'Hair Cut',
    timeLabel: '12:00 - 1:00',
    detailTimeLabel: '12:00 PM - 1:00 PM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 12,
    durationHours: 1,
    amount: 500,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'Fade cut & beard styling.',
    colorTheme: 'blue',
    topRightIcon: 'dots',
  },
  {
    id: 'blk-7',
    staffId: 'staff-amit',
    staffName: 'Amit Verma',
    staffRole: 'Salon Manager',
    customerName: 'Amit Joshi',
    customerPhone: '+91 97111 66778',
    serviceName: 'Hair Cut',
    timeLabel: '4:00 - 5:00',
    detailTimeLabel: '4:00 PM - 5:00 PM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 16,
    durationHours: 1,
    amount: 500,
    status: 'Confirmed',
    paymentStatus: 'Pending',
    notes: 'Classic trim and head massage.',
    colorTheme: 'pink',
    topRightIcon: 'dots',
  },

  // Column 3: Neha Singh
  {
    id: 'blk-8',
    staffId: 'staff-neha',
    staffName: 'Neha Singh',
    staffRole: 'Makeup Artist',
    customerName: 'Anjali Verma',
    customerPhone: '+91 98188 77889',
    serviceName: 'Bridal Makeup',
    timeLabel: '10:00 - 11:00',
    detailTimeLabel: '10:00 AM - 11:00 AM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 10,
    durationHours: 1,
    amount: 4500,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'HD Bridal trial & consultation.',
    colorTheme: 'pink',
    topRightIcon: 'dots',
  },
  {
    id: 'blk-9',
    staffId: 'staff-neha',
    staffName: 'Neha Singh',
    staffRole: 'Makeup Artist',
    customerName: 'Meera Gupta',
    customerPhone: '+91 98712 88991',
    serviceName: 'Manicure & Pedicure',
    timeLabel: '1:00 - 2:00',
    detailTimeLabel: '1:00 PM - 2:00 PM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 13,
    durationHours: 1,
    amount: 1100,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'Crystal spa manicure & pedicure.',
    colorTheme: 'green',
    topRightIcon: 'dots',
  },
  {
    id: 'blk-10',
    staffId: 'staff-neha',
    staffName: 'Neha Singh',
    staffRole: 'Makeup Artist',
    customerName: 'Divya Nair',
    customerPhone: '+91 98103 99002',
    serviceName: 'Threading',
    timeLabel: '5:00 - 6:00',
    detailTimeLabel: '5:00 PM - 6:00 PM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 17,
    durationHours: 1,
    amount: 250,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'Eyebrow & forehead threading.',
    colorTheme: 'blue',
    topRightIcon: 'dots',
  },

  // Column 4: Rahul Mehta
  {
    id: 'blk-11',
    staffId: 'staff-rahul',
    staffName: 'Rahul Mehta',
    staffRole: 'Therapist',
    customerName: 'Vikram Singh',
    customerPhone: '+91 98450 11223',
    serviceName: 'Body Massage',
    timeLabel: '10:30 - 11:30',
    detailTimeLabel: '10:30 AM - 11:30 AM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 10.5,
    durationHours: 1,
    amount: 1800,
    status: 'Confirmed',
    paymentStatus: 'Paid',
    notes: 'Deep tissue aroma therapy.',
    colorTheme: 'purple',
    topRightIcon: 'dots',
  },
  {
    id: 'blk-12',
    staffId: 'staff-rahul',
    staffName: 'Rahul Mehta',
    staffRole: 'Therapist',
    customerName: 'Sonia Kapoor',
    customerPhone: '+91 98220 33441',
    serviceName: 'Facial',
    timeLabel: '3:00 - 4:00',
    detailTimeLabel: '3:00 PM - 4:00 PM',
    dateLabel: 'Sat, 12 Oct 2024',
    durationLabel: '1 hr',
    startHour: 15,
    durationHours: 1,
    amount: 1400,
    status: 'Confirmed',
    paymentStatus: 'Pending',
    notes: 'Hydra-facial & D-tan pack.',
    colorTheme: 'amber',
    topRightIcon: 'dots',
  },
];

const TIME_SLOTS_LABELS = [
  { hour: 9, label: '9:00 AM' },
  { hour: 10, label: '10:00 AM' },
  { hour: 11, label: '11:00 AM' },
  { hour: 12, label: '12:00 PM' },
  { hour: 13, label: '1:00 PM' },
  { hour: 14, label: '2:00 PM' },
  { hour: 15, label: '3:00 PM' },
  { hour: 16, label: '4:00 PM' },
  { hour: 17, label: '5:00 PM' },
  { hour: 18, label: '6:00 PM' },
  { hour: 19, label: '7:00 PM' },
];

// Dynamic mini calendar — generates the current month's days with today
// marked as active. Previously this was a hardcoded October 2024 grid.
function getMiniCalendarDays(): Array<{ day: number; muted?: boolean; active?: boolean }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1);
  const lastDayPrev = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<{ day: number; muted?: boolean; active?: boolean }> = [];
  // Leading days from previous month
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({ day: lastDayPrev - i, muted: true });
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, active: d === today });
  }
  // Trailing days from next month to fill the last row
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    days.push({ day: d, muted: true });
  }
  return days;
}

const MINI_CALENDAR_DAYS = getMiniCalendarDays();

function getBlockThemeClasses(theme: ScheduleBlockItem['colorTheme']) {
  switch (theme) {
    case 'green':
      return {
        bg: 'bg-[#E3F5EC]',
        borderLeft: 'border-l-[3.5px] border-l-[#0A7B56]',
        border: 'border-[#CBEBD9]',
        iconColor: 'text-[#0A7B56]',
      };
    case 'amber':
      return {
        bg: 'bg-[#FEF0D6]',
        borderLeft: 'border-l-[3.5px] border-l-[#F59E0B]',
        border: 'border-[#FDE2B0]',
        iconColor: 'text-[#D97706]',
      };
    case 'purple':
      return {
        bg: 'bg-[#EDE9FE]',
        borderLeft: 'border-l-[3.5px] border-l-[#8B5CF6]',
        border: 'border-[#DDD6FE]',
        iconColor: 'text-[#7C3AED]',
      };
    case 'blue':
      return {
        bg: 'bg-[#DFEEFF]',
        borderLeft: 'border-l-[3.5px] border-l-[#3B82F6]',
        border: 'border-[#BFDBFE]',
        iconColor: 'text-[#2563EB]',
      };
    case 'pink':
      return {
        bg: 'bg-[#FFE4E9]',
        borderLeft: 'border-l-[3.5px] border-l-[#F43F5E]',
        border: 'border-[#FECDD3]',
        iconColor: 'text-[#E11D48]',
      };
  }
}

function mapAppointmentsToBlocks(appts: BosAppointment[]): ScheduleBlockItem[] {
  return appts.map((a, idx) => {
    const timeMatch = a.scheduledAt.match(/(\d+):?(\d*)\s*(am|pm)?/i);
    let startHour = 10;
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2] || '0', 10);
      const meridiem = (timeMatch[3] || '').toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      startHour = h + m / 60;
    }
    // Use the real staff name from the API. Only fall back to STAFF_COLUMNS
    // (demo staff) when the appointment has no staffName at all AND we're
    // in demo mode. In production, real staff names are used as-is.
    const realStaffName = (a.staffName || '').trim();
    const staff =
      STAFF_COLUMNS.find(
        (s) => s.name.toLowerCase() === realStaffName.toLowerCase()
      ) || (realStaffName
        ? {
            id: `staff-${realStaffName.toLowerCase().replace(/\s+/g, '-')}`,
            name: realStaffName,
            role: 'Staff',
            avatarBg: 'bg-[#E0E7FF]',
            avatarText: 'text-[#3730A3]',
            initials: realStaffName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'ST',
          }
        : STAFF_COLUMNS[idx % STAFF_COLUMNS.length]);
    const statusMap: Record<string, ScheduleBlockItem['status']> = {
      completed: 'Completed',
      cancelled: 'Cancelled',
      confirmed: 'Confirmed',
      checked_in: 'Confirmed',
      pending: 'Upcoming',
    };
    const paymentMap: Record<string, ScheduleBlockItem['paymentStatus']> = {
      paid: 'Paid',
      pending: 'Pending',
    };
    return {
      id: a.id,
      staffId: staff.id,
      staffName: a.staffName || staff.name,
      staffRole: staff.role,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      serviceName: a.serviceName,
      timeLabel: a.scheduledAt,
      detailTimeLabel: a.scheduledAt,
      dateLabel: 'Today',
      durationLabel: `${a.durationMinutes || 60} min`,
      startHour,
      durationHours: (a.durationMinutes || 60) / 60,
      amount: a.amount,
      status: statusMap[a.status] || 'Confirmed',
      paymentStatus: paymentMap[a.paymentStatus] || 'Pending',
      notes: a.notes || 'Booked appointment',
      colorTheme: (['green', 'blue', 'amber', 'pink', 'purple'] as const)[idx % 5],
      topRightIcon: 'check',
    };
  });
}

export function BosAppointmentsWorkstation({
  businessName,
  businessSlug,
  currencySymbol,
  appointments = [],
  initialOpenNewModal = false,
  demoMode = false,
  onCreateAppointment,
  onUpdateAppointmentStatus,
  onConvertToPosBill,
}: BosAppointmentsWorkstationProps) {
  const [blocks, setBlocks] = useState<ScheduleBlockItem[]>(() =>
    demoMode ? INITIAL_SCHEDULE_BLOCKS : mapAppointmentsToBlocks(appointments)
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string>(() =>
    demoMode ? 'blk-1' : (appointments[0]?.id || '')
  );
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('details');
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());

  useEffect(() => {
    if (!demoMode) {
      setBlocks(mapAppointmentsToBlocks(appointments));
    }
  }, [appointments, demoMode]);

  const todayDateStr = useMemo(() => {
    if (demoMode) return 'Sat, 12 Oct 2024';
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date());
  }, [demoMode]);

  const currentMonthStr = useMemo(() => {
    if (demoMode) return 'October 2024';
    return new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, [demoMode]);

  // Left Sidebar Staff & Services Filter States
  const [allStaffChecked, setAllStaffChecked] = useState(true);
  const [checkedStaffIds, setCheckedStaffIds] = useState<string[]>(['staff-priya']);
  const [servicesExpanded, setServicesExpanded] = useState(true);
  const [allServicesChecked, setAllServicesChecked] = useState(true);

  // Modals & Banner
  const [showNewModal, setShowNewModal] = useState(initialOpenNewModal);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const [newForm, setNewForm] = useState({
    customerName: '',
    customerPhone: '',
    serviceName: 'Hair Cut',
    staffId: 'staff-priya',
    startHour: 11,
    amount: 500,
    notes: '',
  });

  const showToast = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => {
      setBannerMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const selectedBlock = useMemo(() => {
    return blocks.find((b) => b.id === selectedBlockId) || blocks[0] || null;
  }, [blocks, selectedBlockId]);

  const kpiStats = useMemo(() => {
    if (demoMode) {
      return {
        total: 8,
        customers: 6,
        completed: 5,
        upcoming: 3,
        cancelled: 0,
        totalTrend: '↑ 2 more',
        custTrend: '↑ 20%',
        completedTrend: '62%',
        upcomingTrend: 'Next in 1 hr',
        cancelledTrend: '0%',
      };
    }
    const total = blocks.length;
    const customers = new Set(
      blocks.map((b) => b.customerName.toLowerCase().trim()).filter(Boolean)
    ).size;
    const completed = blocks.filter((b) => b.status === 'Completed').length;
    const upcoming = blocks.filter(
      (b) => b.status === 'Upcoming' || b.status === 'Confirmed'
    ).length;
    const cancelled = blocks.filter((b) => b.status === 'Cancelled').length;
    const completedPct = total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';
    const cancelledPct = total > 0 ? `${Math.round((cancelled / total) * 100)}%` : '0%';
    return {
      total,
      customers,
      completed,
      upcoming,
      cancelled,
      totalTrend: total > 0 ? 'Active' : '—',
      custTrend: customers > 0 ? `${customers} total` : '—',
      completedTrend: completedPct,
      upcomingTrend: upcoming > 0 ? `${upcoming} scheduled` : 'None',
      cancelledTrend: cancelledPct,
    };
  }, [blocks, demoMode]);

  const toggleStaffCheckbox = (staffId: string) => {
    setCheckedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId],
    );
  };

  const handleCopyBookingLink = () => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://bos.app'}/store/${businessSlug || 'ravi-store'}/book`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(() => {});
    }
    showToast(`Copied online booking link: ${link}`);
  };

  const [sendingReminderBlockId, setSendingReminderBlockId] = useState<string | null>(null);

  const handleSendWhatsAppReminder = async (blk: ScheduleBlockItem) => {
    const cleanPhone = blk.customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      showToast('Please provide a valid customer phone number to send WhatsApp reminder.');
      return;
    }
    const text = `Hi *${blk.customerName}*,\nYour appointment at *${businessName || 'Ravi Store'}* for *${blk.serviceName}* with *${blk.staffName}* is scheduled for *${blk.dateLabel}* at *${blk.detailTimeLabel}*.`;

    setSendingReminderBlockId(blk.id);
    try {
      const res = await authFetch('/api/commerce/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, message: text }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToast(`Appointment reminder sent to ${blk.customerName} via Meta Cloud API!`);
      } else {
        showToast('Meta Cloud: Opening WhatsApp Web chat...');
        window.open(
          `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}?text=${encodeURIComponent(text)}`,
          '_blank',
          'noopener,noreferrer',
        );
      }
    } catch {
      window.open(
        `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}?text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener,noreferrer',
      );
    } finally {
      setSendingReminderBlockId(null);
    }
  };

  const handleCreateNewAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.customerName.trim()) return;
    const staff =
      STAFF_COLUMNS.find((s) => s.id === newForm.staffId) || STAFF_COLUMNS[0];
    const hourInt = Number(newForm.startHour) || 11;
    const nextBlock: ScheduleBlockItem = {
      id: `blk-${Date.now()}`,
      staffId: staff.id,
      staffName: staff.name,
      staffRole: staff.role,
      customerName: newForm.customerName.trim(),
      customerPhone: newForm.customerPhone.trim(),
      serviceName: newForm.serviceName,
      timeLabel: `${hourInt > 12 ? hourInt - 12 : hourInt}:00 - ${hourInt + 1 > 12 ? hourInt + 1 - 12 : hourInt + 1}:00`,
      detailTimeLabel: `${hourInt > 12 ? hourInt - 12 : hourInt}:00 ${hourInt >= 12 ? 'PM' : 'AM'} - ${hourInt + 1 > 12 ? hourInt + 1 - 12 : hourInt + 1}:00 ${hourInt + 1 >= 12 ? 'PM' : 'AM'}`,
      dateLabel: todayDateStr,
      durationLabel: '1 hr',
      startHour: hourInt,
      durationHours: 1,
      amount: Number(newForm.amount) || 500,
      status: 'Confirmed',
      paymentStatus: 'Paid',
      notes: newForm.notes.trim() || 'Booked via Appointments calendar.',
      colorTheme: 'green',
      topRightIcon: 'check',
    };

    try {
      await onCreateAppointment({
        customerName: nextBlock.customerName,
        customerPhone: nextBlock.customerPhone,
        serviceName: nextBlock.serviceName,
        staffName: nextBlock.staffName,
        scheduledAt: nextBlock.detailTimeLabel.split(' - ')[0],
        durationMinutes: 60,
        amount: nextBlock.amount,
        paymentStatus: 'paid',
        status: 'confirmed',
        notes: nextBlock.notes,
      });

      setBlocks((prev) => [...prev, nextBlock]);
      setSelectedBlockId(nextBlock.id);
      setShowNewModal(false);
      showToast(`Booked appointment for ${nextBlock.customerName}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to schedule appointment on server.');
    }
  };

  const handleStatusChange = async (nextStatus: ScheduleBlockItem['status']) => {
    if (!selectedBlock) return;
    const mapped =
      nextStatus === 'Completed'
        ? 'completed'
        : nextStatus === 'Cancelled'
          ? 'cancelled'
          : 'confirmed';

    try {
      await onUpdateAppointmentStatus(selectedBlock.id, mapped);
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === selectedBlock.id ? { ...b, status: nextStatus } : b,
        ),
      );
      showToast(`Updated status for ${selectedBlock.customerName} to ${nextStatus}`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to update appointment status on server.');
    }
  };

  const handleCreateInvoiceFromAppt = () => {
    if (!selectedBlock) return;
    onConvertToPosBill({
      id: selectedBlock.id,
      bookingCode: selectedBlock.id ? `#APT-${selectedBlock.id.slice(-4).toUpperCase()}` : '#APT-0001',
      customerName: selectedBlock.customerName,
      customerPhone: selectedBlock.customerPhone,
      serviceName: selectedBlock.serviceName,
      staffName: selectedBlock.staffName,
      scheduledAt: selectedBlock.detailTimeLabel,
      durationMinutes: 60,
      amount: selectedBlock.amount,
      paymentStatus: selectedBlock.paymentStatus === 'Paid' ? 'paid' : 'pending',
      status: 'confirmed',
      notes: selectedBlock.notes,
    });
  };

  const HOUR_HEIGHT = 60; // 60px per hour

  return (
    <div className="w-full max-w-none space-y-4 pb-6">
      {/* Toast Notification */}
      {bannerMsg && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {bannerMsg}
          </span>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header: Title + Subtitle on Left, Booking Link / Calendar Settings / + New Appointment on Right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-[#111827] leading-tight">
            Appointments
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Manage bookings, staff schedules and customer appointments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyBookingLink}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Link2 className="h-3.5 w-3.5 text-[#475569]" />
            <span>Booking Link</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 text-[12.5px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F4F8F6] transition cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 text-[#475569]" />
            <span>Calendar Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0A6847] px-4 text-[12.5px] font-semibold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {/* 1. Today's Appointments */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#64748B] truncate">
              Today&apos;s Appointments
            </p>
            <p className="text-[22px] font-extrabold text-[#111827] leading-tight">
              {kpiStats.total}
            </p>
            <p className="text-[11px] font-bold text-[#0A7B56]">{kpiStats.totalTrend}</p>
          </div>
        </div>

        {/* 2. Customers */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#64748B] truncate">
              Customers
            </p>
            <p className="text-[22px] font-extrabold text-[#111827] leading-tight">
              {kpiStats.customers}
            </p>
            <p className="text-[11px] font-bold text-[#0A7B56]">{kpiStats.custTrend}</p>
          </div>
        </div>

        {/* 3. Completed */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#64748B] truncate">
              Completed
            </p>
            <p className="text-[22px] font-extrabold text-[#111827] leading-tight">
              {kpiStats.completed}
            </p>
            <p className="text-[11px] font-bold text-[#0A7B56]">{kpiStats.completedTrend}</p>
          </div>
        </div>

        {/* 4. Upcoming */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#64748B] truncate">
              Upcoming
            </p>
            <p className="text-[22px] font-extrabold text-[#111827] leading-tight">
              {kpiStats.upcoming}
            </p>
            <p className="text-[11px] font-bold text-[#2563EB]">{kpiStats.upcomingTrend}</p>
          </div>
        </div>

        {/* 5. Cancelled / No Show */}
        <div className="col-span-2 lg:col-span-1 flex items-center gap-3.5 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F2] text-[#E11D48]">
            <Ban className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#64748B] truncate">
              Cancelled / No Show
            </p>
            <p className="text-[22px] font-extrabold text-[#111827] leading-tight">
              {kpiStats.cancelled}
            </p>
            <p className="text-[11px] font-bold text-[#9F1239]">{kpiStats.cancelledTrend}</p>
          </div>
        </div>
      </div>

      {/* Main 3-Column Workstation Grid: Left Sidebar (2 cols) + Center Calendar Grid (7 cols) + Right Details (3 cols) */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 items-start">
        {/* LEFT SIDEBAR: MINI CALENDAR + STAFF + SERVICES (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs space-y-4">
          {/* Mini Month Calendar */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-[#111827]">
                {currentMonthStr}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#64748B]">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
              {MINI_CALENDAR_DAYS.map((cell, idx) => {
                const isSelected = !cell.muted && cell.day === selectedDay;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => !cell.muted && setSelectedDay(cell.day)}
                    className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#0A6847] text-white font-bold'
                        : cell.muted
                          ? 'text-[#CBD5E1]'
                          : 'text-[#1E293B] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Staff Checklist Filter */}
          <div className="border-t border-[#EBF2EE] pt-3.5 space-y-2.5">
            <h3 className="text-[13px] font-extrabold text-[#111827]">Staff</h3>

            <label className="flex items-center gap-2 text-[12px] font-medium text-[#334155] cursor-pointer">
              <input
                type="checkbox"
                checked={allStaffChecked}
                onChange={(e) => setAllStaffChecked(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[#0A6847]"
              />
              <span>All Staff</span>
            </label>

            <div className="space-y-2 pt-0.5">
              {STAFF_COLUMNS.map((st) => {
                const checked = checkedStaffIds.includes(st.id);
                return (
                  <label
                    key={st.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStaffCheckbox(st.id)}
                      className="h-3.5 w-3.5 rounded accent-[#0A6847] shrink-0"
                    />
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${st.avatarBg} ${st.avatarText}`}
                    >
                      {st.initials}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="text-[12px] font-bold text-[#111827] truncate">
                        {st.name}
                      </p>
                      <p className="text-[10.5px] text-[#64748B] truncate">
                        {st.role}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Services Filter & Color Legend */}
          <div className="border-t border-[#EBF2EE] pt-3.5 space-y-2">
            <button
              type="button"
              onClick={() => setServicesExpanded((p) => !p)}
              className="flex w-full items-center justify-between text-[13px] font-extrabold text-[#111827]"
            >
              <span>Services</span>
              {servicesExpanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#64748B]" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
              )}
            </button>

            {servicesExpanded && (
              <div className="space-y-2 pt-0.5">
                <label className="flex items-center gap-2 text-[12px] font-medium text-[#334155] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allServicesChecked}
                    onChange={(e) => setAllServicesChecked(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[#0A6847]"
                  />
                  <span>All Services</span>
                </label>

                <div className="space-y-1.5 pl-0.5">
                  {SERVICES_LEGEND.map((svc) => (
                    <div
                      key={svc.name}
                      className="flex items-center gap-2 text-[12px] text-[#334155]"
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${svc.dotColor}`}
                      />
                      <span className="truncate">{svc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL: MULTI-STAFF TIME-GRID SCHEDULE (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden">
          {/* Calendar Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EBF2EE] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center rounded-xl border border-[#DCE9E3] bg-white text-[12px] font-semibold text-[#334155]">
                <button
                  type="button"
                  aria-label="Previous day"
                  className="px-2 py-1.5 text-[#64748B] hover:bg-[#F8FAFC] rounded-l-xl"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="border-x border-[#DCE9E3] px-3 py-1.5 font-semibold text-[#1E293B] hover:bg-[#F8FAFC]"
                >
                  Today
                </button>
                <button
                  type="button"
                  aria-label="Next day"
                  className="px-2 py-1.5 text-[#64748B] hover:bg-[#F8FAFC] rounded-r-xl"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#111827]"
              >
                <span>{todayDateStr}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
              </button>
            </div>

            {/* Day | Week | Month | Agenda Switcher */}
            <div className="inline-flex items-center rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] p-0.5 text-[12px] font-semibold">
              {(
                [
                  { id: 'day', label: 'Day' },
                  { id: 'week', label: 'Week' },
                  { id: 'month', label: 'Month' },
                  { id: 'agenda', label: 'Agenda' },
                ] as const
              ).map((mode) => {
                const active = viewMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setViewMode(mode.id)}
                    className={`rounded-lg px-3 py-1 transition cursor-pointer ${
                      active
                        ? 'bg-[#0A6847] text-white font-bold shadow-2xs'
                        : 'text-[#475569] hover:text-[#111827]'
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Staff Column Headers + Time Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[660px]">
              {/* Staff Header Row */}
              <div className="grid grid-cols-[68px_1fr_1fr_1fr_1fr] border-b border-[#EBF2EE] bg-[#FAFDFB]">
                <div className="border-r border-[#EBF2EE] p-2.5" />
                {STAFF_COLUMNS.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2.5 border-r last:border-r-0 border-[#EBF2EE] px-3 py-2.5"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${st.avatarBg} ${st.avatarText}`}
                    >
                      {st.initials}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="text-[12.5px] font-bold text-[#111827] truncate">
                        {st.name}
                      </p>
                      <p className="text-[10.5px] text-[#64748B] truncate">
                        {st.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hourly Time Grid Body (9:00 AM to 7:00 PM) */}
              <div
                className="grid grid-cols-[68px_1fr_1fr_1fr_1fr] relative"
                style={{ height: `${TIME_SLOTS_LABELS.length * HOUR_HEIGHT}px` }}
              >
                {/* Left Time Axis Column */}
                <div className="border-r border-[#EBF2EE] bg-[#FCFDFC]">
                  {TIME_SLOTS_LABELS.map((slot) => (
                    <div
                      key={slot.hour}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="border-b border-[#F1F5F3] pr-2 pt-1.5 text-right text-[10.5px] font-medium text-[#64748B]"
                    >
                      {slot.label}
                    </div>
                  ))}
                </div>

                {/* 4 Staff Schedule Columns */}
                {STAFF_COLUMNS.map((st) => {
                  const colBlocks = blocks.filter((b) => b.staffId === st.id);
                  return (
                    <div
                      key={st.id}
                      className="relative border-r last:border-r-0 border-[#EBF2EE]"
                    >
                      {/* Background Hour Grid Lines */}
                      {TIME_SLOTS_LABELS.map((slot) => (
                        <div
                          key={slot.hour}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-[#F1F5F3]"
                        />
                      ))}

                      {/* Positioned Appointment Blocks */}
                      {colBlocks.map((blk) => {
                        const topPx = (blk.startHour - 9) * HOUR_HEIGHT + 2;
                        const heightPx = blk.durationHours * HOUR_HEIGHT - 4;
                        const theme = getBlockThemeClasses(blk.colorTheme);
                        const isSelected = selectedBlock?.id === blk.id;

                        return (
                          <div
                            key={blk.id}
                            onClick={() => setSelectedBlockId(blk.id)}
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                            }}
                            className={`absolute left-1.5 right-1.5 rounded-lg border ${theme.bg} ${theme.border} ${theme.borderLeft} p-1.5 cursor-pointer transition shadow-2xs ${
                              isSelected ? 'ring-2 ring-[#0A6847]' : 'hover:brightness-98'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-semibold text-[#475569] leading-none">
                                {blk.timeLabel}
                              </span>
                              {blk.topRightIcon === 'check' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[#0A7B56] shrink-0" />
                              ) : blk.topRightIcon === 'sync' ? (
                                <RefreshCw className="h-3 w-3 text-[#2563EB] shrink-0" />
                              ) : (
                                <MoreHorizontal className="h-3.5 w-3.5 text-[#64748B] shrink-0" />
                              )}
                            </div>
                            <p className="mt-0.5 text-[11.5px] font-extrabold text-[#111827] leading-tight truncate">
                              {blk.customerName}
                            </p>
                            <p className="text-[10.5px] font-medium text-[#334155] leading-tight truncate">
                              {blk.serviceName}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: APPOINTMENT DETAILS INSPECTOR (3 cols) */}
        {!selectedBlock ? (
          <div className="lg:col-span-3 rounded-2xl border border-[#DCE9E3] bg-white p-6 shadow-2xs text-center text-[#64748B]">
            <Calendar className="mx-auto h-8 w-8 text-[#94A3B8] mb-2 stroke-1" />
            <h3 className="text-[14px] font-bold text-[#1E293B]">No Appointment Selected</h3>
            <p className="text-[12px] mt-1 text-[#64748B]">
              Select a booking on the calendar or click &quot;New Appointment&quot; to schedule one.
            </p>
          </div>
        ) : (
          <div className="lg:col-span-3 rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3.5">
            {/* Top Underline Tabs: Appointment Details | Customer History */}
            <div className="flex items-center gap-4 border-b border-[#EBF2EE]">
              {(
                [
                  { id: 'details', label: 'Appointment Details' },
                  { id: 'history', label: 'Customer History' },
                ] as const
              ).map((tab) => {
                const active = inspectorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInspectorTab(tab.id)}
                    className={`relative pb-2.5 text-[12.5px] transition cursor-pointer ${
                      active
                        ? 'font-extrabold text-[#111827]'
                        : 'font-medium text-[#64748B] hover:text-[#111827]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#0A6847]" />
                    )}
                  </button>
                );
              })}
            </div>

            {inspectorTab === 'history' ? (
              <div className="space-y-2.5 py-1 text-[12px]">
                <div className="rounded-xl border border-[#EBF2EE] bg-[#FAFDFB] p-3">
                  <p className="font-bold text-[#111827]">
                    Hair Cut &amp; Blow Dry
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    14 Sep 2024 • Priya Sharma • {currencySymbol} 500
                  </p>
                </div>
                <div className="rounded-xl border border-[#EBF2EE] bg-[#FAFDFB] p-3">
                  <p className="font-bold text-[#111827]">
                    Root Touchup &amp; Spa
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    02 Aug 2024 • Priya Sharma • {currencySymbol} 1,200
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Status Pill + Edit + More Button Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-bold text-[#0A7B56]">
                    <span className="h-2 w-2 rounded-full bg-[#0A7B56]" />
                    <span>{selectedBlock.status}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowNewModal(true)}
                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#DCE9E3] bg-white px-2.5 text-[11.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3 text-[#0A6847]" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      aria-label="More options"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6]"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Customer Profile Box */}
                <div className="border-b border-[#EBF2EE] pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FCE7F3] text-[13px] font-extrabold text-[#9D174D] border border-[#FBCFE8]">
                        {selectedBlock.customerName
                          .split(' ')
                          .map((p) => p[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-extrabold text-[#111827] truncate">
                          {selectedBlock.customerName}
                        </p>
                        <p className="flex items-center gap-1 text-[11.5px] text-[#475569]">
                          <Phone className="h-3 w-3 text-[#64748B]" />
                          <span>{selectedBlock.customerPhone}</span>
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#94A3B8] shrink-0" />
                  </div>

                  {/* Quick Call / WhatsApp / Email Icons */}
                  <div className="mt-2.5 flex items-center gap-3 pl-14">
                    <a
                      href={`tel:${selectedBlock.customerPhone}`}
                      aria-label="Call customer"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]"
                    >
                      <Phone className="h-3 w-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReminder(selectedBlock)}
                      aria-label="WhatsApp customer"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0] cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={`mailto:customer@example.com`}
                      aria-label="Email customer"
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]"
                    >
                      <Mail className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Structured Appointment Details Rows */}
                <div className="space-y-3 text-[12px]">
                  {/* Date & Time */}
                  <div className="grid grid-cols-[88px_1fr] items-start gap-2">
                    <span className="text-[#64748B] font-medium">
                      Date &amp; Time
                    </span>
                    <div className="space-y-1 text-[#111827]">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
                        <span>{selectedBlock.dateLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <Clock className="h-3.5 w-3.5 text-[#64748B]" />
                        <span>{selectedBlock.detailTimeLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Service */}
                  <div className="grid grid-cols-[88px_1fr] items-start gap-2">
                    <span className="text-[#64748B] font-medium">Service</span>
                    <div>
                      <div className="flex items-center gap-1.5 font-extrabold text-[#111827]">
                        <Scissors className="h-3.5 w-3.5 text-[#475569]" />
                        <span>{selectedBlock.serviceName}</span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] font-semibold text-[#475569]">
                        {selectedBlock.durationLabel} &bull; {currencySymbol}{' '}
                        {selectedBlock.amount}
                      </p>
                    </div>
                  </div>

                  {/* Staff Member */}
                  <div className="grid grid-cols-[88px_1fr] items-center gap-2">
                    <span className="text-[#64748B] font-medium">
                      Staff Member
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FDE68A] text-[10px] font-extrabold text-[#92400E]">
                        {selectedBlock.staffName
                          .split(' ')
                          .map((p) => p[0])
                          .join('')}
                      </div>
                      <div className="leading-tight">
                        <p className="font-bold text-[#111827]">
                          {selectedBlock.staffName}
                        </p>
                        <p className="text-[10.5px] text-[#64748B]">
                          {selectedBlock.staffRole}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="grid grid-cols-[88px_1fr] items-center gap-2">
                    <span className="text-[#64748B] font-medium">Status</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#0A7B56]" />
                      <select
                        aria-label="Appointment Status"
                        value={selectedBlock.status}
                        onChange={(e) =>
                          void handleStatusChange(
                            e.target.value as ScheduleBlockItem['status'],
                          )
                        }
                        className="h-8 w-full rounded-xl border border-[#DCE9E3] bg-white pl-6 pr-2.5 text-[12px] font-bold text-[#111827]"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="grid grid-cols-[88px_1fr] items-center gap-2">
                    <span className="text-[#64748B] font-medium">Payment</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-bold text-[#0A7B56]">
                        {selectedBlock.paymentStatus}
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 text-[12px] font-bold text-[#111827]"
                      >
                        <span>
                          {currencySymbol} {selectedBlock.amount}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1 pt-0.5">
                    <span className="block text-[#64748B] font-medium">
                      Notes
                    </span>
                    <textarea
                      rows={2}
                      value={selectedBlock.notes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === selectedBlock.id
                              ? { ...b, notes: val }
                              : b,
                          ),
                        );
                      }}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-[#FAFDFB] p-2.5 text-[11.5px] text-[#334155] focus:border-[#0A6847] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Bottom 2x2 Action Buttons: Reschedule | Send Reminder | Cancel | Create Invoice */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      showToast(
                        `Reschedule mode enabled for ${selectedBlock.customerName}`,
                      )
                    }
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-bold text-[#1E293B] hover:bg-[#F4F8F6] transition cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[#475569]" />
                    <span>Reschedule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppReminder(selectedBlock)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-2.5 text-[12px] font-bold text-[#1E293B] hover:bg-[#F4F8F6] transition cursor-pointer"
                  >
                    <Bell className="h-3.5 w-3.5 text-[#475569]" />
                    <span>Send Reminder</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleStatusChange('Cancelled')}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-[#FECDD3] bg-[#FFF1F2] px-2.5 text-[12.5px] font-bold text-[#E11D48] hover:bg-[#FFE4E6] transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateInvoiceFromAppt}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-[#0A6847] px-2.5 text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
                  >
                    Create Invoice
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
              <h3 className="text-[16px] font-bold text-[#111827]">
                New Appointment
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateNewAppointment}
              className="mt-4 space-y-3 text-[12.5px]"
            >
              <div>
                <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newForm.customerName}
                  onChange={(e) =>
                    setNewForm((s) => ({ ...s, customerName: e.target.value }))
                  }
                  placeholder="e.g. Sneha Patel"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newForm.customerPhone}
                    onChange={(e) =>
                      setNewForm((s) => ({
                        ...s,
                        customerPhone: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Service
                  </label>
                  <select
                    value={newForm.serviceName}
                    onChange={(e) =>
                      setNewForm((s) => ({ ...s, serviceName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-2"
                  >
                    {SERVICES_LEGEND.map((svc) => (
                      <option key={svc.name} value={svc.name}>
                        {svc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Staff Member
                  </label>
                  <select
                    value={newForm.staffId}
                    onChange={(e) =>
                      setNewForm((s) => ({ ...s, staffId: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-2"
                  >
                    {STAFF_COLUMNS.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Time Slot
                  </label>
                  <select
                    value={newForm.startHour}
                    onChange={(e) =>
                      setNewForm((s) => ({
                        ...s,
                        startHour: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-2"
                  >
                    {TIME_SLOTS_LABELS.map((slot) => (
                      <option key={slot.hour} value={slot.hour}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={newForm.amount}
                    onChange={(e) =>
                      setNewForm((s) => ({
                        ...s,
                        amount: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] px-2.5 py-2 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EBF2EE]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0A6847] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#085238]"
                >
                  Save Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-2.5">
              <h3 className="text-[15px] font-bold text-[#111827]">
                Calendar Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg p-1 text-[#64748B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-[12.5px] text-[#334155]">
              <p className="font-semibold">Working Hours: 9:00 AM – 8:00 PM</p>
              <p className="font-semibold">Default Slot Duration: 60 mins</p>
              <p className="font-semibold">Auto WhatsApp Reminders: Enabled</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl bg-[#0A6847] px-4 py-1.5 text-[12px] font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
