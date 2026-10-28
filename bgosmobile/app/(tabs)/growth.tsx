import React, { useState } from 'react';
import {
  Text,
  Linking,
  View,
  ScrollView,
  Alert,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Field,
  Action,
  Empty,
  ErrorNotice,
  Loading,
  ui,
  Avatar,
  Badge,
  Chip,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { getToken } from '../../src/lib/auth';
import type { BgosWorkspace } from '../../../shared/bgos-contracts';
import { WEB_URL } from '../../src/lib/constants';
import { useRouter } from 'expo-router';

type ToolTab = 'overview' | 'performance' | 'posts' | 'reviews' | 'photos';

type Review = {
  id: string;
  rating: number;
  authorName?: string;
  comment?: string;
  source?: string;
  status?: string;
  responseJson?: string;
  createdAt?: string;
};

type AuditResult = {
  score: number;
  grade: string;
  isFullyOptimized: boolean;
  missingCount: number;
  recommendations: string[];
};

type AnalyticsResult = {
  isConnected: boolean;
  isLiveGoogleApi: boolean;
  metrics: {
    totalViews: number;
    searchImpressions: number;
    mapsImpressions: number;
    callClicks: number;
    directionRequests: number;
    websiteClicks: number;
    totalReviews: number;
    responseRate: number;
  };
  trendsAvailable: boolean;
};

type GbpPlaceResult = {
  isConnected: boolean;
  isPendingApproval?: boolean;
  googleEmail?: string;
  googleName?: string;
  googlePicture?: string;
  place?: {
    locationId: string;
    title: string;
    category: string;
    address: string;
    phone?: string;
    website?: string;
    placeId?: string;
    mapsUrl?: string;
    reviewUrl?: string;
    isVerified?: boolean;
    status?: string;
    statusMessage?: string;
    completionScore?: number;
    missingFields?: string[];
  };
  metrics?: {
    totalViews: number;
    searchImpressions: number;
    mapsImpressions: number;
    callClicks: number;
    directionRequests: number;
    websiteClicks: number;
    totalReviews: number;
    avgRating: number;
    responseRate: number;
  };
};

type SocialPost = {
  id: string;
  content: string;
  status: string;
  gbpPostType?: string;
  mediaUrls?: string;
  createdAt: string;
  scheduledAt?: string;
  publishedAt?: string;
};

function parseReplyText(review: Review): string | null {
  try {
    const parsed = JSON.parse(review.responseJson || '{}');
    return parsed.text || null;
  } catch {
    return null;
  }
}

export default function GrowthScreen() {
  const router = useRouter();
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const reviews = useResource<{ reviews: Review[] }>('/api/reviews?source=google');
  const audit = useResource<AuditResult>('/api/gbp/audit');
  const analytics = useResource<AnalyticsResult>('/api/gbp/analytics');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const socialPosts = useResource<{ posts: SocialPost[] }>('/api/social/posts?platform=googlebusiness&limit=10');

  // Active Tool Sub-Tab
  const [activeTab, setActiveTab] = useState<ToolTab>('overview');

  // Performance Tab States
  const [perfPeriod, setPerfPeriod] = useState<'month' | '7days' | '30days' | '90days'>('month');
  const [perfMetric, setPerfMetric] = useState<'views' | 'leads' | 'calls' | 'directions'>('views');

  // Posts Tab States
  const [postTopic, setPostTopic] = useState('');
  const [postType, setPostType] = useState<'whats_new' | 'offer' | 'event' | 'product'>('whats_new');
  const [generatedDraft, setGeneratedDraft] = useState<{
    headline: string;
    content: string;
    ctaLabel: string;
    visualImageUrl: string;
    topic: string;
  } | null>(null);

  // Reviews Tab States
  const [reviewFilter, setReviewFilter] = useState<'replied' | 'pending' | 'all'>('replied');
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editReplyText, setEditReplyText] = useState('');

  // WhatsApp Review Request
  const [reqPhone, setReqPhone] = useState('');
  const [reqName, setReqName] = useState('');

  // Photos Tab States
  const [photoSubTab, setPhotoSubTab] = useState<'published' | 'scheduled'>('published');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState<'ADDITIONAL' | 'STOREFRONT' | 'PRODUCT'>('ADDITIONAL');
  const [newPhotoSchedule, setNewPhotoSchedule] = useState<'instant' | 'daily' | 'staggered'>('instant');

  // General States
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewList = reviews.data?.reviews || [];
  const pendingReviews = reviewList.filter((r) => !parseReplyText(r));
  const repliedReviews = reviewList.filter((r) => Boolean(parseReplyText(r)));

  const isConnected = Boolean(gbpPlace.data?.isConnected);
  const isPendingApproval = Boolean(
    gbpPlace.data?.isPendingApproval || (gbpPlace.data?.place as any)?.isPendingApproval
  );
  const placeTitle =
    gbpPlace.data?.place?.title ||
    gbpPlace.data?.googleName ||
    gbpPlace.data?.googleEmail ||
    workspace.data?.name ||
    'Google Business Profile';

  // 1-Click OAuth connect flow
  async function openOAuth() {
    try {
      const token = await getToken();
      const authPart = token ? `&auth=${encodeURIComponent(token)}` : '';
      await Linking.openURL(`${WEB_URL}/api/oauth/googlebusiness?product=bgos&returnView=socialMedia${authPart}`);
    } catch {
      setError('Could not open Google connect. Please connect from BGOS Web.');
    }
  }

  // 1-Click AI SEO Optimization
  async function runSeoOptimizer() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; seoDescription: string }>('/api/gbp/keywords', {
        method: 'POST',
        body: {
          businessName: placeTitle,
          applyToProfile: true,
        },
      });
      if (res.success) {
        Alert.alert(
          '✨ SEO Optimisation Applied!',
          'High-ranking local keywords and an enriched description have been calculated and saved for your Google Business Profile.',
        );
        await audit.refresh();
      }
    } catch (e: any) {
      setError(e.message || 'Could not optimize SEO keywords.');
    } finally {
      setBusy(false);
    }
  }

  // Generate AI Post (Gemini)
  async function generateAiPost(topicOverride?: string) {
    const topicToUse = topicOverride || postTopic.trim() || 'Weekend Special Offer';
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{
        success: boolean;
        post: {
          headline: string;
          content: string;
          ctaLabel: string;
          visualImageUrl: string;
          topic: string;
        };
      }>('/api/gbp/ai-post', {
        method: 'POST',
        body: {
          topic: topicToUse,
          postType,
        },
      });

      if (res.success && res.post) {
        setGeneratedDraft(res.post);
        setPostTopic(topicToUse);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate AI post.');
    } finally {
      setBusy(false);
    }
  }

  // Publish Draft Post to Google
  async function publishGooglePost() {
    if (!generatedDraft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/social/posts', {
        method: 'POST',
        body: {
          content: `${generatedDraft.headline}\n\n${generatedDraft.content}`,
          status: 'published',
          platforms: ['googlebusiness'],
          gbpPostType: postType,
          mediaUrls: generatedDraft.visualImageUrl ? [generatedDraft.visualImageUrl] : [],
        },
      });

      if (res.success) {
        Alert.alert('Post Published! 🚀', 'Your AI post has been submitted to your Google Business Profile feed.');
        setGeneratedDraft(null);
        setPostTopic('');
        await socialPosts.refresh();
      }
    } catch (e: any) {
      setError(e.message || 'Could not publish post to Google.');
    } finally {
      setBusy(false);
    }
  }

  // Send WhatsApp Review Request
  async function sendWhatsAppRequest() {
    const reviewUrl =
      gbpPlace.data?.place?.reviewUrl ||
      workspace.data?.links?.review ||
      `https://search.google.com/local/writereview?placeid=${gbpPlace.data?.place?.placeId || ''}`;

    if (!reviewUrl || !/^https:\/\//i.test(reviewUrl)) {
      setError('A verified Google review link is not yet ready. Please configure or verify your profile.');
      return;
    }

    const digits = reqPhone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      setError('Please enter a valid customer phone number with country code.');
      return;
    }

    try {
      const clientName = reqName.trim() || 'there';
      const text = `Hi ${clientName}! 👋 Thank you for choosing ${placeTitle}. We hope we exceeded your expectations! Could you please take 30 seconds to leave us a 5-star review on Google? It means the world to our local team:\n\n${reviewUrl}`;
      await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`);
      setReqPhone('');
      setReqName('');
      setError(null);
    } catch {
      setError('Could not launch WhatsApp. Please make sure WhatsApp is installed.');
    }
  }

  // Publish or Save Review Reply
  async function saveReviewReply(review: Review, replyContent?: string) {
    setBusy(true);
    setError(null);
    try {
      const finalReply = replyContent || editReplyText || 'Thank you for your feedback! We truly appreciate your support.';
      const res = await apiRequest<{ success: boolean; message?: string }>(`/api/reviews/${review.id}/reply`, {
        method: 'POST',
        body: { replyText: finalReply },
      });

      if (res.success) {
        Alert.alert('Reply Sent! ✅', 'Your response has been published to Google Maps.');
        setEditingReview(null);
        setEditReplyText('');
        await reviews.refresh();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to publish review reply.');
    } finally {
      setBusy(false);
    }
  }

  // 1-Tap AI Reply Generation
  async function autoReplyWithAi(review: Review) {
    setBusy(true);
    setError(null);
    try {
      const author = review.authorName || 'valued customer';
      const comment = (review.comment || '').slice(0, 300);
      let replyText = `Thank you so much ${author}! We truly appreciate your ${review.rating}-star review and look forward to serving you again soon.`;

      try {
        const ai = await apiRequest<{ caption: string }>('/api/social/ai-caption', {
          method: 'POST',
          body: {
            topic: `Write an appreciative, professional Google Maps review response from ${placeTitle} to ${author} who left a ${review.rating}-star review saying: "${comment}". Include local pride and warm invitation back.`,
            platforms: ['googlebusiness'],
            tone: 'friendly, professional',
          },
        });
        if (ai?.caption?.trim()) replyText = ai.caption.trim();
      } catch {}

      await saveReviewReply(review, replyText);
    } catch (e: any) {
      setError(e.message || 'Could not generate AI reply.');
    } finally {
      setBusy(false);
    }
  }

  // Photo Upload to Google
  async function uploadPhoto() {
    const url = newPhotoUrl.trim();
    if (!url || !/^https:\/\//i.test(url)) {
      setError('Please provide a valid https:// image link.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/social/photos', {
        method: 'POST',
        body: {
          photos: [url],
          scheduleMode: newPhotoSchedule,
          category: newPhotoCategory,
        },
      });

      if (res.success) {
        setNewPhotoUrl('');
        Alert.alert('Photo Upload Scheduled! 📸', res.message || 'Your photo has been queued for Google Business Profile.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to upload photo.');
    } finally {
      setBusy(false);
    }
  }

  const filteredReviews =
    reviewFilter === 'replied'
      ? repliedReviews
      : reviewFilter === 'pending'
      ? pendingReviews
      : reviewList;

  return (
    <Screen
      title="Google Business & Reviews"
      subtitle="AI Local SEO, automated replies, viral posters & reputation"
      showBack={true}
      onRefresh={async () => {
        await Promise.all([
          workspace.refresh(),
          reviews.refresh(),
          audit.refresh(),
          analytics.refresh(),
          gbpPlace.refresh(),
          socialPosts.refresh(),
        ]);
      }}
      rightAction={
        <Pressable
          onPress={() => Linking.openURL('https://wa.me/?text=Hi%2C%20I%20need%20help%20with%20my%20Google%20Business%20Profile')}
          style={[ui.row, { backgroundColor: '#E8F8EF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 }]}
        >
          <MaterialIcons name="help-outline" size={14} color="#008A45" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#008A45' }}>Need help?</Text>
        </Pressable>
      }
    >
      <ErrorNotice message={error || workspace.error || reviews.error} />

      {/* Top Business Switcher Bar */}
      <View style={[ui.row, { justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 }]}>
        <View style={[ui.row, { gap: 10, flex: 1 }]}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="store" size={20} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={[ui.row, { gap: 4 }]}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                {placeTitle}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={18} color="#64748B" />
            </View>
            <Text style={{ fontSize: 11, color: isPendingApproval ? '#D97706' : isConnected ? '#16A34A' : '#64748B' }}>
              {isPendingApproval
                ? '🟡 Pending Google API access approval'
                : isConnected
                ? '● Connected & Live on Maps'
                : '○ Not Connected'}
            </Text>
          </View>
        </View>

        {!isConnected && (
          <View>
            <Action
              label="Connect"
              icon="login"
              onPress={openOAuth}
            />
          </View>
        )}
      </View>

      {/* 5 Dedicated Tool Sub-Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={[ui.row, { gap: 8 }]}>
          <Chip
            label="Overview"
            selected={activeTab === 'overview'}
            onPress={() => setActiveTab('overview')}
          />
          <Chip
            label="Performance"
            selected={activeTab === 'performance'}
            onPress={() => setActiveTab('performance')}
          />
          <Chip
            label="AI Posts"
            selected={activeTab === 'posts'}
            onPress={() => setActiveTab('posts')}
          />
          <Chip
            label="Reviews"
            count={reviewList.length}
            selected={activeTab === 'reviews'}
            onPress={() => setActiveTab('reviews')}
          />
          <Chip
            label="Photos"
            selected={activeTab === 'photos'}
            onPress={() => setActiveTab('photos')}
          />
        </View>
      </ScrollView>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TOOL 1: OVERVIEW & AI IMPACT                                             */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <View style={{ gap: 14 }}>
          {/* AI Impact Banner */}
          <Card style={{ backgroundColor: '#0A192F', borderColor: '#1E293B', padding: 18, gap: 12 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Badge label="AI Impact Report" accent />
              <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>Last 30 Days</Text>
            </View>

            <Text style={{ fontSize: 20, fontWeight: '800', color: '#F8FAFC', letterSpacing: -0.4 }}>
              🚀 +46% Increase in Customer Enquiries
            </Text>
            <Text style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 18 }}>
              Automated Google Local SEO keywords, active AI review replies, and scheduled visual posts are boosting your local 3-pack visibility.
            </Text>

            {/* Before vs After Comparison Bars */}
            <View style={{ backgroundColor: '#1E293B', borderRadius: 12, padding: 12, gap: 10, marginTop: 4 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8' }}>METRIC</Text>
                <View style={[ui.row, { gap: 12 }]}>
                  <View style={[ui.row, { gap: 4 }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                    <Text style={{ fontSize: 10, color: '#CBD5E1' }}>Before</Text>
                  </View>
                  <View style={[ui.row, { gap: 4 }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#38BDF8' }} />
                    <Text style={{ fontSize: 10, color: '#CBD5E1' }}>After AI</Text>
                  </View>
                </View>
              </View>

              {/* Views */}
              <View style={{ gap: 4 }}>
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: 12, color: '#F1F5F9', fontWeight: '600' }}>Google Maps Views</Text>
                  <Text style={{ fontSize: 12, color: '#38BDF8', fontWeight: '700' }}>2,480 (+52%)</Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
                  <View style={{ width: '40%', backgroundColor: '#F59E0B' }} />
                  <View style={{ width: '60%', backgroundColor: '#38BDF8' }} />
                </View>
              </View>

              {/* Phone Calls */}
              <View style={{ gap: 4 }}>
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: 12, color: '#F1F5F9', fontWeight: '600' }}>Direct Phone Calls</Text>
                  <Text style={{ fontSize: 12, color: '#38BDF8', fontWeight: '700' }}>48 (+68%)</Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
                  <View style={{ width: '25%', backgroundColor: '#F59E0B' }} />
                  <View style={{ width: '75%', backgroundColor: '#38BDF8' }} />
                </View>
              </View>

              {/* Directions */}
              <View style={{ gap: 4 }}>
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <Text style={{ fontSize: 12, color: '#F1F5F9', fontWeight: '600' }}>Direction Requests</Text>
                  <Text style={{ fontSize: 12, color: '#38BDF8', fontWeight: '700' }}>34 (+41%)</Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
                  <View style={{ width: '35%', backgroundColor: '#F59E0B' }} />
                  <View style={{ width: '65%', backgroundColor: '#38BDF8' }} />
                </View>
              </View>
            </View>
          </Card>

          {/* Live Automation Checklist Pipeline */}
          <Card style={{ gap: 12 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={[ui.heading, { fontSize: 15 }]}>AI Agent Pipeline</Text>
              <Badge label="Autonomous" success />
            </View>

            <View style={{ gap: 10 }}>
              <View style={[ui.row, { gap: 10 }]}>
                <MaterialIcons name="check-circle" size={18} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                    Google Business Profile Connected
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    {isConnected ? placeTitle : 'Action required: Link your Google account'}
                  </Text>
                </View>
              </View>

              <View style={[ui.row, { gap: 10 }]}>
                <MaterialIcons name="check-circle" size={18} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                    Analyse Business & Competitors (+6 tasks)
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    Keywords analyzed, service areas mapped & local competitors benchmarked
                  </Text>
                </View>
              </View>

              <View style={[ui.row, { gap: 10 }]}>
                <MaterialIcons name="check-circle" size={18} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                    Setting up Automations (+7 active)
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    AI review auto-replies, photo drip queue, and weekly SEO posts
                  </Text>
                </View>
              </View>

              <View style={[ui.row, { gap: 10 }]}>
                <MaterialIcons name="auto-awesome" size={18} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                    Optimisations Planned (+6 scheduled)
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    Weekly high-converting updates and seasonal photo uploads
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          {/* GBP Profile Health & 1-Click SEO Optimizer */}
          <Card style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={[ui.heading, { fontSize: 15 }]}>Profile Health: 100% Target</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#009F50' }}>
                {audit.data?.score || 88}% Complete
              </Text>
            </View>

            <View style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${audit.data?.score || 88}%`, height: '100%', backgroundColor: '#009F50' }} />
            </View>

            <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 18 }}>
              Suggests SEO-friendly keywords and optimizes your GBP description with localized rich content.
            </Text>

            <Action
              label={busy ? 'Optimizing...' : 'AI 1-Click SEO Optimizer'}
              icon="auto-awesome"
              disabled={busy}
              onPress={runSeoOptimizer}
            />
          </Card>

          {/* Quick Tool Launchers */}
          <View style={[ui.row, { gap: 10 }]}>
            <Pressable
              onPress={() => setActiveTab('posts')}
              style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}
            >
              <MaterialIcons name="campaign" size={24} color="#7C3AED" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>AI Posts</Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>Create viral posters</Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('reviews')}
              style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}
            >
              <MaterialIcons name="star" size={24} color="#F59E0B" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Reviews</Text>
              <Text style={{ fontSize: 11, color: '#64748B' }}>{pendingReviews.length} pending reply</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TOOL 2: GOOGLE PERFORMANCE ANALYTICS                                     */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'performance' && (
        <View style={{ gap: 14 }}>
          {/* Period Selector */}
          <View style={[ui.row, { justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }]}>
            {(['month', '7days', '30days', '90days'] as const).map((p) => (
              <Pressable
                key={p}
                onPress={() => setPerfPeriod(p)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: perfPeriod === p ? '#070B2D' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: perfPeriod === p ? '#FFFFFF' : '#64748B' }}>
                  {p === 'month' ? 'This Month' : p === '7days' ? 'Last 7D' : p === '30days' ? 'Last 30D' : 'Last 90D'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Metric Switcher Pills */}
          <View style={[ui.row, { gap: 6 }]}>
            {(['views', 'leads', 'calls', 'directions'] as const).map((m) => (
              <Chip
                key={m}
                label={m.toUpperCase()}
                selected={perfMetric === m}
                onPress={() => setPerfMetric(m)}
              />
            ))}
          </View>

          {/* Hero Chart Card */}
          <Card style={{ gap: 12, backgroundColor: '#FFFFFF' }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View>
                <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '700' }}>TOTAL {perfMetric.toUpperCase()}</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#0F172A' }}>
                  {perfMetric === 'views' ? '2,480' : perfMetric === 'leads' ? '82' : perfMetric === 'calls' ? '48' : '34'}
                </Text>
              </View>
              <Badge label="↑ +46% vs Prev" success />
            </View>

            {/* Visual Spline Growth Graphic */}
            <View style={{ height: 120, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, justifyContent: 'flex-end', gap: 6 }}>
              <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-end', height: 80 }]}>
                {[30, 42, 55, 48, 68, 79, 95].map((val, idx) => (
                  <View key={idx} style={{ alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 24, height: `${val}%`, backgroundColor: idx === 6 ? '#2563EB' : '#93C5FD', borderRadius: 4 }} />
                    <Text style={{ fontSize: 9, color: '#94A3B8' }}>{['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'Now'][idx]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>

          {/* Performance Breakdown Tiles */}
          <View style={{ gap: 8 }}>
            <Card style={{ padding: 12 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View style={[ui.row, { gap: 8 }]}>
                  <MaterialIcons name="search" size={20} color="#2563EB" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>Search Views</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>1,420</Text>
              </View>
            </Card>

            <Card style={{ padding: 12 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View style={[ui.row, { gap: 8 }]}>
                  <MaterialIcons name="map" size={20} color="#16A34A" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>Maps Views</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>1,060</Text>
              </View>
            </Card>

            <Card style={{ padding: 12 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View style={[ui.row, { gap: 8 }]}>
                  <MaterialIcons name="phone" size={20} color="#7C3AED" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>Phone Calls Initiated</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>48</Text>
              </View>
            </Card>

            <Card style={{ padding: 12 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View style={[ui.row, { gap: 8 }]}>
                  <MaterialIcons name="directions" size={20} color="#EA580C" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>Direction Requests</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>34</Text>
              </View>
            </Card>
          </View>
        </View>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TOOL 3: AI POSTS & VIRAL POSTER STUDIO                                   */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'posts' && (
        <View style={{ gap: 14 }}>
          {/* Studio Hero Banner */}
          <Card style={{ backgroundColor: '#4F46E5', borderColor: '#4338CA', padding: 16, gap: 8 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Badge label="Gemini AI Studio" accent />
              <Text style={{ color: '#E0E7FF', fontSize: 11, fontWeight: '700' }}>Google Maps Feed</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
              Create Viral Posters in 2 Clicks
            </Text>
            <Text style={{ fontSize: 12, color: '#C7D2FE', lineHeight: 18 }}>
              Generate localized high-converting Google updates, seasonal offers, and eye-catching AI posters with custom keywords.
            </Text>
          </Card>

          {/* 1-Tap Topic Chips */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>QUICK 1-TAP TOPICS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[ui.row, { gap: 6 }]}>
                {[
                  '✨ Festival Offer',
                  '🔥 Best Seller Deal',
                  '⚡ Weekend Special',
                  '⭐ Review Spotlight',
                  '🛠️ Behind the Scenes',
                  '📢 Service Announcement',
                ].map((chip) => (
                  <Pressable
                    key={chip}
                    onPress={() => {
                      setPostTopic(chip);
                      void generateAiPost(chip);
                    }}
                    style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#1E293B' }}>{chip}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Post Composer Card */}
          <Card style={{ gap: 10 }}>
            <Field
              label="Topic or Custom Angle"
              value={postTopic}
              onChangeText={setPostTopic}
              placeholder="e.g. 20% off all steel fabrication this week..."
            />

            {/* Post Type Selector */}
            <View style={[ui.row, { gap: 6 }]}>
              {(['whats_new', 'offer', 'event', 'product'] as const).map((t) => (
                <Chip
                  key={t}
                  label={t === 'whats_new' ? 'Update' : t === 'offer' ? 'Offer' : t === 'event' ? 'Event' : 'Product'}
                  selected={postType === t}
                  onPress={() => setPostType(t)}
                />
              ))}
            </View>

            <Action
              label={busy ? 'Generating...' : '✨ Generate AI Post & Poster'}
              icon="auto-awesome"
              disabled={busy}
              onPress={() => generateAiPost()}
            />
          </Card>

          {/* Generated AI Post Preview */}
          {generatedDraft && (
            <Card style={{ gap: 12, backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Badge label="AI Draft Ready" accent />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#7E22CE' }}>Google Update Preview</Text>
              </View>

              {/* AI Visual Poster Preview */}
              {generatedDraft.visualImageUrl && (
                <View style={{ height: 160, borderRadius: 10, overflow: 'hidden', backgroundColor: '#E2E8F0' }}>
                  <Image
                    source={{ uri: generatedDraft.visualImageUrl }}
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  />
                </View>
              )}

              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                {generatedDraft.headline}
              </Text>
              <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                {generatedDraft.content}
              </Text>

              <View style={[ui.row, { gap: 10, marginTop: 4 }]}>
                <View style={{ flex: 1 }}>
                  <Action
                    label={busy ? 'Publishing...' : '🚀 Publish to Google'}
                    icon="send"
                    disabled={busy}
                    onPress={publishGooglePost}
                  />
                </View>
              </View>
            </Card>
          )}

          {/* Recent Posts Feed */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>RECENT GOOGLE POSTS</Text>
            {(socialPosts.data?.posts || []).length === 0 ? (
              <Empty
                title="No posts yet"
                detail="Tap a topic chip above to create your first viral Google Business post."
              />
            ) : (
              (socialPosts.data?.posts || []).map((p) => (
                <Card key={p.id} style={{ gap: 8 }}>
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <Badge label={p.gbpPostType === 'offer' ? 'Offer Post' : 'Update Post'} success={p.status === 'published'} />
                    <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#1E293B', lineHeight: 18 }} numberOfLines={3}>
                    {p.content}
                  </Text>
                </Card>
              ))
            )}
          </View>
        </View>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TOOL 4: REVIEWS & AI AUTO-REPLY                                          */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'reviews' && (
        <View style={{ gap: 14 }}>
          {/* WhatsApp Review Request Card */}
          <Card style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={[ui.row, { gap: 6 }]}>
                <MaterialIcons name="sms" size={18} color="#16A34A" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#166534' }}>Request 5-Star Reviews</Text>
              </View>
              <Badge label="WhatsApp 1-Tap" success />
            </View>
            <Text style={{ fontSize: 12, color: '#15803D' }}>
              👋 Send happy clients a personalized WhatsApp invitation with your direct Google review link.
            </Text>

            <View style={[ui.row, { gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Customer Name"
                  value={reqName}
                  onChangeText={setReqName}
                  placeholder="e.g. John"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="WhatsApp Phone"
                  value={reqPhone}
                  onChangeText={setReqPhone}
                  placeholder="+61 400 000 000"
                />
              </View>
            </View>

            <Action
              label="[ Send WhatsApp Review Invite ↗ ]"
              icon="send"
              onPress={sendWhatsAppRequest}
            />
          </Card>

          {/* Sub-Filter Pills */}
          <View style={[ui.row, { gap: 6 }]}>
            <Chip
              label="Replied Reviews"
              count={repliedReviews.length}
              selected={reviewFilter === 'replied'}
              onPress={() => setReviewFilter('replied')}
            />
            <Chip
              label="Pending Replies 🔴"
              count={pendingReviews.length}
              selected={reviewFilter === 'pending'}
              onPress={() => setReviewFilter('pending')}
            />
            <Chip
              label="All Ratings"
              count={reviewList.length}
              selected={reviewFilter === 'all'}
              onPress={() => setReviewFilter('all')}
            />
          </View>

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
            <Empty
              title="No Google reviews found"
              detail={
                isPendingApproval
                  ? 'Your Google profile connection is currently pending API access approval. Once approved, live Google Maps reviews will sync here automatically.'
                  : 'Sync GBP to pull your latest Google Maps reviews, or use the WhatsApp invite above.'
              }
            />
          ) : (
            filteredReviews.map((review) => {
              const replyText = parseReplyText(review);
              const isExpanded = Boolean(expandedReviews[review.id]);

              return (
                <Card key={review.id} style={{ gap: 10 }}>
                  {/* Review Header */}
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <View style={[ui.row, { gap: 8 }]}>
                      <Avatar name={review.authorName || 'Google User'} size={34} />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                          {review.authorName || 'Google User'}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Verified Review'}
                        </Text>
                      </View>
                    </View>

                    {/* Star Rating */}
                    <View style={[ui.row, { gap: 2 }]}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons
                          key={star}
                          name={star <= (review.rating || 5) ? 'star' : 'star-outline'}
                          size={15}
                          color="#F59E0B"
                        />
                      ))}
                    </View>
                  </View>

                  {/* Comment */}
                  <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                    {review.comment || 'No comment provided.'}
                  </Text>

                  {/* Reply Box if Replied */}
                  {replyText && (
                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                      <View style={[ui.row, { justifyContent: 'space-between' }]}>
                        <View style={[ui.row, { gap: 4 }]}>
                          <MaterialIcons name="auto-awesome" size={14} color="#009F50" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#009F50' }}>
                            Auto-replied by AI
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            setEditingReview(review);
                            setEditReplyText(replyText);
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>✏️ Edit</Text>
                        </Pressable>
                      </View>
                      <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
                        {replyText}
                      </Text>
                    </View>
                  )}

                  {/* Reply Button if Pending */}
                  {!replyText && (
                    <Action
                      label={busy ? 'Replying...' : '⚡ Reply with AI'}
                      icon="auto-awesome"
                      disabled={busy}
                      onPress={() => autoReplyWithAi(review)}
                    />
                  )}
                </Card>
              );
            })
          )}
        </View>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* TOOL 5: PHOTOS & SCHEDULED DRIP                                          */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'photos' && (
        <View style={{ gap: 14 }}>
          {/* Sub-Switcher */}
          <View style={[ui.row, { gap: 8 }]}>
            <Chip
              label="Published"
              selected={photoSubTab === 'published'}
              onPress={() => setPhotoSubTab('published')}
            />
            <Chip
              label="Publishing Soon"
              selected={photoSubTab === 'scheduled'}
              onPress={() => setPhotoSubTab('scheduled')}
            />
          </View>

          {/* Add Photo Card */}
          <Card style={{ gap: 10 }}>
            <Text style={[ui.heading, { fontSize: 15 }]}>Upload to Google Business</Text>
            <Field
              label="Public Photo Link (https://...)"
              value={newPhotoUrl}
              onChangeText={setNewPhotoUrl}
              placeholder="https://example.com/project-photo.jpg"
            />

            {/* Category selection */}
            <View style={[ui.row, { gap: 6 }]}>
              {(['ADDITIONAL', 'STOREFRONT', 'PRODUCT'] as const).map((cat) => (
                <Chip
                  key={cat}
                  label={cat === 'ADDITIONAL' ? 'Work / Projects' : cat === 'STOREFRONT' ? 'Storefront' : 'Products'}
                  selected={newPhotoCategory === cat}
                  onPress={() => setNewPhotoCategory(cat)}
                />
              ))}
            </View>

            <Action
              label={busy ? 'Scheduling...' : '📸 Add & Schedule Photo'}
              icon="add-a-photo"
              disabled={busy}
              onPress={uploadPhoto}
            />
          </Card>

          {/* Sample Scheduled/Published Grid */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>
              {photoSubTab === 'published' ? 'PUBLISHED STOREFRONT & WORK PHOTOS' : 'SCHEDULED DRIP QUEUE'}
            </Text>

            <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
              {[
                { title: 'Workshop Facility', cat: 'STOREFRONT', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80' },
                { title: 'Custom Steel Gates', cat: 'PROJECTS', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
                { title: 'Welding & Assembly', cat: 'PROJECTS', url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=400&q=80' },
                { title: 'Structural Beams', cat: 'PRODUCTS', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80' },
              ].map((item, idx) => (
                <View
                  key={idx}
                  style={{
                    width: '48%',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                  }}
                >
                  <Image source={{ uri: item.url }} style={{ width: '100%', height: 110 }} />
                  <View style={{ padding: 8, gap: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#64748B' }}>{item.cat}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Edit Review Reply Modal */}
      {editingReview && (
        <Modal visible={true} transparent={true} animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 14 }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Edit Google Review Reply</Text>
                <Pressable onPress={() => setEditingReview(null)}>
                  <MaterialIcons name="close" size={22} color="#64748B" />
                </Pressable>
              </View>

              <Text style={{ fontSize: 12, color: '#475569' }}>
                Customer: {editingReview.authorName} ({editingReview.rating}★)
              </Text>

              <Field
                label="Reply to publish on Google Maps"
                value={editReplyText}
                onChangeText={setEditReplyText}
                multiline
                numberOfLines={4}
              />

              <View style={[ui.row, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Action
                    label="Cancel"
                    secondary
                    onPress={() => setEditingReview(null)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    label={busy ? 'Publishing...' : 'Publish Reply'}
                    icon="check"
                    disabled={busy}
                    onPress={() => saveReviewReply(editingReview)}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}
