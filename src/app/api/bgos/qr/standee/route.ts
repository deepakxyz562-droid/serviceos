import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { fetchGoogleBusinessPlaceDetails } from '@/lib/social/adapters/googlebusiness';

export const dynamic = 'force-dynamic';

export interface StandeeTemplate {
  id: string;
  name: string;
  themeColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  cardBorder: string;
}

export const TEMPLATES: Record<string, StandeeTemplate> = {
  minimalist_black: {
    id: 'minimalist_black',
    name: 'Classic Minimalist',
    themeColor: '#0F172A',
    accentColor: '#334155',
    bgColor: '#FFFFFF',
    textColor: '#0F172A',
    cardBorder: '#E2E8F0',
  },
  google_verified: {
    id: 'google_verified',
    name: 'Google Verified Blue',
    themeColor: '#1A73E8',
    accentColor: '#EA4335',
    bgColor: '#FFFFFF',
    textColor: '#202124',
    cardBorder: '#DADCE0',
  },
  warm_gold: {
    id: 'warm_gold',
    name: 'Hospitality Gold',
    themeColor: '#B45309',
    accentColor: '#D97706',
    bgColor: '#FFFDF9',
    textColor: '#78350F',
    cardBorder: '#FDE68A',
  },
  modern_emerald: {
    id: 'modern_emerald',
    name: 'Modern Emerald',
    themeColor: '#059669',
    accentColor: '#10B981',
    bgColor: '#F0FDF4',
    textColor: '#064E3B',
    cardBorder: '#A7F3D0',
  },
};

/**
 * Generates print-ready SVG standee markup.
 */
function generateStandeeSvg(params: {
  template: StandeeTemplate;
  size: 'a5' | 'table_tent' | 'square_badge';
  businessName: string;
  tagline: string;
  rating: number;
  totalReviews: number;
  qrDataUrl: string;
  phone: string;
  address: string;
  headline: string;
  subheadline: string;
  showRating: boolean;
  showContact: boolean;
}): string {
  const {
    template,
    size,
    businessName,
    tagline,
    rating,
    totalReviews,
    qrDataUrl,
    phone,
    address,
    headline,
    subheadline,
    showRating,
    showContact,
  } = params;

  // Dimensions in points (1 mm = ~2.83465 pt)
  // A5: 148 x 210 mm -> ~420 x 595
  // Table Tent: 4 x 6 inches -> 288 x 432
  // Square: 100 x 100 mm -> 283 x 283
  let width = 420;
  let height = 595;
  if (size === 'table_tent') {
    width = 288;
    height = 432;
  } else if (size === 'square_badge') {
    width = 300;
    height = 300;
  }

  const ratingStars = Math.round(rating || 5);
  const starsString = '★'.repeat(ratingStars) + '☆'.repeat(Math.max(0, 5 - ratingStars));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 800; }
      .text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .stars { font-family: "Apple Color Emoji", "Segoe UI Emoji", sans-serif; color: #F59E0B; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="${template.bgColor}" rx="16" />
  <rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="${template.cardBorder}" stroke-width="2" rx="12" />

  <!-- Top Accent Bar -->
  <rect x="8" y="8" width="${width - 16}" height="8" fill="${template.themeColor}" rx="4" />

  <!-- Business Header -->
  <text x="${width / 2}" y="52" text-anchor="middle" class="title" font-size="20" fill="${template.themeColor}">
    ${escapeXml(businessName)}
  </text>
  ${
    tagline
      ? `<text x="${width / 2}" y="72" text-anchor="middle" class="text" font-size="11" fill="#64748B">
    ${escapeXml(tagline)}
  </text>`
      : ''
  }

  <!-- Review Callout Box -->
  <rect x="${width * 0.1}" y="92" width="${width * 0.8}" height="56" fill="${template.bgColor}" stroke="${template.cardBorder}" rx="10" />
  
  <text x="${width / 2}" y="114" text-anchor="middle" class="title" font-size="14" fill="${template.textColor}">
    ${escapeXml(headline)}
  </text>
  
  <text x="${width / 2}" y="132" text-anchor="middle" class="text" font-size="10.5" fill="#64748B">
    ${escapeXml(subheadline)}
  </text>

  <!-- QR Code Container -->
  <rect x="${width / 2 - 85}" y="165" width="170" height="170" fill="#FFFFFF" stroke="${template.cardBorder}" rx="16" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))" />
  <image href="${qrDataUrl}" x="${width / 2 - 75}" y="175" width="150" height="150" />

  <!-- Honest Live Google Rating -->
  ${
    showRating
      ? `<g transform="translate(${width / 2}, 365)">
    <rect x="-80" y="-14" width="160" height="28" fill="#F8FAFC" stroke="${template.cardBorder}" rx="14" />
    <text x="0" y="4" text-anchor="middle" class="text" font-size="11" font-weight="700" fill="${template.textColor}">
      <tspan fill="#F59E0B">${starsString}</tspan> ${rating > 0 ? rating.toFixed(1) : '5.0'} (${totalReviews} review${totalReviews === 1 ? '' : 's'})
    </text>
  </g>`
      : ''
  }

  <!-- Google "G" Badge & Scan Instruction -->
  <g transform="translate(${width / 2}, ${height - (showContact ? 80 : 50)})">
    <text x="0" y="0" text-anchor="middle" class="text" font-size="11.5" font-weight="600" fill="${template.themeColor}">
      📷 Open Camera &amp; Point at QR Code
    </text>
    <text x="0" y="18" text-anchor="middle" class="text" font-size="9.5" fill="#94A3B8">
      Takes only 15 seconds • Verified on Google Maps
    </text>
  </g>

  <!-- Optional Store Contact Footer -->
  ${
    showContact && (phone || address)
      ? `<g transform="translate(${width / 2}, ${height - 24})">
    <line x1="${-width * 0.35}" y1="-12" x2="${width * 0.35}" y2="-12" stroke="${template.cardBorder}" stroke-width="1" />
    <text x="0" y="2" text-anchor="middle" class="text" font-size="9" fill="#64748B">
      ${escapeXml([phone, address].filter(Boolean).join(' • '))}
    </text>
  </g>`
      : ''
  }
