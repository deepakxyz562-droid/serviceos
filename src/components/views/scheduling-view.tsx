'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Clock,
  ShieldCheck,
  Users,
  Bell,
  Globe,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Edit2,
  MoreHorizontal,
  Link2,
  RefreshCw,
  CalendarPlus,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';

type AppointmentsTab =
  | 'calendar'
  | 'list'
  | 'availability'
  | 'services'
  | 'team'
  | 'reminders'
  | 'online_booking';

type CalendarScale = 'Day' | 'Week' | 'Month';

interface CalendarBlock {
  id: string;
  dayIndex: number; // 0 = Mon 6 .. 5 = Sat 11
  startHour: number; // 8 .. 17
  durationHours: number;
  timeLabel: string;
  customerName: string;
  serviceName: string;
  teamMember: string;
  tone: 'green' | 'amber' | 'blue' | 'rose' | 'purple';
}

interface DailyAppointmentRow {
  id: string;
  time: string;
  initials: string;
  initialsBg: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  location: string;
  teamMember: string;
  teamAvatar: string;
  status: 'Confirmed' | 'Pending';
}

const AVATAR_1 =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80';
const AVATAR_2 =
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80';
const AVATAR_3 =
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80';
const AVATAR_4 =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';

const INITIAL_CALENDAR_BLOCKS: CalendarBlock[] = [
  {
    id: 'cb_1',
    dayIndex: 0,
    startHour: 8.6,
    durationHours: 1.5,
    timeLabel: '9:00 AM',
    customerName: 'Priya Sharma',
    serviceName: 'Home Cleaning',
    teamMember: 'Rakesh Kumar',
    tone: 'green',
  },
  {
    id: 'cb_2',
    dayIndex: 0,
    startHour: 12.6,
    durationHours: 1.5,
    timeLabel: '1:00 PM',
    customerName: 'Sneha Kapoor',
    serviceName: 'Deep Cleaning',
    teamMember: 'Sunita Patel',
    tone: 'amber',
  },
  {
    id: 'cb_3',
    dayIndex: 1,
    startHour: 10.1,
    durationHours: 1.5,
    timeLabel: '10:30 AM',
    customerName: 'Rahul Verma',
    serviceName: 'AC Service',
    teamMember: 'Amit Singh',
    tone: 'blue',
  },
  {
    id: 'cb_4',
    dayIndex: 2,
    startHour: 9.1,
    durationHours: 1.5,
    timeLabel: '9:30 AM',
    customerName: 'Amit Singh',
    serviceName: 'Pest Control',
    teamMember: 'Rakesh Kumar',
    tone: 'rose',
  },
  {
    id: 'cb_5',
    dayIndex: 2,
    startHour: 12.1,
    durationHours: 1.5,
    timeLabel: '12:30 PM',
    customerName: 'Neha Gupta',
    serviceName: 'Office Cleaning',
    teamMember: 'Sunita Patel',
    tone: 'purple',
  },
  {
    id: 'cb_6',
    dayIndex: 2,
    startHour: 14.6,
    durationHours: 1.5,
    timeLabel: '3:00 PM',
    customerName: 'Karan Mehta',
    serviceName: 'Plumbing',
    teamMember: 'Amit Singh',
    tone: 'green',
  },
  {
    id: 'cb_7',
    dayIndex: 3,
    startHour: 10.6,
    durationHours: 1.5,
    timeLabel: '11:00 AM',
    customerName: 'Rohit Kumar',
    serviceName: 'Electrical Work',
    teamMember: 'Pooja Verma',
    tone: 'blue',
  },
  {
    id: 'cb_8',
    dayIndex: 4,
    startHour: 9.6,
    durationHours: 1.5,
    timeLabel: '10:00 AM',
    customerName: 'Pooja Iyer',
    serviceName: 'Home Cleaning',
    teamMember: 'Rakesh Kumar',
    tone: 'amber',
  },
  {
    id: 'cb_9',
    dayIndex: 4,
    startHour: 13.6,
    durationHours: 1.5,
    timeLabel: '2:00 PM',
    customerName: 'Anil Joshi',
    serviceName: 'AC Service',
    teamMember: 'Amit Singh',
    tone: 'rose',
  },
  {
    id: 'cb_10',
    dayIndex: 5,
    startHour: 9.1,
    durationHours: 1.5,
    timeLabel: '9:30 AM',
    customerName: 'Vikram Rao',
    serviceName: 'Painting',
    teamMember: 'Pooja Verma',
    tone: 'green',
  },
  {
    id: 'cb_11',
    dayIndex: 5,
    startHour: 15.6,
    durationHours: 1.4,
    timeLabel: '4:00 PM',
    customerName: 'Meera Sinha',
    serviceName: 'Move In Cleaning',
    teamMember: 'Pooja Verma',
    tone: 'blue',
  },
];

