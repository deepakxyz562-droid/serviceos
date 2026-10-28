import React, { useState } from 'react';
import { Text, Linking, View, ScrollView, Alert, Switch } from 'react-native';
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

type OmnichannelResult = {
  whatsapp: { enabled: boolean; mode: string };
  instagram: { enabled: boolean; commentToDmEnabled: boolean };
  facebook: { enabled: boolean };
  sms: { enabled: boolean };
  autoGbpPosting?: boolean;
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
  const reviews = useResource<{ reviews: Review[] }>('/api/reviews');
  const audit = useResource<AuditResult>('/api/gbp/audit');
  const analytics = useResource<AnalyticsResult>('/api/gbp/analytics');
  const omnichannel = useResource<OmnichannelResult>('/api/omnichannel/auto-reply');
  const socialAccounts = useResource<{ data: any[] }>('/api/social/accounts');
  const gbpPlace = useResource<{
    isConnected: boolean;
    place?: {
      locationId: string;
      title: string;
      category: string;
      address: string;
      phone?: string;
      website?: string;
      placeId?: string;
      mapsUrl?: string;
    };
  }>('/api/gbp/place');

  const isGbpConnected = Boolean(
    gbpPlace.data?.isConnected ??
    socialAccounts.data?.data?.some((a) => a.platform === 'googlebusiness' && a.isActive !== false)
  );
  const isFbConnected = Boolean(socialAccounts.data?.data?.some((a) => a.platform === 'facebook' && a.isActive !== false));
  const isIgConnected = Boolean(socialAccounts.data?.data?.some((a) => a.platform === 'instagram' && a.isActive !== false));

  const [activeTab, setActiveTab] = useState<'google' | 'reviews' | 'autoreply'>('google');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoDripMode, setPhotoDripMode] = useState<'staggered' | 'daily' | 'instant'>('staggered');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const reviewList = reviews.data?.reviews || [];
  const pendingCount = reviewList.filter((r) => !parseReplyText(r)).length;
  const repliedCount = reviewList.filter((r) => Boolean(parseReplyText(r))).length;

  // Live Google telemetry is only shown when the API confirms live Google data.
  // When absent we render '—' / honest hints — never fabricated numbers.
  const liveMetrics = analytics.data?.isLiveGoogleApi ? analytics.data.metrics : null;
  const auditScore = audit.data ? audit.data.score : null;
  const auditGrade = audit.data?.grade || null;
  const responseRate =
    typeof analytics.data?.metrics?.responseRate === 'number' && analytics.data.isConnected
      ? analytics.data.metrics.responseRate
      : null;

  // 1-Click OAuth into the BGOS web connect flow. The access token is passed so
  // the browser session is authenticated — without it the flow bounces to login.
  async function openOAuth(platform: 'googlebusiness' | 'facebook' | 'instagram') {
    try {
      const token = await getToken();
      const authPart = token ? `&auth=${encodeURIComponent(token)}` : '';
      await Linking.openURL(`${WEB_URL}/api/oauth/${platform}?product=bgos&returnView=socialMedia${authPart}`);
    } catch {
      setError('Could not open the browser to connect. Try again or connect from BGOS web.');
    }
  }

  const filteredReviews = reviewList.filter((r) => {
    if (reviewFilter === 'all') return true;
    if (reviewFilter === 'pending') return !parseReplyText(r);
    if (reviewFilter === 'replied') return Boolean(parseReplyText(r));
    return true;
  });

  async function requestReview() {
    const reviewLink = workspace.data?.links.review;
    if (!reviewLink || !/^https:\/\//i.test(reviewLink)) {
      setError('Configure your business review link in BGOS web before sending an invitation.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      setError('Enter a valid mobile number with country code.');
      return;
    }
    try {
      await Linking.openURL(
        `https://wa.me/${digits}?text=${encodeURIComponent(
          `Hi ${name.trim() || 'there'}, thank you for choosing ${
            workspace.data?.name || 'our business'
          }! Please take 10 seconds to share your experience: ${reviewLink}`
        )}`
      );
      setError(null);
    } catch {
      setError('Could not open WhatsApp. Check that it is installed.');
    }
  }

  // 1-Click AI SEO Optimizer for Google Business Profile
  async function optimizeGbpSeo() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; seoDescription: string }>('/api/gbp/keywords', {
        method: 'POST',
        body: {
          businessName: workspace.data?.name || 'Our Business',
          applyToProfile: true,
        },
      });
      if (res.success) {
        Alert.alert(
          'Profile SEO updated! 🚀',
          'High-intent local SEO keywords and an optimized GBP description have been applied. Your refreshed audit score is shown above.',
        );
        await audit.refresh();
      }
    } catch (e: any) {
      setError(e.message || 'Could not optimize SEO keywords.');
    } finally {
      setBusy(false);
    }
  }

  // 1-Tap AI Review Reply & Publish to Google.
  // Draft is generated by the real AI caption API; the canned template is only
  // used when the AI call fails, and the user is told when that happens.
  async function publishReviewReply(review: Review) {
    setBusy(true);
    setError(null);
    try {
      const author = review.authorName || 'valued customer';
      const businessName = workspace.data?.name || 'our business';
      const reviewText = (review.comment || '').slice(0, 300);
      let replyText = `Thank you so much ${author}! We truly appreciate your ${review.rating}-star review and look forward to serving you again soon.`;
      let usedTemplate = false;
      try {
        const ai = await apiRequest<{ caption: string }>('/api/social/ai-caption', {
          method: 'POST',
          body: {
            topic: `Write a warm professional Google review reply from ${businessName} to ${author} (${review.rating} stars) who wrote: "${reviewText}"`,
            platforms: ['googlebusiness'],
            tone: 'friendly, appreciative',
          },
        });
        if (ai?.caption?.trim()) replyText = ai.caption.trim();
      } catch {
        // AI unavailable — fall back to the template, but say so in the UI.
        usedTemplate = true;
      }

      const res = await apiRequest<{ success: boolean; message?: string }>(`/api/reviews/${review.id}/reply`, {
        method: 'POST',
        body: { replyText },
      });

      if (res.success) {
        Alert.alert(
          usedTemplate ? 'Reply published (template used)' : 'Published to Google! ✅',
          usedTemplate
            ? `AI was unavailable, so a template reply was published to Google Business Profile. You can edit it anytime on the web.\n\n"${replyText}"`
            : res.message || 'AI-drafted review reply published to Google Business Profile.'
        );
        await reviews.refresh();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to publish review reply.');
    } finally {
      setBusy(false);
    }
  }

  // AI Photo Drip Scheduler — only uses media the user actually provides.
  // No stock photos are ever seeded to the live Google Business Profile.
  async function startPhotoDrip() {
    const url = customPhotoUrl.trim();
    if (!url) {
      setError('Paste a public photo URL first — BGOS never posts stock photos to your Google profile.');
      return;
    }
    if (!/^https:\/\//i.test(url)) {
      setError('Enter a public https:// image URL so Google can fetch the media.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/social/photos', {
        method: 'POST',
        body: {
          photos: [url],
          scheduleMode: photoDripMode,
          category: 'ADDITIONAL',
        },
      });
      if (res.success) {
        setCustomPhotoUrl('');
        Alert.alert('Photo Drip Scheduled! 📸', res.message);
      }
    } catch (e: any) {
      setError(e.message || 'Could not schedule photo drip.');
    } finally {
      setBusy(false);
    }
  }

  // Toggle Auto GBP Weekly Posting (1-2x per week)
  async function toggleAutoGbpPosting(enabled: boolean) {
    setBusy(true);
    try {
      await apiRequest('/api/omnichannel/auto-reply', {
        method: 'POST',
        body: { autoGbpPosting: enabled },
      });
      await omnichannel.refresh();
      Alert.alert(
        enabled ? 'Auto GBP Posting Active! 🚀' : 'Auto GBP Posting Paused',
        enabled
          ? 'AI will automatically craft and publish 1-2 localized SEO posts weekly to your Google Business Profile.'
          : 'Weekly automated GBP posts have been paused.'
      );
    } catch (e: any) {
      setError(e.message || 'Failed to update auto GBP posting.');
    } finally {
      setBusy(false);
    }
  }

  // Toggle Omnichannel Auto-Reply Settings
  async function toggleChannel(channel: 'whatsapp' | 'instagram' | 'facebook' | 'sms', enabled: boolean) {
    setBusy(true);
    try {
      await apiRequest('/api/omnichannel/auto-reply', {
        method: 'POST',
        body: {
          [channel]: { enabled, mode: 'ai', commentToDmEnabled: enabled },
        },
      });
      await omnichannel.refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to update auto-reply settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      title="Google & Reputation"
      subtitle="AI GBP optimisation, review replies & omnichannel auto-reply."
      showBack={true}
      onRefresh={async () => {
        await Promise.all([
          workspace.refresh(),
          reviews.refresh(),
          audit.refresh(),
          analytics.refresh(),
          omnichannel.refresh(),
        ]);
      }}
      rightAction={
        <Action
          label="Share QR"
          icon="qr-code"
          secondary
          onPress={() => router.push('/(tabs)/tools')}
        />
      }
    >
      <ErrorNotice message={error || workspace.error || reviews.error} />

      {/* Tabs: Google & SEO vs Reviews vs Omnichannel */}
      <View style={[ui.row, { justifyContent: 'space-between', gap: 6 }]}>
        <Chip
          label="Google & SEO"
          selected={activeTab === 'google'}
          onPress={() => setActiveTab('google')}
        />
        <Chip
          label="Reviews"
          count={reviewList.length}
          selected={activeTab === 'reviews'}
          onPress={() => setActiveTab('reviews')}
        />
        <Chip
          label="Auto-Reply"
          selected={activeTab === 'autoreply'}
          onPress={() => setActiveTab('autoreply')}
        />
      </View>

      {/* TAB 1: GOOGLE & SEO */}
      {activeTab === 'google' && (
        <View style={{ gap: 14 }}>
          {/* Google Business Connect Card if Not Connected */}
          {!isGbpConnected && (
            <Card style={{ gap: 10, backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Badge label="Action Required" accent />
                <Text style={{ color: '#D97706', fontSize: 11, fontWeight: '700' }}>Google Business</Text>
              </View>
              <Text style={[ui.heading, { fontSize: 15, color: '#92400E' }]}>
                Connect Your Google Profile
              </Text>
              <Text style={[ui.body, { fontSize: 12, color: '#B45309' }]}>
                Link your official Google Business Profile to view real customer reviews, sync live Search/Maps metrics, and publish AI replies.
              </Text>
              <Action
                label="1-Click Connect Google"
                icon="store"
                onPress={() => void openOAuth('googlebusiness')}
              />
            </Card>
          )}

          {/* Connected Google Place Details Card */}
          {isGbpConnected && (
            <Card style={{ gap: 8, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <Badge label="✓ Verified Google Place" success />
                <Text style={{ color: '#166534', fontSize: 11, fontWeight: '700' }}>
                  {gbpPlace.data?.place?.category || 'Professional Services'}
                </Text>
              </View>
              <Text style={[ui.heading, { fontSize: 16, color: '#14532D' }]}>
                {gbpPlace.data?.place?.title || workspace.data?.name || 'Your Business'}
              </Text>
              <Text style={[ui.caption, { color: '#166534' }]}>
                {gbpPlace.data?.place?.address || 'Address registered on Google Maps'}
              </Text>
              <Action
                label="View on Google Maps"
                icon="map"
                secondary
                onPress={() =>
                  Linking.openURL(
                    gbpPlace.data?.place?.mapsUrl ||
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        gbpPlace.data?.place?.title || workspace.data?.name || 'Business'
                      )}`
                  )
                }
              />
            </Card>
          )}

          {/* AI GBP 100% Optimization Card */}
          <Card style={{ gap: 10, backgroundColor: '#070B2D' }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Badge label="AI GBP Optimisation" success />
              <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '700' }}>
                Grade {auditGrade ?? '—'}
              </Text>
            </View>
            <Text style={[ui.heading, { color: '#FFFFFF', fontSize: 16 }]}>
              Profile Health: {auditScore != null ? `${auditScore}% complete` : '—'}
            </Text>
            <Text style={[ui.body, { color: '#94A3B8', fontSize: 12 }]}>
              {auditScore != null
                ? 'Suggests SEO-friendly local keywords and optimizes your GBP description with rich content to rank in the Local 3-Pack.'
                : 'Run the profile audit to see your real completeness score and grade.'}
            </Text>
            <Action
              label={busy ? 'Optimizing...' : 'AI 1-Click SEO Optimizer'}
              icon="auto-awesome"
              disabled={busy}
              onPress={optimizeGbpSeo}
            />
          </Card>

          {/* Performance Telemetry Card — real values only, never fabricated */}
          <Card style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>Google Search &amp; Maps Performance</Text>
              {analytics.data?.trendsAvailable ? (
                <Badge label="Live Google data" success />
              ) : (
                <Badge label="No trend data yet" accent />
              )}
            </View>
            {liveMetrics ? (
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
                    {liveMetrics.totalViews.toLocaleString()}
                  </Text>
                  <Text style={ui.caption}>Total Views</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.brand }}>
                    {liveMetrics.callClicks.toLocaleString()}
                  </Text>
                  <Text style={ui.caption}>Call Clicks</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
                    {liveMetrics.directionRequests.toLocaleString()}
                  </Text>
                  <Text style={ui.caption}>Directions</Text>
                </View>
              </View>
            ) : (
              <View style={[ui.row, { justifyContent: 'space-between' }]}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.muted }}>—</Text>
                  <Text style={ui.caption}>Total Views</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.muted }}>—</Text>
                  <Text style={ui.caption}>Call Clicks</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.muted }}>—</Text>
                  <Text style={ui.caption}>Directions</Text>
                </View>
              </View>
            )}
            <Text style={[ui.caption, { textAlign: 'center', color: colors.muted, fontWeight: '600' }]}>
              {responseRate != null
                ? `${responseRate}% of your Google reviews have a published reply`
                : isGbpConnected
                ? 'Google insights will appear here once Google reports performance data.'
                : 'Connect Google Business for live data.'}
            </Text>
          </Card>

          {/* AI Auto GBP Posting (1-2x Weekly) Card */}
          <Card style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={[ui.row, { gap: 8 }]}>
                <MaterialIcons name="auto-awesome" size={20} color="#168557" />
                <Text style={ui.heading}>Auto GBP Posting (1-2x Weekly)</Text>
              </View>
              <Switch
                value={omnichannel.data?.autoGbpPosting ?? false}
                disabled={busy}
                onValueChange={toggleAutoGbpPosting}
              />
            </View>
            <Text style={ui.body}>
              AI autonomously crafts and publishes 1-2 localized SEO-rich posts weekly to your Google Business Profile to keep your listing active on Google Maps.
            </Text>
            <View style={[ui.row, { gap: 6 }]}>
              <Badge
                label={omnichannel.data?.autoGbpPosting ? 'Active • 1-2 Posts/Week' : 'Paused'}
                success={Boolean(omnichannel.data?.autoGbpPosting)}
                accent={!omnichannel.data?.autoGbpPosting}
              />
              <Badge label="Local SEO Engine" />
            </View>
          </Card>

          {/* AI Bulk Photo Upload & Drip Scheduler */}
          <Card style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>Photo Upload &amp; Drip</Text>
              <Badge label="Google Media" accent />
            </View>
            <Text style={ui.body}>
              Paste a public image URL of your own work. BGOS schedules it to your Google Business Profile on your chosen cadence — stock photos are never posted.
            </Text>
            <Field
              label="Public Photo URL (required)"
              value={customPhotoUrl}
              onChangeText={setCustomPhotoUrl}
              placeholder="https://your-cdn.com/job-photo.jpg"
              autoCapitalize="none"
            />
            <View style={[ui.row, { gap: 6 }]}>
              {[
                ['staggered', 'Drip: 2 Days'],
                ['daily', 'Drip: Daily'],
                ['instant', 'Instant'],
              ].map(([mode, label]) => (
                <Chip
                  key={mode}
                  label={label}
                  selected={photoDripMode === mode}
                  onPress={() => setPhotoDripMode(mode as any)}
                />
              ))}
            </View>
            <Action
              label={busy ? 'Scheduling...' : 'Schedule Photo Drip'}
              icon="add-photo-alternate"
              disabled={busy}
              secondary
              onPress={startPhotoDrip}
            />
          </Card>

          {/* GBP AI Agents vs Marketing Agency Matrix */}
          <Card style={{ gap: 10, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[ui.heading, { fontSize: 15 }]}>GBP AI Agents vs Marketing Agency</Text>
                <Text style={[ui.caption, { color: '#64748B' }]}>Same job. Faster, cheaper, smarter.</Text>
              </View>
              <Chip
                label={showComparison ? 'Hide Table' : 'Compare'}
                selected={showComparison}
                onPress={() => setShowComparison(!showComparison)}
              />
            </View>

            {showComparison && (
              <View style={{ gap: 6, marginTop: 4 }}>
                {[
                  ['SEO keyword research', '1-Click Local SEO Engine', 'Manual, 2-3 wks delay'],
                  ['GBP content rewriting', 'Instant 750-char SEO Content', 'Paid agency add-on'],
                  ['Auto GBP posting', '1-2 automated posts/wk', 'Bi-weekly or missed'],
                  ['Review reply writing', 'Instant AI-drafted replies', '24-72h delay'],
                  ['Review generation', 'Auto SMS/WhatsApp invite', 'Manual or none'],
                  ['24/7 availability', '24/7/365 active co-pilot', 'Mon-Fri 9-5 only'],
                  ['Monthly cost', 'Included with BGOS', 'Agency retainer'],
                ].map(([task, aiVal, agencyVal], idx) => (
                  <View
                    key={idx}
                    style={{
                      padding: 8,
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F1F5F9',
                      borderRadius: 8,
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>{task}</Text>
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={{ fontSize: 11, color: '#168557', fontWeight: '600', flex: 1 }}>
                        ✓ AI: {aiVal}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748B', flex: 1, textAlign: 'right' }}>
                        Agency: {agencyVal}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Action
            label="Create Google Business Post"
            icon="post-add"
            onPress={() => router.push('/(tabs)/marketing')}
          />
        </View>
      )}

      {/* TAB 2: REVIEWS & REPLIES */}
      {activeTab === 'reviews' && (
        <View style={{ gap: 14 }}>
          {/* Ask for a Review Card */}
          <Card style={{ gap: 10 }}>
            <Text style={ui.heading}>Request a Customer Review</Text>
            <Text style={ui.body}>
              Send a personalized review invitation directly to your customer on WhatsApp with 1 tap.
            </Text>
            <Field label="Customer Name" value={name} onChangeText={setName} placeholder="e.g. Priya Singh" />
            <Field
              label="WhatsApp Mobile Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
            />
            <Action
              label="Open Review Request in WhatsApp"
              icon="chat"
              disabled={!phone.trim()}
              onPress={requestReview}
            />
          </Card>

          {/* Review Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={ui.row}>
              {[
                ['all', `All (${reviewList.length})`],
                ['pending', `Pending (${pendingCount})`],
                ['replied', `Replied (${repliedCount})`],
              ].map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={reviewFilter === key}
                  onPress={() => setReviewFilter(key as any)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Review Items */}
          {reviews.loading ? (
            <Loading />
          ) : filteredReviews.length === 0 ? (
            <Empty
              title={reviewFilter === 'all' ? 'No customer reviews yet' : `No ${reviewFilter} reviews`}
              detail="Send review requests to customers via WhatsApp or share your Google review link."
            />
          ) : (
            filteredReviews.map((r) => {
              const reply = parseReplyText(r);
              return (
                <Card key={r.id} style={{ gap: 8 }}>
                  <View style={[ui.row, { justifyContent: 'space-between' }]}>
                    <View style={[ui.row, { gap: 10 }]}>
                      <Avatar name={r.authorName || 'Customer'} size={40} />
                      <View>
                        <Text style={ui.heading}>{r.authorName || 'Customer'}</Text>
                        <Text style={ui.caption}>
                          {r.source || 'Google Review'} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'}
                        </Text>
                      </View>
                    </View>
                    <Badge
                      label={reply ? 'Replied on Google' : 'Pending Reply'}
                      success={Boolean(reply)}
                      accent={!reply}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Text key={idx} style={{ fontSize: 16, color: idx < r.rating ? '#F59E0B' : '#D1D5DB' }}>
                        ★
                      </Text>
                    ))}
                  </View>

                  {r.comment ? <Text style={ui.body}>{r.comment}</Text> : null}

                  {reply ? (
                    <View style={{ backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.brand }}>
                      <Text style={[ui.caption, { fontWeight: '700', color: colors.ink }]}>Your Reply:</Text>
                      <Text style={[ui.caption, { fontStyle: 'italic', marginTop: 2 }]}>"{reply}"</Text>
                    </View>
                  ) : (
                    <Action
                      label={busy ? 'Publishing...' : 'AI Instant Reply & Publish'}
                      icon="reply"
                      disabled={busy}
                      onPress={() => publishReviewReply(r)}
                    />
                  )}
                </Card>
              );
            })
          )}
        </View>
      )}

      {/* TAB 3: OMNICHANNEL AUTO-REPLY */}
      {activeTab === 'autoreply' && (
        <View style={{ gap: 14 }}>
          {/* Header Card */}
          <Card style={{ gap: 8 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>Omnichannel AI Auto-Reply Hub</Text>
              <Badge label="24/7 Co-Pilot" success />
            </View>
            <Text style={ui.body}>
              Never lose a customer inquiry. AI responds instantly to direct messages and post comments across all channels.
            </Text>
          </Card>

          {/* WhatsApp Toggle */}
          <Card style={{ gap: 8 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={[ui.row, { gap: 8 }]}>
                <MaterialIcons name="chat" size={20} color="#168557" />
                <Text style={ui.heading}>WhatsApp Auto-Reply</Text>
              </View>
              <Switch
                value={omnichannel.data?.whatsapp?.enabled ?? false}
                disabled={busy}
                onValueChange={(val) => toggleChannel('whatsapp', val)}
              />
            </View>
            <Text style={ui.caption}>
              Answers inquiries, presents service options, and shares instant appointment booking slots.
            </Text>
          </Card>

          {/* Instagram DM & Comment-to-DM */}
          <Card style={{ gap: 8 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={[ui.row, { gap: 8 }]}>
                <MaterialIcons name="photo-camera" size={20} color="#E1306C" />
                <Text style={ui.heading}>Instagram DM &amp; Comment-to-DM</Text>
              </View>
              <Switch
                value={omnichannel.data?.instagram?.enabled ?? false}
                disabled={busy}
                onValueChange={(val) => toggleChannel('instagram', val)}
              />
            </View>
            <Text style={ui.caption}>
              When users comment "price", "how much", or "quote" on Reels/Posts, AI automatically DMs the quote &amp; booking link.
            </Text>
            {!isIgConnected && (
              <Action
                label="1-Click Connect Instagram"
                icon="photo-camera"
                secondary
                onPress={() => void openOAuth('instagram')}
              />
            )}
          </Card>

          {/* Facebook Messenger & Feed Comments */}
          <Card style={{ gap: 8 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={[ui.row, { gap: 8 }]}>
                <MaterialIcons name="facebook" size={20} color="#1877F2" />
                <Text style={ui.heading}>Facebook Messenger &amp; Comments</Text>
              </View>
              <Switch
                value={omnichannel.data?.facebook?.enabled ?? false}
                disabled={busy}
                onValueChange={(val) => toggleChannel('facebook', val)}
              />
            </View>
            <Text style={ui.caption}>
              Replies to Page messages and sends private links to commenters inquiring about pricing.
            </Text>
            {!isFbConnected && (
              <Action
                label="1-Click Connect Facebook"
                icon="facebook"
                secondary
                onPress={() => void openOAuth('facebook')}
              />
            )}
          </Card>

          {/* SMS Auto-Reply */}
          <Card style={{ gap: 8 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={[ui.row, { gap: 8 }]}>
                <MaterialIcons name="textsms" size={20} color="#F59E0B" />
                <Text style={ui.heading}>SMS Auto-Reply</Text>
              </View>
              <Switch
                value={omnichannel.data?.sms?.enabled ?? false}
                disabled={busy}
                onValueChange={(val) => toggleChannel('sms', val)}
              />
            </View>
            <Text style={ui.caption}>
              Sends an instant text response when customers text after hours or during busy job hours.
            </Text>
          </Card>

          {/* Value comparison matrix banner */}
          <Card style={{ gap: 8, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
            <Text style={[ui.heading, { color: '#166534' }]}>
              GBP AI Agents vs Marketing Agency
            </Text>
            <Text style={[ui.caption, { color: '#15803D' }]}>
              • 24/7 instant review responses (&lt; 5 min) vs 48-hour delay{'\n'}
              • 1-Click 750-char SEO description vs paid agency add-on{'\n'}
              • Automated photo drip vs client manual uploads{'\n'}
              • Included with BGOS vs separate agency retainer
            </Text>
          </Card>
        </View>
      )}
    </Screen>
  );
}
