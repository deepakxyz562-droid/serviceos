import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { signMobileToken, getOrCreateBusinessForUser } from '@/lib/quote-flow-session';

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().optional(),
  googleId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { email, name, avatar, googleId } = parsed.data;
    const lower = email.toLowerCase();
    let user = await db.user.findUnique({ where: { email: lower } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: lower,
          name: name || lower.split('@')[0],
          avatar: avatar || null,
          role: 'owner',
          authProvider: 'google',
          authProviderId: googleId || null,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    } else if (!user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    const business = await getOrCreateBusinessForUser(user.id, user.tenantId || undefined, user.name || 'My Business');
    const token = signMobileToken(user.id, user.email);

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
      business,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
