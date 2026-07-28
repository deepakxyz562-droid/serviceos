import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { MENU_CATALOG } from '@/lib/menu-catalog';

// Re-export for backward compatibility (in case other code imports from here).
// The canonical source is now `src/lib/menu-catalog.ts`.
export const DEFAULT_MENU_ITEMS = MENU_CATALOG;

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
  }

  return NextResponse.json({
    items: MENU_CATALOG.map((item) => ({
      ...item,
      id: `default_${item.key}`,
      enabled: true,
    })),
  });
}
