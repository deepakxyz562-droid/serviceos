import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parsePaymentSettings } from '@/app/api/settings/payment-integrations/route';

/**
 * GET /api/public/invoices/[id]
 *
 * Public, sanitized invoice fetch for customer payment checkout page.
 * Returns invoice details, business branding, and active provider payment methods.
 * No session required — public by invoice ID / number.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let invoice = await db.invoice.findFirst({
      where: {
        OR: [{ id }, { number: id }],
      },
      select: {
        id: true,
        number: true,
        amount: true,
        tax: true,
        discount: true,
        total: true,
        currency: true,
        status: true,
        dueDate: true,
        createdAt: true,
        itemsJson: true,
        notes: true,
        tenantId: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    // ── If not found in enterprise invoices, check BOS commerce invoices (AiInvoice) ──
    if (!invoice) {
      const aiInvoice = await db.aiInvoice.findFirst({
        where: {
          OR: [{ id }, { number: id }],
        },
        include: {
          customer: true,
          business: true,
          items: true,
          payments: true,
        },
      });

      if (aiInvoice) {
        const items = aiInvoice.items.map((it) => ({
          name: it.description,
          description: it.hsnCode ? `HSN/SAC: ${it.hsnCode}` : undefined,
          unitPrice: it.unitPrice,
          amount: Number((it.qty * it.unitPrice).toFixed(2)),
          quantity: it.qty,
        }));

        const subtotal = items.reduce((s, it) => s + (it.amount || 0), 0);
        let discount = 0;
        if (aiInvoice.discountType === 'PERCENT') {
          discount = Number(((subtotal * aiInvoice.discountValue) / 100).toFixed(2));
        } else {
          discount = Number(Math.min(subtotal, aiInvoice.discountValue).toFixed(2));
        }
        const taxable = Math.max(0, subtotal - discount);
        const taxRate = Number(aiInvoice.taxRate) || 0;
        const tax = Number(((taxable * taxRate) / 100).toFixed(2));
        const total = Number((taxable + tax).toFixed(2));

        const verifiedPayments = aiInvoice.payments.filter((p) => p.gateway !== 'manual_report');
        const totalPaid = verifiedPayments.reduce((s, p) => s + p.amount, 0);
        const latestReport = aiInvoice.payments.slice().reverse().find((p) => p.gateway === 'manual_report') || null;
        const isPaid = aiInvoice.status === 'PAID' || (totalPaid >= total && total > 0);
        const isReported = !isPaid && (Boolean(latestReport) || aiInvoice.status === 'PARTIALLY_PAID' || aiInvoice.status === 'payment_reported');

        // Load commerce config for store UPI ID & billing settings
        const commerceConfig = await db.gptformCommerceConfig.findFirst({
          where: { businessId: aiInvoice.businessId },
        });
        let configBilling: any = {};
        try {
          if (commerceConfig?.fieldsJson) {
            const raw = JSON.parse(commerceConfig.fieldsJson);
            configBilling = raw.billing || {};
          }
        } catch {}

        const effectiveUpiId = configBilling.upiId || aiInvoice.business.upiId || '';

        const branding = {
          businessName: aiInvoice.business.name || 'Store Merchant',
          logoUrl: aiInvoice.business.logoUrl || null,
          phone: aiInvoice.business.phone || null,
          email: aiInvoice.business.email || null,
          address: aiInvoice.business.address || null,
          gstin: aiInvoice.business.gstin || configBilling.gstin || null,
          currency: aiInvoice.business.currency || 'INR',
        };

        const paymentMethods: any = {
          upi: effectiveUpiId
            ? {
                enabled: true,
                upiId: effectiveUpiId,
                merchantName: aiInvoice.business.name,
              }
            : undefined,
          directBank: (aiInvoice.business.bankAccountName && aiInvoice.business.bankAccountNumber)
            ? {
                enabled: true,
                bankName: aiInvoice.business.bankName || 'Bank',
                accountName: aiInvoice.business.bankAccountName,
                accountNumber: aiInvoice.business.bankAccountNumber,
                ifscCode: aiInvoice.business.bankIfsc || undefined,
                instructions: aiInvoice.business.paymentInstructions || undefined,
              }
            : undefined,
        };

        return NextResponse.json({
          invoice: {
            id: aiInvoice.id,
            number: aiInvoice.number,
            amount: subtotal,
            tax,
            discount,
            total,
            currency: aiInvoice.business.currency || 'INR',
            status: isPaid ? 'paid' : isReported ? 'payment_reported' : (aiInvoice.status || 'unpaid').toLowerCase(),
            dueDate: aiInvoice.dueDate ? aiInvoice.dueDate.toISOString() : null,
            createdAt: aiInvoice.createdAt.toISOString(),
            notes: aiInvoice.notes || null,
            customerName: aiInvoice.customer?.name || 'Customer',
            customerEmail: aiInvoice.customer?.email || null,
            customerPhone: aiInvoice.customer?.phone || null,
            customerAddress: aiInvoice.customer?.address || null,
            customerGstin: aiInvoice.customer?.notes?.startsWith('GSTIN:') ? aiInvoice.customer.notes.replace('GSTIN:', '').trim() : undefined,
            jobTitle: null,
            items,
            paidAmount: totalPaid,
            balance: Math.max(0, total - totalPaid),
            reportedPayment: latestReport
              ? {
                  reference: latestReport.reference,
                  method: latestReport.method,
                  notes: latestReport.notes,
                  reportedAt: latestReport.paidAt.toISOString(),
                }
              : null,
          },
          branding,
          paymentMethods,
        }, {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
      }
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // ── Fetch Tenant Branding & Payment Methods ────────────────────────────
    let branding: {
      businessName: string;
      logoUrl: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      currency: string;
    } = {
      businessName: 'Service Provider',
      logoUrl: null,
      phone: null,
      email: null,
      address: null,
      currency: invoice.currency || 'USD',
    };

    let paymentMethods: {
      razorpay?: { enabled: boolean; keyId: string };
      stripe?: { enabled: boolean; publishableKey: string };
      paypal?: { enabled: boolean; clientId: string };
      directBank?: {
        enabled: boolean;
        bankName: string;
        accountName: string;
        accountNumber: string;
        routingNumber?: string;
        ifscCode?: string;
        sortCode?: string;
        bsb?: string;
        iban?: string;
        swiftBic?: string;
        instructions?: string;
      };
      upi?: {
        enabled: boolean;
        upiId: string;
        merchantName?: string;
      };
    } = {};

    if (invoice.tenantId) {
      const tenant = await db.tenant.findUnique({
        where: { id: invoice.tenantId },
        select: {
          name: true,
          phone: true,
          email: true,
          address: true,
          settingsJson: true,
        },
      });

      if (tenant) {
        branding.businessName = tenant.name;
        branding.phone = tenant.phone;
        branding.email = tenant.email;
        branding.address = tenant.address;

        const settings = parsePaymentSettings(tenant.settingsJson);

        // Populate public-safe keys (NO SECRETS RETURNED)
        if (settings.razorpay?.enabled && settings.razorpay?.keyId) {
          paymentMethods.razorpay = {
            enabled: true,
            keyId: settings.razorpay.keyId,
          };
        }

        if (settings.stripe?.publishableKey) {
          paymentMethods.stripe = {
            enabled: true,
            publishableKey: settings.stripe.publishableKey,
          };
        }

        if (settings.paypal?.clientId) {
          paymentMethods.paypal = {
            enabled: true,
            clientId: settings.paypal.clientId,
          };
        }

        if (settings.directBank?.enabled && settings.directBank?.accountNumber) {
          paymentMethods.directBank = {
            enabled: true,
            bankName: settings.directBank.bankName,
            accountName: settings.directBank.accountName,
            accountNumber: settings.directBank.accountNumber,
            routingNumber: settings.directBank.routingNumber,
            ifscCode: settings.directBank.ifscCode,
            sortCode: settings.directBank.sortCode,
            bsb: settings.directBank.bsb,
            iban: settings.directBank.iban,
            swiftBic: settings.directBank.swiftBic,
            instructions: settings.directBank.instructions,
          };
        }

        if (settings.upi?.enabled && settings.upi?.upiId) {
          paymentMethods.upi = {
            enabled: true,
            upiId: settings.upi.upiId,
            merchantName: settings.upi.merchantName || tenant.name,
          };
        }
      }
    }

    let items = [];
    try {
      items = JSON.parse(invoice.itemsJson || '[]');
    } catch {
      items = [];
    }

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount,
        tax: invoice.tax,
        discount: invoice.discount,
        total: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: invoice.dueDate,
        createdAt: invoice.createdAt,
        items,
        notes: invoice.notes,
        customerName: invoice.customer?.name ?? 'Valued Customer',
        customerEmail: invoice.customer?.email ?? null,
        customerPhone: invoice.customer?.phone ?? null,
        jobTitle: invoice.job?.title ?? null,
      },
      branding,
      paymentMethods,
    });
  } catch (error) {
    console.error('Public invoice fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve invoice' },
      { status: 500 }
    );
  }
}
