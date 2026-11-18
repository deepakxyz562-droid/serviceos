import React, { useEffect, useMemo, useState } from 'react';
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
  defaultWebsiteUrl?: string;
  onPostPublished?: () => void;
  refreshTrigger?: number;
  deletedPostIds?: string[];
  onDeletePost?: (postId: string) => void;
}

export function UpcomingPostsCarousel({
  onCreateWithAi,
  onViewPost,
  businessName = 'My Business',
  businessCategory = '',
  defaultWebsiteUrl = '',
  onPostPublished,
  refreshTrigger,
  deletedPostIds = [],
  onDeletePost,
}: UpcomingPostsCarouselProps) {
  const [posts, setPosts] = useState<UpcomingPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditPost, setSelectedEditPost] = useState<GeneratedPostData | null>(null);

  const isTech = /software|it|tech|comput|web|app/i.test(businessCategory);
  const isFarmStay = /resort|farm|hotel|stay|villa|pool/i.test(businessCategory);

  // Dynamic fallback posts tailored to business with rich 5-bullet GBP viral copywriting
  const fallbackPosts: UpcomingPostItem[] = useMemo(() => {
    if (isFarmStay) {
      return [
        {
          id: 'up-1',
          type: 'Standard Post',
          scheduledTime: 'Tomorrow, 09:00 AM',
          headline: 'How clean pool facilities enhance guest comfort and trust',
          caption: `A refreshing swim feels better when the surroundings are clean, comfortable and welcoming. For families looking for a farmhouse with swimming pool or a swimming pool near Kanvi, ${businessName} puts the focus on what matters: a relaxing setting where guest comfort comes first.

✓ A welcoming first impression: Clean pool surroundings help guests feel more at ease from the moment they arrive.
✓ Comfort beyond the water: Tidy spaces around the swimming pool make time spent relaxing with family feel more enjoyable.
✓ Confidence through care: Attention to pool facilities shows guests that their experience matters, helping build trust over time.
✓ A better family outing: Well-kept surroundings let everyone enjoy the atmosphere without unnecessary distractions.
✓ More memorable downtime: A cared-for pool setting adds to the pleasure of a farmhouse visit, whether you come to swim or simply unwind.

Choosing a nearby pool is about more than distance. The condition of the facilities and the care given to shared spaces can make a meaningful difference to your visit.

Call ${businessName} in Kanvi to ask about pool access and plan a comfortable, refreshing outing with your family.

CTA: CALL`,
          imageUrl: 'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/salon_spa/salon_spa-001.webp',
          channels: ['googlebusiness'],
          status: 'scheduled',
          ctaAction: 'CALL',
        },
        {
          id: 'up-2',
          type: 'Offer Post',
          scheduledTime: 'In 3 days, 11:30 AM',
          headline: `Exclusive Seasonal Promotion: 20% Off Weekend Packages at ${businessName}`,
          caption: `Planning a memorable family getaway or a refreshing weekend escape? At ${businessName}, we offer private serene cottages, lush green surroundings, and full farm amenities tailored for quality relaxation.

✓ Peaceful rural ambiance: Enjoy calm scenic nature away from bustling city traffic and noise.
✓ Clean private accommodations: Comfortable, sanitized farm rooms and cozy family cottages.
✓ Private lawn & pool access: Ample outdoor spaces for games, family gatherings, and evening barbecues.
✓ Fresh authentic meals: Wholesome local culinary preparations prepared with fresh ingredients.
✓ Seamless early bookings: Dedicated host coordination and flexible booking slots for group visits.

Make the most of the season with our limited-time special offer. Quality family moments start with a tranquil setting designed for your complete comfort.

Call ${businessName} today to lock in your 20% discounted seasonal rate and confirm availability.

CTA: BOOK`,
          imageUrl: 'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/restaurant_dining/restaurant_dining-001.webp',
          channels: ['googlebusiness'],
          status: 'scheduled',
          ctaAction: 'BOOK',
        },
      ];
    }
    if (isTech) {
      return [
        {
          id: 'up-1',
          type: 'Standard Post',
          scheduledTime: 'Tomorrow, 09:00 AM',
          headline: `Smart IT Support & Scalable Solutions for Growing Businesses`,
          caption: `Looking to automate operations and secure your cloud infrastructure? At ${businessName}, our dedicated technology specialists deliver reliable end-to-end digital engineering built for high-performance organizations.

✓ Proactive system monitoring: Prevent downtime with 24/7 continuous health checks and immediate issue resolution.
✓ Tailored cloud integration: Seamless migration to scalable AWS, Google Cloud, and enterprise database systems.
✓ Enterprise-grade security: Safeguard sensitive customer records with modern encryption and access governance.
✓ Rapid response SLA: Dedicated support channels ensuring your mission-critical tools run smoothly without delays.
✓ Scalable architectural design: Software built to grow seamlessly as your active transaction volume expands.

Choosing the right technology partner drives sustainable business advantage. Our engineers ensure your systems remain dependable, fast, and secure.

Call ${businessName} today to discuss your technical roadmap and receive a personalized technology consultation.

CTA: CALL`,
          imageUrl: 'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-001.webp',
          channels: ['googlebusiness'],
          status: 'scheduled',
          ctaAction: 'CALL',
        },
        {
          id: 'up-2',
          type: 'Offer Post',
          scheduledTime: 'In 3 days, 11:30 AM',
          headline: `Exclusive Seasonal Promotion: Full Digital & Software Audit at ${businessName}`,
          caption: `Is legacy software or slow infrastructure holding back your business efficiency? Partner with ${businessName} for a comprehensive digital health check and actionable system optimization.

✓ Comprehensive code review: Pinpoint performance bottlenecks and security vulnerabilities across your stack.
✓ Workflow automation insights: Eliminate repetitive manual tasks with custom API integrations and automated pipelines.
✓ Database query optimization: Accelerate page load times and data processing by up to 50%.
✓ Mobile-ready compliance: Ensure your web and mobile applications provide flawless customer experiences on all devices.
✓ Clear cost reduction roadmap: Identify redundant cloud licenses and optimize your monthly operational expenses.

Take advantage of our exclusive seasonal promotion to modernize your digital assets with expert engineering guidance.

Call ${businessName} today to claim your software audit and explore custom digital solutions for your team.

CTA: CALL`,
          imageUrl: 'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-002.webp',
          channels: ['googlebusiness'],
          status: 'scheduled',
          ctaAction: 'CALL',
        },
      ];
    }
    return [
      {
        id: 'up-1',
        type: 'Standard Post',
        scheduledTime: 'Tomorrow, 09:00 AM',
        headline: `Trusted Quality & Certified Excellence You Can Rely On at ${businessName}`,
        caption: `When choosing a local service partner, dependability, transparent communication, and genuine attention to detail make all the difference. At ${businessName}, we take pride in delivering five-star customer care tailored to your exact needs.

✓ Certified local expertise: Experienced professionals dedicated to consistent, high-standard workmanship.
✓ Transparent upfront quotes: Clear pricing with no hidden charges or unexpected surprises at completion.
✓ Prompt flexible scheduling: Convenient appointment windows designed to fit around your busy routine.
✓ Premium guaranteed materials: We use only verified, durable components to ensure long-lasting results.
✓ Dedicated after-service support: Responsive follow-ups and verified satisfaction on every single job.

Local customer trust is earned through consistent quality and honest service. Experience why our clients rate us 5 stars on Google.

Call ${businessName} today to check our availability, ask questions, or request an instant quote.

CTA: CALL`,
        imageUrl: 'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-001.webp',
        channels: ['googlebusiness'],
        status: 'scheduled',
        ctaAction: 'CALL',
      },
      {
        id: 'up-2',
        type: 'Offer Post',
        scheduledTime: 'In 3 days, 11:30 AM',
        headline: `Special Seasonal Offer: Get Started With ${businessName} Today`,
        caption: `Upgrade your experience with our limited-time seasonal service package. At ${businessName}, our team is ready to deliver premium results and unmatched local convenience.

✓ Exclusive seasonal pricing: Significant savings on our most popular, high-demand local service packages.
✓ Priority booking slots: Fast-track scheduling with guaranteed early arrival for our valued clients.
✓ Comprehensive service guarantee: 100% satisfaction assurance backed by our experienced local team.
✓ Customized service scope: Tailored specifically to your timeline, requirements, and budget preferences.
✓ Complimentary consultation: Expert assessment and professional recommendations before starting any work.

Don't miss out on this limited-time opportunity to get superior local service at special promotional rates.

Call ${businessName} today to book your session and claim this exclusive seasonal promotion.

CTA: CALL`,
        imageUrl: 'https://serviceos-assets-prod.s3.ap-south-1.amazonaws.com/bgos-business-images/category_library/it_software/it_software-002.webp',
        channels: ['googlebusiness'],
        status: 'scheduled',
        ctaAction: 'CALL',
      },
    ];
  }, [businessName, businessCategory, isTech, isFarmStay]);

  const fetchScheduled = async () => {
    try {
      const res = await apiRequest<{ data: any[] }>('/api/social/posts?limit=15');
      if (res?.data && res.data.length > 0) {
        const mapped: UpcomingPostItem[] = res.data
          .filter((p) => p.status !== 'cancelled')
          .map((p, idx) => ({
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
  }, [businessName, refreshTrigger]);

  const effectiveDeletedIds = useMemo(() => {
    return new Set([...dismissedIds, ...(deletedPostIds || [])]);
  }, [dismissedIds, deletedPostIds]);

  const activePosts = useMemo(() => {
    const source = posts.length > 0 ? posts : fallbackPosts;
    return source.filter((p) => !effectiveDeletedIds.has(p.id));
  }, [posts, fallbackPosts, effectiveDeletedIds]);

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
          <Pressable
            key={post.id}
            accessibilityRole="button"
            accessibilityLabel={`Open post: ${post.headline}`}
            onPress={() => handleOpenPost(post)}
            style={({ pressed }) => [
              styles.postCard,
              pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
          >
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
            <View style={styles.viewPostBtn}>
              <Text style={styles.viewPostText}>View Post</Text>
            </View>
          </Pressable>
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
        defaultWebsiteUrl={defaultWebsiteUrl}
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
