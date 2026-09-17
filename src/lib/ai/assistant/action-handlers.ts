import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import {
  parseNaturalDateTime,
  resolveOrCreateCustomer,
  resolveEmployee,
  checkEmployeeScheduleConflict,
} from './entity-resolver';

export interface ActionContext {
  tenantId: string;
  workspaceId: string | null;
  userId?: string;
  userName?: string;
}

/**
 * 1. CREATE JOB
 */
export async function executeCreateJob(
  ctx: ActionContext,
  args: {
    customerName: string;
    serviceTitle?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    employeeName?: string;
    amount?: number;
    description?: string;
    address?: string;
    priority?: string;
    phone?: string;
    email?: string;
  }
) {
  const { tenantId, workspaceId } = ctx;
  if (!workspaceId) throw new Error('No active workspace found.');

  // 1. Resolve or Create Customer
  const { customer, isNew: isCustomerNew } = await resolveOrCreateCustomer(
    tenantId,
    args.customerName,
    { phone: args.phone, email: args.email, address: args.address }
  );

  // 2. Resolve Employee / Assignee
  const employee = await resolveEmployee(tenantId, args.employeeName, workspaceId);

  // 3. Parse Date & Time
  const { scheduledAt, scheduledTimeString } = parseNaturalDateTime(
    args.scheduledDate,
    args.scheduledTime
  );

  // 4. Check for schedule conflicts
  const conflictWarning = await checkEmployeeScheduleConflict(
    workspaceId,
    employee?.id,
    scheduledAt
  );

  const title = (args.serviceTitle || 'Service Request').trim();
  const quotedAmount = typeof args.amount === 'number' && !isNaN(args.amount) ? args.amount : null;
  const jobNumber = `J-${Math.floor(1000 + Math.random() * 9000)}`;

  // 5. Create Job Record
  const newJob = await db.job.create({
    data: {
      jobNumber,
      workspaceId,
      title,
      description: args.description || `Job created via AI Assistant for ${customer.name}`,
      status: 'scheduled',
      priority: args.priority || 'medium',
      address: args.address || customer.address || null,
      scheduledAt,
      scheduledTime: scheduledTimeString,
      quotedAmount,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      assigneeId: employee?.id || null,
      assigneeName: employee?.name || null,
      assigneePhone: employee?.phone || null,
    },
  });

  // 6. Log Activity
  await logActivity({
    tenantId,
    actorId: ctx.userId || null,
    actorName: ctx.userName || 'AI Copilot',
    actorType: 'ai',
    action: 'create',
    entityType: 'job',
    entityId: newJob.id,
    entityName: newJob.title,
    description: `Created Job "${title}" for ${customer.name} on ${scheduledAt.toLocaleDateString()} at ${scheduledTimeString} ($${quotedAmount || 0})`,
  }).catch(() => null);

  return {
    success: true,
    action: 'created_job',
    job: {
      id: newJob.id,
      jobNumber: newJob.jobNumber,
      title: newJob.title,
      customerName: customer.name,
      isNewCustomer: isCustomerNew,
      assigneeName: employee?.name || 'Unassigned',
      scheduledDate: scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      scheduledTime: scheduledTimeString,
      amount: quotedAmount,
      status: newJob.status,
      address: newJob.address,
    },
    conflictWarning,
    viewUrl: `/jobs/${newJob.id}`,
  };
}

/**
 * 2. CREATE CUSTOMER
 */
export async function executeCreateCustomer(
  ctx: ActionContext,
  args: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    companyName?: string;
  }
) {
  const { tenantId, workspaceId } = ctx;
  const name = args.name.trim();

  const customer = await db.customer.create({
    data: {
      tenantId,
      workspaceId: workspaceId || null,
      name,
      phone: args.phone || 'Not provided',
      email: args.email || null,
      address: args.address || null,
      companyName: args.companyName || null,
    },
  });

  await logActivity({
    tenantId,
    actorId: ctx.userId || null,
    actorName: ctx.userName || 'AI Copilot',
    actorType: 'ai',
    action: 'create',
    entityType: 'customer',
    entityId: customer.id,
    entityName: customer.name,
    description: `Created Customer "${name}" via AI Copilot (${args.phone || args.email || 'No contact info'})`,
  }).catch(() => null);

  return {
    success: true,
    action: 'created_customer',
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    },
    viewUrl: `/customers/${customer.id}`,
  };
}

