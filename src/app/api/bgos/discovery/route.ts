import { reserveLeadCredits, finalizeLeadCredits } from '@/lib/bgos-usage';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
const query = z.object({ provider: z.enum(['apollo','hunter']), query: z.string().trim().min(2).max(150), page: z.number().int().min(1).max(20).default(1) });

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user?.tenantId || !['owner','admin','standalone_user'].includes(user.role)) return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  const parsed = query.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Choose a provider and enter a valid search' }, { status: 400 });
  const { provider, query: search, page } = parsed.data;
  // Provider keys are server-only. No key or provider response containing credentials is returned.
  const key = provider === 'apollo' ? process.env.BGOS_APOLLO_API_KEY : process.env.BGOS_HUNTER_API_KEY;
  if (!key) return NextResponse.json({ error: `${provider === 'apollo' ? 'Apollo' : 'Hunter'} is not connected for this deployment. Contact your workspace administrator.`, code: 'PROVIDER_NOT_CONFIGURED' }, { status: 409 });
  if (!user.workspaceId) return NextResponse.json({ error: 'Select your BGOS workspace first' }, { status: 409 });
  let reservation: string;
  try { reservation = await reserveLeadCredits(user.id, user.workspaceId, provider); }
  catch { return NextResponse.json({ error: 'An active Business plan, installed usage migration and 20 available lead credits are required.' }, { status: 409 }); }
  let count = 0; let completed = false;
  try {
    if (provider === 'hunter') {
      if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(search)) return NextResponse.json({ error: 'Enter a company domain, such as example.com' }, { status: 400 });
      const url = new URL('https://api.hunter.io/v2/domain-search');
      url.search = new URLSearchParams({ domain: search, api_key: key, limit: '20', offset: String((page - 1) * 20) }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
      if (!response.ok) return NextResponse.json({ error: `Hunter could not complete the search (${response.status}). Check provider access and quota.` }, { status: 502 });
      const data = await response.json();
      count = Math.min(20, data.data?.emails?.length || 0); completed = true;
      return NextResponse.json({ provider, prospects: (data.data?.emails || []).map((p: { value: string; first_name?: string; last_name?: string; position?: string; verification?: { status: string }; confidence?: number }) => ({ id: p.value, name: [p.first_name,p.last_name].filter(Boolean).join(' ') || p.value, email: p.value, company: data.data.organization || search, title: p.position || '', verification: p.verification?.status || 'unknown', provider })), total: data.meta?.results ?? null, page });
    }
    const response = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key }, body: JSON.stringify({ q_keywords: search, page, per_page: 20 }), signal: AbortSignal.timeout(20000), cache: 'no-store' });
    if (!response.ok) return NextResponse.json({ error: `Apollo could not complete the search (${response.status}). Check provider access and quota.` }, { status: 502 });
    const data = await response.json();
    count = Math.min(20, data.people?.length || 0); completed = true;
    return NextResponse.json({ provider, prospects: (data.people || []).map((p: { id: string; first_name?: string; last_name_obfuscated?: string; title?: string; organization?: { name?: string } }) => ({ id: p.id, name: [p.first_name,p.last_name_obfuscated].filter(Boolean).join(' ') || 'Prospect', email: null, company: p.organization?.name || '', title: p.title || '', verification: 'enrichment_required', provider })), total: data.total_entries ?? null, page });
  } catch { return NextResponse.json({ error: 'Provider unavailable. Please retry.' }, { status: 503 }); }
  finally { await finalizeLeadCredits(user.id, reservation, count, !completed); }
}
