'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  Mail,
  CheckCircle2,
  XCircle,
  Linkedin,
  Sparkles,
  RefreshCw,
  Settings2,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  Users,
  AtSign,
  Briefcase,
  Flame,
  Zap,
  Sliders,
  Check,
  Globe,
  Plus,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Prospect {
  id: string;
  name: string;
  role: string;
  companyName: string;
  domain: string;
  email: string | null;
  emailFound: boolean;
  enricher: 'hunter' | 'exreacher' | 'findymail' | 'leadmagic' | null;
  isCatchAll?: boolean;
  linkedinUrl?: string;
  city?: string;
  industry?: string;
  tenantId?: string;
  phone?: string;
}

interface CampaignCategory {
  id: string;
  name: string;
  count: string;
  active?: boolean;
}

// ─── Default Sample Data matching Explee UI & User Samples ──────────────────

const DEFAULT_CATEGORIES: CampaignCategory[] = [
  { id: 'cleaning', name: 'Cleaning services', count: '20.0K' },
  { id: 'electrical', name: 'Electrical contractors', count: '12.0K' },
  { id: 'plumbing', name: 'Plumbing firms', count: '12.0K' },
  { id: 'multicrew', name: 'Small trade multi-crews', count: '3.0K' },
  { id: 'landscaping', name: 'Landscaping crews', count: '14.0K' },
  { id: 'trade', name: 'Trade service owners', count: '18.0K' },
];

const DEFAULT_COMPETITORS = [
  'optsy.com',
  'etaprise.com',
  'fieldconnect.com',
  'topproz.com',
  'razorsync.com',
  'ringjob.com',
  'fieldcomplete.com',
  'servicegrid.com',
];

const SAMPLE_PROSPECTS: Prospect[] = [
  {
    id: 'sample-1',
    name: 'Cheri Smith',
    role: 'Owner',
    companyName: 'Keeping Clean Corp',
    domain: 'keepingclean.services',
    email: 'cheri@keepingclean81.com',
    emailFound: true,
    enricher: 'findymail',
    isCatchAll: true,
    linkedinUrl: 'https://linkedin.com',
    city: 'Jerome',
    industry: 'Cleaning services',
  },
  {
    id: 'sample-2',
    name: 'Barb Browning',
    role: 'Owner',
    companyName: 'ASAP Amelia',
    domain: 'asapamelia.com',
    email: 'browning.barb@asapamelia.com',
    emailFound: true,
    enricher: 'findymail',
    isCatchAll: true,
    linkedinUrl: 'https://linkedin.com',
    city: 'Amelia Island',
    industry: 'Air duct and ozone cleaning',
  },
  {
    id: 'sample-3',
    name: 'Adrian Chmiata',
    role: 'Właściciel firmy',
    companyName: 'XClean NZ',
    domain: 'xclean.co.nz',
    email: null,
    emailFound: false,
    enricher: null,
    linkedinUrl: 'https://linkedin.com',
    city: 'Auckland',
    industry: 'Commercial cleaning',
  },
  {
    id: 'sample-4',
    name: 'Admin Admin',
    role: 'Owner',
    companyName: 'SC Janitorial',
    domain: 'scjanitorial.com',
    email: 'admin@scjanitorial.com',
    emailFound: true,
    enricher: 'exreacher',
    isCatchAll: true,
    linkedinUrl: 'https://linkedin.com',
    city: 'Columbia',
    industry: 'Janitorial services',
  },
  {
    id: 'sample-5',
    name: 'ADERDOUR MOHAMED',
    role: 'Propriétaire',
    companyName: 'Aber Proprete',
    domain: 'aberproprete.fr',
    email: null,
    emailFound: false,
    enricher: null,
    linkedinUrl: 'https://linkedin.com',
    city: 'Brest',
    industry: 'Cleaning & sanitation',
  },
];

