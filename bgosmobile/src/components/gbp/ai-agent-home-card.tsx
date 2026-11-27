import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../ui';

interface AiAgentHomeCardProps {
  businessName?: string;
  city?: string;
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
  onOpenPosters?: () => void;
}

/**
 * Top Circular Action Story Bubbles:
 * The 4 Autonomous AI Marketing Quick-Actions
 */
export function HomeStoryBubblesStrip({
  onAddPhotos,
  onOpenPosts,
  onOpenReviews,
  onOpenSeo,
  onOpenPosters,
}: {
  onAddPhotos: () => void;
  onOpenPosts: () => void;
  onOpenReviews: () => void;
  onOpenSeo?: () => void;
  onOpenPosters?: () => void;
}) {
  const router = useRouter();
  const stories = [
    {
      id: 's_creative',
      title: 'Poster Studio',
      icon: 'auto-awesome' as const,
      color: '#4F46E5',
      ringColor: '#C7D2FE',
      shadowColor: '#4F46E5',
      onPress: onOpenPosters || (() => router.push('/(tabs)/marketing?mode=studio')),
    },
    {
      id: 's_ranking',
      title: 'Rank Track',
      icon: 'trending-up' as const,
      color: '#0284C7',
      ringColor: '#BAE6FD',
      shadowColor: '#0284C7',
      onPress: onOpenSeo || (() => router.push('/seo-growth')),
    },
    {
      id: 's_reviews',
      title: 'Get Reviews',
      icon: 'star' as const,
      color: '#D97706',
      ringColor: '#FDE68A',
      shadowColor: '#D97706',
      onPress: onOpenReviews || (() => router.push('/(tabs)/reviews')),
    },
    {
      id: 's_media',
      title: 'Add Photos',
      icon: 'photo-camera' as const,
      color: '#059669',
      ringColor: '#A7F3D0',
      shadowColor: '#059669',
      onPress: onAddPhotos || (() => router.push('/(tabs)/marketing?mode=media')),
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.storiesContainer}
    >
      {stories.map((s) => (
        <Pressable
          key={s.id}
          accessibilityRole="button"
          accessibilityLabel={s.title}
          onPress={s.onPress}
          style={({ pressed }) => [
            styles.storyItem,
            pressed && { opacity: 0.82, transform: [{ scale: 0.95 }] },
          ]}
        >
          <View
            style={[
              styles.storyRing,
              {
                borderColor: s.ringColor,
                shadowColor: s.shadowColor,
              },
            ]}
          >
            <View style={[styles.storyCircle, { backgroundColor: s.color }]}>
              <MaterialIcons name={s.icon} size={22} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.storyTitle} numberOfLines={1}>
            {s.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * Four Autonomous AI Marketing Agents Card
 * Trained on your business — 24/7 Autopilot across Google Maps & Search
 */
export function GbpAiAgentHomeCard({
  businessName = 'My Business',
  city,
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
  onOpenPosters,
}: AiAgentHomeCardProps) {
  const router = useRouter();

  const formattedCity = city && city !== 'your area' ? `${city} ` : '';

  const agents = [
    {
      id: 'agent_ranking',
      number: '1',
      title: 'Ranking & Local SEO Agent',
      subtitle: `${seoUpdatesCount} ${formattedCity}keyword tracking • Maps 3-Pack Autopilot`,
      badge: 'Active',
      badgeType: 'purple' as const,
      icon: 'trending-up' as const,
      iconColor: '#4F46E5',
      iconBg: '#EEF2FF',
      onPress: onOpenSeoUpdates,
    },
    {
      id: 'agent_creative',
      number: '2',
      title: 'Poster & Creative Studio Agent',
      subtitle: 'Festival flyers, custom offers & promotional banners',
      badge: 'Studio Ready',
      badgeType: 'purple' as const,
      icon: 'auto-awesome' as const,
      iconColor: '#7C3AED',
      iconBg: '#F3E8FF',
      onPress: onOpenPosters || (() => router.push('/(tabs)/marketing?mode=studio')),
    },
    {
      id: 'agent_review',
      number: '3',
      title: 'Review & Reputation Agent',
      subtitle:
        totalReviewsCount > 0
          ? `${totalReviewsCount} Google reviews monitored • AI auto-reply active`
          : '5★ review collection via QR Standee & WhatsApp • Auto-reply active',
      badge: totalReviewsCount > 0 ? `${totalReviewsCount} Reviews` : 'Collect Reviews',
      badgeType: 'amber' as const,
      icon: 'star' as const,
      iconColor: '#D97706',
      iconBg: '#FEF3C7',
      onPress: onOpenReviews || (() => router.push('/(tabs)/reviews')),
    },
    {
      id: 'agent_media',
      number: '4',
      title: 'Storefront & Media Agent',
      subtitle: `${publishedPhotosCount} live on Google Maps • AI geotags & titles active`,
      badge: publishedPhotosCount > 0 ? `${publishedPhotosCount} Live` : 'Add Photos',
      badgeType: 'emerald' as const,
      icon: 'photo-library' as const,
      iconColor: '#059669',
      iconBg: '#DCFCE7',
      onPress: onAddPhotos || (() => router.push('/(tabs)/marketing?mode=media')),
    },
  ];

  return (
    <View style={styles.card}>
      {/* ── Top Agent Header ── */}
      <View style={styles.agentHeader}>
        <View style={styles.agentInfoRow}>
          <View style={styles.agentAvatarCircle}>
            <MaterialIcons name="smart-toy" size={20} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.agentTitle}>Four AI Marketing Agents</Text>
            </View>
            <Text style={styles.agentSub} numberOfLines={1}>
              Trained on {businessName} • 24/7 Autopilot
            </Text>
          </View>
        </View>

        <View style={styles.activePill}>
          <View style={styles.activeDot} />
          <Text style={styles.activePillText}>4 Active</Text>
        </View>
      </View>

      {/* ── 4 Autonomous Agents Rows (Clean, Relevant Only) ── */}
      <View style={styles.checklistColumn}>
        {agents.map((item, idx) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.checklistItem,
              idx === agents.length - 1 && { borderBottomWidth: 0, paddingBottom: 2 },
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
                      item.badgeType === 'purple'
                        ? styles.purpleBadge
                        : item.badgeType === 'emerald'
                        ? styles.emeraldBadge
                        : styles.amberBadge,
                    ]}
                  >
                    <Text
                      style={
                        item.badgeType === 'purple'
                          ? styles.purpleBadgeText
                          : item.badgeType === 'emerald'
                          ? styles.emeraldBadgeText
                          : styles.amberBadgeText
                      }
                    >
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.itemSub} numberOfLines={1}>
                {item.subtitle}
              </Text>
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
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  storyItem: {
    alignItems: 'center',
    gap: 6,
    width: 76,
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },
  storyCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    letterSpacing: -0.2,
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
  emeraldBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  emeraldBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
});
