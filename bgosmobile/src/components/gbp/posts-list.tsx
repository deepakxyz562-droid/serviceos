import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Card, Empty, ErrorNotice, colors, ui } from '../ui';
import { apiRequest } from '../../lib/api';
import { relativeDate } from './bits';

export type PostPill =
  | 'scheduled'
  | 'posted'
  | 'failed'
  | 'not_posted'
  | 'pending'
  | 'approved'
  | 'rejected';

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

export const MODERN_PILLS: { key: PostPill; label: string; icon: string }[] = [
  { key: 'pending', label: 'Pending Review', icon: 'pending-actions' },
  { key: 'scheduled', label: 'Scheduled', icon: 'schedule' },
  { key: 'posted', label: 'Published', icon: 'check-circle' },
  { key: 'failed', label: 'Failed', icon: 'error-outline' },
  { key: 'approved', label: 'Approved', icon: 'thumb-up' },
  { key: 'rejected', label: 'Rejected', icon: 'thumb-down' },
];

/** Kept for backwards compatibility */
export const PILL_ROWS: { key: PostPill; label: string }[][] = [
  [
    { key: 'posted', label: 'Published' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'failed', label: 'Failed' },
  ],
  [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ],
];

const APPROVAL_PILLS: PostPill[] = ['pending', 'approved', 'rejected'];

export const CHANNEL_FILTERS = [
  { id: 'all', label: 'All Platforms', icon: 'public' },
  { id: 'googlebusiness', label: 'Google Business', icon: 'place' },
  { id: 'instagram', label: 'Instagram', icon: 'camera-alt' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' },
];

const EMPTY_COPY: Record<PostPill, { title: string; detail: string }> = {
  pending: {
    title: 'No Pending Posts',
    detail: 'All generated campaigns have been reviewed! New auto-generated posts will appear here.',
  },
  scheduled: {
    title: 'Nothing Scheduled',
    detail: 'Schedule an AI poster or update from Studio to publish automatically on your calendar.',
  },
  posted: {
    title: 'No Published Posts',
    detail: 'Posts published to your Google Business Profile and social pages will appear here.',
  },
  failed: {
    title: 'No Failed Posts',
    detail: 'Great news! All your published and scheduled posts are operating smoothly.',
  },
  not_posted: {
    title: 'Nothing Waiting',
    detail: 'Drafts and posts that failed to publish will show up here.',
  },
  approved: {
    title: 'No Approved Posts',
    detail: 'Posts you approve from Pending will queue up here for automatic publishing.',
  },
  rejected: {
    title: 'No Rejected Posts',
    detail: 'Rejected posts are archived here for your reference.',
  },
};

function postsPath(pill: PostPill, platform?: string): string {
  const platQuery = platform && platform !== 'all' ? `platform=${encodeURIComponent(platform)}&` : '';
  const base = `/api/social/posts?${platQuery}limit=50`;
  if (APPROVAL_PILLS.includes(pill)) return `${base}&approval=${pill}`;
  if (pill === 'posted') return `${base}&status=published`;
  if (pill === 'failed') return `${base}&status=failed`;
  return `${base}&status=${pill}`;
}

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
          apiRequest<{ data: SocialPostRow[] }>(
            `/api/social/posts?${platform && platform !== 'all' ? `platform=${platform}&` : ''}limit=50&status=failed`
          ),
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
    }, [load])
  );

  return { rows, loading, error, reload: load };
}

function statusBadge(post: SocialPostRow): {
  label: string;
  bg: string;
  border: string;
  color: string;
} {
  if (post.approvalStatus === 'pending') {
    return { label: 'PENDING REVIEW', bg: '#FEF3C7', border: '#FDE68A', color: '#B45309' };
  }
  if (post.approvalStatus === 'approved') {
    return { label: 'APPROVED', bg: '#DCFCE7', border: '#BBF7D0', color: '#15803D' };
  }
  if (post.approvalStatus === 'rejected') {
    return { label: 'REJECTED', bg: '#FEE2E2', border: '#FECACA', color: '#B91C1C' };
  }
  if (post.status === 'published' || post.status === 'partial') {
    return { label: 'PUBLISHED', bg: '#DCFCE7', border: '#BBF7D0', color: '#15803D' };
  }
  if (post.status === 'failed') {
    return { label: 'FAILED', bg: '#FEE2E2', border: '#FECACA', color: '#DC2626' };
  }
  if (post.status === 'scheduled') {
    return { label: 'SCHEDULED', bg: '#DBEAFE', border: '#BFDBFE', color: '#1D4ED8' };
  }
  return { label: 'DRAFT', bg: '#F1F5F9', border: '#E2E8F0', color: '#475569' };
}

