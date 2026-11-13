import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../lib/api';
import { CreateGbpPostModal, type GeneratedPostData } from './create-gbp-post-modal';
import { PostReviewEditModal } from './post-review-edit-modal';

export interface UpcomingPostItem {
  id: string;
  type: string;
  scheduledTime: string;
  headline: string;
  caption: string;
  imageUrl?: string;
  channels: string[];
  status: string;
  ctaAction?: string;
  ctaUrl?: string;
}

interface UpcomingPostsCarouselProps {
  onCreateWithAi?: () => void;
  onViewPost?: (post: UpcomingPostItem) => void;
  businessName?: string;
  businessCategory?: string;
  onPostPublished?: () => void;
}

export function UpcomingPostsCarousel({
  onCreateWithAi,
  onViewPost,
  businessName = 'My Business',
  businessCategory = '',
  onPostPublished,
}: UpcomingPostsCarouselProps) {
  const [posts, setPosts] = useState<UpcomingPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditPost, setSelectedEditPost] = useState<GeneratedPostData | null>(null);

  // Dynamic fallback posts tailored to business
  const fallbackPosts: UpcomingPostItem[] = [
    {
      id: 'up-1',
      type: 'Standard Post',
      scheduledTime: 'Tomorrow, 09:00 AM',
      headline: `Plan the Perfect Multi-Generational Family Reunion at ${businessName}`,
      caption: `Planning a getaway from the city's hustle? At ${businessName}, we offer scenic views, serene open spaces, and premium comfort. Book your weekend retreat today!`,
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      channels: ['googlebusiness'],
      status: 'scheduled',
      ctaAction: 'CALL',
    },
    {
      id: 'up-2',
      type: 'Offer Post',
      scheduledTime: 'In 3 days, 11:30 AM',
      headline: `Exclusive Seasonal Promotion: 20% Off Packages at ${businessName}`,
      caption: `Upgrade your weekdays with our exclusive promotion. Enjoy peaceful luxury, personalized dining, and refreshing outdoor experiences.`,
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
      channels: ['googlebusiness'],
      status: 'scheduled',
      ctaAction: 'GET_OFFER',
    },
    {
      id: 'up-3',
      type: 'Event Post',
      scheduledTime: 'This Saturday, 05:00 PM',
      headline: `Host Your Celebrations & Private Gatherings With Us`,
      caption: `Looking for the perfect venue for family reunions, birthdays, or team celebrations? Discover lush lawns, dedicated hospitality, and unforgettable memories at ${businessName}.`,
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
      channels: ['googlebusiness'],
      status: 'scheduled',
      ctaAction: 'BOOK',
    },
    {
      id: 'up-4',
      type: 'Standard Post',
      scheduledTime: 'Next Monday, 09:00 AM',
      headline: `Fresh Air, Green Lawns & Unmatched Hospitality at ${businessName}`,
      caption: `Take a breath of fresh air. From relaxing poolside afternoons to starry evening bonfires, discover what makes ${businessName} the top-rated local retreat.`,
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
      channels: ['googlebusiness'],
      status: 'scheduled',
      ctaAction: 'LEARN_MORE',
    },
  ];

  const fetchScheduled = async () => {
    try {
      const res = await apiRequest<{ data: any[] }>('/api/social/posts?limit=15');
      if (res?.data && res.data.length > 0) {
        const mapped: UpcomingPostItem[] = res.data.map((p, idx) => ({
          id: p.id || `p-${idx}`,
          type: p.gbpPostType
            ? `${p.gbpPostType.charAt(0).toUpperCase() + p.gbpPostType.slice(1)} Post`
            : 'Standard Post',
          scheduledTime: p.scheduledAt
            ? new Date(p.scheduledAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : `Scheduled Update ${idx + 1}`,
          headline: (p.content || '').split('\n')[0]?.slice(0, 75) || `${businessName} Weekly Update`,
          caption: p.content || '',
          imageUrl: p.mediaUrls?.[0] || fallbackPosts[idx % fallbackPosts.length]?.imageUrl,
          channels: (p.publishTargets || []).map((t: any) => t.platform) || ['googlebusiness'],
          status: p.status || 'scheduled',
          ctaAction: p.gbpCta?.actionType || 'CALL',
          ctaUrl: p.gbpCta?.url || '',
        }));
        setPosts(mapped);
      } else {
        setPosts(fallbackPosts);
      }
    } catch {
      setPosts(fallbackPosts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchScheduled();
  }, [businessName]);

  const activePosts = posts.length > 0 ? posts : fallbackPosts;

  const handleOpenPost = (post: UpcomingPostItem) => {
    if (onViewPost) {
      onViewPost(post);
    } else {
      setSelectedEditPost({
        id: post.id,
        title: post.headline,
        headline: post.headline,
        caption: post.caption,
        imageUrl: post.imageUrl,
        postType: (post.type as any) || 'Standard Post',
        ctaAction: post.ctaAction || 'CALL',
        ctaUrl: post.ctaUrl,
        scheduledTime: post.scheduledTime,
      });
      setEditModalOpen(true);
    }
  };

  const handleStartCreateAi = () => {
    if (onCreateWithAi) {
      onCreateWithAi();
    } else {
      setCreateModalOpen(true);
    }
  };

  const handleAiGenerated = (generated: GeneratedPostData) => {
    // Seamless transition from Generation to Review/Edit Modal
    setSelectedEditPost(generated);
    setEditModalOpen(true);
  };

  return (
    <View style={styles.container}>
      {/* ── Header: Upcoming Posts + Count Badge (Screenshot 1) ── */}
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
              'AI drafts and schedules regular updates for your Google Business Profile to keep your profile active and improve local Google Maps ranking.',
            );
          }}
          hitSlop={8}
        >
          <MaterialIcons name="info-outline" size={18} color="#94A3B8" />
        </Pressable>
      </View>

      {/* ── Informational Notice Banner (Screenshot 1) ── */}
      <View style={styles.infoBanner}>
        <MaterialIcons name="auto-awesome" size={17} color="#7C3AED" style={{ marginRight: 8 }} />
        <Text style={styles.infoBannerText}>
          Posts will be published once our AI finalizes keywords & optimizations
        </Text>
      </View>

      {/* ── Horizontal Scroll View of Post Cards (Benchmark Screenshot 1) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselTrack}
      >
        {activePosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* Top Badge: Standard Post / Offer Post */}
            <View style={styles.badgeRow}>
              <View style={styles.postTypeBadge}>
                <MaterialIcons
                  name={post.type.includes('Offer') ? 'local-offer' : post.type.includes('Event') ? 'event' : 'article'}
                  size={12}
                  color="#92400E"
                />
                <Text style={styles.postTypeBadgeText}>{post.type}</Text>
              </View>
            </View>

            {/* Large Rich Image (Screenshot 1) */}
            {post.imageUrl ? (
              <Image source={{ uri: post.imageUrl }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderCardImage}>
                <MaterialIcons name="image" size={32} color="#CBD5E1" />
              </View>
            )}

            {/* Headline */}
            <Text style={styles.postHeadline} numberOfLines={2}>
              {post.headline}
            </Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* View Post Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View post ${post.headline}`}
              onPress={() => handleOpenPost(post)}
              style={({ pressed }) => [styles.viewPostBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.viewPostText}>View Post</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {/* ── Prominent Action Button: ✨ Create Post with AI (Screenshot 1) ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create Post with AI"
        onPress={handleStartCreateAi}
        style={({ pressed }) => [
          styles.createAiButton,
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
      >
        <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.createAiButtonText}>Create Post with AI</Text>
      </Pressable>

      {/* ── Create Post for GBP with AI Modal (Screenshot 2) ── */}
      <CreateGbpPostModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onPostGenerated={handleAiGenerated}
        businessName={businessName}
        businessCategory={businessCategory}
      />

      {/* ── Review & Dual-Edit Post Modal ── */}
      <PostReviewEditModal
        visible={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedEditPost(null);
        }}
        post={selectedEditPost}
        businessName={businessName}
        onPublished={() => {
          void fetchScheduled();
          if (onPostPublished) onPostPublished();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 20,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  carouselTrack: {
    paddingVertical: 4,
    gap: 14,
  },
  postCard: {
    width: 270,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeRow: {
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  postTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  postTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  cardImage: {
    width: '100%',
    height: 175,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  placeholderCardImage: {
    width: '100%',
    height: 175,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  postHeadline: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
    minHeight: 40,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
  viewPostBtn: {
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPostText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  createAiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    marginTop: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  createAiButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
