import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import {
  Action,
  Badge,
  Card,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Screen,
  colors,
  ui,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { getToken } from '../../src/lib/auth';
import { WEB_URL } from '../../src/lib/constants';
import { useAuthStore } from '../../src/stores/auth-store';
import type { BgosWorkspace } from '../../../shared/bgos-contracts';
import { Segmented } from '../../src/components/gbp/segmented';
import { OptimizationTimeline, OptimizingPill } from '../../src/components/gbp/timeline';
import { ConnectWizard, useWizardState } from '../../src/components/gbp/wizard';
import { useGbpAutomations } from '../../src/components/gbp/automations';
import { ReviewCard } from '../../src/components/gbp/review-card';
import { PhotosBoard } from '../../src/components/gbp/photos-grid';
import { PerformancePanel } from '../../src/components/gbp/performance-panel';
import { AiActionsFeed } from '../../src/components/gbp/ai-actions';
import { ReviewRequestSheet } from '../../src/components/gbp/review-request';
import { AiButton, ChipRow, Pill, SectionHeader, gbpColors } from '../../src/components/gbp/bits';
import type {
  AiAction,
  AiPostDraft,
  AnalyticsResult,
  AuditResult,
  GbpPlaceResult,
  PhotosResponse,
  Review,
  SocialPost,
} from '../../src/components/gbp/types';

type ToolTab = 'overview' | 'reviews' | 'posts' | 'photos' | 'performance';
type PostType = 'whats_new' | 'offer' | 'event' | 'product';
type ScheduleChoice = 'now' | 'daily' | 'weekly';

type ReviewsResponse = { reviews: Review[]; pagination?: { total: number } };
type PostsResponse = { data: SocialPost[]; pagination?: { total: number } };
type AccountsResponse = { data: { id: string; platform: string; accountName?: string }[] };

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'whats_new', label: "What's New" },
  { value: 'offer', label: 'Offer' },
  { value: 'event', label: 'Event' },
  { value: 'product', label: 'Product' },
];

const RATING_FILTERS: { value: number; label: string }[] = [
  { value: 0, label: 'All' },
  { value: 5, label: '5★' },
  { value: 4, label: '4★' },
  { value: 3, label: '3★' },
  { value: 2, label: '2★' },
  { value: 1, label: '1★' },
];

const SCHEDULE_CHOICES: { key: ScheduleChoice; label: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { key: 'now', label: 'Publish now', icon: 'bolt' },
  { key: 'daily', label: 'Tomorrow 10:00', icon: 'today' },
  { key: 'weekly', label: 'Next week', icon: 'date-range' },
];

function parseReplyText(review: Review): string | null {
  try {
    const parsed = JSON.parse(review.responseJson || '{}');
    return parsed?.text || null;
  } catch {
    return null;
  }
}

function replyTimestamp(review: Review): string | null {
  try {
    const parsed = JSON.parse(review.responseJson || '{}');
    if (parsed?.repliedAt) return String(parsed.repliedAt);
  } catch {}
  return review.createdAt || null;
}

function categoryWords(category?: string | null): string[] {
  if (!category) return [];
  return category.split(/[/,&-]/).map((s) => s.trim()).filter(Boolean);
}

