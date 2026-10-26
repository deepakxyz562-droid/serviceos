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

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
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
  Copy,
  ExternalLink,
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
  const businessName = auth?.tenant?.name || auth?.workspace?.name || (isDemo ? 'Your Business' : 'BGOS');
  const businessInitial = businessName.trim().charAt(0).toUpperCase() || 'Y';
  const businessHandle = `@${businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourbusiness'}`;

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
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);

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
    const promptToUse = studioPrompt.trim() || aiPrompt;
    if (!promptToUse) {
      toast.info('Please enter a description or promotion concept to generate content.');
      return;
    }
    setIsGenerating(true);
    try {
      const targetPlatforms = selectedChannels.map((c) => {
        const lower = c.toLowerCase();
        if (lower.includes('google')) return 'googlebusiness';
        if (lower.includes('face')) return 'facebook';
        if (lower.includes('insta')) return 'instagram';
        if (lower.includes('whats')) return 'whatsapp';
        return lower;
      });
      const res = await fetch('/api/social/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: promptToUse,
          platforms: targetPlatforms.length ? targetPlatforms : ['googlebusiness', 'facebook', 'instagram'],
          tone: tone.toLowerCase(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.caption) {
          setGeneratedCaption(data.caption);
          setAiPrompt(promptToUse);
          toast.success('Content generated! Preview updated below.');
        }
      } else {
        toast.error('Failed to generate caption. Please try again.');
      }
    } catch {
      toast.error('Network error generating caption');
    } finally {
      setIsGenerating(false);
      setGeneratedCount((prev) => prev + 1);
    }
  };

  // Live Social Posts Fetching
  const fetchSocialPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/social/posts?limit=20');
      if (res.ok) {
        const json = await res.json();
        const posts = json.data || [];
        setRecentPosts(posts);
        if (posts.length > 0) {
          setGeneratedCount((prev) => Math.max(prev, posts.length));
          const mappedItems = posts.map((p: any) => ({
            id: p.id,
            title: p.content ? p.content.slice(0, 35) + '...' : 'Social update',
            time: p.scheduledAt
              ? new Date(p.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : p.publishedAt
              ? new Date(p.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
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

      const set = new Set<string>(isDemo ? ['whatsapp', 'email', 'sms'] : []);

      if (accRes.status === 'fulfilled' && accRes.value.ok) {
        const accJson = await accRes.value.json();
        const list = accJson?.data || (Array.isArray(accJson) ? accJson : []);
        if (Array.isArray(list)) {
          for (const a of list) {
            if (a.platform && a.isActive) {
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
    } catch {
      // keep defaults
    }
  }, [isDemo]);

  useEffect(() => {
    fetchSocialPosts();
  }, [fetchSocialPosts]);

  const PLATFORM_MAP: Record<string, string> = {
    ig: 'instagram',
    instagram: 'instagram',
    fb: 'facebook',
    facebook: 'facebook',
    google: 'googlebusiness',
    'google business': 'googlebusiness',
    googlebusiness: 'googlebusiness',
    gmb: 'googlebusiness',
    linkedin: 'linkedin',
    tiktok: 'tiktok',
    x: 'twitter',
    twitter: 'twitter',
    whatsapp: 'whatsapp',
  };

  const handlePublishNow = async (channelName: string) => {
    setIsPublishing(true);
    const targetPlatform = PLATFORM_MAP[channelName.toLowerCase()] || channelName.toLowerCase();

    try {
      const accRes = await fetch('/api/social/accounts').catch(() => null);
      if (!accRes || !accRes.ok) {
        toast.error(`Unable to verify connected ${channelName} accounts.`);
        return;
      }
      const accData = await accRes.json();
      const accounts = accData?.data || (Array.isArray(accData) ? accData : []);
      const matching = accounts.find((a: any) => {
        const p = (a.platform || '').toLowerCase();
        return (p === targetPlatform || p.includes(targetPlatform)) && a.isActive;
      });

      if (!matching) {
        toast.error(`${channelName} is not connected yet. Click Connect to link your account.`, {
          action: {
            label: 'Connect',
            onClick: () => setActiveTab('accounts'),
          },
        });
        return;
      }

      const postContent = generatedCaption || studioPrompt || `${businessName} special update`;

      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: postContent,
          status: 'published',
          targets: [{ platform: matching.platform, socialAccountId: matching.id }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to publish to ${channelName}`);
        return;
      }

      toast.success(`Post submitted! Publishing to ${channelName}...`);
      fetchSocialPosts();
      setTimeout(() => {
        fetchSocialPosts();
      }, 2500);
    } catch (err) {
      console.warn('[Marketing Studio] Social post publish failed', err);
      toast.error(`Network error publishing to ${channelName}`);
    } finally {
      setIsPublishing(false);
    }
  };

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
        return (p === targetPlatform || p.includes(targetPlatform)) && a.isActive;
      });
      if (!matching) {
        toast.error(`No connected ${previewPlatform} account found. Please connect your account first.`, {
          action: {
            label: 'Connect',
            onClick: () => setActiveTab('accounts'),
          },
        });
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
          content: generatedCaption || studioPrompt || `${currentHeadline}\n\n${aiPrompt}`,
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
      fetchSocialPosts();
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
                      {businessInitial}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {businessName}
                      </p>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {studioPreviewTab} · Just now · 🌐
                      </p>
                    </div>
                  </div>
                  <MoreHorizontal className="size-4 text-slate-400" />
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-200 space-y-1 leading-relaxed">
                  {generatedCaption ? (
                    <p className="whitespace-pre-wrap">{generatedCaption}</p>
                  ) : (
                    <>
                      <p className="font-bold">✨ Diwali Special! ✨</p>
                      <p>Get 20% off on all home cleaning services.</p>
                      <p>A cleaner, brighter home for a happier Diwali! 🪔</p>
                    </>
                  )}
                </div>

                {/* Festive Banner Mockup */}
                <div
                  className="relative rounded-xl overflow-hidden h-36 p-4 flex flex-col justify-between text-white bg-cover bg-center"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, rgba(4,78,50,0.95) 0%, rgba(6,95,60,0.85) 55%, rgba(15,23,42,0.25) 100%), url("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80")',
                  }}
                >
                  <div>
                    <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">{businessName}</p>
                    <p className="text-xl font-extrabold text-amber-300 tracking-tight leading-none mt-0.5">
                      Diwali Special
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-100 mt-1">
                      20% OFF • HOME CLEANING SERVICES
                    </p>
                  </div>

                  <span className="self-start px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-bold text-xs shadow-xs">
                    Book Now
                  </span>
                </div>

                {/* Action Bar */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    onClick={() => handlePublishNow(studioPreviewTab)}
                    disabled={isPublishing}
                    className="flex-1 h-8 rounded-lg bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-bold gap-1.5 shadow-xs"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>Publish to {studioPreviewTab}</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSchedulePost}
                    className="h-8 rounded-lg text-xs font-semibold gap-1"
                  >
                    <Calendar className="size-3.5 text-slate-500" />
                    <span>Schedule</span>
                  </Button>
                  {studioPreviewTab === 'Google Business' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const textToCopy = generatedCaption || studioPrompt || `✨ Special Offer from ${businessName}! ✨\nBook professional services online today.`;
                        navigator.clipboard.writeText(textToCopy);
                        toast.success('Post content copied! Opening Google Business Profile...');
                        window.open('https://business.google.com', '_blank');
                      }}
                      className="h-8 rounded-lg text-xs font-semibold gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 border-blue-200 dark:border-blue-800"
                      title="Copy post and open Google Business Profile web console"
                    >
                      <ExternalLink className="size-3.5" />
                      <span>Open GBP</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const textToCopy = generatedCaption || `✨ Special Offer from ${businessName}! ✨\nBook professional services online today.`;
                      navigator.clipboard.writeText(textToCopy);
                      toast.success('Caption copied to clipboard!');
                    }}
                    className="h-8 px-2.5 rounded-lg text-xs"
                    title="Copy caption"
                  >
                    <Copy className="size-3.5 text-slate-500" />
                  </Button>
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
                    {recentPosts.length > 0
                      ? recentPosts.slice(0, 5).map((post: any) => {
                          const postPlatform = post.targets?.[0]?.platform || 'social';
                          const channelLabel =
                            postPlatform === 'googlebusiness'
                              ? 'Google Business'
                              : postPlatform.charAt(0).toUpperCase() + postPlatform.slice(1);
                          const dateStr = post.publishedAt || post.scheduledAt || post.createdAt;
                          const formattedDate = dateStr
                            ? new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Today';
                          const formattedTime = dateStr
                            ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '';
                          const isPub = post.status === 'published';
                          const isSched = post.status === 'scheduled';
                          const isFailed = post.status === 'failed';
                          const isPartial = post.status === 'partial';
                          return (
                            <tr key={post.id} className="group">
                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="size-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                                    {channelLabel.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white truncate">
                                      {post.content ? post.content.split('\n')[0].slice(0, 45) : 'Social Update'}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      {post.failureReason
                                        ? `Error: ${post.failureReason.slice(0, 50)}...`
                                        : post.content ? post.content.slice(0, 60) : 'Post ready for publishing'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-2 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                  <span>{channelLabel}</span>
                                </span>
                              </td>
                              <td className="py-3 px-2 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                    isPub
                                      ? 'bg-[#E8F8EF] text-[#009F50]'
                                      : isSched
                                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                                      : isFailed
                                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                      : isPartial
                                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {isPub ? 'Published' : isSched ? 'Scheduled' : isFailed ? 'Failed' : isPartial ? 'Partial' : 'Draft'}
                                </span>
                              </td>
                              <td className="py-3 px-2 whitespace-nowrap">
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                  {formattedDate}
                                </p>
                                <p className="text-[11px] text-slate-400">{formattedTime}</p>
                              </td>
                              <td className="py-3 pl-2 whitespace-nowrap text-right">
                                <div className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                  {postPlatform === 'googlebusiness' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const textToCopy = post.content || '';
                                        navigator.clipboard.writeText(textToCopy);
                                        toast.success('Post copied! Opening Google Business Profile...');
                                        window.open('https://business.google.com', '_blank');
                                      }}
                                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 hover:text-blue-700"
                                      title="Copy post and open Google Business Profile"
                                    >
                                      <ExternalLink className="size-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(post.content || '');
                                      toast.success('Content copied to clipboard!');
                                    }}
                                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                                    title="Copy caption"
                                  >
                                    <Copy className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      : RECENT_CONTENT_ROWS.map((row) => (
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

          {/* Active Campaigns Zero-State / Summary */}
          {campaigns.length === 0 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-[#E8F8EF] dark:bg-emerald-950/60 flex items-center justify-center text-[#009F50]">
                  <Megaphone className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Active Campaigns</p>
                  <p className="text-[11px] text-slate-500">No active campaigns. Launch a seasonal promo or outreach campaign to reach more leads.</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateCampaignOpen(true)}
                className="h-8 text-xs font-semibold rounded-xl gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>Create Campaign</span>
              </Button>
            </div>
          )}

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
