import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Android App Links Digital Asset Links manifest for BGOS (com.fieseros.bgos).
 * Configure BGOS_ANDROID_SHA256_CERT_FINGERPRINTS (comma-separated SHA-256 hex) in server env.
 */
export async function GET() {
  const raw = process.env.BGOS_ANDROID_SHA256_CERT_FINGERPRINTS || '';
  const fingerprints = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const payload =
    fingerprints.length > 0
      ? [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: 'com.fieseros.bgos',
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [];

  return NextResponse.json(payload, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
