/**
 * Communication Engine (Fieseros V1.5)
 * -------------------------------------
 * Unified multi-channel messaging layer that supports Email, SMS, WhatsApp,
 * Push, and In-App notifications. Automatically selects the best channel(s)
 * based on customer preferences / available contact info, logs every attempt
 * to the customer timeline, and creates in-app notifications for internal
 * users.
 *
 * Design principles:
 *  - **Logging is mandatory, delivery is best-effort.** Every send attempt
 *    creates a CustomerTimelineEntry. Actual email/SMS/WhatsApp delivery
 *    requires a configured provider (SMTP/SMS gateway/Meta WhatsApp); when no
 *    provider is configured, the message is "simulated" (logged but not sent).
 *  - **Never throw.** Per-channel failures are returned in the `results` map
 *    and `failed` list — the caller decides what to do with them.
 *  - **Server-side only.** This module touches Prisma + external providers
 *    and must NEVER be imported from a client component.
 */

import { db } from '@/lib/db';
import { addTimelineEntry } from '@/lib/customer-timeline';
import { logActivity } from '@/lib/activity-log';
import { formatCurrency } from '@/lib/currency';

// ─── Types ─────────────────────────────────────────────────────────────────

export type Channel = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app';

export interface SendMessageParams {
  tenantId: string;
  customerId?: string;
  /** For in_app/push notifications to internal users. */
  userId?: string;
  /** If not specified, auto-select based on customer prefs / user presence. */
  channels?: Channel[];
  /** Optional template name (rendered against `variables`). */
  templateKey?: string;
  /** Variables for template rendering ({{key}}). */
  variables?: Record<string, string>;
  // ── OR direct content ──
  subject?: string;
  body?: string;
  // ── Metadata ──
  senderId?: string;
  senderName?: string;
  /** The originating entity type: job, invoice, lead, etc. */
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** Override the NotificationPreference checks (e.g. for manual composer). */
  skipPreferenceCheck?: boolean;
}

export interface ChannelResult {
  success: boolean;
  error?: string;
  messageId?: string;
  simulated?: boolean;
}

export interface SendMessageResult {
  delivered: Channel[];
  failed: Channel[];
  results: Record<Channel, ChannelResult>;
}

// ─── Predefined message templates ──────────────────────────────────────────
// These mirror the "Job Scheduled", "Technician On Route", etc. options
// surfaced in the Communication Composer. They use {{variables}} that are
// rendered by `renderTemplate()`.

interface TemplateDef {
  subject: string;
  body: string;
}

export const COMMUNICATION_TEMPLATES: Record<string, TemplateDef> = {
  job_scheduled: {
    subject: 'Your service is scheduled — {{jobTitle}}',
    body:
      "Hi {{customerName}},\n\n" +
      "Your service \"{{jobTitle}}\" has been scheduled for {{scheduledDate}}. " +
      "Our technician {{assigneeName}} will be assigned to your job. " +
      "We'll send you another update when the technician is on the way.\n\n" +
      "Thank you for choosing {{companyName}}.",
  },
  technician_on_route: {
    subject: 'Your technician is on the way — {{companyName}}',
    body:
      "Hi {{customerName}},\n\n" +
      "Good news! Your technician {{assigneeName}} is on the way to your location. ETA: {{eta}}.\n\n" +
      "If you have any questions, feel free to reply to this message.\n\n" +
      "Thank you,\n{{companyName}}",
  },
  job_complete: {
    subject: 'Service completed — {{jobTitle}}',
    body:
      "Hi {{customerName}},\n\n" +
      "Your service \"{{jobTitle}}\" has been completed. Notes: {{notes}}\n\n" +
      "Thank you for choosing {{companyName}}. We'd love to hear your feedback!",
  },
  invoice_sent: {
    subject: 'Invoice {{invoiceNumber}} from {{companyName}}',
    body:
      "Hi {{customerName}},\n\n" +
      "Your invoice {{invoiceNumber}} for {{amount}} is now ready. " +
      "Payment is due by {{dueDate}}.\n\n" +
      "Thank you,\n{{companyName}}",
  },
  payment_received: {
    subject: 'Payment received — Thank you!',
    body:
      "Hi {{customerName}},\n\n" +
      "We've received your payment of {{amount}} for invoice {{invoiceNumber}}. " +
      "Thank you for your prompt payment!\n\n" +
      "Best regards,\n{{companyName}}",
  },
  custom: {
    subject: 'Message from {{companyName}}',
    body: 'Hi {{customerName}},',
  },
};

