import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Upsert an EmailTemplate by slug + tenantId=null.
 * Prisma's composite unique where clause doesn't accept null,
 * so we use findFirst + update/create instead.
 */
async function upsertEmailTemplate(data: {
  name: string;
  slug: string;
  category: string;
  description?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variablesJson?: string;
  isBuiltIn?: boolean;
  status?: string;
  tagsJson?: string;
  tenantId?: string | null;
}) {
  const existing = await db.emailTemplate.findFirst({
    where: { slug: data.slug, tenantId: data.tenantId ?? null },
  });
  if (existing) {
    return db.emailTemplate.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        category: data.category,
        description: data.description,
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        variablesJson: data.variablesJson,
        isBuiltIn: data.isBuiltIn,
        status: data.status,
        tagsJson: data.tagsJson,
      },
    });
  }
  return db.emailTemplate.create({ data });
}

async function main() {
  console.log('🎨 Seeding Template Studio data...\n');

  // ════════════════════════════════════════════════
  // 0. ENSURE A TENANT EXISTS FOR BRANDKIT
  // ════════════════════════════════════════════════
  console.log('🏢 Ensuring "Acme Solutions" tenant exists...');
  const acmeTenant = await db.tenant.upsert({
    where: { slug: 'acme-solutions' },
    update: {},
    create: {
      name: 'Acme Solutions',
      slug: 'acme-solutions',
      industry: 'technology',
      email: 'hello@acmesolutions.com',
      phone: '+1 (555) 123-4567',
      address: '123 Innovation Drive, San Francisco, CA 94105',
      country: 'US',
      currency: 'USD',
      plan: 'professional',
      planStatus: 'active',
      onboardingCompleted: true,
    },
  });
  console.log(`   ✅ Tenant: ${acmeTenant.name} (${acmeTenant.id})\n`);

  // ════════════════════════════════════════════════
  // 1. BRAND KIT
  // ════════════════════════════════════════════════
  console.log('🎨 Seeding Brand Kit...');
  const brandKit = await db.brandKit.upsert({
    where: { tenantId: acmeTenant.id },
    update: {
      primaryColor: '#0f766e',
      secondaryColor: '#1f2937',
      accentColor: '#f59e0b',
      fontFamily: 'Inter, sans-serif',
      companyName: 'Acme Solutions',
      address: '123 Innovation Drive, San Francisco, CA 94105',
      website: 'https://acmesolutions.com',
      email: 'hello@acmesolutions.com',
      phone: '+1 (555) 123-4567',
      socialLinksJson: JSON.stringify([
        { platform: 'twitter', url: 'https://twitter.com/acmesolutions' },
        { platform: 'linkedin', url: 'https://linkedin.com/company/acmesolutions' },
        { platform: 'facebook', url: 'https://facebook.com/acmesolutions' },
      ]),
      footerHtml: '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:20px 0;border-top:1px solid #e5e7eb"><tr><td style="text-align:center;font-family:Inter,sans-serif;font-size:12px;color:#9ca3af">© {{year}} Acme Solutions. All rights reserved.<br>123 Innovation Drive, San Francisco, CA 94105<br><a href="https://acmesolutions.com" style="color:#0f766e;text-decoration:none">acmesolutions.com</a></td></tr></table>',
    },
    create: {
      tenantId: acmeTenant.id,
      logoUrl: '/uploads/template-assets/default/email/welcome-header.png',
      primaryColor: '#0f766e',
      secondaryColor: '#1f2937',
      accentColor: '#f59e0b',
      fontFamily: 'Inter, sans-serif',
      companyName: 'Acme Solutions',
      address: '123 Innovation Drive, San Francisco, CA 94105',
      website: 'https://acmesolutions.com',
      email: 'hello@acmesolutions.com',
      phone: '+1 (555) 123-4567',
      socialLinksJson: JSON.stringify([
        { platform: 'twitter', url: 'https://twitter.com/acmesolutions' },
        { platform: 'linkedin', url: 'https://linkedin.com/company/acmesolutions' },
        { platform: 'facebook', url: 'https://facebook.com/acmesolutions' },
      ]),
      footerHtml: '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:20px 0;border-top:1px solid #e5e7eb"><tr><td style="text-align:center;font-family:Inter,sans-serif;font-size:12px;color:#9ca3af">© {{year}} Acme Solutions. All rights reserved.<br>123 Innovation Drive, San Francisco, CA 94105<br><a href="https://acmesolutions.com" style="color:#0f766e;text-decoration:none">acmesolutions.com</a></td></tr></table>',
    },
  });
  console.log(`   ✅ Brand Kit: ${brandKit.id}\n`);

  // ════════════════════════════════════════════════
  // 2. IMAGE LIBRARY
  // ════════════════════════════════════════════════
  console.log('🖼️  Seeding Image Library...');

  const imageEntries = [
    { name: 'Welcome Header', url: '/uploads/template-assets/default/email/welcome-header.png', folder: 'email', mediaType: 'image/png', width: 600, height: 200 },
    { name: 'Invoice Header', url: '/uploads/template-assets/default/email/invoice-header.png', folder: 'email', mediaType: 'image/png', width: 600, height: 200 },
    { name: 'Booking Header', url: '/uploads/template-assets/default/email/booking-header.png', folder: 'email', mediaType: 'image/png', width: 600, height: 200 },
    { name: 'Marketing Header', url: '/uploads/template-assets/default/email/marketing-header.png', folder: 'email', mediaType: 'image/png', width: 600, height: 200 },
    { name: 'Appointment Banner', url: '/uploads/template-assets/default/whatsapp/appointment-banner.png', folder: 'whatsapp', mediaType: 'image/png', width: 800, height: 400 },
    { name: 'Offer Banner', url: '/uploads/template-assets/default/whatsapp/offer-banner.png', folder: 'whatsapp', mediaType: 'image/png', width: 800, height: 400 },
    { name: 'Order Banner', url: '/uploads/template-assets/default/whatsapp/order-banner.png', folder: 'whatsapp', mediaType: 'image/png', width: 800, height: 400 },
  ];

  // Delete existing seed images first (by URL pattern)
  await db.imageLibrary.deleteMany({
    where: {
      url: { startsWith: '/uploads/template-assets/default/' },
    },
  });

  for (const img of imageEntries) {
    await db.imageLibrary.create({
      data: {
        tenantId: acmeTenant.id,
        name: img.name,
        url: img.url,
        folder: img.folder,
        mediaType: img.mediaType,
        size: 45000,
        width: img.width,
        height: img.height,
      },
    });
    console.log(`   ✅ ${img.name}`);
  }
  console.log('');

  // ════════════════════════════════════════════════
  // 3. EMAIL TEMPLATES
  // ════════════════════════════════════════════════
  console.log('📧 Seeding Email Templates...');

  // ── Email 1: Welcome Email ──────────────────
  const welcomeHtml = [
    '<!DOCTYPE html>',
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">',
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome!</title></head>',
    '<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Inter,Arial,sans-serif">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">',
    '<tr><td><img src="/uploads/template-assets/default/email/welcome-header.png" alt="Welcome" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:12px 12px 0 0" /></td></tr>',
    '<tr><td style="padding:40px 40px 10px 40px"><h1 style="margin:0;font-size:28px;font-weight:700;color:#0f766e;line-height:1.3">Welcome, {{customer.name}}! 🎉</h1></td></tr>',
    '<tr><td style="padding:10px 40px 30px 40px"><p style="margin:0;font-size:16px;line-height:1.6;color:#374151">We\'re thrilled to have you join <strong>{{company.name}}</strong>. You\'ve taken the first step toward a better experience, and we\'re here to make sure you get the most out of it.</p></td></tr>',
    '<tr><td style="padding:0 40px 30px 40px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:10px;border:1px solid #ccfbf1">',
    '<tr><td style="padding:24px">',
    '<h2 style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#0f766e">Getting Started</h2>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td style="padding:8px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="width:32px;height:32px;background-color:#0f766e;border-radius:50%;text-align:center;vertical-align:middle;color:#ffffff;font-weight:700;font-size:14px">1</td>',
    '<td style="padding-left:12px;font-size:15px;color:#1f2937"><strong>Complete your profile</strong> — Add your details so we can personalize your experience.</td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:8px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="width:32px;height:32px;background-color:#0f766e;border-radius:50%;text-align:center;vertical-align:middle;color:#ffffff;font-weight:700;font-size:14px">2</td>',
    '<td style="padding-left:12px;font-size:15px;color:#1f2937"><strong>Explore our services</strong> — Discover everything we have to offer.</td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:8px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="width:32px;height:32px;background-color:#0f766e;border-radius:50%;text-align:center;vertical-align:middle;color:#ffffff;font-weight:700;font-size:14px">3</td>',
    '<td style="padding-left:12px;font-size:15px;color:#1f2937"><strong>Book your first appointment</strong> — Schedule a session with our team.</td>',
    '</tr></table></td></tr>',
    '</table></td></tr></table></td></tr>',
    '<tr><td style="padding:0 40px 30px 40px" align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="background-color:#0f766e;border-radius:8px"><a href="{{dashboard.url}}" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">Go to My Dashboard</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:0 40px 40px 40px"><p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280;text-align:center">Questions? We\'re here to help! Reply to this email or visit our <a href="{{support.url}}" style="color:#0f766e;text-decoration:underline">Help Center</a>.</p></td></tr>',
    '<tr><td style="padding:20px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb">',
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center">© 2025 {{company.name}}. All rights reserved.<br>{{company.address}}<br><a href="{{company.website}}" style="color:#0f766e;text-decoration:none">{{company.website}}</a></p>',
    '</td></tr></table></td></tr></table></body></html>',
  ].join('\n');

  await upsertEmailTemplate({
    name: 'Welcome Email',
    slug: 'welcome-email',
    category: 'transactional',
    subject: 'Welcome to {{company.name}}, {{customer.name}}!',
    description: 'Welcome new customers with a warm greeting and getting started guide',
    htmlBody: welcomeHtml,
    textBody: 'Welcome, {{customer.name}}! We are thrilled to have you join {{company.name}}. Complete your profile, explore our services, and book your first appointment. Go to {{dashboard.url}} to get started.',
    status: 'published',
    isBuiltIn: true,
    tagsJson: '["onboarding","welcome"]',
    variablesJson: '[{"key":"customer.name","label":"Customer Name","required":true,"example":"John"},{"key":"company.name","label":"Company Name","required":true,"example":"Acme Solutions"},{"key":"company.address","label":"Company Address","required":false,"example":"123 Main St"},{"key":"company.website","label":"Company Website","required":false,"example":"https://acme.com"},{"key":"dashboard.url","label":"Dashboard URL","required":true,"example":"https://app.acme.com/dashboard"},{"key":"support.url","label":"Support URL","required":false,"example":"https://help.acme.com"}]',
    tenantId: null,
  });
  console.log('   ✅ Welcome Email');

  // ── Email 2: Invoice Notification ───────────
  const invoiceHtml = [
    '<!DOCTYPE html>',
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">',
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Invoice Notification</title></head>',
    '<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Inter,Arial,sans-serif">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">',
    '<tr><td><img src="/uploads/template-assets/default/email/invoice-header.png" alt="Invoice" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:12px 12px 0 0" /></td></tr>',
    '<tr><td style="padding:40px 40px 10px 40px"><h1 style="margin:0;font-size:24px;font-weight:700;color:#1f2937;line-height:1.3">Invoice <span style="color:#0f766e">#{{invoice.number}}</span></h1></td></tr>',
    '<tr><td style="padding:10px 40px 20px 40px"><p style="margin:0;font-size:15px;line-height:1.6;color:#374151">Hi {{customer.name}},</p><p style="margin:10px 0 0 0;font-size:15px;line-height:1.6;color:#374151">Please find your invoice details below. Payment is due by <strong>{{invoice.dueDate}}</strong>.</p></td></tr>',
    '<tr><td style="padding:0 40px 20px 40px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">',
    '<tr style="background-color:#f9fafb"><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">Description</td><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;text-align:right">Amount</td></tr>',
    '<tr><td style="padding:14px 16px;font-size:15px;color:#1f2937;border-top:1px solid #f3f4f6">{{invoice.description}}</td><td style="padding:14px 16px;font-size:15px;color:#1f2937;text-align:right;border-top:1px solid #f3f4f6">$' + '{{invoice.amount}}</td></tr>',
    '<tr><td style="padding:14px 16px;font-size:15px;color:#1f2937;border-top:1px solid #f3f4f6">Tax</td><td style="padding:14px 16px;font-size:15px;color:#1f2937;text-align:right;border-top:1px solid #f3f4f6">$' + '{{invoice.tax}}</td></tr>',
    '<tr style="background-color:#f0fdfa"><td style="padding:14px 16px;font-size:16px;font-weight:700;color:#0f766e;border-top:2px solid #0f766e">Total Due</td><td style="padding:14px 16px;font-size:16px;font-weight:700;color:#0f766e;text-align:right;border-top:2px solid #0f766e">$' + '{{invoice.total}}</td></tr>',
    '</table></td></tr>',
    '<tr><td style="padding:0 40px 20px 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td style="padding:8px 0;font-size:13px;color:#6b7280"><strong>Invoice Date:</strong> {{invoice.date}}</td>',
    '<td style="padding:8px 0;font-size:13px;color:#6b7280;text-align:right"><strong>Due Date:</strong> {{invoice.dueDate}}</td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:10px 40px 30px 40px" align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="background-color:#0f766e;border-radius:8px"><a href="{{invoice.paymentUrl}}" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">Pay Now</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:0 40px 30px 40px"><p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;text-align:center">If you have questions about this invoice, please contact us at <a href="mailto:{{company.email}}" style="color:#0f766e;text-decoration:none">{{company.email}}</a></p></td></tr>',
    '<tr><td style="padding:20px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb">',
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center">© 2025 {{company.name}}. All rights reserved.<br>{{company.address}}</p>',
    '</td></tr></table></td></tr></table></body></html>',
  ].join('\n');

  await upsertEmailTemplate({
    name: 'Invoice Notification',
    slug: 'invoice-notification',
    category: 'transactional',
    subject: 'Invoice #{{invoice.number}} from {{company.name}}',
    description: 'Professional invoice notification with payment details and link',
    htmlBody: invoiceHtml,
    textBody: 'Invoice #{{invoice.number}} from {{company.name}}. Amount: ${{invoice.total}}. Due: {{invoice.dueDate}}. Pay at {{invoice.paymentUrl}}',
    status: 'published',
    isBuiltIn: true,
    tagsJson: '["invoice","billing"]',
    variablesJson: '[{"key":"customer.name","label":"Customer Name","required":true,"example":"Jane"},{"key":"company.name","label":"Company Name","required":true,"example":"Acme Solutions"},{"key":"company.email","label":"Company Email","required":true,"example":"billing@acme.com"},{"key":"company.address","label":"Company Address","required":false,"example":"123 Main St"},{"key":"invoice.number","label":"Invoice Number","required":true,"example":"INV-001"},{"key":"invoice.date","label":"Invoice Date","required":true,"example":"Jan 15, 2025"},{"key":"invoice.dueDate","label":"Due Date","required":true,"example":"Feb 15, 2025"},{"key":"invoice.description","label":"Description","required":true,"example":"Service Fee"},{"key":"invoice.amount","label":"Amount","required":true,"example":"150.00"},{"key":"invoice.tax","label":"Tax","required":true,"example":"15.00"},{"key":"invoice.total","label":"Total","required":true,"example":"165.00"},{"key":"invoice.paymentUrl","label":"Payment URL","required":true,"example":"https://pay.acme.com/inv/001"}]',
    tenantId: null,
  });
  console.log('   ✅ Invoice Notification');

  // ── Email 3: Booking Confirmation ───────────
  const bookingHtml = [
    '<!DOCTYPE html>',
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">',
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Booking Confirmation</title></head>',
    '<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Inter,Arial,sans-serif">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">',
    '<tr><td><img src="/uploads/template-assets/default/email/booking-header.png" alt="Booking Confirmed" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:12px 12px 0 0" /></td></tr>',
    '<tr><td style="padding:40px 40px 10px 40px"><h1 style="margin:0;font-size:26px;font-weight:700;color:#0f766e;line-height:1.3">✅ Booking Confirmed!</h1></td></tr>',
    '<tr><td style="padding:10px 40px 20px 40px"><p style="margin:0;font-size:15px;line-height:1.6;color:#374151">Hi {{customer.name}}, your appointment has been confirmed. Here are the details:</p></td></tr>',
    '<tr><td style="padding:0 40px 20px 40px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdfa;border-radius:10px;border:1px solid #ccfbf1">',
    '<tr><td style="padding:24px">',
    '<h2 style="margin:0 0 20px 0;font-size:18px;font-weight:600;color:#0f766e">{{booking.service}}</h2>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:120px;vertical-align:top">📅 Date</td><td style="padding:6px 0;font-size:14px;color:#1f2937;font-weight:500">{{booking.date}}</td></tr>',
    '<tr><td style="padding:6px 0;font-size:14px;color:#6b7280;vertical-align:top">🕐 Time</td><td style="padding:6px 0;font-size:14px;color:#1f2937;font-weight:500">{{booking.time}}</td></tr>',
    '<tr><td style="padding:6px 0;font-size:14px;color:#6b7280;vertical-align:top">📍 Location</td><td style="padding:6px 0;font-size:14px;color:#1f2937;font-weight:500">{{booking.location}}</td></tr>',
    '<tr><td style="padding:6px 0;font-size:14px;color:#6b7280;vertical-align:top">👤 With</td><td style="padding:6px 0;font-size:14px;color:#1f2937;font-weight:500">{{booking.provider}}</td></tr>',
    '<tr><td style="padding:6px 0;font-size:14px;color:#6b7280;vertical-align:top">⏱ Duration</td><td style="padding:6px 0;font-size:14px;color:#1f2937;font-weight:500">{{booking.duration}}</td></tr>',
    '</table></td></tr></table></td></tr>',
    '<tr><td style="padding:0 40px 20px 40px" align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="background-color:#ffffff;border:2px solid #0f766e;border-radius:8px"><a href="{{booking.mapUrl}}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#0f766e;text-decoration:none">📍 View on Map</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:0 40px 20px 40px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-radius:8px;border:1px solid #fde68a">',
    '<tr><td style="padding:14px 16px;font-size:13px;color:#92400e">⚠️ Need to reschedule? Please contact us at least 24 hours in advance at <a href="tel:{{company.phone}}" style="color:#92400e;font-weight:600;text-decoration:none">{{company.phone}}</a></td></tr>',
    '</table></td></tr>',
    '<tr><td style="padding:10px 40px 30px 40px" align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="background-color:#0f766e;border-radius:8px"><a href="{{booking.manageUrl}}" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">Manage Booking</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:20px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb">',
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center">© 2025 {{company.name}}. All rights reserved.<br>{{company.address}}<br><a href="{{company.website}}" style="color:#0f766e;text-decoration:none">{{company.website}}</a></p>',
    '</td></tr></table></td></tr></table></body></html>',
  ].join('\n');

  await upsertEmailTemplate({
    name: 'Booking Confirmation',
    slug: 'booking-confirmation',
    category: 'transactional',
    subject: 'Your booking is confirmed - {{booking.service}}',
    description: 'Booking confirmation with appointment details and location',
    htmlBody: bookingHtml,
    textBody: 'Booking confirmed! Service: {{booking.service}}, Date: {{booking.date}}, Time: {{booking.time}}, Location: {{booking.location}}. Manage at {{booking.manageUrl}}',
    status: 'published',
    isBuiltIn: true,
    tagsJson: '["booking","appointment"]',
    variablesJson: '[{"key":"customer.name","label":"Customer Name","required":true,"example":"Alex"},{"key":"company.name","label":"Company Name","required":true,"example":"Acme Solutions"},{"key":"company.phone","label":"Company Phone","required":true,"example":"+1-555-123-4567"},{"key":"company.address","label":"Company Address","required":false,"example":"123 Main St"},{"key":"company.website","label":"Company Website","required":false,"example":"https://acme.com"},{"key":"booking.service","label":"Service","required":true,"example":"Consultation"},{"key":"booking.date","label":"Date","required":true,"example":"March 1, 2025"},{"key":"booking.time","label":"Time","required":true,"example":"10:00 AM"},{"key":"booking.location","label":"Location","required":true,"example":"123 Main St, SF"},{"key":"booking.provider","label":"Provider","required":false,"example":"Dr. Smith"},{"key":"booking.duration","label":"Duration","required":false,"example":"45 min"},{"key":"booking.mapUrl","label":"Map URL","required":false,"example":"https://maps.google.com/"},{"key":"booking.manageUrl","label":"Manage URL","required":true,"example":"https://app.acme.com/booking/123"}]',
    tenantId: null,
  });
  console.log('   ✅ Booking Confirmation');

  // ── Email 4: Special Offer - Marketing ──────
  const marketingHtml = [
    '<!DOCTYPE html>',
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">',
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Exclusive Offer</title></head>',
    '<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Inter,Arial,sans-serif">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">',
    '<tr><td><img src="/uploads/template-assets/default/email/marketing-header.png" alt="Special Offer" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:12px 12px 0 0" /></td></tr>',
    '<tr><td style="padding:40px 40px 10px 40px"><h1 style="margin:0;font-size:28px;font-weight:700;color:#1f2937;line-height:1.3">🎉 An exclusive deal just for you, <span style="color:#0f766e">{{customer.name}}</span>!</h1></td></tr>',
    '<tr><td style="padding:10px 40px 20px 40px"><p style="margin:0;font-size:16px;line-height:1.6;color:#374151">We\'re rolling out the red carpet with a <strong style="color:#0f766e">20% discount</strong> on all our services. Whether you\'ve been eyeing a specific package or just want to try something new — now is the perfect time!</p></td></tr>',
    '<tr><td style="padding:0 40px 20px 40px" align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f766e;border-radius:12px">',
    '<tr><td style="padding:30px;text-align:center">',
    '<p style="margin:0 0 8px 0;font-size:14px;font-weight:500;color:#ccfbf1;text-transform:uppercase;letter-spacing:0.1em">Your Discount Code</p>',
    '<p style="margin:0 0 12px 0;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:0.15em">SAVE20</p>',
    '<p style="margin:0;font-size:13px;color:#ccfbf1">Use this code at checkout for 20% off</p>',
    '</td></tr></table></td></tr>',
    '<tr><td style="padding:10px 40px 20px 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td style="padding:10px 0;font-size:15px;color:#374151">',
    '<span style="color:#0f766e;font-weight:600">✓</span> Valid on all service packages<br>',
    '<span style="color:#0f766e;font-weight:600">✓</span> No minimum order required<br>',
    '<span style="color:#0f766e;font-weight:600">✓</span> Offer expires {{offer.expiryDate}}<br>',
    '<span style="color:#0f766e;font-weight:600">✓</span> Cannot be combined with other offers',
    '</td></tr></table></td></tr>',
    '<tr><td style="padding:10px 40px 30px 40px" align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="background-color:#f59e0b;border-radius:8px"><a href="{{offer.shopUrl}}" style="display:inline-block;padding:16px 44px;font-size:17px;font-weight:700;color:#ffffff;text-decoration:none">🛒 Shop Now &amp; Save</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:0 40px 30px 40px"><p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280;text-align:center">⏰ Don\'t wait — this offer won\'t last forever!</p></td></tr>',
    '<tr><td style="padding:20px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb">',
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center">© 2025 {{company.name}}. All rights reserved.<br>{{company.address}}<br><a href="{{unsubscribe.url}}" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a> · <a href="{{preferences.url}}" style="color:#9ca3af;text-decoration:underline">Preferences</a></p>',
    '</td></tr></table></td></tr></table></body></html>',
  ].join('\n');

  await upsertEmailTemplate({
    name: 'Special Offer - 20% Off',
    slug: 'special-offer-20-off',
    category: 'marketing',
    subject: '🎉 Exclusive 20% Off Just for You, {{customer.name}}!',
    description: 'Marketing email with promotional content, discount code, and CTA',
    htmlBody: marketingHtml,
    textBody: '🎉 Exclusive 20% off just for you, {{customer.name}}! Use code SAVE20 at checkout. Offer expires {{offer.expiryDate}}. Shop now: {{offer.shopUrl}}',
    status: 'published',
    isBuiltIn: true,
    tagsJson: '["marketing","promotion"]',
    variablesJson: '[{"key":"customer.name","label":"Customer Name","required":true,"example":"Sarah"},{"key":"company.name","label":"Company Name","required":true,"example":"Acme Solutions"},{"key":"company.address","label":"Company Address","required":false,"example":"123 Main St"},{"key":"offer.expiryDate","label":"Offer Expiry Date","required":true,"example":"March 31, 2025"},{"key":"offer.shopUrl","label":"Shop URL","required":true,"example":"https://shop.acme.com"},{"key":"unsubscribe.url","label":"Unsubscribe URL","required":true,"example":"https://app.acme.com/unsub"},{"key":"preferences.url","label":"Preferences URL","required":true,"example":"https://app.acme.com/prefs"}]',
    tenantId: null,
  });
  console.log('   ✅ Special Offer - 20% Off');

  // ── Email 5: Password Reset ─────────────────
  const resetHtml = [
    '<!DOCTYPE html>',
    '<html lang="en" xmlns="http://www.w3.org/1999/xhtml">',
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset Your Password</title></head>',
    '<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Inter,Arial,sans-serif">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px 0">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">',
    '<tr><td style="height:6px;background-color:#0f766e"></td></tr>',
    '<tr><td style="padding:40px 40px 10px 40px"><h1 style="margin:0;font-size:24px;font-weight:700;color:#1f2937;line-height:1.3">🔑 Reset Your Password</h1></td></tr>',
    '<tr><td style="padding:10px 40px 20px 40px"><p style="margin:0;font-size:15px;line-height:1.6;color:#374151">Hi {{user.name}},</p><p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#374151">We received a request to reset the password for your <strong>{{company.name}}</strong> account. Click the button below to choose a new password:</p></td></tr>',
    '<tr><td style="padding:20px 40px 30px 40px" align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="background-color:#0f766e;border-radius:8px"><a href="{{reset.url}}" style="display:inline-block;padding:14px 44px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">Reset Password</a></td>',
    '</tr></table></td></tr>',
    '<tr><td style="padding:0 40px 20px 40px"><p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280">If the button doesn\'t work, copy and paste this link into your browser:</p><p style="margin:8px 0 0 0;font-size:13px;line-height:1.4;color:#0f766e;word-break:break-all">{{reset.url}}</p></td></tr>',
    '<tr><td style="padding:0 40px 20px 40px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border-radius:8px;border:1px solid #fecaca">',
    '<tr><td style="padding:14px 16px;font-size:13px;color:#991b1b">⏰ This link will expire in <strong>{{reset.expiry}}</strong> for security. If you didn\'t request a password reset, you can safely ignore this email.</td></tr>',
    '</table></td></tr>',
    '<tr><td style="padding:0 40px 30px 40px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb">',
    '<tr><td style="padding:16px"><p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#374151">Security Tips:</p>',
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280">• Never share your password with anyone<br>• Use a strong, unique password for each account<br>• Enable two-factor authentication when available</p>',
    '</td></tr></table></td></tr>',
    '<tr><td style="padding:20px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb">',
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center">© 2025 {{company.name}}. All rights reserved.<br>{{company.address}}</p>',
    '</td></tr></table></td></tr></table></body></html>',
  ].join('\n');

  await upsertEmailTemplate({
    name: 'Password Reset',
    slug: 'password-reset',
    category: 'system',
    subject: 'Reset your password - {{company.name}}',
    description: 'Password reset email with secure reset link and instructions',
    htmlBody: resetHtml,
    textBody: 'Reset your password for {{company.name}}. Visit {{reset.url}} to set a new password. This link expires in {{reset.expiry}}. If you did not request this, ignore this email.',
    status: 'published',
    isBuiltIn: true,
    tagsJson: '["system","security"]',
    variablesJson: '[{"key":"user.name","label":"User Name","required":true,"example":"John"},{"key":"company.name","label":"Company Name","required":true,"example":"Acme Solutions"},{"key":"company.address","label":"Company Address","required":false,"example":"123 Main St"},{"key":"reset.url","label":"Reset URL","required":true,"example":"https://app.acme.com/reset?token=abc"},{"key":"reset.expiry","label":"Reset Expiry","required":false,"example":"30 minutes"}]',
    tenantId: null,
  });
  console.log('   ✅ Password Reset');

  console.log('');

  // ════════════════════════════════════════════════
  // 4. WHATSAPP TEMPLATES (CampaignTemplate)
  // ════════════════════════════════════════════════
  console.log('💬 Seeding WhatsApp Templates...');

  const whatsappTemplates = [
    {
      name: 'appointment_reminder',
      description: 'Appointment reminder with quick reply buttons',
      category: 'utility',
      content: 'Hi {{1}}, this is a reminder for your appointment on {{2}} at {{3}}. Please arrive 10 minutes early. Reply HELP for assistance.',
      templateType: 'image',
      headerMediaUrl: '/uploads/template-assets/default/whatsapp/appointment-banner.png',
      headerMediaType: 'image/png',
      footerText: '{{company.name}}',
      buttonsJson: '[{"type":"quick_reply","text":"Confirm","value":"confirm"},{"type":"quick_reply","text":"Reschedule","value":"reschedule"}]',
      status: 'approved',
      tagsJson: '["appointment","reminder"]',
      variablesJson: '[{"key":"1","label":"Customer Name","required":true,"example":"John"},{"key":"2","label":"Appointment Date","required":true,"example":"March 5, 2025 at 10:00 AM"},{"key":"3","label":"Location","required":true,"example":"123 Main St, San Francisco"}]',
    },
    {
      name: 'special_offer',
      description: 'Marketing special offer with website and quick reply buttons',
      category: 'marketing',
      content: '🎉 Exclusive deal just for you, {{1}}! Get {{2}}% off on all services this week. Use code {{3}} at checkout. Don\'t miss out!',
      templateType: 'image',
      headerMediaUrl: '/uploads/template-assets/default/whatsapp/offer-banner.png',
      headerMediaType: 'image/png',
      footerText: '{{company.name}}',
      buttonsJson: '[{"type":"website","text":"Shop Now","value":"https://example.com/shop"},{"type":"quick_reply","text":"Tell Me More","value":"more_info"}]',
      status: 'approved',
      tagsJson: '["marketing","offer"]',
      variablesJson: '[{"key":"1","label":"Customer Name","required":true,"example":"Sarah"},{"key":"2","label":"Discount Percentage","required":true,"example":"20"},{"key":"3","label":"Promo Code","required":true,"example":"SAVE20"}]',
    },
    {
      name: 'order_confirmation',
      description: 'Order confirmation with tracking link',
      category: 'utility',
      content: 'Your order {{1}} has been confirmed! 📦 Estimated delivery: {{2}}. Track your order anytime. Thank you for choosing us!',
      templateType: 'image',
      headerMediaUrl: '/uploads/template-assets/default/whatsapp/order-banner.png',
      headerMediaType: 'image/png',
      footerText: '{{company.name}}',
      buttonsJson: '[{"type":"website","text":"Track Order","value":"https://example.com/track"}]',
      status: 'approved',
      tagsJson: '["order","confirmation"]',
      variablesJson: '[{"key":"1","label":"Order Number","required":true,"example":"ORD-12345"},{"key":"2","label":"Estimated Delivery","required":true,"example":"March 8, 2025"}]',
    },
    {
      name: 'payment_reminder',
      description: 'Payment reminder with pay now and help buttons',
      category: 'utility',
      content: 'Hi {{1}}, your payment of ${{2}} for invoice #{{3}} is due on {{4}}. Please make the payment at your earliest convenience.',
      templateType: 'text',
      headerText: 'Payment Reminder',
      footerText: '{{company.name}}',
      buttonsJson: '[{"type":"website","text":"Pay Now","value":"https://example.com/pay"},{"type":"quick_reply","text":"Need Help","value":"help"}]',
      status: 'approved',
      tagsJson: '["payment","reminder"]',
      variablesJson: '[{"key":"1","label":"Customer Name","required":true,"example":"John"},{"key":"2","label":"Amount","required":true,"example":"150.00"},{"key":"3","label":"Invoice Number","required":true,"example":"INV-001"},{"key":"4","label":"Due Date","required":true,"example":"March 15, 2025"}]',
    },
    {
      name: 'welcome_message',
      description: 'Welcome message for new customers',
      category: 'marketing',
      content: 'Welcome to {{1}}! 🎉 We\'re thrilled to have you. Explore our services and don\'t hesitate to reach out if you need anything.',
      templateType: 'text',
      headerText: 'Welcome!',
      footerText: '{{company.name}}',
      buttonsJson: '[{"type":"website","text":"Visit Website","value":"https://example.com"},{"type":"quick_reply","text":"Get Support","value":"support"}]',
      status: 'approved',
      tagsJson: '["welcome","onboarding"]',
      variablesJson: '[{"key":"1","label":"Company Name","required":true,"example":"Acme Solutions"}]',
    },
  ];

  for (const tmpl of whatsappTemplates) {
    // Delete existing with same name (idempotent)
    await db.campaignTemplate.deleteMany({
      where: { name: tmpl.name },
    });

    const createData: any = {
      name: tmpl.name,
      description: tmpl.description,
      category: tmpl.category,
      content: tmpl.content,
      templateType: tmpl.templateType,
      footerText: tmpl.footerText || null,
      buttonsJson: tmpl.buttonsJson,
      status: tmpl.status,
      tagsJson: tmpl.tagsJson,
      variablesJson: tmpl.variablesJson || '[]',
      isApproved: tmpl.status === 'approved',
      tenantId: null,
    };

    if (tmpl.headerText) {
      createData.headerText = tmpl.headerText;
    }
    if (tmpl.headerMediaUrl) {
      createData.headerMediaUrl = tmpl.headerMediaUrl;
      createData.headerMediaType = tmpl.headerMediaType;
    }

    await db.campaignTemplate.create({ data: createData });
    console.log(`   ✅ ${tmpl.name}`);
  }

  console.log('');

  // ════════════════════════════════════════════════
  // 5. SUMMARY
  // ════════════════════════════════════════════════
  const emailCount = await db.emailTemplate.count({ where: { isBuiltIn: true } });
  const waCount = await db.campaignTemplate.count({ where: { name: { in: whatsappTemplates.map(t => t.name) } } });
  const imgCount = await db.imageLibrary.count({ where: { url: { startsWith: '/uploads/template-assets/default/' } } });

  console.log('═══════════════════════════════════════════');
  console.log('📊 Seed Summary:');
  console.log(`   Email Templates:    ${emailCount}`);
  console.log(`   WhatsApp Templates: ${waCount}`);
  console.log(`   Image Library:      ${imgCount}`);
  console.log(`   Brand Kit:          ✅ (Acme Solutions, teal)`);
  console.log('═══════════════════════════════════════════');
  console.log('\n✨ Template Studio seed complete!\n');
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await db.$disconnect();
    process.exit(1);
  });
