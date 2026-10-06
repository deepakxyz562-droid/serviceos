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
  const expected = process.env.SOCIAL_PUBLISH_TOKEN;
  if (!expected) {
    console.error('[social-cron] SOCIAL_PUBLISH_TOKEN is not configured');
    return NextResponse.json(
      { error: 'Social publishing authentication is not configured.' },
      { status: 503 },
    );
  }

  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const provided = request.headers.get('x-social-publish-token') || bearer || '';
  if (!provided || !secretsMatch(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