const INITIAL_DAILY_ROWS: DailyAppointmentRow[] = [
  {
    id: 'row_1',
    time: '9:30 AM',
    initials: 'PS',
    initialsBg: 'bg-indigo-50 text-indigo-600',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98765 43210',
    serviceName: 'Home Cleaning',
    location: 'Green Park, Delhi',
    teamMember: 'Rakesh Kumar',
    teamAvatar: AVATAR_1,
    status: 'Confirmed',
  },
  {
    id: 'row_2',
    time: '12:30 PM',
    initials: 'NG',
    initialsBg: 'bg-purple-50 text-purple-600',
    customerName: 'Neha Gupta',
    customerPhone: '+91 87654 32109',
    serviceName: 'Office Cleaning',
    location: 'Connaught Place, Delhi',
    teamMember: 'Sunita Patel',
    teamAvatar: AVATAR_2,
    status: 'Pending',
  },
  {
    id: 'row_3',
    time: '3:00 PM',
    initials: 'KM',
    initialsBg: 'bg-sky-50 text-sky-600',
    customerName: 'Karan Mehta',
    customerPhone: '+91 91234 56789',
    serviceName: 'Plumbing',
    location: 'Lajpat Nagar, Delhi',
    teamMember: 'Amit Singh',
    teamAvatar: AVATAR_3,
    status: 'Confirmed',
  },
  {
    id: 'row_4',
    time: '4:00 PM',
    initials: 'MS',
    initialsBg: 'bg-blue-50 text-blue-600',
    customerName: 'Meera Sinha',
    customerPhone: '+91 99887 76655',
    serviceName: 'Move In Cleaning',
    location: 'Saket, Delhi',
    teamMember: 'Pooja Verma',
    teamAvatar: AVATAR_4,
    status: 'Confirmed',
  },
];

const WEEK_DAYS = [
  { short: 'Mon', num: 6 },
  { short: 'Tue', num: 7 },
  { short: 'Wed', num: 8, isToday: true },
  { short: 'Thu', num: 9 },
  { short: 'Fri', num: 10 },
  { short: 'Sat', num: 11 },
];

const TIME_SLOTS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
];

const MINI_CALENDAR_WEEKS: { num: number; muted?: boolean }[][] = [
  [
    { num: 3, muted: true },
    { num: 3, muted: true },
    { num: 1, muted: true },
    { num: 2, muted: true },
    { num: 3, muted: true },
    { num: 4, muted: true },
    { num: 5, muted: true },
  ],
  [
    { num: 6 },
    { num: 7 },
    { num: 8 },
    { num: 9, muted: true },
    { num: 10, muted: true },
    { num: 11 },
    { num: 13, muted: true },
  ],
  [
    { num: 13 },
    { num: 14 },
    { num: 15 },
    { num: 16, muted: true },
    { num: 17, muted: true },
    { num: 18 },
    { num: 29 },
  ],
  [
    { num: 20 },
    { num: 21 },
    { num: 22 },
    { num: 23 },
    { num: 24 },
    { num: 25 },
    { num: 25 },
  ],
  [
    { num: 27 },
    { num: 28 },
    { num: 29 },
    { num: 30 },
    { num: 31 },
    { num: 1, muted: true },
    { num: 3, muted: true },
  ],
];

