#!/usr/bin/env node
/**
 * Script to deploy and verify BOS Meta WhatsApp templates on WhatsApp Business Account.
 * Usage: node scripts/deploy-meta-templates.js
 */

const WABA_ID = process.env.WHATSAPP_WABA_ID || '1507850957401022';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAeZCCSIuiJMBS7pXiaGkKulP3jJNxZBQZBYpGFF7COSWkBpYhjiz76l0HZALk2sDASZAerisLJNtZBdBgq3U56t3KOir7oGKkt29fovabNHkHc38I0Adc7ZCqwSZBOWfCBvCIOvOEYcZBZAkIuUXxjMCIMfaLIoRCls6eKyAy718MQ1HFjkX8Htnxhgyl7JoU1AZDZD';
const GRAPH_VERSION = 'v21.0';

const TEMPLATES = [
  {
    name: 'bos_order_confirmed',
    category: 'UTILITY',
    allow_category_change: true,
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, your order #{{2}} at {{3}} is confirmed! Total: {{4}}. Payment: {{5}}. Track live status: {{6}} . Thank you for shopping with us.',
        example: {
          body_text: [
            ['Rahul', 'ORD-101', 'BOS Store', '₹1,450', 'PAID (UPI)', 'https://serviceos.com/order/101'],
          ],
        },
      },
    ],
  },
  {
    name: 'bos_order_status_update',
    category: 'UTILITY',
    allow_category_change: true,
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, your order #{{2}} at {{4}} is now {{3}}. Details: {{5}} . Track live status: {{6}} . Thank you for choosing us.',
        example: {
          body_text: [
            ['Rahul', 'ORD-101', 'READY FOR PICKUP', 'BOS Store', 'Main Counter #1', 'https://serviceos.com/order/101'],
          ],
        },
      },
    ],
  },
  {
    name: 'bos_tax_invoice',
    category: 'UTILITY',
    allow_category_change: true,
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, your tax invoice {{2}} from {{3}} for amount {{4}} is ready. Status: {{5}}. You can view and download your invoice at {{6}} . Thank you for your business.',
        example: {
          body_text: [
            ['Rahul', 'INV-2026-001', 'BOS Store', '₹2,500', 'PAID', 'https://serviceos.com/invoice/INV-2026-001'],
          ],
        },
      },
    ],
  },
  {
    name: 'bos_payment_received',
    category: 'UTILITY',
    allow_category_change: true,
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, we received payment of {{4}} for {{3}}. Receipt: #{{2}}. Mode: {{5}}. Remaining Balance: {{6}} . Thank you for your payment.',
        example: {
          body_text: [
            ['Rahul', 'REC-8901', 'BOS Store', '₹1,200', 'UPI', '₹0.00'],
          ],
        },
      },
    ],
  },
  {
    name: 'bos_khata_reminder',
    category: 'UTILITY',
    allow_category_change: true,
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, this is a payment reminder from {{2}}. An outstanding amount of {{3}} is pending ({{4}}). Please pay via UPI or view details at {{5}} . Thank you.',
        example: {
          body_text: [
            ['Rahul', 'BOS Store', '₹3,400', 'Due Today', 'https://serviceos.com/khata/pay'],
          ],
        },
      },
    ],
  },
];

async function run() {
  console.log(`[Meta WhatsApp] Checking templates on WABA ${WABA_ID}...`);

  // 1. Fetch existing templates
  const listRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${WABA_ID}/message_templates?access_token=${ACCESS_TOKEN}&limit=100`
  );
  const listData = await listRes.json();

  if (!listRes.ok) {
    console.error('Failed to query Meta Graph API:', listData);
    process.exit(1);
  }

  const existingMap = new Map();
  (listData.data || []).forEach((t) => {
    existingMap.set(t.name, t);
  });

  console.log(`Found ${existingMap.size} existing templates on Meta WABA.`);

  // 2. Deploy or check each BOS template
  for (const tpl of TEMPLATES) {
    const existing = existingMap.get(tpl.name);
    if (existing) {
      console.log(`✓ Template "${tpl.name}": status = ${existing.status} (Category: ${existing.category}, ID: ${existing.id})`);
      continue;
    }

    console.log(`Deploying template "${tpl.name}" to Meta...`);
    const createRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${WABA_ID}/message_templates`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tpl),
      }
    );
    const createData = await createRes.json();
    if (createRes.ok) {
      console.log(`✓ Template "${tpl.name}" SUBMITTED: ID=${createData.id}, status=${createData.status}, category=${createData.category}`);
    } else {
      console.warn(`✕ Failed to create "${tpl.name}":`, createData?.error?.message || createData);
    }
  }

  console.log('\n[Meta WhatsApp] Deployment complete.');
}

run().catch((err) => {
  console.error('Fatal error deploying templates:', err);
  process.exit(1);
});
