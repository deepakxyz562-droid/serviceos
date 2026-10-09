'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, RefreshCw, Search, Send, Settings2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Contact {
  id: string; tenantId?: string; name?: string; companyName?: string; email: string;
  industry?: string | null; city?: string | null; subject?: string; body?: string;
  status?: string; error?: string; sentAt?: string; providerMessageId?: string; copySource?: string;
}
interface Settings {
  enabled: boolean; dailyLimit: number; providerId: string | null; configurationSet: string | null;
  postalAddress: string; industry: string; pitch: string; nextSendAt: string; lastRunAt: string | null; pauseReason: string | null;
}
interface Dashboard {
  items: Contact[]; total: number; page: number; state: Settings;
  providers: { id: string; name: string; fromEmail: string }[];
  stats: { used: number; remaining: number; queued: number; sentTotal: number };
  feedbackConfigured: boolean; schedulerConfigured: boolean;
}
const views = [['new', 'New contacts'], ['queued', 'Queued'], ['sent', 'Already sent'], ['excluded', 'Needs attention']] as const;
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';

export function OutreachSection() {
  const [view, setView] = useState<string>('new');
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copySource, setCopySource] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const requestVersion = useRef(0);
  const copyVersion = useRef(0);
  const fetchDashboard = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const params = new URLSearchParams({ view, search, industry, page: String(page) });
      const response = await authFetch(`/api/superadmin/outreach/automation?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load outreach.');
      if (version === requestVersion.current) { setData(result); setError(''); }
    } catch (err) { if (version === requestVersion.current) setError(err instanceof Error ? err.message : 'Could not load outreach.'); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [view, search, industry, page]);
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchDashboard, 250);
    const poll = setInterval(fetchDashboard, 15000);
    return () => { clearTimeout(timer); clearInterval(poll); requestVersion.current++; };
  }, [fetchDashboard]);
  useEffect(() => {
    setSelected(null); setChecked([]); setSubject(''); setBody(''); setGenerating(false); copyVersion.current++;
  }, [view, search, industry, page]);
  const select = (contact: Contact) => {
    copyVersion.current++; setGenerating(false); setSelected(contact);
    setSubject(contact.subject || ''); setBody(contact.body || ''); setCopySource(contact.copySource || '');
  };
  const generate = async () => {
    if (!selected) return;
    const version = ++copyVersion.current;
    setGenerating(true);
    try {
      const response = await authFetch('/api/superadmin/outreach/generate-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: selected.tenantId || selected.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not generate draft.');
      if (version === copyVersion.current) { setSubject(result.subject); setBody(result.body); setCopySource(result.source); }
    } catch (err) { if (version === copyVersion.current) toast.error(err instanceof Error ? err.message : 'Draft generation failed.'); }
    finally { if (version === copyVersion.current) setGenerating(false); }
  };
  const queue = async (ids: string[], useDraft = false) => {
    setBusy(true);
    try {
      const response = await authFetch('/api/superadmin/outreach/automation', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantIds: ids, ...(useDraft ? { draft: { subject, body } } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not queue contacts.');
      toast.success(`${result.queued} contact${result.queued === 1 ? '' : 's'} queued`, { description: result.queued === 0 ? result.results?.[0]?.reason : 'Sent gradually while automation is running.' });
      setChecked([]); setSelected(null); setSubject(''); setBody(''); await fetchDashboard();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Queue failed.'); }
    finally { setBusy(false); }
  };
  const configure = async (action: 'save' | 'start' | 'pause') => {
    setBusy(true);
    try {
      const value = settings || data?.state;
      const payload = action === 'pause' ? { action } : {
        action, providerId: value?.providerId || undefined, configurationSet: value?.configurationSet || undefined,
        postalAddress: value?.postalAddress, industry: value?.industry, pitch: value?.pitch, dailyLimit: value?.dailyLimit,
      };
      const response = await authFetch('/api/superadmin/outreach/automation', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save settings.');
      toast.success(action === 'start' ? 'Outreach started' : action === 'pause' ? 'Outreach paused' : 'Settings saved');
      setShowSettings(false); setSettings(null); await fetchDashboard();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Settings failed.'); }
    finally { setBusy(false); }
  };
  const running = data?.state.enabled;
  const workerLate = running && (!data?.state.lastRunAt || Date.now() - new Date(data.state.lastRunAt).getTime() > 180000);
  return <section className="space-y-4" aria-label="Outreach workspace">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-semibold">Personal outreach</h2><p className="text-sm text-muted-foreground">Amazon SES · One email at a time · 24-hour schedule</p></div>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" aria-label="Refresh outreach" onClick={fetchDashboard}><RefreshCw className="h-4 w-4" /></Button>
        <Button variant="outline" disabled={!data} onClick={() => { setSettings(data!.state); setShowSettings(true); }}><Settings2 className="mr-2 h-4 w-4" />Settings</Button>
        <Button disabled={busy || !data} onClick={() => running ? configure('pause') : (setSettings(data!.state), setShowSettings(true))}>
          {running ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{running ? 'Pause' : 'Start outreach'}
        </Button>
      </div>
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {data && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[[`${data.stats.used} / ${data.state.dailyLimit}`, 'Used in the last 24 hours'], [String(data.stats.queued), 'Waiting in queue'], [String(data.stats.sentTotal), 'Already sent'], [running ? 'Running' : 'Paused', running ? `Next slot: ${dateLabel(data.state.nextSendAt)}` : data.state.pauseReason || 'Ready when you are']].map(([value, label]) =>
        <div key={label} className="rounded-xl border bg-card p-4"><div className="text-xl font-semibold">{value}</div><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
    </div>}
    {workerLate && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Waiting for the scheduler. Configure POST /api/cron/outreach every minute. No browser tab needs to stay open.</p>}
    <div className="grid min-h-[600px] overflow-hidden rounded-xl border bg-card lg:grid-cols-[minmax(360px,1fr)_minmax(400px,1.1fr)]">
      <div className="border-b lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap gap-1 border-b p-3" role="tablist" aria-label="Contact status">
          {views.map(([key, label]) => <button key={key} role="tab" aria-selected={view === key} onClick={() => { setView(key); setPage(1); }} className={`rounded-md px-3 py-2 text-sm ${view === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{label}</button>)}
        </div>
        <div className="space-y-2 border-b p-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search companies or emails" className="pl-9" placeholder="Search companies or emails" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div>
          {view === 'new' && <Input aria-label="Filter contacts by industry" placeholder="Filter industry, e.g. cleaning" value={industry} onChange={e => { setIndustry(e.target.value); setPage(1); }} />}
          {view === 'new' && <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2"><input type="checkbox" aria-label="Select this page" checked={Boolean(data?.items.length && checked.length === data.items.length)} onChange={e => setChecked(e.target.checked ? data?.items.map(i => i.id) || [] : [])} />Select page</label><Button variant="outline" size="sm" disabled={!checked.length || busy} onClick={() => queue(checked)}>Queue {checked.length || 'selected'}</Button></div>}
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {loading && !data ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : !data?.items.length ? <div className="p-12 text-center text-sm text-muted-foreground">{view === 'new' ? 'No matching eligible contacts.' : 'No contacts in this list yet.'}</div> : data.items.map(contact =>
            <div key={contact.id} className={`flex items-start gap-3 border-b px-4 py-4 ${selected?.id === contact.id ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
              {view === 'new' && <input type="checkbox" className="mt-1" aria-label={`Select ${contact.name || contact.companyName}`} checked={checked.includes(contact.id)} onChange={e => setChecked(ids => e.target.checked ? [...ids, contact.id] : ids.filter(id => id !== contact.id))} />}
              <button className="min-w-0 flex-1 text-left" onClick={() => select(contact)}>
                <div className="truncate font-medium">{contact.name || contact.companyName || 'Company'}</div>
                <p className="truncate text-sm text-muted-foreground">{contact.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{[contact.industry, contact.city].filter(Boolean).join(' · ')}</p>
                <p className="mt-2 text-xs">{contact.status || 'Not contacted · Email unchecked'}{contact.sentAt ? ` · ${dateLabel(contact.sentAt)}` : ''}</p>
                {contact.error && <p className="mt-1 text-xs text-amber-700">{contact.error}</p>}
              </button>
            </div>)}
        </div>
        <div className="flex items-center justify-between p-3 text-xs text-muted-foreground"><span>{data?.total.toLocaleString() || 0} contacts · Page {page}</span><div className="flex gap-2"><Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button size="sm" variant="ghost" disabled={!data || page * 50 >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
      </div>
      <div className="flex flex-col p-6">
        {!selected ? <div className="m-auto max-w-sm space-y-3 text-center"><Send className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="font-medium">Choose a company to preview an email</h3><p className="text-sm text-muted-foreground">Generate a personal draft, edit it, and add it to the paced queue. Starting automation also selects new contacts matching your campaign industry.</p><p className="text-xs text-muted-foreground">500 per rolling 24 hours maximum. Typical pacing takes about 17–21 hours for 500 when the scheduler and SES are healthy.</p></div> : <>
          <h3 className="text-lg font-semibold">{selected.name || selected.companyName}</h3>
          <p className="mb-5 text-sm text-muted-foreground">{[selected.industry, selected.city].filter(Boolean).join(' · ')}</p>
          <label className="mb-2 text-xs font-medium text-muted-foreground">To</label><Input readOnly value={selected.email} aria-label="Recipient" />
          <label className="mb-2 mt-4 text-xs font-medium text-muted-foreground" htmlFor="outreach-subject">Subject</label><Input id="outreach-subject" value={subject} maxLength={150} readOnly={view !== 'new'} onChange={e => setSubject(e.target.value)} placeholder="Generate a draft to begin" />
          <label className="mb-2 mt-4 text-xs font-medium text-muted-foreground" htmlFor="outreach-body">Message</label><textarea id="outreach-body" className="min-h-[280px] flex-1 resize-y rounded-md border bg-transparent p-4 text-sm leading-7" value={body} readOnly={view !== 'new'} onChange={e => setBody(e.target.value)} placeholder="Your personalized message will appear here." maxLength={4000} />
          <p className="mt-3 text-xs text-muted-foreground">{copySource === 'template' ? 'Template fallback used. ' : copySource === 'ai' ? 'AI draft — review the facts. ' : ''}{view === 'new' ? 'Sender signature, postal address and unsubscribe link are added at sending. No tracking pixels.' : `SES message ID: ${selected.providerMessageId || 'Not sent yet'}`}</p>
          {view === 'new' && <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" disabled={generating || busy} onClick={generate}>{generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate draft</Button><Button disabled={busy || generating || !subject.trim() || !body.trim()} onClick={() => queue([selected.id], true)}><Send className="mr-2 h-4 w-4" />Add to queue</Button></div>}
        </>}
      </div>
    </div>
    {showSettings && settings && <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setShowSettings(false)}>
      <div role="dialog" aria-modal="true" aria-label="Outreach settings" className="h-full w-full max-w-lg overflow-y-auto bg-background p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between"><h3 className="text-xl font-semibold">Outreach settings</h3><Button variant="ghost" size="icon" aria-label="Close settings" onClick={() => setShowSettings(false)}><X className="h-4 w-4" /></Button></div>
        <div className="space-y-5">
          <label className="block space-y-2 text-sm"><span>Amazon SES sender</span><select className="w-full rounded-md border bg-background p-2" value={settings.providerId || data?.providers[0]?.id || ''} onChange={e => setSettings({ ...settings, providerId: e.target.value })}><option value="">Choose a configured SES provider</option>{data?.providers.map(p => <option key={p.id} value={p.id}>{p.name} · {p.fromEmail}</option>)}</select></label>
          <label className="block space-y-2 text-sm"><span>SES configuration set (optional)</span><Input placeholder="outreach" value={settings.configurationSet || ''} onChange={e => setSettings({ ...settings, configurationSet: e.target.value })} /></label>
          <label className="block space-y-2 text-sm"><span>Sender postal address (optional)</span><Input placeholder="Fieseros Platform" value={settings.postalAddress} onChange={e => setSettings({ ...settings, postalAddress: e.target.value })} /></label>
          <label className="block space-y-2 text-sm"><span>Maximum emails per rolling 24 hours</span><Input type="number" min={1} max={500} value={settings.dailyLimit} onChange={e => setSettings({ ...settings, dailyLimit: Number(e.target.value) })} /></label>
          <label className="block space-y-2 text-sm"><span>Automatically select this industry</span><Input placeholder="All industries" value={settings.industry} onChange={e => setSettings({ ...settings, industry: e.target.value })} /></label>
          <label className="block space-y-2 text-sm"><span>What you offer — verified facts for the writer</span><textarea className="min-h-28 w-full rounded-md border bg-background p-3" value={settings.pitch} onChange={e => setSettings({ ...settings, pitch: e.target.value })} maxLength={1500} /></label>
          <div className="rounded-lg bg-muted p-4 text-sm"><p>Emails are spaced 1–3 minutes apart, around the clock. Internal background daemon processes scheduled outreach automatically.</p><p className="mt-2 text-xs text-muted-foreground">Active SES Provider: {data?.providers[0] ? `${data.providers[0].name} (${data.providers[0].fromEmail})` : 'None'}. Last worker check: {dateLabel(data?.state.lastRunAt)}.</p></div>
          <div className="flex gap-3"><Button variant="outline" disabled={busy} onClick={() => configure('save')}>Save settings</Button><Button disabled={busy || (!settings.providerId && !data?.providers?.length)} onClick={() => configure('start')}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Start automatic outreach</Button></div>
        </div>
      </div>
    </div>}
  </section>;
}
