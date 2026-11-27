import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * iOS Universal Links association manifest for BGOS (com.fieseros.bgos).
 * Activated automatically once BGOS_APPLE_TEAM_ID is configured in server env.
 */
export async function GET() {
  const teamId = (process.env.BGOS_APPLE_TEAM_ID || process.env.APPLE_TEAM_ID || '').trim();
  const appId = teamId ? `${teamId}.com.fieseros.bgos` : null;

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: appId
          ? [
              {
                appID: appId,
                paths: ['/open', '/open/*'],
              },
            ]
          : [],
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}
