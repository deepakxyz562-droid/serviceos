import { NextRequest, NextResponse } from 'next/server';
import { testCredential } from '@/lib/credential-crypto';

/**
 * POST /api/credentials/test
 *
 * Tests a credential BEFORE saving it by making a real (read-only) API call
 * to the corresponding provider.
 *
 * Request body:
 *   { name?: string, type: string, data: Record<string, any> }
 *
 * Response:
 *   { success: boolean, message: string, details?: any }
 *
 * This endpoint does NOT touch the database — it only validates the supplied
 * raw credential data against the provider's API.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.type) {
      return NextResponse.json(
        { error: 'Credential type is required' },
        { status: 400 }
      );
    }

    const result = await testCredential(body.type, body.data || {});

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to test credential';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