function nextScheduleIso(choice: 'daily' | 'weekly'): string {
  const d = new Date();
  d.setDate(d.getDate() + (choice === 'daily' ? 1 : 7));
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

export default function GrowthScreen() {
  const { user } = useAuthStore();
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const reviews = useResource<ReviewsResponse>('/api/reviews?source=google&limit=50');
  const audit = useResource<AuditResult>('/api/gbp/audit');
  const analytics = useResource<AnalyticsResult>('/api/gbp/analytics');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const postsRes = useResource<PostsResponse>('/api/social/posts?platform=googlebusiness&limit=10');
  const photosRes = useResource<PhotosResponse>('/api/social/photos');
  const gbpAccounts = useResource<AccountsResponse>('/api/social/accounts?platform=googlebusiness');

  const wizard = useWizardState();
  const automations = useGbpAutomations();

  const [tab, setTab] = useState<ToolTab>('overview');

  // Reviews tab
  const [reviewFilter, setReviewFilter] = useState<'replied' | 'pending'>('pending');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftBusyId, setDraftBusyId] = useState<string | null>(null);
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  // Overview / connect
  const [connecting, setConnecting] = useState(false);
  const [seoBusy, setSeoBusy] = useState(false);

  // Posts composer
  const [composerOpen, setComposerOpen] = useState(false);
  const [postTopic, setPostTopic] = useState('');
  const [postType, setPostType] = useState<PostType>('whats_new');
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<AiPostDraft | null>(null);
  const [editHeadline, setEditHeadline] = useState('');
  const [editContent, setEditContent] = useState('');
  const [scheduleChoice, setScheduleChoice] = useState<ScheduleChoice>('now');
  const [publishing, setPublishing] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const isConnected = Boolean(gbpPlace.data?.isConnected);
  const isPendingApproval = Boolean(
    gbpPlace.data?.isPendingApproval || gbpPlace.data?.place?.isPendingApproval,
  );
  const businessName =
    gbpPlace.data?.place?.title ||
    gbpPlace.data?.tenantFallback?.name ||
    gbpPlace.data?.googleName ||
    workspace.data?.name ||
    'Google Business Profile';
  const locationLine =
    gbpPlace.data?.place?.address ||
    gbpPlace.data?.tenantFallback?.address ||
    gbpPlace.data?.place?.category ||
    gbpPlace.data?.tenantFallback?.category ||
    '';
  const googleEmail = gbpPlace.data?.googleEmail || '';
  const categoryTokens = categoryWords(gbpPlace.data?.place?.category || gbpPlace.data?.tenantFallback?.category);

  const completion = Math.round(
    gbpPlace.data?.place?.completionScore ??
      gbpPlace.data?.tenantFallback?.completionScore ??
      audit.data?.score ??
      0,
  );

  const reviewList = useMemo(
    () =>
      [...(reviews.data?.reviews || [])].sort(
        (a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0),
      ),
    [reviews.data],
  );
  const repliedReviews = useMemo(() => reviewList.filter((r) => Boolean(parseReplyText(r))), [reviewList]);
  const pendingReviews = useMemo(() => reviewList.filter((r) => !parseReplyText(r)), [reviewList]);

  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviewList) {
      const rt = Math.round(r.rating || 0);
      if (rt >= 1 && rt <= 5) counts[rt] = (counts[rt] || 0) + 1;
    }
    return counts;
  }, [reviewList]);

  const filteredReviews = useMemo(() => {
    const base = reviewFilter === 'replied' ? repliedReviews : pendingReviews;
    return ratingFilter === 0 ? base : base.filter((r) => Math.round(r.rating || 0) === ratingFilter);
  }, [reviewFilter, ratingFilter, repliedReviews, pendingReviews]);

  const postList = useMemo(() => (postsRes.data?.data || []).slice(0, 10), [postsRes.data]);
  const publishedPosts = useMemo(() => postList.filter((p) => p.status === 'published'), [postList]);
  const publishedPhotos = useMemo(
    () =>
      (photosRes.data?.photos || [])
        .filter((p) => p.source === 'google')
        .sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0)),
    [photosRes.data],
  );

  const gbpAccountId = useMemo(
    () => gbpAccounts.data?.data?.find((a) => a.platform === 'googlebusiness')?.id || null,
    [gbpAccounts.data],
  );

  const timelineCounts = useMemo(
    () => ({
      replies: repliedReviews.length,
      repliesWhen: repliedReviews.length
        ? repliedReviews.map((r) => replyTimestamp(r)).filter(Boolean).sort().reverse()[0] || null
        : null,
      posts: publishedPosts.length,
      postsWhen: publishedPosts.length
        ? publishedPosts
            .map((p) => p.publishedAt || p.createdAt)
            .filter(Boolean)
            .sort()
            .reverse()[0] || null
        : null,
      photos: photosRes.data?.liveCount ?? publishedPhotos.length,
      photosWhen: publishedPhotos[0]?.createdAt || null,
    }),
    [repliedReviews, publishedPosts, publishedPhotos, photosRes.data],
  );

  const aiActions = useMemo<AiAction[]>(() => {
    const items: AiAction[] = [];
    for (const p of publishedPosts) {
      const when = p.publishedAt || p.createdAt;
      if (!when) continue;
      items.push({
        id: `post-${p.id}`,
        kind: 'post',
        when,
        title: (p.content || '').split('\n')[0] || 'Google post',
      });
    }
    for (const ph of publishedPhotos.slice(0, 10)) {
      if (!ph.createdAt) continue;
      items.push({ id: `photo-${ph.id}`, kind: 'photo', when: ph.createdAt, title: 'Photo published to Google Maps' });
    }
    for (const r of repliedReviews) {
      const when = replyTimestamp(r);
      if (!when) continue;
      items.push({ id: `reply-${r.id}`, kind: 'reply', when, title: `AI reply to ${r.authorName || 'a customer'}` });
    }
    return items
      .sort((a, b) => Date.parse(b.when) - Date.parse(a.when))
      .slice(0, 5);
  }, [publishedPosts, publishedPhotos, repliedReviews]);

  const isFullyOptimized = Boolean(audit.data?.isFullyOptimized);
  const wizardActive = Boolean(wizard.state && !wizard.state.completedAt);
  const showWizard = !isConnected || wizardActive;

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function openConnect() {
    const token = await getToken();
    // Same OAuth entry the web app uses (`/api/oauth/googlebusiness/connect`
    // accepts `auth`/`token`, `product`, `returnView`, `originHost`).
    const url =
      `${WEB_URL}/api/oauth/googlebusiness/connect?product=bgos&returnView=reviews` +
      `&originHost=${encodeURIComponent(WEB_URL)}` +
      (token ? `&auth=${encodeURIComponent(token)}` : '');
    setConnecting(true);
    setError(null);
    try {
      // In-app auth session (CustomTab / ASWebAuthenticationSession); the
      // server redirects into the web portal, the user returns and we resync.
      await WebBrowser.openAuthSessionAsync(url);
    } catch {
      try {
        await Linking.openURL(url);
      } catch {
        setError('Could not open Google connect. Please connect from BGOS Web.');
        return;
      }
    } finally {
      setConnecting(false);
    }
    await Promise.all([gbpPlace.refresh(), audit.refresh(), analytics.refresh(), gbpAccounts.refresh()]).catch(
      () => {},
    );
  }

  async function runSeoOptimizer() {
    setSeoBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean }>('/api/gbp/keywords', {
        method: 'POST',
        body: {
          businessName,
          industry: categoryTokens.join(' ') || 'Local Services',
          location: locationLine,
          applyToProfile: true,
        },
      });
      if (res.success) {
        Alert.alert(
          '✨ SEO Optimisation Applied',
          'High-ranking local keywords and an enriched description were generated and saved for your Google Business Profile.',
        );
        await audit.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not optimize SEO keywords.');
    } finally {
      setSeoBusy(false);
    }
  }

  // Reviews — AI draft flow (spec §6): generate → review → publish.
  async function generateDraft(review: Review) {
    setDraftBusyId(review.id);
    setError(null);
    try {
      const author = review.authorName || 'valued customer';
      const comment = (review.comment || '').slice(0, 300);
      let replyText = `Thank you so much ${author}! We truly appreciate your ${review.rating}-star review and look forward to serving you again soon.`;
      try {
        const ai = await apiRequest<{ caption: string }>('/api/social/ai-caption', {
          method: 'POST',
          body: {
            topic: `Write an appreciative, professional Google Maps review response from ${businessName} to ${author} who left a ${review.rating}-star review saying: "${comment}". Include local pride, mention our specialty services naturally for local SEO, and a warm invitation back.`,
            platforms: ['googlebusiness'],
            tone: 'friendly, professional',
          },
        });
        if (ai?.caption?.trim()) replyText = ai.caption.trim();
      } catch {
        // fall back to the deterministic thank-you reply above
      }
      setDrafts((prev) => ({ ...prev, [review.id]: replyText }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not generate the AI reply.');
    } finally {
      setDraftBusyId(null);
    }
  }

  async function publishReply(review: Review, text: string, isEdit = false) {
    const replyText = text.trim();
    if (!replyText) {
      setError('Reply text cannot be empty.');
      return;
    }
    setReplyBusyId(review.id);
    setError(null);
    try {
      const res = await apiRequest<{
        success: boolean;
        review?: Review;
        message?: string;
        publishedToGoogle?: boolean;
        googleError?: string | null;
      }>(
        `/api/reviews/${review.id}/reply`,
        { method: 'POST', body: { replyText } },
      );
      if (res.success) {
        if (res.review) {
          reviews.setData((prev) =>
            prev
              ? { ...prev, reviews: prev.reviews.map((r) => (r.id === res.review!.id ? { ...r, ...res.review! } : r)) }
              : prev,
          );
        }
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[review.id];
          return next;
        });
        const alertTitle = res.publishedToGoogle
          ? (isEdit ? 'Reply Updated Live on Google ✅' : 'Reply Published Live on Google ✅')
          : 'Reply Saved in BGOS 📋';
        const alertMsg = res.publishedToGoogle
          ? (res.message || 'Your reply is live on Google Maps.')
          : 'Your reply has been saved in BGOS! Google sync is pending (quota limit active). Tap the review to share or open in Google Maps.';
        Alert.alert(alertTitle, alertMsg);
        await reviews.refresh();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not publish the review reply.');
    } finally {
      setReplyBusyId(null);
    }
  }

  // Posts — AI composer (spec §9)
  async function generatePost() {
    setGenerating(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; post: AiPostDraft }>('/api/gbp/ai-post', {
        method: 'POST',
        body: { topic: postTopic.trim() || 'Weekly update for local customers', postType },
      });
      if (res.success && res.post) {
        setDraft(res.post);
        setEditHeadline(res.post.headline || '');
        setEditContent(res.post.content || '');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate AI post.');
    } finally {
      setGenerating(false);
    }
  }

  async function publishDraft(status: 'published' | 'scheduled' | 'draft') {
    if (!draft) return;
    const headline = (editHeadline || draft.headline).trim();
    const content = (editContent || draft.content).trim();
    if (!headline && !content) {
      setError('Add a headline or some content before publishing.');
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        content: [headline, content].filter(Boolean).join('\n\n'),
        status,
        mediaUrls: draft.visualImageUrl ? [draft.visualImageUrl] : [],
        gbpPostType: postType,
      };
      if (status === 'scheduled') body.scheduledAt = nextScheduleIso(scheduleChoice === 'daily' ? 'daily' : 'weekly');
      if (status !== 'draft') {
        if (!gbpAccountId) {
          setError('Connect your Google Business Profile first — then AI posts can publish to Google.');
          return;
        }
        body.targets = [{ platform: 'googlebusiness', socialAccountId: gbpAccountId }];
      }
      await apiRequest<{ data: SocialPost }>('/api/social/posts', { method: 'POST', body });
      Alert.alert(
        status === 'published' ? 'Post Published! 🚀' : status === 'scheduled' ? 'Post Scheduled ⏰' : 'Draft Saved',
        status === 'published'
          ? 'Your AI post has been submitted to your Google Business Profile feed.'
          : status === 'scheduled'
          ? `AI will publish this post ${scheduleChoice === 'daily' ? 'tomorrow' : 'next week'} at 10:00.`
          : 'Your post draft was saved — publish it when it is ready.',
      );
      setDraft(null);
      setPostTopic('');
      setEditHeadline('');
      setEditContent('');
      setComposerOpen(false);
      await postsRes.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not publish the post to Google.');
    } finally {
      setPublishing(false);
    }
  }

  async function publishExistingDraft(post: SocialPost) {
    setBusyPostId(post.id);
    setError(null);
    try {
      await apiRequest('/api/social/publish', { method: 'POST', body: { postId: post.id } });
      Alert.alert('Post Published 🚀', 'Your draft is now going out to your connected Google profile.');
      await postsRes.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not publish the draft.');
    } finally {
      setBusyPostId(null);
    }
  }

  const refreshAll = async () => {
    await Promise.all([
      workspace.refresh(),
      reviews.refresh(),
      audit.refresh(),
      analytics.refresh(),
      gbpPlace.refresh(),
      postsRes.refresh(),
      photosRes.refresh(),
      gbpAccounts.refresh(),
    ]).catch(() => {});
  };

  // ─── Render helpers ──────────────────────────────────────────────────────

  function BusinessHeader() {
    return (
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: colors.brandSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="storefront" size={24} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }} numberOfLines={1}>
              {businessName}
            </Text>
            {locationLine ? (
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                {locationLine}
              </Text>
            ) : null}
            {googleEmail ? (
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }} numberOfLines={1}>
                {googleEmail}
              </Text>
            ) : null}
          </View>
          {isPendingApproval ? (
            <Pill label="Pending Approval" bg={gbpColors.amberSoft} color="#B45309" icon="hourglass-empty" />
          ) : isConnected ? (
            <Pill label="GBP Connected" bg={gbpColors.emeraldSoft} color={gbpColors.emerald} icon="check-circle" />
          ) : (
            <Pill label="Not Connected" bg={gbpColors.amberSoft} color="#B45309" icon="link-off" />
          )}
        </View>
        {isPendingApproval ? (
          <Text style={{ fontSize: 12, color: '#B45309' }}>
            Google account connected — API access approval pending (read-only until Google approves the quota).
          </Text>
        ) : null}
      </Card>
    );
  }

  function CompletionCard() {
    const pct = Math.max(0, Math.min(100, completion));
    return (
      <Card style={{ gap: 12 }}>
        <SectionHeader title="Profile Completion" icon="donut-large" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              borderWidth: 6,
              borderColor: pct >= 100 ? gbpColors.emerald : colors.brandSoft,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: pct >= 100 ? gbpColors.emerald : colors.brand }}>
              {pct}%
            </Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={ui.meterTrack}>
              <View style={[ui.meterFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? gbpColors.emerald : colors.brand }]} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={ui.caption}>{pct}% complete</Text>
              {pct < 100 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={runSeoOptimizer}
                  disabled={seoBusy}
                  hitSlop={6}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                >
                  {seoBusy ? (
                    <ActivityIndicator size="small" color={gbpColors.ai} />
                  ) : (
                    <MaterialIcons name="auto-awesome" size={12} color={gbpColors.ai} />
                  )}
                  <Text style={{ fontSize: 12, fontWeight: '800', color: gbpColors.aiDark }}>Get to 100% ✨</Text>
                </Pressable>
              ) : (
                <Text style={{ fontSize: 12, fontWeight: '800', color: gbpColors.emerald }}>Fully optimized ✓</Text>
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  }

  function QuickActions() {
    const items: { label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; onPress: () => void }[] = [
      { label: 'Reviews', icon: 'star-outline', onPress: () => setTab('reviews') },
      { label: 'Posts', icon: 'article', onPress: () => setTab('posts') },
      { label: 'Photos', icon: 'photo-library', onPress: () => setTab('photos') },
      { label: 'Performance', icon: 'insights', onPress: () => setTab('performance') },
    ];
    return (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.label}`}
            onPress={item.onPress}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              gap: 4,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name={item.icon} size={20} color={colors.brand} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink }}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function OverviewTab() {
    return (
      <View style={{ gap: 14 }}>
        <BusinessHeader />

        {showWizard ? (
          <ConnectWizard
            wizard={wizard}
            place={gbpPlace.data}
            placeLoading={gbpPlace.loading}
            connecting={connecting}
            onConnect={openConnect}
            onProfileSaved={async () => {
              await Promise.all([gbpPlace.refresh(), audit.refresh()]).catch(() => {});
            }}
            onFinish={() => {
              void refreshAll();
            }}
            businessName={businessName}
          />
        ) : (
          <>
            <CompletionCard />
            <View>
              <SectionHeader
                title="Optimization Timeline"
                icon="timeline"
                right={isConnected && !isFullyOptimized ? <OptimizingPill /> : null}
              />
              <OptimizationTimeline
                audit={audit.data}
                place={gbpPlace.data}
                businessName={businessName}
                counts={timelineCounts}
                automations={automations.settings}
                onToggleAutomation={automations.toggle}
                onRunSeo={runSeoOptimizer}
                seoBusy={seoBusy}
                loadingAudit={audit.loading}
              />
            </View>
          </>
        )}

        <QuickActions />

        <View>
          <SectionHeader title="AI Actions" icon="auto-awesome" iconColor={gbpColors.ai} />
          <AiActionsFeed actions={aiActions} onOpenPosts={() => setTab('posts')} />
        </View>
      </View>
    );
  }

  function ReviewsTab() {
    return (
      <View style={{ gap: 12 }}>
        <SectionHeader title="Google Reviews" icon="grade" />

        {/* Request Reviews — WhatsApp-style invite (real flow) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Request Google reviews from customers"
          onPress={() => setRequestOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 12,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: '#25D366',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="chat" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '800' }}>Request Reviews</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>
              WhatsApp invite with your Google review link
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
        </Pressable>

        {/* Rating filter chips (All / 5★ / …) */}
        <ChipRow>
          {RATING_FILTERS.map((f) => {
            const count = f.value === 0 ? reviewList.length : ratingCounts[f.value] || 0;
            return (
              <Pressable
                key={f.value}
                accessibilityRole="button"
                accessibilityState={{ selected: ratingFilter === f.value }}
                accessibilityLabel={`Filter ${f.label} reviews`}
                onPress={() => setRatingFilter(f.value)}
                style={{
                  minHeight: 36,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: ratingFilter === f.value ? colors.brand : colors.line,
                  backgroundColor: ratingFilter === f.value ? colors.brandSoft : colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: ratingFilter === f.value ? colors.brandDark : colors.muted,
                    fontSize: 12.5,
                    fontWeight: '700',
                  }}
                >
                  {f.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ChipRow>

        {/* Replied / Pending segmented pills */}
        <ChipRow>
          {([
            { key: 'replied' as const, label: 'Replied', count: repliedReviews.length, dot: false },
            { key: 'pending' as const, label: 'Pending', count: pendingReviews.length, dot: true },
          ]).map((opt) => {
            const active = opt.key === reviewFilter;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setReviewFilter(opt.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 38,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: active ? colors.brand : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.brand : colors.line,
                }}
              >
                <Text style={{ color: active ? '#FFFFFF' : colors.muted, fontSize: 13, fontWeight: '600' }}>
                  {opt.label} ({opt.count})
                </Text>
                {opt.dot ? (
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: active ? '#FF6B81' : colors.danger,
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </ChipRow>

        {reviews.loading ? (
          <Loading />
        ) : filteredReviews.length === 0 ? (
          !isConnected ? (
            <Empty
              title="Google reviews not connected"
              detail="Connect your Google Business Profile to pull in your live Google reviews and let AI reply to them."
              actionLabel="Connect Google Business Profile"
              onAction={() => {
                setTab('overview');
                void openConnect();
              }}
            />
          ) : reviewList.length === 0 ? (
            <Empty
              title="No reviews yet"
              detail="When customers review you on Google, they appear here and AI can draft SEO-rich replies."
            />
          ) : (
            <Empty
              title={
                ratingFilter !== 0
                  ? `No ${ratingFilter}★ ${reviewFilter} reviews`
                  : reviewFilter === 'pending'
                  ? 'All reviews answered 🎉'
                  : 'No replied reviews yet'
              }
              detail={
                ratingFilter !== 0
                  ? 'Try a different rating filter to see more reviews.'
                  : reviewFilter === 'pending'
                  ? 'Every Google review has a reply. 100% response rate — the local SEO sweet spot.'
                  : 'Generate AI replies to pending reviews to build your response history.'
              }
            />
          )
        ) : (
          filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              categoryWords={categoryTokens}
              draft={drafts[review.id] || null}
              draftLoading={draftBusyId === review.id}
              replyBusy={replyBusyId === review.id}
              onGenerateDraft={generateDraft}
              onDiscardDraft={(r) =>
                setDrafts((prev) => {
                  const next = { ...prev };
                  delete next[r.id];
                  return next;
                })
              }
              onPublishReply={(r, text) => void publishReply(r, text)}
              onSaveReplied={(r, text) => void publishReply(r, text, true)}
            />
          ))
        )}
      </View>
    );
  }

  function PostCard({ post }: { post: SocialPost }) {
    const open = expandedPostId === post.id;
    const hero = post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls[0] : null;
    const badge =
      post.status === 'published' ? (
        <Pill label="Published" bg={gbpColors.emeraldSoft} color={gbpColors.emerald} icon="check-circle" />
      ) : post.status === 'scheduled' || post.status === 'publishing' ? (
        <Pill label="Scheduled" bg={gbpColors.amberSoft} color="#B45309" icon="schedule" />
      ) : (
        <Pill label="Draft" bg={colors.background} color={colors.muted} icon="edit-note" />
      );
    const lines = (post.content || '').split('\n').filter(Boolean);
    const title = lines[0] || '(untitled post)';
    const summary = lines.slice(1).join(' ');
    const when = post.publishedAt || post.scheduledAt || post.createdAt;
    return (
      <Card style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`Post: ${title}`}
          onPress={() => setExpandedPostId(open ? null : post.id)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {badge}
            {post.gbpPostType ? <Badge label={post.gbpPostType.replace(/_/g, ' ')} /> : null}
          </View>
          {hero ? (
            <Image
              source={{ uri: hero }}
              style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: colors.soft }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              accessibilityLabel="Post image"
            />
          ) : null}
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }} numberOfLines={open ? undefined : 1}>
            {title}
          </Text>
          {summary ? (
            <Text style={{ fontSize: 13, lineHeight: 19, color: colors.muted }} numberOfLines={open ? undefined : 2}>
              {summary}
            </Text>
          ) : null}
          {when ? (
            <Text style={ui.caption}>
              {post.status === 'published' ? 'Posted on' : post.status === 'draft' ? 'Created' : 'Scheduled for'}{' '}
              {new Date(when).toLocaleDateString()}
            </Text>
          ) : null}
        </Pressable>

        {open ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {post.status === 'draft' ? (
              <View style={{ flex: 1 }}>
                <Action
                  label={busyPostId === post.id ? 'Publishing…' : 'Publish now'}
                  icon="cloud-upload"
                  onPress={() => void publishExistingDraft(post)}
                  disabled={busyPostId === post.id}
                />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Action
                label="View Post"
                secondary
                icon="open-in-new"
                onPress={() =>
                  Linking.openURL(`${WEB_URL}/app?product=bgos&view=socialMedia`).catch(() =>
                    setError('Could not open the post viewer.'),
                  )
                }
              />
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.brand }}>
            {post.status === 'draft' ? 'Tap for actions (Publish / View)' : 'View Post →'}
          </Text>
        )}
      </Card>
    );
  }

  function PostsTab() {
    return (
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
            Recent Posts ({postList.length})
          </Text>
          <View style={{ minWidth: 130 }}>
            <AiButton
              label="✨ New Post"
              small
              onPress={() => {
                setComposerOpen(true);
                setDraft(null);
                setEditHeadline('');
                setEditContent('');
                setScheduleChoice('now');
              }}
            />
          </View>
        </View>

        {!isConnected || !gbpAccountId ? (
          <Card style={{ backgroundColor: colors.note, borderColor: colors.noteBorder, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="info-outline" size={16} color={colors.noteText} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.noteText }}>
                Publishing to Google needs a connected profile
              </Text>
            </View>
            <Text style={{ fontSize: 12, lineHeight: 18, color: colors.noteText }}>
              You can still generate AI posts and save drafts. Connect GBP to publish straight to Google Maps.
            </Text>
            <Action
              label="Connect Google Business Profile"
              icon="login"
              onPress={() => {
                setTab('overview');
                void openConnect();
              }}
              disabled={connecting}
            />
          </Card>
        ) : null}

        {composerOpen ? (
          <Card style={{ gap: 12 }}>
            <SectionHeader title="AI Post Composer" icon="auto-awesome" iconColor={gbpColors.ai} />
            <Field
              label="What should the AI write about?"
              placeholder="e.g. Spring HVAC tune-up offer, new team member, weekend event"
              value={postTopic}
              onChangeText={setPostTopic}
            />
            <View style={{ gap: 6 }}>
              <Text style={ui.label}>Post type</Text>
              <ChipRow>
                {POST_TYPES.map((t) => {
                  const active = t.value === postType;
                  return (
                    <Pressable
                      key={t.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setPostType(t.value)}
                      style={{
                        minHeight: 36,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: active ? colors.brand : colors.surface,
                        borderWidth: 1,
                        borderColor: active ? colors.brand : colors.line,
                      }}
                    >
                      <Text style={{ color: active ? '#FFFFFF' : colors.muted, fontSize: 12.5, fontWeight: '700' }}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ChipRow>
            </View>

            {!draft ? (
              <AiButton label={generating ? 'Generating…' : 'Generate ✨'} loading={generating} onPress={generatePost} />
            ) : (
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    backgroundColor: gbpColors.aiSoft,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: gbpColors.aiBorder,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <MaterialIcons name="auto-awesome" size={13} color={gbpColors.ai} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: gbpColors.aiDark }}>
                      AI GENERATED — EDIT BEFORE PUBLISHING
                    </Text>
                  </View>
                  <Field
                    label="Headline"
                    value={editHeadline}
                    onChangeText={setEditHeadline}
                    style={{ minHeight: 44 }}
                  />
                  <Field
                    label="Content"
                    value={editContent}
                    onChangeText={setEditContent}
                    multiline
                    style={{ minHeight: 110 }}
                  />
                  {draft.ctaLabel ? (
                    <View style={{ alignSelf: 'flex-start', backgroundColor: colors.brandSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.brandDark }}>CTA: {draft.ctaLabel}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ gap: 6 }}>
                  <Text style={ui.label}>When should it go out?</Text>
                  <ChipRow>
                    {SCHEDULE_CHOICES.map((opt) => {
                      const active = scheduleChoice === opt.key;
                      return (
                        <Pressable
                          key={opt.key}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => setScheduleChoice(opt.key)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            minHeight: 38,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            backgroundColor: active ? colors.brand : colors.surface,
                            borderWidth: 1,
                            borderColor: active ? colors.brand : colors.line,
                          }}
                        >
                          <MaterialIcons name={opt.icon} size={14} color={active ? '#FFFFFF' : colors.muted} />
                          <Text style={{ color: active ? '#FFFFFF' : colors.muted, fontSize: 12.5, fontWeight: '700' }}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ChipRow>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Action
                      label={
                        publishing
                          ? 'Working…'
                          : scheduleChoice === 'now'
                          ? 'Publish to Google'
                          : scheduleChoice === 'daily'
                          ? 'Schedule Daily'
                          : 'Schedule Weekly'
                      }
                      icon={scheduleChoice === 'now' ? 'cloud-upload' : 'schedule'}
                      onPress={() => void publishDraft(scheduleChoice === 'now' ? 'published' : 'scheduled')}
                      disabled={publishing}
                    />
                  </View>
                  <View style={{ minWidth: 110 }}>
                    <Action label="Save Draft" secondary onPress={() => void publishDraft('draft')} disabled={publishing} />
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDraft(null);
                    setComposerOpen(false);
                  }}
                  hitSlop={8}
                  style={{ alignSelf: 'center' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Discard composer</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ) : null}

        {postsRes.loading ? (
          <Loading />
        ) : postList.length === 0 ? (
          <Empty
            title="No posts yet"
            detail="AI writes SEO-rich Google posts (1-2 per week) that keep your profile ranking. Create your first one."
            actionLabel="✨ New Post"
            onAction={() => {
              setComposerOpen(true);
              setDraft(null);
            }}
          />
        ) : (
          postList.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </View>
    );
  }

  function PhotosTab() {
    return (
      <View style={{ gap: 12 }}>
        <SectionHeader title="Google Photos" icon="photo-library" />
        <PhotosBoard
          data={photosRes.data}
          loading={photosRes.loading}
          error={photosRes.error}
          refresh={photosRes.refresh}
          connected={isConnected}
          onNeedConnect={() => setTab('overview')}
        />
      </View>
    );
  }

  return (
    <Screen
      title="GBP AI Hub"
      subtitle="Google Business Profile on autopilot — AI optimisation, replies, posts & photos"
      onRefresh={refreshAll}
      rightAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open GBP on BGOS Web"
          onPress={() => Linking.openURL(`${WEB_URL}/app?product=bgos&view=socialMedia`).catch(() => {})}
          style={[ui.row, { backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 }]}
        >
          <MaterialIcons name="open-in-new" size={14} color={colors.brandDark} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brandDark }}>Web</Text>
        </Pressable>
      }
    >
      <ErrorNotice
        message={error || workspace.error || reviews.error || audit.error || gbpPlace.error}
        retry={refreshAll}
      />

      <Segmented<ToolTab>
        scrollable
        options={[
          { value: 'overview', label: 'Overview', icon: 'space-dashboard' },
          { value: 'reviews', label: 'Reviews', icon: 'star-outline', count: reviewList.length },
          { value: 'posts', label: 'Posts', icon: 'article', count: postList.length },
          { value: 'photos', label: 'Photos', icon: 'photo-library', count: photosRes.data?.liveCount ?? 0 },
          { value: 'performance', label: 'Performance', icon: 'insights' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'overview' ? <OverviewTab /> : null}
      {tab === 'reviews' ? <ReviewsTab /> : null}
      {tab === 'posts' ? <PostsTab /> : null}
      {tab === 'photos' ? <PhotosTab /> : null}
      {tab === 'performance' ? (
        <PerformancePanel
          analytics={analytics.data}
          analyticsLoading={analytics.loading}
          isConnected={isConnected}
          connecting={connecting}
          onConnect={() => {
            setTab('overview');
            void openConnect();
          }}
          aiActions={aiActions}
          onOpenPosts={() => setTab('posts')}
          userEmail={user?.email || ''}
        />
      ) : null}

      {/* WhatsApp-style Google review request (real wa.me deep link + provider invite) */}
      <ReviewRequestSheet
        visible={requestOpen}
        onClose={() => setRequestOpen(false)}
        businessName={businessName}
        reviewUrl={
          gbpPlace.data?.place?.reviewUrl ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName)}`
        }
        apiRequest={apiRequest}
      />
    </Screen>
  );
}
