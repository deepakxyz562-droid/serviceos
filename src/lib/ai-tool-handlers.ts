/**
 * AI Tool Handlers
 * ================
 *
 * Each handler calls a Fieseros domain service (never direct DB access).
 * The domain service enforces tenant ownership on every query/mutation.
 *
 * ARCHITECTURE BOUNDARY (per Phase 6 non-negotiable rule):
 *   AI → AiToolDispatcher → ToolHandler → Domain Service → DB
 *   The AI runtime NEVER directly accesses Prisma/Supabase.
 *
 * Every handler receives:
 *   - ctx: AiExecutionContext (tenantId, callId, customerId, etc.)
 *   - params: the tool parameters from Vapi
 *
 * Every handler returns a JSON-serializable result that Vapi receives.
 * Every mutation verifies tenant ownership before writing.
 */

import { db } from '@/lib/db';
import { registerToolHandler, type AiExecutionContext } from '@/lib/ai-tool-dispatcher';
import { getVapiVoiceProvider } from '@/lib/vapi-voice-provider';

// ─── Read tools ──────────────────────────────────────────────────────────────

registerToolHandler('get_customer', async (ctx, params) => {
  const phone = (params.phone as string) || '';
  const name = (params.name as string) || '';

  if (!phone && !name) {
    return { error: 'Either phone or name is required' };
  }

  const where: Record<string, unknown> = { tenantId: ctx.tenantId };
  if (phone) {
    // Normalize phone (strip spaces, dashes)
    const normalized = phone.replace(/[\s\-()]/g, '');
    where.OR = [
      { phone: { contains: normalized } },
      { phone: { contains: phone } },
    ];
  } else if (name) {
    where.OR = [
      { name: { contains: name, mode: 'insensitive' } },
    ];
  }

  const customer = await db.customer.findFirst({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      state: true,
    },
  });

  if (!customer) {
    return { found: false };
  }

  return { found: true, customer };
});

registerToolHandler('get_customer_jobs', async (ctx, params) => {
  const customerId = (params.customerId as string) || '';
  const customerPhone = (params.phone as string) || '';

  let customer;
  if (customerId) {
    customer = await db.customer.findFirst({
      where: { id: customerId, tenantId: ctx.tenantId },
      select: { id: true },
    });
  } else if (customerPhone) {
    const normalized = customerPhone.replace(/[\s\-()]/g, '');
    customer = await db.customer.findFirst({
      where: { tenantId: ctx.tenantId, phone: { contains: normalized } },
      select: { id: true },
    });
  }

  if (!customer) {
    return { error: 'Customer not found' };
  }

  const jobs = await db.job.findMany({
    where: { customerId: customer.id, tenantId: ctx.tenantId },
    select: {
      id: true,
      title: true,
      status: true,
      scheduledAt: true,
      scheduledTime: true,
      address: true,
      assigneeName: true,
    },
    orderBy: { scheduledAt: 'desc' },
    take: 5,
  });

  return { jobs };
});

registerToolHandler('get_job', async (ctx, params) => {
  const jobId = (params.jobId as string) || '';
  if (!jobId) {
    return { error: 'jobId is required' };
  }

  // Verify tenant ownership
  const job = await db.job.findFirst({
    where: { id: jobId, tenantId: ctx.tenantId },
    select: {
      id: true,
      title: true,
      status: true,
      scheduledAt: true,
      scheduledTime: true,
      address: true,
      customerName: true,
      customerPhone: true,
      assigneeName: true,
      notes: true,
    },
  });

  if (!job) {
    return { found: false };
  }

  return { found: true, job };
});

registerToolHandler('get_business_hours', async (ctx) => {
  const tenant = await db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { businessHoursJson: true, settingsJson: true },
  });

  if (!tenant) {
    return { error: 'Tenant not found' };
  }

  // Parse business hours (handles both legacy and new formats)
  let hours: Record<string, unknown> = {};
  if (tenant.businessHoursJson) {
    try {
      hours = JSON.parse(tenant.businessHoursJson);
    } catch {
      // malformed — return empty
    }
  }

  return { businessHours: hours };
});

registerToolHandler('get_service_options', async (ctx) => {
  const services = await db.service.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      durationMinutes: true,
    },
    take: 20,
  });

  return { services };
});

