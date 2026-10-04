import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export interface CustomDomainConfig {
  domain: string;
  status: 'PENDING_DNS' | 'VERIFIED' | 'SSL_ACTIVE';
  cnameRecord: {
    type: 'CNAME';
    host: string;
    pointsTo: string;
    ttl: string;
  };
  verifiedAt?: string;
  createdAt: string;
}

/**
 * GET /api/commerce/domain
 * Returns custom domain settings for merchant
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    const config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [
          { businessId: business.id },
          ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
        ],
      },
    });

    let domainConfig: CustomDomainConfig | null = null;
    if (config?.fieldsJson) {
      try {
        const parsed = JSON.parse(config.fieldsJson);
        if (parsed.customDomainConfig) {
          domainConfig = parsed.customDomainConfig;
        }
      } catch {}
    }

    const defaultCnameTarget = process.env.NEXT_PUBLIC_CNAME_TARGET || 'cname.serviceos.com';

    return NextResponse.json({
      configured: !!domainConfig?.domain,
      domainConfig: domainConfig || {
        domain: '',
        status: 'PENDING_DNS',
        cnameRecord: {
          type: 'CNAME',
          host: 'shop',
          pointsTo: defaultCnameTarget,
          ttl: '3600 (Auto)',
        },
        createdAt: new Date().toISOString(),
      },
      storeSlug: business.slug,
      defaultStoreUrl: `https://${process.env.NEXT_PUBLIC_APP_DOMAIN || 'serviceos.com'}/store/${business.slug}`,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to get domain config:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch domain' }, { status: 500 });
  }
}

/**
 * POST /api/commerce/domain
 * Connect a custom domain to store
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { domain, action } = body;

    let config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [
          { businessId: business.id },
          ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
        ],
      },
    });

    let currentConfigData: Record<string, any> = {};
    if (config?.fieldsJson) {
      try {
        currentConfigData = JSON.parse(config.fieldsJson);
      } catch {
        currentConfigData = {};
      }
    }

    if (action === 'DELETE') {
      delete currentConfigData.customDomainConfig;
      if (config) {
        await db.gptformCommerceConfig.update({
          where: { id: config.id },
          data: { fieldsJson: JSON.stringify(currentConfigData) },
        });
      }
      return NextResponse.json({ success: true, message: 'Custom domain removed.' });
    }

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Valid domain name is required' }, { status: 400 });
    }

    // Clean domain: strip protocol, paths, and lowercase
    const cleanDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '');

    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json(
        { error: 'Please enter a valid domain format (e.g. orders.myshop.com or mykirana.in)' },
        { status: 400 }
      );
    }

    // Compute host parts
    const parts = cleanDomain.split('.');
    const host = parts.length > 2 ? parts[0] : '@';
    const defaultCnameTarget = process.env.NEXT_PUBLIC_CNAME_TARGET || 'cname.serviceos.com';

    const domainConfig: CustomDomainConfig = {
      domain: cleanDomain,
      status: 'PENDING_DNS',
      cnameRecord: {
        type: 'CNAME',
        host,
        pointsTo: defaultCnameTarget,
        ttl: '3600 (Auto)',
      },
      createdAt: new Date().toISOString(),
    };

    currentConfigData.customDomainConfig = domainConfig;
    const updatedJson = JSON.stringify(currentConfigData);

    if (config) {
      await db.gptformCommerceConfig.update({
        where: { id: config.id },
        data: { fieldsJson: updatedJson },
      });
    } else {
      config = await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          fieldsJson: updatedJson,
        },
      });
    }

    return NextResponse.json({
      success: true,
      domainConfig,
      message: `Domain ${cleanDomain} added. Please configure your DNS CNAME record.`,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to configure custom domain:', e);
    return NextResponse.json({ error: e.message || 'Failed to save domain' }, { status: 500 });
  }
}
