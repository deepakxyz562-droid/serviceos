import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendJobNotification } from '@/lib/whatsapp-notifications';
import { EventBus } from '@/lib/event-bus';

// ─── POST /api/forms/[id]/submit ───────────────────────────────────────────
// CRITICAL route: Form submission with action execution

function safeJsonParse(str: string | null | undefined, fallback: unknown = {}): unknown {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

// Apply field mapping: map form data keys to CRM field keys using fieldMappingJson
function applyFieldMapping(
  formData: Record<string, unknown>,
  fieldMapping: Record<string, string>
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [formField, crmField] of Object.entries(fieldMapping)) {
    if (formData[formField] !== undefined) {
      mapped[crmField] = formData[formField];
    }
  }

  // Also keep unmapped fields as fallback
  for (const [key, value] of Object.entries(formData)) {
    if (mapped[key] === undefined) {
      mapped[key] = value;
    }
  }

  return mapped;
}

// Replace template variables like {{name}}, {{phone}}, etc. in a template string
function replaceTemplateVars(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(data[key] ?? match);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ─── 1. Get the form ──────────────────────────────────────────────
    const form = await db.form.findUnique({ where: { id } });
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }
    if (form.status !== 'active') {
      return NextResponse.json({ error: 'Form is not active' }, { status: 400 });
    }

    // ─── 2. Parse submission data ─────────────────────────────────────
    const body = await request.json();
    const formData: Record<string, unknown> = body.data || body;
    const source: string = body.source || 'direct';
    const respondent: string | undefined = body.respondent || formData.phone as string || formData.email as string || undefined;
    const respondentName: string | undefined = body.respondentName || formData.name as string || undefined;

    // ─── 3. Store the response ────────────────────────────────────────
    const response = await db.formResponse.create({
      data: {
        formId: form.id,
        dataJson: JSON.stringify(formData),
        respondent: respondent || null,
        respondentName: respondentName || null,
        source,
        tenantId: form.tenantId,
      },
    });

    // ─── 4. Read submission actions and field mapping ─────────────────
    const submissionActions: string[] = safeJsonParse(form.submissionActions, []) as string[];
    const fieldMapping: Record<string, string> = safeJsonParse(form.fieldMappingJson, {}) as Record<string, string>;
    const mappedData = applyFieldMapping(formData, fieldMapping);

    // ─── 5. Execute each action ───────────────────────────────────────
    const actionResults: Record<string, unknown> = {};

    for (const action of submissionActions) {
      try {
        switch (action) {
          // ─── CREATE LEAD ────────────────────────────────────────────
          case 'create_lead': {
            const name = String(mappedData.name || formData.name || 'Unknown');
            const phone = String(mappedData.phone || formData.phone || '');
            const email = mappedData.email ? String(mappedData.email) : formData.email ? String(formData.email) : null;
            const address = mappedData.address ? String(mappedData.address) : formData.address ? String(formData.address) : null;
            const serviceType = mappedData.serviceType ? String(mappedData.serviceType) : formData.serviceType ? String(formData.serviceType) : null;
            const description = mappedData.description ? String(mappedData.description) : formData.description ? String(formData.description) : null;

            const lead = await db.lead.create({
              data: {
                name,
                phone,
                email,
                source: source === 'direct' ? 'form' : source,
                status: 'new',
                priority: 'medium',
                value: mappedData.value ? Number(mappedData.value) : 0,
                description,
                address,
                serviceType,
                tenantId: form.tenantId,
                tagsJson: JSON.stringify(['form_submission', form.type]),
              },
            });

            // Update the response with leadId
            await db.formResponse.update({
              where: { id: response.id },
              data: { leadId: lead.id },
            });

            actionResults.create_lead = { success: true, leadId: lead.id, name: lead.name };

            // Emit lead.created event
            try {
              await EventBus.emit('lead.created', {
                leadId: lead.id,
                name: lead.name,
                phone: lead.phone,
                source: lead.source,
                tenantId: lead.tenantId,
                resourceType: 'lead',
                resourceId: lead.id,
                summary: `New lead from form: ${form.name}`,
              }, { tenantId: lead.tenantId || undefined });
            } catch {}
            break;
          }

          // ─── CREATE CUSTOMER ────────────────────────────────────────
          case 'create_customer': {
            const name = String(mappedData.name || formData.name || 'Unknown');
            const phone = String(mappedData.phone || formData.phone || '');
            const email = mappedData.email ? String(mappedData.email) : formData.email ? String(formData.email) : null;
            const address = mappedData.address ? String(mappedData.address) : formData.address ? String(formData.address) : null;

            if (!phone) {
              actionResults.create_customer = { success: false, error: 'Phone is required for customer creation' };
              break;
            }

            // Check if customer already exists
            const existingCustomer = await db.customer.findFirst({
              where: { phone },
            });

            if (existingCustomer) {
              // Link existing customer to the response
              await db.formResponse.update({
                where: { id: response.id },
                data: { customerId: existingCustomer.id },
              });
              actionResults.create_customer = { success: true, customerId: existingCustomer.id, existing: true };
            } else {
              const customer = await db.customer.create({
                data: {
                  name,
                  phone,
                  email,
                  address,
                  workspaceId: form.workspaceId,
                },
              });

              await db.formResponse.update({
                where: { id: response.id },
                data: { customerId: customer.id },
              });

              actionResults.create_customer = { success: true, customerId: customer.id, name: customer.name };
            }
            break;
          }

          // ─── CREATE BOOKING (Job with type "booking") ───────────────
          case 'create_booking': {
            const title = String(mappedData.title || formData.title || `Booking from ${form.name}`);
            const customerPhone = String(mappedData.phone || formData.phone || '');
            const customerName = String(mappedData.name || formData.name || 'Unknown');
            const address = mappedData.address ? String(mappedData.address) : formData.address ? String(formData.address) : null;
            const description = mappedData.description ? String(mappedData.description) : formData.description ? String(formData.description) : null;
            const scheduledAt = mappedData.scheduledAt ? new Date(String(mappedData.scheduledAt)) : formData.scheduledAt ? new Date(String(formData.scheduledAt)) : null;

            // Try to find a matching customer
            let customerId: string | null = null;
            if (customerPhone) {
              const customer = await db.customer.findFirst({ where: { phone: customerPhone } });
              if (customer) customerId = customer.id;
            }

            const job = await db.job.create({
              data: {
                title,
                description,
                status: 'pending',
                priority: 'medium',
                type: 'booking',
                address,
                scheduledAt,
                customerId,
                customerName,
                customerPhone,
                workspaceId: form.workspaceId,
              },
            });

            await db.formResponse.update({
              where: { id: response.id },
              data: { bookingId: job.id },
            });

            actionResults.create_booking = { success: true, jobId: job.id, title: job.title };
            break;
          }

          // ─── CREATE JOB ─────────────────────────────────────────────
          case 'create_job': {
            const title = String(mappedData.title || formData.title || `Job from ${form.name}`);
            const customerPhone = String(mappedData.phone || formData.phone || '');
            const customerName = String(mappedData.name || formData.name || 'Unknown');
            const address = mappedData.address ? String(mappedData.address) : formData.address ? String(formData.address) : null;
            const description = mappedData.description ? String(mappedData.description) : formData.description ? String(formData.description) : null;
            const scheduledAt = mappedData.scheduledAt ? new Date(String(mappedData.scheduledAt)) : formData.scheduledAt ? new Date(String(formData.scheduledAt)) : null;
            const serviceType = mappedData.serviceType ? String(mappedData.serviceType) : null;

            let customerId: string | null = null;
            if (customerPhone) {
              const customer = await db.customer.findFirst({ where: { phone: customerPhone } });
              if (customer) customerId = customer.id;
            }

            const job = await db.job.create({
              data: {
                title,
                description,
                status: 'pending',
                priority: 'medium',
                type: serviceType || 'service',
                address,
                scheduledAt,
                customerId,
                customerName,
                customerPhone,
                workspaceId: form.workspaceId,
              },
            });

            await db.formResponse.update({
              where: { id: response.id },
              data: { jobId: job.id },
            });

            actionResults.create_job = { success: true, jobId: job.id, title: job.title };
            break;
          }

          // ─── CREATE QUOTE ───────────────────────────────────────────
          case 'create_quote': {
            const title = String(mappedData.title || formData.title || `Quote from ${form.name}`);
            const customerPhone = String(mappedData.phone || formData.phone || '');
            const customerName = String(mappedData.name || formData.name || 'Unknown');

            let quoteCustomerId: string | null = null;
            if (customerPhone) {
              const customer = await db.customer.findFirst({ where: { phone: customerPhone } });
              if (customer) quoteCustomerId = customer.id;
            }

            const itemsJson = mappedData.itemsJson || formData.itemsJson || [];
            const subtotal = mappedData.subtotal ? Number(mappedData.subtotal) : 0;

            const quote = await db.quote.create({
              data: {
                title,
                description: `Quote requested from form: ${form.name}`,
                itemsJson: typeof itemsJson === 'string' ? itemsJson : JSON.stringify(itemsJson),
                subtotal,
                total: subtotal,
                status: 'draft',
                tenantId: form.tenantId,
                customerId: quoteCustomerId,
              },
            });

            await db.formResponse.update({
              where: { id: response.id },
              data: { quoteId: quote.id },
            });

            actionResults.create_quote = { success: true, quoteId: quote.id, title: quote.title };
            break;
          }

          // ─── STORE RESPONSE (already done above) ────────────────────
          case 'store_response': {
            actionResults.store_response = { success: true, responseId: response.id };
            break;
          }

          // ─── SEND WHATSAPP ──────────────────────────────────────────
          case 'send_whatsapp': {
            const customerPhone = String(mappedData.phone || formData.phone || '');
            const customerName = String(mappedData.name || formData.name || 'Unknown');
            const tenantId = form.tenantId;

            // Send to owner
            if (form.whatsappOwnerTemplate) {
              try {
                // Try to get tenant WhatsApp phone
                let ownerPhone = '';
                if (tenantId) {
                  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
                  if (tenant?.whatsappPhone) ownerPhone = tenant.whatsappPhone;
                }

                if (ownerPhone) {
                  const ownerMessage = replaceTemplateVars(form.whatsappOwnerTemplate, {
                    name: customerName,
                    phone: customerPhone,
                    form: form.name,
                    ...formData,
                  });
                  await sendJobNotification({
                    to: ownerPhone,
                    message: ownerMessage,
                    recipientName: 'Owner',
                    recipientRole: 'manager' as 'customer',
                    subject: `New form submission: ${form.name}`,
                    tenantId: tenantId || undefined,
                  });
                  actionResults.send_whatsapp_owner = { success: true, to: ownerPhone };
                } else {
                  actionResults.send_whatsapp_owner = { success: false, error: 'No owner WhatsApp phone configured' };
                }
              } catch (err) {
                actionResults.send_whatsapp_owner = { success: false, error: String(err) };
              }
            }

            // Send to user/form submitter
            if (form.whatsappUserTemplate && customerPhone) {
              try {
                let userMessage = replaceTemplateVars(form.whatsappUserTemplate, {
                  name: customerName,
                  form: form.name,
                  ...formData,
                });

                // If AI-generated flag is on, use AI to enhance the message
                if (form.whatsappAiGenerated) {
                  try {
                    const aiResponse = await fetch('/api/ai/suggest-nodes?XTransformPort=3000', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        prompt: `Generate a brief, friendly WhatsApp confirmation message for a form submission. Form name: "${form.name}". Customer name: "${customerName}". Form data: ${JSON.stringify(formData).slice(0, 500)}. Keep it under 200 characters. Only return the message text, no explanation.`,
                      }),
                    });
                    if (aiResponse.ok) {
                      const aiData = await aiResponse.json();
                      if (aiData.message || aiData.suggestion) {
                        userMessage = aiData.message || aiData.suggestion;
                      }
                    }
                  } catch (aiErr) {
                    console.error('AI WhatsApp generation failed, using template:', aiErr);
                  }
                }

                await sendJobNotification({
                  to: customerPhone,
                  message: userMessage,
                  recipientName: customerName,
                  recipientRole: 'customer',
                  subject: `Form submission received`,
                  tenantId: tenantId || undefined,
                });
                actionResults.send_whatsapp_user = { success: true, to: customerPhone };
              } catch (err) {
                actionResults.send_whatsapp_user = { success: false, error: String(err) };
              }
            }
            break;
          }

          // ─── SEND EMAIL ─────────────────────────────────────────────
          case 'send_email': {
            // Placeholder: Log email action
            const recipientEmail = String(mappedData.email || formData.email || '');
            actionResults.send_email = {
              success: true,
              note: 'Email action logged (not yet implemented)',
              recipient: recipientEmail,
            };
            break;
          }

          // ─── TRIGGER WORKFLOW ────────────────────────────────────────
          case 'trigger_workflow': {
            // Find active workflow automations with matching trigger
            try {
              const automations = await db.workflowAutomation.findMany({
                where: {
                  triggerType: 'form.submitted',
                  active: true,
                  tenantId: form.tenantId,
                },
              });

              const triggered: Record<string, string>[] = [];
              for (const automation of automations) {
                try {
                  // Log execution
                  await db.workflowAutomation.update({
                    where: { id: automation.id },
                    data: {
                      executionCount: { increment: 1 },
                      lastExecutedAt: new Date(),
                      lastExecutionStatus: 'success',
                    },
                  });
                  triggered.push({ automationId: automation.id, name: automation.name });
                } catch (autoErr) {
                  console.error('Workflow automation execution error:', autoErr);
                }
              }

              actionResults.trigger_workflow = { success: true, triggeredAutomations: triggered };
            } catch (err) {
              actionResults.trigger_workflow = { success: false, error: String(err) };
            }
            break;
          }

          // ─── CALL WEBHOOK ───────────────────────────────────────────
          case 'call_webhook': {
            const webhookUrl = mappedData.webhookUrl as string || formData.webhookUrl as string || '';
            if (!webhookUrl) {
              actionResults.call_webhook = { success: false, error: 'No webhook URL provided' };
              break;
            }

            try {
              const webhookPayload = {
                formId: form.id,
                formName: form.name,
                formType: form.type,
                responseId: response.id,
                data: formData,
                respondent,
                submittedAt: new Date().toISOString(),
              };

              const webhookResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload),
                signal: AbortSignal.timeout(10000),
              });

              actionResults.call_webhook = {
                success: webhookResponse.ok,
                status: webhookResponse.status,
                url: webhookUrl,
              };
            } catch (err) {
              actionResults.call_webhook = { success: false, error: String(err), url: webhookUrl };
            }
            break;
          }

          default:
            actionResults[action] = { success: false, error: `Unknown action: ${action}` };
        }
      } catch (actionErr) {
        // If one action fails, log the error but continue with other actions
        console.error(`Action "${action}" failed:`, actionErr);
        actionResults[action] = { success: false, error: actionErr instanceof Error ? actionErr.message : String(actionErr) };
      }
    }

    // ─── 6. Record all action results ─────────────────────────────────
    await db.formResponse.update({
      where: { id: response.id },
      data: { actionsResultsJson: JSON.stringify(actionResults) },
    });

    // ─── 7. Increment form.submissions count ──────────────────────────
    await db.form.update({
      where: { id: form.id },
      data: { submissions: { increment: 1 } },
    });

    // ─── 8. Return the response with all created resource IDs ─────────
    const updatedResponse = await db.formResponse.findUnique({
      where: { id: response.id },
    });

    return NextResponse.json({
      success: true,
      response: updatedResponse,
      actionResults,
    }, { status: 201 });
  } catch (error) {
    console.error('Form submission error:', error);
    return NextResponse.json({ error: 'Failed to process form submission' }, { status: 500 });
  }
}
