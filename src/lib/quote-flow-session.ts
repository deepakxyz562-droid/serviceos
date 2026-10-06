import { getAuthUser, verifyToken, verifyTokenWithGrace } from '@/lib/auth';
import { db } from '@/lib/db';
import jwt from 'jsonwebtoken';

function getMobileTokenSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET environment variable is required in production for QuoteFlow mobile authentication. ' +
      'Set it in your production environment variables.'
    );
  }
  return 'quoteflow-mobile-dev-secret';
}

export interface QuoteFlowUser {
  id: string;
  email: string;
  name?: string;
  tenantId?: string;
}

export function signMobileToken(userId: string, email: string): string {
  return jwt.sign({ uid: userId, email }, getMobileTokenSecret(), { expiresIn: '90d' });
}

export function verifyMobileToken(token: string): { uid: string; email: string } | null {
  try {
    return jwt.verify(token, getMobileTokenSecret()) as { uid: string; email: string };
  } catch {
    return null;
  }
}

/**
 * Resolves current user from:
 * 1. Authorization: Bearer <jwt> header from request (mobile app)
 * 2. ServiceOS web session (cookies via getAuthUser)
 * 3. Legacy mobile token in the x-quoteflow-token header.
 */
export async function getQuoteFlowUser(req?: Request): Promise<QuoteFlowUser | null> {
  // 1. Direct Bearer token inspection from req (primary path for mobile app API calls)
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.slice(7).trim();
      if (bearerToken) {
        const user = verifyToken(bearerToken) || verifyTokenWithGrace(bearerToken);
        if (user?.id && user?.email) {
          return {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            tenantId: user.tenantId || undefined,
          };
        }

        const mobilePayload = verifyMobileToken(bearerToken);
        if (mobilePayload?.uid) {
          const mobileUser = await db.user.findUnique({
            where: { id: mobilePayload.uid },
            select: { id: true, email: true, name: true, tenantId: true, isActive: true },
          });
          if (mobileUser?.isActive) {
            return {
              id: mobileUser.id,
              email: mobileUser.email,
              name: mobileUser.name || undefined,
              tenantId: mobileUser.tenantId || undefined,
            };
          }
        }
      }
    }
  }

  // 2. Try web session (cookies / next/headers)
  try {
    const webUser = await getAuthUser();
    if (webUser?.id && webUser?.email) {
      return {
        id: webUser.id,
        email: webUser.email,
        name: webUser.name || undefined,
        tenantId: webUser.tenantId || undefined,
      };
    }
  } catch {
    // Web session check may fail outside request context, proceed to token check
  }

  // 3. Try the legacy mobile header while released clients migrate to Bearer.
  if (req) {
    const token = req.headers.get('x-quoteflow-token');

    if (token) {
      const payload = verifyMobileToken(token);
      if (payload?.uid) {
        const user = await db.user.findUnique({
          where: { id: payload.uid },
          select: { id: true, email: true, name: true, tenantId: true, isActive: true },
        });
        if (user?.isActive) {
          return {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            tenantId: user.tenantId || undefined,
          };
        }
      }
    }
  }

  return null;
}

export async function requireQuoteFlowUser(req?: Request): Promise<QuoteFlowUser> {
  const user = await getQuoteFlowUser(req);
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function getBusinessForUser(userId: string) {
  return db.aiBusiness.findUnique({
    where: { ownerId: userId },
  });
}

const DEFAULT_SYSTEM_TEMPLATES = [
  {
    name: 'Home Services',
    category: 'Home Services',
    suggestedItems: [
      { description: 'Service call & initial diagnosis', qty: 1, unitPrice: 85 },
      { description: 'Standard technician labor (per hr)', qty: 2, unitPrice: 95 },
      { description: 'Parts & materials allowance', qty: 1, unitPrice: 120 },
    ],
    defaultTaxRate: 8,
  },
  {
    name: 'Consulting',
    category: 'Consulting',
    suggestedItems: [{ description: 'Strategy consulting hours', qty: 5, unitPrice: 150 }],
    defaultTaxRate: 0,
  },
  {
    name: 'Web & Digital Services',
    category: 'Web Development',
    suggestedItems: [
      { description: 'Website design & implementation', qty: 1, unitPrice: 1800 },
      { description: 'Responsive mobile optimization', qty: 1, unitPrice: 400 },
      { description: 'Monthly managed maintenance', qty: 1, unitPrice: 150 },
    ],
    defaultTaxRate: 0,
  },
  {
    name: 'Cleaning & Maintenance',
    category: 'Cleaning',
    suggestedItems: [
      { description: 'Deep cleaning service', qty: 1, unitPrice: 180 },
      { description: 'Sanitization & supply fee', qty: 1, unitPrice: 35 },
    ],
    defaultTaxRate: 0,
  },
];

export async function seedSystemTemplates(businessId: string) {
  for (const t of DEFAULT_SYSTEM_TEMPLATES) {
    await db.aiTemplate.create({
      data: {
        businessId,
        name: t.name,
        category: t.category,
        suggestedItems: JSON.stringify(t.suggestedItems),
        defaultTaxRate: t.defaultTaxRate,
        isSystem: true,
      },
    });
  }
}

export async function getOrCreateBusinessForUser(userId: string, tenantId?: string, defaultName = 'My Business') {
  let business = await db.aiBusiness.findUnique({
    where: { ownerId: userId },
  });

  if (!business) {
    business = await db.aiBusiness.create({
      data: {
        ownerId: userId,
        tenantId: tenantId || null,
        name: defaultName,
        currency: 'USD',
        currencySymbol: '$',
        defaultTaxRate: 0,
      },
    });

    // Seed default system templates
    await seedSystemTemplates(business.id);
  }

  return business;
}

export async function requireQuoteFlowBusiness(req?: Request) {
  const user = await requireQuoteFlowUser(req);
  const business = await getOrCreateBusinessForUser(user.id, user.tenantId, user.name ? `${user.name}'s Business` : 'My Business');
  return { user, business };
}

export { round2, computeTotals, formatCurrency } from './quote-flow-calc';