export function SchedulingView({ embedded = false }: { embedded?: boolean } = {}) {
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const [activeTab, setActiveTab] = useState<AppointmentsTab>('calendar');
  const [calendarScale, setCalendarScale] = useState<CalendarScale>('Day');
  const [teamFilter, setTeamFilter] = useState<string>('All Team Members');
  const [selectedMiniDate, setSelectedMiniDate] = useState<number>(8);

  const [calendarBlocks, setCalendarBlocks] = useState<CalendarBlock[]>(INITIAL_CALENDAR_BLOCKS);
  const [dailyRows, setDailyRows] = useState<DailyAppointmentRow[]>(INITIAL_DAILY_ROWS);

  // New Appointment Modal state
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newService, setNewService] = useState('Home Cleaning');
  const [newLocation, setNewLocation] = useState('Green Park, Delhi');
  const [newTime, setNewTime] = useState('11:00 AM');
  const [newTeamMember, setNewTeamMember] = useState('Rakesh Kumar');

  // Real-time synchronization with scheduling APIs
  const fetchBookings = useCallback(async () => {
    try {
      const res = await authFetch('/api/bookings?limit=50');
      if (res.ok) {
        const data = await res.json();
        const bookingsList = Array.isArray(data?.bookings)
          ? data.bookings
          : Array.isArray(data)
          ? data
          : [];

        if (bookingsList.length > 0) {
          const mappedRows: DailyAppointmentRow[] = bookingsList.map((b: any, index: number) => {
            const customer = b.customerName || b.title || 'Client';
            const initials = customer
              .split(' ')
              .map((p: string) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'NA';
            const timeStr = b.scheduledAt
              ? new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '10:00 AM';

            return {
              id: b.id || `row_${index}`,
              time: timeStr,
              initials,
              initialsBg: 'bg-emerald-50 text-emerald-700',
              customerName: customer,
              customerPhone: b.customerPhone || '+91 98765 43210',
              serviceName: b.service?.name || b.title || 'Home Cleaning',
              location: b.address || 'Delhi, India',
              teamMember: b.employee?.name || 'Rakesh Kumar',
              teamAvatar: b.employee?.avatar || AVATAR_1,
              status: b.status === 'confirmed' || b.status === 'Confirmed' ? 'Confirmed' : 'Pending',
            };
          });

          const mappedBlocks: CalendarBlock[] = bookingsList.map((b: any, index: number) => {
            const customer = b.customerName || b.title || 'Client';
            const timeStr = b.scheduledAt
              ? new Date(b.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '10:00 AM';
            const dateObj = b.scheduledAt ? new Date(b.scheduledAt) : new Date();
            const dayIdx = (dateObj.getDay() + 6) % 7;
            const tones: CalendarBlock['tone'][] = ['green', 'amber', 'blue', 'rose', 'purple'];

            return {
              id: `cb_${b.id || index}`,
              dayIndex: Math.min(Math.max(dayIdx, 0), 5),
              startHour: 9 + (index % 6) * 1.5,
              durationHours: 1.4,
              timeLabel: timeStr,
              customerName: customer,
              serviceName: b.service?.name || b.title || 'Home Cleaning',
              teamMember: b.employee?.name || 'Rakesh Kumar',
              tone: tones[index % tones.length],
            };
          });

          setDailyRows(mappedRows);
          setCalendarBlocks(mappedBlocks);
        }
      }
    } catch {
      // keep canonical seed state
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBlocks = calendarBlocks.filter((b) =>
    teamFilter === 'All Team Members' ? true : b.teamMember === teamFilter
  );

  const filteredDailyRows = dailyRows.filter((r) =>
    teamFilter === 'All Team Members' ? true : r.teamMember === teamFilter
  );

  const handleCreateAppointment = async () => {
    if (!newCustomerName.trim()) {
      toast.error('Please enter a customer name');
      return;
    }

    const customer = newCustomerName.trim();
    const initials = customer
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const now = new Date();
    const [timePart, meridiem] = newTime.split(' ');
    let [hours, minutes] = (timePart || '11:00').split(':').map(Number);
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours || 11, minutes || 0);

    const createdRow: DailyAppointmentRow = {
      id: `row_${Date.now()}`,
      time: newTime,
      initials: initials || 'NA',
      initialsBg: 'bg-emerald-50 text-emerald-700',
      customerName: customer,
      customerPhone: newCustomerPhone.trim() || '+91 98765 43210',
      serviceName: newService,
      location: newLocation.trim() || 'Delhi, India',
      teamMember: newTeamMember,
      teamAvatar: AVATAR_1,
      status: 'Confirmed',
    };

    const createdBlock: CalendarBlock = {
      id: `cb_${Date.now()}`,
      dayIndex: 2,
      startHour: 10.6,
      durationHours: 1.4,
      timeLabel: newTime,
      customerName: customer,
      serviceName: newService,
      teamMember: newTeamMember,
      tone: 'green',
    };

    setDailyRows((prev) => [createdRow, ...prev]);
    setCalendarBlocks((prev) => [...prev, createdBlock]);
    setNewAppointmentOpen(false);
    setNewCustomerName('');
    setNewCustomerPhone('');

    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${newService} for ${customer}`,
          customerName: customer,
          customerPhone: newCustomerPhone.trim() || '+91 98765 43210',
          address: newLocation.trim() || 'Delhi, India',
          scheduledAt: scheduledDate.toISOString(),
          duration: 90,
          source: 'manual',
          notes: `Assigned technician: ${newTeamMember}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Booking API responded with non-200:', err);
        toast.success(`Appointment scheduled locally for ${customer} at ${newTime}`);
      } else {
        toast.success(`Appointment scheduled and saved for ${customer} at ${newTime}`);
      }
    } catch {
      toast.success(`Appointment scheduled locally for ${customer} at ${newTime}`);
    }
  };

  const getBlockToneClasses = (tone: CalendarBlock['tone']) => {
    switch (tone) {
      case 'green':
        return 'border-l-4 border-l-[#009F50] bg-[#E8F8EF] text-[#065F46]';
      case 'amber':
        return 'border-l-4 border-l-amber-500 bg-amber-50 text-amber-900';
      case 'blue':
        return 'border-l-4 border-l-blue-500 bg-blue-50 text-blue-900';
      case 'rose':
        return 'border-l-4 border-l-rose-500 bg-rose-50 text-rose-900';
      case 'purple':
        return 'border-l-4 border-l-purple-500 bg-purple-50 text-purple-900';
    }
  };

  const navTabs: {
    id: AppointmentsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'list', label: 'List', icon: ListIcon },
    { id: 'availability', label: 'Availability', icon: Clock },
    { id: 'services', label: 'Services', icon: ShieldCheck },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'online_booking', label: 'Online Booking', icon: Globe },
  ];

  return (
    <div className={embedded ? 'w-full' : 'min-h-screen w-full bg-[#F8FAFC] text-slate-900'}>
      {/* 1. TOP PAGE HEADER & SUB-NAVIGATION TABS */}
      <div className="border-b border-slate-200 bg-white px-6 pt-5">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#009F50] text-white shadow-xs">
              <CalendarIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Appointments</h1>
              <p className="text-xs text-slate-500">
                Manage bookings, schedules and availability for your team.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCurrentView('settings')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
            >
              <Settings className="size-3.5 text-slate-500" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setNewAppointmentOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#009F50] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#008A45]"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>New Appointment</span>
            </button>
          </div>
        </div>

        {/* 7 Horizontal Underline Tabs */}
        <div
          role="tablist"
          aria-label="Appointments Navigation"
          className="mt-5 flex w-full items-center gap-2 overflow-x-auto no-scrollbar"
        >
          {navTabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition ${
                  active
                    ? 'border-[#009F50] text-[#009F50]'
                    : 'border-transparent text-slate-600 hover:border-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className={`size-3.5 ${active ? 'text-[#009F50]' : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="w-full p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT 9-COLUMN WORKSPACE */}
          <div className="space-y-5 lg:col-span-9">
            {/* ROW 1: 3 KPI SUMMARY CARDS */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Total Appointments */}
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F8EF] text-[#009F50]">
                  <CalendarIcon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Appointments</p>
                  <div className="mt-1 flex items-baseline gap-2.5">
                    <span className="text-2xl font-bold text-slate-900">28</span>
                    <div className="text-[11px]">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E8F8EF] px-2 py-0.5 font-semibold text-[#009F50]">
                        <ArrowUp className="size-2.5 stroke-[2.5]" />
                        <span>21%</span>
                      </span>
                      <span className="ml-1.5 text-slate-400">vs last month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmed */}
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F8EF] text-[#009F50]">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Confirmed</p>
                  <div className="mt-1 flex items-baseline gap-2.5">
                    <span className="text-2xl font-bold text-slate-900">22</span>
                    <div className="text-[11px]">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E8F8EF] px-2 py-0.5 font-semibold text-[#009F50]">
                        <ArrowUp className="size-2.5 stroke-[2.5]" />
                        <span>32%</span>
                      </span>
                      <span className="ml-1.5 text-slate-400">vs last month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Pending</p>
                  <div className="mt-1 flex items-baseline gap-2.5">
                    <span className="text-2xl font-bold text-slate-900">4</span>
                    <div className="text-[11px]">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                        <ArrowDown className="size-2.5 stroke-[2.5]" />
                        <span>20%</span>
                      </span>
                      <span className="ml-1.5 text-slate-400">vs last month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: WEEKLY SCHEDULE CALENDAR CARD */}
            {activeTab === 'calendar' && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                {/* Calendar Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMiniDate(8)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Today
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Previous week"
                        className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next week"
                        className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                    <span className="ml-1 text-xs font-bold text-slate-900">
                      Oct 6 – Oct 12, 2026
                    </span>
                  </div>

                  {/* Day / Week / Month Switcher */}
                  <div className="flex items-center gap-2">
                    <Settings className="size-3.5 text-slate-400" />
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                      {(['Day', 'Week', 'Month'] as const).map((scale) => {
                        const active = calendarScale === scale;
                        return (
                          <button
                            key={scale}
                            type="button"
                            onClick={() => setCalendarScale(scale)}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                              active
                                ? 'bg-[#009F50] text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {scale}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Team Member Filter */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Team</span>
                    <div className="relative">
                      <select
                        aria-label="Filter by Team Member"
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        className="appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pr-8 pl-3 text-xs font-semibold text-slate-700 focus:border-[#009F50] focus:outline-hidden"
                      >
                        <option value="All Team Members">All Team Members</option>
                        <option value="Rakesh Kumar">Rakesh Kumar</option>
                        <option value="Sunita Patel">Sunita Patel</option>
                        <option value="Amit Singh">Amit Singh</option>
                        <option value="Pooja Verma">Pooja Verma</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Weekly Time Grid */}
                <div className="mt-3 overflow-x-auto">
                  <div className="min-w-[720px]">
                    {/* Day Column Headers */}
                    <div className="grid grid-cols-[64px_repeat(6,1fr)] border-b border-slate-100 pb-2">
                      <div />
                      {WEEK_DAYS.map((d) => (
                        <div key={d.short} className="text-center">
                          <p className="text-[11px] font-medium text-slate-500">{d.short}</p>
                          <div className="mt-1 flex justify-center">
                            <span
                              className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                                d.isToday
                                  ? 'bg-[#009F50] text-white'
                                  : 'text-slate-700'
                              }`}
                            >
                              {d.num}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Grid Body (8:00 AM to 5:00 PM = 9 hours height = 432px) */}
                    <div className="relative grid grid-cols-[64px_repeat(6,1fr)]">
                      {/* Left Time Axis */}
                      <div className="divide-y divide-transparent">
                        {TIME_SLOTS.map((slot) => (
                          <div
                            key={slot}
                            className="h-11 pr-2 text-right text-[10px] font-medium text-slate-400"
                          >
                            {slot}
                          </div>
                        ))}
                      </div>

                      {/* 6 Day Columns */}
                      {WEEK_DAYS.map((day, dayIdx) => {
                        const blocksForDay = filteredBlocks.filter(
                          (b) => b.dayIndex === dayIdx
                        );
                        return (
                          <div
                            key={day.short}
                            className="relative border-l border-slate-100"
                            style={{ height: `${TIME_SLOTS.length * 44}px` }}
                          >
                            {/* Horizontal Hour Lines */}
                            {TIME_SLOTS.map((slot) => (
                              <div
                                key={slot}
                                className="h-11 border-b border-slate-100/80"
                              />
                            ))}

                            {/* Appointment Blocks */}
                            {blocksForDay.map((block) => {
                              const topPx = (block.startHour - 8) * 44;
                              const heightPx = block.durationHours * 44;
                              return (
                                <div
                                  key={block.id}
                                  style={{
                                    top: `${topPx}px`,
                                    height: `${heightPx}px`,
                                  }}
                                  className={`absolute inset-x-1.5 rounded-lg p-2 text-[11px] leading-tight shadow-2xs ${getBlockToneClasses(
                                    block.tone
                                  )}`}
                                >
                                  <p className="font-bold">{block.timeLabel}</p>
                                  <p className="mt-0.5 truncate font-bold">
                                    {block.customerName}
                                  </p>
                                  <p className="truncate opacity-80">{block.serviceName}</p>
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
            )}

            {activeTab !== 'calendar' && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold capitalize text-slate-900">
                      {activeTab.replace('_', ' ')} Configuration
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Manage your {activeTab.replace('_', ' ')} rules, team rosters, and automated booking notifications.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('calendar')}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Back to Calendar
                  </button>
                </div>
              </div>
            )}

            {/* ROW 3: APPOINTMENTS FOR WED, OCT 8, 2026 (5) TABLE CARD */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Appointments for Wed, Oct 8, 2026{' '}
                  <span className="font-normal text-slate-400">(5)</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="text-xs font-semibold text-[#009F50] hover:underline"
                >
                  View all →
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400">
                      <th className="pb-2.5 font-medium">Time</th>
                      <th className="pb-2.5 font-medium">Customer</th>
                      <th className="pb-2.5 font-medium">Service</th>
                      <th className="pb-2.5 font-medium">Team Member</th>
                      <th className="pb-2.5 font-medium">Status</th>
                      <th className="pb-2.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDailyRows.map((row) => (
                      <tr key={row.id} className="group hover:bg-slate-50/60">
                        <td className="py-3 font-medium text-slate-600">{row.time}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${row.initialsBg}`}
                            >
                              {row.initials}
                            </span>
                            <div>
                              <p className="font-bold text-slate-900">{row.customerName}</p>
                              <p className="text-[11px] text-slate-400">{row.customerPhone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-800">{row.serviceName}</p>
                          <p className="text-[11px] text-slate-400">{row.location}</p>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={row.teamAvatar}
                              alt={row.teamMember}
                              className="size-6 rounded-full object-cover"
                            />
                            <span className="font-medium text-slate-700">{row.teamMember}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          {row.status === 'Confirmed' ? (
                            <span className="inline-flex rounded-lg bg-[#E8F8EF] px-2.5 py-1 text-[11px] font-semibold text-[#009F50]">
                              Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Edit appointment for ${row.customerName}`}
                              onClick={() =>
                                toast.info(`Editing appointment for ${row.customerName}`)
                              }
                              className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={`More actions for ${row.customerName}`}
                              className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT 3-COLUMN SIDEBAR */}
          <div className="space-y-5 lg:col-span-3">
            {/* CARD 1: MINI CALENDAR (OCTOBER 2026) + NEW APPOINTMENT CTA */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">October 2026</h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    className="flex size-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    className="flex size-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Day of Week Header */}
              <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>

              {/* Calendar Dates Grid */}
              <div className="mt-2 space-y-1">
                {MINI_CALENDAR_WEEKS.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-cols-7 text-center">
                    {week.map((cell, cIdx) => {
                      const isSelected = !cell.muted && cell.num === selectedMiniDate && wIdx === 1;
                      return (
                        <button
                          key={`${wIdx}_${cIdx}`}
                          type="button"
                          onClick={() => {
                            if (!cell.muted) setSelectedMiniDate(cell.num);
                          }}
                          className={`mx-auto flex size-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-[#009F50] text-white shadow-2xs'
                              : cell.muted
                              ? 'text-slate-300'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {cell.num}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setNewAppointmentOpen(true)}
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#009F50] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#008A45]"
              >
                <Plus className="size-4 stroke-[2.5]" />
                <span>New Appointment</span>
              </button>
            </section>

            {/* CARD 2: QUICK ACTIONS */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>

              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('availability')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2.5">
                    <CalendarIcon className="size-4 text-[#009F50]" />
                    <span>Manage Availability</span>
                  </span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('online_booking')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2.5">
                    <Link2 className="size-4 text-[#009F50]" />
                    <span>Booking Page</span>
                  </span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setNewAppointmentOpen(true)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2.5">
                    <RefreshCw className="size-4 text-[#009F50]" />
                    <span>Add Recurring Appointment</span>
                  </span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => toast.success('Calendar import wizard opened')}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2.5">
                    <CalendarPlus className="size-4 text-[#009F50]" />
                    <span>Import from Calendar</span>
                  </span>
                  <ChevronRight className="size-3.5 text-slate-400" />
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* NEW APPOINTMENT MODAL */}
      <Dialog open={newAppointmentOpen} onOpenChange={setNewAppointmentOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">New Appointment</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Schedule a new customer booking and assign a team member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer Name *</Label>
                <Input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Priya Sharma"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Service</Label>
                <select
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs"
                >
                  <option value="Home Cleaning">Home Cleaning</option>
                  <option value="Deep Cleaning">Deep Cleaning</option>
                  <option value="Office Cleaning">Office Cleaning</option>
                  <option value="AC Service">AC Service</option>
                  <option value="Pest Control">Pest Control</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Move In Cleaning">Move In Cleaning</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Time</Label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs"
                >
                  <option value="9:00 AM">9:00 AM</option>
                  <option value="9:30 AM">9:30 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="12:30 PM">12:30 PM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Location</Label>
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Green Park, Delhi"
                  className="h-9 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Team Member</Label>
                <select
                  value={newTeamMember}
                  onChange={(e) => setNewTeamMember(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs"
                >
                  <option value="Rakesh Kumar">Rakesh Kumar</option>
                  <option value="Sunita Patel">Sunita Patel</option>
                  <option value="Amit Singh">Amit Singh</option>
                  <option value="Pooja Verma">Pooja Verma</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewAppointmentOpen(false)}
              className="h-8 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateAppointment}
              className="h-8 rounded-xl bg-[#009F50] text-xs font-semibold text-white hover:bg-[#008A45]"
            >
              Save Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SchedulingView;