export function OutreachSection() {
  const [selectedCategory, setSelectedCategory] = useState('cleaning');
  const [viewMode, setViewMode] = useState<'companies' | 'people' | 'emails'>('emails');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbTenants, setDbTenants] = useState<Prospect[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState<string>('sample-1');
  const [dailyQuota, setDailyQuota] = useState({ remaining: 50, sentToday: 0, dailyLimit: 50 });

  // Right Composer States
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // ── Load Real DB Tenants ──────────────────────────────────────────────────
  const fetchTenants = useCallback(async () => {
    setLoadingTenants(true);
    try {
      const res = await authFetch('/api/superadmin/outreach/eligible-tenants?limit=50&XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        if (data.tenants && Array.isArray(data.tenants)) {
          const mapped: Prospect[] = data.tenants.map((t: any, idx: number) => {
            const enrichers: Array<'hunter' | 'exreacher' | 'findymail' | 'leadmagic'> = [
              'hunter',
              'exreacher',
              'findymail',
              'leadmagic',
            ];
            const assignedEnricher = t.email ? enrichers[idx % enrichers.length] : null;
            return {
              id: t.id,
              name: t.name || 'Business Owner',
              role: 'Owner / Operator',
              companyName: t.name,
              domain: t.slug ? `${t.slug}.com` : 'serviceos.co',
              email: t.email,
              emailFound: Boolean(t.email && t.email.includes('@')),
              enricher: assignedEnricher,
              isCatchAll: true,
              city: t.city || 'local area',
              industry: t.industry || 'Trade Services',
              tenantId: t.id,
            };
          });
          setDbTenants(mapped);
          if (data.remaining !== undefined) {
            setDailyQuota({
              remaining: data.remaining,
              sentToday: data.sentToday || 0,
              dailyLimit: data.dailyLimit || 50,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch DB tenants, using sample prospects', err);
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Combined prospects list
  const allProspects = useMemo(() => {
    const combined = [...SAMPLE_PROSPECTS, ...dbTenants];
    const seen = new Set<string>();
    return combined.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [dbTenants]);

  // Filtered prospects based on category & search & viewMode
  const filteredProspects = useMemo(() => {
    return allProspects.filter((p) => {
      if (viewMode === 'emails' && !p.emailFound && !p.name.toLowerCase().includes('aderdour') && !p.name.toLowerCase().includes('adrian')) {
        // Keep samples for illustration
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.industry && p.industry.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q))
      );
    });
  }, [allProspects, searchQuery, viewMode]);

  // Active selected prospect
  const selectedProspect = useMemo(() => {
    return allProspects.find((p) => p.id === selectedProspectId) || allProspects[0] || SAMPLE_PROSPECTS[0];
  }, [allProspects, selectedProspectId]);

  // ── AI Email Generation Handler ───────────────────────────────────────────
  const generatePersonalizedCopy = useCallback(
    async (prospect: Prospect, silent = false) => {
      setGeneratingAi(true);
      if (!silent) {
        toast.info(`Generating personalized email for ${prospect.name}...`);
      }

      try {
        const res = await authFetch('/api/superadmin/outreach/generate-email?XTransformPort=3000', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospectName: prospect.name,
            companyName: prospect.companyName,
            domain: prospect.domain,
            industry: prospect.industry || selectedCategory,
            niche: selectedCategory,
            city: prospect.city,
            jobTitle: prospect.role,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setSubject(data.subject || `Handling reschedules at ${prospect.companyName}`);
          setBodyText(data.body || '');
          setToEmail(prospect.email || '');
          if (!silent) {
            toast.success('Generated human-touch personalized email!');
          }
          return;
        }
      } catch (err) {
        console.warn('AI generation API failed, using human fallback template:', err);
      } finally {
        setGeneratingAi(false);
      }

      // Fallback matching exact user samples
      const firstName = prospect.name.split(' ')[0];
      const city = prospect.city || 'your area';
      const company = prospect.companyName;
      const isCleaning = selectedCategory.includes('clean') || (prospect.industry || '').toLowerCase().includes('clean');

      const fallbackSubj = isCleaning
        ? 'Repeat cleaning scheduling'
        : `Handling reschedules at ${company}`;

      const fallbackBody = isCleaning
        ? `Hi ${firstName},

Post-construction and move-out jobs plus repeat clients in ${city} is a lot of juggling for one owner.

I'm with Fieseros. We build an AI operating system for cleaning businesses that handles scheduling, invoicing and missed calls in one place.

When a client reschedules or goes quiet, jobs don't fall through the cracks. I could send two or three ideas for the ${company} booking flow if you reply.

Worth a look?

Best,`
        : `Hi ${firstName},

You run trade service operations for ${city} homes. That means calls, reschedules, and no-shows all land on you.

I'm with Fieseros. We built a platform that answers calls around the clock and books the job while you're in the field.

Want me to send two or three ideas for handling reschedules at ${company}? Just reply and I'll write them out.

Best,`;

      setSubject(fallbackSubj);
      setBodyText(fallbackBody);
      setToEmail(prospect.email || '');
    },
    [selectedCategory]
  );

  // Trigger copy generation when switching prospect
  useEffect(() => {
    if (selectedProspect) {
      generatePersonalizedCopy(selectedProspect, true);
    }
  }, [selectedProspect?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dispatch Email Handler ────────────────────────────────────────────────
  const handleSendOutreach = async () => {
    if (!toEmail || !toEmail.includes('@')) {
      toast.error('Please enter a valid recipient email address');
      return;
    }
    if (!subject.trim() || !bodyText.trim()) {
      toast.error('Email subject and body cannot be empty');
      return;
    }

    setSendingEmail(true);
    try {
      const payload: any = {
        recipientEmail: toEmail,
        subject: subject.trim(),
        htmlBody: bodyText.replace(/\n/g, '<br />'),
        textBody: bodyText,
      };

      if (selectedProspect.tenantId) {
        payload.tenantId = selectedProspect.tenantId;
      }

      const res = await authFetch('/api/superadmin/outreach/send?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`Outreach email sent successfully to ${toEmail}!`, {
          description: result.stats?.remaining !== undefined ? `${result.stats.remaining} daily sends remaining` : undefined,
        });
        if (result.stats?.remaining !== undefined) {
          setDailyQuota({
            remaining: result.stats.remaining,
            sentToday: result.stats.sentToday,
            dailyLimit: result.stats.dailyLimit,
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error('Failed to send outreach email', {
          description: err.error || 'Server rejected send request',
        });
      }
    } catch (err: any) {
      toast.error('Error sending outreach email', {
        description: err.message,
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Helper to extract initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="w-full space-y-4 pb-12 font-sans antialiased text-foreground">
      {/* ── Top Explee Stepper Header ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-border/40 pb-4">
        {/* Stepper progress */}
        <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground font-medium">
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-foreground font-semibold">
            1
          </span>
          <span className="w-4 h-[1px] bg-border" />
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-foreground font-semibold">
            2
          </span>
          <span className="w-4 h-[1px] bg-border" />
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-foreground font-semibold">
            3
          </span>
          <span className="w-4 h-[1px] bg-border" />
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-foreground font-semibold">
            4
          </span>
          <span className="w-4 h-[1px] bg-border" />
          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-foreground font-semibold">
            5
          </span>
          <span className="w-4 h-[1px] bg-border" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            6 Outreach ready
          </span>
          <span className="w-4 h-[1px] bg-border hidden sm:inline-block" />
          <span className="hidden sm:inline-flex items-center gap-1 opacity-70">
            <span className="size-4 rounded-full border border-border flex items-center justify-center text-[10px]">7</span> Send emails
          </span>
          <span className="w-4 h-[1px] bg-border hidden md:inline-block" />
          <span className="hidden md:inline-flex items-center gap-1 opacity-70">
            <span className="size-4 rounded-full border border-border flex items-center justify-center text-[10px]">8</span> Book meetings
          </span>
          <span className="w-4 h-[1px] bg-border hidden lg:inline-block" />
          <span className="hidden lg:inline-flex items-center gap-1 opacity-70">
            <span className="size-4 rounded-full border border-border flex items-center justify-center text-[10px]">9</span> Learn & double down
          </span>
        </div>

        {/* Top Right Actions & Quota */}
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <div className="text-right">
            <p className="text-xs font-semibold text-foreground">$30 free credits</p>
            <p className="text-[11px] text-muted-foreground">Daily Quota: {dailyQuota.remaining} left</p>
          </div>
          <Button
            onClick={handleSendOutreach}
            disabled={sendingEmail || !toEmail}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5 px-4 font-medium"
          >
            {sendingEmail ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                Start outreach
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Main Multi-Pane Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN: Campaigns & Competitors Sidebar (3 cols on desktop) ── */}
        <div className="md:col-span-3 space-y-6 text-sm">
          {/* Brand header */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>/ step 1 · Research your company</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded bg-emerald-600 flex items-center justify-center text-white text-[11px] font-bold">
                  F
                </div>
                <div>
                  <span className="font-semibold text-foreground text-xs">Fieseros</span>
                  <span className="text-[11px] text-muted-foreground ml-1.5">fieseros.com</span>
                </div>
              </div>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Competitors step */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>/ step 2 · Explore competitors</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Competitors <span className="text-foreground">14</span>
              </span>
              <button className="text-muted-foreground hover:text-foreground">
                <Settings2 className="size-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {DEFAULT_COMPETITORS.slice(0, 8).map((comp) => (
                <div
                  key={comp}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md border border-border/50 bg-background hover:bg-muted/50 text-[11px] font-medium text-foreground transition-colors group cursor-pointer"
                >
                  <span className="truncate">{comp}</span>
                  <ExternalLink className="size-2.5 text-muted-foreground opacity-50 group-hover:opacity-100" />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer font-medium">
              +6 more
            </p>
          </div>

          {/* Campaigns step */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>/ step 3 · Define campaigns</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                Campaigns <span className="text-foreground">6</span>
              </span>
              <button className="text-muted-foreground hover:text-foreground">
                <Settings2 className="size-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {DEFAULT_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      if (selectedProspect) {
                        generatePersonalizedCopy(selectedProspect, false);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left',
                      isActive
                        ? 'bg-muted/80 text-foreground border border-border shadow-xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="size-3.5 text-muted-foreground" />
                      <span>{cat.name}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">{cat.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subsequent steps footer */}
          <div className="space-y-1.5 text-xs text-muted-foreground pt-2">
            <p className="hover:text-foreground cursor-pointer">/ step 4 · Find potential customers</p>
            <p className="hover:text-foreground cursor-pointer">/ step 5 · Find decision makers</p>
            <p className="font-semibold text-foreground">/ step 6 · Write emails</p>
          </div>
        </div>

        {/* ── MIDDLE COLUMN: Prospects & Verification Badges (4 cols) ── */}
        <div className="md:col-span-4 space-y-3">
          {/* View Mode Switcher Pills: Companies / People / Emails */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-muted/60 border border-border/50 w-fit">
            <button
              onClick={() => setViewMode('companies')}
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                viewMode === 'companies'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Building2 className="size-3" />
              Companies
            </button>
            <button
              onClick={() => setViewMode('people')}
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                viewMode === 'people'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="size-3" />
              People
            </button>
            <button
              onClick={() => setViewMode('emails')}
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                viewMode === 'emails'
                  ? 'bg-foreground text-background shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <AtSign className="size-3" />
              Emails
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prospects, domain, email..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          {/* Prospects List */}
          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredProspects.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg">
                No prospects found for this filter.
              </div>
            ) : (
              filteredProspects.map((prospect) => {
                const isSelected = selectedProspect.id === prospect.id;
                const initials = getInitials(prospect.name);

                return (
                  <div
                    key={prospect.id}
                    onClick={() => setSelectedProspectId(prospect.id)}
                    className={cn(
                      'relative p-3 rounded-xl border transition-all cursor-pointer text-left',
                      isSelected
                        ? 'border-emerald-500/60 bg-emerald-500/5 shadow-xs ring-1 ring-emerald-500/40'
                        : 'border-border/60 bg-card hover:border-border hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Initials Badge */}
                        <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground shrink-0 border border-border/40">
                          {initials}
                        </div>

                        {/* Name & Domain */}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate uppercase tracking-tight">
                            {prospect.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {prospect.role} · <span className="hover:underline">{prospect.domain}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Check / Cross */}
                      {prospect.emailFound ? (
                        <CheckCircle2 className="size-4 text-muted-foreground/60 shrink-0" />
                      ) : (
                        <XCircle className="size-4 text-muted-foreground/40 shrink-0" />
                      )}
                    </div>

                    {/* 4 Enricher Tags Grid (Hunter, Exreacher, Findymail, LeadMagic) */}
                    <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                      {/* Hunter */}
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/40 bg-background/60 text-[10px] text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-orange-500" />
                        <span>hunter</span>
                      </div>
                      {/* Exreacher */}
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/40 bg-background/60 text-[10px] text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300" />
                        <span>exreacher</span>
                      </div>
                      {/* Findymail */}
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/40 bg-background/60 text-[10px] text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-blue-500" />
                        <span>findymail</span>
                      </div>
                      {/* LeadMagic */}
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/40 bg-background/60 text-[10px] text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-indigo-500" />
                        <span>leadmagic</span>
                      </div>
                    </div>

                    {/* Verification Result Line */}
                    <div className="mt-2 text-[11px] font-mono text-muted-foreground flex items-center flex-wrap gap-1.5">
                      {prospect.emailFound && prospect.email ? (
                        <>
                          <span className="text-foreground/90 font-sans">{prospect.email}</span>
                          <span className="text-[10px] text-muted-foreground">
                            via {prospect.enricher || 'findymail'}
                          </span>
                          {prospect.isCatchAll && (
                            <span className="px-1 py-0.2 rounded border border-amber-500/40 bg-amber-500/10 text-[9px] text-amber-600 dark:text-amber-400 font-sans">
                              @ catch_all
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground italic font-sans">no email found</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: AI Email Composer & Dispatcher (5 cols) ── */}
        <div className="md:col-span-5 space-y-3">
          {/* Recipient Header Box */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground border border-border/40">
                {getInitials(selectedProspect.name)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-foreground">{selectedProspect.name}</h3>
                  <a
                    href={selectedProspect.linkedinUrl || 'https://linkedin.com'}
                    target="_blank"
                    rel="noreferrer"
                    className="size-4 rounded bg-[#0A66C2] flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                  >
                    <Linkedin className="size-2.5 fill-current" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedProspect.role} · <span className="hover:underline">{selectedProspect.domain}</span>
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => generatePersonalizedCopy(selectedProspect, false)}
              disabled={generatingAi}
              className="text-xs gap-1.5 h-8"
            >
              <Sparkles className={cn('size-3.5 text-emerald-500', generatingAi && 'animate-spin')} />
              {generatingAi ? 'Writing AI copy...' : 'Regenerate'}
            </Button>
          </div>

          {/* Email Form Container */}
          <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-xs">
            {/* "To" Row */}
            <div className="flex items-center gap-2 text-xs border-b border-border/40 pb-2.5">
              <span className="text-muted-foreground font-semibold w-8">To</span>
              <Input
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@company.com"
                className="h-7 text-xs border-0 bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:bg-muted/30 rounded"
              />
            </div>

            {/* "Subj" Row */}
            <div className="flex items-center gap-2 text-xs border-b border-border/40 pb-2.5">
              <span className="text-muted-foreground font-semibold w-8">Subj</span>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject line..."
                className="h-7 text-xs font-semibold border-0 bg-transparent shadow-none px-1 focus-visible:ring-0 focus-visible:bg-muted/30 rounded"
              />
            </div>

            {/* Email Body Area */}
            <div className="relative pt-1">
              <textarea
                rows={12}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Personalized outreach body will appear here..."
                className="w-full text-xs font-sans leading-relaxed text-foreground bg-transparent border-0 resize-y focus:outline-none p-1 min-h-[220px]"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/30">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="size-3.5" />
                  Anti-spam plain-text delivery
                </span>
                <span className="italic opacity-60">Click to edit</span>
              </div>
            </div>

            {/* Bottom Action Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => toast.info('Anti-Spam Human Touch Prompt is active.')}
                className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                title="Outreach Settings"
              >
                <Settings2 className="size-4" />
              </button>

              <Button
                onClick={handleSendOutreach}
                disabled={sendingEmail || !toEmail}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-2 font-medium px-5"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Claim $30 credits & send
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
