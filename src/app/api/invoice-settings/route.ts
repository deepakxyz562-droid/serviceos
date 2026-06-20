import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  getInvoiceSettings,
  saveInvoiceSettings,
  InvoiceAutomationSettings,
} from '@/lib/invoice-automation';

// GET /api/invoice-settings — read the invoice automation settings for the
// authenticated user's tenant.
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const settings = await getInvoiceSettings(user.tenantId);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Invoice settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load invoice settings' }, { status: 500 });
  }
}

// PUT /api/invoice-settings — update the invoice automation settings.
// Body: Partial<InvoiceAutomationSettings>
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner' && user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json({ error: 'Only owners and managers can update invoice settings' }, { status: 403 });
    }
    const body = await request.json() as Partial<InvoiceAutomationSettings>;
    const updated = await saveInvoiceSettings(user.tenantId, body);
    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Invoice settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to save invoice settings' }, { status: 500 });
  }
}
