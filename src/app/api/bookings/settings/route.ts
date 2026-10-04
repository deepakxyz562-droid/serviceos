import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * /api/bookings/settings
 * ─────────────────────────────────────────────────────────────────────────
 * Persistent tenant-level booking + chat preference flags surfaced in the
 * GPTForm mobile app:
 *
 *   - autoConfirm         (boolean)  — instantly confirm new bookings
 *                                      without manual review.
 *   - googleCalendarSync  (boolean)  — toggle 2-way Google Calendar sync.
 *                                      Mirrored onto the dedicated
 *                                      Tenant.googleCalendarSyncEnabled
 *                                      column so the rest of the backend
 *                                      (calendar sync workers, dashboard,
 *                                      /api/settings/google-calendar) sees
 *                                      the same value.
 *   - acceptChats         (boolean)  — whether the tenant currently accepts
 *                                      incoming live-chat sessions. Surfaced
 *                                      from the mobile "More" tab.
 *
 * All three flags live in `Tenant.settingsJson` under a `bookings` /
 * `chat` namespace so they round-trip cleanly through the existing JSON
 * blob without a schema migration. The `googleCalendarSync` flag is also
 * written to its dedicated Boolean column for back-compat with backend
 * services that already read `Tenant.googleCalendarSyncEnabled` directly.
 *
 * Auth: any authenticated tenant user (owner/staff/admin). Customer
 * accounts receive 403 — these are workspace-level preferences.
 */

const DEFAULTS = {
  autoConfirm: true,
  googleCalendarSync: false,
  acceptChats: true,
} as const;

function readSettingsJson(raw: string | null | undefined): {
  autoConfirm?: boolean;
  googleCalendarSync?: boolean;
  acceptChats?: boolean;
  [k: string]: any;
} {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function safeBool(val: unknown): boolean | undefined {
  return typeof val === 'boolean' ? val : undefined;
}

/**
 * GET /api/bookings/settings
 * Response: { autoConfirm, googleCalendarSync, acceptChats }
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }
    if (user.role === 'customer') {
      return NextResponse.json(
        { error: 'Not available for customer accounts.' },
        { status: 403 },
      );
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true, googleCalendarSyncEnabled: true },
    }).catch(() => null);

    const parsed = readSettingsJson(tenant?.settingsJson);
    const bookings = parsed.bookings || {};
    const chat = parsed.chat || {};

    return NextResponse.json({
      autoConfirm:
        typeof bookings.autoConfirm === 'boolean'
          ? bookings.autoConfirm
          : DEFAULTS.autoConfirm,
      googleCalendarSync:
        typeof bookings.googleCalendarSync === 'boolean'
          ? bookings.googleCalendarSync
          : !!tenant?.googleCalendarSyncEnabled,
      acceptChats:
        typeof chat.acceptChats === 'boolean'
          ? chat.acceptChats
          : DEFAULTS.acceptChats,
    });
  } catch (error) {
    console.error('[bookings/settings] GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to load booking settings' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/bookings/settings
 * Body (any subset): { autoConfirm?: boolean, googleCalendarSync?: boolean, acceptChats?: boolean }
 * Response: { autoConfirm, googleCalendarSync, acceptChats } (full merged state)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
    }
    if (user.role === 'customer') {
      return NextResponse.json(
        { error: 'Not available for customer accounts.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const autoConfirm = safeBool(body.autoConfirm);
    const googleCalendarSync = safeBool(body.googleCalendarSync);
    const acceptChats = safeBool(body.acceptChats);

    if (
      autoConfirm === undefined &&
      googleCalendarSync === undefined &&
      acceptChats === undefined
    ) {
      return NextResponse.json(
        { error: 'No updatable fields provided' },
        { status: 400 },
      );
    }

    // Fetch current row to merge settingsJson safely (read-modify-write).
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true, googleCalendarSyncEnabled: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const parsed = readSettingsJson(tenant.settingsJson);
    const bookings = parsed.bookings && typeof parsed.bookings === 'object'
      ? { ...parsed.bookings }
      : {};
    const chat = parsed.chat && typeof parsed.chat === 'object'
      ? { ...parsed.chat }
      : {};

    if (autoConfirm !== undefined) bookings.autoConfirm = autoConfirm;
    if (googleCalendarSync !== undefined) bookings.googleCalendarSync = googleCalendarSync;
    if (acceptChats !== undefined) chat.acceptChats = acceptChats;

    parsed.bookings = bookings;
    parsed.chat = chat;

    // Build the Prisma update patch. The settingsJson column is always
    // overwritten with the merged JSON string. The googleCalendarSyncEnabled
    // boolean column is also mirrored (best-effort — only update if a value
    // was explicitly provided) so the existing /api/settings/google-calendar
    // route and the calendar sync worker see the same state.
    const data: any = {
      settingsJson: JSON.stringify(parsed),
    };
    if (googleCalendarSync !== undefined) {
      data.googleCalendarSyncEnabled = googleCalendarSync;
    }

    const updated = await db.tenant.update({
      where: { id: user.tenantId },
      data,
      select: { settingsJson: true, googleCalendarSyncEnabled: true },
    });

    // Audit log — non-fatal if it fails.
    const changed: string[] = [];
    if (autoConfirm !== undefined) changed.push(`autoConfirm=${autoConfirm}`);
    if (googleCalendarSync !== undefined) changed.push(`googleCalendarSync=${googleCalendarSync}`);
    if (acceptChats !== undefined) changed.push(`acceptChats=${acceptChats}`);
    try {
      await logActivity({
        tenantId: user.tenantId,
        actorId: user.id,
        actorName: user.name ?? user.email,
        actorType: 'user',
        action: 'settings.update',
        entityType: 'tenant',
        entityId: user.tenantId,
        entityName: 'Booking & Chat Preferences',
        description: `Updated booking/chat settings: ${changed.join(', ')}`,
        metadataJson: JSON.stringify({ autoConfirm, googleCalendarSync, acceptChats }),
        severity: 'info',
      });
    } catch (logErr) {
      console.error('[bookings/settings] logActivity failed:', logErr);
    }

    const nextParsed = readSettingsJson(updated.settingsJson);
    const nextBookings = nextParsed.bookings || {};
    const nextChat = nextParsed.chat || {};

    return NextResponse.json({
      autoConfirm:
        typeof nextBookings.autoConfirm === 'boolean'
          ? nextBookings.autoConfirm
          : DEFAULTS.autoConfirm,
      googleCalendarSync:
        typeof nextBookings.googleCalendarSync === 'boolean'
          ? nextBookings.googleCalendarSync
          : !!updated.googleCalendarSyncEnabled,
      acceptChats:
        typeof nextChat.acceptChats === 'boolean'
          ? nextChat.acceptChats
          : DEFAULTS.acceptChats,
    });
  } catch (error) {
    console.error('[bookings/settings] PATCH failed:', error);
    return NextResponse.json(
      { error: 'Failed to update booking settings' },
      { status: 500 },
    );
  }
}
