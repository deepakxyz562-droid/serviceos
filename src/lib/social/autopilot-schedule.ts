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

/** Next eligible minute, using the business timezone including DST transitions. */
export function nextAutopilotRun(config: Parameters<typeof autopilotDue>[0], now = new Date()): string | null {
 if (!config?.enabled || !config.startDate || !config.endDate || !config.postingTime) return null;
 const start = Math.max(now.getTime(), Date.parse(config.startDate));
 const end = Math.min(Date.parse(config.endDate), start + 49 * 60 * 60_000);
 if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
 const formatter = new Intl.DateTimeFormat('en-CA',{timeZone:config.timeZone || 'UTC',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const parts = (date:Date) => { const p=formatter.formatToParts(date);const get=(type:string)=>p.find(x=>x.type===type)?.value;return {day:`${get('year')}-${get('month')}-${get('day')}`,time:`${get('hour')}:${get('minute')}`}; };
 const lastDay=config.lastRunAt ? parts(new Date(config.lastRunAt)).day : null;
 for(let t=start;t<end;t+=60_000){const slot=parts(new Date(t));if(slot.day!==lastDay && slot.time>=config.postingTime)return new Date(t).toISOString();}
 return null;
}
