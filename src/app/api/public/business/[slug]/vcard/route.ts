/**
 * BGOS Public Business Card — downloadable vCard (.vcf) contact endpoint.
 *
 * GET /api/public/business/[slug]/vcard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBgosPublicBusinessProfile } from '@/lib/bgos-public-business';

export const dynamic = 'force-dynamic';

function escapeVcardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const profile = await getBgosPublicBusinessProfile(slug);
    if (!profile) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${escapeVcardValue(profile.businessName)}`,
      `ORG:${escapeVcardValue(profile.businessName)}`,
    ];

    if (profile.category) {
      lines.push(`TITLE:${escapeVcardValue(profile.category)}`);
    }
    if (profile.phone) {
      lines.push(`TEL;TYPE=WORK,VOICE:${profile.phone}`);
    }
    if (profile.email) {
      lines.push(`EMAIL;TYPE=INTERNET:${profile.email}`);
    }

    lines.push(`URL:${profile.website || profile.canonicalUrl}`);

    const adrStreet = profile.address ? escapeVcardValue(profile.address) : '';
    const adrCity = profile.city ? escapeVcardValue(profile.city) : '';
    const adrState = profile.state ? escapeVcardValue(profile.state) : '';
    const adrPostal = profile.postalCode ? escapeVcardValue(profile.postalCode) : '';
    const adrCountry = profile.country ? escapeVcardValue(profile.country) : '';

    if (adrStreet || adrCity || adrState || adrCountry) {
      lines.push(`ADR;TYPE=WORK:;;${adrStreet};${adrCity};${adrState};${adrPostal};${adrCountry}`);
    }

    const noteParts = [profile.tagline, profile.description].filter(Boolean);
    if (noteParts.length > 0) {
      lines.push(`NOTE:${escapeVcardValue(noteParts.join(' — '))}`);
    }

    lines.push('END:VCARD');

    const safeFileName =
      profile.slug
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'business-card';

    return new NextResponse(lines.join('\r\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFileName}.vcf"`,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('[bgos/vcard] Error:', err);
    return NextResponse.json({ error: 'Unable to export contact card' }, { status: 500 });
  }
}
