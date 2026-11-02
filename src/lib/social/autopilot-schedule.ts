export function localPostingSlot(now:Date,timeZone:string){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const get=(key:string)=>parts.find(p=>p.type===key)?.value||'';
 return {date:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`};
}
export function autopilotDue(config?: { enabled?: boolean; startDate?: string; endDate?: string; postingTime?: string; timeZone?: string; lastRunAt?: string | null } | null, now = new Date()) {
 if (!config || !config.enabled || !config.startDate || !config.endDate || !config.postingTime) return false;
 if (!Number.isFinite(Date.parse(config.startDate)) || !Number.isFinite(Date.parse(config.endDate))) return false;
 if (now.getTime() < Date.parse(config.startDate) || now.getTime() >= Date.parse(config.endDate)) return false;
 const zone = config.timeZone || 'UTC', slot = localPostingSlot(now, zone);
 return slot.time >= config.postingTime && (!config.lastRunAt || localPostingSlot(new Date(config.lastRunAt), zone).date !== slot.date);
}
