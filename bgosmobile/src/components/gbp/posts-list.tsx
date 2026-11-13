import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Empty, ErrorNotice, colors, ui } from '../ui';
import { apiRequest } from '../../lib/api';
import { getGooglePostUrl } from '../../lib/social-links';
import { relativeDate } from './bits';

export { getGooglePostUrl };

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
  permalink?: string | null;
  googleUrl?: string | null;
  title?: string;
  badge?: string;
  publishTargets?: {
    platform: string;
    status: string;
    error?: string;
    externalPostId?: string;
    permalink?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

async function openGooglePostLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open link', 'Could not open the Google Business post link.');
  }
}

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
  const googlePostUrl = getGooglePostUrl(post);

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

      {googlePostUrl && (post.status === 'published' || post.status === 'partial') ? (
        <Pressable
          accessibilityRole="link"
          onPress={(e) => {
            e.stopPropagation?.();
            void openGooglePostLink(googlePostUrl);
          }}
          style={styles.googleLinkBtn}
        >
          <MaterialIcons name="open-in-new" size={14} color="#009F50" />
          <Text style={styles.googleLinkBtnText}>View Post on Google</Text>
        </Pressable>
      ) : null}

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

export interface ParsedPostContent {
  title: string;
  intro: string;
  bullets: string[];
  conclusion: string;
  hashtags: string[];
  ctaText: string;
  phone?: string;
}

export function parsePostStructure(content: string, fallbackTitle?: string): ParsedPostContent {
  const lines = (content || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return {
      title: fallbackTitle || 'Local Business Update',
      intro: '',
      bullets: [],
      conclusion: '',
      hashtags: [],
      ctaText: 'CALL',
    };
  }

  let title = '';
  let intro = '';
  const bullets: string[] = [];
  let conclusion = '';
  const hashtags: string[] = [];
  let ctaText = 'CALL';
  let phone = '';

  let readingSection: 'title' | 'intro' | 'bullets' | 'conclusion' = 'title';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#') || line.includes(' #')) {
      const tags = line.match(/#[a-zA-Z0-9_]+/g);
      if (tags) {
        hashtags.push(...tags);
        continue;
      }
    }

    if (/^(CTA|Action|Button):/i.test(line)) {
      ctaText = line.replace(/^(CTA|Action|Button):\s*/i, '').trim().toUpperCase() || 'CALL';
      continue;
    }
    if (/^(Phone|Call|Contact|Tel):/i.test(line)) {
      phone = line.replace(/^(Phone|Call|Contact|Tel):\s*/i, '').trim();
      continue;
    }

    if (/^[✓•\-\*]\s*/.test(line)) {
      readingSection = 'bullets';
      bullets.push(line.replace(/^[✓•\-\*]\s*/, '').trim());
      continue;
    }

    if (readingSection === 'title') {
      title = line;
      readingSection = 'intro';
      continue;
    }

    if (readingSection === 'intro') {
      intro = intro ? `${intro}\n\n${line}` : line;
      continue;
    }

    if (readingSection === 'bullets') {
      conclusion = conclusion ? `${conclusion}\n\n${line}` : line;
    }
  }

  if (!title) title = fallbackTitle || 'Local Business Update';

  return {
    title,
    intro,
    bullets,
    conclusion,
    hashtags,
    ctaText,
    phone,
  };
}

/**
 * Full Post Inspection & Management Modal (Matches Reference Screenshots 1 & 3)
 */
