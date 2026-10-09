import { db } from '@/lib/db';
import { encryptToken, decryptToken } from '@/lib/social/crypto';
const scope = 'offline_access User.Read Calendars.ReadWrite';
const base = 'https://graph.microsoft.com/v1.0';
function config() {
  const client = process.env.MICROSOFT_CLIENT_ID, secret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!client || !secret) throw new Error('Microsoft Calendar is not configured');
  const redirect = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com'}/api/auth/outlook-calendar/callback`;
  return { client,secret,redirect };
}
function parse(value: string | null) { try { return JSON.parse(value || '{}'); } catch { return {}; } }
async function token(body: Record<string,string>) {
  const c = config();
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token',{ method:'POST',headers:{ 'Content-Type':'application/x-www-form-urlencoded' },body:new URLSearchParams({ client_id:c.client,client_secret:c.secret,scope,...body }),signal:AbortSignal.timeout(15000),cache:'no-store' });
  if (!response.ok) throw new Error('Reconnect your Microsoft calendar');
  return response.json() as Promise<{ access_token:string;refresh_token?:string }>;
}
async function save(tenantId:string, refreshToken:string, email?:string) {
  const tenant = await db.tenant.findUnique({where:{id:tenantId},select:{settingsJson:true}});
  if (!tenant) throw new Error('Workspace not found');
  const settings = parse(tenant.settingsJson);
  settings.outlookCalendar = { ...settings.outlookCalendar, enabled:true, refreshToken:encryptToken(refreshToken), ...(email ? {email} : {}) };
  const updated = await db.tenant.updateMany({where:{id:tenantId,settingsJson:tenant.settingsJson},data:{settingsJson:JSON.stringify(settings)}});
  if (!updated.count) throw new Error('Settings changed. Retry calendar connection.');
}
export function outlookAuthUrl(state:string,challenge:string) {
  const c=config(); const url=new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  url.search=new URLSearchParams({client_id:c.client,response_type:'code',redirect_uri:c.redirect,response_mode:'query',scope,state,code_challenge:challenge,code_challenge_method:'S256'}).toString();return url.toString();
}
export async function exchangeOutlookCode(code:string,verifier:string,tenantId:string) {
  const tokens=await token({grant_type:'authorization_code',code,code_verifier:verifier,redirect_uri:config().redirect});
  if (!tokens.refresh_token) throw new Error('Offline calendar access was not granted');
  const profile=await fetch(`${base}/me?$select=mail,userPrincipalName`,{headers:{Authorization:`Bearer ${tokens.access_token}`},signal:AbortSignal.timeout(15000),cache:'no-store'});
  if (!profile.ok) throw new Error('Could not verify calendar account');
  const data=await profile.json();await save(tenantId,tokens.refresh_token,data.mail || data.userPrincipalName);
}
async function access(tenantId:string) {
  const tenant=await db.tenant.findUnique({where:{id:tenantId},select:{settingsJson:true}}); const settings=parse(tenant?.settingsJson || null);
  if (!settings.outlookCalendar?.enabled) return null;
  const tokens=await token({grant_type:'refresh_token',refresh_token:decryptToken(settings.outlookCalendar.refreshToken)});
  if (tokens.refresh_token) await save(tenantId,tokens.refresh_token);
  return tokens.access_token;
}
export async function outlookBusyTimes(tenantId:string,start:string,end:string) {
  const bearer=await access(tenantId); if (!bearer) return [];
  let url: string | undefined=`${base}/me/calendarView?${new URLSearchParams({startDateTime:start,endDateTime:end,'$top':'100','$select':'start,end,showAs,isCancelled'})}`;
  const ranges: {start:Date;end:Date}[]=[];
  for(let page=0;url && page<10;page++) {
    if (!url.startsWith(base+'/')) throw new Error('Invalid calendar response');
    const response=await fetch(url,{headers:{Authorization:`Bearer ${bearer}`,Prefer:'outlook.timezone="UTC"'},signal:AbortSignal.timeout(15000),cache:'no-store'});
    if (!response.ok) throw new Error('Microsoft availability unavailable');
    const data=await response.json();
    for(const event of data.value || []) if(!event.isCancelled && event.showAs!=='free') ranges.push({start:new Date(event.start.dateTime+'Z'),end:new Date(event.end.dateTime+'Z')});
    url=data['@odata.nextLink'];
  }
  if(url) throw new Error('Calendar result limit exceeded');
  return ranges;
}
export async function syncOutlookBooking(bookingId:string,tenantId:string) {
  const bearer=await access(tenantId); if(!bearer) return;
  const booking=await db.booking.findFirst({where:{id:bookingId,tenantId}});if(!booking?.scheduledAt)return;
  const meta=parse(booking.metadataJson);const eventId=meta.outlookCalendarEventId;
  if(booking.status==='cancelled' && !eventId)return;
  const start=new Date(booking.scheduledAt),end=booking.scheduledEndTime ? new Date(booking.scheduledEndTime) : new Date(start.getTime()+(booking.duration || 30)*60000);
  const method=booking.status==='cancelled'?'DELETE':eventId?'PATCH':'POST';
  const response=await fetch(eventId ? `${base}/me/events/${encodeURIComponent(eventId)}` : `${base}/me/events`,{method,headers:{Authorization:`Bearer ${bearer}`,'Content-Type':'application/json'},body:method==='DELETE'?undefined:JSON.stringify({subject:booking.title,start:{dateTime:start.toISOString(),timeZone:'UTC'},end:{dateTime:end.toISOString(),timeZone:'UTC'},...(eventId?{}:{transactionId:booking.id})}),signal:AbortSignal.timeout(15000)});
  if(!response.ok && !(method==='DELETE' && response.status===404))throw new Error('Microsoft calendar update failed');
  if(method==='POST'){const data=await response.json();meta.outlookCalendarEventId=data.id;}
  if(method==='DELETE')delete meta.outlookCalendarEventId;
  meta.outlookSyncStatus='synced';
  await db.booking.update({where:{id:bookingId},data:{metadataJson:JSON.stringify(meta)}});
}
