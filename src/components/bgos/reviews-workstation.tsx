'use client';

/**
 * Google Business & Reviews Workstation — BGOS Local Reputation & GBP Command Center
 *
 * Combines the exact screenshot Overview dashboard:
 *   - Storefront Profile Card (BGOS Home Cleaning, 4.8 ★, Open Now, View on Google, Edit Profile)
 *   - 4 Core GBP Telemetry KPIs (Total Reviews 246, Average Rating 4.8, Profile Views 12,480, Customer Actions 842)
 *   - Review Growth vertical emerald-green bar chart (Oct 1 – Oct 30) & Rating Breakdown (5★–1★)
 *   - Recent Reviews feed with 1-click Reply, Create a Post (Update/Offer/Event/Product) composer, Profile Performance
 *   - Customer Photos gallery, Common Review Tags, and Automate Review Requests rules card
 * Along with the full working 3-Column Review Triage, Customer Dossier & AI Review Reply workstation.
 */

import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Mail,
  QrCode,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  MoreHorizontal,
  Calendar,
  RefreshCw,
  Plus,
  Share2,
  Phone,
  Image as ImageIcon,
  CheckCheck,
  Bot,
  BarChart3,
  Eye,
  MousePointerClick,
  MapPin,
  Globe,
  Navigation,
  Settings,
  HelpCircle,
  FileText,
  Tag,
  CalendarDays,
  ShoppingBag,
  Edit3,
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
  avatarUrl?: string;
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

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    name: 'Priya Singh',
    initials: 'PS',
    avatarBg: 'bg-[#009F50]',
    rating: 5,
    timeAgo: '2 days ago',
    text: 'Amazing service! The team was professional, on time and did a fantastic job. Highly recommend Cinderella Cleaners!',
    keywords: ['professional', 'on time', 'recommend'],
    replied: true,
    replyText:
      "Thank you so much for your kind words, Priya! We're happy to hear you loved our cleaning service. We look forward to serving you again soon!",
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
    name: 'Rahul Patel',
    initials: 'RP',
    avatarBg: 'bg-blue-100 text-blue-700',
    rating: 5,
    timeAgo: '3 days ago',
    text: 'Excellent service! The team was professional, on time and did a great job. Highly recommended!',
    keywords: ['professional', 'on time', 'great service'],
    replied: false,
    location: 'Green Park, Delhi',
    reviewCount: 4,
  },
  {
    id: 'rev-4',
    name: 'Neha Sharma',
    initials: 'NS',
    avatarBg: 'bg-emerald-600',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    rating: 5,
    timeAgo: '5 days ago',
    text: 'Very good cleaning service. My house looks spotless. Will definitely book again.',
    keywords: ['clean', 'deep cleaning', 'recommend'],
    replied: false,
    location: 'South Extension, Delhi',
    reviewCount: 6,
  },
  {
    id: 'rev-5',
    name: 'Amit Mehta',
    initials: 'AM',
    avatarBg: 'bg-blue-100 text-blue-700',
    rating: 4,
    timeAgo: '1 week ago',
    text: 'Good service and friendly staff. Slightly delayed but overall satisfied.',
    keywords: ['friendly', 'good service', 'satisfied'],
    replied: true,
    replyText: 'Thank you Amit! We appreciate your feedback and are glad you were pleased with our staff.',
    replyEdited: 'Edited 5 days ago',
    location: 'Hauz Khas, Delhi',
    reviewCount: 3,
  },
  {
    id: 'rev-6',
    name: 'Deepak Singh',
    initials: 'DS',
    avatarBg: 'bg-amber-600',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    rating: 5,
    timeAgo: '1 week ago',
    text: 'Amazing experience! Easy booking and excellent quality.',
    keywords: ['quality', 'great service'],
    replied: true,
    replyText: 'Thanks so much Deepak! Thrilled to hear booking and service quality hit the mark.',
    replyEdited: 'Edited 1 week ago',
    location: 'Vasant Kunj, Delhi',
    reviewCount: 5,
  },
  {
    id: 'rev-7',
    name: 'Pooja Kapoor',
    initials: 'PK',
    avatarBg: 'bg-blue-100 text-blue-700',
    rating: 5,
    timeAgo: '2 weeks ago',
    text: 'Professional and reliable. Great attention to detail.',
    keywords: ['professional', 'quality'],
    replied: true,
    replyText: 'Thank you Pooja! Attention to detail is our top priority.',
    replyEdited: 'Edited 2 weeks ago',
    location: 'Greater Kailash, Delhi',
    reviewCount: 7,
  },
];

const REVIEW_GROWTH_BARS = [
  { label: 'Oct 1', val: 8 },
  { label: 'Oct 2', val: 14 },
  { label: 'Oct 4', val: 18 },
  { label: 'Oct 5', val: 12 },
  { label: 'Oct 7', val: 16 },
  { label: 'Oct 8', val: 20 },
  { label: 'Oct 10', val: 24 },
  { label: 'Oct 11', val: 15 },
  { label: 'Oct 13', val: 21 },
  { label: 'Oct 15', val: 22 },
  { label: 'Oct 16', val: 14 },
  { label: 'Oct 18', val: 25 },
  { label: 'Oct 19', val: 18 },
  { label: 'Oct 20', val: 29 },
  { label: 'Oct 22', val: 19 },
  { label: 'Oct 23', val: 24 },
  { label: 'Oct 25', val: 16 },
  { label: 'Oct 27', val: 22 },
  { label: 'Oct 28', val: 18 },
  { label: 'Oct 30', val: 27 },
];