// ─── Template rendering ────────────────────────────────────────────────────

/**
 * Render a template by substituting {{key}} placeholders with values from
 * the provided variables map. Unknown keys are replaced with empty strings
 * (so missing data doesn't leave `{{customerName}}` visible to the customer).
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string> = {},
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

/**
 * Resolve a templateKey into a rendered subject + body, falling back to
 * the caller-provided subject/body if no template matches.
 *
 * Resolution order:
 *   1. If BOTH `params.subject` AND `params.body` are non-empty (i.e. the
 *      user typed/edited text in the composer), use those as the source —
 *      they may still contain `{{var}}` placeholders which we render
 *      against the supplied `variables` map. This prevents a picked
 *      template from discarding the user's edits.
 *   2. Otherwise, if `params.templateKey` matches a known template, use it.
 *   3. Otherwise, fall back to whatever subject/body (if any) was supplied.
 *
 * The `variables` argument is the resolved-from-DB variable map (see
 * `resolveContext`). If omitted, `params.variables` is used instead.
 */
export function resolveTemplate(
  params: SendMessageParams,
  variables: Record<string, string> = {},
): { subject: string; body: string } {
  const vars = Object.keys(variables).length > 0 ? variables : (params.variables ?? {});

  // (1) Prefer user-edited subject + body.
  if (params.subject?.trim() && params.body?.trim()) {
    return {
      subject: renderTemplate(params.subject, vars),
      body: renderTemplate(params.body, vars),
    };
  }

  // (2) Named template lookup.
  if (params.templateKey && COMMUNICATION_TEMPLATES[params.templateKey]) {
    const tpl = COMMUNICATION_TEMPLATES[params.templateKey];
    return {
      subject: renderTemplate(tpl.subject, vars),
      body: renderTemplate(tpl.body, vars),
    };
  }

  // (3) Fall back to whatever was supplied (one or both may be empty).
  return {
    subject: params.subject ? renderTemplate(params.subject, vars) : '',
    body: params.body ? renderTemplate(params.body, vars) : '',
  };
}

// ─── Channel selection ─────────────────────────────────────────────────────

interface CustomerLike {
  id: string;
  phone?: string | null;
  email?: string | null;
  whatsappId?: string | null;
}

/**
 * Select the best channels for a given notification type based on the
 * customer's available contact info.
 *
 * Priority order (for customers):
 *   1. Email (if customer.email is set)
 *   2. SMS (if customer.phone is set)
 *   3. WhatsApp (if customer.whatsappId is set — indicates they've opted in
 *      via WhatsApp at least once)
 *
 * For internal users (no customerId, only userId), always return ['in_app'].
 *
 * The `notificationType` is currently informational (it doesn't change the
 * channel selection) but is reserved for future per-type preference overrides.
 */
export function selectBestChannels(
  customer: CustomerLike | null | undefined,
  notificationType: string = 'general',
): Channel[] {
  // Caller hint — kept for future use; the linter complains otherwise.
  void notificationType;

  if (!customer) return ['in_app'];

  const channels: Channel[] = [];
  if (customer.email) channels.push('email');
  if (customer.phone) channels.push('sms');
  if (customer.whatsappId) channels.push('whatsapp');
  // Always also create an in-app notification for the internal team when
  // we send to a customer (so admins/managers see the conversation in the
  // customer 360 timeline even without an inbox check).
  channels.push('in_app');

  return channels.length > 1 ? channels : ['in_app'];
}

// ─── Sender / tenant info ──────────────────────────────────────────────────

interface ResolvedContext {
  tenantId: string;
  customer: CustomerLike | null;
  customerName: string | null;
  recipientUserId?: string | null;
  senderName: string;
  subject: string;
  body: string;
  /** Full variable map (all 10 keys) resolved from the DB. */
  variables: Record<string, string>;
}

// ─── Lightweight shape of a Job row — only the fields we read for templates.
// (Defined as a structural type so we don't couple to the generated Prisma
// type; `db.job.findUnique({ select })` returns an object that satisfies this.)
interface JobForTemplate {
  title?: string | null;
  assigneeName?: string | null;
  scheduledAt?: Date | null;
  notes?: string | null;
  customerId?: string | null;
}

interface InvoiceForTemplate {
  number?: string | null;
  amount?: number | null;
  dueDate?: Date | null;
  currency?: string | null;
  jobId?: string | null;
  customerId?: string | null;
}

