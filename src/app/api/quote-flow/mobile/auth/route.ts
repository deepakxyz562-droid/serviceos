import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { signMobileToken, getOrCreateBusinessForUser } from '@/lib/quote-flow-session';
import { authLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

/**
 * Mobile-friendly auth endpoint.
 * POST /api/quote-flow/mobile/auth
 *   { email, password, name? } -> { token, user, business }
 */
export async function POST(req: Request) {
  try {
    const rateLimited = applyRateLimit(authLimiter, req);
    if (rateLimited) return rateLimitResponse(rateLimited.resetAtMs);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, password, name } = parsed.data;
    const lower = email.toLowerCase().trim();
    let user = await db.user.findUnique({ where: { email: lower } });
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await db.user.create({
        data: {
          email: lower,
          passwordHash,
          name: name?.trim() || lower.split('@')[0],
        },
      });
    } else {
      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Account is deactivated. Please contact support.' },
          { status: 403 }
        );
      }
      if (!user.passwordHash) {
        return NextResponse.json(
          { error: 'This account does not have a password set. Please log in using Google or reset your password.' },
          { status: 401 }
        );
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    const business = await getOrCreateBusinessForUser(user.id, user.tenantId || undefined, user.name || 'My Business');
    const token = signMobileToken(user.id, user.email);

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
      business,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Authentication failed' }, { status: 500 });
  }
}
