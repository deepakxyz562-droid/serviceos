import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getQuoteFlowUser } from '@/lib/quote-flow-session';
import { resolveTenantBlueprint, getCountryPack } from '@/lib/blueprint';
import { isGptFormWorkspace } from '../../../../../shared/product-context';
/** Provision the merchant record only after authenticating the product workspace. */
export async function POST(req: Request) {
    try {
        const identity = await getQuoteFlowUser(req);
        if (!identity)
            return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
        const user = await db.user.findUnique({ where: { id: identity.id }, include: { tenant: true, workspace: true } });
        if (!user?.isActive)
            return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
        if (!isGptFormWorkspace({ user, tenant: user.tenant, workspace: user.workspace }))
            return NextResponse.json({ error: 'This account belongs to Fieseros CRM. Its workspace needs to be reviewed before using Chatbotly.', code: 'PRODUCT_MISMATCH' }, { status: 409 });
        if (!['owner', 'standalone_user'].includes(user.role))
            return NextResponse.json({ error: 'Ask the business owner to finish setup.' }, { status: 403 });
        const blueprint = resolveTenantBlueprint(user.tenant);
        const pack = getCountryPack(blueprint.country);
        let business = await db.aiBusiness.findUnique({ where: { ownerId: user.id } });
        if (!business) {
            try {
                business = await db.aiBusiness.create({ data: { ownerId: user.id, tenantId: user.tenantId, name: user.tenant?.name || user.name || 'My business', currency: pack.currency.code, currencySymbol: pack.currency.symbol } });
            }
            catch (error) {
                business = await db.aiBusiness.findUnique({ where: { ownerId: user.id } });
                if (!business)
                    throw error;
            }
        }
        if (business.tenantId !== user.tenantId)
            return NextResponse.json({ error: 'The business workspace needs review.' }, { status: 409 });
        return NextResponse.json({ businessId: business.id }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    catch {
        return NextResponse.json({ error: 'We could not prepare your business. Please try again.' }, { status: 503 });
    }
}
