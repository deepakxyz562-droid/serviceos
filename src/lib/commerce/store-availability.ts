/**
 * Store Availability Engine (Zomato / Swiggy Partner App Parity)
 * ==============================================================
 * Determines whether a merchant store / roadside cart is open to take orders.
 *
 * Checks:
 * 1. Master Switch: Merchant manually set store to Open or Closed.
 * 2. Daily Heartbeat / Check-in: If autoCloseIfInactive is true, merchant must
 *    have opened the BOS partner app today (IST time). Small carts / shops that
 *    don't check in automatically go offline so customers don't send money into thin air.
 * 3. Operating Hours: Checks weekly schedule against Indian Standard Time (IST).
 */

export interface StoreAvailability {
  isOpen: boolean;
  reason: string;
  todayHoursText: string;
  isOutsideHours: boolean;
  isDailyInactive: boolean;
  isManuallyClosed: boolean;
  lastActiveDate?: string;
}

export interface DayHourConfig {
  open?: boolean;
  start?: string; // "09:00"
  end?: string;   // "22:00"
}

export type BusinessHoursMap = Record<string, DayHourConfig>;

/**
 * Returns the current date in YYYY-MM-DD format in Indian Standard Time (Asia/Kolkata).
 */
export function getIstCurrentDateStr(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Returns current time "HH:MM" in 24-hr format in Indian Standard Time (Asia/Kolkata).
 */
export function getIstCurrentTimeStr(): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date());
  } catch {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

/**
 * Returns day of week in lowercase ("monday", "tuesday", etc.) in Indian Standard Time.
 */
export function getIstCurrentDayOfWeek(): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'Asia/Kolkata',
    }).format(new Date()).toLowerCase();
  } catch {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }
}

/**
 * Formats "09:00" to "9:00 AM", "22:00" to "10:00 PM"
 */
export function formatTime12h(time24?: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Evaluates live store availability.
 */
export function computeStoreAvailability(params: {
  isStoreOpen?: boolean;
  lastActiveDate?: string;
  autoCloseIfInactive?: boolean;
  manualCloseReason?: string;
  businessHours?: BusinessHoursMap;
  businessName?: string;
}): StoreAvailability {
  const {
    isStoreOpen = true,
    lastActiveDate = '',
    autoCloseIfInactive = true,
    manualCloseReason = '',
    businessHours = {},
    businessName = 'Store',
  } = params;

  const todayIst = getIstCurrentDateStr();
  const timeIst = getIstCurrentTimeStr();
  const dayIst = getIstCurrentDayOfWeek();

  // Resolve today's hours
  const dayKey = dayIst;
  const shortKey = dayIst.slice(0, 3);
  const todayConfig: DayHourConfig | undefined = businessHours[dayKey] || businessHours[shortKey];

  let todayHoursText = 'Open Daily';
  if (todayConfig) {
    if (todayConfig.open === false) {
      todayHoursText = 'Closed Today';
    } else if (todayConfig.start && todayConfig.end) {
      todayHoursText = `${formatTime12h(todayConfig.start)} - ${formatTime12h(todayConfig.end)}`;
    }
  }

  // 1. Check Master Switch
  if (isStoreOpen === false) {
    return {
      isOpen: false,
      reason: manualCloseReason || `${businessName} is currently closed / paused by the merchant.`,
      todayHoursText,
      isOutsideHours: false,
      isDailyInactive: false,
      isManuallyClosed: true,
      lastActiveDate,
    };
  }

  // 2. Check Daily Heartbeat (BOS App Check-in)
  // If merchant has autoClose enabled and hasn't logged in/checked in today, store is offline
  if (autoCloseIfInactive) {
    if (!lastActiveDate || lastActiveDate < todayIst) {
      return {
        isOpen: false,
        reason: `${businessName} hasn't checked in online today. Store is currently offline.`,
        todayHoursText,
        isOutsideHours: false,
        isDailyInactive: true,
        isManuallyClosed: false,
        lastActiveDate,
      };
    }
  }

  // 3. Check Operating Hours (IST)
  if (todayConfig) {
    if (todayConfig.open === false) {
      return {
        isOpen: false,
        reason: `${businessName} is scheduled closed on ${dayIst.charAt(0).toUpperCase() + dayIst.slice(1)}s.`,
        todayHoursText,
        isOutsideHours: true,
        isDailyInactive: false,
        isManuallyClosed: false,
        lastActiveDate,
      };
    }
    if (todayConfig.start && todayConfig.end) {
      if (timeIst < todayConfig.start || timeIst > todayConfig.end) {
        return {
          isOpen: false,
          reason: `${businessName} is closed right now. Operating hours today: ${todayHoursText}.`,
          todayHoursText,
          isOutsideHours: true,
          isDailyInactive: false,
          isManuallyClosed: false,
          lastActiveDate,
        };
      }
    }
  }

  return {
    isOpen: true,
    reason: '',
    todayHoursText,
    isOutsideHours: false,
    isDailyInactive: false,
    isManuallyClosed: false,
    lastActiveDate,
  };
}

/**
 * Computes availability directly from database `gptformCommerceConfig` record.
 */
export function computeStoreAvailabilityFromConfig(config: any, businessName?: string): StoreAvailability {
  if (!config) {
    return {
      isOpen: true,
      reason: '',
      todayHoursText: 'Open Daily',
      isOutsideHours: false,
      isDailyInactive: false,
      isManuallyClosed: false,
    };
  }

  let fields: any = {};
  try {
    if (config.fieldsJson) {
      fields = JSON.parse(config.fieldsJson);
    }
  } catch {}

  let hours: BusinessHoursMap = {};
  try {
    if (config.businessHoursJson) {
      hours = JSON.parse(config.businessHoursJson);
    }
  } catch {}

  return computeStoreAvailability({
    isStoreOpen: fields.isStoreOpen !== undefined ? Boolean(fields.isStoreOpen) : (config.isActive ?? true),
    lastActiveDate: fields.lastActiveDate || '',
    autoCloseIfInactive: fields.autoCloseIfInactive !== undefined ? Boolean(fields.autoCloseIfInactive) : true,
    manualCloseReason: fields.manualCloseReason || '',
    businessHours: hours,
    businessName: businessName || 'Store',
  });
}
