'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  Search,
  Share2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  type BosAppointment,
  formatBosCurrency,
  getInitials,
} from '@/components/bos/bos-types';

type AppointmentSubTab =
  | 'calendar'
  | 'list'
  | 'services'
  | 'staff'
  | 'walkins'
  | 'online';

type BosAppointmentsWorkstationProps = {
  businessName: string;
  businessSlug: string;
  currencySymbol: string;
  appointments: BosAppointment[];
  initialOpenNewModal?: boolean;
  onCreateAppointment: (appt: Omit<BosAppointment, 'id' | 'bookingCode'>) => Promise<void>;
  onUpdateAppointmentStatus: (id: string, status: BosAppointment['status']) => Promise<void>;
  onConvertToPosBill: (appt: BosAppointment) => void;
};

export function BosAppointmentsWorkstation({
  businessName,
  businessSlug,
  currencySymbol,
  appointments,
  initialOpenNewModal = false,
  onCreateAppointment,
  onUpdateAppointmentStatus,
  onConvertToPosBill,
}: BosAppointmentsWorkstationProps) {
  const [subTab, setSubTab] = useState<AppointmentSubTab>('calendar');
  const [calendarRange, setCalendarRange] = useState<'day' | 'week' | 'month'>('day');
  const [staffFilter, setStaffFilter] = useState('All Staff');
  const [selectedApptId, setSelectedApptId] = useState<string>(appointments[0]?.id || '');
  const [showNewModal, setShowNewModal] = useState(initialOpenNewModal);
  const [toast, setToast] = useState<string | null>(null);

  const [newForm, setNewForm] = useState({
    customerName: '',
    customerPhone: '+91 ',
    serviceName: 'Haircut & Styling',
    staffName: 'Neha Sharma',
    scheduledAt: '11:30 AM',
    durationMinutes: 45,
    amount: 850,
    notes: '',
  });

  const staffMembers = [
    { name: 'Neha Sharma', role: 'Senior Stylist', count: 5, status: 'Busy' },
    { name: 'Rohan Verma', role: 'Grooming Expert', count: 4, status: 'Free' },
    { name: 'Pooja Nair', role: 'Skin Specialist', count: 5, status: 'Busy' },
    { name: 'Vikram Singh', role: 'Therapist', count: 4, status: 'Free' },
  ];

  const servicesCatalog = [
    { name: 'Haircut & Styling', duration: '45 mins', price: 650, category: 'Hair Care' },
    { name: 'Bridal Glow Facial + Cleanup', duration: '60 mins', price: 1400, category: 'Skin & Facial' },
    { name: 'Beard Trim & Grooming', duration: '30 mins', price: 350, category: 'Men Grooming' },
    { name: 'Keratin Smooth Hair Spa', duration: '90 mins', price: 2200, category: 'Hair Treatment' },
    { name: 'Full Body Deep Tissue Spa', duration: '60 mins', price: 1800, category: 'Wellness' },
  ];

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (staffFilter !== 'All Staff' && !a.staffName.toLowerCase().includes(staffFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [appointments, staffFilter]);

  const selectedAppt = useMemo(() => {
    return (
      appointments.find((a) => a.id === selectedApptId) ||
      filteredAppointments[0] ||
      appointments[0] ||
      null
    );
  }, [appointments, filteredAppointments, selectedApptId]);

  const kpis = useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter((a) => a.status === 'completed');
    const completedRev = completed.reduce((s, a) => s + a.amount, 0) || 6450;
    const upcoming = appointments.filter(
      (a) => a.status === 'confirmed' || a.status === 'pending' || a.status === 'checked_in',
    ).length;
    const estRevenue = appointments
      .filter((a) => a.status !== 'cancelled')
      .reduce((s, a) => s + a.amount, 0);

    return {
      total,
      completedCount: completed.length || 4,
      completedRev,
      upcoming,
      estRevenue,
    };
  }, [appointments]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.customerName.trim()) return;
    await onCreateAppointment({
      customerName: newForm.customerName.trim(),
      customerPhone: newForm.customerPhone.trim() || '+91 98765 43210',
      serviceName: newForm.serviceName,
      categoryName: 'Salon & Wellness',
      staffName: newForm.staffName,
      scheduledAt: newForm.scheduledAt,
      durationMinutes: Number(newForm.durationMinutes) || 45,
      amount: Number(newForm.amount) || 650,
      paymentStatus: 'pending',
      status: 'confirmed',
      notes: newForm.notes.trim() || undefined,
    });
    setShowNewModal(false);
    setToast(`Booked appointment for ${newForm.customerName.trim()} at ${newForm.scheduledAt}.`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleShareWhatsAppReminder = (appt: BosAppointment) => {
    const cleanPhone = appt.customerPhone.replace(/\D/g, '');
    const msg = `Hi ${appt.customerName} 👋,\nYour appointment at *${businessName}* for *${appt.serviceName}* with *${appt.staffName}* is confirmed for *Today at ${appt.scheduledAt}*.\nBooking Ref: ${appt.bookingCode}. See you soon!`;
    window.open(
      `https://wa.me/${cleanPhone || '919876543210'}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Sub-Tabs & Action Bar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
          {(
            [
              { id: 'calendar', label: 'Calendar View' },
              { id: 'list', label: 'Bookings List' },
              { id: 'services', label: 'Services & Packages' },
              { id: 'staff', label: 'Staff Schedule' },
              { id: 'walkins', label: 'Walk-in Queue' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                subTab === t.id
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'text-[#475569] hover:bg-[#F4F8F6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const link = `${window.location.origin}/store/${businessSlug || 'bos-store'}`;
              navigator.clipboard?.writeText(link).catch(() => {});
              setToast(`Copied online booking link: ${link}`);
              setTimeout(() => setToast(null), 3000);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6]"
          >
            <Share2 className="h-4 w-4 text-[#0A6847]" />
            <span>Share Booking Link</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px]"
          >
            <Plus className="h-4 w-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Today&apos;s Appointments</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#111827]">{kpis.total}</p>
          <p className="text-[11px] font-semibold text-[#0A6847]">+15% vs yesterday</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Completed</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#0A6847]">{kpis.completedCount}</p>
          <p className="text-[11px] text-[#64748B]">
            {formatBosCurrency(kpis.completedRev, currencySymbol)} collected
          </p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Upcoming / Pending</p>
          <p className="mt-1 text-[22px] font-extrabold text-amber-600">{kpis.upcoming}</p>
          <p className="text-[11px] text-amber-700">2 awaiting check-in</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Walk-ins in Queue</p>
          <p className="mt-1 text-[22px] font-extrabold text-purple-600">2</p>
          <p className="text-[11px] text-purple-700">Avg wait: 12 mins</p>
        </div>

        <div className="bos-card p-3.5 col-span-2 lg:col-span-1">
          <p className="text-[11.5px] font-medium text-[#64748B]">Estimated Revenue</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
            {formatBosCurrency(kpis.estRevenue, currencySymbol)}
          </p>
          <p className="text-[11px] text-[#64748B]">From today&apos;s bookings</p>
        </div>
      </div>

      {subTab === 'services' ? (
        <div className="bos-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#111827]">Services & Treatment Menu</h2>
              <p className="text-[12.5px] text-[#64748B]">
                Bookable services, durations, and pricing shown on your POS and Online Booking page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="bos-btn-primary rounded-xl px-4 py-2 text-[12.5px]"
            >
              + Book Service
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {servicesCatalog.map((svc) => (
              <div
                key={svc.name}
                className="rounded-xl border border-[#E4EFEA] bg-[#FCFDFD] p-4 flex items-center justify-between"
              >
                <div>
                  <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                    {svc.category}
                  </span>
                  <h4 className="mt-1.5 text-[14px] font-bold text-[#111827]">{svc.name}</h4>
                  <p className="text-[11.5px] text-[#64748B]">Duration: {svc.duration}</p>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-extrabold text-[#0A6847]">
                    {formatBosCurrency(svc.price, currencySymbol)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewForm((f) => ({ ...f, serviceName: svc.name, amount: svc.price }));
                      setShowNewModal(true);
                    }}
                    className="mt-1.5 rounded-lg bg-[#0A6847] px-2.5 py-1 text-[11px] font-semibold text-white"
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Split Layout: Left Schedule / Bookings Grid (8 cols) + Right Booking Details Inspector (4 cols) */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          <div className="bos-card p-4 lg:col-span-8 space-y-4">
            {/* Schedule Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDF4F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-0.5 text-[12px] font-semibold">
                  <button type="button" className="px-2 py-1 text-[#64748B] hover:text-[#111827]">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2.5 py-1 text-[#0A6847] font-bold">Today • 24 Apr 2026</span>
                  <button type="button" className="px-2 py-1 text-[#64748B] hover:text-[#111827]">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#334155]"
                >
                  <option value="All Staff">Staff: All Staff (4)</option>
                  {staffMembers.map((st) => (
                    <option key={st.name} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>

                <div className="inline-flex rounded-lg bg-[#F1F6F3] p-0.5 text-[11.5px] font-semibold">
                  {(['day', 'week', 'month'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCalendarRange(r)}
                      className={`rounded-md px-2.5 py-1 capitalize ${
                        calendarRange === r ? 'bg-[#0A6847] text-white' : 'text-[#64748B]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Staff Availability Strip */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {staffMembers.map((staff) => (
                <div
                  key={staff.name}
                  onClick={() =>
                    setStaffFilter((prev) => (prev === staff.name ? 'All Staff' : staff.name))
                  }
                  className={`cursor-pointer rounded-xl border p-2.5 transition flex items-center justify-between ${
                    staffFilter === staff.name
                      ? 'border-[#0A6847] bg-[#E6F6F0]/60'
                      : 'border-[#E4EFEA] bg-[#F8FCFA] hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-[#111827] truncate">{staff.name}</p>
                    <p className="text-[10.5px] text-[#64748B] truncate">
                      {staff.role} • {staff.count} bookings
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      staff.status === 'Free'
                        ? 'bg-[#E6F6F0] text-[#0A6847]'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {staff.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Appointments Schedule Cards */}
            <div className="space-y-2.5">
              {filteredAppointments.map((appt) => {
                const isSelected = selectedAppt?.id === appt.id;
                const badge =
                  appt.status === 'completed'
                    ? { label: 'Completed', cls: 'bg-[#E6F6F0] text-[#0A6847]' }
                    : appt.status === 'checked_in'
                      ? { label: 'In Service', cls: 'bg-blue-50 text-blue-700' }
                      : appt.status === 'cancelled'
                        ? { label: 'Cancelled', cls: 'bg-red-50 text-red-600' }
                        : { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700' };

                return (
                  <div
                    key={appt.id}
                    onClick={() => setSelectedApptId(appt.id)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${
                      isSelected
                        ? 'border-[#0A6847] bg-[#E6F6F0]/50 shadow-2xs'
                        : 'border-[#E4EFEA] bg-white hover:border-[#10B981]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex flex-col items-center justify-center rounded-xl bg-[#0A6847] px-3 py-2 text-white shrink-0 min-w-[78px]">
                        <span className="text-[12.5px] font-extrabold">{appt.scheduledAt}</span>
                        <span className="text-[10px] opacity-80">{appt.durationMinutes} min</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-extrabold text-[#111827]">
                            {appt.serviceName}
                          </span>
                          <span className="text-[11px] font-mono text-[#64748B]">
                            {appt.bookingCode}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#334155] mt-0.5">
                          Customer: <strong>{appt.customerName}</strong> ({appt.customerPhone}) • Staff:{' '}
                          <strong className="text-[#0A6847]">{appt.staffName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[14px] font-extrabold text-[#111827]">
                          {formatBosCurrency(appt.amount, currencySymbol)}
                        </p>
                        <p className="text-[10.5px] text-[#64748B] capitalize">
                          {appt.paymentStatus}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Booking Details Inspector */}
          {selectedAppt && (
            <div className="bos-card p-4 lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-extrabold text-[#111827]">Booking Details</h3>
                    <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                      {selectedAppt.bookingCode}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[#64748B]">
                    Today, 24 Apr • {selectedAppt.scheduledAt} ({selectedAppt.durationMinutes} mins)
                  </p>
                </div>
              </div>

              {/* Status Switcher */}
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                  Booking Status
                </p>
                <div className="grid grid-cols-4 gap-1.5 text-[11px] font-semibold">
                  {(
                    [
                      { id: 'confirmed', label: 'Confirmed' },
                      { id: 'checked_in', label: 'Checked In' },
                      { id: 'completed', label: 'Completed' },
                      { id: 'cancelled', label: 'Cancelled' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => void onUpdateAppointmentStatus(selectedAppt.id, st.id)}
                      className={`rounded-lg py-1.5 px-1 transition ${
                        selectedAppt.status === st.id
                          ? 'bg-[#0A6847] text-white'
                          : 'border border-[#DCE9E3] bg-[#F8FCFA] text-[#475569]'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Card */}
              <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-xs font-bold text-white">
                    {getInitials(selectedAppt.customerName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#111827] truncate">
                      {selectedAppt.customerName}
                    </p>
                    <p className="text-[11.5px] text-[#64748B]">{selectedAppt.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${selectedAppt.customerPhone}`}
                    className="rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334155]"
                  >
                    Call
                  </a>
                  <button
                    type="button"
                    onClick={() => handleShareWhatsAppReminder(selectedAppt)}
                    className="rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11px] font-semibold text-[#0A6847]"
                  >
                    WhatsApp
                  </button>
                </div>
              </div>

              {/* Services Booked */}
              <div className="rounded-xl border border-[#E4EFEA] bg-white p-3 space-y-2 text-[12.5px]">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                  Service & Staff
                </p>
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-[#111827]">{selectedAppt.serviceName}</p>
                    <p className="text-[11px] text-[#64748B]">
                      Assigned Staff: <strong>{selectedAppt.staffName}</strong>
                    </p>
                  </div>
                  <span className="font-extrabold text-[#0A6847]">
                    {formatBosCurrency(selectedAppt.amount, currencySymbol)}
                  </span>
                </div>
                {selectedAppt.notes && (
                  <p className="rounded-lg bg-[#F8FCFA] p-2 text-[11.5px] text-[#475569]">
                    Note: {selectedAppt.notes}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleShareWhatsAppReminder(selectedAppt)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white py-2 text-[12.5px] font-semibold text-[#0A6847] hover:bg-[#E6F6F0]/40"
                >
                  Send WhatsApp Reminder
                </button>
                <button
                  type="button"
                  onClick={() => onConvertToPosBill(selectedAppt)}
                  className="w-full bos-btn-primary rounded-xl py-2.5 text-[13px]"
                >
                  Convert to POS Bill ({formatBosCurrency(selectedAppt.amount, currencySymbol)}) →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
              <h3 className="text-[16px] font-bold text-[#111827]">Book New Appointment</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-lg p-1 text-[#64748B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newForm.customerName}
                  onChange={(e) => setNewForm((s) => ({ ...s, customerName: e.target.value }))}
                  placeholder="e.g. Ananya Deshmukh"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={newForm.customerPhone}
                  onChange={(e) => setNewForm((s) => ({ ...s, customerPhone: e.target.value }))}
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Service
                  </label>
                  <select
                    value={newForm.serviceName}
                    onChange={(e) => {
                      const found = servicesCatalog.find((x) => x.name === e.target.value);
                      setNewForm((s) => ({
                        ...s,
                        serviceName: e.target.value,
                        amount: found ? found.price : s.amount,
                      }));
                    }}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 bg-white"
                  >
                    {servicesCatalog.map((svc) => (
                      <option key={svc.name} value={svc.name}>
                        {svc.name} ({formatBosCurrency(svc.price, currencySymbol)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Assign Staff
                  </label>
                  <select
                    value={newForm.staffName}
                    onChange={(e) => setNewForm((s) => ({ ...s, staffName: e.target.value }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 bg-white"
                  >
                    {staffMembers.map((st) => (
                      <option key={st.name} value={st.name}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Time Slot
                  </label>
                  <select
                    value={newForm.scheduledAt}
                    onChange={(e) => setNewForm((s) => ({ ...s, scheduledAt: e.target.value }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 bg-white"
                  >
                    {['10:00 AM', '11:30 AM', '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'].map(
                      (slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Fee ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={newForm.amount}
                    onChange={(e) => setNewForm((s) => ({ ...s, amount: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF4F0]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12.5px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bos-btn-primary rounded-xl px-5 py-2 text-[12.5px]"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
