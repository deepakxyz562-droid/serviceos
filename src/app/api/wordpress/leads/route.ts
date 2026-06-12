import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendJobNotification } from '@/lib/whatsapp-notifications';
import { EventBus } from '@/lib/event-bus';

// ─── WordPress Lead Capture Endpoint ──────────────────────────────────────
// POST: Receive lead data from WordPress plugin
// Authenticates via Bearer token (API key)
// Auto-maps WordPress form fields to Lead model
// Now sends WhatsApp to owner and user based on endpoint config

const WP_FIELD_MAP: Record<string, string[]> = {
  name: ['your-name', 'your_name', 'name', 'full_name', 'fullname', 'contact_name', 'customer_name', 'visitor_name', 'first-name', 'first_name'],
  phone: ['your-phone', 'your_phone', 'phone', 'mobile', 'cell', 'telephone', 'phone_number', 'contact_phone', 'phone-number'],
  email: ['your-email', 'your_email', 'email', 'email_address', 'contact_email'],
  address: ['your-address', 'your_address', 'address', 'street', 'location', 'full_address', 'street-address', 'city'],
  serviceType: ['your-subject', 'your_subject', 'subject', 'service', 'service_type', 'inquiry_type', 'inquiry-type'],
  description: ['your-message', 'your_message', 'message', 'description', 'notes', 'comments', 'body', 'details'],
  scheduledAt: ['preferred-date', 'preferred_date', 'date', 'booking_date'],
  scheduledTime: ['preferred-time', 'preferred_time', 'time', 'booking_time'],
  value: ['budget', 'value', 'amount', 'quote_amount'],
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

  // Normalize payload keys (lowercase, strip hyphens/underscores/spaces)
  const normalizedPayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    const normalizedKey = k.toLowerCase().replace(/[-_\s]/g, '');
    normalizedPayload[normalizedKey] = v;
    // Also keep original keys for exact matching
    normalizedPayload[k] = v;
  }

  for (const [leadField, aliases] of Object.entries(WP_FIELD_MAP)) {
    for (const alias of aliases) {
      const normalizedAlias = alias.toLowerCase().replace(/[-_\s]/g, '');
      // Try normalized match first, then exact match
      if (normalizedPayload[normalizedAlias] !== undefined && normalizedPayload[normalizedAlias] !== '') {
        mapped[leadField] = normalizedPayload[normalizedAlias];
        break;
      }
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

// Replace template variables like {{name}}, {{phone}}, etc.
function replaceTemplateVars(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(data[key] ?? match);
  });
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

    // Apply custom field mapping from endpoint
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
        tenantId: endpoint.tenantId,
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

    // ─── 7. Send WhatsApp to owner if endpoint.sendWhatsApp is true ────
    let ownerWhatsappResult: Record<string, unknown> | null = null;
    if (endpoint.sendWhatsApp) {
      try {
        const ownerPhone = endpoint.whatsappOwnerPhone;

        if (ownerPhone) {
          // Use the endpoint's whatsappOwnerTemplate or a default message
          const ownerTemplate = endpoint.whatsappOwnerTemplate || '';
          const ownerMessage = ownerTemplate
            ? replaceTemplateVars(ownerTemplate, {
                name: mapped.name || 'Unknown',
                phone: mapped.phone || '',
                email: mapped.email || '',
                serviceType: mapped.serviceType || '',
                description: mapped.description || '',
                leadId: lead.id,
                source: 'WordPress',
                score: leadScore,
              })
            : [
                '🔔 New Lead from WordPress',
                '',
                `Name: ${mapped.name || 'Unknown'}`,
                `Phone: ${mapped.phone || 'N/A'}`,
                mapped.email ? `Email: ${mapped.email}` : '',
                mapped.serviceType ? `Service: ${mapped.serviceType}` : '',
                mapped.description ? `Message: ${String(mapped.description).slice(0, 200)}` : '',
                '',
                `Priority: ${leadScore > 70 ? 'High' : leadScore > 40 ? 'Medium' : 'Low'} (Score: ${leadScore})`,
                `Lead ID: ${lead.id}`,
              ].filter(Boolean).join('\n');

          await sendJobNotification({
            to: ownerPhone,
            message: ownerMessage,
            recipientName: 'Owner',
            recipientRole: 'manager' as 'customer',
            subject: `New WordPress Lead: ${mapped.name || 'Unknown'}`,
            tenantId: endpoint.tenantId || undefined,
          });

          ownerWhatsappResult = { success: true, to: ownerPhone };
        } else {
          // Try using tenant's WhatsApp phone as fallback
          if (endpoint.tenantId) {
            const tenant = await db.tenant.findUnique({ where: { id: endpoint.tenantId } });
            if (tenant?.whatsappPhone) {
              const ownerMessage = [
                '🔔 New Lead from WordPress',
                '',
                `Name: ${mapped.name || 'Unknown'}`,
                `Phone: ${mapped.phone || 'N/A'}`,
                mapped.email ? `Email: ${mapped.email}` : '',
                mapped.serviceType ? `Service: ${mapped.serviceType}` : '',
                '',
                `Lead ID: ${lead.id}`,
              ].filter(Boolean).join('\n');

              await sendJobNotification({
                to: tenant.whatsappPhone,
                message: ownerMessage,
                recipientName: 'Owner',
                recipientRole: 'manager' as 'customer',
                subject: `New WordPress Lead: ${mapped.name || 'Unknown'}`,
                tenantId: endpoint.tenantId,
              });

              ownerWhatsappResult = { success: true, to: tenant.whatsappPhone, fallback: true };
            }
          }

          if (!ownerWhatsappResult) {
            ownerWhatsappResult = { success: false, error: 'No owner WhatsApp phone configured on endpoint or tenant' };
          }
        }
      } catch (err) {
        console.error('Owner WhatsApp notification failed:', err);
        ownerWhatsappResult = { success: false, error: String(err) };
      }
    }

    // ─── 8. Send WhatsApp to user/form submitter if whatsappUserTemplate configured ──
    let userWhatsappResult: Record<string, unknown> | null = null;
    const userPhone = mapped.phone ? String(mapped.phone) : '';
    const userName = mapped.name || 'there';

    if (userPhone) {
      try {
        // Check if user template is configured or AI-generated
        const userTemplate = endpoint.whatsappUserTemplate || '';

        if (userTemplate || endpoint.whatsappAiGenerated) {
          let userMessage = '';

          if (userTemplate) {
            userMessage = replaceTemplateVars(userTemplate, {
              name: userName,
              serviceType: mapped.serviceType || '',
              source: 'WordPress',
            });
          }

          // If AI-generated flag is on, use AI to generate the confirmation message
          if (endpoint.whatsappAiGenerated) {
            try {
              const aiResponse = await fetch('/api/ai/suggest-nodes?XTransformPort=3000', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt: `Generate a brief, friendly WhatsApp confirmation message for a new lead. Lead name: "${userName}". Service: "${mapped.serviceType || 'General inquiry'}". Source: WordPress form. Keep it under 200 characters. Only return the message text.`,
                }),
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                if (aiData.message || aiData.suggestion) {
                  userMessage = aiData.message || aiData.suggestion;
                }
              }
            } catch (aiErr) {
              console.error('AI WhatsApp generation failed for user, using template:', aiErr);
            }
          }

          if (userMessage) {
            await sendJobNotification({
              to: userPhone,
              message: userMessage,
              recipientName: userName,
              recipientRole: 'customer',
              subject: 'Lead submission received',
              tenantId: endpoint.tenantId || undefined,
            });

            userWhatsappResult = { success: true, to: userPhone };
          }
        }
      } catch (err) {
        console.error('User WhatsApp notification failed:', err);
        userWhatsappResult = { success: false, error: String(err) };
      }
    }

    // ─── 9. Emit lead.created event ──────────────────────────────────────
    try {
      await EventBus.emit('lead.created', {
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        tenantId: lead.tenantId,
      });
    } catch (eventErr) {
      console.error('EventBus emit failed for WordPress lead:', eventErr);
    }

    // ─── 10. Update endpoint stats ───────────────────────────────────────
    try {
      await db.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: {
          totalReceived: { increment: 1 },
          lastReceived: new Date(),
        },
      });
    } catch {}

    // ─── 11. Log ────────────────────────────────────────────────────────
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
      whatsapp: {
        owner: ownerWhatsappResult,
        user: userWhatsappResult,
      },
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
      version: '2.0.0',
      message: 'API key required for lead submission. Use Authorization: Bearer <key>',
      features: ['lead_creation', 'auto_customer', 'whatsapp_owner_notification', 'whatsapp_user_notification', 'ai_generated_messages'],
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
      sendWhatsApp: true,
      whatsappOwnerPhone: true,
      whatsappOwnerTemplate: true,
      whatsappUserTemplate: true,
      whatsappAiGenerated: true,
      fieldMapping: true,
      autoCreateCustomer: true,
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
      sendWhatsApp: endpoint.sendWhatsApp,
      whatsappOwnerPhone: endpoint.whatsappOwnerPhone ? '***configured***' : 'not set',
      whatsappUserTemplate: endpoint.whatsappUserTemplate ? '***configured***' : 'not set',
      whatsappAiGenerated: endpoint.whatsappAiGenerated,
      autoCreateCustomer: endpoint.autoCreateCustomer,
      fieldMapping: (() => { try { return JSON.parse(endpoint.fieldMapping); } catch { return {}; } })(),
    },
    message: 'Connection successful! Your WordPress site is properly configured.',
  });
}
