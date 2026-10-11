'use client';

/**
 * OverviewTab
 * ===========
 *
 * Modern overview dashboard for the AI Receptionist workspace.
 *
 * Shows:
 *   - Live status hero card with connected phone line, active hours, and quick test
 *   - Standardized 4-metric KPI grid (Minutes, Concurrency, Duration, Plan)
 *   - Minutes usage gauge with call estimates
 *   - Contextual Action Hub
 *   - Rich Recent Calls feed with caller avatars, outcome badges, and instant transcripts
 */

import { useState } from 'react';
import { useReceptionistCalls } from './use-receptionist-queries';
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  Clock,
  TrendingUp,
  Zap,
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  UserPlus,
  PhoneForwarded,
  Info,
  PhoneOutgoing as TestCallIcon,
  Sliders,
  Activity,
  Sparkles,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { useAiReceptionistData } from './use-ai-receptionist-data';
import type { TabId } from './ai-receptionist-workspace';
import { cn } from '@/lib/utils';

type Data = ReturnType<typeof useAiReceptionistData>;

interface OverviewTabProps {
  data: Data;
  onNavigate: (tab: TabId) => void;
  onTestCall: () => void;
  onBuyNumber?: () => void;
}

export function OverviewTab({ data, onNavigate, onTestCall }: OverviewTabProps) {
  const { subscription, usage } = data;

  return (
    <div className="space-y-6">
      {/* ── KPI Metric Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          title="AI Minutes"
          value={usage ? `${usage.usedMinutes} / ${usage.includedMinutes}m` : '0 / 50m'}
          subtext={
            usage
              ? `${usage.remainingMinutes}m left (~${Math.max(0, Math.floor(usage.remainingMinutes / 2))} calls)`
              : '50m included'
          }
          color="emerald"
        />
        <KpiCard
          icon={PhoneCall}
          title="Concurrent Lines"
          value={usage && usage.maxConcurrentCalls != null ? `${usage.activeCalls ?? 0} / ${usage.maxConcurrentCalls}` : '0 / 1'}
          subtext="Simultaneous call capacity"
          color="blue"
        />
        <KpiCard
          icon={Clock}
          title="Max Duration"
          value={usage && usage.maxCallDurationSeconds ? `${Math.floor(usage.maxCallDurationSeconds / 60)} min` : '10 min'}
          subtext="Per call auto-limit"
          color="amber"
        />
        <KpiCard
          icon={Zap}
          title="Active Plan"
          value={subscription?.addonPlan?.name || 'Starter Plan'}
          subtext={subscription?.addonPlan ? `$${subscription.addonPlan.price}/month` : '$29/month'}
          color="violet"
        />
      </div>

      {/* ── Usage Progress Gauge ── */}
      {usage && usage.hasEntitlement && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600" />
                Monthly AI Call Minutes Gauge
              </CardTitle>
              <CardDescription className="text-xs">
                Ledger-backed real-time usage for this billing cycle
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('usage')}
              className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1"
            >
              Usage Details <ArrowRight className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="text-muted-foreground font-medium">
                  {usage.usedMinutes} of {usage.includedMinutes} minutes consumed
                </span>
                <span className="font-bold text-foreground">{usage.usedPercent}%</span>
              </div>
              <Progress
                value={usage.usedPercent}
                className={cn(
                  'h-2.5 rounded-full',
                  usage.usedPercent >= 90 && '[&>div]:bg-red-500',
                  usage.usedPercent >= 75 && usage.usedPercent < 90 && '[&>div]:bg-amber-500',
                )}
              />
            </div>

            {usage.remainingMinutes <= 5 && usage.remainingMinutes > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 text-xs">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-300">
                    Low minutes balance ({usage.remainingMinutes} minutes left)
                  </p>
                  <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                    Your receptionist will route to voicemail once minutes run out. Upgrade your plan to ensure uninterrupted answering.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Stitch Kinetic Workstation: AI Receptionist Status & Visual IVR Routing ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sub-section: AI Receptionist Status Card (6 cols) */}
        <Card className="lg:col-span-6 border-border/60 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Sparkles className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">AI Receptionist Status</CardTitle>
                <CardDescription className="text-xs">Live conversational voice engine</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold text-[10px]">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('receptionist')}
                className="text-xs h-7 px-2"
              >
                Edit Voice
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Persona Hero */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
              <div className="relative size-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                <Bot className="size-6" />
                <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-foreground truncate">
                  {data.receptionist?.name || 'AI Phone Assistant'}
                </p>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                  Natural Conversational Voice • 24/7
                </p>
                <p className="text-xs text-muted-foreground italic truncate mt-0.5">
                  {data.receptionist?.greeting
                    ? `"${data.receptionist.greeting.slice(0, 75)}…"`
                    : '"Hi! Thanks for calling. How can I help you today?"'}
                </p>
              </div>
            </div>

            {/* Active Capabilities */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Active Telephony Capabilities
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">
                  <CheckCircle2 className="size-3 text-emerald-600" /> Answer FAQs
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">
                  <CheckCircle2 className="size-3 text-emerald-600" /> Book Appointments
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">
                  <CheckCircle2 className="size-3 text-emerald-600" /> Capture Leads
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">
                  <CheckCircle2 className="size-3 text-emerald-600" /> Provide Estimates
                </span>
                {data.receptionist?.handoffEnabled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                    <CheckCircle2 className="size-3 text-purple-600" /> Human Transfer
                  </span>
                )}
              </div>
            </div>

            {/* Performance Strip */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/30 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">Response Latency</p>
                <p className="font-bold text-xs text-foreground mt-0.5">
                  {data.receptionist?.responseDelaySeconds != null
                    ? `${data.receptionist.responseDelaySeconds}s`
                    : '0.8s'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Max Duration</p>
                <p className="font-bold text-xs text-foreground mt-0.5">
                  {usage?.maxCallDurationSeconds
                    ? `${Math.floor(usage.maxCallDurationSeconds / 60)}m`
                    : '10m'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Active Lines</p>
                <p className="font-bold text-xs text-foreground mt-0.5">
                  {data.connections?.length || 1} line{data.connections?.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sub-section: Call Routing & Visual IVR Flow (6 cols) */}
        <Card className="lg:col-span-6 border-border/60 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <PhoneCall className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Call Routing &amp; IVR Architecture</CardTitle>
                <CardDescription className="text-xs">Visual inbound call progression</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('phones')}
              className="text-xs h-7 px-2"
            >
              Configure Lines
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Visual Flow Tree */}
            <div className="rounded-xl bg-muted/30 p-3.5 border">
              <div className="flex items-center justify-between gap-2">
                {/* Node 1: Incoming */}
                <div className="flex flex-col items-center text-center w-20 shrink-0">
                  <div className="size-9 rounded-xl bg-card border flex items-center justify-center text-blue-600 shadow-2xs">
                    <Phone className="size-4" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground mt-1">Inbound Call</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[70px]">
                    {data.connections?.[0]?.phoneNumber?.number || 'Main line'}
                  </span>
                </div>

                {/* Connector */}
                <div className="flex-1 h-0.5 bg-border relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
                </div>

                {/* Node 2: AI Core */}
                <div className="flex flex-col items-center text-center w-24 shrink-0">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Bot className="size-5" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground mt-1">AI Receptionist</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Intent Parser</span>
                </div>

                {/* Connector */}
                <div className="flex-1 h-0.5 bg-border relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-purple-600" />
                </div>

                {/* Node 3: Branches */}
                <div className="flex flex-col gap-1 flex-1 min-w-[100px] text-[10px]">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                    <CheckCircle2 className="size-2.5" /> Book Slot
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold truncate">
                    <CheckCircle2 className="size-2.5" /> Create Lead
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold truncate">
                    <CheckCircle2 className="size-2.5" /> Human Transfer
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold truncate">
                    <CheckCircle2 className="size-2.5" /> Voicemail Drop
                  </div>
                </div>
              </div>
            </div>

            {/* Fallback routing note */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
              <span>
                Fallback Target:{' '}
                <strong className="text-foreground">
                  {data.receptionist?.handoffTransferTarget || 'Team Manager'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('phones')}
                className="text-primary hover:underline font-semibold"
              >
                Change
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Contextual Action Hub ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Management &amp; Controls
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ActionCard
            icon={Sliders}
            title="Voice & Greeting"
            description="Customize opening line, tone, and personality"
            onClick={() => onNavigate('receptionist')}
            accent="emerald"
          />
          <ActionCard
            icon={Phone}
            title="Numbers & Routing"
            description="Manage inbound line, forward target, and fallback"
            onClick={() => onNavigate('phones')}
            accent="blue"
          />
          <ActionCard
            icon={Activity}
            title="Call Transcripts"
            description="View recording summaries, leads, and bookings"
            onClick={() => onNavigate('calls')}
            accent="violet"
          />
          <ActionCard
            icon={TestCallIcon}
            title="Test Call Simulator"
            description="Call your phone to verify AI booking flow live"
            onClick={onTestCall}
            accent="amber"
          />
        </div>
      </div>

      {/* ── Recent Activity Feed ── */}
      <RecentCallsCard onNavigate={() => onNavigate('calls')} />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  title,
  value,
  subtext,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtext: string;
  color: 'emerald' | 'blue' | 'amber' | 'violet';
}) {
  const colorMap = {
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/40',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/40',
    violet: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-800/40',
  };

  return (
    <Card className="border-border/60 shadow-sm hover:border-border transition-all">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className={cn('p-1.5 rounded-lg border', colorMap[color])}>
            <Icon className="size-4" />
          </div>
        </div>
        <div>
          <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  accent: 'emerald' | 'blue' | 'amber' | 'violet';
}) {
  return (
    <button
      onClick={onClick}
      className="text-left w-full group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <Card className="h-full border-border/60 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center size-8 rounded-lg bg-muted group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40 transition-colors">
              <Icon className="size-4 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {title}
            </p>
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function RecentCallsCard({ onNavigate }: { onNavigate: () => void }) {
  const { data, isLoading: loading } = useReceptionistCalls(5);
  const calls = (data?.calls as Array<{
    id: string;
    callType: string;
    status: string;
    fromNumber: string | null;
    toNumber: string | null;
    customerPhone: string | null;
    durationSec: number;
    outcomeType: string | null;
    summary: string | null;
    startedAt: string | null;
    createdAt: string;
  }>) ?? [];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <PhoneCall className="size-4 text-emerald-600" />
            Recent Calls &amp; Inquiries
          </CardTitle>
          <CardDescription className="text-xs">
            Latest incoming customer conversations and automated bookings
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigate}
          className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1"
        >
          View All Calls <ArrowRight className="size-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex items-center justify-center size-10 rounded-full bg-muted/60 text-muted-foreground mb-2">
              <PhoneCall className="size-5 opacity-40" />
            </div>
            <p className="text-xs font-medium text-foreground">No customer calls recorded yet</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Incoming calls to your dedicated number will appear here with live transcripts
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {calls.map((call) => (
              <RecentCallRow key={call.id} call={call} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const OUTCOME_META: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  booked: {
    label: 'Job Booked',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    icon: CalendarCheck,
  },
  lead_created: {
    label: 'Lead Captured',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    icon: UserPlus,
  },
  transferred: {
    label: 'Transferred',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    icon: PhoneForwarded,
  },
  info_only: {
    label: 'Inquiry Answered',
    className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300',
    icon: Info,
  },
  missed: {
    label: 'Missed Call',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300',
    icon: PhoneMissed,
  },
  spam: {
    label: 'Spam Blocked',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300',
    icon: PhoneMissed,
  },
};

function RecentCallRow({
  call,
}: {
  call: {
    id: string;
    callType: string;
    status: string;
    fromNumber: string | null;
    toNumber: string | null;
    customerPhone: string | null;
    durationSec: number;
    outcomeType: string | null;
    summary: string | null;
    startedAt: string | null;
    createdAt: string;
  };
}) {
  const otherParty = call.callType === 'outbound' ? call.toNumber : call.fromNumber || call.customerPhone;
  const outcome = call.outcomeType ? OUTCOME_META[call.outcomeType] : null;
  const isFailed = call.status === 'failed';
  const OutcomeIcon = outcome?.icon || Info;

  return (
    <div className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40 px-2 rounded-lg transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200/50">
          <AvatarFallback className="text-xs font-semibold">
            {otherParty ? otherParty.slice(-2) : 'AI'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-foreground truncate">
              {otherParty || 'Unknown Caller'}
            </p>
            {call.callType === 'outbound' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
                Test Call
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate max-w-md">
            {call.summary || 'Call handled by AI Receptionist'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] font-mono text-muted-foreground">
          {call.durationSec > 0
            ? `${Math.floor(call.durationSec / 60)}m ${call.durationSec % 60}s`
            : '—'}
        </span>
        {outcome ? (
          <Badge variant="outline" className={cn('text-[10px] font-semibold gap-1 py-0.5', outcome.className)}>
            <OutcomeIcon className="size-3" />
            {outcome.label}
          </Badge>
        ) : isFailed ? (
          <Badge variant="outline" className="text-[10px] font-semibold gap-1 py-0.5 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300">
            <PhoneMissed className="size-3" />
            Failed
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