export function PostDetailModal({
  post,
  visible,
  onClose,
  onApprove,
  onReject,
  onRetry,
  onDelete,
  onEditSave,
}: {
  post: SocialPostRow | null;
  visible: boolean;
  onClose: () => void;
  onApprove?: (post: SocialPostRow) => void;
  onReject?: (post: SocialPostRow) => void;
  onRetry?: (post: SocialPostRow) => void;
  onDelete?: (post: SocialPostRow) => void;
  onEditSave?: (updatedPost: SocialPostRow) => void;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editIntro, setEditIntro] = useState('');
  const [editBullets, setEditBullets] = useState('');
  const [editConclusion, setEditConclusion] = useState('');
  const [editCta, setEditCta] = useState('CALL');
  const [editHashtags, setEditHashtags] = useState('');

  useEffect(() => {
    if (post) {
      const p = parsePostStructure(post.content || '', post.title || (post.designJson as any)?.headline || 'Standard Post');
      setEditTitle(p.title);
      setEditIntro(p.intro);
      setEditBullets(p.bullets.join('\n'));
      setEditConclusion(p.conclusion);
      setEditCta(p.ctaText || 'CALL');
      setEditHashtags(p.hashtags.join(' '));
      setIsEditing(false);
      setMenuVisible(false);
    }
  }, [post]);

  if (!post || !visible) return null;

  const badge = statusBadge(post);
  const media = post.mediaUrls?.[0];
  const googlePostUrl = getGooglePostUrl(post);
  const parsed = parsePostStructure(post.content || '', post.title || (post.designJson as any)?.headline || 'Standard Post');

  const handleCopyCaption = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(post.content || '');
        Alert.alert('Copied', 'Post text copied to clipboard!');
      } else {
        await Share.share({ message: post.content || '' });
      }
    } catch {
      Alert.alert('Notice', 'Could not copy post text.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${parsed.title}\n\n${post.content || ''}`,
        url: media || undefined,
      });
    } catch {}
  };

  const handleDeletePost = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onDelete) {
                onDelete(post);
              } else if (post.id && !post.id.startsWith('ai_post_')) {
                await apiRequest(`/api/social/posts/${post.id}`, { method: 'DELETE' });
              }
              onClose();
              Alert.alert('Deleted', 'Post deleted successfully.');
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete post.');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const bulletLines = editBullets
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => (b.startsWith('✓') ? b : `✓ ${b}`))
        .join('\n');

      const reconstructed = `${editTitle.trim()}\n\n${editIntro.trim()}\n\n${bulletLines}\n\n${editConclusion.trim()}\n\nCTA: ${editCta.trim().toUpperCase()}\n\n${editHashtags.trim()}`;

      const updatedRow: SocialPostRow = {
        ...post,
        content: reconstructed,
      };

      if (onEditSave) {
        onEditSave(updatedRow);
      } else if (post.id && !post.id.startsWith('ai_post_')) {
        await apiRequest(`/api/social/posts/${post.id}`, {
          method: 'PATCH',
          body: { content: reconstructed },
        });
      }

      setIsEditing(false);
      Alert.alert('Saved', 'Post updated successfully!');
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save post changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleNativeCall = () => {
    const rawPhone = parsed.phone || '+919876543210';
    const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
    void Linking.openURL(`tel:${cleanPhone}`);
  };

  const insets = useSafeAreaInsets();
  const headerPaddingTop = Math.max(insets.top, 14);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {/* ── App Bar Header (Back Arrow, Title "Post", 3-dots Menu) ── */}
        <View style={[styles.postNavHeader, { paddingTop: headerPaddingTop, height: 52 + headerPaddingTop }]}>
          <Pressable
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            onPress={onClose}
            style={styles.navIconBtn}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>

          <Text style={styles.navTitle}>Post</Text>

          <Pressable
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            onPress={() => setMenuVisible(!menuVisible)}
            style={styles.navIconBtn}
            accessibilityLabel="Post options"
            accessibilityRole="button"
          >
            <MaterialIcons name="more-vert" size={24} color="#0F172A" />
          </Pressable>
        </View>

        {/* ── 3-Dots Dropdown Menu ── */}
        {menuVisible && (
          <View style={[styles.dropdownMenu, { top: 54 + headerPaddingTop }]}>
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                setIsEditing(true);
              }}
              style={styles.menuItem}
            >
              <MaterialIcons name="edit" size={18} color="#0F172A" />
              <Text style={styles.menuItemText}>Edit Post</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMenuVisible(false);
                void handleCopyCaption();
              }}
              style={styles.menuItem}
            >
              <MaterialIcons name="content-copy" size={18} color="#0F172A" />
              <Text style={styles.menuItemText}>Copy Caption</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMenuVisible(false);
                void handleShare();
              }}
              style={styles.menuItem}
            >
              <MaterialIcons name="share" size={18} color="#0F172A" />
              <Text style={styles.menuItemText}>Share Post</Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 4 }} />

            <Pressable onPress={handleDeletePost} style={styles.menuItem}>
              <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Delete Post</Text>
            </Pressable>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {isEditing ? (
            /* ── EDIT POST MODE ── */
            <View style={{ padding: 18, gap: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Edit Post Content</Text>

              <View>
                <Text style={styles.editLabel}>Headline (H1)</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  style={styles.editInput}
                  placeholder="Catchy local SEO headline..."
                />
              </View>

              <View>
                <Text style={styles.editLabel}>Intro Paragraph</Text>
                <TextInput
                  value={editIntro}
                  onChangeText={setEditIntro}
                  style={[styles.editInput, { height: 90, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Engaging local intro with keywords..."
                />
              </View>

              <View>
                <Text style={styles.editLabel}>Feature Bullets (1 per line)</Text>
                <TextInput
                  value={editBullets}
                  onChangeText={setEditBullets}
                  style={[styles.editInput, { height: 120, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="One feature per line..."
                />
              </View>

              <View>
                <Text style={styles.editLabel}>Conclusion Paragraph</Text>
                <TextInput
                  value={editConclusion}
                  onChangeText={setEditConclusion}
                  style={[styles.editInput, { height: 75, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Closing call to action paragraph..."
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>Call-to-Action Text</Text>
                  <TextInput
                    value={editCta}
                    onChangeText={setEditCta}
                    style={styles.editInput}
                    placeholder="CALL, BOOK NOW, etc."
                  />
                </View>
              </View>

              <View>
                <Text style={styles.editLabel}>Hashtags</Text>
                <TextInput
                  value={editHashtags}
                  onChangeText={setEditHashtags}
                  style={styles.editInput}
                  placeholder="#LocalSEO #Business #City"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Pressable
                  onPress={() => setIsEditing(false)}
                  style={[styles.editActionBtn, { backgroundColor: '#F1F5F9' }]}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                  style={[styles.editActionBtn, { backgroundColor: '#009F50' }]}
                >
                  {savingEdit ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            /* ── VIEW POST MODE (Matching Screenshots 1 & 3) ── */
            <>
              {/* Full Hero Image */}
              {media ? (
                <View style={styles.heroImageWrap}>
                  <Image source={{ uri: media }} style={styles.heroImage} resizeMode="cover" />
                  {(post.logoUrl || post.businessName) && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 14,
                        left: 14,
                        backgroundColor: 'rgba(15, 23, 42, 0.82)',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 18,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 7,
                        maxWidth: '75%',
                      }}
                    >
                      {post.logoUrl ? (
                        <Image
                          source={{ uri: post.logoUrl }}
                          style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }}
                          resizeMode="contain"
                        />
                      ) : (
                        <MaterialIcons name="storefront" size={16} color="#009F50" />
                      )}
                      <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                        {post.businessName || 'Verified Business'}
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              <View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 16 }}>
                {/* Standard Post Badge */}
                <View style={styles.standardPostBadge}>
                  <MaterialIcons name="description" size={15} color="#9A3412" />
                  <Text style={styles.standardPostBadgeText}>Standard Post</Text>
                </View>

                {/* Bold SEO Headline (H1) */}
                <Text style={styles.postHeadline}>{parsed.title}</Text>

                {/* Engaging Intro Paragraph */}
                {parsed.intro ? <Text style={styles.postParagraph}>{parsed.intro}</Text> : null}

                {/* Bullet Points with Checkmarks */}
                {parsed.bullets.length > 0 && (
                  <View style={{ gap: 12, marginVertical: 4 }}>
                    {parsed.bullets.map((bullet, idx) => (
                      <View key={`bullet-${idx}`} style={styles.bulletRow}>
                        <Text style={styles.checkIcon}>✓</Text>
                        <Text style={styles.bulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Concluding Paragraph */}
                {parsed.conclusion ? (
                  <Text style={styles.postParagraph}>{parsed.conclusion}</Text>
                ) : null}

                {/* Hashtag Chips */}
                {parsed.hashtags.length > 0 && (
                  <View style={styles.hashtagWrap}>
                    {parsed.hashtags.map((tag, idx) => (
                      <View key={`tag-${idx}`} style={styles.hashtagChip}>
                        <Text style={styles.hashtagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Native Action Button (CALL) */}
                <View style={{ marginTop: 8, paddingBottom: 16 }}>
                  <Pressable
                    onPress={handleNativeCall}
                    style={styles.nativeCallBtn}
                    accessibilityRole="button"
                    accessibilityLabel={parsed.ctaText || 'CALL'}
                  >
                    <MaterialIcons name="call" size={18} color="#0F172A" />
                    <Text style={styles.nativeCallBtnText}>{parsed.ctaText || 'CALL'}</Text>
                  </Pressable>
                </View>

                {/* Google Post Live Link or Approval Bar */}
                {googlePostUrl ? (
                  <Pressable
                    onPress={() => void openGooglePostLink(googlePostUrl)}
                    style={styles.liveGoogleBar}
                  >
                    <MaterialIcons name="open-in-new" size={16} color="#009F50" />
                    <Text style={styles.liveGoogleBarText}>View Live on Google Business</Text>
                  </Pressable>
                ) : post.approvalStatus === 'pending' ? (
                  <View style={styles.approvalBar}>
                    <Pressable
                      onPress={() => {
                        onReject && onReject(post);
                        onClose();
                      }}
                      style={[styles.approvalBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 }]}
                    >
                      <MaterialIcons name="close" size={16} color="#DC2626" />
                      <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 13 }}>Reject</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        onApprove && onApprove(post);
                        onClose();
                      }}
                      style={[styles.approvalBtn, { backgroundColor: '#009F50' }]}
                    >
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>Approve & Schedule</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
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
  initialPill,
  focusedPostId,
  onClearFocusedPost,
  onNeedCompose,
}: {
  refreshKey?: number;
  platform?: string;
  initialPill?: PostPill;
  focusedPostId?: string | null;
  onClearFocusedPost?: () => void;
  onNeedCompose?: () => void;
}) {
  const [pill, setPill] = useState<PostPill>(initialPill || 'pending');
  const [selectedChannel, setSelectedChannel] = useState<string>(platform || 'all');
  const board = usePillPosts(pill, selectedChannel === 'all' ? undefined : selectedChannel);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [inspectPost, setInspectPost] = useState<SocialPostRow | null>(null);

  useEffect(() => {
    if (initialPill && initialPill !== pill) {
      setPill(initialPill);
    }
  }, [initialPill]);

  useEffect(() => {
    if (!focusedPostId) return;
    const match = board.rows?.find((r) => r.id === focusedPostId);
    if (match) {
      setInspectPost(match);
      onClearFocusedPost?.();
      return;
    }
    let cancelled = false;
    apiRequest<{ data: SocialPostRow }>(`/api/social/posts/${encodeURIComponent(focusedPostId)}`)
      .then((res) => {
        if (cancelled || !res?.data) return;
        const p = res.data;
        if (p.status === 'published' || p.status === 'partial') setPill('posted');
        else if (p.status === 'failed') setPill('failed');
        else if (p.status === 'scheduled') setPill('scheduled');
        setInspectPost(p);
        onClearFocusedPost?.();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [focusedPostId, board.rows, onClearFocusedPost]);

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
      {inspectPost ? (
        <PostDetailModal
          post={inspectPost}
          visible={!!inspectPost}
          onClose={() => setInspectPost(null)}
          onApprove={(p) => void moderate(p, 'approved')}
          onReject={(p) => void moderate(p, 'rejected')}
          onRetry={(p) => void retry(p)}
        />
      ) : null}
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
  googleLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  googleLinkBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#009F50',
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

  // Full Screen Post Detail styles (matching Screenshots 1 & 3)
  postNavHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  navIconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 54,
    right: 16,
    zIndex: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    paddingVertical: 6,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  heroImageWrap: {
    width: '100%',
    height: 280,
    backgroundColor: '#0F172A',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  standardPostBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  standardPostBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A3412',
  },
  postHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  postParagraph: {
    fontSize: 14.5,
    color: '#334155',
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkIcon: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 14.5,
    color: '#1E293B',
    lineHeight: 21,
  },
  hashtagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  hashtagChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hashtagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  nativeCallBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nativeCallBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  liveGoogleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveGoogleBarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#009F50',
  },
  approvalBar: {
    flexDirection: 'row',
    gap: 12,
  },
  approvalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  editActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
