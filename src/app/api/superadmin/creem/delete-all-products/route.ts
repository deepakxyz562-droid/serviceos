import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { deleteAllCreemProducts } from '@/lib/creem-cleanup';

/**
 * POST /api/superadmin/creem/delete-all-products
 *
 * Deletes ALL mapped Creem products + clears the product ID mappings.
 * Used by the superadmin "Delete All + Recreate" button when the admin
 * has duplicate products in Creem and wants to start fresh.
 *
 * Auth: superadmin only. Returns 403 otherwise.
 *
 * Response: { deleted: [...], clearedCount: number }
 */
export async function POST() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 }
      );
    }

    const result = await deleteAllCreemProducts();

    return NextResponse.json(result);
  } catch (error) {
    console.error('[creem/delete-all-products] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete products' },
      { status: 500 }
    );
  }
}
