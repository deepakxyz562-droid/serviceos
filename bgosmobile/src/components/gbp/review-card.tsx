import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, colors, ui } from '../ui';
import { AiButton, InitialAvatar, Pill, RatingPill, gbpColors, relativeDate } from './bits';
import { BoldKeywords, extractKeywords } from './keywords';
import type { ReplyPayload, Review } from './types';

const ROSE = '#E11D48'; // "Reply Generated" label (spec §6, reference B)

function parseReply(review: Review): ReplyPayload | null {
  try {
    const parsed = JSON.parse(review.responseJson || '{}');
    return parsed && parsed.text ? (parsed as ReplyPayload) : null;
  } catch {
    return null;
  }
}

/**
 * Review card (design spec §6).
 * - Pending review: "✨ Generate AI Reply" → parent calls the AI endpoint and
 *   hands back a draft → gray draft card with rose "Reply Generated" label,
 *   SEO keywords bolded, Edit / Publish Reply / Discard actions.
 * - Replied review: "Auto-replied by AI ⌃" accordion expanding to the light
 *   gray reply card with keyword bolding + Edit.
 */
export function ReviewCard({
  review,
  categoryWords,
  draftLoading,
  draft,
  onGenerateDraft,
  onDiscardDraft,
  onPublishReply,
  onSaveReplied,
  replyBusy,
}: {
  review: Review;
  categoryWords: string[];
  draftLoading: boolean;
  /** AI-generated draft for this review (null/undefined = none). */
  draft: string | null;
  onGenerateDraft: (review: Review) => void;
  onDiscardDraft: (review: Review) => void;
  onPublishReply: (review: Review, text: string) => void;
  onSaveReplied: (review: Review, text: string) => void;
  replyBusy: boolean;
}) {
  const reply = parseReply(review);
  const [expanded, setExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [draftEditing, setDraftEditing] = useState(false);
  const [draftText, setDraftText] = useState('');

  const author = review.authorName || 'Google User';
  const rating = Math.max(1, Math.min(5, Math.round(review.rating || 0)));
  const comment = review.comment || '';
  const keywords = useMemo(
    () => extractKeywords(comment, draft || reply?.text || '', categoryWords),
    [comment, draft, reply?.text, categoryWords],
  );

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
          <Text
            style={{ fontSize: 13, lineHeight: 19, color: colors.ink }}
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
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>
                {showFull ? 'Show less' : 'Show more'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text style={{ fontSize: 13, fontStyle: 'italic', color: colors.muted }}>
          No written comment — rated {rating} stars.
        </Text>
      )}

      {reply ? (
        /* ── Replied: AI accordion + light-gray reply card ── */
        <View style={{ gap: 0 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded(!expanded)}
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
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: gbpColors.aiDark }}>
              Auto-replied by AI
            </Text>
            {reply.publishedToGoogle ? (
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: gbpColors.emerald }}>Live on Google</Text>
            ) : reply.googleError ? (
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#B45309' }}>Saved locally</Text>
            ) : null}
            <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={18} color={gbpColors.aiDark} />
          </Pressable>

          {expanded ? (
            <View style={{ backgroundColor: colors.background, borderRadius: 10, padding: 12, marginTop: 8, gap: 8 }}>
              {editing ? (
                <View style={{ gap: 8 }}>
                  <TextInput
                    accessibilityLabel="Edit reply"
                    multiline
                    value={editText}
                    onChangeText={setEditText}
                    style={[ui.input, { minHeight: 110, textAlignVertical: 'top', fontSize: 13 }]}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={replyBusy}
                      onPress={() => onSaveReplied(review, editText)}
                      style={{
                        flex: 1,
                        minHeight: 40,
                        borderRadius: 10,
                        backgroundColor: colors.brand,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        gap: 6,
                        opacity: replyBusy ? 0.6 : 1,
                      }}
                    >
                      {replyBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Save Reply</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setEditing(false);
                        setEditText('');
                      }}
                      style={{
                        minHeight: 40,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.line,
                        backgroundColor: colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <BoldKeywords
                    text={reply.text || ''}
                    keywords={keywords}
                    style={{ fontSize: 13, lineHeight: 19, color: colors.ink }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      {reply.repliedAt ? relativeDate(reply.repliedAt) : ''}
                      {reply.repliedBy ? ` · by ${reply.repliedBy}` : ''}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setEditText(reply.text || '');
                        setEditing(true);
                      }}
                      hitSlop={8}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <MaterialIcons name="edit" size={13} color={colors.brand} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>✎ Edit</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          ) : null}
        </View>
      ) : draft ? (
        /* ── Pending + AI draft: "Reply Generated" gray card ── */
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: ROSE, letterSpacing: 0.3 }}>
            Reply Generated
          </Text>
          <View
            style={{
              backgroundColor: '#F5F5F5',
              borderRadius: 12,
              padding: 14,
              gap: 8,
            }}
          >
            {draftEditing ? (
              <TextInput
                accessibilityLabel="Edit AI draft reply"
                multiline
                value={draftText}
                onChangeText={setDraftText}
                style={[ui.input, { minHeight: 110, textAlignVertical: 'top', fontSize: 13, backgroundColor: colors.surface }]}
              />
            ) : (
              <BoldKeywords
                text={draft}
                keywords={keywords}
                style={{ fontSize: 13, lineHeight: 19, color: colors.ink }}
              />
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialIcons name="auto-awesome" size={11} color={gbpColors.ai} />
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: gbpColors.aiDark }}>
                AI-generated draft — review before publishing
              </Text>
            </View>
          </View>

          {draftEditing ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                disabled={replyBusy}
                onPress={() => {
                  const text = draftText.trim();
                  if (!text) return;
                  setDraftEditing(false);
                  onPublishReply(review, text);
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 12,
                  backgroundColor: colors.brand,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  opacity: replyBusy ? 0.6 : 1,
                }}
              >
                {replyBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Publish Reply</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDraftEditing(false)}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700' }}>Back</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AiButton
                  label="Publish Reply"
                  small
                  loading={replyBusy}
                  onPress={() => onPublishReply(review, draft)}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDraftText(draft);
                  setDraftEditing(true);
                }}
                style={{
                  minHeight: 38,
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
                onPress={() => onDiscardDraft(review)}
                hitSlop={8}
                style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}
              >
                <MaterialIcons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          )}
        </View>
      ) : (
        /* ── Pending, no draft yet ── */
        <AiButton
          label="Generate AI Reply ✨"
          small
          loading={draftLoading}
          onPress={() => onGenerateDraft(review)}
        />
      )}
    </Card>
  );
}
