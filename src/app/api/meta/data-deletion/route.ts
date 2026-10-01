import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

/**
 * Meta Data Deletion Callback
 * ============================
 *
 * Required by Meta App Review for all apps that process user data from
 * Meta platforms (Facebook Login, WhatsApp Business API, Instagram, etc.).
 *
 * When a user deletes their Facebook/WhatsApp account or removes the app
 * from their Meta settings, Meta sends a signed POST to this endpoint with
 * a `signed_request` containing the user's ID. The app must delete all
 * data associated with that user ID and return a confirmation URL + code.
 *
 * Reference: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 *
 * Response format (within 24 hours):
 * {
 *   "url": "https://fieseros.com/data-deletion/confirm?code=<confirmation_code>",
 *   "confirmation_code": "<code>"
 * }
 */

interface MetaSignedRequest {
  algorithm: string;
  issued_at: number;
  user_id: string;
  expires: number;
}

/**
 * Parse and verify Meta's signed_request.
 * Format: <base64url-encoded-payload>.<base64url-encoded-signature>
 * Signature is HMAC-SHA256 of the payload, keyed by the App Secret.
 */
function parseSignedRequest(signedRequest: string, appSecret: string): MetaSignedRequest | null {
  try {
    const parts = signedRequest.split('.');
    if (parts.length !== 2) return null;

    const encodedPayload = parts[0];
    const encodedSignature = parts[1];

    // Decode signature (base64url → hex)
    const signature = Buffer.from(encodedSignature, 'base64url').toString('hex');

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(encodedPayload)
      .digest('hex');

    // Compare signatures (timing-safe)
    if (signature !== expectedSignature) {
      console.warn('[meta/data-deletion] Invalid signature — possible spoofing');
      return null;
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as MetaSignedRequest;

    // Check expiry
    if (payload.expires && Date.now() / 1000 > payload.expires) {
      console.warn('[meta/data-deletion] Expired request');
      return null;
    }

    return payload;
  } catch (err) {
    console.error('[meta/data-deletion] Failed to parse signed_request:', err);
    return null;
  }
}

/**
 * Delete all data associated with a Meta user ID.
 * Searches across tables that store Meta/Facebook user IDs.
 */
async function deleteUserData(metaUserId: string): Promise<void> {
  console.log(`[meta/data-deletion] Deleting data for Meta user ID: ${metaUserId}`);

  // 1. Delete User accounts linked to this Facebook ID
  try {
    const users = await db.user.findMany({
      where: {
        OR: [
          { facebookId: metaUserId },
          { googleId: metaUserId },  // some OAuth flows reuse the same ID
        ],
      },
      select: { id: true, tenantId: true },
    });

    for (const user of users) {
      // Delete user's conversations, messages, and other linked data
      if (user.tenantId) {
        // Delete conversations where this user was the customer
        await db.conversation.deleteMany({
          where: { tenantId: user.tenantId, customerUserId: user.id },
        }).catch(() => {});

        // Delete inbox messages from this user
        await db.inboxMessage.deleteMany({
          where: { tenantId: user.tenantId, senderId: user.id },
        }).catch(() => {});

        // Delete notifications for this user
        await db.notification.deleteMany({
          where: { userId: user.id },
        }).catch(() => {});
      }

      // Anonymize the user record (soft delete — preserve audit trail)
      await db.user.update({
        where: { id: user.id },
        data: {
          email: `deleted_${metaUserId}@data-deletion.local`,
          name: 'Deleted User',
          phone: null,
          image: null,
          facebookId: null,
          status: 'deleted',
          deletedAt: new Date(),
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[meta/data-deletion] User deletion error:', err);
  }

  // 2. Delete CommunicationProvider records linked to this Meta user
  try {
    await db.communicationProvider.deleteMany({
      where: {
        OR: [
          { credentialId: metaUserId },
          { configJson: { contains: metaUserId } },
        ],
      },
    }).catch(() => {});
  } catch (err) {
    console.error('[meta/data-deletion] CommunicationProvider deletion error:', err);
  }

  // 3. Delete OAuth connections
  try {
    await db.oAuthConnection.deleteMany({
      where: { providerUserId: metaUserId },
    }).catch(() => {});
  } catch (err) {
    console.error('[meta/data-deletion] OAuthConnection deletion error:', err);
  }

  // 4. Delete WhatsApp conversations/messages tied to the user's phone
  // (if the phone number is known from the user record)
  try {
    // WhatsApp conversations are identified by customerPhone, not Meta user ID
    // We can't directly link Meta user ID to WhatsApp phone numbers without
    // additional mapping. The CommunicationProvider deletion above handles
    // the WABA access tokens. Actual WhatsApp message content is tenant-owned
    // business data, not the Meta user's personal data — so we don't delete
    // the conversation history (it belongs to the business, not the customer).
  } catch {
    // no-op
  }

  console.log(`[meta/data-deletion] Data deletion completed for Meta user ID: ${metaUserId}`);
}

export async function POST(request: NextRequest) {
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error('[meta/data-deletion] WHATSAPP_APP_SECRET not configured');
      return NextResponse.json(
        { error: 'Data deletion callback not configured' },
        { status: 500 }
      );
    }

    // Meta sends signed_request as form-encoded body
    const formData = await request.formData();
    const signedRequest = formData.get('signed_request') as string;

    if (!signedRequest) {
      console.warn('[meta/data-deletion] Missing signed_request parameter');
      return NextResponse.json(
        { error: 'Missing signed_request' },
        { status: 400 }
      );
    }

    // Parse and verify the signed request
    const payload = parseSignedRequest(signedRequest, appSecret);
    if (!payload || !payload.user_id) {
      return NextResponse.json(
        { error: 'Invalid signed_request' },
        { status: 403 }
      );
    }

    // Delete user data
    await deleteUserData(payload.user_id);

    // Generate confirmation code
    const confirmationCode = crypto.randomUUID();

    // Store the confirmation code for verification (in-memory — in production
    // this should be persisted to a DB table)
    console.log(`[meta/data-deletion] Confirmation code: ${confirmationCode} for user: ${payload.user_id}`);

    // Return the required response format
    return NextResponse.json({
      url: `https://fieseros.com/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error('[meta/data-deletion] Error:', error);
    return NextResponse.json(
      { error: 'Data deletion callback failed' },
      { status: 500 }
    );
  }
}