/**
 * Rich Card Component for Single Post
 */
export function PostCard({
  post,
  showApprovalActions = false,
  approveBusy = false,
  rejectBusy = false,
  retryBusy = false,
  onApprove,
  onReject,
  onRetry,
  onPress,
}: {
  post: SocialPostRow;
  showApprovalActions?: boolean;
  approveBusy?: boolean;
  rejectBusy?: boolean;
  retryBusy?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onRetry?: () => void;
  onPress?: () => void;
}) {
  const badge = statusBadge(post);
  const media = post.mediaUrls?.[0];
  const lines = (post.content || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const title = lines[0] || 'Business Update';
  const snippet = lines.length > 1 ? lines.slice(1).join(' ') : lines[0] || 'No description';

  const targets = post.publishTargets || [];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.postCard, pressed && { opacity: 0.94 }]}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {media ? (
          <Image
            source={{ uri: media }}
            style={styles.cardImage}
            accessibilityLabel="Post image"
          />
        ) : (
          <View style={styles.cardImageFallback}>
            <MaterialIcons name="auto-awesome" size={24} color="#009F50" />
          </View>
        )}

        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {title}
            </Text>
            <View
              style={[
                styles.badgeWrap,
                { backgroundColor: badge.bg, borderColor: badge.border },
              ]}
            >
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>

          <Text numberOfLines={2} style={styles.cardSnippet}>
            {snippet}
          </Text>

          {/* Metadata Row: Channels + Date */}
          <View style={styles.metaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="event" size={13} color="#64748B" />
              <Text style={styles.dateText}>
                {post.status === 'published'
                  ? relativeDate(post.publishedAt || post.scheduledAt || post.createdAt) || 'Published'
                  : post.status === 'scheduled'
                  ? relativeDate(post.scheduledAt || post.createdAt) || 'Scheduled'
                  : relativeDate(post.createdAt || post.updatedAt) || 'Draft'}
              </Text>
            </View>

            {targets.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {targets.map((t, idx) => (
                  <View key={`t-${idx}`} style={styles.channelChip}>
                    <Text style={styles.channelChipText}>{t.platform?.slice(0, 3).toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Failure banner & retry button */}
      {(post.status === 'failed' || post.failureReason) && (
        <View style={styles.failureBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="error-outline" size={16} color="#DC2626" />
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#DC2626' }}>Publishing Error</Text>
          </View>
          {post.failureReason ? (
            <Text style={{ fontSize: 11, color: '#991B1B' }}>{post.failureReason}</Text>
          ) : null}
          {onRetry && (
            <Pressable
              onPress={onRetry}
              disabled={retryBusy}
              style={styles.retryBtn}
            >
              {retryBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={14} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Retry Publish</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* 1-Tap Moderation Row for Pending Review posts */}
      {showApprovalActions && (
        <View style={styles.moderationRow}>
          <Pressable
            accessibilityRole="button"
            disabled={rejectBusy || approveBusy}
            onPress={onReject}
            style={[styles.actionBtn, styles.rejectBtn]}
          >
            {rejectBusy ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <>
                <MaterialIcons name="close" size={15} color="#DC2626" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={approveBusy || rejectBusy}
            onPress={onApprove}
            style={[styles.actionBtn, styles.approveBtn]}
          >
            {approveBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check" size={16} color="#FFFFFF" />
                <Text style={styles.approveBtnText}>Approve & Schedule</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Full Post Inspection Modal
 */
export function PostDetailModal({
  post,
  visible,
  onClose,
  onApprove,
  onReject,
  onRetry,
}: {
  post: SocialPostRow | null;
  visible: boolean;
  onClose: () => void;
  onApprove?: (post: SocialPostRow) => void;
  onReject?: (post: SocialPostRow) => void;
  onRetry?: (post: SocialPostRow) => void;
}) {
  if (!post) return null;
  const badge = statusBadge(post);
  const media = post.mediaUrls?.[0];

  const handleCopyCaption = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(post.content || '');
        Alert.alert('Copied', 'Post caption copied to clipboard!');
      } else {
        await Share.share({ message: post.content || '' });
      }
    } catch {
      Alert.alert('Notice', 'Could not copy post text.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={[
                  styles.badgeWrap,
                  { backgroundColor: badge.bg, borderColor: badge.border },
                ]}
              >
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                {post.status.toUpperCase()}
              </Text>
            </View>

            <Pressable hitSlop={10} onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color="#0F172A" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Full Poster Image */}
            {media ? (
              <View style={styles.modalImageContainer}>
                <Image source={{ uri: media }} style={styles.modalImage} resizeMode="contain" />
              </View>
            ) : null}

            {/* Content & Caption */}
            <View style={{ gap: 12, paddingVertical: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.sectionHeader}>Post Caption</Text>
                <Pressable onPress={handleCopyCaption} style={styles.copyBtn}>
                  <MaterialIcons name="content-copy" size={14} color="#009F50" />
                  <Text style={styles.copyBtnText}>Copy Text</Text>
                </Pressable>
              </View>

              <View style={styles.captionBox}>
                <Text style={styles.captionText}>{post.content || 'No text content.'}</Text>
              </View>

              {/* Target Platforms Breakdown */}
              {post.publishTargets && post.publishTargets.length > 0 && (
                <View style={{ gap: 6, marginTop: 4 }}>
                  <Text style={styles.sectionHeader}>Publishing Channels</Text>
                  {post.publishTargets.map((target, idx) => (
                    <View key={`targ-${idx}`} style={styles.targetRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons
                          name={
                            target.platform === 'googlebusiness'
                              ? 'place'
                              : target.platform === 'instagram'
                              ? 'camera-alt'
                              : 'public'
                          }
                          size={16}
                          color="#009F50"
                        />
                        <Text style={styles.targetName}>
                          {target.platform === 'googlebusiness'
                            ? 'Google Business Profile'
                            : target.platform.toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.targetStatus,
                          target.status === 'published' && { color: '#16A34A' },
                          target.status === 'failed' && { color: '#DC2626' },
                        ]}
                      >
                        {target.status.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Footer */}
          {post.approvalStatus === 'pending' ? (
            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  onReject && onReject(post);
                  onClose();
                }}
                style={[styles.modalActionBtn, styles.modalRejectBtn]}
              >
                <MaterialIcons name="close" size={18} color="#DC2626" />
                <Text style={styles.modalRejectText}>Reject Post</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  onApprove && onApprove(post);
                  onClose();
                }}
                style={[styles.modalActionBtn, styles.modalApproveBtn]}
              >
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.modalApproveText}>Approve & Queue</Text>
              </Pressable>
            </View>
          ) : post.status === 'failed' ? (
            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  onRetry && onRetry(post);
                  onClose();
                }}
                style={[styles.modalActionBtn, styles.modalApproveBtn]}
              >
                <MaterialIcons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.modalApproveText}>Retry Publishing</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Modern Posts Board with Filter Chips & Batch Moderation
 */
export function PostsBoard({
  refreshKey = 0,
  platform,
  onNeedCompose,
}: {
  refreshKey?: number;
  platform?: string;
  onNeedCompose?: () => void;
}) {
  const [pill, setPill] = useState<PostPill>('pending');
  const [selectedChannel, setSelectedChannel] = useState<string>(platform || 'all');
  const board = usePillPosts(pill, selectedChannel === 'all' ? undefined : selectedChannel);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [inspectPost, setInspectPost] = useState<SocialPostRow | null>(null);

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

  async function approveAllPending() {
    if (!board.rows || board.rows.length === 0 || batchBusy) return;
    setBatchBusy(true);
    try {
      const pendingPosts = board.rows.filter((p) => p.approvalStatus === 'pending');
      await Promise.all(
        pendingPosts.map((p) =>
          apiRequest(`/api/social/posts/${p.id}/approval`, {
            method: 'POST',
            body: { approvalStatus: 'approved' },
          })
        )
      );
      Alert.alert('Approved!', `All ${pendingPosts.length} posts have been approved and scheduled.`);
      await board.reload();
    } catch (e) {
      Alert.alert('Notice', e instanceof Error ? e.message : 'Failed to approve some posts.');
    } finally {
      setBatchBusy(false);
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
      {/* ── Sleek Modern Status Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {MODERN_PILLS.map((p) => {
          const active = pill === p.key;
          return (
            <Pressable
              key={p.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setPill(p.key)}
              style={[styles.statusTab, active && styles.statusTabActive]}
            >
              <MaterialIcons
                name={p.icon as any}
                size={15}
                color={active ? '#009F50' : '#64748B'}
              />
              <Text style={[styles.statusTabText, active && styles.statusTabTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Channel Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.channelScroll}
      >
        {CHANNEL_FILTERS.map((ch) => {
          const isChActive = selectedChannel === ch.id;
          return (
            <Pressable
              key={ch.id}
              onPress={() => setSelectedChannel(ch.id)}
              style={[styles.channelChipBtn, isChActive && styles.channelChipBtnActive]}
            >
              <MaterialIcons
                name={ch.icon as any}
                size={13}
                color={isChActive ? '#009F50' : '#64748B'}
              />
              <Text
                style={[styles.channelChipLabel, isChActive && styles.channelChipLabelActive]}
              >
                {ch.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Batch Action Banner for Pending Reviews ── */}
      {pill === 'pending' && board.rows && board.rows.length > 1 && (
        <View style={styles.batchBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="auto-awesome" size={16} color="#009F50" />
            <Text style={styles.batchBannerTitle}>
              {board.rows.length} campaigns ready for approval
            </Text>
          </View>
          <Pressable
            onPress={approveAllPending}
            disabled={batchBusy}
            style={styles.batchApproveBtn}
          >
            {batchBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.batchApproveText}>Approve All ({board.rows.length})</Text>
            )}
          </Pressable>
        </View>
      )}

      <ErrorNotice message={board.error} retry={() => void board.reload()} />

      {board.loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading posts"
          color="#009F50"
          style={{ padding: 26 }}
        />
      ) : !board.rows?.length ? (
        !board.error && (
          <Empty
            title={empty.title}
            detail={empty.detail}
            actionLabel={onNeedCompose ? '✨ Generate AI Poster' : undefined}
            onAction={onNeedCompose}
          />
        )
      ) : (
        board.rows.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPress={() => setInspectPost(post)}
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

      {/* Post Detail Modal */}
      <PostDetailModal
        post={inspectPost}
        visible={!!inspectPost}
        onClose={() => setInspectPost(null)}
        onApprove={(p) => void moderate(p, 'approved')}
        onReject={(p) => void moderate(p, 'rejected')}
        onRetry={(p) => void retry(p)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabsScroll: {
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusTabActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  statusTabTextActive: {
    color: '#009F50',
    fontWeight: '800',
  },
  channelScroll: {
    gap: 6,
    paddingHorizontal: 2,
  },
  channelChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  channelChipBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  channelChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  channelChipLabelActive: {
    color: '#009F50',
    fontWeight: '800',
  },
  batchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  batchBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  batchApproveBtn: {
    backgroundColor: '#009F50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  batchApproveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardImage: {
    width: 78,
    height: 78,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  cardImageFallback: {
    width: 78,
    height: 78,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  cardSnippet: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  badgeWrap: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  dateText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  channelChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  channelChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  failureBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  moderationRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    backgroundColor: '#009F50',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '90%',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  modalImageContainer: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    backgroundColor: '#070A13',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#009F50',
  },
  captionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  captionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  targetName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  targetStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  modalRejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modalRejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalApproveBtn: {
    backgroundColor: '#009F50',
  },
  modalApproveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
