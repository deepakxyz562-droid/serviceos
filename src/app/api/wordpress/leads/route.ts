import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventBus } from '@/lib/event-bus';

// ─── WordPress Lead Capture Endpoint ──────────────────────────────────────
// POST: Receive lead data from WordPress plugin
// Authenticates via Bearer token (API key)
// Auto-maps WordPress form fields to Lead model

const WP_FIELD_MAP: Record<string, string[]> = {
  name: ['your-name', 'your_name', 'name', 'full_name', 'fullname', 'contact_name', 'customer_name', 'visitor_name'],
  phone: ['your-phone', 'your_phone', 'phone', 'mobile', 'cell', 'telephone', 'phone_number', 'contact_phone'],
  email: ['your-email', 'your_email', 'email', 'email_address', 'contact_email'],
  address: ['your-address', 'your_address', 'address', 'street', 'location', 'full_address'],
  serviceType: ['your-subject', 'your_subject', 'subject', 'service', 'service_type', 'inquiry_type'],
  description: ['your-message', 'your_message', 'message', 'description', 'notes', 'comments', 'body', 'details'],
};

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function mapWpFields(payload: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};

  for (const [leadField, aliases] of Object.entries(WP_FIELD_MAP)) {
    for (const alias of aliases) {
      if (payload[alias] !== undefined && payload[alias] !== '') {
        mapped[leadField] = payload[alias];
        break;
      }
    }
  }

  // Check nested data field
  if (payload.data && typeof payload.data === 'object') {
    const nestedMapped = mapWpFields(payload.data);
    for (const [k, v] of Object.entries(nestedMapped)) {
      if (!mapped[k]) mapped[k] = v;
    }
  }

  return mapped;
}