/**
 * 3. CREATE LEAD
 */
export async function executeCreateLead(
  ctx: ActionContext,
  args: {
    name: string;
    phone?: string;
    email?: string;
    serviceRequired?: string;
    estimatedValue?: number;
    source?: string;
    notes?: string;
  }
) {
  const { tenantId } = ctx;
  const name = args.name.trim();

  const lead = await db.lead.create({
    data: {
      tenantId,
      name,
      phone: args.phone || 'Not provided',
      email: args.email || null,
      serviceType: args.serviceRequired || 'General Inquiry',
      value: typeof args.estimatedValue === 'number' ? args.estimatedValue : 0,
      source: args.source || 'ai_copilot',
      status: 'new',
      description: args.notes || 'Captured via AI Assistant',
    },
  });

  await logActivity({
    tenantId,
    actorId: ctx.userId || null,
    actorName: ctx.userName || 'AI Copilot',
    actorType: 'ai',
    action: 'create',
    entityType: 'lead',
    entityId: lead.id,
    entityName: lead.name,
    description: `Created Lead "${name}" (${lead.serviceType || 'General'}) via AI Copilot`,
  }).catch(() => null);

  return {
    success: true,
    action: 'created_lead',
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      serviceType: lead.serviceType,
      value: lead.value,
      status: lead.status,
    },
    viewUrl: `/leads/${lead.id}`,
  };
}

/**
 * 4. CREATE QUOTE
 */
export async function executeCreateQuote(
  ctx: ActionContext,
  args: {
    customerName: string;
    title?: string;
    totalAmount?: number;
    notes?: string;
  }
) {
  const { tenantId } = ctx;
  const { customer } = await resolveOrCreateCustomer(tenantId, args.customerName);

  const total = typeof args.totalAmount === 'number' ? args.totalAmount : 0;
  const title = args.title || `Quote for ${customer.name}`;

  const quote = await db.quote.create({
    data: {
      tenantId,
      customerId: customer.id,
      title,
      description: args.notes || 'Created via AI Assistant',
      status: 'draft',
      total,
      subtotal: total,
    },
  });

  await logActivity({
    tenantId,
    actorId: ctx.userId || null,
    actorName: ctx.userName || 'AI Copilot',
    actorType: 'ai',
    action: 'create',
    entityType: 'quote',
    entityId: quote.id,
    entityName: quote.title,
    description: `Created Quote "${title}" for ${customer.name} ($${total}) via AI Copilot`,
  }).catch(() => null);

  return {
    success: true,
    action: 'created_quote',
    quote: {
      id: quote.id,
      title: quote.title,
      customerName: customer.name,
      total: quote.total,
      status: quote.status,
    },
    viewUrl: `/quotes/${quote.id}`,
  };
}

/**
 * 5. CREATE INVOICE
 */
