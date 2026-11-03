import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Card, Empty, ErrorNotice, colors, ui } from '../ui';
import { apiRequest } from '../../lib/api';
import { relativeDate } from './bits';

/**
 * Shared Dhanda AI-post board — the six status pills (2 rows) that each fetch
 * `/api/social/posts` with the right `status` / `approval` param and render
 * the matching list, used by the "AI Post" (marketing) and "Google Post"
 * (posts) tabs so both stay identical.
 */

export type PostPill = 'scheduled' | 'posted' | 'failed' | 'not_posted' | 'pending' | 'approved' | 'rejected';

export type SocialPostRow = {
  id: string;
  content: string;
  status: string;
  approvalStatus?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  failureReason?: string | null;
  mediaUrls?: string[];
  gbpPostType?: string | null;
  publishTargets?: { platform: string; status: string; error?: string }[];
  createdAt?: string;
  updatedAt?: string;
};

export const PILL_ROWS: { key: PostPill; label: string }[][] = [
  [
    { key: 'posted', label: 'Published 🟢' },
    { key: 'scheduled', label: 'Scheduled 📅' },
    { key: 'failed', label: 'Failed 🔴' },
  ],
  [
    { key: 'pending', label: 'Pending ⚠️' },
    { key: 'approved', label: 'Approved 👍' },
    { key: 'rejected', label: 'Rejected 👎' },
  ],
];

const APPROVAL_PILLS: PostPill[] = ['pending', 'approved', 'rejected'];

const EMPTY_COPY: Record<PostPill, { title: string; detail: string }> = {
  pending: {
    title: 'No Pending posts',
    detail: "You've reviewed everything. New posts will show up here.",
  },
  scheduled: {
    title: 'Nothing Scheduled',
    detail: 'Generate an AI post and schedule it to go live on your Google Profile.',
  },
  posted: {
    title: 'No Published Posts',
    detail: 'Posts published to your Google Business Profile will appear here.',
  },
  failed: {
    title: 'No Failed Posts',
    detail: 'Great news! All your published and scheduled posts are running smoothly without errors.',
  },
  not_posted: {
    title: 'Nothing Waiting',
    detail: 'Drafts and posts that failed to publish will show up here.',
  },
  approved: {
    title: 'No Approved Posts',
    detail: 'Approve a pending post and it will queue up for publishing.',
  },
  rejected: {
    title: 'No Rejected Posts',
    detail: 'Posts you reject will be kept here for your reference.',
  },
};

function postsPath(pill: PostPill, platform?: string): string {
  const platQuery = platform && platform !== 'all' ? `platform=${encodeURIComponent(platform)}&` : '';
  const base = `/api/social/posts?${platQuery}limit=20`;
  if (APPROVAL_PILLS.includes(pill)) return `${base}&approval=${pill}`;
  if (pill === 'posted') return `${base}&status=published`;
  if (pill === 'failed') return `${base}&status=failed`;
  return `${base}&status=${pill}`;
}

/**
 * Fetches the posts for one pill. The "Not Posted" pill honestly merges the
 * `draft` and `failed` buckets (both are "never went live") — if both fetches
 * fail the error is surfaced, one succeeding still renders data.
 */