registerToolHandler('check_availability', async (ctx, params) => {
  // Phase 6.1 hardening: the 9-5 placeholder is NOT production-ready.
  // Until the real SchedulingService (Phase 4 of the original plan) is built,
  // this tool returns NOT_IMPLEMENTED in production to prevent the AI from
  // promising slots that don't match the actual scheduling system.
  if (process.env.NODE_ENV === 'production') {
    return {
      available: false,
      reason: 'NOT_IMPLEMENTED',
      message: 'Availability checking is not yet available. Please schedule manually.',
    };
  }

  const dateStr = (params.date as string) || '';
  if (!dateStr) {
    return { error: 'date is required (YYYY-MM-DD)' };
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { error: 'Invalid date format. Use YYYY-MM-DD.' };
  }

  // Check existing jobs on that date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingJobs = await db.job.findMany({
    where: {
      tenantId: ctx.tenantId,
      scheduledAt: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ['cancelled', 'completed'] },
    },
    select: { scheduledAt: true, scheduledTime: true, estimatedDuration: true },
  });

  // Generate available slots (9 AM - 5 PM, excluding existing jobs)
  // This is a V1 simplification — Phase 4 (SchedulingService) will be more sophisticated
  const slots: string[] = [];
  for (let hour = 9; hour < 17; hour++) {
    const slotTime = `${hour.toString().padStart(2, '0')}:00`;
    const isBooked = existingJobs.some((j) => {
      const jobTime = j.scheduledTime || (j.scheduledAt ? new Date(j.scheduledAt).toTimeString().slice(0, 5) : '');
      return jobTime === slotTime;
    });
    if (!isBooked) {
      slots.push(slotTime);
    }
  }

  return { date: dateStr, availableSlots: slots };
});

// ─── Action tools ───────────────────────────────────────────────────────────

registerToolHandler('create_lead', async (ctx, params) => {
  const name = (params.name as string) || '';
  const phone = (params.phone as string) || '';
  const email = (params.email as string) || '';
  const notes = (params.notes as string) || '';

  if (!name && !phone) {
    return { error: 'At least a name or phone is required' };
  }

  // Check for existing lead with same phone (dedup)
  if (phone) {
    const normalized = phone.replace(/[\s\-()]/g, '');
    const existing = await db.lead.findFirst({
      where: {
        tenantId: ctx.tenantId,
        phone: { contains: normalized },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // within last 24h
      },
      select: { id: true, name: true, status: true },
    });

    if (existing) {
      return { created: false, existing: true, leadId: existing.id, message: 'Lead already exists from recent call' };
    }
  }

  const lead = await db.lead.create({
    data: {
      tenantId: ctx.tenantId,
      name: name || 'Unknown Caller',
      phone: phone || null,
      email: email || null,
      notes: notes || 'Created by AI Receptionist',
      source: 'ai_receptionist',
      status: 'new',
    },
  });

  return { created: true, leadId: lead.id, message: `Lead created for ${lead.name}` };
});

registerToolHandler('create_customer', async (ctx, params) => {
  const name = (params.name as string) || '';
  const phone = (params.phone as string) || '';
  const email = (params.email as string) || '';
  const address = (params.address as string) || '';

  if (!name) {
    return { error: 'Name is required' };
  }

  // Check for existing customer with same phone
  if (phone) {
    const normalized = phone.replace(/[\s\-()]/g, '');
    const existing = await db.customer.findFirst({
      where: { tenantId: ctx.tenantId, phone: { contains: normalized } },
      select: { id: true, name: true },
    });

    if (existing) {
      return { created: false, existing: true, customerId: existing.id, message: 'Customer already exists' };
    }
  }

  const customer = await db.customer.create({
    data: {
      tenantId: ctx.tenantId,
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
    },
  });

  return { created: true, customerId: customer.id, message: `Customer created: ${customer.name}` };
});

registerToolHandler('create_job_request', async (ctx, params) => {
  const title = (params.title as string) || '';
  const customerId = (params.customerId as string) || '';
  const description = (params.description as string) || '';

  if (!title) {
    return { error: 'Title is required' };
  }

  // Verify customer belongs to this tenant
  if (customerId) {
    const customer = await db.customer.findFirst({
      where: { id: customerId, tenantId: ctx.tenantId },
      select: { id: true, name: true, phone: true },
    });

    if (!customer) {
      return { error: 'Customer not found or does not belong to this tenant' };
    }

    const job = await db.job.create({
      data: {
        tenantId: ctx.tenantId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone || null,
        title,
        description: description || 'Created by AI Receptionist',
        status: 'pending',
        type: 'service',
        source: 'ai_receptionist',
      },
    });

    return { created: true, jobId: job.id, message: `Job request created: ${title}` };
  }

  return { error: 'customerId is required' };
});

