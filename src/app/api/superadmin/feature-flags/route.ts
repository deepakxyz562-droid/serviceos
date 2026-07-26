import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

const FEATURE_DEFINITIONS = [
  { key: 'whatsapp_crm', label: 'WhatsApp CRM', description: 'Manage WhatsApp conversations and customer relationships' },
  { key: 'ai_assistant', label: 'AI Assistant', description: 'AI-powered assistant for customer support and automation' },
  { key: 'ai_receptionist', label: 'AI Receptionist (Voice)', description: 'AI voice receptionist powered by Vapi.ai (BYOK). Free for all users — toggle visibility for subscribers.' },
  { key: 'campaigns', label: 'Campaigns', description: 'Create and manage marketing campaigns' },
  { key: 'workflows', label: 'Workflows', description: 'Automate business processes with custom workflows' },
  { key: 'chatbot_builder', label: 'Chatbot Builder', description: 'Build and deploy custom chatbots' },
  { key: 'form_builder', label: 'Form Builder', description: 'Create custom forms and surveys' },
  { key: 'omnichannel', label: 'Omnichannel', description: 'Unified communication across multiple channels' },
  { key: 'salesPipeline', label: 'Sales Pipeline', description: 'Manage deals and sales pipeline stages' },
  { key: 'journey_automation', label: 'Journey Automation', description: 'Create automated customer journey workflows' },
  { key: 'knowledge_base', label: 'Knowledge Base', description: 'Build and manage a knowledge base for support' },
  { key: 'marketplace', label: 'Marketplace', description: 'Access integrations and templates marketplace' },
  { key: 'custom_domains', label: 'Custom Domains', description: 'Use custom domains for portals and forms' },
  { key: 'api_access', label: 'API Access', description: 'Full REST API access for integrations' },
  { key: 'bulk_operations', label: 'Bulk Operations', description: 'Perform bulk import, export, and operations' },
  { key: 'advanced_analytics', label: 'Advanced Analytics', description: 'Detailed analytics with custom reports and dashboards' },
  // Revenue-related feature toggles
  { key: 'marketplace_commission', label: 'Marketplace Commission (5%)', description: 'Charge 5% commission on marketplace-generated jobs' },
  { key: 'featured_listing', label: 'Featured Listing (£20/mo)', description: 'Allow tenants to pay for priority placement in marketplace' },
  { key: 'ai_credits', label: 'AI Credits (£15/mo)', description: 'Pay-per-use AI features beyond plan quota' },
  { key: 'sms_billing', label: 'SMS Usage Billing', description: 'Charge per SMS message sent' },
  { key: 'whatsapp_billing', label: 'WhatsApp Usage Billing', description: 'Charge per WhatsApp message sent' },
  { key: 'white_label_billing', label: 'White Label (£20/mo)', description: 'Custom branding and domain' },
  { key: 'premium_integrations', label: 'Premium Integrations', description: 'QuickBooks, Xero, advanced API access' },
  { key: 'marketplace_eligibility', label: 'Marketplace Eligibility Gates', description: 'Require identity/business/insurance verification + Stripe Connect for marketplace' },
  { key: 'instant_booking', label: 'Instant Booking Flow', description: 'Allow customers to book standardized services instantly' },
  { key: 'quote_request', label: 'Quote Request Flow', description: 'Allow customers to request quotes for custom projects' },
  { key: 'emergency_dispatch', label: 'Emergency Dispatch Flow', description: 'Uber-style emergency dispatch to nearest technician' },
  { key: 'ai_auto_assign', label: 'AI Auto-Assign', description: 'AI automatically selects best provider for customer' },
];

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({
        flags: FEATURE_DEFINITIONS.map((def) => ({ ...def, enabled: false })),
      });
    }

    let existingFlags = await db.featureFlag.findMany({
      where: { tenantId },
    });

    // If no flags exist, seed them from definitions
    if (existingFlags.length === 0) {
      const createData = FEATURE_DEFINITIONS.map((def) => ({
        tenantId,
        featureKey: def.key,
        enabled: false,
        description: def.description,
      }));

      await db.featureFlag.createMany({ data: createData, skipDuplicates: true });

      existingFlags = await db.featureFlag.findMany({
        where: { tenantId },
      });
    }

    // Merge with definitions to ensure all features appear
    const flags = FEATURE_DEFINITIONS.map((def) => {
      const existing = existingFlags.find((f) => f.featureKey === def.key);
      let config = {};
      if (existing?.configJson) {
        try { config = JSON.parse(existing.configJson); } catch { /* ignore */ }
      }
      return {
        key: def.key,
        label: def.label,
        description: def.description,
        enabled: existing?.enabled ?? false,
        config: Object.keys(config).length > 0 ? config : undefined,
      };
    });

    return NextResponse.json({ flags });
  } catch (error) {
    console.error('[SuperAdmin Feature Flags GET] Error:', error);
    return NextResponse.json({
      flags: FEATURE_DEFINITIONS.map((def) => ({ ...def, enabled: false })),
    });
  }
}

// PUT: Toggle a single feature flag
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const body = await request.json();
    const { tenantId, featureKey, enabled } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }
    if (!featureKey) {
      return NextResponse.json({ error: 'Feature key is required' }, { status: 400 });
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Enabled must be a boolean' }, { status: 400 });
    }

    const flag = await db.featureFlag.upsert({
      where: {
        tenantId_featureKey: { tenantId, featureKey },
      },
      create: {
        tenantId,
        featureKey,
        enabled,
      },
      update: {
        enabled,
      },
    });

    return NextResponse.json({ success: true, flag });
  } catch (error) {
    console.error('[SuperAdmin Feature Flags PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to toggle feature flag' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const body = await request.json();
    const { tenantId, flags } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    if (!Array.isArray(flags)) {
      return NextResponse.json({ error: 'Flags must be an array' }, { status: 400 });
    }

    // Upsert each feature flag
    const updates = flags.map((flag: { key: string; enabled: boolean; config?: Record<string, unknown> }) =>
      db.featureFlag.upsert({
        where: {
          tenantId_featureKey: { tenantId, featureKey: flag.key },
        },
        create: {
          tenantId,
          featureKey: flag.key,
          enabled: flag.enabled,
          configJson: flag.config ? JSON.stringify(flag.config) : '{}',
        },
        update: {
          enabled: flag.enabled,
          configJson: flag.config ? JSON.stringify(flag.config) : '{}',
        },
      }),
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true, updated: flags.length });
  } catch (error) {
    console.error('[SuperAdmin Feature Flags POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save feature flags' }, { status: 500 });
  }
}