export function usePillPosts(pill: PostPill, platform?: string) {
  const [rows, setRows] = useState<SocialPostRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    try {
      let list: SocialPostRow[];
      if (pill === 'not_posted') {
        const [drafts, failed] = await Promise.allSettled([
          apiRequest<{ data: SocialPostRow[] }>(postsPath('not_posted', platform)),
          apiRequest<{ data: SocialPostRow[] }>(`/api/social/posts?${platform && platform !== 'all' ? `platform=${platform}&` : ''}limit=20&status=failed`),
        ]);
        if (drafts.status === 'rejected' && failed.status === 'rejected') {
          const reason = drafts.reason;
          throw reason instanceof Error ? reason : new Error('Failed to load posts');
        }
        list = [
          ...(drafts.status === 'fulfilled' ? drafts.value.data || [] : []),
          ...(failed.status === 'fulfilled' ? failed.value.data || [] : []),
        ].sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
      } else {
        const res = await apiRequest<{ data: SocialPostRow[] }>(postsPath(pill, platform));
        list = res.data || [];
      }
      if (version === generation.current) {
        setRows(list);
        setError(null);
      }
    } catch (e) {
      if (version === generation.current) {
        setError(e instanceof Error ? e.message : 'Failed to load posts. Tap to retry.');
      }
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [pill, platform]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { rows, loading, error, reload: load };
}

function statusBadge(post: SocialPostRow): { label: string; success?: boolean; danger?: boolean } {
  if (post.approvalStatus === 'pending') return { label: 'PENDING REVIEW', danger: true };
  if (post.approvalStatus === 'approved') return { label: 'APPROVED', success: true };
  if (post.approvalStatus === 'rejected') return { label: 'REJECTED', danger: true };
  if (post.status === 'published' || post.status === 'partial') return { label: 'POSTED', success: true };
  if (post.status === 'failed') return { label: 'FAILED', danger: true };
  if (post.status === 'scheduled') return { label: 'SCHEDULED' };
  return { label: 'DRAFT' };
}

export function PostCard({
  post,
  showApprovalActions = false,
  approveBusy = false,
  rejectBusy = false,
  retryBusy = false,
  onApprove,
  onReject,
  onRetry,
}: {
  post: SocialPostRow;
  /** Pending-review posts get the Dhanda Approve / Reject action row. */
  showApprovalActions?: boolean;
  approveBusy?: boolean;
  rejectBusy?: boolean;
  retryBusy?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRetry?: () => void;
}) {
  const badge = statusBadge(post);
  const media = post.mediaUrls?.[0];
  const lines = (post.content || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const title = lines[0] || 'Business Update';
  const snippet = lines.length > 1 ? lines.slice(1).join(' ') : lines[0] || 'No description';

  return (
    <Card style={{ padding: 12, gap: 10 }}>
      {/* Sleek horizontal card layout matching Google Post Screenshot */}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {media ? (
          <Image
            source={{ uri: media }}
            style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: colors.soft }}
            accessibilityLabel="Post image"
            alt="Post image"
          />
        ) : (
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 12,
              backgroundColor: '#EFF6FF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons name="article" size={30} color="#3B82F6" />
          </View>
        )}

        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink, flex: 1 }}>
              {title}
            </Text>
            <MaterialIcons name="more-horiz" size={18} color="#9CA3AF" />
          </View>

          <Text numberOfLines={2} style={{ fontSize: 11.5, color: colors.muted, lineHeight: 16 }}>
            {snippet}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <MaterialIcons name="event" size={12} color="#6B7280" />
              <Text style={{ fontSize: 10.5, color: '#6B7280', fontWeight: '600' }}>
                {post.status === 'published'
                  ? relativeDate(post.publishedAt || post.scheduledAt || post.createdAt) || 'Published'
                  : post.status === 'scheduled'
                    ? relativeDate(post.scheduledAt || post.createdAt) || 'Scheduled'
                    : relativeDate(post.createdAt || post.updatedAt) || 'Draft'}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: badge.success ? '#ECFDF5' : badge.danger ? '#FEF2F2' : '#F0FDF4',
                borderColor: badge.success ? '#A7F3D0' : badge.danger ? '#FECACA' : '#BBF7D0',
                borderWidth: 1,
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 1.5,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: badge.success ? '#059669' : badge.danger ? '#DC2626' : '#16A34A',
                }}
              >
                {badge.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {post.status === 'failed' || post.failureReason ? (
        <View
          style={{
            backgroundColor: '#FEF2F2',
            borderColor: '#FECACA',
            borderWidth: 1,
            borderRadius: 10,
            padding: 10,
            gap: 6,
          }}
        >
          <View style={[ui.row, { gap: 6 }]}>
            <MaterialIcons name="error-outline" size={16} color={colors.danger} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.danger }}>
              Publish Failed
            </Text>
          </View>
          {post.failureReason ? (
            <Text style={{ fontSize: 11.5, color: '#991B1B', lineHeight: 16 }}>{post.failureReason}</Text>
          ) : null}
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              disabled={retryBusy}
              onPress={onRetry}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                backgroundColor: colors.danger,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                opacity: retryBusy ? 0.6 : pressed ? 0.85 : 1,
                marginTop: 4,
              })}
            >
              {retryBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={14} color="#FFFFFF" />
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>Retry Publish ⚡</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {post.publishTargets?.length ? (
        <View style={[ui.row, { gap: 6 }]}>
          {post.publishTargets.map((t, i) => (
            <View
              key={i}
              style={[ui.row, { gap: 4, backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }]}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand }}>
                {t.platform} · {t.status}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {showApprovalActions ? (
        <View style={[ui.row, { gap: 8 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Approve post from ${relativeDate(post.createdAt) || 'draft'}`}
            disabled={approveBusy || rejectBusy}
            onPress={onApprove}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 42,
              borderRadius: 10,
              backgroundColor: colors.brand,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 5,
              opacity: approveBusy || rejectBusy ? 0.5 : pressed ? 0.85 : 1,
            })}
          >
            {approveBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name="thumb-up" size={15} color="#FFFFFF" />}
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>Approve</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reject post"
            disabled={approveBusy || rejectBusy}
            onPress={onReject}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 42,
              borderRadius: 10,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: '#FFCCD0',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 5,
              opacity: approveBusy || rejectBusy ? 0.5 : pressed ? 0.85 : 1,
            })}
          >
            {rejectBusy ? <ActivityIndicator size="small" color={colors.danger} /> : <MaterialIcons name="thumb-down" size={15} color={colors.danger} />}
            <Text style={{ color: colors.danger, fontSize: 12.5, fontWeight: '700' }}>Reject</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

/**
 * The six pills (2 rows) + the fetched posts list with honest loading /
 * error / empty states. `refreshKey` lets the parent trigger a reload after
 * the composer saves a new post.
 */
export function PostsBoard({
  refreshKey = 0,
  platform = 'all',
  onNeedCompose,
}: {
  refreshKey?: number;
  platform?: string;
  onNeedCompose?: () => void;
}) {
  const [pill, setPill] = useState<PostPill>('pending');
  const board = usePillPosts(pill, platform);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Parent bumped refreshKey (e.g. composer saved) → refetch current pill.
  useEffect(() => {
    if (refreshKey > 0) void board.reload();
  }, [refreshKey]);

  async function moderate(post: SocialPostRow, approvalStatus: 'approved' | 'rejected') {
    if (busyId) return;
    setBusyId(post.id);
    try {
      await apiRequest(`/api/social/posts/${post.id}/approval`, {
        method: 'POST',
        body: { approvalStatus },
      });
      await board.reload();
    } catch (e) {
      Alert.alert('Could not update post', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function retry(post: SocialPostRow) {
    if (busyId) return;
    setBusyId(post.id);
    try {
      await apiRequest('/api/social/publish', {
        method: 'POST',
        body: { postId: post.id },
      });
      Alert.alert('Publish Retrying', 'Publishing retry has started. Refreshing status...');
      setTimeout(() => void board.reload(), 1500);
    } catch (e) {
      Alert.alert('Retry Failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  const empty = EMPTY_COPY[pill];

  return (
    <View style={{ gap: 12 }}>
      {/* 6 status pills in 2 rows — each fetches its own slice */}
      <View style={{ gap: 8 }}>
        {PILL_ROWS.map((row, rIdx) => (
          <View key={rIdx} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map((p) => {
              const active = pill === p.key;
              return (
                <Pressable
                  key={p.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setPill(p.key)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 40,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: active ? colors.brand : colors.line,
                    backgroundColor: active ? colors.brandSoft : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 11.5,
                      fontWeight: '700',
                      color: active ? colors.brandDark : colors.muted,
                    }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <ErrorNotice message={board.error} retry={() => void board.reload()} />

      {board.loading ? (
        <ActivityIndicator accessibilityLabel="Loading posts" color={colors.brand} style={{ padding: 26 }} />
      ) : !board.rows?.length ? (
        !board.error && (
          <Empty
            title={empty.title}
            detail={empty.detail}
            actionLabel={onNeedCompose ? '✨ Generate AI Post' : undefined}
            onAction={onNeedCompose}
          />
        )
      ) : (
        board.rows.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            showApprovalActions={pill === 'pending'}
            approveBusy={busyId === post.id}
            rejectBusy={busyId === post.id}
            retryBusy={busyId === post.id}
            onApprove={() => void moderate(post, 'approved')}
            onReject={() => void moderate(post, 'rejected')}
            onRetry={() => void retry(post)}
          />
        ))
      )}
    </View>
  );
}
