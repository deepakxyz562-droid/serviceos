import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/platform/theme — Public endpoint returning platform default theme
// POST /api/platform/theme — SuperAdmin endpoint to persist default theme
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('fieseros_default_theme')?.value;
  const theme = themeCookie || 'light';

  return NextResponse.json(
    { theme },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const theme = body.theme === 'dark' || body.theme === 'system' ? body.theme : 'light';

    const response = NextResponse.json({ success: true, theme });
    
    // Set 1-year cookie for cross-session and SSR default theme
    response.cookies.set({
      name: 'fieseros_default_theme',
      value: theme,
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
      httpOnly: false,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update platform theme' }, { status: 500 });
  }
}
