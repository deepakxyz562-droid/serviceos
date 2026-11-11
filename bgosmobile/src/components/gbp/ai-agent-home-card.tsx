import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../ui';

interface AiAgentHomeCardProps {
  businessName?: string;
  seoUpdatesCount?: number;
  publishedPhotosCount?: number;
  scheduledPhotosCount?: number;
  newReviewsCount?: number;
  totalReviewsCount?: number;
  replyRate?: number | null;
  queuedInvitesCount?: number;
  sentInvitesCount?: number;
  scheduledPostsCount?: number;
  onOpenSeoUpdates: () => void;
  onAddPhotos: () => void;
  onOpenReviews?: () => void;
  onOpenPosts?: () => void;
}

/**
 * Top Circular Action Story Bubbles:
 * [Add Photos] [Editing Posts] [Reviews Mgmt] [Photo Boost]
 */
export function HomeStoryBubblesStrip({
  onAddPhotos,
  onOpenPosts,
  onOpenReviews,
  onPhotoBoost,
}: {
  onAddPhotos: () => void;
  onOpenPosts: () => void;
  onOpenReviews: () => void;
  onPhotoBoost: () => void;
}) {
  const stories = [
    {
      id: 's1',
      title: 'Add Photos',
      icon: 'add-a-photo' as const,
      color: '#009F50',
      borderColor: '#34D399',
      onPress: onAddPhotos,
    },
    {
      id: 's2',
      title: 'Editing Posts',
      icon: 'edit' as const,
      color: '#3B82F6',
      borderColor: '#60A5FA',
      onPress: onOpenPosts,
    },
    {
      id: 's3',
      title: 'Reviews Mgmt',
      icon: 'star' as const,
      color: '#F59E0B',
      borderColor: '#FCD34D',
      onPress: onOpenReviews,
    },
    {
      id: 's4',
      title: 'Photo Boost',
      icon: 'auto-fix-high' as const,
      color: '#8B5CF6',
      borderColor: '#C084FC',
      onPress: onPhotoBoost,
    },
  ];

  return (
    <View style={styles.storiesContainer}>
      {stories.map((s) => (
        <Pressable
          key={s.id}
          accessibilityRole="button"
          accessibilityLabel={s.title}
          onPress={s.onPress}
          style={({ pressed }) => [
            styles.storyItem,
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
        >
          <View style={[styles.storyRing, { borderColor: s.borderColor }]}>
            <View style={[styles.storyCircle, { backgroundColor: s.color }]}>
              <MaterialIcons name={s.icon} size={22} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.storyTitle} numberOfLines={1}>
            {s.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Active "GBP AI Agent" Checklist Card — Light BGOS UI + live workspace stats
 */
export function GbpAiAgentHomeCard({
  businessName = 'My Business',
  seoUpdatesCount = 8,
  publishedPhotosCount = 0,
  scheduledPhotosCount = 0,
  newReviewsCount = 0,
  totalReviewsCount = 0,
  replyRate = null,
  queuedInvitesCount = 0,
  sentInvitesCount = 0,
  scheduledPostsCount = 0,
  onOpenSeoUpdates,
  onAddPhotos,
  onOpenReviews,
  onOpenPosts,
}: AiAgentHomeCardProps) {
  const router = useRouter();

  const totalInvites = queuedInvitesCount + sentInvitesCount;
  const reviewSummaryParts: string[] = [];
  if (totalReviewsCount > 0) {
    reviewSummaryParts.push(`${totalReviewsCount} total`);
    if (replyRate != null) reviewSummaryParts.push(`${Math.round(replyRate)}% replied`);
  } else {
    reviewSummaryParts.push('Send invite links to start collecting reviews');
  }
  if (totalInvites > 0) {
    reviewSummaryParts.push(
      queuedInvitesCount > 0
        ? `${queuedInvitesCount} scheduled`
        : `${sentInvitesCount} invite${sentInvitesCount === 1 ? '' : 's'} sent`,
    );
  }

  const checklist = [
    {
      id: 'c1',
      title: 'GBP Profile SEO',
      subtitle: `${seoUpdatesCount} automated SEO checks & updates`,
      badge: `⚡ ${seoUpdatesCount} Active`,
      badgeType: 'purple' as const,
      icon: 'tune' as const,
      iconColor: '#6440CD',
      iconBg: '#F2EDFD',
      onPress: onOpenSeoUpdates,
    },
    {
      id: 'c2',
      title: 'GBP Posting Autopilot',
      subtitle:
        scheduledPostsCount > 0
          ? `${scheduledPostsCount} scheduled post${scheduledPostsCount === 1 ? '' : 's'} in queue`
          : `Create or schedule posts for ${businessName}`,
      icon: 'schedule' as const,
      iconColor: '#B45309',
      iconBg: '#FEF3C7',
      onPress: onOpenPosts || (() => router.push('/(tabs)/marketing')),
    },
    {
      id: 'c3',
      title: `${publishedPhotosCount} Photos/Videos Live`,
      subtitle:
        scheduledPhotosCount > 0
          ? `${scheduledPhotosCount} scheduled to publish`
          : 'Upload photos or short videos for steady weekly posting',
      badge: publishedPhotosCount === 0 && scheduledPhotosCount === 0 ? 'Add media' : undefined,
      badgeType: 'amber' as const,
      icon: 'photo-library' as const,
      iconColor: colors.brandDark,
      iconBg: colors.brandSoft,
      onPress: onAddPhotos,
    },
    {
      id: 'c4',
      title: `${newReviewsCount} New Reviews This Week`,
      subtitle: reviewSummaryParts.join(' · '),
      icon: 'star' as const,
      iconColor: '#D97706',
      iconBg: '#FFFBEB',
      onPress: onOpenReviews || (() => router.push('/(tabs)/reviews')),
    },
    {
      id: 'c5',
      title: 'Performance Analysis',
      subtitle: 'Live Google Search views, calls & direction clicks',
      icon: 'bar-chart' as const,
      iconColor: '#0284C7',
      iconBg: '#E0F2FE',
      onPress: () => router.push('/growth'),
    },
  ];

  const hasScheduledMedia = scheduledPhotosCount > 0;
  const hasAnyMedia = publishedPhotosCount > 0 || scheduledPhotosCount > 0;

  return (
    <View style={styles.card}>
      {/* ── Top Agent Header ── */}
      <View style={styles.agentHeader}>
        <View style={styles.agentInfoRow}>
          <View style={styles.agentAvatarCircle}>
            <MaterialIcons name="smart-toy" size={20} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentTitle}>GBP AI Agent</Text>
            <Text style={styles.agentSub} numberOfLines={1}>
              Continuously optimizing {businessName}
            </Text>
          </View>
        </View>

        <View style={styles.activePill}>
          <View style={styles.activeDot} />
          <Text style={styles.activePillText}>Active</Text>
        </View>
      </View>

      {/* ── Media Readiness Banner (Honest Live Count) ── */}
      <View style={[styles.photoBanner, !hasAnyMedia && styles.photoBannerAttention]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.photoBannerTitle}>
            {hasScheduledMedia ? (
              <>
                <Text style={{ color: colors.brandDark, fontWeight: '800' }}>
                  {scheduledPhotosCount} {scheduledPhotosCount === 1 ? 'media item' : 'media items'}
                </Text>{' '}
                scheduled to publish
              </>
            ) : publishedPhotosCount > 0 ? (
              <>
                <Text style={{ color: colors.brandDark, fontWeight: '800' }}>
                  {publishedPhotosCount} live
                </Text>{' '}
                on Google Business Profile
              </>
            ) : (
              <>
                <Text style={{ color: '#B45309', fontWeight: '800' }}>No media queued</Text> yet
              </>
            )}
          </Text>
          <Text style={styles.photoBannerSub}>
            {hasScheduledMedia
              ? 'BGOS keeps your Google profile active automatically'
              : 'Upload photos or videos with AI-generated titles & tags'}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onAddPhotos}
          style={({ pressed }) => [styles.addPhotosMiniBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.addPhotosMiniBtnText}>Add Media</Text>
        </Pressable>
      </View>

      {/* ── Checklist Rows ── */}
      <View style={styles.checklistColumn}>
        {checklist.map((item, idx) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.checklistItem,
              idx === checklist.length - 1 && { borderBottomWidth: 0, paddingBottom: 2 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.itemIconCircle, { backgroundColor: item.iconBg }]}>
              <MaterialIcons name={item.icon} size={18} color={item.iconColor} />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.badge ? (
                  <View
                    style={[
                      styles.itemBadge,
                      item.badgeType === 'purple' ? styles.purpleBadge : styles.amberBadge,
                    ]}
                  >
                    <Text
                      style={
                        item.badgeType === 'purple' ? styles.purpleBadgeText : styles.amberBadgeText
                      }
                    >
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.itemSub}>{item.subtitle}</Text>
            </View>

            <MaterialIcons name="chevron-right" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  storiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  storyItem: {
    alignItems: 'center',
    gap: 6,
    width: '23%',
  },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  storyCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
    marginVertical: 4,
    shadowColor: '#070B2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  agentInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  agentAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  agentTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.ink,
  },
  agentSub: {
    fontSize: 11.5,
    color: colors.muted,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandDark,
  },
  photoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#F3F8F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D5E9DD',
  },
  photoBannerAttention: {
    backgroundColor: colors.note,
    borderColor: colors.noteBorder,
  },
  photoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  photoBannerSub: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
  addPhotosMiniBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  addPhotosMiniBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checklistColumn: {
    gap: 4,
    marginTop: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    gap: 10,
  },
  itemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  itemSub: {
    fontSize: 11.5,
    color: colors.muted,
  },
  itemBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  purpleBadge: {
    backgroundColor: colors.aiPurpleSoft,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  purpleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.aiPurple,
  },
  amberBadge: {
    backgroundColor: colors.note,
    borderWidth: 1,
    borderColor: colors.noteBorder,
  },
  amberBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
});