export async function executeCreateInvoice(
  ctx: ActionContext,
  args: {
    customerName: string;
    amount: number;
    description?: string;
    dueDate?: string;
    jobId?: string;
  }
) {
  const { tenantId } = ctx;
  const { customer } = await resolveOrCreateCustomer(tenantId, args.customerName);

  const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const total = typeof args.amount === 'number' ? args.amount : 0;
  const dueDate = args.dueDate ? new Date(args.dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const invoice = await db.invoice.create({
    data: {
      number: invoiceNumber,
      tenantId,
      customerId: customer.id,
      jobId: args.jobId || null,
      amount: total,
      total,
      status: 'draft',
      dueDate,
      notes: args.description || `Invoice for ${customer.name}`,
    },
  });

  await logActivity({
    tenantId,
    actorId: ctx.userId || null,
    actorName: ctx.userName || 'AI Copilot',
    actorType: 'ai',
    action: 'create',
    entityType: 'invoice',
    entityId: invoice.id,
    entityName: invoice.number,
    description: `Created Invoice "${invoice.number}" for ${customer.name} ($${total}) via AI Copilot`,
  }).catch(() => null);

  return {
    success: true,
    action: 'created_invoice',
    invoice: {
      id: invoice.id,
      number: invoice.number,
      customerName: customer.name,
      total: invoice.total,
      status: invoice.status,
      dueDate: dueDate.toLocaleDateString(),
    },
    viewUrl: `/invoices/${invoice.id}`,
  };
}

/**
 * 6. LOG EXPENSE
 */
export async function executeLogExpense(
  ctx: ActionContext,
  args: {
    amount: number;
    category: string;
    vendor?: string;
    description?: string;
    date?: string;
  }
) {
  const { tenantId } = ctx;
  const amount = typeof args.amount === 'number' ? args.amount : 0;
  const expenseDate = args.date ? new Date(args.date) : new Date();
  const expenseNumber = `EXP-${Math.floor(1000 + Math.random() * 9000)}`;
  const description = args.vendor 
    ? `${args.vendor}: ${args.description || 'General expense'}` 
    : (args.description || 'Logged via AI Assistant');

  const expense = await db.expense.create({
    data: {
      number: expenseNumber,
      tenantId,
      amount,
      category: args.category || 'General',
      description,
      expenseDate,
      status: 'pending',
    },
  });

  await logActivity({
    tenantId,
    actorId: ctx.userId || null,
    actorName: ctx.userName || 'AI Copilot',
    actorType: 'ai',
    action: 'create',
    entityType: 'expense',
    entityId: expense.id,
    entityName: expense.number,
    description: `Logged Expense "${expense.number}" ($${amount}, ${expense.category}) via AI Copilot`,
  }).catch(() => null);

  return {
    success: true,
    action: 'logged_expense',
    expense: {
      id: expense.id,
      number: expense.number,
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expenseDate.toLocaleDateString(),
    },
    viewUrl: `/expenses`,
  };
}

/**
 * 7. CREATE AI FORM
 */
export async function executeCreateAiForm(
  ctx: ActionContext,
  args: {
    title: string;
    description?: string;
    industry?: string;
    fieldNames?: string[];
  }
) {
  const { tenantId, workspaceId } = ctx;
  const title = (args.title || 'New Smart Form').trim();
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.floor(100 + Math.random() * 900)}`;

  const defaultFields = args.fieldNames && args.fieldNames.length > 0
    ? args.fieldNames.map((name, i) => ({
        id: `f_${i + 1}`,
        label: name,
        type: name.toLowerCase().includes('email') ? 'email' : name.toLowerCase().includes('phone') ? 'phone' : 'text',
        required: true,
      }))
    : [
        { id: 'f_name', label: 'Full Name', type: 'text', required: true },
        { id: 'f_email', label: 'Email Address', type: 'email', required: true },
        { id: 'f_phone', label: 'Phone Number', type: 'phone', required: false },
        { id: 'f_service', label: 'Service Needed', type: 'text', required: true },
      ];

  const form = await db.form.create({
    data: {
      tenantId,
      workspaceId,
      name: title,
      description: args.description || 'Generated via AI Assistant',
      slug,
      status: 'active',
      fieldsJson: JSON.stringify(defaultFields),
      schemaJson: JSON.stringify({ fields: defaultFields, title }),
    },
  });

  await logActivity({
    tenantId,
    actorId: ctx.userId || null,
    actorName: ctx.userName || 'AI Copilot',
    actorType: 'ai',
    action: 'create',
    entityType: 'form',
    entityId: form.id,
    entityName: form.name,
    description: `Created AI Form "${form.name}" with ${defaultFields.length} fields via AI Copilot`,
  }).catch(() => null);

  return {
    success: true,
    action: 'created_form',
    form: {
      id: form.id,
      name: form.name,
      slug: form.slug,
      fieldCount: defaultFields.length,
    },
    viewUrl: `/forms/${form.id}`,
  };
}

/**
 * 8. SEND MESSAGING TRIGGER (WhatsApp / Email / SMS)
 */
export async function executeSendMessage(
  ctx: ActionContext,
  args: {
    customerName: string;
    channel: 'whatsapp' | 'email' | 'sms';
    message: string;
    subject?: string;
  }
) {
  const { tenantId, workspaceId } = ctx;
  const { customer } = await resolveOrCreateCustomer(tenantId, args.customerName);
  const channel = args.channel || 'whatsapp';
  const phone = customer.phone || 'Unknown';
  const conversationId = `conv_${channel}_${customer.id}_${Date.now()}`;

  const messagePayload = {
    id: `msg_${Date.now()}`,
    sender: 'business',
    text: args.message,
    subject: args.subject,
    timestamp: new Date().toISOString(),
    channel,
  };

  const conv = await db.conversation.create({
    data: {
      conversationId,
      customerPhone: phone,
      customerName: customer.name,
      customerId: customer.id,
      channel,
      status: 'active',
      lastMessageAt: new Date(),
      lastMessageBody: args.message,
      lastDirection: 'outbound',
      messagesJson: JSON.stringify([messagePayload]),
      tenantId,
      workspaceId,
    },
  });

  await logActivity({
    tenantId,
    actorId: ctx.userId || null,
    actorName: ctx.userName || 'AI Copilot',
    actorType: 'ai',
    action: 'create',
    entityType: 'conversation',
    entityId: conv.id,
    entityName: customer.name,
    description: `Sent ${channel.toUpperCase()} message to ${customer.name}: "${args.message.slice(0, 50)}..."`,
  }).catch(() => null);

  return {
    success: true,
    action: 'sent_message',
    message: {
      channel,
      customerName: customer.name,
      phone: customer.phone,
      text: args.message,
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    viewUrl: `/inbox`,
  };
}

/**
 * 9. DAILY MORNING BRIEFING
 */
export async function executeGetMorningBriefing(ctx: ActionContext) {
  const { tenantId, workspaceId } = ctx;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    todayJobs,
    unassignedJobs,
    overdueInvoices,
    newLeads,
    employeesCount,
  ] = await Promise.all([
    // Today's jobs
    workspaceId
      ? db.job.findMany({
          where: {
            workspaceId,
            scheduledAt: { gte: startOfToday, lte: endOfToday },
            deletedAt: null,
          },
          select: { id: true, title: true, customerName: true, scheduledTime: true, assigneeName: true, status: true },
        })
      : Promise.resolve([]),
    // Unassigned jobs
    workspaceId
      ? db.job.findMany({
          where: {
            workspaceId,
            assigneeId: null,
            status: { in: ['pending', 'scheduled'] },
            deletedAt: null,
          },
          select: { id: true, title: true, customerName: true, scheduledTime: true },
          take: 5,
        })
      : Promise.resolve([]),
    // Overdue invoices
    db.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['draft', 'unpaid', 'sent'] },
        dueDate: { lt: startOfToday },
        deletedAt: null,
      },
      select: { id: true, number: true, total: true, dueDate: true, customer: { select: { name: true } } },
      take: 5,
    }),
    // New leads waiting for followup
    db.lead.findMany({
      where: {
        tenantId,
        status: { in: ['new', 'contacted'] },
        deletedAt: null,
      },
      select: { id: true, name: true, serviceType: true, value: true },
      take: 5,
    }),
    // Employees/Techs
    workspaceId
      ? db.employee.count({ where: { workspaceId, status: 'active' } })
      : db.user.count({ where: { tenantId } }),
  ]);

  const overdueTotal = overdueInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0);

  const summary = `### ☀️ Morning Operations Briefing (${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })})
- 📅 **Today's Jobs**: ${todayJobs.length} scheduled (${todayJobs.filter((j) => j.assigneeName).length} assigned, ${todayJobs.filter((j) => !j.assigneeName).length} unassigned)
- ⚠️ **Overdue Invoices**: ${overdueInvoices.length} invoice(s) totaling $${overdueTotal.toFixed(2)}
- 🎯 **Active/New Leads**: ${newLeads.length} lead(s) waiting for quote/follow-up
- 👨‍🔧 **Active Technicians**: ${employeesCount} technician(s) on duty`;

  return {
    success: true,
    action: 'morning_briefing',
    date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    metrics: {
      todayJobsCount: todayJobs.length,
      unassignedJobsCount: unassignedJobs.length,
      overdueInvoicesCount: overdueInvoices.length,
      overdueTotal,
      newLeadsCount: newLeads.length,
      activeTechsCount: employeesCount,
    },
    todayJobs: todayJobs.map((j) => ({
      id: j.id,
      title: j.title,
      customer: j.customerName,
      time: j.scheduledTime,
      assignee: j.assigneeName || 'Unassigned',
    })),
    overdueInvoices: overdueInvoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      total: inv.total,
      customer: inv.customer?.name || 'Customer',
    })),
    newLeads: newLeads.map((l) => ({
      id: l.id,
      name: l.name,
      service: l.serviceType,
      value: l.value,
    })),
    summary,
  };
}
