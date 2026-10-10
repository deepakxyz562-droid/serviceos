'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarDays, MessageSquare, FileText, Users, RefreshCw, QrCode, Bot, Workflow } from 'lucide-react';
import { useLeads } from '@/hooks/use-crm-data';
import type { Lead } from '@/features/leads/types';
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
  const navigate = (view: ViewType) => setView(view);
  const leads = useLeads({ page: 1, limit: 5 });
  const recentLeads: Lead[] = leads.data?.leads || [];
  const addLead = () => { useAppStore.getState().setPendingCreate('lead'); navigate('leads'); };
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
  return <div className="bgos-page">
    <header className="bgos-page-heading">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">BGOS · Growth workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{workspace.data?.name || 'Your business'}, moving forward.</h1><p className="mt-2 text-sm text-muted-foreground">Conversations, relationships and the next opportunity. All in one place.</p></div>
      <Button onClick={addLead}><Users className="mr-2 size-4" />Add lead</Button>
    </header>
    <section className="bgos-hero"><div><span className="bgos-hero-label">YOUR BUSINESS, CONNECTED</span><h2>Make your next customer connection count.</h2><p>Bring your team, conversations and follow-ups together in one growth workspace.</p><Button onClick={() => navigate('agentStudio')}>Open AI studio <ArrowUpRight className="ml-2 size-4" /></Button></div><div className="bgos-hero-art" aria-hidden="true"><Bot size={65} /></div></section>
    <nav className="bgos-quick-actions" aria-label="Quick actions"><button onClick={addLead}><Users size={18} />Add a lead</button><button onClick={() => navigate('socialMedia')}><FileText size={18} />Create a post</button><button onClick={() => navigate('reviews')}><MessageSquare size={18} />Manage reviews</button><button onClick={() => navigate('scheduling')}><CalendarDays size={18} />View appointments</button></nav>
    {(workspace.isError || inbox.isError || leads.isError) && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><span>Some workspace data is unavailable. Your saved records are unchanged.</span><Button variant="outline" onClick={() => { workspace.refetch(); inbox.refetch(); leads.refetch(); }}><RefreshCw className="mr-2 size-4" />Retry</Button></div>}
    <section className="bgos-dashboard-stats" aria-label="Workspace summary">
      <Summary label="Active leads" value={leads.data?.pagination ? String(leads.data.pagination.total) : '—'} description="All active leads in your workspace" />
      <Summary label="Unread messages" value={inbox.data ? String(inbox.data.reduce((sum, c) => sum + c.unreadCount, 0)) : '—'} description="Across the latest 50 conversations" />
      <Summary label="Human takeover" value={inbox.data ? String(inbox.data.filter(c => c.aiPaused).length) : '—'} description="Conversations being handled by your team" />
      <Summary label="Digital business card" value={workspace.data ? workspace.data.links.profile ? 'Published' : 'Not published' : '—'} description="Your public profile and shareable identity" />
    </section>
    <section className="bgos-panel"><div className="flex items-center justify-between"><h2>Recent leads</h2><Button variant="ghost" onClick={() => navigate('leads')}>View pipeline <ArrowUpRight className="ml-2 size-4" /></Button></div>{leads.isPending ? <p role="status">Loading leads…</p> : leads.isError ? <p>Lead data is unavailable. Use Retry above.</p> : recentLeads.length ? recentLeads.map(lead => <button key={lead.id} className="bgos-panel-row" onClick={() => navigate('leads')}><span><strong>{lead.name}</strong><small>{lead.email || lead.phone || 'No contact details'}</small></span><span className="rounded bg-accent px-2 py-1 text-xs text-accent-foreground">{lead.status.replaceAll('_', ' ')}</span></button>) : <p>Add your first lead to start tracking customer relationships.</p>}</section>
    <section><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight">Your growth workspace</h2><span className="text-xs text-muted-foreground">Built around your next action</span></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(({ title, description, view, icon: Icon }) => <button key={view} onClick={() => navigate(view)} className="group rounded-2xl border bg-card p-6 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="mb-6 flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="size-5" /></span><ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" /></div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></button>)}</div></section>
    <section className="bgos-panel"><h2 className="font-semibold">Recent conversations</h2><div className="mt-4 divide-y">{inbox.isPending ? <p role="status" className="py-5 text-sm text-muted-foreground">Loading conversations…</p> : inbox.data?.length ? inbox.data.slice(0, 5).map(c => <button key={c.id} onClick={() => navigate('omnichannel')} className="flex w-full items-center justify-between gap-4 py-4 text-left"><span className="min-w-0"><span className="block text-sm font-medium">{c.customerName}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{c.lastMessage || 'No message yet'}</span></span><span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs">{c.aiPaused ? 'With team' : c.channel}</span></button>) : inbox.isError ? <p className="py-5 text-sm text-muted-foreground">Conversations are unavailable. Use Retry above.</p> : <p className="py-5 text-sm text-muted-foreground">New customer conversations will appear here when they arrive.</p>}</div></section>
  </div>;
}
function Summary({ label, value, description }: { label: string; value: string; description: string }) {
  return <div className="bgos-stat"><p className="text-sm text-muted-foreground">{label}</p><strong>{value}</strong><p className="mt-2 text-xs text-muted-foreground">{description}</p></div>;
}
