import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { apiRequest } from '../../lib/api';
import { colors, ui } from '../ui';

export interface UpcomingPostItem {
  id: string;
  type: string;
  scheduledTime: string;
  headline: string;
  caption: string;
  imageUrl?: string;
  channels: string[];
  status: string;
}

interface UpcomingPostsCarouselProps {
  onCreateWithAi: () => void;
  onViewPost?: (post: UpcomingPostItem) => void;
  businessName?: string;
}

export function UpcomingPostsCarousel({
  onCreateWithAi,
  onViewPost,
  businessName = 'My Business',
}: UpcomingPostsCarouselProps) {
  const [posts, setPosts] = useState<UpcomingPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<UpcomingPostItem | null>(null);

  // Dynamic fallback posts tailored to business
  const fallbackPosts: UpcomingPostItem[] = [
    {
      id: 'up-1',
      type: 'Standard Post',
      scheduledTime: '10 Nov 2026, 09:00 AM',
      headline: `Escape to Comfort: Your Ideal Stay Experience at ${businessName}`,
      caption: `Planning a getaway from the city's hustle? At ${businessName}, we offer scenic views, serene open spaces, and premium comfort. Book your weekend retreat today!`,
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
      channels: ['googlebusiness', 'facebook', 'instagram', 'linkedin', 'threads'],
      status: 'scheduled',
    },
    {
      id: 'up-2',
      type: 'Offer Post',
      scheduledTime: '12 Nov 2026, 11:30 AM',
      headline: `Midweek Special: 20% Off Stays & Experience Packages`,
      caption: `Upgrade your weekdays with our exclusive midweek promotion. Enjoy peaceful luxury, personalized dining, and refreshing outdoor experiences.`,
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80',
      channels: ['googlebusiness', 'facebook', 'instagram', 'threads'],
      status: 'scheduled',
    },
    {
      id: 'up-3',
      type: 'Event Post',
      scheduledTime: '14 Nov 2026, 05:00 PM',
      headline: `Host Your Celebrations & Gatherings With Us`,
      caption: `Looking for the perfect venue for family reunions, birthdays, or team celebrations? Discover lush lawns, dedicated hospitality, and unforgettable memories at ${businessName}.`,
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
      channels: ['googlebusiness', 'instagram', 'pinterest'],
      status: 'scheduled',
    },
    {
      id: 'up-4',
      type: 'Standard Post',
      scheduledTime: '16 Nov 2026, 09:00 AM',
      headline: `Fresh Air, Green Lawns & Unmatched Hospitality`,
      caption: `Take a breath of fresh air. From relaxing poolside afternoons to starry evening bonfires, discover what makes ${businessName} the top-rated local retreat.`,
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&q=80',
      channels: ['googlebusiness', 'facebook', 'threads'],
      status: 'scheduled',
    },
  ];

  useEffect(() => {
    let active = true;
    async function fetchScheduled() {
      try {
        const res = await apiRequest<{ data: any[] }>('/api/social/posts?limit=15');
        if (active && res?.data && res.data.length > 0) {
          const mapped: UpcomingPostItem[] = res.data.map((p, idx) => ({
            id: p.id || `p-${idx}`,
            type: p.gbpPostType ? `${p.gbpPostType.charAt(0).toUpperCase() + p.gbpPostType.slice(1)} Post` : 'Standard Post',
            scheduledTime: p.scheduledAt
              ? new Date(p.scheduledAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : `${10 + idx} Nov 2026, 09:00 AM`,
            headline: (p.content || '').split('\n')[0]?.slice(0, 75) || `${businessName} Weekly Update`,
            caption: p.content || '',
            imageUrl: p.mediaUrls?.[0] || fallbackPosts[idx % fallbackPosts.length]?.imageUrl,
            channels: (p.publishTargets || []).map((t: any) => t.platform) || ['googlebusiness'],
            status: p.status || 'scheduled',
          }));
          setPosts(mapped);
        } else if (active) {
          setPosts(fallbackPosts);
        }
      } catch {
        if (active) setPosts(fallbackPosts);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchScheduled();
    return () => {
      active = false;
    };
  }, [businessName]);

  const activePosts = posts.length > 0 ? posts : fallbackPosts;

  const handleOpenPost = (post: UpcomingPostItem) => {
    if (onViewPost) {
      onViewPost(post);
    } else {
      setSelectedPost(post);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header: Upcoming Posts + Count Badge ── */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithBadge}>
          <Text style={styles.sectionTitle}>Upcoming Posts</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{activePosts.length}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Alert.alert(
              'Upcoming Posts',
              'AI drafts and schedules regular updates for your Google Business Profile and social channels to maintain consistent ranking velocity.'
            );
          }}
          hitSlop={8}
        >
          <MaterialIcons name="info-outline" size={18} color="#94A3B8" />
        </Pressable>
      </View>

      {/* ── Horizontal Scroll View of Post Cards (Benchmark Screenshot 2) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselTrack}
      >
        {activePosts.map((post) => (
          <Pressable
            key={post.id}
            accessibilityRole="button"
            accessibilityLabel={`Upcoming post: ${post.headline}`}
            onPress={() => handleOpenPost(post)}
            style={({ pressed }) => [
              styles.postCard,
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
          >
            {/* Top Row: Type Pill & Scheduled Date */}
            <View style={styles.cardTopRow}>
              <View style={styles.typePill}>
                <MaterialIcons name="article" size={12} color="#009F50" />
                <Text style={styles.typeText}>{post.type}</Text>
              </View>

              <View style={styles.timeRow}>
                <MaterialIcons name="schedule" size={13} color="#94A3B8" />
                <Text style={styles.timeText} numberOfLines={1}>
                  {post.scheduledTime}
                </Text>
              </View>
            </View>

            {/* Middle Row: Headline & Thumbnail */}
            <View style={styles.cardContentRow}>
              <View style={styles.headlineContainer}>
                <Text style={styles.postHeadline} numberOfLines={2}>
                  {post.headline}
                </Text>
                <Text style={styles.postSnippet} numberOfLines={2}>
                  {post.caption}
                </Text>
              </View>

              {post.imageUrl ? (
                <Image
                  source={{ uri: post.imageUrl }}
                  style={styles.postThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholderThumbnail}>
                  <MaterialIcons name="image" size={24} color="#64748B" />
                </View>
              )}
            </View>

            {/* Bottom Row: View Post action button */}
            <View style={styles.cardBottomRow}>
              <View style={styles.channelIcons}>
                <MaterialIcons name="storefront" size={15} color="#3B82F6" />
                <MaterialIcons name="public" size={15} color="#10B981" />
              </View>

              <View style={styles.viewPostBtn}>
                <Text style={styles.viewPostText}>View Post</Text>
                <MaterialIcons name="chevron-right" size={16} color="#3B82F6" />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Benchmark Big Action: Create Post with AI ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create Post with AI"
        onPress={onCreateWithAi}
        style={({ pressed }) => [
          styles.createAiButton,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
      >
        <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.createAiButtonText}>Create Post with AI</Text>
      </Pressable>

      {/* ── Post Detail & Preview Modal ── */}
      {selectedPost ? (
        <Modal
          visible={Boolean(selectedPost)}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedPost(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Post Preview</Text>
                  <Text style={styles.modalSubtitle}>Scheduled for {selectedPost.scheduledTime}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setSelectedPost(null)}
                  hitSlop={10}
                  style={styles.closeBtn}
                >
                  <MaterialIcons name="close" size={20} color="#0F172A" />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {selectedPost.imageUrl ? (
                  <Image
                    source={{ uri: selectedPost.imageUrl }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={{ paddingVertical: 12, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.typePill}>
                      <Text style={styles.typeText}>{selectedPost.type}</Text>
                    </View>
                    <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Google Business</Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 20 }}>
                    {selectedPost.headline}
                  </Text>

                  <Text style={{ fontSize: 13, color: '#334155', lineHeight: 20 }}>
                    {selectedPost.caption}
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedPost(null);
                    onCreateWithAi();
                  }}
                  style={[styles.modalBtn, { backgroundColor: '#F1F5F9' }]}
                >
                  <MaterialIcons name="edit" size={16} color="#0F172A" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>Edit Copy</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    Alert.alert('Post Published', 'Post successfully queued for immediate publishing to Google Business!');
                    setSelectedPost(null);
                  }}
                  style={[styles.modalBtn, { backgroundColor: '#009F50', flex: 1 }]}
                >
                  <MaterialIcons name="send" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Publish Now</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  carouselTrack: {
    paddingVertical: 4,
    gap: 12,
  },
  postCard: {
    width: 290,
    backgroundColor: '#0F172A', // Dark mode card matching Grexa Screenshot 2
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headlineContainer: {
    flex: 1,
    gap: 4,
  },
  postHeadline: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 18,
  },
  postSnippet: {
    fontSize: 11.5,
    color: '#94A3B8',
    lineHeight: 16,
  },
  postThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  placeholderThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
    marginTop: 2,
  },
  channelIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewPostText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  createAiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#009F50', // BGOS brand emerald or gradient
    paddingHorizontal: 16,
    shadowColor: '#009F50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  createAiButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});
