/**
 * Google Calendar 2-Way Sync
 *
 * G2.2 + G2.3: Fetches busy times from Google Calendar and pushes new
 * bookings to Google Calendar via the googleapis SDK.
 *
 * Flow:
 *   1. OAuth: user connects Google Calendar → stores refresh token on Tenant
 *   2. Fetch busy: slot engine queries Google Calendar for busy times
 *   3. Push events: when a booking is confirmed, creates a Google Calendar event
 */

import { google } from 'googleapis';
import { db } from '@/lib/db';
import { encryptToken, decryptToken } from '@/lib/social/crypto';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com'}/api/auth/google-calendar/callback`;

/**
 * Get the OAuth2 client for Google Calendar.
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

/**
 * Generate the Google Calendar OAuth URL.
 * Redirect the user to this URL to authorize calendar access.
 */
export function getGoogleCalendarAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get a new refresh token
    state,
  });
}

/**
 * Exchange the OAuth code for tokens and store on the tenant.
 */
export async function exchangeGoogleCalendarCode(
  code: string,
  tenantId: string,
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return { success: false, error: 'No refresh token received. User may need to revoke access and re-authorize.' };
    }

    // Get the user's email from the ID token
    let email = '';
    if (tokens.id_token) {
      const ticket = await oauth2Client.verifyIdToken({ idToken: tokens.id_token });
      email = ticket.getPayload()?.email || '';
    }

    // Encrypt the refresh token before storing
    const encryptedToken = encryptToken(tokens.refresh_token);

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        googleCalendarRefreshToken: encryptedToken,
        googleCalendarEmail: email,
        googleCalendarSyncEnabled: true,
      },
    });

    return { success: true, email };
  } catch (error: any) {
    console.error('[google-calendar] Token exchange failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Disconnect Google Calendar sync for a tenant.
 */
export async function disconnectGoogleCalendar(tenantId: string): Promise<void> {
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      googleCalendarRefreshToken: null,
      googleCalendarEmail: null,
      googleCalendarSyncEnabled: false,
    },
  });
}

/**
 * Get an authenticated Google Calendar client for a tenant.
 * Refreshes the access token using the stored refresh token.
 */
async function getCalendarClient(tenantId: string) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      googleCalendarRefreshToken: true,
      googleCalendarSyncEnabled: true,
    },
  });

  if (!tenant?.googleCalendarSyncEnabled || !tenant?.googleCalendarRefreshToken) {
    throw new Error('Google Calendar not connected for this tenant.');
  }

  const refreshToken = decryptToken(tenant.googleCalendarRefreshToken);
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Refresh to get a fresh access token
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Fetch busy times from Google Calendar for a date range.
 *
 * Used by the slot engine to block unavailable times.
 *
 * @param tenantId The tenant ID
 * @param startDate Start of the range (ISO string)
 * @param endDate End of the range (ISO string)
 * @returns Array of { start: Date, end: Date } busy periods
 */
/**
 * Fetch busy times from Google Calendar for a date range across up to 6 work/personal sub-calendars.
 *
 * Used by the slot engine to block unavailable times.
 */