/**
 * Build the full 10-key variable map used by `renderTemplate`.
 *
 * Field-name reference (verified against `prisma/schema.prisma`):
 *   - Job.title        : string
 *   - Job.assigneeName : string?
 *   - Job.scheduledAt  : DateTime?   ← surfaced as {{scheduledDate}}
 *   - Job.notes        : string?
 *   - Job.eta          : (no such field — {{eta}} resolves to '')
 *   - Invoice.number   : string       ← surfaced as {{invoiceNumber}}
 *   - Invoice.amount   : Float
 *   - Invoice.dueDate  : DateTime?
 *   - Invoice.currency : String
 *   - Tenant.name      : string       ← surfaced as {{companyName}}
 */
function buildVariables(args: {
  customerName: string | null;
  tenantName: string | null;
  tenantCurrency: string | null;
  job?: JobForTemplate | null;
  invoice?: InvoiceForTemplate | null;
}): Record<string, string> {
  const { customerName, tenantName, tenantCurrency, job, invoice } = args;
  return {
    customerName: customerName || '',
    jobTitle: job?.title || '',
    assigneeName: job?.assigneeName || '',
    companyName: tenantName || '',
    scheduledDate: job?.scheduledAt
      ? new Date(job.scheduledAt).toLocaleDateString()
      : '',
    invoiceNumber: invoice?.number || '',
    amount:
      invoice && typeof invoice.amount === 'number' && invoice.amount > 0
        ? formatCurrency(invoice.amount, invoice.currency || tenantCurrency || 'USD')
        : '',
    dueDate: invoice?.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString()
      : '',
    eta: '',
    notes: job?.notes || '',
  };
}

async function resolveContext(
  params: SendMessageParams,
): Promise<ResolvedContext> {
  const tenantId = params.tenantId;
  let customer: CustomerLike | null = null;
  let customerName: string | null = null;

  if (params.customerId) {
    try {
      const c = await db.customer.findUnique({
        where: { id: params.customerId },
        select: { id: true, name: true, phone: true, email: true, whatsappId: true },
      });
      if (c) {
        customer = c;
        customerName = c.name;
      }
    } catch (err) {
      console.error('[comm-engine] Failed to load customer:', err);
    }
  }

  // Always load the tenant when possible — we need its name for both
  // `senderName` (fallback) and the `{{companyName}}` template variable.
  let tenantName: string | null = null;
  let tenantCurrency: string | null = null;
  if (tenantId) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, currency: true },
      });
      if (tenant?.name) tenantName = tenant.name;
      if (tenant?.currency) tenantCurrency = tenant.currency;
    } catch (err) {
      console.error('[comm-engine] Failed to load tenant:', err);
    }
  }

  // ── Load related entity data (Job / Invoice) for variable resolution. ──
  let job: JobForTemplate | null = null;
  let invoice: InvoiceForTemplate | null = null;
  const entType = params.relatedEntityType;
  const entId = params.relatedEntityId;

  if (entId && entType === 'job') {
    try {
      const j = await db.job.findUnique({
        where: { id: entId },
        select: {
          title: true,
          assigneeName: true,
          scheduledAt: true,
          notes: true,
          customerId: true,
        },
      });
      if (j) job = j as JobForTemplate;

      // If the customer wasn't passed explicitly, fall back to the job's
      // customer so we still have a recipient + customerName.
      if (job && !customer && job.customerId) {
        try {
          const c = await db.customer.findUnique({
            where: { id: job.customerId },
            select: { id: true, name: true, phone: true, email: true, whatsappId: true },
          });
          if (c) {
            customer = c;
            customerName = c.name;
          }
        } catch (err) {
          console.error('[comm-engine] Failed to load job customer:', err);
        }
      }

      // Linked invoice for this job (most recent first).
      try {
        const inv = await db.invoice.findFirst({
          where: { jobId: entId },
          orderBy: { createdAt: 'desc' },
          select: {
            number: true,
            amount: true,
            dueDate: true,
            currency: true,
            jobId: true,
            customerId: true,
          },
        });
        if (inv) invoice = inv as InvoiceForTemplate;
      } catch (err) {
        console.error('[comm-engine] Failed to load job invoice:', err);
      }
    } catch (err) {
      console.error('[comm-engine] Failed to load job:', err);
    }
  } else if (entId && entType === 'invoice') {
    try {
      const inv = await db.invoice.findUnique({
        where: { id: entId },
        select: {
          number: true,
          amount: true,
          dueDate: true,
          currency: true,
          jobId: true,
          customerId: true,
        },
      });
      if (inv) {
        invoice = inv as InvoiceForTemplate;

        // Linked job (for title / assignee / scheduledDate / notes).
        if (invoice.jobId) {
          try {
            const j = await db.job.findUnique({
              where: { id: invoice.jobId },
              select: {
                title: true,
                assigneeName: true,
                scheduledAt: true,
                notes: true,
                customerId: true,
              },
            });
            if (j) job = j as JobForTemplate;
          } catch (err) {
            console.error('[comm-engine] Failed to load invoice job:', err);
          }
        }

        // Linked customer (if not already loaded).
        if (!customer && invoice.customerId) {
          try {
            const c = await db.customer.findUnique({
              where: { id: invoice.customerId },
              select: { id: true, name: true, phone: true, email: true, whatsappId: true },
            });
            if (c) {
              customer = c;
              customerName = c.name;
            }
          } catch (err) {
            console.error('[comm-engine] Failed to load invoice customer:', err);
          }
        }
      }
    } catch (err) {
      console.error('[comm-engine] Failed to load invoice:', err);
    }
  }

  // ── Build the full variable map. ──
  const variables = buildVariables({
    customerName,
    tenantName,
    tenantCurrency,
    job,
    invoice,
  });

  // ── Resolve sender name. ──
  let senderName = params.senderName ?? 'Fieseros';
  if (!params.senderName && tenantName) senderName = tenantName;

  // ── Resolve the subject/body using the DB-built variable map. ──
  const { subject, body } = resolveTemplate(params, variables);

  return {
    tenantId,
    customer,
    customerName,
    recipientUserId: params.userId ?? null,
    senderName,
    subject,
    body,
    variables,
  };
}

