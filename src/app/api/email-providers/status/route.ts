import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getProviderStatus } from '@/lib/email-send';

/**
 * GET /api/email-providers/status
 *
 * Returns the two-section email provider status that powers the
 * "Communication Providers" settings screen:
 *
 *   {
 *     systemEmail:   { managed: 'platform', connected, source, ... },
 *     marketingEmail: { connected, defaultProviderId, providers: [...] }
 *   }
 *
 * System Email  = transactional channel managed by the platform
 *                 (password reset, invitations, booking/invoice/payment alerts).
 *                 Always "Managed By Platform" — tenants cannot reconfigure it.
 *
 * Marketing Email = the tenant's OWN campaign channel (SMTP / Resend / SendGrid /
 *                 SES / Mailgun / Brevo). Campaigns are blocked until at least one
 *                 is connected.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Super admins without a tenantId should see the first tenant's status
    let tenantId = user.tenantId;
    if (!tenantId) {
      // For super admins, use the first tenant so getProviderStatus can find real providers
      const { db } = await import('@/lib/db');
      const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
      tenantId = firstTenant?.id || 'default';
    }
    const status = await getProviderStatus(tenantId);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching email provider status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email provider status' },
      { status: 500 }
    );
  }
}
