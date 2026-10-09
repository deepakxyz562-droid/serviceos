'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarDays, MessageSquare, FileText, Users, RefreshCw, QrCode, Bot, Workflow } from 'lucide-react';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import type { ViewType } from '@/types/workflow';
import type { BgosWorkspace, BgosConversation } from '../../../shared/bgos-contracts';

async function read<T>(url: string): Promise<T> {
  const response = await authFetch(url);
  if (!response.ok) throw new Error('Your workspace could not be loaded. Please retry.');
  return response.json();
}

export function BgosDashboard() {
  const setView = useAppStore(s => s.setCurrentView);
  const navigate = (view: ViewType) => { setView(view); if (window.location.pathname === '/') window.location.assign(`/app?view=${view}`); };
  const workspace = useQuery({ queryKey: ['bgos', 'workspace'], queryFn: () => read<BgosWorkspace>('/api/bgos/workspace') });
  const inbox = useQuery({ queryKey: ['bgos', 'inbox'], queryFn: () => read<BgosConversation[]>('/api/omnichannel/conversations'), refetchInterval: 15000 });
  const cards: { title: string; description: string; view: ViewType; icon: typeof Users }[] = [
    { title: 'Capture your next lead', description: 'Build a form, publish it and keep every response in one place.', view: 'formBuilder', icon: FileText },
    { title: 'Make every conversation count', description: 'Work together with your team and take over when a customer needs you.', view: 'omnichannel', icon: MessageSquare },
    { title: 'Turn interest into a meeting', description: 'Manage meeting types, availability and connected calendars.', view: 'scheduling', icon: CalendarDays },
    { title: 'Keep your business close', description: 'Publish a digital card that customers can save and share.', view: 'creatorProfile', icon: QrCode },
    { title: 'Give your AI the right context', description: 'Manage knowledge, instructions and your customer-facing assistant.', view: 'agentStudio', icon: Bot },
    { title: 'Build a reliable follow-up', description: 'Connect triggers and actions in your automation workspace.', view: 'workflows', icon: Workflow },
  ];
  return <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">BGOS · Growth workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{workspace.data?.name || 'Your business'}, moving forward.</h1><p className="mt-2 text-sm text-muted-foreground">Conversations, relationships and the next opportunity. All in one place.</p></div>
      <Button onClick={() => navigate('contacts')}><Users className="mr-2 size-4" />Open contacts</Button>
    </header>
    {(workspace.isError || inbox.isError) && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><span>Some workspace data is unavailable. Your saved records are unchanged.</span><Button variant="outline" onClick={() => { workspace.refetch(); inbox.refetch(); }}><RefreshCw className="mr-2 size-4" />Retry</Button></div>}
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Workspace summary">
      <Summary label="Unread messages" value={inbox.data ? String(inbox.data.reduce((sum, c) => sum + c.unreadCount, 0)) : '—'} description="Across the latest 50 conversations" />
      <Summary label="Human takeover" value={inbox.data ? String(inbox.data.filter(c => c.aiPaused).length) : '—'} description="Conversations being handled by your team" />
      <Summary label="Digital business card" value={workspace.data ? workspace.data.links.profile ? 'Published' : 'Not published' : '—'} description="Your public profile and shareable identity" />
    </section>
    <section><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight">Your growth workspace</h2><span className="text-xs text-muted-foreground">Built around your next action</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(({ title, description, view, icon: Icon }) => <button key={view} onClick={() => navigate(view)} className="group rounded-2xl border bg-card p-6 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="mb-6 flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="size-5" /></span><ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" /></div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></button>)}</div></section>
    <section className="rounded-2xl border bg-card p-6"><h2 className="font-semibold">Recent conversations</h2><div className="mt-4 divide-y">{inbox.isPending ? <p role="status" className="py-5 text-sm text-muted-foreground">Loading conversations…</p> : inbox.data?.length ? inbox.data.slice(0, 5).map(c => <button key={c.id} onClick={() => navigate('omnichannel')} className="flex w-full items-center justify-between gap-4 py-4 text-left"><span className="min-w-0"><span className="block text-sm font-medium">{c.customerName}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{c.lastMessage || 'No message yet'}</span></span><span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs">{c.aiPaused ? 'With team' : c.channel}</span></button>) : <p className="py-5 text-sm text-muted-foreground">New customer conversations will appear here when they arrive.</p>}</div></section>
  </div>;
}
function Summary({ label, value, description }: { label: string; value: string; description: string }) {
  return <div className="rounded-2xl border bg-card p-6"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-muted-foreground">{description}</p></div>;
}
