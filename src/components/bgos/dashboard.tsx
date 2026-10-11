'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, Sparkles, CalendarCheck, PhoneCall, FileInput, Star, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useLeads } from '@/hooks/use-crm-data';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import type { ViewType } from '@/types/workflow';
import type { BgosWorkspace, BgosConversation } from '../../../shared/bgos-contracts';

async function read<T>(url: string): Promise<T> {
  const response = await authFetch(url);
  if (!response.ok) throw new Error('Workspace data could not be loaded.');
  return response.json();
}

export function BgosDashboard() {
  const { auth, setCurrentView: navigate, setAiDrawerOpen, setPendingCreate } = useAppStore();
  const leads = useLeads({ page: 1, limit: 5 });
  const workspace = useQuery({ queryKey: ['bgos', 'workspace'], queryFn: () => read<BgosWorkspace>('/api/bgos/workspace') });
  const inbox = useQuery({ queryKey: ['bgos', 'inbox'], queryFn: () => read<BgosConversation[]>('/api/omnichannel/conversations'), refetchInterval: 15000 });
  const conversations = inbox.data ?? [];
  const channels = conversations.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.channel]: (counts[item.channel] ?? 0) + 1 }), {});
  const quickActions = [
    { label: 'Create post', icon: Sparkles, view: 'socialMedia' },
    { label: 'Add lead', icon: Users, view: 'leads' },
    { label: 'Business phone', icon: PhoneCall, view: 'aiReceptionist' },
    { label: 'Create form', icon: FileInput, view: 'formBuilder' },
    { label: 'Appointments', icon: CalendarCheck, view: 'scheduling' },
    { label: 'Reviews', icon: Star, view: 'reviews' },
  ] as const;
  const metrics: { label: string; value: string | number; detail: string; view: ViewType }[] = [
    { label: 'Leads', value: leads.isError ? 'Unavailable' : leads.data?.pagination?.total ?? '—', detail: 'Total in your pipeline', view: 'leads' },
    { label: 'Unread messages', value: inbox.data ? conversations.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0) : '—', detail: 'Within the latest 50 conversations', view: 'omnichannel' },
    { label: 'Recent conversations', value: inbox.data ? conversations.length : '—', detail: 'Latest inbox activity, up to 50', view: 'omnichannel' },
    { label: 'Current plan', value: workspace.data?.plan.code ?? '—', detail: workspace.data?.plan.status ?? 'Loading workspace', view: 'billing' },
  ];
  return <div className="bgos-page space-y-6">
    <header className="bgos-dashboard-header">
      <div><p className="text-sm text-muted-foreground">{workspace.data?.name || auth.tenant?.name || 'Your workspace'}</p><h1 className="text-2xl font-semibold tracking-tight">Welcome{auth.user?.name ? `, ${auth.user.name.split(' ')[0]}` : ''}</h1><p className="mt-1 text-sm text-muted-foreground">Your conversations, leads and next actions.</p></div>
      <Button variant="outline" onClick={() => { void leads.refetch(); void inbox.refetch(); void workspace.refetch(); }}><RefreshCw className="mr-2 size-4" />Refresh</Button>
    </header>
    {(leads.isError || inbox.isError || workspace.isError) && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">Some data could not be loaded. Refresh to retry. Available sections remain usable.</p>}
    <section className="bgos-kpi-grid" aria-label="Workspace metrics">{metrics.map(metric => <button key={metric.label} onClick={() => navigate(metric.view)} className="bgos-kpi-card text-left"><span className="text-xs font-medium text-muted-foreground">{metric.label}</span><strong className="my-2 block text-2xl font-semibold capitalize">{metric.value}</strong><span className="text-xs text-muted-foreground">{metric.detail}</span></button>)}</section>
    <section aria-label="Quick actions" className="bgos-quick-actions-bar">{quickActions.map(({ label, icon: Icon, view }) => <button key={view} className="bgos-action-pill" onClick={() => { if (view === 'leads') setPendingCreate('lead'); navigate(view); }}><Icon className="size-5 text-primary" />{label}</button>)}</section>
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="rounded-2xl border bg-card p-5 lg:col-span-2"><h2 className="font-semibold">Conversation channels</h2><p className="mt-1 text-xs text-muted-foreground">Distribution of the latest loaded conversations.</p><div className="mt-5 space-y-4">{inbox.isPending ? <p role="status">Loading conversations…</p> : inbox.isError ? <p>Channel data unavailable.</p> : !conversations.length ? <p className="text-sm text-muted-foreground">No conversations yet. Connect a channel to get started.</p> : Object.entries(channels).map(([channel, count]) => <div key={channel}><div className="mb-1 flex justify-between text-sm"><span className="capitalize">{channel}</span><span>{count}</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${count / conversations.length * 100}%` }} /></div></div>)}</div></section>
      <section className="rounded-2xl bg-primary p-6 text-primary-foreground"><Sparkles className="mb-4 size-6" /><h2 className="text-lg font-semibold">Your AI workspace</h2><p className="my-3 text-sm">Ask your copilot for help, or configure your assistant’s knowledge and connected channels.</p><Button variant="secondary" onClick={() => setAiDrawerOpen(true)}>Open AI Copilot</Button><Button variant="secondary" className="mt-2 ml-2" onClick={() => navigate('agentStudio')}>AI Studio</Button></section>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border bg-card p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent leads</h2><Button variant="ghost" onClick={() => navigate('leads')}>View all<ArrowUpRight className="ml-1 size-4" /></Button></div>{leads.isPending ? <p role="status">Loading leads…</p> : leads.isError ? <p role="alert">Leads unavailable.</p> : !leads.data?.leads.length ? <p className="text-sm text-muted-foreground">No leads yet. Add your first lead above.</p> : leads.data.leads.map(lead => <button key={lead.id} onClick={() => navigate('leads')} className="flex w-full items-center justify-between gap-3 border-t py-3 text-left text-sm hover:bg-muted"><span className="truncate">{lead.name}</span><span className="shrink-0 capitalize text-muted-foreground">{lead.status.replaceAll('_', ' ')}</span></button>)}</section>
      <section className="rounded-2xl border bg-card p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent conversations</h2><Button variant="ghost" onClick={() => navigate('omnichannel')}>Open inbox<MessageSquare className="ml-1 size-4" /></Button></div>{inbox.isPending ? <p role="status">Loading inbox…</p> : inbox.isError ? <p role="alert">Inbox unavailable.</p> : !conversations.length ? <p className="text-sm text-muted-foreground">New customer messages will appear here.</p> : conversations.slice(0, 5).map(item => <button key={item.id} onClick={() => navigate('omnichannel')} className="flex w-full items-center justify-between gap-3 border-t py-3 text-left text-sm hover:bg-muted"><span className="min-w-0"><strong className="block truncate font-medium">{item.customerName || 'Customer'}</strong><span className="block truncate text-xs text-muted-foreground">{item.lastMessage || 'No message preview'}</span></span><span className="shrink-0 text-xs capitalize">{item.channel}</span></button>)}</section>
    </div>
  </div>;
}