// ─── Per-channel senders ───────────────────────────────────────────────────
// Each one is wrapped in try/catch and returns a ChannelResult so a failure
// in one channel never affects the others.

async function sendInApp(
  ctx: ResolvedContext,
  params: SendMessageParams,
): Promise<ChannelResult> {
  try {
    // Determine recipient(s):
    //  - If params.userId is set → notify that specific internal user.
    //  - Otherwise, notify all tenant users with role owner/admin/manager
    //    (so the team is aware of every customer-facing message).
    const recipientIds: string[] = [];
    if (ctx.recipientUserId) {
      recipientIds.push(ctx.recipientUserId);
    } else if (ctx.tenantId) {
      const users = await db.user.findMany({
        where: {
          tenantId: ctx.tenantId,
          role: { in: ['owner', 'admin', 'manager'] },
        },
        select: { id: true },
      });
      recipientIds.push(...users.map((u) => u.id));
    }

    if (recipientIds.length === 0) {
      return {
        success: false,
        error: 'No recipient user(s) to deliver in-app notification to.',
      };
    }

    const title = ctx.subject || `Message to ${ctx.customerName || 'customer'}`;
    const message = ctx.body?.slice(0, 500) || '';
    const metadata = JSON.stringify({
      customerId: params.customerId ?? null,
      channels: params.channels ?? [],
      relatedEntityType: params.relatedEntityType ?? null,
      relatedEntityId: params.relatedEntityId ?? null,
      templateKey: params.templateKey ?? null,
    });
    const actionUrl = params.relatedEntityType && params.relatedEntityId
      ? `/${params.relatedEntityType}s/${params.relatedEntityId}`
      : params.customerId
        ? `/customers/${params.customerId}`
        : null;

    await Promise.all(
      recipientIds.map((id) =>
        db.appNotification.create({
          data: {
            tenantId: ctx.tenantId,
            recipientId: id,
            type: 'reminder',
            category: 'customer',
            title,
            message,
            metadataJson: metadata,
            actionUrl,
            priority: 'normal',
            senderId: params.senderId ?? null,
            senderType: params.senderId ? 'user' : 'system',
          },
        }),
      ),
    );

    return { success: true, messageId: `inapp_${Date.now()}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

async function sendPush(
  ctx: ResolvedContext,
  params: SendMessageParams,
): Promise<ChannelResult> {
  try {
    // For now we treat push the same as in-app (create an AppNotification
    // flagged for push delivery). Actual Web Push requires VAPID keys + a
    // PushSubscription; if those are present the SW will deliver the push.
    if (!ctx.recipientUserId) {
      return {
        success: false,
        error: 'Push notifications require a userId (internal user).',
      };
    }
    const notif = await db.appNotification.create({
      data: {
        tenantId: ctx.tenantId,
        recipientId: ctx.recipientUserId,
        type: 'reminder',
        category: 'customer',
        title: ctx.subject || `Message to ${ctx.customerName || 'customer'}`,
        message: ctx.body?.slice(0, 500) || '',
        metadataJson: JSON.stringify({
          customerId: params.customerId ?? null,
          push: true,
          relatedEntityType: params.relatedEntityType ?? null,
          relatedEntityId: params.relatedEntityId ?? null,
        }),
        actionUrl: params.customerId ? `/customers/${params.customerId}` : null,
        priority: 'normal',
        senderId: params.senderId ?? null,
        senderType: params.senderId ? 'user' : 'system',
      },
    });

    // Mark pushSent=true so the client SW can pick it up if VAPID is configured.
    try {
      await db.appNotification.update({
        where: { id: notif.id },
        data: { pushSent: true, pushSentAt: new Date() },
      });
    } catch {
      /* non-fatal */
    }

    return { success: true, messageId: notif.id, simulated: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

async function sendEmailChannel(
  ctx: ResolvedContext,
): Promise<ChannelResult> {
  if (!ctx.customer?.email) {
    return { success: false, error: 'Customer has no email address.' };
  }
  try {
    // Dynamically import so a misconfigured nodemailer never breaks this
    // module's import graph (it's lazy-loaded at first use).
    const { sendEmail } = await import('@/lib/email-send');
    const result = await sendEmail({
      to: ctx.customer.email,
      subject: ctx.subject || '(no subject)',
      text: ctx.body || '',
      tenantId: ctx.tenantId,
      usageType: 'transactional',
    });
    if (result.success) {
      return {
        success: true,
        messageId: result.messageId,
        simulated: result.simulated,
      };
    }
    return {
      success: false,
      error: result.error || 'Email provider failed to deliver.',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[comm-engine] Email send threw:', msg);
    return { success: false, error: msg };
  }
}

async function sendSmsChannel(ctx: ResolvedContext): Promise<ChannelResult> {
  if (!ctx.customer?.phone) {
    return { success: false, error: 'Customer has no phone number.' };
  }
  try {
    const { sendSmsMessage } = await import('@/lib/sms-send');
    const result = await sendSmsMessage({
      to: ctx.customer.phone,
      message: ctx.body || '',
      tenantId: ctx.tenantId,
    });
    return {
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      error: result.error,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[comm-engine] SMS send threw:', msg);
    return { success: false, error: msg };
  }
}

async function sendWhatsAppChannel(
  ctx: ResolvedContext,
): Promise<ChannelResult> {
  if (!ctx.customer?.phone && !ctx.customer?.whatsappId) {
    return { success: false, error: 'Customer has no WhatsApp number.' };
  }
  try {
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp-send');
    const to = ctx.customer.whatsappId || ctx.customer.phone || '';
    const result = await sendWhatsAppMessage({
      to,
      message: ctx.body || '',
      tenantId: ctx.tenantId,
    });
    if (result.success) {
      return {
        success: true,
        messageId: result.messageId,
        simulated: result.simulated,
      };
    }
    return {
      success: false,
      error: result.error || 'WhatsApp provider failed to deliver.',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[comm-engine] WhatsApp send threw:', msg);
    // Fall back to simulated so the timeline entry is still created.
    console.log(
      `[comm-engine][WhatsApp SIMULATED] To: ${ctx.customer.whatsappId || ctx.customer.phone}, Body: ${(ctx.body || '').slice(0, 160)}`,
    );
    return {
      success: true,
      messageId: `sim_wa_${Date.now()}`,
      simulated: true,
      error: msg,
    };
  }
}

// ─── Timeline + activity logging ───────────────────────────────────────────

async function logChannelToTimeline(
  ctx: ResolvedContext,
  channel: Channel,
  result: ChannelResult,
  params: SendMessageParams,
): Promise<void> {
  if (!ctx.customer) return;
  const entryTypeMap: Record<Channel, string> = {
    email: 'email',
    sms: 'sms',
    whatsapp: 'whatsapp',
    push: 'note',
    in_app: 'note',
  };
  const entryType = entryTypeMap[channel] || 'note';
  const statusLabel = result.success
    ? result.simulated
      ? '(simulated — no provider configured)'
      : ''
    : `(failed: ${result.error || 'unknown error'})`;
  await addTimelineEntry({
    tenantId: ctx.tenantId,
    customerId: ctx.customer.id,
    entryType,
    title: `${channel.toUpperCase()} sent: ${ctx.subject || '(no subject)'} ${statusLabel}`.trim(),
    description: ctx.body || '',
    sourceType: params.relatedEntityType || 'CommunicationEngine',
    sourceId: params.relatedEntityId || undefined,
    metadataJson: JSON.stringify({
      channel,
      success: result.success,
      simulated: result.simulated || false,
      messageId: result.messageId ?? null,
      error: result.error ?? null,
      templateKey: params.templateKey ?? null,
      relatedEntityType: params.relatedEntityType ?? null,
      relatedEntityId: params.relatedEntityId ?? null,
    }),
    actorId: params.senderId ?? null,
    actorName: params.senderName ?? null,
    actorType: params.senderId ? 'user' : 'system',
  });
}

// ─── Main entry point ──────────────────────────────────────────────────────

/**
 * Send a multi-channel message. See `SendMessageParams` for the full API.
 *
 * Returns a per-channel result map plus `delivered`/`failed` summary lists.
 * Never throws — per-channel failures are captured in the results.
 */
export async function sendMessage(
  params: SendMessageParams,
): Promise<SendMessageResult> {
  const ctx = await resolveContext(params);

  // Determine which channels to actually use.
  let channels = params.channels?.length ? params.channels : selectBestChannels(ctx.customer, params.templateKey || 'general');
  // De-duplicate + preserve order.
  channels = Array.from(new Set(channels));

  // If channels include push but no userId was provided, drop push (it's
  // only valid for internal users). Same for in_app when there is no
  // userId AND no tenantId (so we can resolve recipient users).
  channels = channels.filter((c) => {
    if (c === 'push' && !ctx.recipientUserId) return false;
    if (c === 'in_app' && !ctx.recipientUserId && !ctx.tenantId) return false;
    return true;
  });

  const results: Partial<Record<Channel, ChannelResult>> = {};
  const delivered: Channel[] = [];
  const failed: Channel[] = [];

  for (const channel of channels) {
    let result: ChannelResult;
    switch (channel) {
      case 'email':
        result = await sendEmailChannel(ctx);
        break;
      case 'sms':
        result = await sendSmsChannel(ctx);
        break;
      case 'whatsapp':
        result = await sendWhatsAppChannel(ctx);
        break;
      case 'push':
        result = await sendPush(ctx, params);
        break;
      case 'in_app':
      default:
        result = await sendInApp(ctx, params);
        break;
    }
    results[channel] = result;
    if (result.success) delivered.push(channel);
    else failed.push(channel);

    // Always log to customer timeline (non-fatal).
    await logChannelToTimeline(ctx, channel, result, params);
  }

  // One audit-log entry capturing the overall send (non-fatal).
  try {
    await logActivity({
      tenantId: ctx.tenantId,
      actorId: params.senderId ?? null,
      actorName: params.senderName ?? null,
      actorType: params.senderId ? 'user' : 'system',
      action: 'create',
      entityType: params.relatedEntityType || 'communication',
      entityId: params.relatedEntityId ?? null,
      entityName: ctx.customerName || params.subject || undefined,
      description: `Sent ${channels.join(', ')} message "${ctx.subject || '(no subject)'}" — delivered: ${delivered.join(',') || 'none'}`,
      metadataJson: JSON.stringify({
        channels,
        delivered,
        failed,
        customerId: params.customerId ?? null,
        userId: params.userId ?? null,
        templateKey: params.templateKey ?? null,
        results,
      }),
      severity: failed.length === channels.length ? 'warning' : 'info',
    });
  } catch (err) {
    console.error('[comm-engine] logActivity failed:', err);
  }

  // Fill in any missing channel keys (so the returned `results` is always
  // a complete Record<Channel, ChannelResult>).
  const fullResults: Record<Channel, ChannelResult> = {
    email: results.email ?? { success: false, error: 'not attempted' },
    sms: results.sms ?? { success: false, error: 'not attempted' },
    whatsapp: results.whatsapp ?? { success: false, error: 'not attempted' },
    push: results.push ?? { success: false, error: 'not attempted' },
    in_app: results.in_app ?? { success: false, error: 'not attempted' },
  };

  return { delivered, failed, results: fullResults };
}
