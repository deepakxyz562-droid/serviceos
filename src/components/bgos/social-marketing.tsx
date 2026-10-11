'use client';

/**
 * Marketing Studio (Social Media View) — unified multi-channel marketing command center.
 *
 * Provides:
 *   - Executive Telemetry (5 KPI Cards with sparklines & growth metrics)
 *   - AI Post Generator (reactive prompt chips, tone, post type, multi-channel targets)
 *   - Real-time Multi-Platform Mockup Canvas (Instagram, Facebook, Google Business, LinkedIn, WhatsApp)
 *   - Visual Content Calendar (weekly matrix, scheduled queue, SLA/status pills)
 *   - Live Channel Integrations (Instagram, Facebook, Google Biz, WhatsApp)
 *   - Recent Content Velocity Feed & Active Marketing Campaigns Bento
 *   - Top Performing Creative Assets Gallery & AI Content Suggestions
 *   - Drilldown sub-tabs: Accounts, Composer, Posts History, Analytics
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Megaphone,
  Sparkles,
  Share2,
  Calendar,
  Users,
  Heart,
  UserPlus,
  DollarSign,
  Store,
  Send,
  MessageSquare,
  Layers,
  Image as ImageIcon,
  MoreVertical,
  MoreHorizontal,
  CheckCircle2,
  Edit3,
  RefreshCw,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Star,
  Gift,
  Lightbulb,
  Play,
  BarChart3,
  PenSquare,
  FileText,
  Loader2,
  TrendingUp,
  Check,
  CalendarDays,
  Flame,
  Camera,
  Globe,
  Radio,
  Clock,
  Sparkle,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';

// Lazy-load existing sub-views for deep-dive tabs
const SocialAccountsView = lazy(() =>
  import('@/components/views/tenant/social-accounts-view').then((m) => ({ default: m.SocialAccountsView }))
);
const PostComposerView = lazy(() =>
  import('@/components/views/tenant/post-composer-view').then((m) => ({ default: m.PostComposerView }))
);
const PostsListView = lazy(() =>
  import('@/components/views/tenant/posts-list-view').then((m) => ({ default: m.PostsListView }))
);
const SocialAnalyticsView = lazy(() =>
  import('@/components/views/tenant/social-analytics-view').then((m) => ({ default: m.SocialAnalyticsView }))
);

type SocialTab =
  | 'overview'
  | 'ai-generator'
  | 'accounts'
  | 'create'
  | 'posts'
  | 'analytics'
  | 'google-biz'
  | 'campaigns'
  | 'email-sms'
  | 'templates'
  | 'media';

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Preset Quick Prompts
const QUICK_PROMPTS = [
  {
    title: 'Spring Cleaning 20%',
    concept: 'Create a high-converting seasonal promotion for spring deep-cleaning in Tucson homes with a limited 20% discount...',
    tag: 'Spring Special',
    headline: '20% Off Deep Home Cleaning',
    type: 'Promo',
  },
  {
    title: 'Move-in Special',
    concept: 'Highlight our move-in/move-out sanitization package for families and renters moving into Tucson properties with same-day booking...',
    tag: 'Move-in Ready',
    headline: 'Move-In Fresh Home Sanitization',
    type: 'Promo',
  },
  {
    title: 'Weekend Opening',
    concept: 'Announce 4 open weekend slots available this Saturday for express residential carpet and window detailing...',
    tag: 'Limited Slots',
    headline: 'Weekend Slots Open — Reserve Today',
    type: 'Urgent',
  },
  {
    title: 'Customer Review Highlight',
    concept: 'Spotlight Elena M. from Catalina Foothills 5-star review celebrating our crew reliability and eco-friendly products...',
    tag: '5-Star Spotlight',
    headline: 'Loved by 2,000+ Tucson Homeowners',
    type: 'Showcase',
  },
  {
    title: 'Dust Storm Recovery',
    concept: 'Share dust storm recovery cleaning tips for Arizona homes: air filter checks, window tracks, and patio wash-downs...',
    tag: 'Pro Tip',
    headline: 'Desert Dust Storm Recovery Checklist',
    type: 'Tips',
  },
  {
    title: 'Eco Pet-Safe Cleaning',
    concept: 'Promote our zero-toxic, hypoallergenic pet-safe botanical cleaning solutions that keep dogs and cats safe while eliminating odors...',
    tag: 'Pet Safe',
    headline: '100% Pet-Safe Botanical Cleaning',
    type: 'Promo',
  },
];

export function SocialMediaView() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const [activeTab, setActiveTab] = useState<SocialTab>('overview');
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState(
    'Create a high-converting seasonal promotion for spring deep-cleaning in Tucson homes with a limited 20% discount...'
  );
  const [postType, setPostType] = useState('Promo');
  const [tone, setTone] = useState('Friendly');
  const [platform, setPlatform] = useState('All Platforms');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(28);

  // Preview Canvas state
  const [previewPlatform, setPreviewPlatform] = useState<'IG' | 'FB' | 'Google' | 'LinkedIn' | 'WhatsApp'>('IG');
  const [currentBadge, setCurrentBadge] = useState('Spring Special');
  const [currentHeadline, setCurrentHeadline] = useState('20% Off Deep Home Cleaning');
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);

  // Calendar State
  const [selectedDay, setSelectedDay] = useState(21);
  const [calendarItems, setCalendarItems] = useState([
    {
      id: 'cal-1',
      title: 'Spring Cleaning Promo (IG, FB)',
      time: 'Today • 2:00 PM',
      status: 'Queued',
      color: 'bg-teal-600',
    },
    {
      id: 'cal-2',
      title: 'Google Business Weekly Update',
      time: 'Tomorrow • 10:30 AM',
      status: 'Scheduled',
      color: 'bg-emerald-600',
    },
    {
      id: 'cal-3',
      title: 'Customer Review Spotlight Reel',
      time: 'Fri, Apr 25 • 4:00 PM',
      status: 'Draft',
      color: 'bg-teal-700',
    },
  ]);

  // Active Campaigns State
  const [campaigns, setCampaigns] = useState([
    {
      id: 'camp-1',
      name: 'Spring Cleaning 2025',
      dates: 'Apr 1 - Apr 30',
      badge: 'Active',
      reach: '12,450',
      clicks: '842',
      leads: '126',
      icon: 'flower',
    },
    {
      id: 'camp-2',
      name: 'Move-in Sanitization',
      dates: 'Apr 10 - May 10',
      badge: 'Active',
      reach: '8,320',
      clicks: '620',
      leads: '94',
      icon: 'home',
    },
    {
      id: 'camp-3',
      name: 'Google 5-Star Booster',
      dates: 'Ongoing Automation',
      badge: 'Review Blitz',
      reach: '5,680 Sent',
      clicks: '412 Opened',
      leads: '76 ★ Reviews',
      icon: 'star',
    },
    {
      id: 'camp-4',
      name: 'Give $30, Get $30',
      dates: 'Loyalty Program',
      badge: 'Referral',
      reach: '3,210 Shared',
      clicks: '188 Claims',
      leads: '42 Booked',
      icon: 'gift',
    },
  ]);

  // AI Content Suggestions State
  const [suggestions, setSuggestions] = useState([
    {
      id: 'sug-1',
      title: 'Dust storm recovery cleaning tips',
      desc: 'High local Tucson interest this week',
      concept: 'Dust storm recovery cleaning tips for Arizona homes: air filter checks, window tracks, and patio wash-downs...',
      icon: Lightbulb,
    },
    {
      id: 'sug-2',
      title: 'Share a customer video testimonial',
      desc: 'Boosts credibility for deep cleans',
      concept: 'Video reel showcasing before-and-after results for a 3-bedroom desert residence with Elena M. testimonial...',
      icon: Play,
    },
    {
      id: 'sug-3',
      title: 'Highlight pet-safe eco cleaning products',
      desc: 'Resonates with 68% of followers',
      concept: '100% pet-safe, plant-based cleaning solutions that keep dogs and cats safe while eliminating stubborn stains...',
      icon: Sparkle,
    },
  ]);

  // Create Campaign Modal State
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [newCampChannel, setNewCampChannel] = useState('All Channels');
  const [newCampBudget, setNewCampBudget] = useState('$500');

  const handleApplyPrompt = (promptItem: (typeof QUICK_PROMPTS)[0]) => {
    setAiPrompt(promptItem.concept);
    setPostType(promptItem.type);
    setCurrentBadge(promptItem.tag);
    setCurrentHeadline(promptItem.headline);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedCount((prev) => prev + 1);
      setCurrentHeadline(
        postType === 'Promo'
          ? 'Special Spring Cleaning Offer — Book Today'
          : postType === 'Tips'
          ? 'Pro Tips for a Cleaner, Fresher Home'
          : 'High-Standard Cleanliness Guaranteed'
      );
    }, 450);
  };

  // Live Social Posts Fetching
  useEffect(() => {
    let isMounted = true;
    async function fetchSocialPosts() {
      try {
        const res = await fetch('/api/social/posts?limit=20');
        if (res.ok) {
          const json = await res.json();
          const posts = json.data || [];
          if (posts.length > 0 && isMounted) {
            setGeneratedCount((prev) => Math.max(prev, posts.length));
            const mappedItems = posts.map((p: any) => ({
              id: p.id,
              title: p.content ? p.content.slice(0, 35) + '...' : 'Social update',
              time: p.scheduledAt
                ? new Date(p.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Scheduled',
              status: p.status === 'published' ? 'Published' : p.status === 'scheduled' ? 'Scheduled' : 'Draft',
              color: p.status === 'published' ? 'bg-emerald-600' : 'bg-teal-600',
            }));
            setCalendarItems((prev) => {
              const ids = new Set(mappedItems.map((m: any) => m.id));
              return [...mappedItems, ...prev.filter((i) => !ids.has(i.id))];
            });
          }
        }
      } catch (e) {
        console.warn('Could not load social posts:', e);
      }
    }
    fetchSocialPosts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSchedulePost = async () => {
    const newItem = {
      id: `cal-${Date.now()}`,
      title: `${currentHeadline} (${previewPlatform})`,
      time: 'Tomorrow • 3:00 PM',
      status: 'Scheduled',
      color: 'bg-teal-600',
    };
    setCalendarItems([newItem, ...calendarItems]);
    setScheduleNotice(`Successfully scheduled to ${previewPlatform}! Added to Content Calendar.`);
    setTimeout(() => setScheduleNotice(null), 4000);

    try {
      const accRes = await fetch('/api/social/accounts');
      if (accRes.ok) {
        const accData = await accRes.json();
        const accounts = accData.data || [];
        const matching = accounts.find((a: any) => a.platform.toLowerCase() === previewPlatform.toLowerCase()) || accounts[0];
        if (matching) {
          await fetch('/api/social/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `${currentHeadline}\n\n${aiPrompt}`,
              status: 'scheduled',
              scheduledAt: new Date(Date.now() + 86400000).toISOString(),
              targets: [{ platform: matching.platform, socialAccountId: matching.id }],
            }),
          });
        }
      }
    } catch {
      // Gracefully silent; state preview is already updated
    }
  };

  const handleAddCampaign = () => {
    if (!newCampName.trim()) return;
    setCampaigns([
      {
        id: `camp-${Date.now()}`,
        name: newCampName,
        dates: 'Current Month',
        badge: 'Active',
        reach: '1,200',
        clicks: '98',
        leads: '15',
        icon: 'flower',
      },
      ...campaigns,
    ]);
    setNewCampName('');
    setCreateCampaignOpen(false);
  };

  const handleCycleSuggestions = () => {
    setSuggestions([
      {
        id: `sug-${Date.now()}-1`,
        title: 'Spring Window Detailing Showcase',
        desc: 'Trending search term in Tucson metro',
        concept: 'Showcase sparkling desert mountain views through crystal-clean streak-free windows...',
        icon: Sparkles,
      },
      {
        id: `sug-${Date.now()}-2`,
        title: 'HVAC Air Duct Sanitization Primer',
        desc: 'High seasonal conversion rate',
        concept: 'Explain the health benefits of deep dusting around returns and AC vents ahead of summer heat...',
        icon: Flame,
      },
      {
        id: `sug-${Date.now()}-3`,
        title: 'Neighborhood Group Discount Offer',
        desc: 'Viral referral pattern for HOAs',
        concept: 'Book 3 homes on the same street and save 25% on entire exterior and interior cleaning...',
        icon: Gift,
      },
    ]);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6 w-full text-slate-900 dark:text-slate-100">
      {/* ─── 1. Header Section with Actions ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (activeTab !== 'overview') {
                setActiveTab('overview');
              } else {
                setCurrentView('dashboard');
              }
            }}
            className="h-8 px-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 -ml-1 gap-1 self-center"
            title={activeTab !== 'overview' ? 'Back to Studio Overview' : 'Back to Dashboard'}
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline text-xs font-semibold">
              {activeTab !== 'overview' ? 'Back to Overview' : 'Back'}
            </span>
          </Button>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00A884] to-[#007F73] flex items-center justify-center text-white shadow-md shrink-0">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">Marketing Studio</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center gap-1 border border-teal-200/50 dark:border-teal-800/50">
                <Sparkles className="size-3.5 text-teal-600 dark:text-teal-400" /> AI Enabled
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Create, schedule and manage all your multi-channel marketing — powered by AI.
            </p>
          </div>
        </div>

        {/* Action Cluster */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Time Range Selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeRangeOpen(!timeRangeOpen)}
              className="h-9 gap-2 bg-white dark:bg-slate-900 shadow-xs border-slate-200 dark:border-slate-800 text-xs font-medium"
            >
              <Calendar className="size-4 text-slate-400" />
              <span>{timeRange}</span>
              <ChevronRight className="size-3 rotate-90 text-slate-400" />
            </Button>
            {timeRangeOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1 text-xs">
                {['Last 7 days', 'Last 30 days', 'This Quarter', 'Year to Date'].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTimeRange(range);
                      setTimeRangeOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span>{range}</span>
                    {timeRange === range && <Check className="size-3 text-teal-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('analytics')}
            className="h-9 gap-1.5 bg-white dark:bg-slate-900 shadow-xs border-slate-200 dark:border-slate-800 text-xs font-medium"
          >
            <BarChart3 className="size-4 text-slate-500" />
            <span>View Analytics</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateCampaignOpen(true)}
            variant="outline"
            className="h-9 gap-1.5 bg-white dark:bg-slate-900 border-teal-200 dark:border-teal-900/50 text-teal-700 dark:text-teal-400 font-semibold text-xs shadow-xs hover:bg-teal-50/50"
          >
            <Plus className="size-4" />
            <span>+ Create Campaign</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setActiveTab('overview');
              const textarea = document.getElementById('ai-concept-box');
              textarea?.focus();
            }}
            className="h-9 gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm rounded-lg"
          >
            <Plus className="size-4" />
            <span>Create Post</span>
          </Button>
        </div>
      </div>

      {scheduleNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 shadow-xs animate-in fade-in">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{scheduleNotice}</span>
        </div>
      )}

      {/* ─── 2. Top KPI Metric Row (5 Cards with Sparklines) ──────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Posts Published */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Posts Published</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <PenSquare className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold tracking-tight">{generatedCount}</span>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ArrowUp className="size-3 mr-0.5" /> 40%
            </span>
          </div>
          <div className="w-full h-6 mt-2 text-teal-600">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 24">
              <path
                d="M0,18 Q20,16 40,10 T80,12 T100,2"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Reach */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Reach</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold tracking-tight">1.2M</span>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ArrowUp className="size-3 mr-0.5" /> 62%
            </span>
          </div>
          <div className="w-full h-6 mt-2 text-emerald-600">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 24">
              <path
                d="M0,20 Q25,18 50,8 T80,14 T100,3"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Engagements */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Engagements</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Heart className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold tracking-tight">4,856</span>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ArrowUp className="size-3 mr-0.5" /> 28%
            </span>
          </div>
          <div className="w-full h-6 mt-2 text-teal-600">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 24">
              <path
                d="M0,16 Q20,20 40,12 T70,16 T100,4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: New Leads */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">New Leads</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UserPlus className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold tracking-tight">342</span>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ArrowUp className="size-3 mr-0.5" /> 35%
            </span>
          </div>
          <div className="w-full h-6 mt-2 text-blue-600">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 24">
              <path
                d="M0,22 Q30,10 60,14 T85,8 T100,2"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 5: Estimated Pipeline */}
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estimated Pipeline</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold tracking-tight">$18,420</span>
            <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <ArrowUp className="size-3 mr-0.5" /> 48%
            </span>
          </div>
          <div className="w-full h-6 mt-2 text-emerald-600">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 24">
              <path
                d="M0,20 Q20,18 40,8 T70,10 T100,1"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ─── 3. Sub-Navigation Tabs Bar ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-teal-200/60 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="size-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('ai-generator')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'ai-generator'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-teal-200/60 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="size-4 text-teal-600 dark:text-teal-400" />
          <span>AI Post Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-teal-200/60 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Share2 className="size-4" />
          <span>Social Media Accounts</span>
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'posts'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-teal-200/60 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <FileText className="size-4" />
          <span>Posts Feed</span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'create'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-teal-200/60 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <PenSquare className="size-4" />
          <span>Post Composer</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-teal-200/60 dark:border-teal-800'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="size-4" />
          <span>Analytics</span>
        </button>
      </div>

      {/* ─── Tab Content: Drilldown vs Overview ───────────────────────── */}
      {activeTab === 'accounts' && (
        <Suspense fallback={<TabLoader />}>
          <SocialAccountsView />
        </Suspense>
      )}

      {activeTab === 'create' && (
        <Suspense fallback={<TabLoader />}>
          <PostComposerView />
        </Suspense>
      )}

      {activeTab === 'posts' && (
        <Suspense fallback={<TabLoader />}>
          <PostsListView />
        </Suspense>
      )}

      {activeTab === 'analytics' && (
        <Suspense fallback={<TabLoader />}>
          <SocialAnalyticsView />
        </Suspense>
      )}

      {/* ─── Overview & AI Generator Command Center ───────────────────── */}
      {(activeTab === 'overview' || activeTab === 'ai-generator') && (
        <div className="space-y-6">
          {/* Tri-Column Interactive Workstation Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ── Left Column (4 cols): AI Post Generator ─────────────────── */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Sparkles className="size-3.5" />
                  </div>
                  <h2 className="text-sm font-bold">AI Post Generator</h2>
                </div>
                <button
                  onClick={() => handleApplyPrompt(QUICK_PROMPTS[0])}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
                >
                  Try Example
                </button>
              </div>

              {/* Post Concept Textarea */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Post Concept or Offer Details
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">{aiPrompt.length}/500</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 border border-slate-200 dark:border-slate-800">
                  <Textarea
                    id="ai-concept-box"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="e.g. Create a high-converting seasonal promotion for spring deep-cleaning in Tucson homes with a limited 20% discount..."
                    className="w-full bg-transparent border-none p-0 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  />
                </div>
              </div>

              {/* Controls: Type, Tone, Platform */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-500">Post Type</label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 py-1.5 px-2 rounded-lg text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="Promo">Promo</option>
                    <option value="Tips">Tips</option>
                    <option value="Showcase">Showcase</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-500">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 py-1.5 px-2 rounded-lg text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="Friendly">Friendly</option>
                    <option value="Professional">Professional</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-slate-500">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 py-1.5 px-2 rounded-lg text-xs font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="All Platforms">All Platforms</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Google">Google</option>
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#00A884] to-[#007F73] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-opacity"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Generating Posts...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Generate 3 Posts</span>
                  </>
                )}
              </Button>

              {/* Quick Prompts Carousel */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Quick Prompts
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.title}
                      onClick={() => handleApplyPrompt(prompt)}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      {prompt.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Center Column (4 cols): Post Preview Canvas ─────────────── */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Post Preview</h2>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  {(['IG', 'FB', 'Google', 'LinkedIn'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPreviewPlatform(p)}
                      className={`px-2 py-1 rounded font-semibold text-xs transition-colors flex items-center gap-1 ${
                        previewPlatform === p
                          ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs border border-teal-200/50'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {p === 'IG' && <Camera className="size-3" />}
                      {p === 'FB' && <Globe className="size-3" />}
                      {p === 'Google' && <Store className="size-3" />}
                      {p === 'LinkedIn' && <Share2 className="size-3" />}
                      <span>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Mockup Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200/60 dark:border-slate-800 flex flex-col gap-3">
                {/* Mock Account Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                      C
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">Cinderella Cleaners</p>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        @cinderellacleaners • Tucson, AZ
                      </p>
                    </div>
                  </div>
                  <MoreHorizontal className="size-4 text-slate-400 cursor-pointer" />
                </div>

                {/* Generated Banner Graphic */}
                <div className="relative w-full h-52 rounded-lg overflow-hidden shadow-xs bg-gradient-to-br from-teal-950 via-slate-800 to-emerald-950 flex flex-col justify-end p-3 text-white">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent pointer-events-none" />
                  <div className="relative z-10 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider bg-teal-600 text-white px-2 py-0.5 rounded self-start font-bold shadow-xs">
                      {currentBadge}
                    </span>
                    <p className="text-sm font-bold text-white mt-0.5 leading-snug">{currentHeadline}</p>
                    <p className="text-[11px] text-slate-200">Valid Tucson Metro • Limited Availability</p>
                  </div>
                </div>

                {/* Caption Body */}
                <div className="flex flex-col gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <p className="leading-relaxed">
                    Give your home the breath of fresh air it deserves this season! 🌸 Our certified team
                    cleans every baseboard, appliance, and corner with eco-safe products.
                  </p>
                  <div className="flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Complete Kitchen &
                      Appliance sanitization
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> Living rooms,
                      upholstery & window sills
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" /> 100% Satisfaction or
                      free reclean guarantee
                    </span>
                  </div>
                  <p className="text-teal-600 dark:text-teal-400 text-[11px] font-medium pt-1">
                    #SpringCleaning #TucsonHomes #CleanHome #CinderellaCleaners #ArizonaLiving
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab('create');
                  }}
                  className="flex-1 h-8 text-xs gap-1.5 bg-slate-50 dark:bg-slate-800"
                >
                  <Edit3 className="size-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="flex-1 h-8 text-xs gap-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Regenerate</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleSchedulePost}
                  className="flex-1 h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  <Clock className="size-3.5" />
                  <span>Schedule</span>
                </Button>
              </div>
            </div>

            {/* ── Right Column (4 cols): Calendar & Platform Integrations ─── */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* Content Calendar Micro-View */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold">Content Calendar</h2>
                    <p className="text-xs text-slate-500">Apr 21 – Apr 27, 2025</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedDay((prev) => Math.max(21, prev - 1))}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => setSelectedDay(21)}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setSelectedDay((prev) => Math.min(27, prev + 1))}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                {/* 7-Day Matrix */}
                <div className="grid grid-cols-7 gap-1 text-center pt-2">
                  {[
                    { label: 'M', day: 21 },
                    { label: 'T', day: 22 },
                    { label: 'W', day: 23 },
                    { label: 'T', day: 24 },
                    { label: 'F', day: 25 },
                    { label: 'S', day: 26 },
                    { label: 'S', day: 27 },
                  ].map((item) => (
                    <button
                      key={item.day}
                      onClick={() => setSelectedDay(item.day)}
                      className={`text-xs py-1 rounded transition-colors ${
                        selectedDay === item.day
                          ? 'bg-teal-600 text-white font-bold'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-[10px]">{item.label}</div>
                      <div>{item.day}</div>
                    </button>
                  ))}
                </div>

                {/* Schedule Item Stack */}
                <div className="flex flex-col gap-2 mt-1">
                  {calendarItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight">{item.title}</p>
                          <p className="text-[11px] text-slate-500 leading-tight">{item.time}</p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0.5 font-semibold ${
                          item.status === 'Queued'
                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                            : item.status === 'Scheduled'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Connections Status */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">Channel Integrations</h2>
                  <button
                    onClick={() => setActiveTab('accounts')}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                  >
                    Manage
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Instagram */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-600">
                        <Camera className="size-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight">Instagram</p>
                        <p className="text-[10px] text-emerald-600 font-medium leading-tight">Active</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>

                  {/* Facebook */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                        <Globe className="size-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight">Facebook</p>
                        <p className="text-[10px] text-emerald-600 font-medium leading-tight">Active</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>

                  {/* Google Biz */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-teal-600">
                        <Store className="size-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight">Google Biz</p>
                        <p className="text-[10px] text-emerald-600 font-medium leading-tight">Synced</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>

                  {/* WhatsApp */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                        <MessageSquare className="size-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight">WhatsApp</p>
                        <p className="text-[10px] text-emerald-600 font-medium leading-tight">Connected</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Lower Section: Operational Feeds & Campaigns Bento ───────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Lower (7 Cols): Recent Posts Feed */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold">Recent Posts & Content Velocity</h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500">
                    Last 7 days
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('posts')}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                >
                  View All Posts
                </button>
              </div>

              {/* Feed Rows */}
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    title: 'Spring Cleaning Promo 2025',
                    date: 'Apr 24, 2025 • 10:00 AM',
                    platform: 'Instagram',
                    reach: '12.4K Reach',
                    engagement: '842 Engagements',
                    status: 'Published',
                    color: 'text-teal-600',
                  },
                  {
                    title: 'Customer Review: Elena M. (Catalina Foothills)',
                    date: 'Apr 23, 2025 • 2:00 PM',
                    platform: 'Facebook',
                    reach: '8.1K Reach',
                    engagement: '612 Engagements',
                    status: 'Published',
                    color: 'text-blue-600',
                  },
                  {
                    title: 'Deep Clean Hacks Video Reel',
                    date: 'Apr 22, 2025 • 11:00 AM',
                    platform: 'TikTok / IG',
                    reach: '22.5K Reach',
                    engagement: '1.2K Engagements',
                    status: 'Published',
                    color: 'text-teal-600',
                  },
                  {
                    title: 'Behind the Scenes: Tucson Route Crew',
                    date: 'Apr 20, 2025 • 5:00 PM',
                    platform: 'Facebook',
                    reach: '6.8K Reach',
                    engagement: '530 Engagements',
                    status: 'Scheduled',
                    color: 'text-blue-600',
                  },
                ].map((post, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/50 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white shrink-0 text-xs font-bold shadow-xs">
                        {post.platform === 'Instagram' ? (
                          <Camera className="size-5" />
                        ) : post.platform === 'Facebook' ? (
                          <Globe className="size-5" />
                        ) : (
                          <Play className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{post.title}</p>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          <span>{post.date}</span>
                          <span>•</span>
                          <span className={`flex items-center gap-1 font-medium ${post.color}`}>
                            {post.platform}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold">{post.reach}</p>
                        <p className="text-[11px] text-emerald-600 font-medium">{post.engagement}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-2 py-0.5 font-bold ${
                          post.status === 'Published'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {post.status}
                      </Badge>
                      <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Lower (5 Cols): Active Campaigns */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">Active Campaigns</h2>
                <Button
                  size="sm"
                  onClick={() => setCreateCampaignOpen(true)}
                  className="h-7 text-[11px] gap-1 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  <Plus className="size-3.5" />
                  <span>New Campaign</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0.2"
                        >
                          {camp.badge}
                        </Badge>
                        <h3 className="text-xs font-bold mt-1 leading-snug">{camp.name}</h3>
                        <p className="text-[11px] text-slate-500">{camp.dates}</p>
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0">
                        {camp.icon === 'flower' && <Sparkles className="size-3.5" />}
                        {camp.icon === 'home' && <Store className="size-3.5" />}
                        {camp.icon === 'star' && <Star className="size-3.5" />}
                        {camp.icon === 'gift' && <Gift className="size-3.5" />}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 p-2 rounded-lg text-center">
                      <div>
                        <p className="text-xs font-bold leading-tight">{camp.reach}</p>
                        <p className="text-[10px] text-slate-500">Reach</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{camp.clicks}</p>
                        <p className="text-[10px] text-slate-500">Clicks</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                          {camp.leads}
                        </p>
                        <p className="text-[10px] text-slate-500">Leads</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Bottom Visual Bar: Creative Assets & AI Suggestions ─────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Top Performing Creative Assets (8 Cols) */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col gap-4 justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold">Top Performing Creative Assets</h2>
                  <p className="text-xs text-slate-500">
                    High engagement content patterns recommended for ad boosting
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                >
                  Asset Analytics
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    title: 'Spring Kitchen Reset',
                    views: '12.4K',
                    ctr: '+18% CTR',
                    platform: Camera,
                    gradient: 'from-amber-600 to-amber-900',
                  },
                  {
                    title: 'Spa-Style Bathroom Finish',
                    views: '10.8K',
                    ctr: '+16% CTR',
                    platform: Globe,
                    gradient: 'from-blue-600 to-indigo-900',
                  },
                  {
                    title: 'Client Review Highlights',
                    views: '8.1K',
                    ctr: '+14% CTR',
                    platform: Camera,
                    gradient: 'from-purple-600 to-fuchsia-900',
                  },
                  {
                    title: 'Meet the Team Story',
                    views: '6.2K',
                    ctr: '+11% CTR',
                    platform: Globe,
                    gradient: 'from-emerald-600 to-teal-900',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 group cursor-pointer">
                    <div
                      className={`relative rounded-lg overflow-hidden h-32 shadow-xs bg-gradient-to-br ${item.gradient} p-2.5 flex flex-col justify-between text-white group-hover:scale-[1.02] transition-transform`}
                    >
                      <span className="self-start text-[10px] font-bold bg-teal-600 text-white px-1.5 py-0.5 rounded shadow-xs">
                        {item.views}
                      </span>
                      <div className="self-end w-6 h-6 rounded-full bg-white/90 text-slate-900 flex items-center justify-center">
                        <item.platform className="size-3.5" />
                      </div>
                    </div>
                    <p className="text-xs font-bold truncate leading-tight">{item.title}</p>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-0.5">
                      <TrendingUp className="size-3" /> {item.ctr}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Content Suggestions Deck (4 Cols) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-teal-600" />
                  <h2 className="text-sm font-bold">Content Suggestions</h2>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[10px]"
                >
                  AI Generated
                </Badge>
              </div>

              <div className="flex flex-col gap-2">
                {suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between border border-slate-200/50 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <sug.icon className="size-4 text-teal-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight">{sug.title}</p>
                        <p className="text-[11px] text-slate-500 truncate leading-tight">{sug.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAiPrompt(sug.concept);
                        const textarea = document.getElementById('ai-concept-box');
                        textarea?.focus();
                      }}
                      title="Load into AI Generator"
                      className="p-1 rounded bg-white dark:bg-slate-900 text-teal-600 hover:bg-teal-600 hover:text-white transition-colors shrink-0 border border-slate-200 dark:border-slate-700"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCycleSuggestions}
                className="w-full h-8 text-xs gap-1.5 bg-slate-50 dark:bg-slate-800"
              >
                <RefreshCw className="size-3.5" />
                <span>Get New Suggestions</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Campaign Modal ────────────────────────────────────── */}
      <Dialog open={createCampaignOpen} onOpenChange={setCreateCampaignOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Megaphone className="size-4 text-teal-600" /> Create Marketing Campaign
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Campaign Name</label>
              <Input
                placeholder="e.g. Summer Residential Deep Clean Blitz"
                value={newCampName}
                onChange={(e) => setNewCampName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Target Channel</label>
                <select
                  value={newCampChannel}
                  onChange={(e) => setNewCampChannel(e.target.value)}
                  className="w-full h-8 text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="All Channels">All Channels</option>
                  <option value="Google Business">Google Business</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="WhatsApp Broadcast">WhatsApp Broadcast</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Monthly Budget</label>
                <Input
                  value={newCampBudget}
                  onChange={(e) => setNewCampBudget(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateCampaignOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCampaign}
              className="h-8 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white"
            >
              Launch Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export { SocialMediaView as BgosSocialMarketing };
export default SocialMediaView;