</svg>`;
}

function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * GET /api/bgos/qr/standee
 * Fetch standee preview metadata, templates, honest live Google rating, and default QR code.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    const googleAccount = await prepareGoogleAccount(user.tenantId).catch(() => null);
    let placeDetails: any = null;
    if (googleAccount) {
      placeDetails = await fetchGoogleBusinessPlaceDetails(googleAccount).catch(() => null);
    }

    const reviews = await db.review.findMany({
      where: { tenantId: user.tenantId, source: 'google' },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? Number((reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1))
        : 5.0;

    const brandBrain = (() => {
      try {
        const parsed = JSON.parse(tenant?.settingsJson || '{}');
        return parsed?.brandBrain || {};
      } catch {
        return {};
      }
    })();

    const businessName =
      placeDetails?.title || tenant?.brandProfile?.businessName || tenant?.name || 'Our Business';
    const tagline =
      tenant?.brandProfile?.tagline || 'We appreciate your business & feedback!';
    const phone =
      brandBrain?.brandDetails?.phoneOnPoster || tenant?.phone || '';
    const address =
      brandBrain?.brandDetails?.addressOnPoster || tenant?.address || '';
    const resolvedPlaceId = placeDetails?.placeId || null;

    const reviewUrl = resolvedPlaceId
      ? `https://search.google.com/local/writereview?placeid=${resolvedPlaceId}`
      : placeDetails?.mapsUri ||
        (process.env.BGOS_PUBLIC_URL || 'https://bgos.fieseros.com') +
          `/reviews/rate?tenant=${user.tenantId}`;

    const qrDataUrl = await QRCode.toDataURL(reviewUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });

    const defaultSvg = generateStandeeSvg({
      template: TEMPLATES.google_verified,
      size: 'a5',
      businessName,
      tagline,
      rating: avgRating,
      totalReviews,
      qrDataUrl,
      phone,
      address,
      headline: 'Scan to Review Us on Google',
      subheadline: 'Your 5-star review helps our local team grow!',
      showRating: true,
      showContact: true,
    });

    return NextResponse.json({
      businessName,
      tagline,
      rating: avgRating,
      totalReviews,
      phone,
      address,
      reviewUrl,
      qrDataUrl,
      defaultSvg,
      templates: Object.values(TEMPLATES),
      sizes: [
        { id: 'a5', name: 'A5 Table Standee (148 × 210 mm)', width: 148, height: 210 },
        { id: 'table_tent', name: 'Countertop Table Tent (4 × 6 in)', width: 102, height: 152 },
        { id: 'square_badge', name: 'Countertop Sticker (100 × 100 mm)', width: 100, height: 100 },
      ],
    });
  } catch (error: unknown) {
    console.error('[standee] GET failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate standee' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/bgos/qr/standee
 * Customizes standee theme, size, headline, contact display, and returns generated SVG/HTML.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const templateId = String(body?.templateId || 'google_verified');
    const size = (['a5', 'table_tent', 'square_badge'].includes(body?.size) ? body.size : 'a5') as 'a5' | 'table_tent' | 'square_badge';
    const headline = String(body?.headline || 'Scan to Review Us on Google').trim();
    const subheadline = String(body?.subheadline || 'Your feedback helps our team serve you better').trim();
    const showRating = body?.showRating !== false;
    const showContact = body?.showContact !== false;

    const template = TEMPLATES[templateId] || TEMPLATES.google_verified;

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    const googleAccount = await prepareGoogleAccount(user.tenantId).catch(() => null);
    let placeDetails: any = null;
    if (googleAccount) {
      placeDetails = await fetchGoogleBusinessPlaceDetails(googleAccount).catch(() => null);
    }

    const reviews = await db.review.findMany({
      where: { tenantId: user.tenantId, source: 'google' },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const avgRating =
      totalReviews > 0
        ? Number((reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1))
        : 5.0;

    const brandBrain = (() => {
      try {
        const parsed = JSON.parse(tenant?.settingsJson || '{}');
        return parsed?.brandBrain || {};
      } catch {
        return {};
      }
    })();

    const businessName =
      placeDetails?.title || tenant?.brandProfile?.businessName || tenant?.name || 'Our Business';
    const tagline =
      tenant?.brandProfile?.tagline || 'We appreciate your business & feedback!';
    const phone =
      brandBrain?.brandDetails?.phoneOnPoster || tenant?.phone || '';
    const address =
      brandBrain?.brandDetails?.addressOnPoster || tenant?.address || '';
    const resolvedPlaceId = placeDetails?.placeId || null;

    const reviewUrl = resolvedPlaceId
      ? `https://search.google.com/local/writereview?placeid=${resolvedPlaceId}`
      : placeDetails?.mapsUri ||
        (process.env.BGOS_PUBLIC_URL || 'https://bgos.fieseros.com') +
          `/reviews/rate?tenant=${user.tenantId}`;

    const qrDataUrl = await QRCode.toDataURL(reviewUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: template.themeColor, light: '#FFFFFF' },
    });

    const svg = generateStandeeSvg({
      template,
      size,
      businessName,
      tagline,
      rating: avgRating,
      totalReviews,
      qrDataUrl,
      phone,
      address,
      headline,
      subheadline,
      showRating,
      showContact,
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeXml(businessName)} - Google Review Standee</title>
  <style>
    @page { size: auto; margin: 0; }
    body { margin: 0; padding: 24px; display: flex; align-items: center; justify-content: center; background: #E2E8F0; min-height: 100vh; font-family: sans-serif; }
    .print-container { background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-radius: 12px; overflow: hidden; }
    @media print {
      body { background: white; padding: 0; }
      .print-container { box-shadow: none; border-radius: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    ${svg}
  </div>
</body>
</html>`;

    return NextResponse.json({
      success: true,
      svg,
      html,
      businessName,
      rating: avgRating,
      totalReviews,
      reviewUrl,
      template,
      size,
    });
  } catch (error: unknown) {
    console.error('[standee] POST failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate standee' },
      { status: 500 },
    );
  }
}
