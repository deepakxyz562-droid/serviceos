import { NextRequest,NextResponse } from 'next/server';
import { drainDesignJobs } from '@/lib/designs/jobs';
export const maxDuration=180;
export async function POST(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 return NextResponse.json({processed:await drainDesignJobs()});
}
