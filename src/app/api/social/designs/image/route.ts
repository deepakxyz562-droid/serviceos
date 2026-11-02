import { NextRequest,NextResponse,after } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { runDesignJob } from '@/lib/designs/jobs';
export const maxDuration=180;
export async function POST(request:NextRequest){
 const user=await getAuthUser(request);
 if(!user?.tenantId)return NextResponse.json({error:'Authentication required'},{status:401});
 try{
  const body=await request.json();
  if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>4000||!['gemini','openrouter'].includes(body.provider)||!/^[-a-zA-Z0-9]{16,80}$/.test(body.requestId||''))return NextResponse.json({error:'Provide a prompt, provider and unique request ID'},{status:400});
  const rawPrompt=body.prompt.trim();
  const storedPrompt=(body.isPoster&&!rawPrompt.startsWith('[POSTER]'))?`[POSTER] ${rawPrompt}`:rawPrompt;
  const id=`${user.tenantId}:${body.requestId}`;
  const existing=await db.designGenerationJob.findFirst({where:{id,tenantId:user.tenantId}});
  if(existing){if(existing.prompt!==storedPrompt||existing.provider!==body.provider)return NextResponse.json({error:'Request ID already used with different content'},{status:409});return NextResponse.json({jobId:id,status:existing.status},{status:202});}
  await db.designGenerationJob.create({data:{id,tenantId:user.tenantId,userId:user.id,prompt:storedPrompt,provider:body.provider}});
  after(()=>runDesignJob(id));
  return NextResponse.json({jobId:id,status:'queued'},{status:202});
 }catch{return NextResponse.json({error:'Could not queue image generation. Retry using the same request ID.'},{status:503});}
}
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  const possibleIds = id
    ? id.includes(':')
      ? [id]
      : [id, `${user.tenantId}:${id}`]
    : undefined;

  const job = await db.designGenerationJob.findFirst({
    where: {
      tenantId: user.tenantId,
      ...(possibleIds ? { id: { in: possibleIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  // Self-healing: if job is queued and not cancelled, run it immediately on-demand without needing external cron!
  if (job.status === 'queued' && !job.cancelRequested) {
    after(() => runDesignJob(job.id));
  }
  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    error: job.error,
    result: job.status === 'completed' && job.resultJson ? JSON.parse(job.resultJson) : null,
  });
}
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  const possibleIds = id.includes(':') ? [id] : [id, `${user.tenantId}:${id}`];

  await db.designGenerationJob.updateMany({
    where: { id: { in: possibleIds }, tenantId: user.tenantId, status: 'queued' },
    data: { status: 'cancelled', cancelRequested: true, finishedAt: new Date() },
  });
  await db.designGenerationJob.updateMany({
    where: { id: { in: possibleIds }, tenantId: user.tenantId, status: 'running' },
    data: { cancelRequested: true },
  });
  return NextResponse.json({ message: 'Cancellation requested. Already-started provider work may still be charged.' });
}
