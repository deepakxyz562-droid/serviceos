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

    const invoice = await db.invoice.findFirst({
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
