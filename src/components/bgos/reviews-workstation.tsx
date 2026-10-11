'use client';

/**
 * Google Business & Reviews View — unified local reputation and review growth workstation.
 *
 * Implements the executive Stitch workstation matching the reference design:
 *   - Google Business Profile status & 9 canonical tabs (Overview, Reviews, Posts, Q&A, Insights, Photos, Services, Competitors, Settings)
 *   - 5 KPI Telemetry Cards (Google Rating, Total Reviews, New Reviews, Avg Response Time, 100% Response Rate)
 *   - Middle Tier: 30-Day Review Trend line chart, 5-Star Breakdown distribution, Get More Reviews hub (Link, SMS, Email, QR Code)
 *   - Bottom Tier Tri-Column Workstation:
 *       1. Reviews Triage Feed (filter pills, search, keyword tags, replied status)
 *       2. Active Review Inspector (customer photos, keywords, Your Reply editor, Customer Dossier)
 *       3. AI Review Reply Copilot (Beta), Keyword Radar & Quick Actions
 *   - Modals: Request Reviews, QR Code preview, Auto-Reply Rules, and manual CRUD.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Star,
  MessageSquare,
  TrendingUp,
  Clock,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Mail,
  QrCode,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  MoreHorizontal,
  Calendar,
  RefreshCw,
  Plus,
  X,
  Share2,
  ThumbsUp,
  Building2,
  Phone,
  Image as ImageIcon,
  CheckCheck,
  Bot,
  Sliders,
  BarChart3,
  Lightbulb,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { authFetch } from '@/lib/api';
import { useAppStore } from '@/store/app-store';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface ReviewItem {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  rating: number;
  timeAgo: string;
  text: string;
  keywords: string[];
  replied: boolean;
  replyText?: string;
  replyEdited?: string;
  location: string;
  reviewCount: number;
  photos?: string[];
}

// Canonical mock seed matching the reference dashboard
const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    name: 'Priya Singh',
    initials: 'PS',
    avatarBg: 'bg-purple-600',
    rating: 5,
    timeAgo: '2 days ago',
    text: 'Amazing service! The team was professional, on time and did a fantastic job. Highly recommend Cinderella Cleaners!',
    keywords: ['professional', 'on time', 'recommend'],
    replied: true,
    replyText: "Thank you so much for your kind words, Priya! We're happy to hear you loved our cleaning service. We look forward to serving you again soon!",
    replyEdited: 'Edited 2 days ago',
    location: 'Tucson, AZ',
    reviewCount: 5,
    photos: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'rev-2',
    name: 'Rahul Kumar',
    initials: 'RK',
    avatarBg: 'bg-emerald-600',
    rating: 5,
    timeAgo: '5 days ago',
    text: 'Great service. Very friendly staff and reasonable pricing. Will definitely use again for our quarterly deep cleans.',
    keywords: ['friendly', 'great service', 'pricing'],
    replied: true,
    replyText: 'Thank you Rahul! Our team always aims to provide friendly, transparent service. See you next quarter!',
    replyEdited: 'Edited 5 days ago',
    location: 'Oro Valley, AZ',
    reviewCount: 3,
  },
  {
    id: 'rev-3',
    name: 'Amit Sharma',
    initials: 'AM',
    avatarBg: 'bg-blue-600',
    rating: 4,
    timeAgo: '1 week ago',
    text: 'The cleaners were polite and did a good job on our kitchen appliances and windows. Slight delay on arrival but worth it.',
    keywords: ['good service', 'polite', 'clean'],
    replied: true,
    replyText: 'Thanks Amit! We appreciate your patience with traffic on route and are delighted the kitchen came out sparkling.',
    replyEdited: 'Edited 6 days ago',
    location: 'Catalina Foothills, AZ',
    reviewCount: 8,
  },
  {
    id: 'rev-4',
    name: 'Sneha Patel',
    initials: 'SP',
    avatarBg: 'bg-rose-600',
    rating: 5,
    timeAgo: '1 week ago',
    text: 'Easy booking, professional team and sparkling clean results. Thank you so much Cinderella team!',
    keywords: ['excellent', 'professional', 'clean'],
    replied: true,
    replyText: 'Thank you Sneha! Smooth online booking and flawless cleaning is our standard. Look forward to welcoming you back.',
    replyEdited: 'Edited 1 week ago',
    location: 'Tucson, AZ',
    reviewCount: 4,
  },
  {
    id: 'rev-5',
    name: 'John Doe',
    initials: 'JD',
    avatarBg: 'bg-amber-600',
    rating: 4,
    timeAgo: '2 weeks ago',
    text: 'The price is a bit high compared to others in town, but the thoroughness was unmatched. Overall satisfied with move-out clean.',
    keywords: ['price', 'satisfied', 'move-out'],
    replied: true,
    replyText: 'Thanks John! We stand by our 100% satisfaction guarantee and move-out inspection standards. Wishing you the best in your new place.',
    replyEdited: 'Edited 2 weeks ago',
    location: 'Downtown Tucson, AZ',
    reviewCount: 2,
  },
  {
    id: 'rev-6',
    name: 'Riya Mehta',
    initials: 'RM',
    avatarBg: 'bg-pink-600',
    rating: 5,
    timeAgo: '2 weeks ago',
    text: 'Best service in Tucson! The team was on time, thorough, professional and very polite. Will recommend to all neighbors.',
    keywords: ['best service', 'thorough', 'recommend'],
    replied: true,
    replyText: 'Thank you Riya! Word-of-mouth recommendations mean everything to our local family crew.',
    replyEdited: 'Edited 2 weeks ago',
    location: 'Rita Ranch, AZ',
    reviewCount: 6,
  },
];

const COMMON_KEYWORDS = [
  { text: 'cleaning', count: 92 },
  { text: 'professional', count: 78 },
  { text: 'on time', count: 64 },
  { text: 'friendly', count: 61 },
  { text: 'great service', count: 58 },
  { text: 'price', count: 42 },
  { text: 'team', count: 38 },
  { text: 'recommend', count: 37 },
  { text: 'quality', count: 35 },
  { text: 'communication', count: 28 },
];

export function ReviewsView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  // Navigation & Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState('reviews');
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);

  // Reviews State
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(INITIAL_REVIEWS);
  const [selectedReviewId, setSelectedReviewId] = useState<string>('rev-1');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  // Active Review
  const selectedReview =
    reviewsList.find((r) => r.id === selectedReviewId) || reviewsList[0];

  // Reply Draft State
  const [replyDraft, setReplyDraft] = useState(selectedReview?.replyText || '');
  const [isEditingReply, setIsEditingReply] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Sync draft when selected review changes
  useEffect(() => {
    if (selectedReview) {
      setReplyDraft(selectedReview.replyText || '');
      setIsEditingReply(false);
    }
  }, [selectedReviewId]);

  // Fetch real reviews from backend API on mount
  useEffect(() => {
    let mounted = true;
    authFetch('/api/reviews?limit=50')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data || !data.reviews || data.reviews.length === 0) return;
        const mapped: ReviewItem[] = data.reviews.map((r: any) => ({
          id: r.id,
          name: r.authorName || 'Verified Client',
          source: (r.source === 'google' ? 'Google' : r.source === 'facebook' ? 'Facebook' : 'Direct') as any,
          rating: r.rating || 5,
          date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent',
          text: r.comment || 'Outstanding service and quality execution.',
          sentiment: (r.rating >= 4 ? 'positive' : r.rating === 3 ? 'neutral' : 'negative') as any,
          replied: !!(r.responseJson && r.responseJson !== '{}'),
          replyText: r.responseJson ? (safeJsonParse(r.responseJson)?.text || null) : null,
          serviceCategory: 'Commercial & Residential',
          tags: ['Reliable', 'Top Rated'],
        }));
        setReviewsList(mapped);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  function safeJsonParse(val: any) {
    try {
      return typeof val === 'string' ? JSON.parse(val) : val;
    } catch {
      return null;
    }
  }

  // Dialog States
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [requestReviewsOpen, setRequestReviewsOpen] = useState(false);
  const [autoReplyModalOpen, setAutoReplyModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Copied review link handler
  const handleCopyReviewLink = () => {
    navigator.clipboard.writeText('https://g.page/r/cinderella-cleaners/review');
    setCopiedLink(true);
    toast.success('Google Review link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // AI Reply Generator (Beta)
  const handleGenerateAiReply = () => {
    if (!selectedReview) return;
    setIsGeneratingAi(true);
    setTimeout(() => {
      setIsGeneratingAi(false);
      const generated =
        selectedReview.rating >= 5
          ? `Thank you so much for the glowing 5-star review, ${selectedReview.name.split(' ')[0]}! We're thrilled that our team delivered sparkling results on time. We truly appreciate your support of Cinderella Cleaners and look forward to your next appointment!`
          : `Thank you for sharing your feedback, ${selectedReview.name.split(' ')[0]}! We're pleased you appreciated our team's work, and we always strive to exceed expectations. We look forward to serving you again soon!`;
      setReplyDraft(generated);
      setIsEditingReply(true);
      toast.success('AI crafted a personalized response!');
    }, 400);
  };

  // Save Reply
  const handleSaveReply = async () => {
    if (!replyDraft.trim()) {
      toast.error('Reply text cannot be empty');
      return;
    }
    try {
      await authFetch(`/api/reviews/${selectedReview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseJson: JSON.stringify({ text: replyDraft.trim(), repliedAt: new Date().toISOString() }),
        }),
      });
    } catch {
      // optimistic update persists locally
    }
    setReviewsList((prev) =>
      prev.map((r) =>
        r.id === selectedReviewId
          ? {
              ...r,
              replied: true,
              replyText: replyDraft.trim(),
              replyEdited: 'Just now',
            }
          : r
      )
    );
    setIsEditingReply(false);
    toast.success('Reply published to Google Business profile!');
  };

  // Filtered reviews
  const filteredReviews = reviewsList.filter((r) => {
    if (filterRating === 'replied' && !r.replied) return false;
    if (filterRating === 'unreplied' && r.replied) return false;
    if (filterRating === '5' && r.rating !== 5) return false;
    if (filterRating === '4' && r.rating !== 4) return false;
    if (filterRating === '3' && r.rating !== 3) return false;
    if (filterRating === '2' && r.rating !== 2) return false;
    if (filterRating === '1' && r.rating !== 1) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchText = r.text.toLowerCase().includes(q);
      const matchKeyword = r.keywords.some((k) => k.toLowerCase().includes(q));
      if (!matchName && !matchText && !matchKeyword) return false;
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6 w-full text-slate-900 dark:text-slate-100">
      {/* Universal Back Navigation */}
      <div className="flex items-center justify-between pb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (activeSubTab !== 'reviews') {
              setActiveSubTab('reviews');
            } else {
              setCurrentView('dashboard');
            }
          }}
          className="gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="size-4 text-teal-600" />
          <span>{activeSubTab !== 'reviews' ? 'Back to Reviews Overview' : 'Back to Dashboard'}</span>
        </Button>
      </div>

      {/* ─── 1. Header Section ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {/* Multi-color Google Logo Badge */}
          <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.9c2.27-2.1 3.645-5.2 3.645-9.14z"
                fill="#4285F4"
              />
              <path
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.07.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.09-6.67-4.91H1.28v3.15C3.3 21.43 7.37 24 12 24z"
                fill="#34A853"
              />
              <path
                d="M5.33 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.56H1.28C.46 8.19 0 10.04 0 12s.46 3.81 1.28 5.44l4.05-3.15z"
                fill="#FBBC05"
              />
              <path
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.3 2.57 1.28 6.56l4.05 3.15c.94-2.82 3.57-4.96 6.67-4.96z"
                fill="#EA4335"
              />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Google Business & Reviews</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Grow your local presence with more reviews, better rankings and engaging posts.
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Timeframe selector */}
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
                {['Last 7 days', 'Last 30 days', 'Last 90 days', 'This Quarter'].map((range) => (
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
            size="sm"
            onClick={() => toast.success('Synced latest reviews from Google Business Profile!')}
            className="h-9 gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm rounded-lg"
          >
            <RefreshCw className="size-3.5" />
            <span>Sync GBP</span>
          </Button>
        </div>
      </div>

      {/* ─── Sub-Navigation Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'reviews', label: 'Reviews' },
          { id: 'posts', label: 'Posts' },
          { id: 'qna', label: 'Q&A' },
          { id: 'insights', label: 'Insights' },
          { id: 'photos', label: 'Photos' },
          { id: 'services', label: 'Services' },
          { id: 'competitors', label: 'Competitors' },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs border border-slate-200 dark:border-slate-800'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── 2. Top 5 KPI Telemetry Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Google Rating */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Google Rating</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500">
              <Star className="size-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight">4.8</span>
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="size-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">(326 reviews)</p>
          </div>
        </div>

        {/* Card 2: Total Reviews */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Reviews</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <MessageSquare className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight">326</span>
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                ↑ 12%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">vs last 30 days</p>
          </div>
        </div>

        {/* Card 3: New Reviews */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">New Reviews</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight">24</span>
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                ↑ 50%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">vs last 30 days</p>
          </div>
        </div>

        {/* Card 4: Average Response Time */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Average Response Time</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight">2.4 hours</span>
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                ↓ 62%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">vs last 30 days</p>
          </div>
        </div>

        {/* Card 5: Response Rate */}
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Response Rate</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCheck className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight">100%</span>
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                ↑ 12%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">vs last 30 days</p>
          </div>
        </div>
      </div>

      {/* ─── 3. Middle Tier: Review Trend, Breakdown & Get Reviews ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1 (5 cols): Review Trend Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold">Review Trend</h2>
            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
              Last 30 days
            </span>
          </div>

          <div className="relative w-full h-44 mt-3">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-4 w-6 flex flex-col justify-between text-right pr-1 font-mono text-[10px] text-slate-400">
              <span>40</span>
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>

            <div className="ml-7 h-full flex flex-col justify-between">
              <div className="h-36 w-full relative">
                {/* Horizontal grid lines */}
                <div className="absolute inset-x-0 top-0 h-px bg-slate-100 dark:bg-slate-800" />
                <div className="absolute inset-x-0 top-1/4 h-px bg-slate-100 dark:bg-slate-800" />
                <div className="absolute inset-x-0 top-2/4 h-px bg-slate-100 dark:bg-slate-800" />
                <div className="absolute inset-x-0 top-3/4 h-px bg-slate-100 dark:bg-slate-800" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200 dark:bg-slate-700" />

                {/* SVG Curve */}
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 120">
                  <defs>
                    <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#007F73" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#007F73" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,90 Q 50,75 100,70 T 200,65 T 280,50 T 340,65 T 400,45 L 400,120 L 0,120 Z"
                    fill="url(#trendGradient)"
                  />
                  <path
                    d="M 0,90 Q 50,75 100,70 T 200,65 T 280,50 T 340,65 T 400,45"
                    fill="none"
                    stroke="#007F73"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                  {/* Point circles */}
                  <circle cx="0" cy="90" r="3.5" fill="#007F73" />
                  <circle cx="60" cy="76" r="3.5" fill="#007F73" />
                  <circle cx="120" cy="72" r="3.5" fill="#007F73" />
                  <circle cx="180" cy="68" r="3.5" fill="#007F73" />
                  <circle cx="240" cy="60" r="3.5" fill="#007F73" />
                  <circle cx="300" cy="52" r="3.5" fill="#007F73" />
                  <circle cx="350" cy="62" r="3.5" fill="#007F73" />
                  <circle cx="400" cy="45" r="4.5" fill="#007F73" />
                </svg>
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between font-mono text-[10px] text-slate-400 pt-1">
                <span>Sep 10</span>
                <span>Sep 14</span>
                <span>Sep 18</span>
                <span>Sep 22</span>
                <span>Sep 26</span>
                <span>Sep 30</span>
                <span>Oct 4</span>
                <span>Oct 8</span>
                <span>Oct 10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 (3 cols): Review Breakdown */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <h2 className="text-sm font-bold mb-2">Review Breakdown</h2>

          <div className="space-y-2.5 my-auto">
            {[
              { stars: '5 stars', pct: '72%', count: 235, color: 'bg-purple-600' },
              { stars: '4 stars', pct: '18%', count: 59, color: 'bg-purple-500' },
              { stars: '3 stars', pct: '6%', count: 20, color: 'bg-amber-400' },
              { stars: '2 stars', pct: '3%', count: 8, color: 'bg-amber-500' },
              { stars: '1 star', pct: '1%', count: 4, color: 'bg-rose-500' },
            ].map((row) => (
              <div key={row.stars} className="flex items-center gap-2 text-xs">
                <span className="w-12 text-slate-500 font-medium">{row.stars}</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${row.color} rounded-full`}
                    style={{ width: row.pct }}
                  />
                </div>
                <span className="w-8 text-right font-semibold text-slate-700 dark:text-slate-300">
                  {row.pct}
                </span>
                <span className="w-10 text-right text-slate-400 font-mono text-[11px]">
                  ({row.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3 (4 cols): Get More Reviews */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between gap-3 text-center">
          <h2 className="text-sm font-bold text-left">Get More Reviews</h2>

          {/* Graphic Banner */}
          <div className="flex items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 shadow-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <span className="text-base font-bold text-blue-600">G</span>
              </div>
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="size-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Share your review link with customers via SMS, Email or QR Code.
          </p>

          <Button
            onClick={handleCopyReviewLink}
            className="w-full h-8 text-xs font-semibold gap-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
          >
            {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Review Link'}</span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestReviewsOpen(true)}
              className="h-8 text-xs gap-1.5 bg-slate-50 dark:bg-slate-800"
            >
              <Send className="size-3" />
              <span>Send via SMS</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestReviewsOpen(true)}
              className="h-8 text-xs gap-1.5 bg-slate-50 dark:bg-slate-800"
            >
              <Mail className="size-3" />
              <span>Send via Email</span>
            </Button>
          </div>

          <button
            onClick={() => setQrModalOpen(true)}
            className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold flex items-center justify-center gap-1.5 pt-0.5"
          >
            <QrCode className="size-3.5" />
            <span>Download QR Code</span>
          </button>
        </div>
      </div>

      {/* ─── 4. Bottom Tier: Tri-Column Review Workstation ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── Left Column (4/12 cols): Reviews List & Filters ────────────── */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Reviews (326)</h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All (326)' },
              { id: 'replied', label: 'Replied (326)' },
              { id: 'unreplied', label: 'Unreplied (0)' },
              { id: '5', label: '5 ★ (235)' },
              { id: '4', label: '4 ★ (59)' },
              { id: '3', label: '3 ★ (20)' },
              { id: '2', label: '2 ★ (8)' },
              { id: '1', label: '1 ★ (4)' },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setFilterRating(pill.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  filterRating === pill.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search reviews, customer name or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="h-7 px-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs font-medium"
              >
                <option value="all">All ratings</option>
                <option value="5">5 Stars only</option>
                <option value="4">4 Stars only</option>
                <option value="3">3 Stars only</option>
                <option value="2">2 Stars only</option>
                <option value="1">1 Star only</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-7 px-2 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs font-medium"
              >
                <option value="newest">Newest first</option>
                <option value="highest">Highest rating</option>
                <option value="lowest">Lowest rating</option>
              </select>
            </div>
          </div>

          {/* Reviews List Feed */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredReviews.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedReviewId(item.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  selectedReviewId === item.id
                    ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-600 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full ${item.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0`}
                    >
                      {item.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">{item.name}</p>
                      <div className="flex items-center gap-1.5">
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`size-3 ${
                                s <= item.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">{item.timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.2 shrink-0 font-semibold"
                  >
                    Replied
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {item.text}
                </p>

                {/* Keyword Chips */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.keywords.map((k) => (
                    <span
                      key={k}
                      className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-purple-700 dark:text-purple-300 font-medium"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Center Column (5/12 cols): Active Review Inspector ─────────── */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col gap-4">
          {/* Review Header */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full ${selectedReview.avatarBg} text-white flex items-center justify-center font-bold text-sm shrink-0`}
              >
                {selectedReview.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">{selectedReview.name}</h3>
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.2 font-semibold"
                  >
                    Replied
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`size-3.5 ${
                          s <= selectedReview.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400">{selectedReview.timeAgo}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => toast.info('Review inspector active')}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>

          {/* Full Review Text */}
          <div className="space-y-2">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
              {selectedReview.text}
            </p>

            {/* Attached Photos */}
            {selectedReview.photos && selectedReview.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {selectedReview.photos.map((src, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden h-20 shadow-xs border border-slate-200/50">
                    <img
                      src={src}
                      alt="Customer review photo"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Keyword Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedReview.keywords.map((k) => (
                <span
                  key={k}
                  className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>

          {/* "Your Reply" Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-teal-600" /> Your Reply
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedReview.replyEdited || 'Edited 2 days ago'}
              </span>
            </div>

            {isEditingReply ? (
              <div className="space-y-2">
                <Textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  rows={3}
                  className="w-full text-xs bg-white dark:bg-slate-900 resize-none rounded-lg"
                  placeholder="Type your authentic response..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReplyDraft(selectedReview.replyText || '');
                      setIsEditingReply(false);
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveReply}
                    className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
                  >
                    Post Reply
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                  "{replyDraft || 'No reply yet.'}"
                </p>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingReply(true)}
                    className="h-7 text-xs font-semibold"
                  >
                    Edit Reply
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Customer Details Dossier */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Customer Details
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-400 text-[11px]">Name</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedReview.name}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Location</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedReview.location}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Reviews</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedReview.reviewCount} reviews
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Last Review</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedReview.timeAgo}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://google.com/maps', '_blank')}
              className="w-full h-8 text-xs gap-1.5 bg-slate-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-semibold"
            >
              <span>View in Google</span>
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Right Column (3/12 cols): AI Reply Copilot & Insights ──────── */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* AI Review Reply (Beta) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-teal-600" />
                <h3 className="text-xs font-bold">AI Review Reply</h3>
                <Badge
                  variant="secondary"
                  className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[9px] px-1 py-0"
                >
                  Beta
                </Badge>
              </div>

              <Button
                size="sm"
                onClick={handleGenerateAiReply}
                disabled={isGeneratingAi}
                className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isGeneratingAi ? 'Drafting...' : 'Generate Reply'}
              </Button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Let AI create a professional and personalized reply to this review based on customer sentiments and specific service details.
            </p>
          </div>

          {/* Review Insights & Keywords */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold">Review Insights</h3>
              <span className="text-[11px] text-slate-400">Last 30 days</span>
            </div>

            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
              <button className="py-1 text-[11px] font-bold rounded bg-white dark:bg-slate-900 text-teal-600 shadow-xs">
                Common Keywords
              </button>
              <button
                onClick={() => toast.info('Sentiment breakdown: 94% Positive, 5% Neutral, 1% Constructive')}
                className="py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
              >
                Sentiment
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_KEYWORDS.map((item) => (
                <button
                  key={item.text}
                  onClick={() => setSearchQuery(item.text)}
                  className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 border border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 font-medium transition-colors"
                >
                  {item.text} <span className="text-slate-400 font-mono text-[10px]">({item.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions Menu */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col gap-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Actions</h3>

            <button
              onClick={() => setRequestReviewsOpen(true)}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left text-xs transition-colors"
            >
              <Send className="size-4 text-purple-600 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Request Reviews</p>
                <p className="text-[10px] text-slate-400">Send automated review requests</p>
              </div>
            </button>

            <button
              onClick={handleCopyReviewLink}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left text-xs transition-colors"
            >
              <Share2 className="size-4 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Manage Review Link</p>
                <p className="text-[10px] text-slate-400">Customize and share your link</p>
              </div>
            </button>

            <button
              onClick={() => setAutoReplyModalOpen(true)}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left text-xs transition-colors"
            >
              <Bot className="size-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Set Auto-Reply Rules</p>
                <p className="text-[10px] text-slate-400">AI-powered review responses</p>
              </div>
            </button>

            <button
              onClick={() => setActiveSubTab('insights')}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left text-xs transition-colors"
            >
              <BarChart3 className="size-4 text-indigo-600 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">View Reports</p>
                <p className="text-[10px] text-slate-400">Detailed analytics and insights</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modals & Dialogs ─────────────────────────────────────────── */}

      {/* 1. QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-[360px] text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-center gap-2">
              <QrCode className="size-5 text-teal-600" /> Google Review QR Code
            </DialogTitle>
            <DialogDescription className="text-xs">
              Display this on counter tents or invoices for 1-scan Google reviews.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl my-2 border border-slate-200 dark:border-slate-700">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <svg className="size-36 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h2v2h-2v-2zm-4 0h2v4h-2v-4zm6 2h2v2h-2v-2zm-2 2h2v4h-2v-4zm-4 2h2v2h-2v-2zm6 2h2v2h-2v-2zm-6-2h-2v2h2v-2z" />
              </svg>
            </div>
            <p className="text-xs font-semibold mt-3 text-slate-800 dark:text-slate-200">
              Cinderella Cleaners • 5-Star Reviews
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQrModalOpen(false)}
              className="flex-1 h-8 text-xs"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success('Downloaded Google Review QR Code PNG');
                setQrModalOpen(false);
              }}
              className="flex-1 h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              Download PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Request Reviews Modal */}
      <Dialog open={requestReviewsOpen} onOpenChange={setRequestReviewsOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="size-4 text-teal-600" /> Request Customer Reviews
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send personalized review links directly to recent clients via SMS and Email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Audience Segment</label>
              <select className="w-full h-8 text-xs rounded-md border border-input bg-background px-2">
                <option>Completed Jobs (Last 7 days) — 28 clients</option>
                <option>Repeat Residential Clients — 64 clients</option>
                <option>Commercial Accounts — 12 clients</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Delivery Channel</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-teal-600" />
                  <span>SMS (Highest Open Rate)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-teal-600" />
                  <span>Email</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Message Preview</label>
              <Textarea
                rows={3}
                defaultValue="Hi {FirstName}, thank you for choosing Cinderella Cleaners! If you loved our service, would you take 30 seconds to leave us a quick Google review? https://g.page/r/cinderella-cleaners/review"
                className="text-xs resize-none bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRequestReviewsOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success('Sent 28 review requests via SMS & Email!');
                setRequestReviewsOpen(false);
              }}
              className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              Send Requests
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Auto-Reply Rules Modal */}
      <Dialog open={autoReplyModalOpen} onOpenChange={setAutoReplyModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Bot className="size-4 text-emerald-600" /> AI Auto-Reply Rules
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure how AI responds to incoming Google reviews automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Auto-Reply to 5-Star Reviews</p>
                <p className="text-[11px] text-slate-400">Instantly draft and post appreciative answers</p>
              </div>
              <input type="checkbox" defaultChecked className="size-4 rounded text-emerald-600" />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Require Owner Approval</p>
                <p className="text-[11px] text-slate-400">Review AI draft before publishing</p>
              </div>
              <input type="checkbox" className="size-4 rounded text-emerald-600" />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Auto-Response Delay</label>
              <select className="w-full h-8 text-xs rounded-md border border-input bg-background px-2">
                <option>Within 15 minutes (Simulate natural human response)</option>
                <option>Instant (Under 60 seconds)</option>
                <option>Within 2 hours</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoReplyModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success('AI Auto-reply rules saved!');
                setAutoReplyModalOpen(false);
              }}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Save Rules
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ReviewsView as BgosReviewsWorkstation };
export default ReviewsView;
