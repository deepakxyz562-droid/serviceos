import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card, Empty, ErrorNotice, Loading, Screen, colors, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { relativeDate } from '../../src/components/gbp/bits';
import type { GbpPlaceResult, Review } from '../../src/components/gbp/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  activeProfile?: { id: string; name: string; shortId: string; initial: string };
}

type ReviewsResponse = { reviews: Review[]; pagination?: { total: number } };
type ReplyFilter = 'all' | 'pending' | 'replied';

interface KeywordUsage {
  keyword: string;
  volume: string;
}

interface ParsedReply {
  text: string;
  repliedAt?: string;
  repliedBy?: string;
  publishedToGoogle?: boolean;
  googleError?: string | null;
  mapsUrl?: string | null;
  keywords?: KeywordUsage[];
}

const DEFAULT_KEYWORDS_FALLBACK: KeywordUsage[] = [
  { keyword: 'quality customer service', volume: '500 ↗' },
  { keyword: 'top rated local business', volume: '350 ↗' },
  { keyword: 'verified customer satisfaction', volume: '250 ↗' },
];

function parseReply(review: Review): ParsedReply | null {
  try {
    const parsed = JSON.parse(review.responseJson || '{}');
    const text = parsed && (parsed.text || parsed.replyText);
    if (text) {
      return {
        text,
        repliedAt: parsed.repliedAt,
        repliedBy: parsed.repliedBy || 'Owner',
        publishedToGoogle: Boolean(parsed.publishedToGoogle),
        googleError: parsed.googleError || null,
        mapsUrl: parsed.mapsUrl || null,
        keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0
          ? parsed.keywords
          : DEFAULT_KEYWORDS_FALLBACK,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Outline button with two-tone gradient border (purple to coral) */
function GradientOutlineReplyButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: !!loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 40,
        borderRadius: 12,
        padding: 1.5,
        backgroundColor: '#9333EA',
        opacity: loading ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: 12,
          flexDirection: 'row',
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#9333EA', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }} />
        <View style={{ flex: 1, backgroundColor: '#EA580C', borderTopRightRadius: 12, borderBottomRightRadius: 12 }} />
      </View>
      <View
        style={{
          flex: 1,
          backgroundColor: '#FFFFFF',
          borderRadius: 10.5,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#9333EA" />
        ) : (
          <>
            <Text style={{ color: '#9333EA', fontSize: 13.5, fontWeight: '700' }}>{label}</Text>
            <MaterialIcons name="chat-bubble-outline" size={15} color="#EA580C" />
          </>
        )}
      </View>
    </Pressable>
  );
}

export default function ReviewRepliesScreen() {
  const router = useRouter();
  const reviews = useResource<ReviewsResponse>('/api/reviews?source=google&limit=50');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const discover = useResource<DiscoverResponse>('/api/gbp/accounts/discover');

  const [filter, setFilter] = useState<ReplyFilter>('all');
  const [drafts, setDrafts] = useState<Record<string, { text: string; keywords?: KeywordUsage[] }>>({});
  const [draftBusyId, setDraftBusyId] = useState<string | null>(null);
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);
  const [autoReplyBusy, setAutoReplyBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [notice, setNotice] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [topSlide, setTopSlide] = useState(0);
  const [slideWidth, setSlideWidth] = useState(SCREEN_WIDTH - 32);

  const activeProfile = discover.data?.activeProfile;
  const shortId = activeProfile?.shortId || (gbpPlace.data?.place?.locationId ? `#${gbpPlace.data.place.locationId.slice(-4)}` : '');
  const phone = discover.data?.phone || gbpPlace.data?.place?.phone || '';

  useFocusEffect(
    useCallback(() => {
      void Promise.all([reviews.refresh(), gbpPlace.refresh(), discover.refresh()]).catch(() => {});
    }, [])
  );
  const version = discover.data?.version || 'v2.83';

  const all = useMemo(() => reviews.data?.reviews || [], [reviews.data]);
  const pending = useMemo(() => all.filter((r) => !parseReply(r)), [all]);
  const replied = useMemo(() => all.filter((r) => parseReply(r)), [all]);
  const totalRatings = reviews.data?.pagination?.total ?? all.length;

  // Dynamic Average Rating Calculation
  const averageRating = useMemo(() => {
    if (all.length === 0) return '0.0';
    const sum = all.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / all.length).toFixed(1);
  }, [all]);

  const shown = filter === 'pending' ? pending : filter === 'replied' ? replied : all;

  async function handleTriggerAutoReply() {
    if (autoReplyBusy) return;
    setAutoReplyBusy(true);
    setLocalError(null);
    setNotice('');
    try {
      const res = await apiRequest<{ success: boolean; processedCount: number; message: string }>('/api/reviews/auto-reply', {
        method: 'POST',
        body: { minRating: 1 },
      });
      setNotice(res.message || `Processed ${res.processedCount} auto-replies.`);
      await reviews.refresh();
    } catch (err: unknown) {
      setLocalError((err as Error).message || 'AI Auto-reply failed.');
    } finally {
      setAutoReplyBusy(false);
    }
  }

  async function handleShareReply(text: string) {
    try {
      await Share.share({ message: text });
    } catch {}
  }

  async function handleOpenMaps(url?: string | null) {
    const target = url || gbpPlace.data?.place?.mapsUrl || 'https://business.google.com/';
    try {
      await Linking.openURL(target);
    } catch {
      Alert.alert('Google Maps Link', target);
    }
  }

  async function generateDraft(review: Review) {
    if (draftBusyId) return;
    setDraftBusyId(review.id);
    setLocalError(null);
    setNotice('');
    try {
      const rating = Math.max(1, Math.min(5, Math.round(review.rating || 0)));
      const businessTitle = activeProfile?.name || gbpPlace.data?.place?.title || 'our business';
      const prompt =
        `Write a Google review reply (2-3 sentences, warm and professional) to this ${rating}★ review` +
        ` from ${review.authorName || 'valued customer'}` +
        (review.comment ? `: "${review.comment}"` : ' (rating only)') +
        `. Tailor response warmly on behalf of ${businessTitle}.`;
      const res = await apiRequest<{ caption: string; keywords?: KeywordUsage[] }>('/api/social/ai-caption', {
        method: 'POST',
        body: { topic: prompt, platforms: ['googlebusiness'], tone: 'Friendly and professional' },
      });
      if (!res.caption) throw new Error('AI reply generation failed. You can write one manually.');
      setDrafts((prev) => ({
        ...prev,
        [review.id]: {
          text: res.caption,
          keywords: res.keywords || DEFAULT_KEYWORDS_FALLBACK,
        },
      }));
    } catch (e) {
      setLocalError((e as Error).message || 'AI reply generation failed.');
    } finally {
      setDraftBusyId(null);
    }
  }

  async function publishReply(review: Review, text: string, kw?: KeywordUsage[]) {
    if (replyBusyId) return;
    setReplyBusyId(review.id);
    setLocalError(null);
    setNotice('');
    try {
      const res = await apiRequest<{
        message?: string;
        publishedToGoogle?: boolean;
        googleError?: string | null;
        mapsUrl?: string | null;
      }>(`/api/reviews/${review.id}/reply`, {
        method: 'POST',
        body: {
          replyText: text.trim(),
          keywords: kw || drafts[review.id]?.keywords || DEFAULT_KEYWORDS_FALLBACK,
        },
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[review.id];
        return next;
      });
      setEditingId(null);
      if (res.publishedToGoogle) {
        setNotice(res.message || 'Reply published to Google Maps successfully!');
      } else {
        setNotice('Reply saved in BGOS! Google sync pending (quota limit active). Use "Open Maps ↗" to paste it.');
      }
      await reviews.refresh();
    } catch (e) {
      setLocalError((e as Error).message || 'Could not publish reply.');
    } finally {
      setReplyBusyId(null);
    }
  }

  function confirmDeleteReply(review: Review) {
    Alert.alert(
      'Delete Reply',
      'Are you sure you want to remove your reply to this review? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusyId(review.id);
            try {
              await apiRequest(`/api/reviews/${review.id}/reply`, { method: 'DELETE' });
              setNotice('Reply removed.');
              await reviews.refresh();
            } catch (e) {
              Alert.alert('Error', (e as Error).message || 'Failed to delete reply.');
            } finally {
              setDeleteBusyId(null);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Screen
        title="Review Replies"
        subtitle={[phone, shortId.replace('#', ''), version].filter(Boolean).join(' | ')}
        showBack={true}
        onBack={() => {
          if (router.canGoBack?.()) router.back();
          else router.push('/(tabs)');
        }}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Reply Settings"
            onPress={() => router.push('/reply-settings')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#0F172A',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <MaterialIcons name="settings" size={14} color="#FFFFFF" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Settings</Text>
          </Pressable>
        }
        onRefresh={async () => {
          await Promise.all([reviews.refresh(), gbpPlace.refresh(), discover.refresh()]).catch(() => {});
        }}
      >
        <ErrorNotice message={reviews.error || gbpPlace.error} retry={reviews.refresh} />
        <ErrorNotice message={localError} />

        {notice ? (
          <View style={{ backgroundColor: colors.successSoft, padding: 12, borderRadius: 12, marginBottom: 8 }}>
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {notice}</Text>
          </View>
        ) : null}

        {/* ── TOP CAROUSEL: SLIDE 1 (Google Ratings) | SLIDE 2 (Reviews Trend) ── */}
        <View
          onLayout={(e) => setSlideWidth(e.nativeEvent.layout.width)}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const idx = Math.round(x / Math.max(1, slideWidth));
              setTopSlide(idx);
            }}
            scrollEventThrottle={16}
          >
            {/* Slide 1: Google Ratings (Screenshot 08.55.28 (3)) */}
            <View
              style={{
                width: slideWidth,
                paddingVertical: 24,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {/* Google colored logo header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 18, fontWeight: '800' }}>
                  <Text style={{ color: '#4285F4' }}>G</Text>
                  <Text style={{ color: '#EA4335' }}>o</Text>
                  <Text style={{ color: '#FBBC05' }}>o</Text>
                  <Text style={{ color: '#4285F4' }}>g</Text>
                  <Text style={{ color: '#34A853' }}>l</Text>
                  <Text style={{ color: '#EA4335' }}>e</Text>
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Ratings</Text>
              </View>

              {/* Big bold rating number */}
              <Text
                style={{
                  fontSize: 52,
                  fontWeight: '900',
                  color: '#F59E0B',
                  letterSpacing: -1,
                  lineHeight: 56,
                }}
              >
                {averageRating}
              </Text>

              {/* 5 Stars */}
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((s) => {
                  const ratingNum = parseFloat(averageRating);
                  const filled = s <= Math.round(ratingNum);
                  return (
                    <MaterialIcons
                      key={s}
                      name="star"
                      size={22}
                      color={filled ? '#F59E0B' : '#CBD5E1'}
                    />
                  );
                })}
              </View>

              <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>
                Based on {totalRatings || all.length} ratings
              </Text>
            </View>

            {/* Slide 2: Reviews Trend Chart (Screenshot 08.55.28) */}
            <View
              style={{
                width: slideWidth,
                padding: 16,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Reviews Trend</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialIcons name="filter-list" size={15} color="#E11D48" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#E11D48' }}>This Month</Text>
                </View>
              </View>

              {/* Weekly line chart (W1 to W5) */}
              <View style={{ height: 120, justifyContent: 'space-between', paddingVertical: 4 }}>
                {[10.0, 8.0, 6.0, 4.0, 2.0, 0.0].map((val) => (
                  <View key={val} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 10, color: '#94A3B8', width: 24, textAlign: 'right' }}>
                      {val.toFixed(1)}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#F1F5F9' }} />
                  </View>
                ))}

                {/* Blue Trend Line overlay with dots */}
                <View
                  style={{
                    position: 'absolute',
                    left: 36,
                    right: 8,
                    bottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: 2.5,
                      backgroundColor: '#2563EB',
                      top: 6,
                    }}
                  />
                  {['W1', 'W2', 'W3', 'W4', 'W5'].map((w) => (
                    <View key={w} style={{ alignItems: 'center', zIndex: 2 }}>
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 7,
                          backgroundColor: '#2563EB',
                          borderWidth: 2,
                          borderColor: '#FFFFFF',
                        }}
                      />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 4 }}>
                        {w}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* 2 Carousel dots indicator */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 10 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: topSlide === 0 ? '#2563EB' : '#E2E8F0',
              }}
            />
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: topSlide === 1 ? '#2563EB' : '#E2E8F0',
              }}
            />
          </View>
        </View>

        {/* ── FILTER PILLS: All (3) | Pending | Replied (3) | Filter icon ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* All */}
            <Pressable
              onPress={() => setFilter('all')}
              style={{
                backgroundColor: filter === 'all' ? '#0F172A' : 'transparent',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: filter === 'all' ? '#FFFFFF' : '#64748B',
                  fontWeight: filter === 'all' ? '800' : '600',
                  fontSize: 13,
                }}
              >
                All ({all.length})
              </Text>
            </Pressable>

            {/* Pending */}
            <Pressable
              onPress={() => setFilter('pending')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: filter === 'pending' ? '#0F172A' : 'transparent',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: filter === 'pending' ? '#FFFFFF' : '#64748B',
                  fontWeight: filter === 'pending' ? '800' : '600',
                  fontSize: 13,
                }}
              >
                Pending
              </Text>
              {pending.length > 0 ? (
                <View
                  style={{
                    backgroundColor: '#E11D48',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 9,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                    {pending.length}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            {/* Replied */}
            <Pressable
              onPress={() => setFilter('replied')}
              style={{
                backgroundColor: filter === 'replied' ? '#0F172A' : 'transparent',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  color: filter === 'replied' ? '#FFFFFF' : '#64748B',
                  fontWeight: filter === 'replied' ? '800' : '600',
                  fontSize: 13,
                }}
              >
                Replied ({replied.length})
              </Text>
            </Pressable>
          </View>

          {/* Filter icon button */}
          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('Filter Reviews', 'Filter by 5★, 4★, 1★ or date range.')}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="filter-list" size={18} color="#64748B" />
          </Pressable>
        </View>

        {/* ── AUTO-REPLY COMMAND BAR ── */}
        {pending.length > 0 ? (
          <View
            style={{
              backgroundColor: '#EFF6FF',
              borderWidth: 1,
              borderColor: '#BFDBFE',
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="auto-awesome" size={16} color="#2563EB" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E40AF' }}>AI Auto-Reply</Text>
              </View>
              <Text style={{ fontSize: 11.5, color: '#3B82F6', marginTop: 2 }}>
                {pending.length} pending review{pending.length === 1 ? '' : 's'} waiting for replies
              </Text>
            </View>
            <Pressable
              disabled={autoReplyBusy}
              onPress={() => void handleTriggerAutoReply()}
              style={({ pressed }) => ({
                backgroundColor: '#2563EB',
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                opacity: autoReplyBusy ? 0.6 : pressed ? 0.85 : 1,
              })}
            >
              {autoReplyBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="bolt" size={15} color="#FFFFFF" />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                    Auto-Reply ({pending.length})
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        {/* ── REVIEW LIST ── */}
        {reviews.loading ? (
          <Loading />
        ) : shown.length === 0 ? (
          <Empty
            title={filter === 'pending' ? 'No pending reviews 🎉' : 'No reviews found'}
            detail="Google reviews will display here automatically."
          />
        ) : (
          shown.map((review) => {
            const reply = parseReply(review);
            const author = review.authorName || 'Google User';
            const rating = Math.max(1, Math.min(5, Math.round(review.rating || 0)));
            const initial = author.trim().charAt(0).toUpperCase() || 'U';

            // Calculate relative time (e.g. 1y ago, 2m ago, or recent)
            let timeLabel = 'Recent';
            if (review.createdAt) {
              const diffY = new Date().getFullYear() - new Date(review.createdAt).getFullYear();
              if (diffY >= 1) timeLabel = `${diffY}y ago`;
              else timeLabel = relativeDate(review.createdAt) || 'Recent';
            }

            const avatarColors = ['#2563EB', '#059669', '#7C3AED', '#D97706', '#DB2777', '#0891B2'];
            const avatarColor = avatarColors[initial.charCodeAt(0) % avatarColors.length];

            return (
              <Card key={review.id} style={{ gap: 12, borderRadius: 16, padding: 16, marginBottom: 10 }}>
                {/* Reviewer Header Row */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: avatarColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>{initial}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '800',
                          color: '#0F172A',
                          textDecorationLine: 'underline',
                        }}
                        numberOfLines={1}
                      >
                        {author}
                      </Text>
                      {/* Orange Stars row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <MaterialIcons
                            key={star}
                            name="star"
                            size={16}
                            color={star <= rating ? '#F59E0B' : '#E2E8F0'}
                          />
                        ))}
                      </View>
                    </View>
                  </View>

                  <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '500' }}>{timeLabel}</Text>
                </View>

                {/* Review written comment if present */}
                {review.comment ? (
                  <Text style={{ fontSize: 13.5, lineHeight: 20, color: '#334155' }}>
                    {review.comment}
                  </Text>
                ) : null}

                {/* ── REPLIED STATE (Screenshots 08.55.28 & 08.55.29 (2)) ── */}
                {reply ? (
                  <View style={{ gap: 10, marginTop: 4 }}>
                    {/* Owner Sub-header: O Owner | You replied 22h ago | 🗑 ✏️ */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#FB7185',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>O</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                            {reply.repliedBy || 'Owner'}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>
                              {reply.repliedAt ? `Replied ${relativeDate(reply.repliedAt) || 'recently'}` : 'Replied'}
                            </Text>
                            <Text style={{ fontSize: 10, color: '#CBD5E1' }}>•</Text>
                            {reply.publishedToGoogle ? (
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                                🟢 Live on Google
                              </Text>
                            ) : (
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
                                🟡 Sync pending
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Action Icons: Delete 🗑 and Edit ✏️ */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete reply"
                          disabled={deleteBusyId === review.id}
                          onPress={() => confirmDeleteReply(review)}
                          hitSlop={8}
                        >
                          {deleteBusyId === review.id ? (
                            <ActivityIndicator size="small" color="#DC2626" />
                          ) : (
                            <MaterialIcons name="delete-outline" size={20} color="#64748B" />
                          )}
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Edit reply"
                          onPress={() => {
                            setEditingId(review.id);
                            setEditingText(reply.text);
                          }}
                          hitSlop={8}
                        >
                          <MaterialIcons name="edit" size={19} color="#64748B" />
                        </Pressable>
                      </View>
                    </View>

                    {/* KEYWORD USED & SEARCH VOLUME TABLE */}
                    <View
                      style={{
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      {/* Table Header */}
                      <View
                        style={{
                          flexDirection: 'row',
                          backgroundColor: '#F8FAFC',
                          paddingVertical: 9,
                          paddingHorizontal: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: '#E2E8F0',
                        }}
                      >
                        <Text style={{ flex: 1.5, fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                          Keyword Used
                        </Text>
                        <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#64748B', textAlign: 'right' }}>
                          Search Volume
                        </Text>
                      </View>

                      {/* Table Rows */}
                      {(reply.keywords || DEFAULT_KEYWORDS_FALLBACK).map((kw, i) => (
                        <View
                          key={i}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderBottomWidth: i < (reply.keywords?.length || 3) - 1 ? 1 : 0,
                            borderBottomColor: '#F1F5F9',
                          }}
                        >
                          <View style={{ flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialIcons name="search" size={15} color="#94A3B8" />
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#0F172A', flex: 1 }}>
                              {kw.keyword}
                            </Text>
                          </View>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                              {kw.volume.replace(' ↗', '')}
                            </Text>
                            <MaterialIcons name="trending-up" size={14} color="#2563EB" />
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Inline Edit Mode or Rendered Text with Read More */}
                    {editingId === review.id ? (
                      <View style={{ gap: 8, marginTop: 4 }}>
                        <TextInput
                          multiline
                          value={editingText}
                          onChangeText={setEditingText}
                          style={[ui.input, { minHeight: 90, textAlignVertical: 'top', fontSize: 13, backgroundColor: '#FFFFFF' }]}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable
                            disabled={replyBusyId === review.id}
                            onPress={() => void publishReply(review, editingText)}
                            style={{
                              backgroundColor: '#0F172A',
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              borderRadius: 10,
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12.5 }}>Save & Publish</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => setEditingId(null)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                            }}
                          >
                            <Text style={{ color: '#64748B', fontWeight: '700', fontSize: 12.5 }}>Cancel</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={{ gap: 8 }}>
                        <Text style={{ fontSize: 13.5, lineHeight: 21, color: '#1E293B' }}>
                          {reply.text}
                        </Text>
                        {!reply.publishedToGoogle ? (
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => void handleShareReply(reply.text)}
                              style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 10,
                                backgroundColor: '#F1F5F9',
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                              }}
                            >
                              <MaterialIcons name="content-copy" size={14} color="#0F172A" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>Share / Copy</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => void handleOpenMaps(reply.mapsUrl)}
                              style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 10,
                                backgroundColor: '#2563EB',
                              }}
                            >
                              <MaterialIcons name="open-in-new" size={14} color="#FFFFFF" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Open Maps ↗</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                ) : drafts[review.id] ? (
                  /* AI Draft Ready to Publish */
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#E11D48', letterSpacing: 0.3 }}>
                      AI Reply Generated
                    </Text>
                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 13, lineHeight: 20, color: '#1E293B' }}>
                        {drafts[review.id].text}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <GradientOutlineReplyButton
                          label="Publish Reply"
                          loading={replyBusyId === review.id}
                          onPress={() => void publishReply(review, drafts[review.id].text, drafts[review.id].keywords)}
                        />
                      </View>
                      <Pressable
                        onPress={() => {
                          setDrafts((prev) => {
                            const n = { ...prev };
                            delete n[review.id];
                            return n;
                          });
                        }}
                        style={{
                          paddingHorizontal: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <MaterialIcons name="close" size={18} color="#64748B" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  /* Reply with AI CTA */
                  <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
                    <GradientOutlineReplyButton
                      label="Reply with AI"
                      loading={draftBusyId === review.id}
                      onPress={() => void generateDraft(review)}
                    />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </Screen>

      {/* Floating Microphone Button (Screenshots 08.55.28 & 08.55.29) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voice assistant"
        onPress={() => Alert.alert('Dhanda AI Assistant', 'Listening... Ask me to draft a review reply or check your profile performance.')}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 54,
          height: 54,
          borderRadius: 27,
          backgroundColor: '#0F172A',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        })}
      >
        <MaterialIcons name="mic" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
