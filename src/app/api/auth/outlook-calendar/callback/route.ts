import { NextRequest,NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { verifyCalendarState } from '@/lib/scheduling/calendar-oauth-state';
import { exchangeOutlookCode } from '@/lib/scheduling/outlook-calendar-sync';
export async function GET(request:NextRequest) {
 const user=await getAuthUser();if(!user?.tenantId)return NextResponse.json({error:'Authentication required'},{status:401});
 const state=verifyCalendarState(request,'outlook',user.id,user.tenantId);const code=request.nextUrl.searchParams.get('code');
 if(!state || !code)return NextResponse.json({error:'Calendar authorization expired or invalid'},{status:403});
 try{await exchangeOutlookCode(code,state.verifier,user.tenantId);const response=NextResponse.redirect(new URL('/app?view=scheduling&calendar=connected',request.url));response.cookies.set('bgos-calendar-outlook','',{path:'/api/auth',maxAge:0});return response;}
 catch{return NextResponse.json({error:'Could not connect Microsoft Calendar. Please retry from your workspace.'},{status:503});}
}
