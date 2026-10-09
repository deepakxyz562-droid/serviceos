import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { getAdminClient, shouldUseSupabaseDB } from '@/lib/supabase-db';

export async function reserveLeadCredits(userId: string, workspaceId: string, provider: string) {
  const id = randomUUID();
  if (shouldUseSupabaseDB()) {
    const { error } = await getAdminClient().rpc('reserve_bgos_leads', { p_user: userId, p_workspace: workspaceId, p_id: id, p_provider: provider, p_credits: 20 });
    if (error) throw new Error('An active Business plan and at least 20 available lead credits are required.');
  } else {
    await db.$queryRaw`SELECT public.reserve_bgos_leads(${userId},${workspaceId},${id},${provider},20)`;
  }
  return id;
}
export async function finalizeLeadCredits(userId: string, id: string, count: number, failed: boolean) {
  const quantity = Math.max(0, Math.min(20, count));
  if (shouldUseSupabaseDB()) {
    const { error } = await getAdminClient().rpc('finalize_bgos_leads', { p_user: userId, p_id: id, p_credits: quantity, p_failed: failed });
    if (error) throw new Error('Could not reconcile lead usage');
  } else await db.$queryRaw`SELECT public.finalize_bgos_leads(${userId},${id},${quantity},${failed})`;
}
export async function leadUsage(workspaceId: string): Promise<number> {
  const period = new Date(); period.setUTCDate(1); period.setUTCHours(0,0,0,0);
  if (shouldUseSupabaseDB()) {
    const { data, error } = await getAdminClient().from('BgosLeadUsage').select('credits').eq('workspaceId',workspaceId).eq('periodStart',period.toISOString().slice(0,10));
    if (error) throw new Error('Lead usage unavailable');
    return (data || []).reduce((sum, row) => sum + row.credits, 0);
  }
  const rows = await db.$queryRaw<{ used: number }[]>`SELECT COALESCE(sum(credits),0)::integer AS used FROM public."BgosLeadUsage" WHERE "workspaceId"=${workspaceId} AND "periodStart"=${period}`;
  return rows[0]?.used || 0;
}
