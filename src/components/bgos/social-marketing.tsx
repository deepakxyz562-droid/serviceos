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
  ThumbsUp,
  Eye,
  Mail,
  Bot,
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
import { toast } from 'sonner';

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
import { BgosMetaTemplatesWorkstation } from './meta-templates-workstation';

type SocialTab =
  | 'overview'
  | 'content'
  | 'calendar'
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

const RECENT_CONTENT_ROWS = [
  {
    id: 'rc-1',
    title: 'Diwali Cleaning Offer',
    subtitle: 'Get 20% off on all cleaning services.',
    thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&auto=format&fit=crop&q=80',
    channel: 'Google Business',
    status: 'Published',
    date: 'Oct 8, 2026',
    time: '10:00 AM',
    views: '2.4K',
    likes: '186',
  },
  {
    id: 'rc-2',
    title: 'Weekly Cleaning Tips',
    subtitle: '5 easy ways to keep your home clean.',
    thumb: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&auto=format&fit=crop&q=80',
    channel: 'Instagram',
    status: 'Scheduled',
    date: 'Oct 10, 2026',
    time: '9:00 AM',
    views: '1.2K',
    likes: '98',
  },
  {
    id: 'rc-3',
    title: 'Customer Review Post',
    subtitle: 'Thank you for your kind words!',
    thumb: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=200&auto=format&fit=crop&q=80',
    channel: 'Facebook',
    status: 'Published',
    date: 'Oct 6, 2026',
    time: '11:30 AM',
    views: '3.1K',
    likes: '240',
  },
  {
    id: 'rc-4',
    title: 'Holiday Service Announcement',
    subtitle: "We're open during the festive season!",
    thumb: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&auto=format&fit=crop&q=80',
    channel: 'WhatsApp',
    status: 'Draft',
    date: 'Oct 12, 2026',
    time: '—',
    views: '',
    likes: '',
  },
];

const UPCOMING_SCHEDULE_ROWS = [
  {
    id: 'us-1',
    month: 'OCT',
    day: '10',
    dow: 'Thu',
    title: 'Weekly Cleaning Tips',
    channel: 'Instagram',
    time: '9:00 AM',
    thumb: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'us-2',
    month: 'OCT',
    day: '12',
    dow: 'Sat',
    title: 'Festive Offer Reminder',
    channel: 'WhatsApp',
    time: '11:00 AM',
    thumb: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'us-3',
    month: 'OCT',
    day: '15',
    dow: 'Tue',
    title: 'Customer Testimonial',
    channel: 'Facebook',
    time: '10:30 AM',
    thumb: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&auto=format&fit=crop&q=80',
  },
  {
    id: 'us-4',
    month: 'OCT',
    day: '18',
    dow: 'Fri',
    title: 'End of Month Offer',
    channel: 'Google Business',
    time: '9:00 AM',
    thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&auto=format&fit=crop&q=80',
  },
];

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

export const INITIAL_CAMPAIGNS = [
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
];

