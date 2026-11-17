import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export function verifySocialCronAuth(request: NextRequest): NextResponse | null {
  const expectedSocial = process.env.SOCIAL_PUBLISH_TOKEN;
  const expectedCron = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV !== 'production';

  if (!expectedSocial && !expectedCron) {
    if (isDev) return null; // allow in local development test runs
    console.error('[social-cron] Neither SOCIAL_PUBLISH_TOKEN nor CRON_SECRET is configured');
    return NextResponse.json(
      { error: 'Social publishing authentication is not configured.' },
      { status: 503 },
    );
  }

  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const queryToken = new URL(request.url).searchParams.get('token');
  const provided =
    request.headers.get('x-social-publish-token') ||
    request.headers.get('x-cron-secret') ||
    bearer ||
    queryToken ||
    '';

  const matchesSocial = expectedSocial ? secretsMatch(provided, expectedSocial) : false;
  const matchesCron = expectedCron ? secretsMatch(provided, expectedCron) : false;

  if (!provided || (!matchesSocial && !matchesCron)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
