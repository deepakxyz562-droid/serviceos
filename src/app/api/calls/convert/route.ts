import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { conversionInput, writeCall } from '@/lib/call-tracker-write';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth?.tenantId) return NextResponse.json({error:'Unauthorized'},{status:401});
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({error:'Invalid JSON'},{status:400}); }
  const parsed = conversionInput.safeParse(raw);
  if (!parsed.success) return NextResponse.json({error:parsed.error.issues[0].message},{status:400});
  const v = parsed.data;
  try {
    const result = await writeCall(auth.tenantId,'convert',{
      callId:v.callId,leadName:v.name,leadValue:v.value,summary:v.notes,
      notesJson:JSON.stringify(v.notes ? [{author:auth.name || 'User',text:v.notes,createdAt:new Date().toISOString()}] : []),
    });
    return NextResponse.json(result,{status:result.status || 200});
  } catch {
    return NextResponse.json({error:'Lead conversion unavailable. Please retry.'},{status:503});
  }
}
