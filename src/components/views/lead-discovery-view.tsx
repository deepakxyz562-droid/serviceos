'use client';
import { useState } from 'react';
import { Search, Users, Sparkles, ArrowRight, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';

type Prospect = {
  id: string;
  name: string;
  company: string;
  title?: string;
  email: string | null;
  provider: string;
  verification: string;
};

async function request(url: string, body: object) {
  const res = await authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed. Please retry.');
  return data;
}

export function LeadDiscoveryView() {
  const [provider, setProvider] = useState('directory');
  const [query, setQuery] = useState('');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [context, setContext] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searched, setSearched] = useState(false);
  const [contactId, setContactId] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    const data = await request('/api/bgos/discovery', { provider, query });
    setProspects(data.prospects || []);
    setSelected(null);
    setContactId(null);
    setSearched(true);
  }

  async function saveContact() {
    if (!selected) return;
    const data = await request('/api/contacts', {
      name: selected.name,
      email: selected.email,
      company: selected.company,
      source: `bgos_${selected.provider}`,
      customFieldsJson: JSON.stringify({
        provider: selected.provider,
        providerId: selected.id,
        verification: selected.verification,
      }),
    });
    setContactId(data.id);
    setNotice('Contact saved to your pipeline. Review your message before requesting approval.');
  }

  async function draft() {
    if (!selected) return;
    const data = await request('/api/bgos/outreach/draft', {
      name: selected.name,
      company: selected.company,
      context,
    });
    setSubject(data.subject);
    setMessage(data.text);
  }

  async function queue() {
    if (!selected || !contactId) return;
    await request('/api/bgos/outreach', {
      name: `Outreach · ${selected.company || selected.name}`,
      subject,
      text: message,
      contactIds: [contactId],
    });
    setNotice('Saved for review. Your team can approve this batch from BGOS mobile. No email has been sent.');
  }

  const visible = prospects.filter((p) =>
    `${p.name} ${p.company} ${p.email || ''} ${p.title || ''}`.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Acquire / Intelligence
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Find the right conversation.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Research prospects, prepare personalized outreach messages, and queue for team approval.
            </p>
          </div>
          <Button variant="outline" onClick={() => useAppStore.getState().setCurrentView('contacts')}>
            <Users className="mr-2 size-4" />
            Saved contacts
          </Button>
        </div>
      </header>

      {error && (
        <div role="alert" className="m-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="m-5 rounded-xl border bg-muted/50 p-4 text-sm">
          {notice}
        </div>
      )}

      <div className="grid flex-1 xl:grid-cols-[280px_360px_minmax(0,1fr)]">
        {/* Column 1: DISCOVER */}
        <aside className="space-y-5 border-b p-5 xl:border-b-0 xl:border-r">
          <div>
            <p className="text-xs font-semibold text-primary">01 / DISCOVER</p>
            <h2 className="mt-2 font-semibold">Your next audience</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Data source</Label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="directory">Verified B2B Directory (Instant · No Key)</option>
              <option value="apollo">Apollo · People search</option>
              <option value="hunter">Hunter · Domain search</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discovery-query">
              {provider === 'hunter'
                ? 'Company domain'
                : provider === 'directory'
                ? 'Industry, role or company'
                : 'Keywords'}
            </Label>
            <Input
              id="discovery-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                provider === 'hunter'
                  ? 'e.g. stripe.com'
                  : provider === 'directory'
                  ? 'e.g. Technology, Retail, Operations, Salon…'
                  : 'Operations, manufacturing, saas…'
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy && query.length >= 2) run(search);
              }}
            />
          </div>

          <Button className="w-full" disabled={busy || query.length < 2} onClick={() => run(search)}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Search className="mr-2 size-4" />}
            Search prospects
          </Button>

          <div className="rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>Multi-Source Intelligence</span>
            </div>
            <p>
              <strong>Verified Directory:</strong> Works instantly with zero setup or API keys.
            </p>
            <p>
              <strong>Apollo & Hunter:</strong> Search global live business databases using credentials managed centrally in SuperAdmin or environment variables.
            </p>
          </div>
        </aside>

        {/* Column 2: QUALIFY */}
        <section aria-label="Prospect results" className="border-b p-5 xl:border-b-0 xl:border-r">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">02 / QUALIFY</p>
            <span className="text-xs text-muted-foreground">{visible.length} loaded</span>
          </div>

          <Input
            aria-label="Filter loaded results"
            placeholder="Filter by name, company, or role"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          <div className="mt-4 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {!visible.length ? (
              <div className="rounded-xl border border-dashed p-6 text-sm leading-6 text-muted-foreground text-center">
                {searched
                  ? 'No matching prospects found. Try broader keywords or another data source.'
                  : 'Choose a data source and start a search. Your prospects will appear here.'}
              </div>
            ) : (
              visible.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelected(p);
                    setContactId(null);
                    setSubject('');
                    setMessage('');
                    setNotice('');
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                    selected?.id === p.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.title || 'Contact'} · {p.company}
                  </p>
                  <p className="mt-2.5 break-all text-xs font-mono text-muted-foreground">
                    {p.email || 'Email via pipeline save'}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                    <span>{p.provider}</span>
                    <span>·</span>
                    <span className="capitalize">{p.verification.replaceAll('_', ' ')}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Column 3: PREPARE & REVIEW */}
        <section className="space-y-5 p-5 sm:p-8">
          <p className="text-xs font-semibold text-primary">03 / PREPARE & REVIEW</p>
          {!selected ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
              <Mail className="mb-4 size-8 text-muted-foreground" />
              <h2 className="font-semibold">A relevant message starts with context.</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Select a prospect from the qualified list to save their profile and prepare an outreach draft.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selected.title ? `${selected.title} at ${selected.company}` : selected.company}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {selected.email || 'Add email in contacts before outbound dispatch'}
                  </p>
                </div>
                <Button variant="outline" disabled={busy || !!contactId} onClick={() => run(saveContact)}>
                  {contactId ? 'Saved to contacts ✓' : 'Save contact'}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer-context">Your offer and relevant context</Label>
                <Textarea
                  id="offer-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="What service or product are you offering, and why is it valuable for their business?"
                  maxLength={2000}
                />
              </div>

              <Button variant="outline" disabled={busy || context.trim().length < 10} onClick={() => run(draft)}>
                <Sparkles className="mr-2 size-4" />
                Draft with AI
              </Button>

              <div className="space-y-2">
                <Label htmlFor="outreach-subject">Subject</Label>
                <Input
                  id="outreach-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder="Subject line for email outreach"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="outreach-message">Message</Label>
                <Textarea
                  id="outreach-message"
                  rows={10}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={10000}
                  placeholder="Personalized message body..."
                />
              </div>

              <Button
                disabled={busy || !selected.email || !contactId || !subject.trim() || !message.trim()}
                onClick={() => run(queue)}
              >
                Save for approval
                <ArrowRight className="ml-2 size-4" />
              </Button>

              <p className="text-xs text-muted-foreground">
                Approval and delivery are strictly separated. Once queued, you can review claims and recipients before final sending.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
