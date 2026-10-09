import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createCalendarState,setCalendarState } from '@/lib/scheduling/calendar-oauth-state';
import { outlookAuthUrl } from '@/lib/scheduling/outlook-calendar-sync';
export async function GET() {
  const user=await getAuthUser();if(!user?.tenantId || !['owner','admin','standalone_user'].includes(user.role))return NextResponse.json({error:'Owner access required'},{status:403});
  try{const state=createCalendarState(user.id,user.tenantId);const response=NextResponse.redirect(outlookAuthUrl(state.nonce,state.challenge));setCalendarState(response,'outlook',state.cookie);return response;}
  catch{return NextResponse.json({error:'Microsoft Calendar is not configured'},{status:503});}
}
