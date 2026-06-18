/**
 * Migrate existing AWS SES SMTP credential (in `Credential` table) into a new
 * `EmailProvider` row. Also seeds built-in email templates.
 *
 * Idempotent — safe to re-run.
 *
 * Run: bun run scripts/migrate-email-providers.ts
 */
import { db } from '../src/lib/db'

const TENANT_ID = 'cmqjeqtze0000lwkj1qh5qt47'
const WORKSPACE_ID = 'cmqjeqtzh0004lwkjc3z6tm92'

// Existing AWS SES SMTP credential stored in the legacy Credential table
const SES_SMTP_CONFIG = {
  smtpHost: 'email-smtp.us-east-1.amazonaws.com',
  smtpPort: '587',
  smtpSecure: 'false',
  smtpUser: 'AKIA2PPO3JNBZSEHPLQH',
  smtpPass: 'BOVpNDa2T6R/E8ziSzTd8KM/BB/vUwMt23mVm4XQJhDl',
}

const BUILTIN_TEMPLATES = [
  {
    name: 'Portal Invitation',
    slug: 'portal-invitation',
    category: 'transactional',
    description: 'Sent to customers when portal access is enabled',
    subject: 'Activate your {{company}} customer portal account',
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#10b981">Welcome to your customer portal, {{name}}!</h2>
  <p>You've been granted access to the {{company}} customer portal. From there you can:</p>
  <ul>
    <li>View and pay invoices</li>
    <li>Track job status</li>
    <li>Book new appointments</li>
    <li>Message our team</li>
  </ul>
  <p style="margin:24px 0">
    <a href="{{link}}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Activate Your Account</a>
  </p>
  <p style="color:#6b7280;font-size:13px">This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
</div>`,
    variablesJson: JSON.stringify([
      { key: 'name', label: 'Customer Name', required: true, example: 'John Smith' },
      { key: 'company', label: 'Company Name', required: true, example: 'ServiceOS' },
      { key: 'link', label: 'Activation Link', required: true, example: 'https://app.serviceos.com/activate?token=...' },
    ]),
  },
  {
    name: 'Employee Invitation',
    slug: 'employee-invitation',
    category: 'transactional',
    description: 'Sent to new employees when invited to join',
    subject: 'You\'re invited to join {{company}} on ServiceOS',
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#10b981">Hello {{name}},</h2>
  <p>You've been invited to join <strong>{{company}}</strong> as a <strong>{{role}}</strong>.</p>
  <p>Click the button below to set up your account and start using ServiceOS:</p>
  <p style="margin:24px 0">
    <a href="{{link}}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Accept Invitation</a>
  </p>
  <p style="color:#6b7280;font-size:13px">This invitation expires in 7 days.</p>
</div>`,
    variablesJson: JSON.stringify([
      { key: 'name', label: 'Employee Name', required: true, example: 'Ravi Technician' },
      { key: 'company', label: 'Company Name', required: true, example: 'ServiceOS' },
      { key: 'role', label: 'Role', required: true, example: 'Technician' },
      { key: 'link', label: 'Invitation Link', required: true, example: 'https://app.serviceos.com/invite?token=...' },
    ]),
  },
  {
    name: 'Password Reset',
    slug: 'password-reset',
    category: 'transactional',
    description: 'Sent when a user requests a password reset',
    subject: 'Reset your ServiceOS password',
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#10b981">Hello {{name}},</h2>
  <p>We received a request to reset your password. Click the button below to choose a new password:</p>
  <p style="margin:24px 0">
    <a href="{{link}}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Reset Password</a>
  </p>
  <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
</div>`,
    variablesJson: JSON.stringify([
      { key: 'name', label: 'User Name', required: true, example: 'John' },
      { key: 'link', label: 'Reset Link', required: true, example: 'https://app.serviceos.com/reset?token=...' },
    ]),
  },
  {
    name: 'Booking Confirmation',
    slug: 'booking-confirmation',
    category: 'transactional',
    description: 'Sent when a customer confirms a booking',
    subject: 'Booking confirmed: {{service}} on {{date}}',
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#10b981">Your booking is confirmed, {{name}}!</h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Service</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{service}}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Date</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{date}}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Time</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{time}}</strong></td></tr>
    <tr><td style="padding:8px;color:#6b7280">Technician</td><td style="padding:8px"><strong>{{technician}}</strong></td></tr>
  </table>
  <p>If you need to reschedule, please contact us.</p>
</div>`,
    variablesJson: JSON.stringify([
      { key: 'name', label: 'Customer Name', required: true, example: 'John Smith' },
      { key: 'service', label: 'Service', required: true, example: 'AC Repair' },
      { key: 'date', label: 'Date', required: true, example: 'June 25, 2026' },
      { key: 'time', label: 'Time', required: true, example: '10:00 AM' },
      { key: 'technician', label: 'Technician', required: false, example: 'Ravi' },
    ]),
  },
  {
    name: 'Invoice Email',
    slug: 'invoice-email',
    category: 'transactional',
    description: 'Sent when an invoice is generated for a customer',
    subject: 'Invoice {{invoiceNumber}} from {{company}} — {{amount}}',
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#10b981">Invoice from {{company}}</h2>
  <p>Hello {{name}},</p>
  <p>Please find your invoice details below:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Invoice #</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{invoiceNumber}}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Amount Due</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{amount}}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Due Date</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{dueDate}}</strong></td></tr>
  </table>
  <p style="margin:24px 0">
    <a href="{{link}}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">View &amp; Pay Invoice</a>
  </p>
</div>`,
    variablesJson: JSON.stringify([
      { key: 'name', label: 'Customer Name', required: true, example: 'John Smith' },
      { key: 'company', label: 'Company Name', required: true, example: 'ServiceOS' },
      { key: 'invoiceNumber', label: 'Invoice Number', required: true, example: 'INV-2026-001' },
      { key: 'amount', label: 'Amount', required: true, example: '$250.00' },
      { key: 'dueDate', label: 'Due Date', required: true, example: 'July 5, 2026' },
      { key: 'link', label: 'Invoice Link', required: true, example: 'https://app.serviceos.com/invoices/123' },
    ]),
  },
  {
    name: 'Job Assigned',
    slug: 'job-assigned',
    category: 'transactional',
    description: 'Sent to an employee when a job is assigned to them',
    subject: 'New job assigned: {{jobTitle}}',
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#10b981">New job assigned to you, {{name}}</h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Job</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{jobTitle}}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Customer</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{customer}}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Address</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{{address}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Scheduled</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{scheduledAt}}</strong></td></tr>
  </table>
  <p style="margin:24px 0">
    <a href="{{link}}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">View Job Details</a>
  </p>
</div>`,
    variablesJson: JSON.stringify([
      { key: 'name', label: 'Employee Name', required: true, example: 'Ravi' },
      { key: 'jobTitle', label: 'Job Title', required: true, example: 'AC Repair' },
      { key: 'customer', label: 'Customer Name', required: true, example: 'John Smith' },
      { key: 'address', label: 'Address', required: true, example: '123 Main St' },
      { key: 'scheduledAt', label: 'Scheduled Time', required: true, example: 'June 25, 10 AM' },
      { key: 'link', label: 'Job Link', required: true, example: 'https://app.serviceos.com/jobs/123' },
    ]),
  },
  {
    name: 'Job Completed',
    slug: 'job-completed',
    category: 'transactional',
    description: 'Sent to customer when a job is marked complete',
    subject: 'Job completed — please rate your experience, {{name}}',
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#10b981">Your job is complete, {{name}}!</h2>
  <p>Our technician <strong>{{technician}}</strong> has marked your <strong>{{jobTitle}}</strong> as complete.</p>
  <p>We'd love to hear your feedback. Please take a moment to rate your experience:</p>
  <p style="margin:24px 0">
    <a href="{{link}}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Leave a Review</a>
  </p>
  <p style="color:#6b7280;font-size:13px">Thank you for choosing {{company}}.</p>
</div>`,
    variablesJson: JSON.stringify([
      { key: 'name', label: 'Customer Name', required: true, example: 'John' },
      { key: 'technician', label: 'Technician Name', required: true, example: 'Ravi' },
      { key: 'jobTitle', label: 'Job Title', required: true, example: 'AC Repair' },
      { key: 'company', label: 'Company Name', required: true, example: 'ServiceOS' },
      { key: 'link', label: 'Review Link', required: true, example: 'https://app.serviceos.com/review/123' },
    ]),
  },
  {
    name: 'Payment Receipt',
    slug: 'payment-receipt',
    category: 'transactional',
    description: 'Sent when a payment is received from a customer',
    subject: 'Payment received — {{amount}} for invoice {{invoiceNumber}}',
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#10b981">Thank you for your payment, {{name}}!</h2>
  <p>We've received your payment of <strong>{{amount}}</strong> for invoice <strong>{{invoiceNumber}}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Amount</td><td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>{{amount}}</strong></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Method</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{{method}}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280">Date</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">{{paidAt}}</td></tr>
    <tr><td style="padding:8px;color:#6b7280">Transaction ID</td><td style="padding:8px;font-family:monospace;font-size:12px">{{transactionId}}</td></tr>
  </table>
</div>`,
    variablesJson: JSON.stringify([
      { key: 'name', label: 'Customer Name', required: true, example: 'John' },
      { key: 'amount', label: 'Amount', required: true, example: '$250.00' },
      { key: 'invoiceNumber', label: 'Invoice Number', required: true, example: 'INV-2026-001' },
      { key: 'method', label: 'Payment Method', required: true, example: 'Visa •••• 4242' },
      { key: 'paidAt', label: 'Payment Date', required: true, example: 'June 18, 2026' },
      { key: 'transactionId', label: 'Transaction ID', required: true, example: 'txn_abc123' },
    ]),
  },
  {
    name: 'Lead Welcome',
    slug: 'lead-welcome',
    category: 'transactional',
    description: 'Sent when a new lead is created',
    subject: 'Thanks for reaching out, {{name}}!',
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#10b981">Hi {{name}},</h2>
  <p>Thanks for reaching out to <strong>{{company}}</strong>! We've received your inquiry and one of our team members will be in touch within 24 hours.</p>
  <p>In the meantime, feel free to browse our services or reach out if you have any questions.</p>
  <p style="margin:24px 0">
    <a href="{{link}}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Visit Our Website</a>
  </p>
</div>`,
    variablesJson: JSON.stringify([
      { key: 'name', label: 'Lead Name', required: true, example: 'John' },
      { key: 'company', label: 'Company Name', required: true, example: 'ServiceOS' },
      { key: 'link', label: 'Website Link', required: false, example: 'https://serviceos.com' },
    ]),
  },
  {
    name: 'Campaign Email',
    slug: 'campaign-email',
    category: 'marketing',
    description: 'Default template for marketing campaigns',
    subject: '{{subject}}',
    htmlBody: '{{{body}}}',
    variablesJson: JSON.stringify([
      { key: 'name', label: 'Recipient Name', required: false, example: 'John' },
      { key: 'email', label: 'Recipient Email', required: false, example: 'john@example.com' },
      { key: 'subject', label: 'Subject', required: true, example: 'Special offer!' },
      { key: 'body', label: 'Email Body HTML', required: true, example: '<p>Your content here</p>' },
    ]),
  },
]

async function main() {
  console.log('── Migrating AWS SES credential → EmailProvider ──')

  // Check if an EmailProvider for AWS SES already exists
  const existing = await db.emailProvider.findFirst({
    where: { name: 'AWS SES Production', tenantId: TENANT_ID },
  })

  let provider
  if (existing) {
    provider = await db.emailProvider.update({
      where: { id: existing.id },
      data: {
        providerType: 'ses',
        configJson: JSON.stringify(SES_SMTP_CONFIG),
        fromName: 'ServiceOS',
        fromEmail: 'deepakchandra076@gmail.com',
        replyTo: 'deepakchandra076@gmail.com',
        usageType: 'both',
        isDefaultTransactional: true,
        isDefaultMarketing: true,
        status: 'active',
      },
    })
    console.log(`✓ Updated existing EmailProvider: ${provider.id}`)
  } else {
    provider = await db.emailProvider.create({
      data: {
        name: 'AWS SES Production',
        providerType: 'ses',
        configJson: JSON.stringify(SES_SMTP_CONFIG),
        fromName: 'ServiceOS',
        fromEmail: 'deepakchandra076@gmail.com',
        replyTo: 'deepakchandra076@gmail.com',
        usageType: 'both',
        isDefaultTransactional: true,
        isDefaultMarketing: true,
        status: 'active',
        tenantId: TENANT_ID,
        workspaceId: WORKSPACE_ID,
      },
    })
    console.log(`✓ Created EmailProvider: ${provider.id}`)
  }

  console.log('\n── Seeding built-in email templates ──')
  let created = 0
  let updated = 0
  for (const tpl of BUILTIN_TEMPLATES) {
    const existingTpl = await db.emailTemplate.findFirst({
      where: { slug: tpl.slug, tenantId: TENANT_ID },
    })
    if (existingTpl) {
      await db.emailTemplate.update({
        where: { id: existingTpl.id },
        data: {
          name: tpl.name,
          category: tpl.category,
          description: tpl.description,
          subject: tpl.subject,
          htmlBody: tpl.htmlBody,
          variablesJson: tpl.variablesJson,
          isBuiltIn: true,
        },
      })
      updated++
    } else {
      await db.emailTemplate.create({
        data: {
          ...tpl,
          isBuiltIn: true,
          tenantId: TENANT_ID,
          workspaceId: WORKSPACE_ID,
        },
      })
      created++
    }
    console.log(`  ✓ ${tpl.slug} (${tpl.category})`)
  }

  console.log(`\nTemplates: ${created} created, ${updated} updated`)
  console.log(`\n═══════════════════════════════════════════════`)
  console.log(`MIGRATION COMPLETE`)
  console.log(`═══════════════════════════════════════════════`)
  console.log(`EmailProvider ID: ${provider.id}`)
  console.log(`Templates: ${BUILTIN_TEMPLATES.length} built-in`)
  console.log(`═══════════════════════════════════════════════`)

  await db.$disconnect()
}

main().catch(async (err) => {
  console.error('Migration failed:', err)
  await db.$disconnect()
  process.exit(1)
})
