import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface AiAgentHomeCardProps {
  businessName?: string;
  onOpenSeoUpdates: () => void;
  onAddPhotos: () => void;
}

/**
 * Top Circular Action Story Bubbles matching Grexa Screenshot 2:
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
 * Active "GBP AI Agent" Checklist Card matching Grexa Benchmark Screenshot 2
 */
export function GbpAiAgentHomeCard({
  businessName = 'Delhi Farm',
  onOpenSeoUpdates,
  onAddPhotos,
}: AiAgentHomeCardProps) {
  const router = useRouter();

  const checklist = [
    {
      id: 'c1',
      title: 'GBP Profile SEO',
      subtitle: '8 Profile SEO updates',
      badge: '⚡ 8 New Updates',
      badgeType: 'purple',
      icon: 'tune' as const,
      iconColor: '#3B82F6',
      iconBg: '#1E293B',
      onPress: onOpenSeoUpdates,
    },
    {
      id: 'c2',
      title: 'GBP Posting Configured',
      subtitle: 'First post will be published in 1 day',
      icon: 'schedule' as const,
      iconColor: '#F59E0B',
      iconBg: '#1E293B',
      onPress: () => router.push('/(tabs)/marketing'),
    },
    {
      id: 'c3',
      title: '0 Photos/Videos Published',
      subtitle: '1 scheduled drip active',
      badge: 'Needs action',
      badgeType: 'red',
      icon: 'photo-library' as const,
      iconColor: '#10B981',
      iconBg: '#1E293B',
      onPress: onAddPhotos,
    },
    {
      id: 'c4',
      title: '0 New Reviews',
      subtitle: 'Replied 100% · 3 review links sent',
      icon: 'star' as const,
      iconColor: '#F59E0B',
      iconBg: '#1E293B',
      onPress: () => router.push('/(tabs)/reviews'),
    },
    {
      id: 'c5',
      title: 'Performance Analysis',
      subtitle: 'Expect results in 3-4 weeks',
      icon: 'bar-chart' as const,
      iconColor: '#3B82F6',
      iconBg: '#1E293B',
      onPress: () => router.push('/(tabs)/growth'),
    },
  ];

  return (
    <View style={styles.card}>
      {/* ── Top Agent Header ── */}
      <View style={styles.agentHeader}>
        <View style={styles.agentInfoRow}>
          <View style={styles.agentAvatarCircle}>
            <MaterialIcons name="smart-toy" size={20} color="#3B82F6" />
          </View>
          <View>
            <Text style={styles.agentTitle}>GBP AI Agent</Text>
            <Text style={styles.agentSub}>Continuously optimizing your local rank</Text>
          </View>
        </View>

        <View style={styles.activePill}>
          <View style={styles.activeDot} />
          <Text style={styles.activePillText}>Active</Text>
        </View>
      </View>

      {/* ── Banner: 1 Photo Left ── */}
      <View style={styles.photoAlertBanner}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.photoAlertTitle}>
            <Text style={{ color: '#EF4444', fontWeight: '800' }}>1 Photo</Text> left
          </Text>
          <Text style={styles.photoAlertSub}>Profile stays fresh &amp; active for 1 more week</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onAddPhotos}
          style={styles.addPhotosMiniBtn}
        >
          <Text style={styles.addPhotosMiniBtnText}>Add Photos</Text>
        </Pressable>
      </View>

      {/* ── Checklist Rows ── */}
      <View style={styles.checklistColumn}>
        {checklist.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.checklistItem,
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.itemIconCircle, { backgroundColor: item.iconBg }]}>
              <MaterialIcons name={item.icon} size={18} color={item.iconColor} />
            </View>

            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.badge ? (
                  <View
                    style={[
                      styles.itemBadge,
                      item.badgeType === 'purple' ? styles.purpleBadge : styles.redBadge,
                    ]}
                  >
                    <Text
                      style={[
                        item.badgeType === 'purple' ? styles.purpleBadgeText : styles.redBadgeText,
                      ]}
                    >
                      {item.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.itemSub}>{item.subtitle}</Text>
            </View>

            <MaterialIcons name="chevron-right" size={18} color="#64748B" />
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
    color: '#0F172A',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
    marginVertical: 4,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  agentAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  agentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  agentSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  photoAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  photoAlertSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  addPhotosMiniBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPhotosMiniBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checklistColumn: {
    gap: 8,
    marginTop: 4,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 10,
  },
  itemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  itemSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  itemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  purpleBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  purpleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C084FC',
  },
  redBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  redBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F87171',
  },
});