export async function fetchGoogleCalendarBusyTimes(
  tenantId: string,
  startDate: string,
  endDate: string,
  calendarIds?: string[],
): Promise<Array<{ start: Date; end: Date }>> {
  try {
    const connection = await db.tenant.findUnique({ where: { id: tenantId }, select: { googleCalendarSyncEnabled: true } });
    if (!connection?.googleCalendarSyncEnabled) return [];
    const calendar = await getCalendarClient(tenantId);
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { googleCalendarEmail: true, featuresJson: true },
    });

    let targetCalendars = calendarIds && calendarIds.length > 0 ? calendarIds : [];
    if (targetCalendars.length === 0 && tenant?.featuresJson) {
      try {
        const parsed = JSON.parse(tenant.featuresJson);
        if (Array.isArray(parsed.schedulingConflictCalendars) && parsed.schedulingConflictCalendars.length > 0) {
          targetCalendars = parsed.schedulingConflictCalendars;
        }
      } catch {}
    }

    if (targetCalendars.length === 0) {
      targetCalendars = [tenant?.googleCalendarEmail || 'primary'];
    }

    // Query freebusy API across selected sub-calendars (up to 6)
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate,
        timeMax: endDate,
        items: targetCalendars.slice(0, 6).map((id) => ({ id })),
      },
    });

    const busyRanges: Array<{ start: Date; end: Date }> = [];
    const calendarsData = response.data.calendars || {};

    for (const calId of Object.keys(calendarsData)) {
      if (calendarsData[calId]?.errors?.length) throw new Error('A selected Google calendar could not be checked');
      const busyList = calendarsData[calId]?.busy || [];
      for (const period of busyList) {
        if (period.start && period.end) {
          busyRanges.push({
            start: new Date(period.start),
            end: new Date(period.end),
          });
        }
      }
    }

    return busyRanges;
  } catch (error) {
    console.error('[google-calendar] Failed to fetch busy times:', error);
    throw new Error('Connected Google Calendar availability is unavailable');
  }
}

/**
 * Fetch all sub-calendars for the connected Google Account.
 * Allows user to choose which calendars to check for conflicts and which to write to.
 */
export async function fetchUserSubCalendars(tenantId: string): Promise<Array<{
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole?: string;
}>> {
  try {
    const calendar = await getCalendarClient(tenantId);
    const res = await calendar.calendarList.list();
    const items = res.data.items || [];
    return items.map((item) => ({
      id: item.id || '',
      summary: item.summary || 'Untitled Calendar',
      description: item.description || undefined,
      primary: Boolean(item.primary),
      backgroundColor: item.backgroundColor || '#4285F4',
      accessRole: item.accessRole || 'reader',
    }));
  } catch (error) {
    console.error('[google-calendar] Failed to list sub-calendars:', error);
    return [];
  }
}

/**
 * Push a booking to Google Calendar with automatic Google Meet video conferencing generation.
 *
 * Called when a booking is confirmed.
 */
export async function pushBookingToGoogleCalendar(
  tenantId: string,
  booking: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    customerName?: string;
    customerEmail?: string;
    generateMeetingLink?: boolean;
    calendarId?: string;
  },
): Promise<{ eventId: string | null; meetingUrl: string | null }> {
  try {
    const calendar = await getCalendarClient(tenantId);
    const targetCalendarId = booking.calendarId || 'primary';

    const requestBody: any = {
      summary: booking.title,
      description: booking.description || '',
      start: {
        dateTime: booking.startTime.toISOString(),
      },
      end: {
        dateTime: booking.endTime.toISOString(),
      },
      location: booking.location || undefined,
      attendees: booking.customerEmail ? [{ email: booking.customerEmail }] : [],
      reminders: {
        useDefault: true,
      },
    };

    // Auto-generate Google Meet video conference link
    if (booking.generateMeetingLink !== false) {
      requestBody.conferenceData = {
        createRequest: {
          requestId: `meet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const event = await calendar.events.insert({
      calendarId: targetCalendarId,
      conferenceDataVersion: 1,
      requestBody,
    });

    const meetingUrl =
      event.data.hangoutLink ||
      event.data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
      null;

    return {
      eventId: event.data.id || null,
      meetingUrl,
    };
  } catch (error) {
    console.error('[google-calendar] Failed to push booking:', error);
    return { eventId: null, meetingUrl: null };
  }
}

/**
 * Delete a Google Calendar event (for cancellations).
 */
export async function deleteGoogleCalendarEvent(
  tenantId: string,
  eventId: string,
  calendarId = 'primary',
): Promise<boolean> {
  try {
    const calendar = await getCalendarClient(tenantId);
    await calendar.events.delete({
      calendarId,
      eventId,
    });
    return true;
  } catch (error) {
    console.error('[google-calendar] Failed to delete event:', error);
    return false;
  }
}
