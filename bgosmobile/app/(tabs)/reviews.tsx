import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Chip, Empty, ErrorNotice, Loading, Screen, colors, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import {
  AiButton,
  InitialAvatar,
  Pill,
  RatingPill,
  StarRow,
  gbpColors,
  relativeDate,
} from '../../src/components/gbp/bits';
import { BoldKeywords, extractKeywords } from '../../src/components/gbp/keywords';
import type { GbpPlaceResult, Review } from '../../src/components/gbp/types';

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
 * Two-tone purple band used as the "Reply with AI 💬" gradient — bgosmobile
 * has no expo-linear-gradient dependency, so the gradient is two stacked
 * opacity views (no new deps).
 */
function GradientReplyButton({
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
        minHeight: 44,
        borderRadius: 12,
        overflow: 'hidden',
        opacity: loading ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
        <View style={{ flex: 1, backgroundColor: '#C084FC' }} />
        <View style={{ flex: 1, backgroundColor: gbpColors.ai }} />
      </View>
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14 }}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>{label}</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13.5 }}>💬</Text>
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

  const [filter, setFilter] = useState<ReplyFilter>('all');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftBusyId, setDraftBusyId] = useState<string | null>(null);
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const generating = useRef(false);

  const all = useMemo(() => reviews.data?.reviews || [], [reviews.data]);
  const catWords = useMemo(() => categoryWords(gbpPlace.data?.place?.category || gbpPlace.data?.tenantFallback?.category), [gbpPlace.data]);

  const pending = useMemo(() => all.filter((r) => !parseReply(r)), [all]);
  const replied = useMemo(() => all.filter((r) => parseReply(r)), [all]);
  const totalRatings = reviews.data?.pagination?.total ?? all.length;
  const avgRating = all.length ? all.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / all.length : null;

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
        subtitle="AI-assisted replies to your Google reviews"
        showBack={true}
        onBack={() => {
          if (router.canGoBack?.()) router.back();
          else router.push('/(tabs)/index');
        }}
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open review settings"
            onPress={() => router.push('/(tabs)/growth')}
            style={ui.backBtn}
          >
            <MaterialIcons name="settings" size={20} color={colors.ink} />
          </Pressable>
        }
        onRefresh={async () => {
          await Promise.all([reviews.refresh(), gbpPlace.refresh()]).catch(() => {});
        }}
      >
        {/* Summary card — Based on N ratings */}
        <Card style={{ alignItems: 'center', gap: 6 }}>
          {reviews.loading ? (
            <Loading />
          ) : avgRating != null ? (
            <>
              <Text style={[ui.heading, { fontSize: 17 }]}>{avgRating.toFixed(1)} ★ average rating</Text>
              <StarRow rating={avgRating} size={18} />
              <Text style={ui.caption}>Based on {totalRatings} ratings</Text>
            </>
          ) : (
            <>
              <Text style={[ui.heading, { fontSize: 17 }]}>No ratings yet</Text>
              <Text style={ui.caption}>Your Google reviews will appear here as customers rate your business.</Text>
            </>
          )}
        </Card>

        <ErrorNotice message={reviews.error || gbpPlace.error} retry={reviews.refresh} />
        <ErrorNotice message={localError} />

        {notice ? (
          <View style={{ backgroundColor: colors.successSoft, padding: 12, borderRadius: 12 }}>
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {notice}</Text>
          </View>
        ) : null}

        {/* Filter chips: All (n) | Pending 🔴n | Replied (n) */}
        <View style={[ui.row, { gap: 8 }]}>
          <Chip label={`All (${all.length})`} selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip
            label={`Pending 🔴${pending.length}`}
            selected={filter === 'pending'}
            onPress={() => setFilter('pending')}
          />
          <Chip label={`Replied (${replied.length})`} selected={filter === 'replied'} onPress={() => setFilter('replied')} />
        </View>

        {/* Review cards */}
        {reviews.loading ? (
          <Loading />
        ) : !reviews.error && shown.length === 0 ? (
          <Empty
            title={filter === 'replied' ? 'No replied reviews yet' : filter === 'pending' ? 'No pending reviews 🎉' : 'Nothing here yet'}
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

      {/* Floating voice assistant mic (stub — matches Dhanda benchmark) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voice assistant"
        onPress={() => Alert.alert('Voice Assistant', 'Speak your reply request in Hindi or English…')}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 16,
          bottom: 96,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.brand,
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

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <InitialAvatar name={author} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }} numberOfLines={1}>
            {author}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <RatingPill rating={rating} />
            {relativeDate(review.createdAt) ? (
              <Text style={{ fontSize: 11, color: colors.muted }}>{relativeDate(review.createdAt)}</Text>
            ) : null}
          </View>
        </View>
        {reply ? (
          <Pill label="Replied" bg={gbpColors.emeraldSoft} color={gbpColors.emerald} icon="check-circle" />
        ) : (
          <Pill label="Pending" bg={gbpColors.amberSoft} color="#B45309" icon="schedule" />
        )}
      </View>

      {comment ? (
        <View>
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.ink }} numberOfLines={showFull ? undefined : 3}>
            {comment}
          </Text>
          {longComment ? (
            <Pressable accessibilityRole="button" onPress={() => setShowFull(!showFull)} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>{showFull ? 'Show less' : 'Show more'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text style={{ fontSize: 13, fontStyle: 'italic', color: colors.muted }}>No written comment — rated {rating} stars.</Text>
      )}

      {reply ? (
        /* Replied: accordion with the published reply */
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={onToggleExpand}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: gbpColors.aiSoft,
              borderWidth: 1,
              borderColor: gbpColors.aiBorder,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 9,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <MaterialIcons name="auto-awesome" size={14} color={gbpColors.ai} />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: gbpColors.aiDark }}>Your reply</Text>
            {reply.publishedToGoogle ? (
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: gbpColors.emerald }}>Live on Google</Text>
            ) : null}
            <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={18} color={gbpColors.aiDark} />
          </Pressable>
          {expanded ? (
            <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 12, marginTop: 8, gap: 6 }}>
              <BoldKeywords text={reply.text} keywords={keywords} style={{ fontSize: 13, lineHeight: 19, color: colors.ink }} />
              {reply.repliedAt ? <Text style={{ fontSize: 11, color: colors.muted }}>{relativeDate(reply.repliedAt)}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : draft ? (
        /* Pending + AI draft: "Reply Generated" gray card */
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: ROSE, letterSpacing: 0.3 }}>Reply Generated</Text>
          <View style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14 }}>
            {draftEditing ? (
              <TextInput
                accessibilityLabel="Edit AI draft reply"
                multiline
                value={draftText}
                onChangeText={setDraftText}
                style={[ui.input, { minHeight: 110, textAlignVertical: 'top', fontSize: 13, backgroundColor: colors.surface }]}
              />
            ) : (
              <BoldKeywords text={draft} keywords={keywords} style={{ fontSize: 13, lineHeight: 19, color: colors.ink }} />
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
                  <GradientReplyButton label="Publish Reply" loading={replyBusy} onPress={() => onPublish(draft)} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setDraftText(draft);
                    setDraftEditing(true);
                  }}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.line,
                    backgroundColor: colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 4,
                  }}
                >
                  <MaterialIcons name="edit" size={13} color={colors.muted} />
                  <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '700' }}>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Discard AI draft"
                  onPress={onDiscard}
                  hitSlop={8}
                  style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
                >
                  <MaterialIcons name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: gbpColors.aiDark }}>
                ✨ AI-generated draft — review before publishing
              </Text>
            </View>
          )}
        </View>
      ) : (
        <GradientReplyButton label="Reply with AI" loading={draftBusy} onPress={onGenerate} />
      )}
    </Card>
  );
}
