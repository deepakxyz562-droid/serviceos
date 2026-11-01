import {NextRequest,NextResponse} from 'next/server';
import {cleanupDesignAssets} from '@/lib/designs/cleanup';
export async function POST(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 const dryRun=request.nextUrl.searchParams.get('execute')!=='true';
 return NextResponse.json({dryRun,...await cleanupDesignAssets(dryRun)});
}
