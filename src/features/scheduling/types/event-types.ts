/**
 * Calendly-Style Scheduling & Event Types Engine
 */

export type MeetingLocationType = 'google_meet' | 'zoom' | 'teams' | 'phone' | 'in_person';

export interface BookingField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea';
  required: boolean;
  placeholder?: string;
}

export interface EventType {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description?: string;
  duration: number; // in minutes (15, 30, 45, 60, etc.)
  locationType: MeetingLocationType;
  locationDetails?: string; // phone number, address, or custom link
  color: string;
  isActive: boolean;
  requiresPayment?: boolean;
  price?: number;
  currency?: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  bookingFields?: BookingField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DayAvailability {
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday
  name: string;
  isWorkingDay: boolean;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  breakStart?: string | null;
  breakEnd?: string | null;
}

export interface WeeklyAvailabilitySettings {
  tenantId: string;
  timezone: string;
  slotDuration: number;
  bufferTime: number;
  leadTimeHours: number;
  days: DayAvailability[];
}

export const DEFAULT_BOOKING_FIELDS: BookingField[] = [
  { id: 'name', label: 'Your Name', type: 'text', required: true, placeholder: 'e.g. Deepak Chandra' },
  { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
  { id: 'phone', label: 'Phone Number', type: 'phone', required: false, placeholder: '+1 (555) 000-0000' },
  { id: 'notes', label: 'Please share anything that will help prepare for our meeting', type: 'textarea', required: false },
];

export const DEFAULT_EVENT_TYPES: Omit<EventType, 'tenantId'>[] = [
  {
    id: 'evt_30min',
    title: '30 Minute Meeting',
    slug: '30min',
    duration: 30,
    locationType: 'google_meet',
    color: '#2563EB',
    isActive: true,
    description: '30 min • Google Meet • One-on-One\nWeekdays, 9 am - 5 pm',
    bookingFields: DEFAULT_BOOKING_FIELDS,
  },
  {
    id: 'evt_15min',
    title: '15 Minute Quick Connect',
    slug: '15min',
    duration: 15,
    locationType: 'phone',
    color: '#059669',
    isActive: true,
    description: '15 min • Phone Call • Quick Discovery\nWeekdays, 9 am - 5 pm',
    bookingFields: DEFAULT_BOOKING_FIELDS,
  },
  {
    id: 'evt_60min',
    title: '60 Minute Strategy & Consultation',
    slug: '60min',
    duration: 60,
    locationType: 'google_meet',
    color: '#7C3AED',
    isActive: true,
    description: '60 min • Google Meet • In-Depth Project Review\nWeekdays, 9 am - 5 pm',
    bookingFields: DEFAULT_BOOKING_FIELDS,
  },
];