registerToolHandler('schedule_job', async (ctx, params) => {
  const title = (params.title as string) || '';
  const customerId = (params.customerId as string) || '';
  const dateStr = (params.date as string) || '';
  const timeStr = (params.time as string) || '';
  const address = (params.address as string) || '';

  if (!title || !customerId || !dateStr || !timeStr) {
    return { error: 'title, customerId, date, and time are required' };
  }

  // Verify customer belongs to this tenant
  const customer = await db.customer.findFirst({
    where: { id: customerId, tenantId: ctx.tenantId },
    select: { id: true, name: true, phone: true },
  });

  if (!customer) {
    return { error: 'Customer not found or does not belong to this tenant' };
  }

  const scheduledAt = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: 'Invalid date/time format' };
  }

  const job = await db.job.create({
    data: {
      tenantId: ctx.tenantId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone || null,
      title,
      scheduledAt,
      scheduledTime: timeStr,
      address: address || null,
      status: 'scheduled',
      type: 'service',
      source: 'ai_receptionist',
    },
  });

  return { created: true, jobId: job.id, scheduledAt: scheduledAt.toISOString(), message: `Job scheduled: ${title} on ${dateStr} at ${timeStr}` };
});

registerToolHandler('reschedule_job', async (ctx, params) => {
  const jobId = (params.jobId as string) || '';
  const dateStr = (params.date as string) || '';
  const timeStr = (params.time as string) || '';

  if (!jobId || !dateStr || !timeStr) {
    return { error: 'jobId, date, and time are required' };
  }

  // Verify job belongs to this tenant
  const job = await db.job.findFirst({
    where: { id: jobId, tenantId: ctx.tenantId },
    select: { id: true, title: true, customerName: true },
  });

  if (!job) {
    return { error: 'Job not found or does not belong to this tenant' };
  }

  const scheduledAt = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { error: 'Invalid date/time format' };
  }

  await db.job.update({
    where: { id: job.id },
    data: {
      scheduledAt,
      scheduledTime: timeStr,
      status: 'scheduled',
    },
  });

  return { rescheduled: true, jobId: job.id, newDate: dateStr, newTime: timeStr, message: `Job rescheduled to ${dateStr} at ${timeStr}` };
});

registerToolHandler('cancel_job', async (ctx, params) => {
  const jobId = (params.jobId as string) || '';
  const reason = (params.reason as string) || 'Cancelled by AI Receptionist';

  if (!jobId) {
    return { error: 'jobId is required' };
  }

  // Verify job belongs to this tenant
  const job = await db.job.findFirst({
    where: { id: jobId, tenantId: ctx.tenantId },
    select: { id: true, title: true, status: true },
  });

  if (!job) {
    return { error: 'Job not found or does not belong to this tenant' };
  }

  if (job.status === 'cancelled') {
    return { cancelled: false, message: 'Job is already cancelled' };
  }

  if (job.status === 'completed') {
    return { cancelled: false, message: 'Cannot cancel a completed job' };
  }

  await db.job.update({
    where: { id: job.id },
    data: { status: 'cancelled', notes: reason },
  });

  return { cancelled: true, jobId: job.id, message: `Job cancelled: ${job.title}` };
});

registerToolHandler('send_sms', async (ctx, params) => {
  const to = (params.to as string) || '';
  const message = (params.message as string) || '';

  if (!to || !message) {
    return { error: 'to and message are required' };
  }

  // Phase 6: Use the existing SMS sending infrastructure
  // This will call the SMS provider configured for the tenant
  try {
    const { sendSmsMessage } = await import('@/lib/sms-send');
    const result = await sendSmsMessage({
      to,
      message,
      tenantId: ctx.tenantId,
    });

    if (result.success) {
      return { sent: true, messageId: result.messageId, message: 'SMS sent successfully' };
    }
    return { sent: false, error: result.error || 'SMS sending failed' };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'SMS sending failed' };
  }
});

registerToolHandler('transfer_to_human', async (ctx, params) => {
  const target = (params.target as string) || '';

  // If no target specified, use the receptionist's handoff transfer target
  if (!target && ctx.receptionistId) {
    const receptionist = await db.aiReceptionist.findFirst({
      where: { id: ctx.receptionistId, tenantId: ctx.tenantId },
      select: { handoffTransferTarget: true },
    });

    if (receptionist?.handoffTransferTarget) {
      return {
        transferred: true,
        target: receptionist.handoffTransferTarget,
        message: 'Transferring to human agent',
        action: 'transfer',
        destination: receptionist.handoffTransferTarget,
      };
    }
  }

  if (!target) {
    return { error: 'No transfer target specified and no handoff target configured' };
  }

  // The actual Vapi transfer is handled by the VapiVoiceProvider
  // The function-call response tells Vapi to execute the transfer
  return {
    transferred: true,
    target,
    message: 'Transferring to human agent',
    action: 'transfer',
    destination: target,
  };
});

// ─── Initialize: log available tools ───────────────────────────────────────

console.log('[AiToolHandlers] registered handlers for:', Object.keys({
  get_customer: true,
  get_customer_jobs: true,
  get_job: true,
  get_business_hours: true,
  get_service_options: true,
  check_availability: true,
  create_lead: true,
  create_customer: true,
  create_job_request: true,
  schedule_job: true,
  reschedule_job: true,
  cancel_job: true,
  send_sms: true,
  transfer_to_human: true,
}).join(', '));
