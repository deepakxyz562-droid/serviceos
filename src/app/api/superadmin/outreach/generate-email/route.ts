import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { generateOutreachCopy } from '@/lib/outreach/copy';
import { outreachDb } from '@/lib/outreach/db';
export async function POST(request: NextRequest) {
  if (!await isSuperAdminRequest(request)) return NextResponse.json({ error: 'SuperAdmin access required.' }, { status: 403 });
  const parsed = z.object({ tenantId: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a real marketplace company.' }, { status: 400 });
  const tenant = await outreachDb.tenant.findUnique({ where: { id: parsed.data.tenantId }, select: { name: true, industry: true, city: true } });
  if (!tenant) return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
  const state = await outreachDb.outreachAutomation.findUnique({ where: { id: 'default' } });
  return NextResponse.json(await generateOutreachCopy({ companyName: tenant.name, industry: tenant.industry, city: tenant.city,
    pitch: state?.pitch || 'Fieseros helps service businesses manage scheduling, invoicing and missed calls.' }));
}
