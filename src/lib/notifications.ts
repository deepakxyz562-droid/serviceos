import { db } from '@/lib/db';

/**
 * ServiceOS V1.5 — Notification helper library.
 *
 * Backs the AppNotification / NotificationPreference / PushSubscription
 * Prisma models added in V15-1b-SCHEMA. Exposes:
 *   - NOTIFICATION_TYPES / NOTIFICATION_CATEGORIES constants
 *   - createNotification()        — inserts an in-app notification row
 *   - categoryForType()           — derives a category from a notification type
 *   - iconForType()               — maps a type to a lucide icon name + colors
 *   - shouldDeliverNotification() — preference + quiet-hours gating
 *   - getVapidKeys()              — read VAPID public/private keys from env
 */

// ─── Notification types (15) ─────────────────────────────────────────────────
export const NOTIFICATION_TYPES = [
  'lead_assigned',
  'lead_updated',
  'quote_approved',
  'quote_rejected',
  'job_assigned',
  'job_started',
  'technician_on_route',
  'job_completed',
  'invoice_created',
  'invoice_paid',
  'customer_review',
  'employee_login',
  'workflow_executed',
  'reminder',
  'support_ticket_update',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ─── Categories ──────────────────────────────────────────────────────────────
export const NOTIFICATION_CATEGORIES = [
  'lead',
  'job',
  'quote',
  'invoice',
  'customer',
  'employee',
  'workflow',
  'support',
  'system',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

// ─── Priorities ──────────────────────────────────────────────────────────────
export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

// ─── createNotification params ───────────────────────────────────────────────
export interface CreateNotificationParams {
  tenantId: string;
  recipientId: string;
  type: NotificationType | string;
  category?: string;
  title: string;
  message: string;
  metadataJson?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: string;
  senderId?: string;
  senderType?: string;
  /**
   * Optional customer link. When provided, a CustomerTimelineEntry is also
   * created so the notification shows up in Customer 360.
   */
  customerId?: string;
  /** Optional source entity type/id for the timeline entry. */
  sourceType?: string;
  sourceId?: string;
}

/**
 * Insert a single in-app notification for one recipient.
 *
 * This function is safe to call from API routes, background jobs, or
 * server-to-server flows. It DOES NOT throw on failure — it logs and
 * returns null so callers can fire-and-forget.
 *
 * Push delivery is intentionally NOT handled here. Callers that want
 * to fan out to push/email/sms should do so separately after this call
 * (see `shouldDeliverNotification` for preference gating and the
 * existing `/api/notifications/orchestrate` route for multi-channel
 * delivery).
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ id: string } | null> {
  try {
    if (!params.tenantId || !params.recipientId || !params.title || !params.message) {
      console.warn('[notifications] createNotification: missing required fields', {
        tenantId: !!params.tenantId,
        recipientId: !!params.recipientId,
        title: !!params.title,
        message: !!params.message,
      });
      return null;
    }

    const category = params.category || categoryForType(params.type);

    // Serialize metadata once. Allow either a string or an object.
    let metadataJson = '{}';
    if (params.metadataJson) {
      metadataJson =
        typeof params.metadataJson === 'string'
          ? params.metadataJson
          : JSON.stringify(params.metadataJson);
    }

    const notification = await db.appNotification.create({
      data: {
        tenantId: params.tenantId,
        recipientId: params.recipientId,
        type: params.type,
        category,
        title: params.title,
        message: params.message,
        metadataJson,
        actionUrl: params.actionUrl ?? null,
        actionLabel: params.actionLabel ?? null,
        priority: params.priority || 'normal',
        senderId: params.senderId ?? null,
        senderType: params.senderType || 'system',
      },
    });

    // Best-effort: also drop a row into the Customer 360 timeline so
    // the notification shows up chronologically on the customer page.
    if (params.customerId) {
      try {
        await db.customerTimelineEntry.create({
          data: {
            tenantId: params.tenantId,
            customerId: params.customerId,
            entryType: mapTypeToTimelineEntryType(params.type),
            title: params.title,
            description: params.message,
            sourceType: params.sourceType ?? 'AppNotification',
            sourceId: notification.id,
            metadataJson,
            actorId: params.senderId ?? null,
            actorType: params.senderType || 'system',
            eventDate: new Date(),
            isInternal: false,
            isPinned: false,
          },
        });
      } catch (e) {
        // Timeline is best-effort — never fail the notification itself.
        console.warn('[notifications] Failed to create timeline entry:', e);
      }
    }

    return { id: notification.id };
  } catch (err) {
    console.error('[notifications] createNotification failed:', err);
    return null;
  }
}

/**
 * Map a notification `type` to its default `category`.
 * Falls back to "system" for unknown types.
 */
export function categoryForType(type: string): string {
  if (type.startsWith('lead_')) return 'lead';
  if (type.startsWith('quote_')) return 'quote';
  if (type.startsWith('job_') || type === 'technician_on_route') return 'job';
  if (type.startsWith('invoice_')) return 'invoice';
  if (type === 'customer_review') return 'customer';
  if (type === 'employee_login') return 'employee';
  if (type === 'workflow_executed') return 'workflow';
  if (type === 'support_ticket_update') return 'support';
  if (type === 'reminder') return 'system';
  return 'system';
}

/**
 * Map a notification `type` to a lucide icon name + Tailwind color + bg class.
 *
 * `icon` is returned as a STRING (the lucide icon name) so this can be
 * used server-side without importing the icon component. The UI layer
 * maps the string back to a Lucide component via a lookup.
 */
export function iconForType(type: string): {
  icon: string;
  color: string;
  bg: string;
} {
  switch (type) {
    case 'lead_assigned':
    case 'lead_updated':
      return { icon: 'UserPlus', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'quote_approved':
      return { icon: 'CheckCircle2', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'quote_rejected':
      return { icon: 'XCircle', color: 'text-red-600', bg: 'bg-red-50' };
    case 'job_assigned':
      return { icon: 'ClipboardList', color: 'text-violet-600', bg: 'bg-violet-50' };
    case 'job_started':
      return { icon: 'PlayCircle', color: 'text-blue-600', bg: 'bg-blue-50' };
    case 'technician_on_route':
      return { icon: 'Truck', color: 'text-amber-600', bg: 'bg-amber-50' };
    case 'job_completed':
      return { icon: 'CheckCircle', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'invoice_created':
      return { icon: 'FileText', color: 'text-blue-600', bg: 'bg-blue-50' };
    case 'invoice_paid':
      return { icon: 'BadgeDollarSign', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'customer_review':
      return { icon: 'Star', color: 'text-amber-600', bg: 'bg-amber-50' };
    case 'employee_login':
      return { icon: 'LogIn', color: 'text-teal-600', bg: 'bg-teal-50' };
    case 'workflow_executed':
      return { icon: 'Workflow', color: 'text-purple-600', bg: 'bg-purple-50' };
    case 'reminder':
      return { icon: 'Bell', color: 'text-slate-600', bg: 'bg-slate-100' };
    case 'support_ticket_update':
      return { icon: 'LifeBuoy', color: 'text-orange-600', bg: 'bg-orange-50' };
    default:
      return { icon: 'Bell', color: 'text-slate-600', bg: 'bg-slate-100' };
  }
}

/**
 * Map a notification `type` to a CustomerTimelineEntry `entryType`.
 * Keeps the timeline clean by using domain-specific labels.
 */
function mapTypeToTimelineEntryType(type: string): string {
  if (type.startsWith('lead_')) return 'lead';
  if (type.startsWith('quote_')) return 'quote';
  if (type.startsWith('job_') || type === 'technician_on_route') return 'job';
  if (type.startsWith('invoice_')) return 'invoice';
  if (type === 'customer_review') return 'review';
  if (type === 'support_ticket_update') return 'ticket';
  return 'note';
}

/**
 * Decide whether a notification of the given type should be delivered
 * (in-app + push) to the given user, based on their NotificationPreference.
 *
 * Returns `true` when:
 *   1. The user has in-app notifications enabled (the AppNotification row
 *      is always created regardless — this gate is for push delivery and
 *      for skipping quiet-hour types); AND
 *   2. The specific type isn't explicitly disabled in `typePrefsJson`; AND
 *   3. We're not currently inside the user's quiet hours window (urgent
 *      notifications bypass quiet hours).
 */
export async function shouldDeliverNotification(
  userId: string,
  type: string,
  priority: string = 'normal'
): Promise<boolean> {
  try {
    // Urgent notifications always go through, regardless of preferences.
    if (priority === 'urgent') return true;

    const pref = await db.notificationPreference.findFirst({
      where: { userId },
    });

    // No preference row = defaults (everything enabled, no quiet hours).
    if (!pref) return true;

    // In-app is the master switch. If it's off, no delivery at all.
    if (!pref.inAppEnabled) return false;

    // Per-type opt-out. typePrefsJson is `{ "job_completed": false, ... }`.
    if (pref.typePrefsJson) {
      try {
        const typePrefs = JSON.parse(pref.typePrefsJson) as Record<string, boolean>;
        if (type in typePrefs && typePrefs[type] === false) {
          return false;
        }
      } catch {
        // Malformed JSON — ignore and treat as no per-type overrides.
      }
    }

    // Quiet hours — only non-urgent types are gated.
    if (pref.quietHoursStart && pref.quietHoursEnd) {
      const now = new Date();
      // Use the user's configured timezone if Intl is available.
      const tz = pref.quietHoursTz || 'UTC';
      let hour: number;
      let minute: number;
      try {
        const fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const parts = fmt.formatToParts(now);
        const h = parts.find((p) => p.type === 'hour')?.value ?? '0';
        const m = parts.find((p) => p.type === 'minute')?.value ?? '0';
        hour = parseInt(h, 10) % 24;
        minute = parseInt(m, 10);
      } catch {
        hour = now.getHours();
        minute = now.getMinutes();
      }
      const nowMinutes = hour * 60 + minute;
      const [sh, sm] = pref.quietHoursStart.split(':').map((x) => parseInt(x, 10));
      const [eh, em] = pref.quietHoursEnd.split(':').map((x) => parseInt(x, 10));
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        const inQuiet =
          startMinutes <= endMinutes
            ? nowMinutes >= startMinutes && nowMinutes < endMinutes
            : nowMinutes >= startMinutes || nowMinutes < endMinutes;
        if (inQuiet) return false;
      }
    }

    return true;
  } catch (err) {
    console.warn('[notifications] shouldDeliverNotification failed:', err);
    // Fail open — better to deliver an unwanted notification than to miss one.
    return true;
  }
}

/**
 * Read VAPID keys from environment. Returns nulls if not configured so
 * callers can feature-detect (the PWA push card shows a warning).
 */
export function getVapidKeys(): {
  publicKey: string | null;
  privateKey: string | null;
} {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null;
  const privateKey = process.env.VAPID_PRIVATE_KEY || null;
  return { publicKey, privateKey };
}

/**
 * Convenience: does the running server have the VAPID keys it needs to
 * actually send Web Push messages? Used by API routes (e.g. push/subscribe)
 * to 503 gracefully when the operator hasn't configured VAPID yet.
 */
export function isWebPushConfigured(): boolean {
  const { publicKey, privateKey } = getVapidKeys();
  return Boolean(publicKey) && Boolean(privateKey);
}
