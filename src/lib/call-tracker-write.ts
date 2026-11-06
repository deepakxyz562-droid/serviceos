import { z } from 'zod';
import { db } from '@/lib/db';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import { getSupabaseAdmin } from '@/lib/supabase';

const phone = z.string().trim().regex(/^\+?[\d ()-]{5,32}$/, 'Enter a valid phone number');
const money = z.coerce.number().finite().min(0).max(1e12).default(0);
export const callInput = z.object({
  customerPhone: phone.optional(), phone: phone.optional(),
  callType: z.enum(['inbound','outbound','missed','rejected']).default('inbound'),
  durationSec: z.coerce.number().int().min(0).max(604800).default(0),
  summary: z.string().max(10000).nullable().optional(), notes: z.string().max(10000).optional(),
  outcomeType: z.enum(['connected','missed','rejected','followup','not_connected','unknown','cancelled']).default('unknown'),
  createLead: z.boolean().default(false), leadName: z.string().trim().max(200).default(''), leadValue: money,
  captureSource: z.enum(['manual','android_sim']).default('manual'),
  sourceEventId: z.string().min(8).max(200).optional(),
  startedAt: z.string().datetime().optional(), endedAt: z.string().datetime().optional(),
}).superRefine((v,ctx)=>{
  if (!v.customerPhone && !v.phone) ctx.addIssue({code:'custom',message:'Phone number is required',path:['customerPhone']});
  if (v.captureSource==='android_sim' && (!v.sourceEventId || !v.startedAt)) ctx.addIssue({code:'custom',message:'Native calls require event ID and start timestamp'});
  if (v.startedAt && v.endedAt && Date.parse(v.endedAt)<Date.parse(v.startedAt)) ctx.addIssue({code:'custom',message:'Call end precedes start'});
});
export const conversionInput = z.object({callId:z.string().min(1).max(200),name:z.string().trim().max(200).default(''),value:money,notes:z.string().max(10000).optional()});

export async function writeCall(tenant: string, action: 'create'|'convert', body: Record<string,unknown>): Promise<any> {
  if (shouldUseSupabaseDB()) {
    const client = getSupabaseAdmin();
    if (!client) throw new Error('Call storage unavailable');
    const {data,error} = await client.rpc('bgos_call_write',{p_tenant:tenant,p_action:action,p_body:body});
    if (error) throw new Error('Atomic call storage unavailable');
    return data;
  }
  // Parameterized SQL invokes the same atomic implementation on direct PostgreSQL.
  const rows = await db.$queryRaw<Array<{result:unknown}>>`SELECT public.bgos_call_write(${tenant}::text, ${action}::text, ${JSON.stringify(body)}::jsonb) AS result`;
  return rows[0]?.result;
}