function calculateLeadScore(data: Record<string, any>): number {
  let score = 35; // WordPress leads start higher (form submission = intent)
  if (data.phone) score += 20;
  if (data.email) score += 15;
  if (data.serviceType) score += 15;
  if (data.description) score += 10;
  if (data.address) score += 5;
  return Math.min(score, 100);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ─── 1. Authenticate ────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const xApiKey = request.headers.get('x-api-key');
    let providedKey = '';

    if (authHeader?.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7).trim();
    } else if (xApiKey) {
      providedKey = xApiKey.trim();
    }

    if (!providedKey) {
      return NextResponse.json(
        { error: 'API key required. Use Authorization: Bearer <key> or X-API-Key header', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const keyHash = await hashApiKey(providedKey);
    const endpoint = await db.webhookEndpoint.findFirst({
      where: { apiKeyHash: keyHash, source: 'wordpress', active: true },
    });

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Invalid API key or inactive endpoint', code: 'AUTH_FAILED' },
        { status: 403 }
      );
    }

    // ─── 2. Parse payload ───────────────────────────────────────────────
    let payload: Record<string, any>;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = {};
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    } else {
      payload = await request.json();
    }

    // ─── 3. Map fields ──────────────────────────────────────────────────
    const mapped = mapWpFields(payload);

    // Apply custom field mapping
    try {
      const customMapping = JSON.parse(endpoint.fieldMapping || '{}') as Record<string, string>;
      for (const [srcField, leadField] of Object.entries(customMapping)) {
        if (payload[srcField] !== undefined && !mapped[leadField]) {
          mapped[leadField] = payload[srcField];
        }
      }
    } catch {}

    // ─── 4. Validate ────────────────────────────────────────────────────
    if (!mapped.name && !mapped.phone) {
      return NextResponse.json(
        { error: 'Missing required fields: at least name or phone is required', code: 'MISSING_FIELDS', receivedFields: Object.keys(payload) },
        { status: 400 }
      );
    }

    // ─── 5. Create lead ─────────────────────────────────────────────────
    const leadScore = calculateLeadScore(mapped);
    const formPlugin = payload._form_plugin || payload.form_plugin || 'unknown';
    const formName = payload._form_name || payload.form_name || '';
    const pageUrl = payload._page_url || payload.page_url || '';

    // Resolve tenantId: endpoint.tenantId → payload _tenant_id → null
    const resolvedTenantId = endpoint.tenantId || payload._tenant_id || payload.tenant_id || null;

    const lead = await db.lead.create({
      data: {
        name: String(mapped.name || 'Unknown'),
        phone: String(mapped.phone || ''),
        email: mapped.email ? String(mapped.email) : null,
        source: 'wordpress',
        status: 'new',
        priority: leadScore > 70 ? 'high' : leadScore > 40 ? 'medium' : 'low',
        value: mapped.value ? Number(mapped.value) : 0,
        description: [
          mapped.description ? String(mapped.description) : '',
          formName ? `Form: ${formName}` : '',
          pageUrl ? `Page: ${pageUrl}` : '',
          formPlugin ? `Plugin: ${formPlugin}` : '',
        ].filter(Boolean).join(' | '),
        address: mapped.address ? String(mapped.address) : null,
        serviceType: mapped.serviceType ? String(mapped.serviceType) : null,
        tenantId: resolvedTenantId,
        tagsJson: JSON.stringify([
          'wordpress',
          `plugin:${formPlugin}`,
          `score:${leadScore}`,
        ]),
        notesJson: JSON.stringify([{
          text: `Lead captured from WordPress${formName ? ` (${formName})` : ''}${pageUrl ? ` on ${pageUrl}` : ''}`,
          timestamp: new Date().toISOString(),
          auto: true,
        }]),
      },
    });

    // ─── 6. Auto-create customer ────────────────────────────────────────
    try {
      if (endpoint.autoCreateCustomer && mapped.phone) {
        const existingCustomer = await db.customer.findFirst({
          where: { phone: String(mapped.phone) },
        });
        if (!existingCustomer) {
          await db.customer.create({
            data: {
              name: String(mapped.name || 'Unknown'),
              phone: String(mapped.phone),
              email: mapped.email ? String(mapped.email) : null,
              address: mapped.address ? String(mapped.address) : null,
              workspaceId: endpoint.workspaceId,
            },
          });
        }
      }
    } catch (custErr: unknown) {
      // Non-fatal: customer creation failure shouldn't block lead creation
      console.error('Customer auto-create failed:', custErr);
    }

    // ─── 7. Update endpoint stats ───────────────────────────────────────
    try {
      await db.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: {
          totalReceived: { increment: 1 },
          lastReceived: new Date(),
        },
      });
    } catch {}

    // ─── 7.5 Emit lead.created event via EventBus ────────────────────
    try {
      await EventBus.emit('lead.created', {
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: 'wordpress',
        serviceType: lead.serviceType,
        tenantId: resolvedTenantId,
        resourceType: 'lead',
        resourceId: lead.id,
        summary: `New WordPress lead: ${lead.name} (score: ${leadScore})`,
      }, { tenantId: resolvedTenantId || undefined, workspaceId: endpoint.workspaceId || undefined });
    } catch (eventErr) {
      console.error('[WordPressLeads] Failed to emit lead.created event:', eventErr);
    }

    // ─── 7.6 Send WhatsApp notifications ──────────────────────────────
    if (endpoint.sendWhatsApp) {
      try {
        // Parse WhatsApp settings from the whatsappTemplate field
        let waSettings: Record<string, any> = {};
        try {
          waSettings = JSON.parse(endpoint.whatsappTemplate || '{}');
        } catch {}

        const { sendJobNotification } = await import('@/lib/whatsapp-notifications');

        // Resolve tenant name for template variables
        let tenantName = 'ServiceOS';
        try {
          if (resolvedTenantId) {
            const tenant = await db.tenant.findUnique({ where: { id: resolvedTenantId } });
            if (tenant?.name) tenantName = tenant.name;
          }
        } catch {}

        // Helper to replace template variables
        const replaceTemplateVars = (template: string, vars: Record<string, string>) => {
          let result = template;
          for (const [key, value] of Object.entries(vars)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || 'N/A');
          }
          return result;
        };

        const templateVars = {
          name: lead.name,
          phone: lead.phone,
          email: lead.email || '',
          serviceType: lead.serviceType || '',
          description: mapped.description ? String(mapped.description) : '',
          address: mapped.address ? String(mapped.address) : '',
          companyName: tenantName,
        };

        // Notify owner
        if (waSettings.notifyOwner && waSettings.ownerPhone) {
          const ownerTemplate = waSettings.ownerTemplate || '🎯 New Lead!\n\nName: {{name}}\nPhone: {{phone}}\nService: {{serviceType}}\n\nFollow up promptly!';
          const ownerMessage = replaceTemplateVars(ownerTemplate, templateVars);

          sendJobNotification({
            to: waSettings.ownerPhone,
            message: ownerMessage,
            recipientName: 'Business Owner',
            recipientRole: 'employee' as const,
            subject: `New Lead: ${lead.name}`,
            tenantId: resolvedTenantId || undefined,
          }).catch((err: unknown) => console.error('[WordPressLeads] Owner WhatsApp notification failed:', err));
        }

        // Notify customer (auto-reply)
        if (waSettings.notifyCustomer && lead.phone) {
          const customerTemplate = waSettings.customerTemplate || 'Thank you for contacting us, {{name}}! We will get back to you shortly.\n\n— {{companyName}}';
          const customerMessage = replaceTemplateVars(customerTemplate, templateVars);

          sendJobNotification({
            to: lead.phone,
            message: customerMessage,
            recipientName: lead.name,
            recipientRole: 'customer',
            subject: 'Thank you for your inquiry',
            tenantId: resolvedTenantId || undefined,
          }).catch((err: unknown) => console.error('[WordPressLeads] Customer WhatsApp notification failed:', err));
        }
      } catch (waErr) {
        // Non-fatal: WhatsApp notification failure shouldn't block lead creation
        console.error('[WordPressLeads] WhatsApp notification error:', waErr);
      }
    }

    // ─── 8. Log ─────────────────────────────────────────────────────────
    try {
      await db.webhookEndpointLog.create({
      data: {
        webhookEndpointId: endpoint.id,
        source: 'wordpress',
        sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        payloadJson: JSON.stringify(payload).slice(0, 10000),
        leadId: lead.id,
        status: 'processed',
        processingMs: Date.now() - startTime,
      },
    });
    } catch {}

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      leadName: lead.name,
      message: 'Lead created successfully from WordPress',
      source: 'wordpress',
      formPlugin,
      processingMs: Date.now() - startTime,
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process lead';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Health check / Connection test ──────────────────────────────────────
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const xApiKey = request.headers.get('x-api-key');
  let providedKey = '';

  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7).trim();
  } else if (xApiKey) {
    providedKey = xApiKey.trim();
  }

  if (!providedKey) {
    return NextResponse.json({
      status: 'ok',
      service: 'ServiceOS WordPress Lead Capture',
      version: '1.0.0',
      message: 'API key required for lead submission. Use Authorization: Bearer <key>',
    });
  }

  const keyHash = await hashApiKey(providedKey);
  const endpoint = await db.webhookEndpoint.findFirst({
    where: { apiKeyHash: keyHash, source: 'wordpress' },
    select: {
      name: true,
      endpointId: true,
      active: true,
      totalReceived: true,
      lastReceived: true,
      lastError: true,
      createdAt: true,
    },
  });

  if (!endpoint) {
    return NextResponse.json({ status: 'error', error: 'Invalid API key' }, { status: 403 });
  }

  return NextResponse.json({
    status: 'connected',
    endpoint: {
      name: endpoint.name,
      active: endpoint.active,
      totalReceived: endpoint.totalReceived,
      lastReceived: endpoint.lastReceived,
    },
    message: 'Connection successful! Your WordPress site is properly configured.',
  });
}
