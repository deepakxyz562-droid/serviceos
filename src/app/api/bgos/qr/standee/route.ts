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

const TEMPLATES: Record<string, StandeeTemplate> = {
  google_grexa_standee: {
    id: 'google_grexa_standee',
    name: 'Google Official Wave (With Logo)',
    themeColor: '#1A73E8',
    accentColor: '#EA4335',
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
  minimalist_black: {
    id: 'minimalist_black',
    name: 'Classic Minimalist',
    themeColor: '#0F172A',
    accentColor: '#334155',
    bgColor: '#FFFFFF',
    textColor: '#0F172A',
    cardBorder: '#E2E8F0',
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
 * Generates Grexa-style Google Premier Standee with 4-color wave background,
 * central card, top Google G badge + 5 stars, "Scan to Rate Us on Google",
 * business name, Google 4-color corner framing brackets around QR code,
 * and bottom "Powered By [Logo]" branding.
 */
function generateGrexaGoogleStandeeSvg(params: {
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
  logoUrl?: string | null;
}): string {
  const {
    size,
    businessName,
    rating,
    totalReviews,
    qrDataUrl,
    phone,
    address,
    showRating,
    showContact,
    logoUrl,
  } = params;

  let width = 420;
  let height = 595;
  if (size === 'table_tent') {
    width = 288;
    height = 432;
  } else if (size === 'square_badge') {
    width = 320;
    height = 320;
  }

  const cardMargin = 22;
  const cardWidth = width - (cardMargin * 2);
  const cardHeight = height - (cardMargin * 2);
  const cardX = cardMargin;
  const cardY = cardMargin;

  const isSquare = size === 'square_badge';
  const qrBoxSize = isSquare ? 140 : size === 'table_tent' ? 148 : 176;
  const qrX = width / 2 - (qrBoxSize / 2);
  const qrY = isSquare ? 98 : size === 'table_tent' ? 134 : 178;

  const bracketPad = 12;
  const bLeft = qrX - bracketPad;
  const bRight = qrX + qrBoxSize + bracketPad;
  const bTop = qrY - bracketPad;
  const bBottom = qrY + qrBoxSize + bracketPad;
  const bLen = isSquare ? 20 : 26;
  const bRadius = 12;

  const badgeY = cardY + 4;
  const badgeR = isSquare ? 24 : 28;

  const starsY = badgeY + badgeR + (isSquare ? 16 : 22);
  const headlineY = starsY + (isSquare ? 20 : 26);
  const bNameY = headlineY + (isSquare ? 22 : 26);

  const poweredByY = bBottom + (showRating ? (isSquare ? 26 : 34) : (isSquare ? 18 : 22));
  const logoY = poweredByY + 8;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; font-weight: 800; }
      .text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; }
    </style>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#000000" flood-opacity="0.14" />
    </filter>
    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.12" />
    </filter>
    <clipPath id="standeeClip">
      <rect width="${width}" height="${height}" rx="18" />
    </clipPath>
  </defs>

  <!-- Outer clipped frame -->
  <g clip-path="url(#standeeClip)">
    <rect width="${width}" height="${height}" fill="#F8FAFC" />

    <!-- Google 4-Color Wave Organic Shapes -->
    <!-- Top Yellow Wave -->
    <path d="M 0 0 L ${width} 0 L ${width} ${height * 0.3} Q ${width * 0.52} ${height * 0.22} 0 ${height * 0.26} Z" fill="#FBBC05" />
    
    <!-- Top Red Wave Overlap -->
    <path d="M ${width * 0.38} 0 L ${width} 0 L ${width} ${height * 0.36} Q ${width * 0.65} ${height * 0.16} ${width * 0.38} 0 Z" fill="#EA4335" />

    <!-- Bottom-Left Green Wave -->
    <path d="M 0 ${height * 0.68} Q ${width * 0.32} ${height * 0.74} ${width * 0.36} ${height} L 0 ${height} Z" fill="#34A853" />

    <!-- Bottom-Right Blue Wave -->
    <path d="M ${width * 0.52} ${height} Q ${width * 0.68} ${height * 0.76} ${width} ${height * 0.72} L ${width} ${height} Z" fill="#4285F4" />

    <!-- Central White Card -->
    <rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="24" fill="#FFFFFF" filter="url(#cardShadow)" />

    <!-- Floating Top Center Circle Badge -->
    <circle cx="${width / 2}" cy="${badgeY}" r="${badgeR}" fill="#FFFFFF" filter="url(#badgeShadow)" />
    <circle cx="${width / 2}" cy="${badgeY}" r="${badgeR}" fill="#FFFFFF" stroke="#F1F5F9" stroke-width="1.5" />

    <!-- Google 'G' 4-Color Vector -->
    <g transform="translate(${width / 2 - 14}, ${badgeY - 14}) scale(${badgeR / 20})">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.34 24 12 24z" />
      <path fill="#FBBC05" d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.57H1.25C.45 8.15 0 9.99 0 12s.45 3.85 1.25 5.43l4.03-3.14z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z" />
    </g>

    <!-- 5 Golden Review Stars -->
    <text x="${width / 2}" y="${starsY}" text-anchor="middle" font-size="${isSquare ? 12 : 14}" fill="#FBBC05" letter-spacing="3">★ ★ ★ ★ ★</text>

    <!-- Headline: Scan to Rate Us on Google -->
    <text x="${width / 2}" y="${headlineY}" text-anchor="middle" class="title" font-size="${isSquare ? 13 : 16}" fill="#1E293B">
      Scan to Rate Us on <tspan fill="#4285F4">G</tspan><tspan fill="#EA4335">o</tspan><tspan fill="#FBBC05">o</tspan><tspan fill="#4285F4">g</tspan><tspan fill="#34A853">l</tspan><tspan fill="#EA4335">e</tspan>
    </text>

    <!-- Business Logo (if uploaded) or Business Name -->
    ${
      logoUrl
        ? `<image href="${escapeXml(logoUrl)}" x="${width / 2 - 45}" y="${headlineY + 8}" width="90" height="26" preserveAspectRatio="xMidYMid meet" />
    <text x="${width / 2}" y="${bNameY + 14}" text-anchor="middle" class="title" font-size="${isSquare ? 13 : 16}" font-weight="900" fill="#0F172A">
      ${escapeXml(businessName)}
    </text>`
        : `<text x="${width / 2}" y="${bNameY}" text-anchor="middle" class="title" font-size="${isSquare ? 15 : 18}" font-weight="900" fill="#0F172A">
      ${escapeXml(businessName)}
    </text>`
    }

    <!-- 4 Google Corner Brackets around QR code -->
    <!-- Top-Left Bracket (Red) -->
    <path d="M ${bLeft} ${bTop + bLen} L ${bLeft} ${bTop + bRadius} A ${bRadius} ${bRadius} 0 0 1 ${bLeft + bRadius} ${bTop} L ${bLeft + bLen} ${bTop}" fill="none" stroke="#EA4335" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Top-Right Bracket (Blue) -->
    <path d="M ${bRight - bLen} ${bTop} L ${bRight - bRadius} ${bTop} A ${bRadius} ${bRadius} 0 0 1 ${bRight} ${bTop + bRadius} L ${bRight} ${bTop + bLen}" fill="none" stroke="#4285F4" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Bottom-Left Bracket (Yellow) -->
    <path d="M ${bLeft} ${bBottom - bLen} L ${bLeft} ${bBottom - bRadius} A ${bRadius} ${bRadius} 0 0 0 ${bLeft + bRadius} ${bBottom} L ${bLeft + bLen} ${bBottom}" fill="none" stroke="#FBBC05" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Bottom-Right Bracket (Green) -->
    <path d="M ${bRight - bLen} ${bBottom} L ${bRight - bRadius} ${bBottom} A ${bRadius} ${bRadius} 0 0 0 ${bRight} ${bBottom - bRadius} L ${bRight} ${bBottom - bLen}" fill="none" stroke="#34A853" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Centered QR Code Image -->
    <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrBoxSize}" height="${qrBoxSize}" />

    <!-- Honest Live Google Rating (Optional) -->
    ${
      showRating
        ? `<text x="${width / 2}" y="${bBottom + (isSquare ? 16 : 20)}" text-anchor="middle" class="text" font-size="10.5" font-weight="700" fill="#475569">
      <tspan fill="#F59E0B">★</tspan> ${rating > 0 ? rating.toFixed(1) : '5.0'} (${totalReviews} review${totalReviews === 1 ? '' : 's'})
    </text>`
        : ''
    }

    <!-- Powered By Text -->
    <text x="${width / 2}" y="${poweredByY}" text-anchor="middle" class="text" font-size="${isSquare ? 9.5 : 10.5}" font-weight="600" fill="#64748B">
      Powered By
    </text>

    <!-- Official BGOS Logo with Icon Lockup -->
    <g transform="translate(${width / 2 - 47}, ${logoY})">
      <defs>
        <linearGradient id="bgosGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00A859" />
          <stop offset="100%" stop-color="#0B9042" />
        </linearGradient>
      </defs>
      <!-- Subtle Pill Container -->
      <rect x="-6" y="-3" width="94" height="28" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
      <!-- BGOS Emerald Squircle Icon Mark -->
      <rect width="22" height="22" rx="6" fill="url(#bgosGrad)" />
      <!-- White Stylized Growth 'b' & Arrow Mark -->
      <rect x="5" y="4.5" width="2.4" height="13" rx="1.2" fill="#FFFFFF" />
      <path d="M 7 11 C 9 9.5, 13.5 10.5, 13.5 13.5 C 13.5 16.5, 9 17.5, 7 16" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" />
      <path d="M 11.5 7 L 16 4.5 M 16 4.5 L 13 4.5 M 16 4.5 L 16 7.5" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <!-- BGOS Wordmark -->
      <text x="28" y="16.5" class="title" font-size="14.5" font-weight="900" letter-spacing="-0.3" fill="#0F172A">BGOS</text>
    </g>

    <!-- Optional Contact Footer -->
    ${
      showContact && (phone || address) && !isSquare
        ? `<text x="${width / 2}" y="${cardY + cardHeight - 12}" text-anchor="middle" class="text" font-size="8.5" fill="#94A3B8">
      ${escapeXml([phone, address].filter(Boolean).join(' • '))}
    </text>`
        : ''
    }
  </g>
</svg>`;
}

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
  logoUrl?: string | null;
}): string {
  if (params.template.id === 'google_grexa_standee') {
    return generateGrexaGoogleStandeeSvg(params);
  }
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

function buildStandeePrintableHtml(businessName: string, svg: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeXml(businessName)} - Printable QR Standee</title>
  <style>
    @page { size: auto; margin: 0; }
    body { margin: 0; padding: 24px; display: flex; flex-direction: column; gap: 16px; align-items: center; justify-content: center; background: #E2E8F0; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    .toolbar { display: flex; gap: 10px; align-items: center; }
    .print-btn { background: #009F50; color: #fff; border: 0; padding: 10px 18px; border-radius: 999px; font-weight: 700; cursor: pointer; font-size: 14px; }
    .print-container { background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-radius: 12px; overflow: hidden; max-width: 100%; }
    .print-container svg { display: block; max-width: 100%; height: auto; }
    @media print {
      body { background: white; padding: 0; }
      .print-container { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="print-container">
    ${svg}
  </div>
</body>
</html>`;
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

    const parsedSettings = (() => {
      try {
        return JSON.parse(tenant?.settingsJson || '{}');
      } catch {
        return {};
      }
    })();
    const brandBrain = parsedSettings?.brandBrain || {};

    const businessName =
      placeDetails?.title || tenant?.brandProfile?.businessName || tenant?.name || 'Our Business';
    const tagline =
      tenant?.tagline || brandBrain?.brandDetails?.tagline || 'We appreciate your business & feedback!';
    const phone =
      brandBrain?.brandDetails?.phoneOnPoster || tenant?.phone || '';
    const address =
      brandBrain?.brandDetails?.addressOnPoster || tenant?.address || '';
    const resolvedPlaceId = placeDetails?.placeId || tenant?.googlePlaceId || null;

    const origin = (process.env.BGOS_PUBLIC_URL || 'https://bgos.fieseros.com').replace(/\/+$/, '');
    const publicSlug =
      parsedSettings?.bookingPageConfig?.publicSlug ||
      tenant?.publicSlug ||
      tenant?.slug ||
      user.tenantId;
    const pageUrl = `${origin}/b/${encodeURIComponent(publicSlug)}`;
    const reviewUrl = resolvedPlaceId
      ? `https://search.google.com/local/writereview?placeid=${resolvedPlaceId}`
      : placeDetails?.mapsUri || pageUrl;
    const mapsUrl =
      placeDetails?.mapsUri ||
      (resolvedPlaceId
        ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(resolvedPlaceId)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${businessName} ${address}`.trim())}`);

    const searchParams = new URL(request.url).searchParams;
    const targetParam = searchParams.get('target');
    const target = targetParam === 'page' || targetParam === 'maps' ? targetParam : 'review';
    const formatParam = searchParams.get('format');
    const reqTemplateId = searchParams.get('templateId') || 'google_grexa_standee';
    const reqSizeParam = searchParams.get('size');
    const reqSize = (reqSizeParam === 'table_tent' || reqSizeParam === 'square_badge' ? reqSizeParam : 'a5') as 'a5' | 'table_tent' | 'square_badge';
    const reqTemplate = TEMPLATES[reqTemplateId] || TEMPLATES.google_grexa_standee || TEMPLATES.google_verified;
    const reqShowRating = searchParams.get('showRating') !== 'false';
    const reqShowContact = searchParams.get('showContact') !== 'false';
    const activeTargetUrl =
      target === 'page' ? pageUrl : target === 'maps' ? mapsUrl : reviewUrl;

    const [qrReviewUrl, qrPageUrl, qrMapsUrl] = await Promise.all([
      QRCode.toDataURL(reviewUrl, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#0F172A', light: '#FFFFFF' },
      }),
      QRCode.toDataURL(pageUrl, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#0F172A', light: '#FFFFFF' },
      }),
      QRCode.toDataURL(mapsUrl, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#0F172A', light: '#FFFFFF' },
      }),
    ]);

    const qrDataUrl =
      target === 'page' ? qrPageUrl : target === 'maps' ? qrMapsUrl : qrReviewUrl;

    const logoUrl = parsedSettings?.bookingPageConfig?.logoUrl || brandBrain?.brandDetails?.logoUrl || tenant?.logo || null;

    const defaultHeadline =
      searchParams.get('headline') ||
      (target === 'page'
        ? 'Scan to Book & Order Online'
        : target === 'maps'
          ? 'Scan to View Us on Google Maps'
          : 'Scan to Review Us on Google');
    const defaultSubheadline =
      searchParams.get('subheadline') ||
      (target === 'page'
        ? 'View services, products, hours & chat with us!'
        : 'Your 5-star review helps our local team grow!');

    const defaultSvg = generateStandeeSvg({
      template: reqTemplate,
      size: reqSize,
      businessName,
      tagline,
      rating: avgRating,
      totalReviews,
      qrDataUrl,
      phone,
      address,
      headline: defaultHeadline,
      subheadline: defaultSubheadline,
      showRating: reqShowRating,
      showContact: reqShowContact,
      logoUrl,
    });

    if (formatParam === 'html') {
      return new NextResponse(buildStandeePrintableHtml(businessName, defaultSvg), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return NextResponse.json({
      businessName,
      tagline,
      rating: avgRating,
      totalReviews,
      phone,
      address,
      reviewUrl: activeTargetUrl,
      pageUrl,
      mapsUrl,
      qrDataUrl,
      targets: {
        review: {
          url: reviewUrl,
          qrDataUrl: qrReviewUrl,
          headline: 'Scan to Review Us on Google',
          subheadline: 'Your 5-star review helps our local team grow!',
        },
        page: {
          url: pageUrl,
          qrDataUrl: qrPageUrl,
          headline: 'Scan to Book & Order Online',
          subheadline: 'Browse services, products & chat instantly!',
        },
        maps: {
          url: mapsUrl,
          qrDataUrl: qrMapsUrl,
          headline: 'Scan to Find Us on Google Maps',
          subheadline: 'Directions, photos, hours & Google profile',
        },
      },
      defaultSvg,
      logoUrl,
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
    const templateId = String(body?.templateId || 'google_grexa_standee');
    const size = (['a5', 'table_tent', 'square_badge'].includes(body?.size) ? body.size : 'a5') as 'a5' | 'table_tent' | 'square_badge';
    const headline = String(body?.headline || 'Scan to Review Us on Google').trim();
    const subheadline = String(body?.subheadline || 'Your feedback helps our team serve you better').trim();
    const showRating = body?.showRating !== false;
    const showContact = body?.showContact !== false;

    const template = TEMPLATES[templateId] || TEMPLATES.google_grexa_standee || TEMPLATES.google_verified;

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

    const parsedSettings = (() => {
      try {
        return JSON.parse(tenant?.settingsJson || '{}');
      } catch {
        return {};
      }
    })();
    const brandBrain = parsedSettings?.brandBrain || {};

    const businessName =
      placeDetails?.title || tenant?.brandProfile?.businessName || tenant?.name || 'Our Business';
    const tagline =
      tenant?.tagline || brandBrain?.brandDetails?.tagline || 'We appreciate your business & feedback!';
    const phone =
      brandBrain?.brandDetails?.phoneOnPoster || tenant?.phone || '';
    const address =
      brandBrain?.brandDetails?.addressOnPoster || tenant?.address || '';
    const resolvedPlaceId = placeDetails?.placeId || tenant?.googlePlaceId || null;

    const origin = (process.env.BGOS_PUBLIC_URL || 'https://bgos.fieseros.com').replace(/\/+$/, '');
    const publicSlug =
      parsedSettings?.bookingPageConfig?.publicSlug ||
      tenant?.publicSlug ||
      tenant?.slug ||
      user.tenantId;
    const pageUrl = `${origin}/b/${encodeURIComponent(publicSlug)}`;
    const reviewUrl = resolvedPlaceId
      ? `https://search.google.com/local/writereview?placeid=${resolvedPlaceId}`
      : placeDetails?.mapsUri || pageUrl;
    const mapsUrl =
      placeDetails?.mapsUri ||
      (resolvedPlaceId
        ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(resolvedPlaceId)}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${businessName} ${address}`.trim())}`);
    const target = body?.target === 'page' || body?.target === 'maps' ? body.target : 'review';
    const chosenUrl = target === 'page' ? pageUrl : target === 'maps' ? mapsUrl : reviewUrl;

    const qrDataUrl = await QRCode.toDataURL(chosenUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: template.themeColor, light: '#FFFFFF' },
    });

    const logoUrl = body?.logoUrl !== undefined ? body.logoUrl : (brandBrain?.brandDetails?.logoUrl || null);

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
      logoUrl,
    });

    const html = buildStandeePrintableHtml(businessName, svg);

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
