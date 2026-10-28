// SANDBOX-ONLY seed for local sqlite verification. Never committed to production.
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const user = await db.user.findUnique({ where: { email: 'rajesh@fieseros-demo.com' } });
  if (!user) throw new Error('demo owner not found — run db:seed first');

  // Idempotent: wipe prior commerce seed for this owner (cascades to customers/invoices/banks/cheques)
  await db.aiBusiness.deleteMany({ where: { ownerId: user.id } });

  const biz = await db.aiBusiness.create({
    data: {
      ownerId: user.id,
      tenantId: user.tenantId || null,
      name: 'Laddu Kirana Stores',
      ownerName: 'Rajesh Kumar',
      phone: '+91 98100 12345',
      email: 'rajesh@laddukirana.in',
      address: '12, Main Bazaar, Delhi',
      currency: 'INR',
      currencySymbol: '₹',
      defaultTaxRate: 18,
      gstin: '07AABCL1234C1Z5', // 07 = Delhi
      stateCode: '07',
      plan: 'PRO',
      invoiceSeq: 2001,
      bankAccountName: 'Laddu Kirana Stores',
      bankAccountNumber: '50100234567891',
      bankIfsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
      bankBranch: 'Chandni Chowk',
      upiId: 'laddukirana@upi',
      upiPayeeName: 'Laddu Kirana Stores',
      showBankOnInvoice: true,
      showUpiOnInvoice: true,
    },
  });

  await db.gptformCommerceConfig.create({
    data: {
      businessId: biz.id,
      currency: 'INR',
      currencySymbol: '₹',
      upiId: 'laddukirana@upi',
      catalogJson: JSON.stringify([
        { id: 'c1', name: 'Basmati Rice 25kg', price: 1200, description: 'Premium long grain', category: 'Grocery', isActive: true },
        { id: 'c2', name: 'Mustard Oil 5L', price: 850, description: 'Kachi ghani', category: 'Grocery', isActive: true },
        { id: 'c3', name: 'Detergent Powder 4kg', price: 420, description: 'Bulk pack', category: 'Home Care', isActive: true },
      ]),
    },
  });

  const custB2B = await db.aiCustomer.create({
    data: {
      businessId: biz.id,
      name: 'Sharma Traders',
      email: 'billing@sharmatraders.in',
      phone: '+91 98450 11111',
      address: 'MG Road, Bengaluru, Karnataka',
      gstin: '29AABCS1429B1ZX', // 29 = Karnataka → inter-state from Delhi
    },
  });
  const custB2C = await db.aiCustomer.create({
    data: {
      businessId: biz.id,
      name: 'Priya General Store',
      phone: '+91 98111 22222',
      address: 'Karol Bagh, Delhi',
    },
  });

  await db.aiItem.createMany({
    data: [
      { businessId: biz.id, description: 'Basmati Rice 25kg', unitPrice: 1200, unit: 'bag', taxRate: 5, category: 'Grocery', isActive: true },
      { businessId: biz.id, description: 'Mustard Oil 5L', unitPrice: 850, unit: 'can', taxRate: 18, category: 'Grocery', isActive: true },
      { businessId: biz.id, description: 'Detergent Powder 4kg', unitPrice: 420, unit: 'pack', taxRate: 18, category: 'Home Care', isActive: true },
    ],
  });

  // INV-2001: inter-state B2B, fully paid (IGST case)
  const inv1 = await db.aiInvoice.create({
    data: {
      businessId: biz.id,
      customerId: custB2B.id,
      number: 'INV-2001',
      status: 'PAID',
      taxRate: 18,
      dueDate: new Date(Date.now() + 15 * 864e5),
      notes: 'Transport by road. Thank you for your business.',
      items: {
        create: [
          { description: 'Basmati Rice 25kg', qty: 4, unitPrice: 1200, hsnCode: '1006', gstRate: 5 },
          { description: 'Mustard Oil 5L', qty: 6, unitPrice: 850, hsnCode: '1514', gstRate: 18 },
        ],
      },
    },
  });
  // taxable 4800+5100=9900; IGST 5% of 4800=240 + 18% of 5100=918 → total 11058
  await db.aiPayment.create({
    data: { invoiceId: inv1.id, amount: 11058, method: 'BANK_TRANSFER', reference: 'UTR9918273645', gateway: 'bank', recordedBy: user.id },
  });

  // INV-2002: local B2C, partially paid (CGST/SGST case)
  const inv2 = await db.aiInvoice.create({
    data: {
      businessId: biz.id,
      customerId: custB2C.id,
      number: 'INV-2002',
      status: 'PARTIALLY_PAID',
      taxRate: 18,
      dueDate: new Date(Date.now() + 7 * 864e5),
      items: {
        create: [
          { description: 'Detergent Powder 4kg', qty: 10, unitPrice: 420, hsnCode: '3402', gstRate: 18 },
        ],
      },
    },
  });
  // taxable 4200, CGST 378 + SGST 378 → total 4956; paid 2000 → balance 2956
  await db.aiPayment.create({
    data: { invoiceId: inv2.id, amount: 2000, method: 'CASH', recordedBy: user.id },
  });

  await db.aiBankAccount.create({
    data: {
      businessId: biz.id,
      name: 'HDFC Current A/c',
      type: 'BANK',
      accountNumber: '50100234567891',
      ifsc: 'HDFC0001234',
      openingBalance: 50000,
      currentBalance: 61058,
      currency: 'INR',
      isDefault: true,
    },
  });

  await db.aiCheque.create({
    data: {
      businessId: biz.id,
      direction: 'INCOMING',
      partyName: 'Sharma Traders',
      amount: 25000,
      chequeNumber: '004231',
      bankName: 'Kotak Mahindra',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 20 * 864e5),
      status: 'PENDING',
    },
  });

  console.log('✅ sandbox commerce seed done — business', biz.id);
  process.exit(0);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
