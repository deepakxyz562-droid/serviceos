import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Empty, ErrorNotice, Loading, Screen, colors, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import {
  AiButton,
  RatingPill,
  StarRow,
  gbpColors,
  relativeDate,
} from '../../src/components/gbp/bits';
import { BoldKeywords, extractKeywords } from '../../src/components/gbp/keywords';
import type { GbpPlaceResult, Review } from '../../src/components/gbp/types';

interface DiscoverResponse {
  email: string;
  phone: string;
  version: string;
  activeProfile?: { id: string; name: string; shortId: string; initial: string };
}

type ReviewsResponse = { reviews: Review[]; pagination?: { total: number } };
type ReplyFilter = 'all' | 'pending' | 'replied';

const ROSE = '#E11D48';

function parseReply(review: Review): { text: string; repliedAt?: string; publishedToGoogle?: boolean } | null {
  try {
    const parsed = JSON.parse(review.responseJson || '{}');
    return parsed && parsed.text ? parsed : null;
  } catch {
    return null;
  }
}

function categoryWords(category?: string | null): string[] {
  if (!category) return [];
  return category.split(/[/,&-]/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Outline button with two-tone gradient border (purple to coral)
 * matching Screenshot 8 ("Reply with AI 💬").
 */
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
        backgroundColor: '#9333EA', // gradient fallback
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
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftBusyId, setDraftBusyId] = useState<string | null>(null);
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const generating = useRef(false);

  const activeProfile = discover.data?.activeProfile;
  const shortId = activeProfile?.shortId || (gbpPlace.data?.place?.locationId ? `#${gbpPlace.data.place.locationId.slice(0, 4)}` : '#5008');
  const phone = discover.data?.phone || '8505945123';
  const version = discover.data?.version || 'v2.83';

  const all = useMemo(() => reviews.data?.reviews || [], [reviews.data]);
  const catWords = useMemo(() => categoryWords(gbpPlace.data?.place?.category || gbpPlace.data?.tenantFallback?.category), [gbpPlace.data]);

  const pending = useMemo(() => all.filter((r) => !parseReply(r)), [all]);
  const replied = useMemo(() => all.filter((r) => parseReply(r)), [all]);
  const totalRatings = reviews.data?.pagination?.total ?? all.length;

  const shown = filter === 'pending' ? pending : filter === 'replied' ? replied : all;

  async function generateDraft(review: Review) {
    if (generating.current || draftBusyId) return;
    setDraftBusyId(review.id);
    setLocalError(null);
    setNotice('');
    generating.current = true;
    try {
      const rating = Math.max(1, Math.min(5, Math.round(review.rating || 0)));
      const prompt =
        `Write a short Google review reply (2-3 sentences, warm and professional) to this ${rating}★ review` +
        ` from ${review.authorName || 'a customer'}` +
        (review.comment ? `: "${review.comment}"` : ' (no written comment, just a star rating)') +
        '. Thank them, address their specific points naturally with our service keywords, and invite them back.';
      const res = await apiRequest<{ caption: string }>('/api/social/ai-caption', {
        method: 'POST',
        body: { topic: prompt, platforms: ['googlebusiness'], tone: 'Friendly and professional' },
      });
      if (!res.caption) throw new Error('The AI service returned an empty reply. You can retry or write one yourself.');
      setDrafts((prev) => ({ ...prev, [review.id]: res.caption }));
    } catch (e) {
      setLocalError(
        `${(e as Error).message || 'AI reply generation failed.'} You can retry, or reply manually from the GBP hub.`,
      );
    } finally {
      generating.current = false;
      setDraftBusyId(null);
    }
  }

  async function publishReply(review: Review, text: string) {
    if (replyBusyId) return;
    setReplyBusyId(review.id);
    setLocalError(null);
    setNotice('');
    try {
      const res = await apiRequest<{ message?: string }>(`/api/reviews/${review.id}/reply`, {
        method: 'POST',
        body: { replyText: text.trim() },
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[review.id];
        return next;
      });
      setNotice(res.message || 'Reply published.');
      await reviews.refresh();
    } catch (e) {
      setLocalError((e as Error).message || 'Could not publish the reply. Please try again.');
    } finally {
      setReplyBusyId(null);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen
        title="Review Replies"
        subtitle={`${phone} | ${shortId.replace('#', '')} | ${version}`}
        showBack={true}
        onBack={() => {
          if (router.canGoBack?.()) router.back();
          else router.push('/(tabs)');
        }}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open review settings"
            onPress={() =>
              Alert.alert(
                'Review Settings',
                'Reviews sync automatically with Google Business Profile. AI auto-reply can be customized in the Growth Settings.'
              )
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#0F172A',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <MaterialIcons name="settings" size={14} color="#FFFFFF" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Settings</Text>
          </Pressable>
        }
        onRefresh={async () => {
          await Promise.all([reviews.refresh(), gbpPlace.refresh(), discover.refresh()]).catch(() => {});
        }}
      >
        {/* Rating summary line (Screenshot 8 benchmark) */}
        <View style={{ alignItems: 'center', gap: 6, marginVertical: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>
            Based on {totalRatings || all.length} ratings
          </Text>
          {/* 2 dots carousel indicator */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' }} />
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563EB' }} />
          </View>
        </View>

        <ErrorNotice message={reviews.error || gbpPlace.error} retry={reviews.refresh} />
        <ErrorNotice message={localError} />

        {notice ? (
          <View style={{ backgroundColor: colors.successSoft, padding: 12, borderRadius: 12 }}>
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {notice}</Text>
          </View>
        ) : null}

        {/* Filter Pills row matching Screenshot 8: All (3) | Pending 3 (badge) | Replied (0) | Filter icon */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>
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

          {/* Filter icon */}
          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('Filter Reviews', 'Filter by Rating (5★, 4★, 1★) or Date')}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="filter-list" size={18} color="#64748B" />
          </Pressable>
        </View>

        {/* Review list matching Screenshot 8 */}
        {reviews.loading ? (
          <Loading />
        ) : !reviews.error && shown.length === 0 ? (
          <Empty
            title={
              filter === 'replied'
                ? 'No replied reviews yet'
                : filter === 'pending'
                ? 'No pending reviews 🎉'
                : 'Nothing here yet'
            }
            detail={
              filter === 'replied'
                ? 'Replies you publish to Google reviews will show up here.'
                : filter === 'pending'
                ? "You've replied to every review. New Google reviews will appear here."
                : 'Your Google reviews will appear here as customers rate your business.'
            }
          />
        ) : (
          shown.map((review) => (
            <ReviewRow
              key={review.id}
              review={review}
              keywords={extractKeywords(review.comment || '', drafts[review.id] || '', catWords)}
              draft={drafts[review.id] || null}
              draftBusy={draftBusyId === review.id}
              replyBusy={replyBusyId === review.id}
              expanded={expandedId === review.id}
              onToggleExpand={() => setExpandedId((prev) => (prev === review.id ? null : review.id))}
              onGenerate={() => void generateDraft(review)}
              onDiscard={() =>
                setDrafts((prev) => {
                  const next = { ...prev };
                  delete next[review.id];
                  return next;
                })
              }
              onPublish={(text) => void publishReply(review, text)}
            />
          ))
        )}
      </Screen>

      {/* Floating voice assistant mic (matches Screenshot 8 benchmark) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voice assistant"
        onPress={() => Alert.alert('Voice Assistant', 'Say "Reply to Kumra Anand with a polite apology"…')}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 16,
          bottom: 24,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#0F172A',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 8,
        })}
      >
        <MaterialIcons name="mic" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function ReviewRow({
  review,
  keywords,
  draft,
  draftBusy,
  replyBusy,
  expanded,
  onToggleExpand,
  onGenerate,
  onDiscard,
  onPublish,
}: {
  review: Review;
  keywords: string[];
  draft: string | null;
  draftBusy: boolean;
  replyBusy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onGenerate: () => void;
  onDiscard: () => void;
  onPublish: (text: string) => void;
}) {
  const [showFull, setShowFull] = useState(false);
  const [draftEditing, setDraftEditing] = useState(false);
  const [draftText, setDraftText] = useState('');
  const reply = parseReply(review);
  const author = review.authorName || 'Google User';
  const rating = Math.max(1, Math.min(5, Math.round(review.rating || 0)));
  const comment = review.comment || '';
  const longComment = comment.length > 140 || comment.split('\n').length > 3;

  // Compute time label (e.g. "8y ago" or fallback)
  const timeLabel = useMemo(() => {
    if (!review.createdAt) return '';
    const date = new Date(review.createdAt);
    const now = new Date();
    const diffYears = now.getFullYear() - date.getFullYear();
    if (diffYears >= 1) return `${diffYears}y ago`;
    const diffMonths = now.getMonth() - date.getMonth();
    if (diffMonths >= 1) return `${diffMonths}mo ago`;
    return relativeDate(review.createdAt) || 'Recent';
  }, [review.createdAt]);

  const initial = author.trim().charAt(0).toUpperCase() || 'U';

  return (
    <Card style={{ gap: 10, borderRadius: 16, padding: 16 }}>
      {/* Top author row with blue circular avatar and Google badge (Screenshot 8) */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={{ position: 'relative' }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#1E40AF', // dark blue
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>{initial}</Text>
            </View>
            {/* Google badge */}
            <View
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#2563EB' }}>G</Text>
            </View>
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

        {timeLabel ? (
          <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '500' }}>{timeLabel}</Text>
        ) : null}
      </View>

      {/* Review comment */}
      {comment ? (
        <View style={{ marginTop: 2 }}>
          <Text
            style={{ fontSize: 14, lineHeight: 20, color: '#1E293B', fontWeight: '500' }}
            numberOfLines={showFull ? undefined : 3}
          >
            {comment}
          </Text>
          {longComment ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowFull(!showFull)}
              hitSlop={8}
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                {showFull ? 'Show less' : 'Show more'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Reply or Reply with AI Action (Screenshot 8) */}
      {reply ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={onToggleExpand}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#F0FDF4',
              borderWidth: 1,
              borderColor: '#BBF7D0',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <MaterialIcons name="check-circle" size={15} color="#16A34A" />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: '#15803D' }}>
              Your reply
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Live</Text>
            <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={18} color="#15803D" />
          </Pressable>
          {expanded ? (
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginTop: 8, gap: 6 }}>
              <BoldKeywords text={reply.text} keywords={keywords} style={{ fontSize: 13, lineHeight: 19, color: '#1E293B' }} />
              {reply.repliedAt ? <Text style={{ fontSize: 11, color: '#94A3B8' }}>{relativeDate(reply.repliedAt)}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : draft ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: ROSE, letterSpacing: 0.3 }}>
            Reply Generated
          </Text>
          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' }}>
            {draftEditing ? (
              <TextInput
                accessibilityLabel="Edit AI draft reply"
                multiline
                value={draftText}
                onChangeText={setDraftText}
                style={[ui.input, { minHeight: 100, textAlignVertical: 'top', fontSize: 13, backgroundColor: '#FFFFFF' }]}
              />
            ) : (
              <BoldKeywords text={draft} keywords={keywords} style={{ fontSize: 13, lineHeight: 19, color: '#1E293B' }} />
            )}
          </View>
          {draftEditing ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AiButton
                  label="Publish Reply"
                  small
                  loading={replyBusy}
                  onPress={() => {
                    const text = draftText.trim();
                    if (!text) return;
                    setDraftEditing(false);
                    onPublish(text);
                  }}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDraftEditing(false)}
                style={{
                  minHeight: 38,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '700' }}>Back</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <GradientOutlineReplyButton
                    label="Publish Reply"
                    loading={replyBusy}
                    onPress={() => onPublish(draft)}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDraftText(draft);
                    setDraftEditing(true);
                  }}
                  style={{
                    minHeight: 40,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 4,
                  }}
                >
                  <MaterialIcons name="edit" size={14} color="#64748B" />
                  <Text style={{ color: '#64748B', fontSize: 12.5, fontWeight: '700' }}>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Discard AI draft"
                  onPress={onDiscard}
                  hitSlop={8}
                  style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}
                >
                  <MaterialIcons name="close" size={18} color="#64748B" />
                </Pressable>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9333EA' }}>
                ✨ AI-generated draft — review before publishing
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
          <GradientOutlineReplyButton
            label="Reply with AI"
            loading={draftBusy}
            onPress={onGenerate}
          />
        </View>
      )}
    </Card>
  );
}
