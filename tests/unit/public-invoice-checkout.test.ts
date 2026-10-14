import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  invoiceFindFirst: vi.fn(),
  invoiceUpdate: vi.fn(),
  aiInvoiceFindFirst: vi.fn(),
  aiInvoiceUpdate: vi.fn(),
  aiPaymentCreate: vi.fn(),
  commerceConfigFindFirst: vi.fn(),
  tenantFindUnique: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    invoice: {
      findFirst: mocks.invoiceFindFirst,
      update: mocks.invoiceUpdate,
    },
    aiInvoice: {
      findFirst: mocks.aiInvoiceFindFirst,
      update: mocks.aiInvoiceUpdate,
    },
    aiPayment: {
      create: mocks.aiPaymentCreate,
    },
    gptformCommerceConfig: {
      findFirst: mocks.commerceConfigFindFirst,
    },
    tenant: {
      findUnique: mocks.tenantFindUnique,
    },
  },
}));

import { GET } from '@/app/api/public/invoices/[id]/route';
import { POST } from '@/app/api/public/invoices/[id]/report-payment/route';

describe('Public Invoice Checkout Endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('resolves BOS AiInvoice with dynamic UPI ID and calculated tax correctly', async () => {
    mocks.invoiceFindFirst.mockResolvedValue(null);
    mocks.aiInvoiceFindFirst.mockResolvedValue({
      id: 'ai-inv-123',
      number: 'INV-2026-001',
      businessId: 'biz-1',
      status: 'DRAFT',
      dueDate: new Date('2026-10-25'),
      createdAt: new Date('2026-10-14'),
      notes: 'Please pay promptly',
      discountValue: 0,
      discountType: 'AMOUNT',
      taxRate: 18,
      customer: {
        id: 'cust-1',
        name: 'Ravi Kumar',
        phone: '9876543210',
        email: 'ravi@example.com',
        address: '123 Market Street, Bengaluru',
        notes: 'GSTIN: 29AAAAA0000A1Z5',
      },
      business: {
        id: 'biz-1',
        name: 'Ravi Supermart',
        currency: 'INR',
        phone: '9988776655',
        email: 'store@ravi.com',
        address: 'Shop 4, Bengaluru',
        gstin: '29ABCDE1234F1Z5',
        upiId: 'ravisuper@okaxis',
      },
      items: [
        { description: 'Rice 5kg', qty: 2, unitPrice: 300, hsnCode: '10063010' },
      ],
      payments: [],
    });

    mocks.commerceConfigFindFirst.mockResolvedValue({
      fieldsJson: JSON.stringify({
        billing: {
          upiId: 'ravi-merchant@icici',
          gstin: '29ABCDE1234F1Z5',
        },
      }),
    });

    const req = new NextRequest('http://localhost/api/public/invoices/INV-2026-001');
    const res = await GET(req, { params: Promise.resolve({ id: 'INV-2026-001' }) });
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.invoice).toBeDefined();
    expect(data.invoice.number).toBe('INV-2026-001');
    expect(data.invoice.amount).toBe(600); // 2 * 300
    expect(data.invoice.tax).toBe(108); // 18% of 600
    expect(data.invoice.total).toBe(708);
    expect(data.invoice.customerGstin).toBe('29AAAAA0000A1Z5');
    expect(data.paymentMethods.upi.enabled).toBe(true);
    expect(data.paymentMethods.upi.upiId).toBe('ravi-merchant@icici');
    expect(data.branding.businessName).toBe('Ravi Supermart');
  });

  it('handles customer reporting UPI payment with UTR on AiInvoice and records AiPayment', async () => {
    mocks.invoiceFindFirst.mockResolvedValue(null);
    mocks.aiInvoiceFindFirst.mockResolvedValue({
      id: 'ai-inv-123',
      number: 'INV-2026-001',
      status: 'SENT',
      discountValue: 0,
      discountType: 'AMOUNT',
      taxRate: 18,
      notes: null,
      business: {
        id: 'biz-1',
        currency: 'INR',
      },
      items: [
        { description: 'Service Item', qty: 1, unitPrice: 1000 },
      ],
      payments: [],
    });

    mocks.aiPaymentCreate.mockResolvedValue({ id: 'pay-1' });
    mocks.aiInvoiceUpdate.mockResolvedValue({ id: 'ai-inv-123', status: 'PARTIALLY_PAID' });

    const req = new NextRequest('http://localhost/api/public/invoices/ai-inv-123/report-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'UPI',
        referenceNumber: '428901234567',
        notes: 'Paid via PhonePe',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'ai-inv-123' }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('payment_reported');

    expect(mocks.aiPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceId: 'ai-inv-123',
          amount: 1180, // 1000 + 18%
          method: 'UPI',
          reference: '428901234567',
          gateway: 'manual_report',
        }),
      })
    );

    expect(mocks.aiInvoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ai-inv-123' },
        data: expect.objectContaining({
          status: 'PARTIALLY_PAID',
          notes: expect.stringContaining('Ref: 428901234567'),
        }),
      })
    );
  });

  it('returns 404 when invoice is not found in either system', async () => {
    mocks.invoiceFindFirst.mockResolvedValue(null);
    mocks.aiInvoiceFindFirst.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/public/invoices/invalid-id');
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid-id' }) });
    expect(res.status).toBe(404);
  });
});
