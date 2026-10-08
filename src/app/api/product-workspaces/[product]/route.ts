import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { activateProductWorkspace, ProductAccessError, resolveProductAccess } from '@/lib/product-access';
import { isProduct } from '../../../../../shared/products';
import { z } from 'zod';

const setup = z.object({ name: z.string().trim().min(1).max(120), country: z.string().regex(/^[A-Z]{2}$/), currency: z.string().regex(/^[A-Z]{3}$/) });
type Context = { params: Promise<{ product: string }> };
async function identity(req: NextRequest, context: Context) {
  if (process.env.PRODUCT_WORKSPACES_ENABLED !== 'true') throw new ProductAccessError('PRODUCT_WORKSPACES_NOT_ENABLED', 503);
  if (!['GET', 'HEAD'].includes(req.method)) {
    const origin = req.headers.get('origin');
    const trusted = ['https://fieseros.com', 'https://www.fieseros.com', 'https://bos.fieseros.com', 'https://chatbotly.fieseros.com', 'https://quoteflow.fieseros.com'];
    if (origin && !trusted.includes(origin) && !(process.env.NODE_ENV !== 'production' && origin === req.nextUrl.origin)) {
      throw new ProductAccessError('ORIGIN_NOT_ALLOWED');
    }
  }
  const { product } = await context.params;
  if (!isProduct(product)) throw new ProductAccessError('UNKNOWN_PRODUCT', 404);
  const user = await getAuthUser(req);
  if (!user || user.role === 'customer') throw new ProductAccessError('UNAUTHENTICATED', 401);
  return { user, product };
}
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof ProductAccessError ? error.code : 'Product workspace unavailable' },
    { status: error instanceof ProductAccessError ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
}
export async function GET(req: NextRequest, context: Context) {
  try {
    const { user, product } = await identity(req, context);
    const access = await resolveProductAccess(user.id, product, req.nextUrl.searchParams.get('workspaceId') || undefined);
    return NextResponse.json(access, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(req: NextRequest, context: Context) {
  try {
    const { user, product } = await identity(req, context);
    const parsed = setup.pick({ name: true }).safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'A business name is required (maximum 120 characters).' }, { status: 400 });
    const workspaceId = await activateProductWorkspace(user.id, product, parsed.data.name);
    return NextResponse.json({ workspaceId }, { status: 201 });
  } catch (error) { return failure(error); }
}
export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { user, product } = await identity(req, context);
    const parsed = setup.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Valid business name, country and currency are required.' }, { status: 400 });
    const access = await resolveProductAccess(user.id, product, req.nextUrl.searchParams.get('workspaceId') || undefined);
    if (!['owner', 'admin'].includes(access.membership.role)) throw new ProductAccessError('OWNER_REQUIRED');
    await db.productWorkspace.update({ where: { workspaceId: access.workspace.workspaceId }, data: {
      profileJson: JSON.stringify(parsed.data), onboardingCompleted: true, onboardingStep: 1,
    } });
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
}