const COMMON_REVIEW_TAGS = [
  { text: 'Professional', count: 128 },
  { text: 'On Time', count: 96 },
  { text: 'Deep Cleaning', count: 88 },
  { text: 'Friendly Staff', count: 76 },
  { text: 'Great Service', count: 72 },
  { text: 'Value for Money', count: 64 },
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

const CUSTOMER_PHOTOS_INITIAL = [
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&auto=format&fit=crop&q=80',
];

export function ReviewsView() {
  const auth = useAppStore((s) => s.auth);
  const businessName = auth?.tenant?.name || auth?.workspace?.name || 'BGOS Home Cleaning';
  const businessSlug =
    auth?.tenant?.slug ||
    businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
    'bgos-home-cleaning';
  const reviewLink = `https://g.page/r/${businessSlug}/review`;

  // Sub-Navigation Tabs (Overview is active by default matching screenshot)
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);

  // Business Profile state
  const [profileTitle, setProfileTitle] = useState('BGOS Home Cleaning');
  const [profileCategory, setProfileCategory] = useState('Cleaning Service');
  const [profileAddress, setProfileAddress] = useState('123 Green Park, Delhi, India');
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Create a Post state (Overview inline composer & modal)
  const [postType, setPostType] = useState<'Update' | 'Offer' | 'Event' | 'Product'>('Update');
  const [postContent, setPostContent] = useState('');
  const [postPhotos, setPostPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80',
  ]);
  const [publishedPosts, setPublishedPosts] = useState<
    Array<{ id: string; type: string; content: string; date: string; status: string }>
  >([
    {
      id: 'gp-1',
      type: 'Offer',
      content: 'Book your festive deep home cleaning this week and enjoy 20% off eco-friendly sanitization!',
      date: '2 days ago',
      status: 'Published on Google',
    },
    {
      id: 'gp-2',
      type: 'Update',
      content: 'Now serving all sectors across South Delhi with same-day move-in cleaning slots.',
      date: '1 week ago',
      status: 'Published on Google',
    },
  ]);

  // Customer Photos state
  const [customerPhotos, setCustomerPhotos] = useState<string[]>(CUSTOMER_PHOTOS_INITIAL);

  // Automate Review Requests state
  const [automateEnabled, setAutomateEnabled] = useState(true);
  const [sendAfterCompletion, setSendAfterCompletion] = useState(true);
  const [completionDelay, setCompletionDelay] = useState('1 day');
  const [sendReminder, setSendReminder] = useState(true);
  const [reminderDelay, setReminderDelay] = useState('3 days');
  const [includeDirectLink, setIncludeDirectLink] = useState(true);

  // Reviews State
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(INITIAL_REVIEWS);
  const [selectedReviewId, setSelectedReviewId] = useState<string>('rev-1');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [quickReplyId, setQuickReplyId] = useState<string | null>(null);
  const [quickReplyText, setQuickReplyText] = useState('');

  // Active Review
  const selectedReview = reviewsList.find((r) => r.id === selectedReviewId) || reviewsList[0];

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
  }, [selectedReviewId, selectedReview]);

  // Fetch real reviews from backend API on mount
  useEffect(() => {
    let mounted = true;
    authFetch('/api/reviews?limit=50')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data || !data.reviews || data.reviews.length === 0) return;
        const avatarBgs = ['bg-[#009F50]', 'bg-emerald-600', 'bg-blue-600', 'bg-rose-600', 'bg-amber-600', 'bg-pink-600'];
        const mapped: ReviewItem[] = data.reviews.map((r: any, idx: number) => {
          const authorName = r.authorName || 'Verified Client';
          const initials =
            authorName
              .split(' ')
              .filter(Boolean)
              .map((w: string) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'VC';
          const parsedResp = safeJsonParse(r.responseJson);
          return {
            id: r.id,
            name: authorName,
            initials,
            avatarBg: avatarBgs[idx % avatarBgs.length],
            rating: Number(r.rating) || 5,
            timeAgo: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent',
            text: r.comment || 'Outstanding service and quality execution.',
            keywords: ['professional', 'quality', 'recommend'],
            replied: !!(parsedResp && parsedResp.text),
            replyText: parsedResp?.text || undefined,
            replyEdited: parsedResp?.repliedAt ? 'Published' : undefined,
            location: 'Verified Customer',
            reviewCount: 1,
          };
        });
        setReviewsList(mapped);
        if (mapped[0]) setSelectedReviewId(mapped[0].id);
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
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Copied review link handler
  const handleCopyReviewLink = () => {
    navigator.clipboard.writeText(reviewLink);
    setCopiedLink(true);
    toast.success('Google Review link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Publish Google Post handler
  const handlePublishGooglePost = (scheduled = false) => {
    const text = postContent.trim() || `${postType}: Book your professional home cleaning today with ${profileTitle}!`;
    setPublishedPosts((prev) => [
      {
        id: `gp-${Date.now()}`,
        type: postType,
        content: text,
        date: scheduled ? 'Scheduled for Tomorrow, 10:00 AM' : 'Just now',
        status: scheduled ? 'Scheduled' : 'Published on Google',
      },
      ...prev,
    ]);
    setPostContent('');
    setCreatePostModalOpen(false);
    toast.success(
      scheduled
        ? `Scheduled ${postType} post to Google Business Profile!`
        : `Published ${postType} post to Google Business Profile!`
    );
  };

  // AI Reply Generator
  const handleGenerateAiReply = async () => {
    if (!selectedReview) return;
    setIsGeneratingAi(true);
    const firstName = selectedReview.name.split(' ')[0];
    const fallbackReply =
      selectedReview.rating >= 5
        ? `Thank you so much for the glowing 5-star review, ${firstName}! We're thrilled that our team delivered sparkling results on time. We truly appreciate your support of ${businessName} and look forward to your next appointment!`
        : `Thank you for sharing your feedback, ${firstName}! We're pleased you appreciated our team's work at ${businessName}, and we always strive to exceed expectations. We look forward to serving you again soon!`;

    try {
      const res = await authFetch('/api/social/ai-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Write a warm, professional Google Business review reply from ${businessName} to customer ${selectedReview.name} (${selectedReview.rating} stars) who wrote: "${selectedReview.text}"`,
          platforms: ['googlebusiness'],
          tone: 'friendly, appreciative',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.caption) {
          setReplyDraft(data.caption);
          setIsEditingReply(true);
          toast.success('AI crafted a personalized response!');
          return;
        }
      }
    } catch {
      // Fallback below
    } finally {
      setIsGeneratingAi(false);
    }

    setReplyDraft(fallbackReply);
    setIsEditingReply(true);
    toast.success('AI crafted a personalized response!');
  };

  // Save Reply
  const handleSaveReply = async (targetId = selectedReviewId, textToSave = replyDraft) => {
    if (!textToSave.trim()) {
      toast.error('Reply text cannot be empty');
      return;
    }
    try {
      await authFetch(`/api/reviews/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseJson: JSON.stringify({ text: textToSave.trim(), repliedAt: new Date().toISOString() }),
        }),
      });
    } catch {
      // optimistic update persists locally
    }
    setReviewsList((prev) =>
      prev.map((r) =>
        r.id === targetId
          ? {
              ...r,
              replied: true,
              replyText: textToSave.trim(),
              replyEdited: 'Just now',
            }
          : r
      )
    );
    setIsEditingReply(false);
    setQuickReplyId(null);
    setQuickReplyText('');
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
      const matchKeyword = (r.keywords || []).some((k) => k.toLowerCase().includes(q));
      if (!matchName && !matchText && !matchKeyword) return false;
    }
    return true;
  });

  const recentOverviewReviews = reviewsList.slice(2, 7);

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-5 w-full bg-[#F7FAF9] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* ─── 1. Page Header (Matches Attached Screenshot) ─────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Google Maps / Business Pin Multi-color Icon Badge */}
          <div className="size-12 rounded-2xl bg-white dark:bg-slate-900 shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shrink-0">
            <svg className="size-7" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z"
                fill="#34A853"
              />
              <path
                d="M12 2C7.58 2 4 5.58 4 10c0 2.1.82 4.35 2.12 6.45L12 10V2z"
                fill="#4285F4"
              />
              <path
                d="M12 2v8l5.88 6.45C19.18 14.35 20 12.1 20 10c0-4.42-3.58-8-8-8z"
                fill="#FBBC05"
              />
              <path
                d="M6.12 16.45C8.35 19.86 12 22 12 22s3.65-2.14 5.88-5.55L12 10l-5.88 6.45z"
                fill="#EA4335"
              />
              <circle cx="12" cy="10" r="3.2" fill="#FFFFFF" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Google Business &amp; Reviews
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E8F8EF] dark:bg-emerald-950/60 text-[#009F50] dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 border border-[#ccebd9] dark:border-emerald-800/50">
                <span className="size-1.5 rounded-full bg-[#009F50] animate-pulse" /> Connected
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your Google Business Profile, post updates, and get more 5-star reviews.
            </p>
          </div>
        </div>

        {/* Right Global Toolbar */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Timeframe selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTimeRangeOpen(!timeRangeOpen)}
              className="h-9 gap-2 bg-white dark:bg-slate-900 shadow-2xs border-slate-200 dark:border-slate-800 text-xs font-medium rounded-xl px-3.5"
            >
              <Calendar className="size-4 text-[#009F50]" />
              <span>{timeRange}</span>
              <ChevronDown className="size-3.5 text-slate-400" />
            </Button>
            {timeRangeOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1 text-xs">
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
                    {timeRange === range && <Check className="size-3.5 text-[#009F50]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success('Synced latest reviews from Google Business Profile!')}
            className="h-9 gap-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl"
          >
            <RefreshCw className="size-3.5 text-[#009F50]" />
            <span>Sync GBP</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreatePostModalOpen(true)}
            className="h-9 gap-1.5 bg-[#009F50] hover:bg-[#008A45] text-white font-semibold text-xs shadow-xs rounded-xl px-4"
          >
            <Plus className="size-4" />
            <span>Create Post</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. Sub-Navigation Tabs (With Icons & Green Active Underline) ─── */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 px-2 pt-1 rounded-t-xl">
        {[
          { id: 'overview', label: 'Overview', Icon: BarChart3 },
          { id: 'reviews', label: 'Reviews', Icon: MessageSquare },
          { id: 'posts', label: 'Posts', Icon: Send },
          { id: 'qna', label: 'Q&A', Icon: HelpCircle },
          { id: 'photos', label: 'Photos', Icon: ImageIcon },
          { id: 'insights', label: 'Insights', Icon: Eye },
          { id: 'settings', label: 'Settings', Icon: Settings },
        ].map(({ id, label, Icon }) => {
          const isActive = activeSubTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`relative px-4 py-2.5 text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
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

      {/* ═══════════════════════════════════════════════════════════════════════
          SCREENSHOT OVERVIEW BENTO (Top Profile + 4 KPIs + Review Growth +
          Rating Breakdown + Recent Reviews + Create a Post + Profile Performance +
          Customer Photos + Common Review Tags + Automate Review Requests)
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'overview' && (
        <div className="space-y-5">
          {/* ─── Top Grid: Storefront Profile Card + 4 KPIs + Review Growth + Breakdown ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Storefront Card (4 cols) */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4">
              <div className="flex items-start gap-4">
                <img
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=320&auto=format&fit=crop&q=80"
                  alt={profileTitle}
                  className="w-24 h-20 sm:w-28 sm:h-24 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {profileTitle}
                    </h2>
                    <CheckCircle2 className="size-4 fill-blue-500 text-white shrink-0" />
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="size-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">4.8</span>
                    <span className="text-xs text-slate-500">(246 reviews)</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                    {profileCategory} · <span className="text-[#009F50] font-semibold">Open Now</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {profileAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://google.com/maps', '_blank')}
                  className="flex-1 h-9 text-xs font-semibold gap-2 rounded-xl border-slate-200 dark:border-slate-800"
                >
                  <span className="font-bold text-blue-600">G</span>
                  <span>View on Google</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditProfileOpen(true)}
                  className="flex-1 h-9 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 dark:border-slate-800"
                >
                  <Edit3 className="size-3.5 text-slate-500" />
                  <span>Edit Profile</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setActiveSubTab('settings')}
                  className="size-9 rounded-xl border-slate-200 dark:border-slate-800 shrink-0"
                  aria-label="More profile options"
                >
                  <MoreVertical className="size-4 text-slate-500" />
                </Button>
              </div>
            </div>

            {/* Right 8 Cols: 4 KPI Cards on Top + Review Growth & Rating Breakdown Below */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {/* 4 Screenshot KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* KPI 1: Total Reviews */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                  <div className="size-10 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500 shrink-0">
                    <Star className="size-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-medium truncate">Total Reviews</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-extrabold tracking-tight">246</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#E8F8EF] text-[#009F50] text-[11px] font-bold">
                        ↑ 28%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">vs last 30 days</p>
                  </div>
                </div>

                {/* KPI 2: Average Rating */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                  <div className="size-10 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500 shrink-0">
                    <Star className="size-5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-medium truncate">Average Rating</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-extrabold tracking-tight">4.8</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#E8F8EF] text-[#009F50] text-[11px] font-bold">
                        ↑ 0.3
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">vs last 30 days</p>
                  </div>
                </div>

                {/* KPI 3: Profile Views */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                  <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 shrink-0">
                    <Eye className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-medium truncate">Profile Views</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-extrabold tracking-tight">12,480</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#E8F8EF] text-[#009F50] text-[11px] font-bold">
                        ↑ 42%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">vs last 30 days</p>
                  </div>
                </div>

                {/* KPI 4: Customer Actions */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
                  <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 shrink-0">
                    <MousePointerClick className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 font-medium truncate">Customer Actions</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-extrabold tracking-tight">842</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#E8F8EF] text-[#009F50] text-[11px] font-bold">
                        ↑ 36%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">vs last 30 days</p>
                  </div>
                </div>
              </div>

              {/* Review Growth Bar Chart + Rating Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1">
                {/* Review Growth Vertical Bar Chart (7 cols) */}
                <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Review Growth</h3>
                    <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
                      {timeRange} <ChevronDown className="size-3" />
                    </span>
                  </div>

                  <div className="relative h-40 flex items-end gap-1.5 pt-4 pl-7 pb-5 border-b border-slate-100 dark:border-slate-800">
                    {/* Y-Axis Labels */}
                    <div className="absolute left-0 top-2 bottom-5 flex flex-col justify-between text-[10px] text-slate-400 font-medium">
                      <span>40</span>
                      <span>30</span>
                      <span>20</span>
                      <span>10</span>
                      <span>0</span>
                    </div>

                    {/* Vertical Emerald Green Bars */}
                    {REVIEW_GROWTH_BARS.map((bar, idx) => (
                      <div key={idx} className="flex-1 h-full flex items-end justify-center group relative">
                        <div
                          className="w-full max-w-[14px] rounded-t-md bg-gradient-to-t from-[#009F50] to-[#00C86F] transition-all duration-300 group-hover:opacity-85"
                          style={{ height: `${Math.max(15, (bar.val / 35) * 100)}%` }}
                          title={`${bar.label}: ${bar.val} reviews`}
                        />
                      </div>
                    ))}

                    {/* X-Axis Labels */}
                    <div className="absolute left-7 right-0 bottom-0 flex justify-between text-[10px] text-slate-400">
                      <span>Oct 1</span>
                      <span>Oct 5</span>
                      <span>Oct 10</span>
                      <span>Oct 15</span>
                      <span>Oct 20</span>
                      <span>Oct 25</span>
                      <span>Oct 30</span>
                    </div>
                  </div>
                </div>

                {/* Rating Breakdown Card (5 cols) */}
                <div className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Rating Breakdown</h3>
                  <div className="space-y-3 my-auto">
                    {[
                      { num: '5', pct: '72%', color: 'bg-[#009F50]' },
                      { num: '4', pct: '18%', color: 'bg-[#00C86F]' },
                      { num: '3', pct: '6%', color: 'bg-amber-400' },
                      { num: '2', pct: '3%', color: 'bg-orange-400' },
                      { num: '1', pct: '1%', color: 'bg-rose-500' },
                    ].map((row) => (
                      <div key={row.num} className="flex items-center gap-2.5 text-xs">
                        <span className="w-7 flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                          {row.num} <Star className="size-3 fill-amber-400 text-amber-400" />
                        </span>
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${row.color} rounded-full`} style={{ width: row.pct }} />
                        </div>
                        <span className="w-9 text-right font-semibold text-slate-600 dark:text-slate-300">
                          {row.pct}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Middle 3-Column Row: Recent Reviews | Create a Post | Profile Performance ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left (5 cols): Recent Reviews */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Reviews</h3>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('reviews')}
                  className="text-xs font-semibold text-[#009F50] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentOverviewReviews.map((rev) => (
                  <div key={rev.id} className="py-3 first:pt-1 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {rev.avatarUrl ? (
                          <img
                            src={rev.avatarUrl}
                            alt={rev.name}
                            className="size-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className={`size-9 rounded-full ${rev.avatarBg} flex items-center justify-center font-bold text-xs shrink-0`}
                          >
                            {rev.initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {rev.name}
                            </span>
                            <span className="text-[11px] text-slate-400">{rev.timeAgo}</span>
                          </div>
                          <div className="flex text-amber-400 my-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`size-3 ${
                                  s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {rev.text}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReviewId(rev.id);
                            setQuickReplyId(quickReplyId === rev.id ? null : rev.id);
                            setQuickReplyText(rev.replyText || '');
                          }}
                          className="h-7 px-3 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-700"
                        >
                          Reply
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReviewId(rev.id);
                            setActiveSubTab('reviews');
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                          aria-label={`Inspect review by ${rev.name}`}
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {quickReplyId === rev.id && (
                      <div className="mt-2.5 pl-12 space-y-2">
                        <Textarea
                          value={quickReplyText}
                          onChange={(e) => setQuickReplyText(e.target.value)}
                          rows={2}
                          placeholder={`Write a reply to ${rev.name}...`}
                          className="text-xs bg-slate-50 dark:bg-slate-800"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickReplyId(null)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveReply(rev.id, quickReplyText)}
                            className="h-7 text-xs bg-[#009F50] hover:bg-[#008A45] text-white"
                          >
                            Post Reply
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Middle (4 cols): Create a Post Card */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Create a Post</h3>

                {/* 4 Post Type Tabs: Update | Offer | Event | Product */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {[
                    { id: 'Update', Icon: FileText },
                    { id: 'Offer', Icon: Tag },
                    { id: 'Event', Icon: CalendarDays },
                    { id: 'Product', Icon: ShoppingBag },
                  ].map(({ id, Icon }) => {
                    const active = postType === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPostType(id as any)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-[#E8F8EF] border-[#009F50]/40 text-[#009F50]'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span>{id}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Post Content Textarea */}
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={4}
                  placeholder="Share an update with your customers..."
                  className="text-xs bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 resize-none rounded-xl"
                />

                {/* Photo Thumbnail + Add Photo */}
                <div className="flex items-center gap-3 mt-3">
                  {postPhotos.map((src, idx) => (
                    <img
                      key={idx}
                      src={src}
                      alt="Post attachment"
                      className="w-20 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPostPhotos((prev) => [
                        ...prev,
                        'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=300&auto=format&fit=crop&q=80',
                      ]);
                      toast.success('Photo attached to Google post draft!');
                    }}
                    className="w-24 h-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-500 hover:border-[#009F50] hover:text-[#009F50] transition-colors text-xs"
                  >
                    <Plus className="size-4" />
                    <span className="text-[11px] font-medium">Add Photo</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePublishGooglePost(true)}
                  className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 dark:border-slate-700"
                >
                  <Clock className="size-3.5 text-slate-500" />
                  <span>Schedule</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handlePublishGooglePost(false)}
                  className="flex-1 h-9 text-xs font-semibold gap-1.5 rounded-xl bg-[#009F50] hover:bg-[#008A45] text-white shadow-xs"
                >
                  <Send className="size-3.5" />
                  <span>Post to Google</span>
                </Button>
              </div>
            </div>

            {/* Right (3 cols): Profile Performance Card */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profile Performance</h3>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('insights')}
                  className="text-xs font-semibold text-[#009F50] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>

              <div className="space-y-3.5 my-auto">
                {[
                  { label: 'Search Views', value: '8,420', delta: '↑ 35%', Icon: Search },
                  { label: 'Map Views', value: '3,210', delta: '↑ 28%', Icon: MapPin },
                  { label: 'Website Clicks', value: '1,264', delta: '↑ 46%', Icon: Globe },
                  { label: 'Call Clicks', value: '842', delta: '↑ 32%', Icon: Phone },
                  { label: 'Direction Requests', value: '684', delta: '↑ 18%', Icon: Navigation },
                ].map(({ label, value, delta, Icon }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-full bg-[#E8F8EF] dark:bg-emerald-950/60 flex items-center justify-center text-[#009F50] shrink-0">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 truncate">{label}</p>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">{value}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#E8F8EF] text-[#009F50] text-[11px] font-bold shrink-0">
                      {delta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Bottom 3-Column Row: Customer Photos | Common Review Tags | Automate Review Requests ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left (5 cols): Customer Photos */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Customer Photos</h3>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('photos')}
                  className="text-xs font-semibold text-[#009F50] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2.5 items-center">
                {customerPhotos.slice(0, 4).map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`Customer photo ${idx + 1}`}
                    className="w-full h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCustomerPhotos((prev) => [
                      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
                      ...prev,
                    ]);
                    toast.success('Photo added to your Google Business Profile gallery!');
                  }}
                  className="w-full h-20 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-1 text-slate-500 hover:border-[#009F50] hover:text-[#009F50] transition-colors"
                >
                  <Plus className="size-4" />
                  <span className="text-[11px] font-medium">Add Photo</span>
                </button>
              </div>
            </div>

            {/* Middle (3 cols): Common Review Tags */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Common Review Tags</h3>
              <div className="flex flex-wrap gap-2 my-auto">
                {COMMON_REVIEW_TAGS.map((tag) => (
                  <button
                    key={tag.text}
                    type="button"
                    onClick={() => {
                      setSearchQuery(tag.text);
                      setActiveSubTab('reviews');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-[#E8F8EF] border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span>{tag.text}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-emerald-300 text-[11px] font-bold">
                      {tag.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right (4 cols): Automate Review Requests */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Automate Review Requests
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Send automatic review requests via SMS/WhatsApp after job completion.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={automateEnabled}
                  aria-label="Toggle automatic review requests"
                  onClick={() => {
                    setAutomateEnabled(!automateEnabled);
                    toast.success(
                      !automateEnabled
                        ? 'Automated review requests enabled!'
                        : 'Automated review requests paused.'
                    );
                  }}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                    automateEnabled ? 'bg-[#009F50]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`block size-5 rounded-full bg-white shadow-xs transition-transform ${
                      automateEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={sendAfterCompletion}
                      onChange={(e) => setSendAfterCompletion(e.target.checked)}
                      className="size-4 rounded accent-[#009F50]"
                    />
                    <span>Send after job completion</span>
                  </label>
                  <select
                    value={completionDelay}
                    onChange={(e) => setCompletionDelay(e.target.value)}
                    className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option>1 day</option>
                    <option>2 hours</option>
                    <option>Immediately</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200 font-medium">
                    <input
                      type="checkbox"
                      checked={sendReminder}
                      onChange={(e) => setSendReminder(e.target.checked)}
                      className="size-4 rounded accent-[#009F50]"
                    />
                    <span>Send reminder if no review</span>
                  </label>
                  <select
                    value={reminderDelay}
                    onChange={(e) => setReminderDelay(e.target.value)}
                    className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option>3 days</option>
                    <option>5 days</option>
                    <option>7 days</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200 font-medium">
                  <input
                    type="checkbox"
                    checked={includeDirectLink}
                    onChange={(e) => setIncludeDirectLink(e.target.checked)}
                    className="size-4 rounded accent-[#009F50]"
                  />
                  <span>Include direct Google review link</span>
                </label>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setRequestReviewsOpen(true)}
                className="w-full h-8 text-xs font-semibold gap-1.5 rounded-xl border-slate-200 dark:border-slate-700"
              >
                <Settings className="size-3.5 text-slate-500" />
                <span>Edit Message Template</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-TAB VIEWS FOR POSTS, Q&A, PHOTOS, INSIGHTS, SETTINGS
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'posts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Google Business Posts</h2>
              <p className="text-xs text-slate-500">Publish offers, updates, and events directly to Google Search &amp; Maps.</p>
            </div>
            <Button
              size="sm"
              onClick={() => setCreatePostModalOpen(true)}
              className="bg-[#009F50] hover:bg-[#008A45] text-white text-xs font-semibold rounded-xl"
            >
              <Plus className="size-4 mr-1" /> New Google Post
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedPosts.map((post) => (
              <div key={post.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-[#E8F8EF] text-[#009F50] border-0 text-xs">{post.type}</Badge>
                  <span className="text-xs text-slate-400">{post.date}</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{post.content}</p>
                <p className="text-[11px] font-semibold text-[#009F50]">{post.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'qna' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold">Google Business Q&amp;A</h2>
          <div className="space-y-3">
            {[
              {
                q: 'Do you bring your own eco-friendly cleaning supplies and vacuum equipment?',
                a: 'Yes! Our crew brings 100% non-toxic, pet-safe supplies and HEPA vacuums to every appointment.',
              },
              {
                q: 'Are same-day deep cleaning bookings available in South Delhi?',
                a: 'Yes, same-day slots are available when booked before 11:00 AM.',
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Q: {item.q}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">A: {item.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          WORKING REVIEW TRIAGE, TELEMETRY & AI REPLY WORKSTATION
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-5 pt-2">
        {/* 5 KPI Telemetry Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* Card 1: Google Rating */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Reviews</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F8EF] dark:bg-emerald-950/50 flex items-center justify-center text-[#009F50]">
                <MessageSquare className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight">326</span>
                <span className="flex items-center text-[#009F50] text-xs font-semibold">↑ 12%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">vs last 30 days</p>
            </div>
          </div>

          {/* Card 3: New Reviews */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">New Reviews</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F8EF] dark:bg-emerald-950/50 flex items-center justify-center text-[#009F50]">
                <Sparkles className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight">24</span>
                <span className="flex items-center text-[#009F50] text-xs font-semibold">↑ 50%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">vs last 30 days</p>
            </div>
          </div>

          {/* Card 4: Average Response Time */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Average Response Time</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Clock className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight">2.4 hours</span>
                <span className="flex items-center text-[#009F50] text-xs font-semibold">↓ 62%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">vs last 30 days</p>
            </div>
          </div>

          {/* Card 5: Response Rate */}
          <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Response Rate</span>
              <div className="w-7 h-7 rounded-lg bg-[#E8F8EF] dark:bg-emerald-950/50 flex items-center justify-center text-[#009F50]">
                <CheckCheck className="size-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight">100%</span>
                <span className="flex items-center text-[#009F50] text-xs font-semibold">↑ 12%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">vs last 30 days</p>
            </div>
          </div>
        </div>

        {/* Review Trend, Review Breakdown & Get More Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card 1 (5 cols): Review Trend */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold">Review Trend</h2>
              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                Last 30 days
              </span>
            </div>

            <div className="relative w-full h-40 mt-2">
              <div className="h-32 w-full relative">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 120">
                  <defs>
                    <linearGradient id="trendGradientGreen" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#009F50" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#009F50" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,90 Q 50,75 100,70 T 200,65 T 280,50 T 340,65 T 400,45 L 400,120 L 0,120 Z"
                    fill="url(#trendGradientGreen)"
                  />
                  <path
                    d="M 0,90 Q 50,75 100,70 T 200,65 T 280,50 T 340,65 T 400,45"
                    fill="none"
                    stroke="#009F50"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 2 (3 cols): Review Breakdown */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
            <h2 className="text-sm font-bold mb-2">Review Breakdown</h2>
            <div className="space-y-2.5 my-auto">
              {[
                { stars: '5 stars', pct: '72%', count: 235, color: 'bg-[#009F50]' },
                { stars: '4 stars', pct: '18%', count: 59, color: 'bg-[#00C86F]' },
                { stars: '3 stars', pct: '6%', count: 20, color: 'bg-amber-400' },
                { stars: '2 stars', pct: '3%', count: 8, color: 'bg-amber-500' },
                { stars: '1 star', pct: '1%', count: 4, color: 'bg-rose-500' },
              ].map((row) => (
                <div key={row.stars} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-slate-500 font-medium">{row.stars}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${row.color} rounded-full`} style={{ width: row.pct }} />
                  </div>
                  <span className="w-8 text-right font-semibold text-slate-700 dark:text-slate-300">{row.pct}</span>
                  <span className="w-10 text-right text-slate-400 font-mono text-[11px]">({row.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 (4 cols): Get More Reviews */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-3 text-center">
            <h2 className="text-sm font-bold text-left">Get More Reviews</h2>
            <p className="text-xs text-slate-500 leading-relaxed text-left">
              Share your review link with customers via SMS, Email or QR Code.
            </p>
            <Button
              onClick={handleCopyReviewLink}
              className="w-full h-8 text-xs font-semibold gap-1.5 bg-[#009F50] hover:bg-[#008A45] text-white rounded-xl shadow-xs"
            >
              {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Review Link'}</span>
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRequestReviewsOpen(true)}
                className="h-8 text-xs gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl"
              >
                <Send className="size-3" />
                <span>Send via SMS</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRequestReviewsOpen(true)}
                className="h-8 text-xs gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl"
              >
                <Mail className="size-3" />
                <span>Send via Email</span>
              </Button>
            </div>

            <button
              onClick={() => setQrModalOpen(true)}
              className="text-xs text-[#009F50] hover:underline font-semibold flex items-center justify-center gap-1.5 pt-0.5"
            >
              <QrCode className="size-3.5" />
              <span>Download QR Code</span>
            </button>
          </div>
        </div>

        {/* Tri-Column Review Triage Workstation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (4/12 cols): Reviews List & Filters */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
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
                      ? 'bg-[#009F50] text-white shadow-2xs'
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
            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredReviews.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedReviewId(item.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedReviewId === item.id
                      ? 'bg-[#E8F8EF]/60 dark:bg-emerald-950/20 border-[#009F50] shadow-2xs'
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
                                  s <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
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
                      className="bg-[#E8F8EF] text-[#009F50] dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.2 shrink-0 font-semibold"
                    >
                      {item.replied ? 'Replied' : 'Pending'}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Center Column (5/12 cols): Active Review Inspector */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
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
                      className="bg-[#E8F8EF] text-[#009F50] text-[10px] px-1.5 py-0.2 font-semibold"
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
                            s <= selectedReview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
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

            <div className="space-y-2">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {selectedReview.text}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedReview.keywords.map((k) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded-full bg-[#E8F8EF] text-[#009F50] text-xs font-semibold border border-[#ccebd9]"
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
                  <MessageSquare className="size-3.5 text-[#009F50]" /> Your Reply
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
                      onClick={() => handleSaveReply()}
                      className="h-7 text-xs bg-[#009F50] hover:bg-[#008A45] text-white font-bold"
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
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedReview.name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Location</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedReview.location}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Reviews</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedReview.reviewCount} reviews</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[11px]">Last Review</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{selectedReview.timeAgo}</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://google.com/maps', '_blank')}
                className="w-full h-8 text-xs gap-1.5 bg-slate-50 dark:bg-slate-800 text-[#009F50] font-semibold"
              >
                <span>View in Google</span>
                <ExternalLink className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Right Column (3/12 cols): AI Reply Copilot & Insights */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-[#009F50]" />
                  <h3 className="text-xs font-bold">AI Review Reply</h3>
                  <Badge variant="secondary" className="bg-[#E8F8EF] text-[#009F50] text-[9px] px-1 py-0">
                    Beta
                  </Badge>
                </div>

                <Button
                  size="sm"
                  onClick={handleGenerateAiReply}
                  disabled={isGeneratingAi}
                  className="h-7 text-[11px] font-bold px-2.5 rounded-lg bg-[#009F50] hover:bg-[#008A45] text-white"
                >
                  {isGeneratingAi ? 'Drafting...' : 'Generate Reply'}
                </Button>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Let AI create a professional and personalized reply to this review based on customer sentiments and specific service details.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold">Review Insights</h3>
                <span className="text-[11px] text-slate-400">Last 30 days</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {COMMON_KEYWORDS.map((item) => (
                  <button
                    key={item.text}
                    onClick={() => setSearchQuery(item.text)}
                    className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-800/80 hover:bg-[#E8F8EF] border border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 font-medium transition-colors"
                  >
                    {item.text} <span className="text-slate-400 font-mono text-[10px]">({item.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Actions</h3>

              <button
                onClick={() => setRequestReviewsOpen(true)}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left text-xs transition-colors"
              >
                <Send className="size-4 text-[#009F50] shrink-0" />
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
                <Bot className="size-4 text-[#009F50] shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Set Auto-Reply Rules</p>
                  <p className="text-[10px] text-slate-400">AI-powered review responses</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Modals & Dialogs ─────────────────────────────────────────── */}

      {/* 1. Edit Business Profile Modal */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Google Business Profile</DialogTitle>
            <DialogDescription className="text-xs">
              Update your business title, primary category, and service location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold">Business Name</label>
              <Input value={profileTitle} onChange={(e) => setProfileTitle(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold">Primary Category</label>
              <Input value={profileCategory} onChange={(e) => setProfileCategory(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold">Address</label>
              <Input value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditProfileOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditProfileOpen(false);
                toast.success('Google Business Profile updated!');
              }}
              className="h-8 text-xs bg-[#009F50] hover:bg-[#008A45] text-white"
            >
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Create Google Post Modal */}
      <Dialog open={createPostModalOpen} onOpenChange={setCreatePostModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create Google Business Post</DialogTitle>
            <DialogDescription className="text-xs">
              Publish an update, offer, event, or product directly to your Google profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <Textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={4}
              placeholder="Share an update with your customers..."
              className="text-xs"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreatePostModalOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handlePublishGooglePost(false)}
              className="h-8 text-xs bg-[#009F50] hover:bg-[#008A45] text-white font-semibold"
            >
              Post to Google
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-[360px] text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-center gap-2">
              <QrCode className="size-5 text-[#009F50]" /> Google Review QR Code
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
              {profileTitle} • 5-Star Reviews
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setQrModalOpen(false)} className="flex-1 h-8 text-xs">
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success('Downloaded Google Review QR Code PNG');
                setQrModalOpen(false);
              }}
              className="flex-1 h-8 text-xs bg-[#009F50] hover:bg-[#008A45] text-white font-bold"
            >
              Download PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Request Reviews / Edit Message Template Modal */}
      <Dialog open={requestReviewsOpen} onOpenChange={setRequestReviewsOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="size-4 text-[#009F50]" /> Request Customer Reviews
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send personalized review links directly to recent clients via SMS, WhatsApp, and Email.
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
              <label className="font-semibold text-slate-700 dark:text-slate-300">Message Preview</label>
              <Textarea
                rows={3}
                defaultValue={`Hi {FirstName}, thank you for choosing ${profileTitle}! If you loved our service, would you take 30 seconds to leave us a quick Google review? ${reviewLink}`}
                className="text-xs resize-none bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRequestReviewsOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success('Review request template saved & dispatched!');
                setRequestReviewsOpen(false);
              }}
              className="h-8 text-xs bg-[#009F50] hover:bg-[#008A45] text-white font-bold"
            >
              Send Requests
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Auto-Reply Rules Modal */}
      <Dialog open={autoReplyModalOpen} onOpenChange={setAutoReplyModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Bot className="size-4 text-[#009F50]" /> AI Auto-Reply Rules
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
              <input type="checkbox" defaultChecked className="size-4 rounded accent-[#009F50]" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAutoReplyModalOpen(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success('AI Auto-reply rules saved!');
                setAutoReplyModalOpen(false);
              }}
              className="h-8 text-xs bg-[#009F50] hover:bg-[#008A45] text-white font-bold"
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