export function SocialMediaView({
  initialCampaigns,
  isDemo: isDemoProp,
}: {
  initialCampaigns?: typeof INITIAL_CAMPAIGNS;
  isDemo?: boolean;
} = {}) {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const auth = useAppStore((state) => state.auth);
  const isDemo = Boolean(isDemoProp || (typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('demo') === 'true' || window.location.search.includes('isDemo=true'))));
  const businessName = auth?.tenant?.name || auth?.workspace?.name || 'Cinderella Cleaners';
  const businessInitial = businessName.trim().charAt(0).toUpperCase() || 'C';
  const businessHandle = `@${businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'cinderellacleaners'}`;

  const [activeTab, setActiveTab] = useState<SocialTab>('overview');
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);

  // Screenshot Create with AI & Preview state
  const [studioPrompt, setStudioPrompt] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'Google Business',
    'Facebook',
    'Instagram',
    'WhatsApp',
  ]);
  const [studioPreviewTab, setStudioPreviewTab] = useState<
    'Google Business' | 'Facebook' | 'Instagram' | 'WhatsApp'
  >('Google Business');

  const toggleChannel = (channelName: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelName) ? prev.filter((c) => c !== channelName) : [...prev, channelName]
    );
  };

  // AI Generator state
  const [aiPrompt, setAiPrompt] = useState(
    'Create a high-converting seasonal promotion for spring deep-cleaning in Tucson homes with a limited 20% discount...'
  );
  const [postType, setPostType] = useState('Promo');
  const [tone, setTone] = useState('Friendly');
  const [platform, setPlatform] = useState('All Platforms');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(28);
  const [generatedCaption, setGeneratedCaption] = useState(
    'Give your home the breath of fresh air it deserves this season! 🌸 Our certified team cleans every baseboard, appliance, and corner with eco-safe products.'
  );

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
  const [campaigns, setCampaigns] = useState<typeof INITIAL_CAMPAIGNS>(
    initialCampaigns ?? (isDemo ? INITIAL_CAMPAIGNS : [])
  );

  useEffect(() => {
    if (!auth?.isAuthenticated) return;
    let isMounted = true;
    fetch('/api/campaigns')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return;
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setCampaigns(
            list.map((c: any) => ({
              id: c.id,
              name: c.name,
              dates: c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : 'Active',
              badge: c.status === 'active' || c.status === 'scheduled' ? 'Active' : (c.status || 'Active'),
              reach: (c.totalRecipients || c.sentCount || 0).toLocaleString(),
              clicks: (c.openedCount || c.clickedCount || 0).toLocaleString(),
              leads: (c.convertedCount || 0).toString(),
              icon: 'flower',
            }))
          );
        } else {
          setCampaigns([]);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [auth?.isAuthenticated]);

  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(
    () => new Set(isDemo ? ['whatsapp', 'email', 'sms'] : [])
  );

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const targetPlatforms =
        platform === 'All Platforms'
          ? ['instagram', 'facebook', 'linkedin', 'googlebusiness']
          : [platform.toLowerCase().replace(/\s+/g, '')];
      const res = await fetch('/api/social/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiPrompt || `${postType} post for ${businessName}`,
          platforms: targetPlatforms,
          tone: tone.toLowerCase(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.caption) {
          setGeneratedCaption(data.caption);
        }
      }
    } catch {
      // Fallback handled below
    } finally {
      setIsGenerating(false);
      setGeneratedCount((prev) => prev + 1);
      setCurrentHeadline(
        postType === 'Promo'
          ? 'Special Spring Cleaning Offer — Book Today'
          : postType === 'Tips'
          ? 'Pro Tips for a Cleaner, Fresher Home'
          : 'High-Standard Cleanliness Guaranteed'
      );
    }
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

      try {
        const [accRes, provRes] = await Promise.allSettled([
          fetch('/api/social/accounts'),
          fetch('/api/campaigns/provider-status'),
        ]);

        if (isMounted) {
          const set = new Set<string>(isDemo ? ['whatsapp', 'email', 'sms'] : []);

          if (accRes.status === 'fulfilled' && accRes.value.ok) {
            const accJson = await accRes.value.json();
            const list = accJson?.data || (Array.isArray(accJson) ? accJson : []);
            if (Array.isArray(list)) {
              for (const a of list) {
                if (a.platform) {
                  const plat = String(a.platform).toLowerCase();
                  set.add(plat);
                  if (plat === 'googlebusiness') set.add('google');
                  if (plat === 'google') set.add('googlebusiness');
                }
              }
            }
          }

          if (provRes.status === 'fulfilled' && provRes.value.ok) {
            const provJson = await provRes.value.json();
            if (provJson?.whatsapp?.configured) set.add('whatsapp');
            if (provJson?.email?.configured) set.add('email');
            if (provJson?.sms?.configured) set.add('sms');
          }

          setConnectedPlatforms(set);
        }
      } catch {
        // keep defaults
      }
    }
    fetchSocialPosts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSchedulePost = async () => {
    if (isDemo) {
      const newItem = {
        id: `cal-${Date.now()}`,
        title: `${currentHeadline} (${previewPlatform})`,
        time: 'Tomorrow • 3:00 PM',
        status: 'Scheduled',
        color: 'bg-teal-600',
      };
      setCalendarItems((prev) => [newItem, ...prev]);
      setScheduleNotice(`Successfully scheduled to ${previewPlatform}! Added to Content Calendar.`);
      setTimeout(() => setScheduleNotice(null), 4000);
      return;
    }

    const PLATFORM_MAP: Record<string, string> = {
      ig: 'instagram',
      instagram: 'instagram',
      fb: 'facebook',
      facebook: 'facebook',
      google: 'google_business',
      'google business': 'google_business',
      gmb: 'google_business',
      linkedin: 'linkedin',
      tiktok: 'tiktok',
      x: 'twitter',
      twitter: 'twitter',
      whatsapp: 'whatsapp',
    };
    const targetPlatform = PLATFORM_MAP[previewPlatform.toLowerCase()] || previewPlatform.toLowerCase();

    try {
      const accRes = await fetch('/api/social/accounts').catch(() => null);
      if (!accRes || !accRes.ok) {
        toast.error(`Unable to verify connected ${previewPlatform} accounts. Please check your connections.`);
        return;
      }
      const accData = await accRes.json();
      const accounts = accData?.data || (Array.isArray(accData) ? accData : []);
      const matching = accounts.find((a: any) => {
        const p = (a.platform || '').toLowerCase();
        return p === targetPlatform || p.includes(targetPlatform);
      });
      if (!matching) {
        toast.error(`No connected ${previewPlatform} account found. Please connect your account in Settings.`);
        return;
      }

      // Compute tomorrow at 3:00 PM local time
      const schedDate = new Date();
      schedDate.setDate(schedDate.getDate() + 1);
      schedDate.setHours(15, 0, 0, 0);

      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `${currentHeadline}\n\n${aiPrompt}`,
          status: 'scheduled',
          scheduledAt: schedDate.toISOString(),
          targets: [{ platform: matching.platform, socialAccountId: matching.id }],
        }),
      });

      if (!res.ok) {
        toast.error('Failed to schedule social post on server.');
        return;
      }

      const postData = await res.json().catch(() => ({}));
      const serverId = postData?.data?.id || postData?.id || `cal-${Date.now()}`;
      const newItem = {
        id: serverId,
        title: `${currentHeadline} (${previewPlatform})`,
        time: 'Tomorrow • 3:00 PM',
        status: 'Scheduled',
        color: 'bg-teal-600',
      };
      setCalendarItems((prev) => [newItem, ...prev]);
      setScheduleNotice(`Successfully scheduled to ${previewPlatform}! Added to Content Calendar.`);
      setTimeout(() => setScheduleNotice(null), 4000);
      toast.success(`Post scheduled to ${matching.platform}!`);
    } catch (err) {
      console.warn('[Marketing Studio] Social post scheduling failed', err);
      toast.error('Network error scheduling social post');
    }
  };

  const handleAddCampaign = async () => {
    if (!newCampName.trim()) return;
    const campName = newCampName.trim();
    const tempId = `camp-${Date.now()}`;
    const newCamp = {
      id: tempId,
      name: campName,
      dates: 'Active Now',
      badge: 'Active',
      reach: '0',
      clicks: '0',
      leads: '0',
      icon: 'flower',
    };
    setCampaigns((prev) => [newCamp, ...prev]);
    setNewCampName('');
    setCreateCampaignOpen(false);

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campName,
          type: 'promotional',
          status: 'active',
          messageContent: `Promotional broadcast campaign for ${campName}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCampaigns((prev) => prev.filter((c) => c.id !== tempId));
        toast.error(err.error || 'Failed to save campaign on server');
      } else {
        const data = await res.json().catch(() => ({}));
        const serverCamp = data?.data;
        if (serverCamp?.id) {
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === tempId
                ? {
                    ...c,
                    id: serverCamp.id,
                    reach: (serverCamp.totalRecipients || 0).toLocaleString(),
                  }
                : c
            )
          );
        }
        toast.success(`Campaign "${campName}" created successfully!`);
      }
    } catch {
      setCampaigns((prev) => prev.filter((c) => c.id !== tempId));
      toast.error('Network error creating campaign');
    }
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
    <div className="p-4 sm:p-5 lg:p-6 space-y-5 w-full bg-[#F7FAF9] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* ─── 1. Page Header (Matches New Marketing Studio Screenshot) ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Solid #009F50 Green Rounded Square Badge with White Megaphone Icon */}
          <div className="size-11 rounded-2xl bg-[#009F50] text-white shadow-xs flex items-center justify-center shrink-0">
            <Megaphone className="size-6 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Marketing Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E8F8EF] dark:bg-emerald-950/60 text-[#009F50] dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 border border-[#ccebd9] dark:border-emerald-800/50">
                <Sparkles className="size-3.5 text-[#009F50]" /> AI Enabled
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Create, publish and manage your marketing content across email, SMS, WhatsApp and social media.
            </p>
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('analytics')}
            className="h-9 gap-1.5 bg-white dark:bg-slate-900 shadow-2xs border-slate-200 dark:border-slate-800 text-xs font-medium rounded-xl"
          >
            <BarChart3 className="size-3.5 text-slate-500" />
            <span>View Analytics</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateCampaignOpen(true)}
            variant="outline"
            className="h-9 gap-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs shadow-2xs rounded-xl"
          >
            <Plus className="size-3.5" />
            <span>+ Create Campaign</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveTab('overview');
              const textarea = document.getElementById('ai-concept-box');
              textarea?.focus();
            }}
            className="h-9 gap-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs shadow-2xs rounded-xl"
          >
            <PenSquare className="size-3.5 text-[#009F50]" />
            <span>Create Post</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setActiveTab('overview');
              const textarea = document.getElementById('studio-ai-prompt');
              textarea?.focus();
            }}
            className="h-9 gap-1.5 bg-[#009F50] hover:bg-[#008A45] text-white font-semibold text-xs shadow-xs rounded-xl px-4"
          >
            <Plus className="size-4" />
            <span>+ Create Content</span>
          </Button>
        </div>
      </div>

      {scheduleNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 shadow-xs animate-in fade-in">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{scheduleNotice}</span>
        </div>
      )}

      {/* ─── 2. Sub-Navigation Tabs Bar (Matches Screenshot + Studio Tabs) ─── */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 px-2 pt-1 rounded-t-xl">
        {[
          { id: 'overview' as SocialTab, label: 'Overview', Icon: Layers },
          { id: 'content' as SocialTab, label: 'Content', Icon: Send },
          { id: 'calendar' as SocialTab, label: 'Calendar', Icon: Calendar },
          { id: 'templates' as SocialTab, label: 'Meta Templates', Icon: MessageSquare },
          { id: 'analytics' as SocialTab, label: 'Analytics', Icon: BarChart3 },
          { id: 'ai-generator' as SocialTab, label: 'AI Post Generator', Icon: Sparkles },
          { id: 'accounts' as SocialTab, label: 'Social Media Accounts', Icon: Share2 },
          { id: 'posts' as SocialTab, label: 'Posts Feed', Icon: FileText },
          { id: 'create' as SocialTab, label: 'Post Composer', Icon: PenSquare },
        ].map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`relative px-3.5 py-2.5 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'text-[#009F50] dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className={`size-4 ${isActive ? 'text-[#009F50] dark:text-emerald-400' : 'text-slate-400'}`} />
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2.5px] rounded-t-full bg-[#009F50]" />
              )}
            </button>
          );
        })}
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

      {(activeTab === 'posts' || activeTab === 'content') && (
        <Suspense fallback={<TabLoader />}>
          <PostsListView />
        </Suspense>
      )}

      {activeTab === 'analytics' && (
        <Suspense fallback={<TabLoader />}>
          <SocialAnalyticsView />
        </Suspense>
      )}

      {activeTab === 'templates' && (
        <BgosMetaTemplatesWorkstation />
      )}

      {/* ─── Overview & AI Generator Command Center ───────────────────── */}
      {(activeTab === 'overview' ||
        activeTab === 'ai-generator' ||
        activeTab === 'calendar') && (
        <div className="space-y-5">
          {/* ─── Row 1: 4 Screenshot KPI Summary Cards ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Published Posts */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
              <div className="size-11 rounded-2xl bg-[#E8F8EF] dark:bg-emerald-950/60 flex items-center justify-center text-[#009F50] shrink-0">
                <Send className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Published Posts</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {calendarItems.filter((i) => i.status === 'Published').length}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#E8F8EF] text-[#009F50] text-[11px] font-bold">
                    {calendarItems.some((i) => i.status === 'Published') ? '↑ Active' : '0%'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">vs last month</p>
              </div>
            </div>

            {/* KPI 2: Scheduled Posts */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
              <div className="size-11 rounded-2xl bg-[#E8F8EF] dark:bg-emerald-950/60 flex items-center justify-center text-[#009F50] shrink-0">
                <Calendar className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Scheduled Posts</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {calendarItems.filter((i) => i.status === 'Scheduled' || i.status === 'Queued').length}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#E8F8EF] text-[#009F50] text-[11px] font-bold">
                    {calendarItems.some((i) => i.status === 'Scheduled' || i.status === 'Queued') ? '↑ Queued' : '0'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">vs last month</p>
              </div>
            </div>

            {/* KPI 3: Total Reach */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
              <div className="size-11 rounded-2xl bg-[#E8F8EF] dark:bg-emerald-950/60 flex items-center justify-center text-[#009F50] shrink-0">
                <Users className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Reach</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {campaigns.reduce((acc, c) => acc + (c.sentCount || c.recipientsCount || 0), 0) > 0
                      ? campaigns.reduce((acc, c) => acc + (c.sentCount || c.recipientsCount || 0), 0).toLocaleString()
                      : campaigns.length > 0
                      ? String(campaigns.length * 150)
                      : '0'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#E8F8EF] text-[#009F50] text-[11px] font-bold">
                    {campaigns.length > 0 ? '↑ Active' : '0%'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">vs last month</p>
              </div>
            </div>

            {/* KPI 4: Engagement Rate */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
              <div className="size-11 rounded-2xl bg-[#E8F8EF] dark:bg-emerald-950/60 flex items-center justify-center text-[#009F50] shrink-0">
                <ThumbsUp className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Engagement Rate</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {campaigns.length > 0 ? '4.8%' : '0.0%'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#E8F8EF] text-[#009F50] text-[11px] font-bold">
                    {campaigns.length > 0 ? '↑ Active' : '0%'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">vs last month</p>
              </div>
            </div>
          </div>

          {/* ─── Row 2: 3-Column Studio Grid (Create with AI | Preview | Connected Channels) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Card (5 cols): Create with AI */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4">
              <div className="space-y-3.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Send className="size-4 text-[#009F50]" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Create with AI</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8F8EF] text-[#009F50] text-[11px] font-semibold inline-flex items-center gap-1 border border-[#ccebd9]">
                    <Bot className="size-3" />
                    <span>AI Powered</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Describe what you want to promote. BGOS will create ready-to-post content for all channels.
                </p>

                {/* Prompt Box with 0/500 counter */}
                <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 pb-6">
                  <Textarea
                    id="studio-ai-prompt"
                    value={studioPrompt}
                    onChange={(e) => setStudioPrompt(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Example: Create a Diwali offer for my cleaning business with 20% discount. Include festive theme and call to action."
                    className="w-full bg-transparent border-none p-0 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  />
                  <span className="absolute right-3 bottom-2 text-[11px] text-slate-400 font-medium">
                    {studioPrompt.length}/500
                  </span>
                </div>

                {/* Choose channels (optional) */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Choose channels (optional)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'Google Business', badge: 'G', badgeColor: 'text-blue-600 font-extrabold' },
                      { id: 'Facebook', badge: 'f', badgeColor: 'text-blue-600 font-extrabold' },
                      { id: 'Instagram', badge: 'IG', badgeColor: 'text-pink-600 font-bold' },
                      { id: 'WhatsApp', badge: 'WA', badgeColor: 'text-[#009F50] font-bold' },
                      { id: 'Email', badge: '✉', badgeColor: 'text-slate-500' },
                      { id: 'SMS', badge: '💬', badgeColor: 'text-slate-500' },
                    ].map((ch) => {
                      const checked = selectedChannels.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => toggleChannel(ch.id)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                            checked
                              ? 'border-[#009F50]/40 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-500'
                          }`}
                        >
                          <span
                            className={`size-4 rounded flex items-center justify-center text-[10px] ${
                              checked
                                ? 'bg-[#009F50] text-white'
                                : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                            }`}
                          >
                            {checked && <Check className="size-3 stroke-[3]" />}
                          </span>
                          <span className={`text-[11px] ${ch.badgeColor}`}>{ch.badge}</span>
                          <span>{ch.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="h-9 px-4 rounded-xl bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <Sparkles className="size-3.5" />
                  <span>Generate Content</span>
                </Button>
              </div>
            </div>

            {/* Middle Card (4 cols): Preview */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2.5">Preview</h2>

                {/* Channel Tabs: Google Business | Facebook | Instagram | WhatsApp */}
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-2 text-xs overflow-x-auto">
                  {(['Google Business', 'Facebook', 'Instagram', 'WhatsApp'] as const).map((tab) => {
                    const active = studioPreviewTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setStudioPreviewTab(tab)}
                        className={`relative pb-1.5 font-semibold whitespace-nowrap transition-colors ${
                          active
                            ? 'text-[#009F50]'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {tab}
                        {active && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#009F50]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Social Post Preview Card */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-[#E8F8EF] text-[#009F50] font-extrabold text-sm flex items-center justify-center">
                      b
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        Your Business
                      </p>
                      <p className="text-[11px] text-slate-400 leading-tight">Just now · 🌐</p>
                    </div>
                  </div>
                  <MoreHorizontal className="size-4 text-slate-400" />
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-200 space-y-0.5 leading-relaxed">
                  <p className="font-bold">✨ Diwali Special! ✨</p>
                  <p>Get 20% off on all home cleaning services.</p>
                  <p>A cleaner, brighter home for a happier Diwali! 🪔</p>
                </div>

                {/* Festive Banner Mockup */}
                <div
                  className="relative rounded-xl overflow-hidden h-40 p-4 flex flex-col justify-between text-white bg-cover bg-center"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, rgba(4,78,50,0.95) 0%, rgba(6,95,60,0.85) 55%, rgba(15,23,42,0.25) 100%), url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80")',
                  }}
                >
                  <div>
                    <p className="text-sm font-bold text-emerald-100">Diwali Special</p>
                    <p className="text-2xl font-extrabold text-amber-300 tracking-tight leading-none mt-0.5">
                      20% OFF
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100 mt-1">
                      HOME CLEANING SERVICES
                    </p>
                  </div>

                  <span className="self-start px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-bold text-xs shadow-xs">
                    Book Now
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card (3 cols): Connected Channels */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Connected Channels</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('accounts')}
                  className="text-xs font-semibold text-[#009F50] hover:underline"
                >
                  Manage
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 my-auto">
                {[
                  { name: 'Google Business', key: 'google', badge: 'G', bg: 'bg-blue-50 text-blue-600' },
                  { name: 'Facebook', key: 'facebook', badge: 'f', bg: 'bg-blue-600 text-white' },
                  { name: 'Instagram', key: 'instagram', badge: 'IG', bg: 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white' },
                  { name: 'WhatsApp', key: 'whatsapp', badge: 'WA', bg: 'bg-[#009F50] text-white' },
                  { name: 'Email (SES)', key: 'email', badge: '✉', bg: 'bg-sky-50 text-sky-600' },
                  { name: 'SMS (Twilio)', key: 'sms', badge: '••', bg: 'bg-rose-500 text-white' },
                ].map((ch) => {
                  const isConnected = connectedPlatforms.has(ch.key);
                  return (
                    <button
                      key={ch.name}
                      type="button"
                      onClick={() => {
                        if (['whatsapp', 'email', 'sms'].includes(ch.key)) {
                          setCurrentView('settings');
                        } else {
                          setActiveTab('accounts');
                        }
                      }}
                      className="w-full py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-2.5 text-left hover:opacity-85 transition-opacity"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`size-8 rounded-full ${ch.bg} font-bold text-xs flex items-center justify-center shrink-0`}
                        >
                          {ch.badge}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {ch.name}
                          </p>
                          <p className={`text-[11px] font-semibold ${isConnected ? 'text-[#009F50]' : 'text-slate-400'}`}>
                            {isConnected ? 'Connected' : 'Not Connected'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Row 3: Bottom 2-Column Split (Recent Content Table | Upcoming Schedule List) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Card (7 cols): Recent Content */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Content</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('posts')}
                  className="text-xs font-semibold text-[#009F50] hover:underline flex items-center gap-1"
                >
                  <span>View all →</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                      <th className="pb-2.5 pr-3">Content</th>
                      <th className="pb-2.5 px-2">Channel</th>
                      <th className="pb-2.5 px-2">Status</th>
                      <th className="pb-2.5 px-2">Date</th>
                      <th className="pb-2.5 pl-2 text-right">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {RECENT_CONTENT_ROWS.map((row) => (
                      <tr key={row.id} className="group">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={row.thumb}
                              alt={row.title}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {row.title}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">{row.subtitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                            <span>{row.channel}</span>
                          </span>
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              row.status === 'Published'
                                ? 'bg-[#E8F8EF] text-[#009F50]'
                                : row.status === 'Scheduled'
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            {row.date}
                          </p>
                          <p className="text-[11px] text-slate-400">{row.time}</p>
                        </td>
                        <td className="py-3 pl-2 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-3 text-slate-600 dark:text-slate-300">
                            {row.views ? (
                              <>
                                <span className="inline-flex items-center gap-1 text-xs font-medium">
                                  <Eye className="size-3.5 text-slate-400" /> {row.views}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs font-medium">
                                  <ThumbsUp className="size-3.5 text-slate-400" /> {row.likes}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                            <MoreHorizontal className="size-4 text-slate-400 cursor-pointer" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Card (5 cols): Upcoming Schedule */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Upcoming Schedule</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className="text-xs font-semibold text-[#009F50] hover:underline flex items-center gap-1"
                >
                  <span>View calendar →</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 my-auto">
                {UPCOMING_SCHEDULE_ROWS.map((item) => (
                  <div key={item.id} className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Date Pill */}
                      <div className="w-10 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-center shrink-0">
                        <p className="text-[9px] font-bold uppercase text-slate-400 leading-none">
                          {item.month}
                        </p>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                          {item.day}
                        </p>
                        <p className="text-[9px] text-slate-400 leading-none">{item.dow}</p>
                      </div>

                      <img
                        src={item.thumb}
                        alt={item.title}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.channel}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="size-3 text-slate-400" />
                        {item.time}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                        Scheduled
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Secondary Executive Telemetry Strip (5 KPI Cards with Sparklines) ─── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 pt-2">
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
            </div>

            {/* Card 2: Total Reach (1.2M) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cumulative Reach</span>
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
            </div>
          </div>
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
                {/* Account Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                      {businessInitial}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">{businessName}</p>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {businessHandle} • Tucson, AZ
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
                    {generatedCaption}
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
                    #SpringCleaning #TucsonHomes #CleanHome #{businessName.replace(/[^a-zA-Z0-9]/g, '') || 'CinderellaCleaners'} #ArizonaLiving
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
                {campaigns.length === 0 ? (
                  <div className="col-span-full p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                    <Megaphone className="size-6 text-teal-600/50 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No active campaigns</p>
                    <p className="text-[11px] text-slate-500">Launch a seasonal or promotional campaign to reach more leads.</p>
                  </div>
                ) : (
                  campaigns.map((camp) => (
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
                  ))
                )}
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
                    gradient: 'from-blue-600 to-[#312E81]',
                  },
                  {
                    title: 'Client Review Highlights',
                    views: '8.1K',
                    ctr: '+14% CTR',
                    platform: Camera,
                    gradient: 'from-[#9333EA] to-fuchsia-900',
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
