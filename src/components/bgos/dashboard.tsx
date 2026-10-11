'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  MessageSquare,
  PhoneCall,
  CalendarCheck,
  Sparkles,
  FileInput,
  Star,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Calendar,
  ChevronDown,
  Bot,
  UserPlus,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { useLeads } from '@/hooks/use-crm-data';
import type { Lead } from '@/features/leads/types';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ViewType } from '@/types/workflow';
import type { BgosWorkspace, BgosConversation } from '../../../shared/bgos-contracts';

async function read<T>(url: string): Promise<T> {
  const response = await authFetch(url);
  if (!response.ok) throw new Error('Failed to load workspace data');
  return response.json();
}

export function BgosDashboard() {
  const { auth, setCurrentView, setAiDrawerOpen, setPendingCreate } = useAppStore();
  const [activeMetric, setActiveMetric] = useState<'views' | 'calls' | 'leads' | 'revenue'>('leads');

  const leads = useLeads({ page: 1, limit: 5 });
  const recentLeads: Lead[] = leads.data?.leads || [];

  const workspace = useQuery({
    queryKey: ['bgos', 'workspace'],
    queryFn: () => read<BgosWorkspace>('/api/bgos/workspace'),
  });

  const inbox = useQuery({
    queryKey: ['bgos', 'inbox'],
    queryFn: () => read<BgosConversation[]>('/api/omnichannel/conversations'),
    refetchInterval: 15000,
  });

  const userName = auth.user?.name?.split(' ')[0] || 'Deepak';
  const businessName = workspace.data?.name || auth.tenant?.name || 'Your Business';
  const locationName = auth.tenant?.city || 'Delhi';

  const navigate = (view: ViewType) => setCurrentView(view);
  const handleAddLead = () => {
    setPendingCreate('lead');
    navigate('leads');
  };

  // 6 Quick Action items from Screen 1
  const quickActions = [
    { label: 'AI Post', icon: Sparkles, color: 'text-purple-600 bg-purple-500/10', action: () => navigate('socialMedia') },
    { label: 'Add Lead', icon: UserPlus, color: 'text-teal-600 bg-teal-500/10', action: handleAddLead },
    { label: 'Business Phone', icon: PhoneCall, color: 'text-blue-600 bg-blue-500/10', action: () => navigate('aiReceptionist') },
    { label: 'Create Form', icon: FileInput, color: 'text-indigo-600 bg-indigo-500/10', action: () => navigate('formBuilder') },
    { label: 'Book Appt', icon: CalendarCheck, color: 'text-amber-600 bg-amber-500/10', action: () => navigate('scheduling') },
    { label: 'Ask Review', icon: Star, color: 'text-emerald-600 bg-emerald-500/10', action: () => navigate('reviews') },
  ];

  return (
    <div className="bgos-page">
      {/* ── Top Header Greeting & Time Filter ── */}
      <header className="bgos-dashboard-header">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-xs">
            <span className="text-base font-bold">{userName.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Good morning, {userName}!
            </h1>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {businessName} · {locationName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/50"
          >
            <Calendar size={14} className="text-muted-foreground" />
            <span>Last 30 Days</span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* ── 4 Top KPI Cards with Sparkline Trends ── */}
      <section className="bgos-kpi-grid" aria-label="Key performance indicators">
        {/* Card 1: New Leads */}
        <div className="bgos-kpi-card group cursor-pointer" onClick={() => navigate('leads')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">New Leads</p>
              <strong className="mt-1.5 block text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {leads.data?.pagination?.total ?? '24'}
              </strong>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="bgos-trend-pill">
              <TrendingUp size={11} /> 12%
            </span>
            <span className="text-[11px] text-muted-foreground">vs last month</span>
          </div>
        </div>

        {/* Card 2: Messages */}
        <div className="bgos-kpi-card group cursor-pointer" onClick={() => navigate('omnichannel')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Messages</p>
              <strong className="mt-1.5 block text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {inbox.data?.reduce((s, c) => s + (c.unreadCount || 1), 0) || '126'}
              </strong>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="bgos-trend-pill">
              <TrendingUp size={11} /> 16%
            </span>
            <span className="text-[11px] text-muted-foreground">vs last month</span>
          </div>
        </div>

        {/* Card 3: Calls */}
        <div className="bgos-kpi-card group cursor-pointer" onClick={() => navigate('aiReceptionist')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Calls</p>
              <strong className="mt-1.5 block text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                48
              </strong>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <PhoneCall size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="bgos-trend-pill">
              <TrendingUp size={11} /> 8%
            </span>
            <span className="text-[11px] text-muted-foreground">AI receptionist active</span>
          </div>
        </div>

        {/* Card 4: Appointments */}
        <div className="bgos-kpi-card group cursor-pointer" onClick={() => navigate('scheduling')}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Appointments</p>
              <strong className="mt-1.5 block text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                18
              </strong>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CalendarCheck size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="bgos-trend-pill">
              <TrendingUp size={11} /> 22%
            </span>
            <span className="text-[11px] text-muted-foreground">booked automatically</span>
          </div>
        </div>
      </section>

      {/* ── Main Dashboard Body (Chart + AI Assistant Card) ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left 2 Cols: Business Growth Chart */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Business Growth</h2>
              <p className="text-xs text-muted-foreground">Performance across your channels this month</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {(['views', 'calls', 'leads', 'revenue'] as const).map((metric) => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => setActiveMetric(metric)}
                  className={`rounded-lg px-2.5 py-1 capitalize font-medium transition-colors ${
                    activeMetric === metric
                      ? 'bg-teal-500/15 text-teal-800 dark:text-teal-300 font-bold'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  ● {metric}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Smooth Growth Curve */}
          <div className="relative mt-5 h-56 w-full">
            <svg className="size-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00BFAE" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#007F73" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,110 C 70,120 120,70 180,85 C 240,100 290,40 360,50 C 420,60 460,20 500,25 L 500,150 L 0,150 Z"
                fill="url(#growthGrad)"
              />
              <path
                d="M 0,110 C 70,120 120,70 180,85 C 240,100 290,40 360,50 C 420,60 460,20 500,25"
                fill="none"
                stroke="#007F73"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              {/* Data points */}
              <circle cx="180" cy="85" r="4.5" fill="#007F73" className="stroke-2 stroke-white" />
              <circle cx="360" cy="50" r="4.5" fill="#007F73" className="stroke-2 stroke-white" />
              <circle cx="500" cy="25" r="5" fill="#00BFAE" className="stroke-2 stroke-white" />
            </svg>
            <div className="mt-2 flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>Apr 01</span>
              <span>Apr 08</span>
              <span>Apr 15</span>
              <span>Apr 22</span>
              <span>Apr 30</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Customer Details & AI Assistant Card */}
        <div className="bgos-ai-card">
          <div className="flex items-start justify-between">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
              <Bot size={28} className="text-teal-300" />
            </div>
            <Badge className="border-teal-400/30 bg-teal-400/20 text-teal-200">24/7 Live</Badge>
          </div>

          <div className="my-5">
            <h3 className="text-lg font-bold">Business AI Assistant</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-indigo-100/80">
              Handle customer chats faster, generate high-converting marketing copy, and capture qualified leads automatically.
            </p>
            <div className="mt-3.5 space-y-1.5 text-xs text-indigo-200/90">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-teal-400" /> Answers inquiries instantly
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-teal-400" /> Auto-books calendar appointments
              </div>
            </div>
          </div>

          <Button
            onClick={() => setAiDrawerOpen(true)}
            className="w-full rounded-xl bg-white text-indigo-950 font-bold hover:bg-white/90 shadow-md"
          >
            <Sparkles size={14} className="mr-2 text-indigo-600" /> Chat with AI
          </Button>
        </div>
      </div>

      {/* ── 6 Quick Actions Row ── */}
      <section aria-label="Quick Actions">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent Activity &amp; Shortcuts</h2>
        </div>
        <div className="bgos-quick-actions-bar">
          {quickActions.map(({ label, icon: Icon, color, action }) => (
            <button key={label} type="button" onClick={action} className="bgos-action-pill group">
              <div className={`bgos-action-icon ${color}`}>
                <Icon size={17} />
              </div>
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Recent Leads & Conversations Split ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Leads */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <h3 className="text-sm font-bold text-foreground">Recent Leads</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('leads')} className="text-xs">
              View All <ArrowUpRight size={13} className="ml-1" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => navigate('leads')}
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/40 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-700 text-xs font-bold">
                      {lead.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{lead.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{lead.phone || lead.email || 'WhatsApp'}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {lead.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">No leads captured yet. Create a form to get started!</p>
            )}
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <h3 className="text-sm font-bold text-foreground">Recent Conversations</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('omnichannel')} className="text-xs">
              Open Inbox <ArrowUpRight size={13} className="ml-1" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {inbox.data && inbox.data.length > 0 ? (
              inbox.data.slice(0, 5).map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => navigate('omnichannel')}
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/40 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-700 text-xs font-bold">
                      {conv.customerName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{conv.customerName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{conv.lastMessage || 'New inquiry'}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {conv.channel}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">Customer inquiries will appear here automatically.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
