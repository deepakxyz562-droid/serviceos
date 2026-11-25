import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../src/lib/api';
import { uploadFileToStorage, normalizePendingUpload } from '../src/lib/upload';
import { useResource } from '../src/hooks/use-resource';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CampaignPost {
  id: string;
  dayOffset?: number;
  scheduledAt?: string | null;
  content: string;
  mediaUrls?: string[];
  status: string;
  approvalStatus?: string | null;
  publishTargets?: Array<{ platform: string; status: string }>;
  title?: string;
  theme?: string;
}

export default function CampaignPlannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const brandProfile = useResource<{ profile?: { businessName?: string; industry?: string; location?: string } }>('/api/brand-profile');
  const businessName = brandProfile.data?.profile?.businessName || 'Your Business';

  const [posts, setPosts] = useState<CampaignPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaignStageText, setCampaignStageText] = useState('Analyzing Your Business');
  const [campaignProgressPct, setCampaignProgressPct] = useState(10);

  // Modals
  const [selectedPost, setSelectedPost] = useState<CampaignPost | null>(null);
  const [photoSwitcherOpen, setPhotoSwitcherOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Photo Switcher tab & assets
  const [mediaTab, setMediaTab] = useState<'google' | 'uploaded' | 'category' | 'ai'>('google');
  const [googlePhotos, setGooglePhotos] = useState<Array<{ url: string; title: string }>>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ id: string; url: string; title: string }>>([]);
  const [categoryPhotos, setCategoryPhotos] = useState<Array<{ url: string; title: string }>>([]);
  const [aiQuota, setAiQuota] = useState<{ used: number; limit: number; remaining: number; isTrial: boolean }>({
    used: 0,
    limit: 5,
    remaining: 5,
    isTrial: false,
  });
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isGeneratingAiPhoto, setIsGeneratingAiPhoto] = useState(false);

  // Edit Caption
  const [editCaption, setEditCaption] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 1. Fetch Posts
  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiRequest<{ posts: CampaignPost[] }>('/api/social/posts?limit=30');
      if (res && Array.isArray(res.posts)) {
        setPosts(res.posts);
      }
    } catch (err) {
      console.warn('[CampaignPlanner] Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  // 2. Fetch Media Library for Switcher
  const fetchMediaLibrary = useCallback(async () => {
    try {
      setIsLoadingMedia(true);
      const res = await apiRequest<{
        googlePhotos: Array<{ url: string; title: string }>;
        uploadedPhotos: Array<{ id: string; url: string; title: string }>;
        categoryPhotos: Array<{ url: string; title: string }>;
        aiQuota: { used: number; limit: number; remaining: number; isTrial: boolean };
      }>('/api/social/media-library');

      if (res) {
        setGooglePhotos(res.googlePhotos || []);
        setUploadedPhotos(res.uploadedPhotos || []);
        setCategoryPhotos(res.categoryPhotos || []);
        if (res.aiQuota) setAiQuota(res.aiQuota);
      }
    } catch (err) {
      console.warn('[CampaignPlanner] Error fetching media library:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  // 3. 1-Tap Autonomous Async Generation (with instant job ack + status polling)
  const handleGenerateCampaign = async () => {
    try {
      setIsGenerating(true);
      setCampaignStageText('Analyzing Your Business');
      setCampaignProgressPct(10);

      const idempotencyKey = `mobile_camp_${Date.now()}`;
      const res = await apiRequest<{
        success?: boolean;
        async?: boolean;
        jobId?: string;
        status?: string;
        stage?: string;
        progressPct?: number;
        count?: number;
        posts?: CampaignPost[];
        error?: string;
      }>('/api/social/ai-batch-campaign', {
        method: 'POST',
        body: JSON.stringify({ daysCount: 30, idempotencyKey }),
        timeoutMs: 30000,
      });

      let finalCount = res?.count || 0;

      if (res?.async && res?.jobId) {
        const stageLabels: Record<string, string> = {
          analyzing: 'Analyzing Your Business Profile',
          resolving_photos: 'Selecting Google Business Photos',
          generating_copy: 'Crafting 30 Tailored Posts',
          saving: 'Saving 30-Day Schedule',
          completed: 'Campaign Ready',
        };
        const deadline = Date.now() + 90_000;
        let done = false;
        while (!done && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 1500));
          const st = await apiRequest<{
            success?: boolean;
            status: string;
            stage?: string;
            progressPct?: number;
            count?: number;
            error?: string;
          }>(`/api/social/ai-batch-campaign/status?jobId=${encodeURIComponent(res.jobId)}`, {
            timeoutMs: 15000,
          });
          if (st.stage && stageLabels[st.stage]) {
            setCampaignStageText(stageLabels[st.stage]);
          }
          if (typeof st.progressPct === 'number') {
            setCampaignProgressPct(st.progressPct);
          }
          if (st.status === 'completed') {
            finalCount = st.count || 30;
            done = true;
            break;
          }
          if (st.status === 'failed') {
            throw new Error(st.error || 'Could not generate 30-day campaign.');
          }
        }
        if (!done) {
          throw new Error('Campaign generation is taking longer than expected. Check Pending Review shortly.');
        }
      }

      Alert.alert(
        '30-Day Campaign Ready! 🎉',
        `Generated ${finalCount || 30} high-converting posts for ${businessName}. Taking you to Pending Review...`,
        [
          {
            text: 'View Pending Posts',
            onPress: () => {
              router.replace('/(tabs)/marketing?mode=posts&pill=pending');
            },
          },
        ],
      );
      setTimeout(() => {
        router.replace('/(tabs)/marketing?mode=posts&pill=pending');
      }, 1200);
    } catch (err: unknown) {
      Alert.alert('Campaign Creation Failed', err instanceof Error ? err.message : 'Could not generate campaign.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Batch Approve All
  const handleApproveAll = async () => {
    try {
      const res = await apiRequest<{ success: boolean; approvedCount: number }>(
        '/api/social/posts/batch-approve',
        {
          method: 'POST',
          body: JSON.stringify({ approveAll: true }),
        },
      );

      if (res?.success) {
        Alert.alert('Campaign Scheduled!', `All ${res.approvedCount} posts are approved and scheduled.`);
        await fetchPosts();
      }
    } catch (err: unknown) {
      Alert.alert('Approval Error', err instanceof Error ? err.message : 'Could not approve posts.');
    }
  };

  // 5. Open Photo Switcher
  const openPhotoSwitcher = (post: CampaignPost) => {
    setSelectedPost(post);
    setPhotoSwitcherOpen(true);
    void fetchMediaLibrary();
  };

  // 6. Select New Photo
  const handleSelectNewPhoto = async (newUrl: string) => {
    if (!selectedPost || !newUrl) return;

    try {
      await apiRequest(`/api/social/posts/${selectedPost.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ mediaUrls: [newUrl] }),
      });

      setPosts((prev) =>
        prev.map((p) => (p.id === selectedPost.id ? { ...p, mediaUrls: [newUrl] } : p)),
      );
      setPhotoSwitcherOpen(false);
      setSelectedPost(null);
    } catch (err: unknown) {
      Alert.alert('Photo Update Failed', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  // 7. Pick from Camera or Gallery
  const handlePickFromDevice = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Camera Permission Required', 'Please enable camera access.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Gallery Permission Required', 'Please enable photo library access.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const pending = normalizePendingUpload({
          uri: asset.uri,
          name: asset.fileName || 'post_photo.jpg',
          mimeType: asset.mimeType || 'image/jpeg',
          fileSize: asset.fileSize,
        });

        setIsLoadingMedia(true);
        const uploadedUrl = await uploadFileToStorage(pending, { folder: 'campaign-photos' });
        if (uploadedUrl) {
          await handleSelectNewPhoto(uploadedUrl);
        }
      }
    } catch (err: unknown) {
      Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // 8. Generate 1 AI Photo on Demand
  const handleGenerateAiPhoto = async () => {
    if (aiQuota.remaining <= 0) {
      Alert.alert('Daily Limit Reached', 'You have used all 5 AI photo generations today. Quota resets tomorrow at midnight!');
      return;
    }

    try {
      setIsGeneratingAiPhoto(true);
      const res = await apiRequest<{
        success: boolean;
        url: string;
        quota: { used: number; remaining: number };
      }>('/api/social/media-library', {
        method: 'POST',
        body: JSON.stringify({
          title: selectedPost?.title || businessName,
          prompt: selectedPost?.content || '',
        }),
      });

      if (res?.success && res.url) {
        setAiQuota((prev) => ({
          ...prev,
          used: res.quota?.used ?? prev.used + 1,
          remaining: res.quota?.remaining ?? Math.max(0, prev.remaining - 1),
        }));
        await handleSelectNewPhoto(res.url);
      }
    } catch (err: unknown) {
      Alert.alert('AI Generation Failed', err instanceof Error ? err.message : 'Could not generate photo.');
    } finally {
      setIsGeneratingAiPhoto(false);
    }
  };

  // 9. Open Edit Caption Modal
  const openEditModal = (post: CampaignPost) => {
    setSelectedPost(post);
    setEditCaption(post.content || '');
    setEditModalOpen(true);
  };

  // 10. Save Caption
  const handleSaveCaption = async () => {
    if (!selectedPost) return;

    try {
      setIsSavingEdit(true);
      await apiRequest(`/api/social/posts/${selectedPost.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editCaption.trim() }),
      });

      setPosts((prev) =>
        prev.map((p) => (p.id === selectedPost.id ? { ...p, content: editCaption.trim() } : p)),
      );
      setEditModalOpen(false);
      setSelectedPost(null);
    } catch (err: unknown) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Could not update post.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const pendingCount = posts.filter((p) => p.approvalStatus === 'pending').length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Top Header with Back Button ──────────────────────────────────── */}
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle}>30-Day Campaign</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {businessName} • Autonomous Plan
          </Text>
        </View>

        {pendingCount > 0 && !isGenerating && (
          <Pressable style={styles.approveAllHeaderBtn} onPress={handleApproveAll}>
            <MaterialIcons name="check-circle" size={15} color="#FFFFFF" />
            <Text style={styles.approveAllHeaderText}>Approve All ({pendingCount})</Text>
          </Pressable>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* ── Empty State or Generator Trigger Card ──────────────────────── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#009F50" size="large" />
            <Text style={styles.loadingText}>Loading 30-day campaign...</Text>
          </View>
        ) : isGenerating ? (
          <View style={styles.generatingCard}>
            <ActivityIndicator color="#009F50" size="large" />
            <Text style={styles.generatingTitle}>{campaignStageText} ({campaignProgressPct}%)</Text>
            <Text style={styles.generatingSubtitle}>
              BGOS is crafting 30 posts for {businessName} using your Google Business Profile photos, reviews, services, and location...
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="auto-awesome" size={32} color="#009F50" />
            </View>
            <Text style={styles.emptyCardTitle}>Autonomous 30-Day Marketing</Text>
            <Text style={styles.emptyCardSubtitle}>
              We analyze your business, services, and Google reviews to create 30 high-converting posts. You don&apos;t need to write anything.
            </Text>

            <Pressable style={styles.primaryActionButton} onPress={handleGenerateCampaign}>
              <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Generate 30-Day Campaign (1-Tap)</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Status / Regenerate Bar */}
            <View style={styles.statusBar}>
              <View>
                <Text style={styles.statusTitle}>{posts.length} Posts Ready</Text>
                <Text style={styles.statusSubtitle}>
                  {pendingCount === 0 ? 'All 30 posts are scheduled' : `${pendingCount} posts awaiting review`}
                </Text>
              </View>

              <Pressable style={styles.regenerateBtn} onPress={handleGenerateCampaign}>
                <MaterialIcons name="refresh" size={16} color="#009F50" />
                <Text style={styles.regenerateBtnText}>Regenerate</Text>
              </Pressable>
            </View>

            {/* Posts List */}
            {posts.map((post, index) => {
              const mediaUrl =
                post.mediaUrls && post.mediaUrls.length > 0
                  ? post.mediaUrls[0]
                  : googlePhotos[index % Math.max(1, googlePhotos.length)]?.url || '';

              const dateDisplay = post.scheduledAt
                ? new Date(post.scheduledAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : `Day ${index + 1}`;

              const isScheduled = post.status === 'scheduled' || post.approvalStatus === 'approved';

              return (
                <View key={post.id || index} style={styles.postCard}>
                  {/* Card Header: Date & Status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.dateBadge}>
                      <MaterialIcons name="event" size={14} color="#475569" />
                      <Text style={styles.dateBadgeText}>{dateDisplay}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        isScheduled ? styles.statusScheduled : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isScheduled ? styles.statusScheduledText : styles.statusPendingText,
                        ]}
                      >
                        {isScheduled ? 'Scheduled' : 'Pending Review'}
                      </Text>
                    </View>
                  </View>

                  {/* Photo Preview */}
                  <View style={styles.photoContainer}>
                    {mediaUrl ? (
                      <Image source={{ uri: mediaUrl }} style={styles.postPhoto} resizeMode="cover" />
                    ) : (
                      <Pressable
                        onPress={() => openPhotoSwitcher(post)}
                        style={[styles.postPhoto, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}
                      >
                        <MaterialIcons name="add-photo-alternate" size={28} color="#64748B" />
                        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Choose GBP or AI Photo</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Caption */}
                  <Text style={styles.captionText} numberOfLines={3}>
                    {post.content}
                  </Text>

                  {/* Channels */}
                  <View style={styles.channelsRow}>
                    <View style={styles.channelTag}>
                      <Text style={styles.channelTagText}>📍 Google</Text>
                    </View>
                    <View style={styles.channelTag}>
                      <Text style={styles.channelTagText}>📸 Instagram</Text>
                    </View>
                    <View style={styles.channelTag}>
                      <Text style={styles.channelTagText}>📘 Facebook</Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => openPhotoSwitcher(post)}
                    >
                      <MaterialIcons name="photo-camera" size={16} color="#009F50" />
                      <Text style={styles.actionButtonText}>Change Photo</Text>
                    </Pressable>

                    <Pressable
                      style={styles.actionButton}
                      onPress={() => openEditModal(post)}
                    >
                      <MaterialIcons name="edit" size={16} color="#334155" />
                      <Text style={[styles.actionButtonText, { color: '#334155' }]}>Edit Text</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* ── PHOTO SWITCHER MODAL ─────────────────────────────────────────── */}
      <Modal visible={photoSwitcherOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Photo</Text>
              <Pressable onPress={() => setPhotoSwitcherOpen(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={22} color="#475569" />
              </Pressable>
            </View>

            {/* Quick Actions: Camera & Gallery */}
            <View style={styles.deviceActionsRow}>
              <Pressable
                style={styles.deviceActionButton}
                onPress={() => handlePickFromDevice(true)}
              >
                <MaterialIcons name="photo-camera" size={18} color="#009F50" />
                <Text style={styles.deviceActionText}>Camera</Text>
              </Pressable>

              <Pressable
                style={styles.deviceActionButton}
                onPress={() => handlePickFromDevice(false)}
              >
                <MaterialIcons name="photo-library" size={18} color="#009F50" />
                <Text style={styles.deviceActionText}>Gallery</Text>
              </Pressable>
            </View>

            {/* Tabs for Libraries */}
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tabButton, mediaTab === 'google' && styles.tabButtonActive]}
                onPress={() => setMediaTab('google')}
              >
                <Text style={[styles.tabButtonText, mediaTab === 'google' && styles.tabButtonTextActive]}>
                  📍 Google Maps ({googlePhotos.length})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabButton, mediaTab === 'uploaded' && styles.tabButtonActive]}
                onPress={() => setMediaTab('uploaded')}
              >
                <Text style={[styles.tabButtonText, mediaTab === 'uploaded' && styles.tabButtonTextActive]}>
                  📁 Uploaded ({uploadedPhotos.length})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.tabButton, mediaTab === 'ai' && styles.tabButtonActive]}
                onPress={() => setMediaTab('ai')}
              >
                <Text style={[styles.tabButtonText, mediaTab === 'ai' && styles.tabButtonTextActive]}>
                  ✨ AI Photo ({aiQuota.remaining}/5)
                </Text>
              </Pressable>
            </View>

            {/* Content */}
            {isLoadingMedia ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color="#009F50" size="large" />
                <Text style={{ marginTop: 12, color: '#64748B' }}>Loading photos...</Text>
              </View>
            ) : mediaTab === 'ai' ? (
              <View style={styles.aiTabContainer}>
                <MaterialIcons name="auto-awesome" size={36} color="#009F50" />
                <Text style={styles.aiTabTitle}>Generate Fresh AI Photo</Text>
                <Text style={styles.aiTabSubtitle}>
                  Creates a tailored commercial photo for this post.
                </Text>
                <View style={styles.quotaPill}>
                  <Text style={styles.quotaPillText}>
                    {aiQuota.remaining} of 5 daily AI photos remaining
                  </Text>
                </View>

                <Pressable
                  style={[styles.aiGenerateButton, isGeneratingAiPhoto && { opacity: 0.7 }]}
                  onPress={handleGenerateAiPhoto}
                  disabled={isGeneratingAiPhoto || aiQuota.remaining <= 0}
                >
                  {isGeneratingAiPhoto ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.aiGenerateButtonText}>Generate AI Photo</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <ScrollView style={styles.photoGridScroll} contentContainerStyle={styles.photoGrid}>
                {((mediaTab === 'google' ? googlePhotos : uploadedPhotos).length === 0) ? (
                  <View style={{ padding: 30, alignItems: 'center', width: '100%' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center' }}>
                      {mediaTab === 'google'
                        ? 'No Google Business media found. Use Camera or Gallery to add photos!'
                        : 'No uploaded photos yet. Use Camera or Gallery above!'}
                    </Text>
                  </View>
                ) : (
                  (mediaTab === 'google' ? googlePhotos : uploadedPhotos).map((item, idx) => (
                    <Pressable
                      key={idx}
                      style={styles.gridThumbContainer}
                      onPress={() => handleSelectNewPhoto(item.url)}
                    >
                      <Image source={{ uri: item.url }} style={styles.gridThumb} resizeMode="cover" />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── EDIT CAPTION MODAL ────────────────────────────────────────────── */}
      <Modal visible={editModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <Pressable onPress={() => setEditModalOpen(false)} style={styles.closeButton}>
                <MaterialIcons name="close" size={22} color="#475569" />
              </Pressable>
            </View>

            <Text style={styles.editLabel}>Caption:</Text>
            <TextInput
              style={styles.editInput}
              multiline
              value={editCaption}
              onChangeText={setEditCaption}
              placeholder="Write post caption..."
              placeholderTextColor="#94A3B8"
            />

            <Pressable
              style={[styles.primaryActionButton, isSavingEdit && { opacity: 0.7 }]}
              onPress={handleSaveCaption}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryActionText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  approveAllHeaderBtn: {
    backgroundColor: '#009F50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  approveAllHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  generatingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  generatingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
  },
  generatingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 19,
  },
  primaryActionButton: {
    backgroundColor: '#009F50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  regenerateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009F50',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusScheduled: {
    backgroundColor: '#ECFDF5',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusScheduledText: {
    color: '#009F50',
  },
  statusPendingText: {
    color: '#D97706',
  },
  photoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  postPhoto: {
    width: '100%',
    height: '100%',
  },
  captionText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 19,
    marginBottom: 10,
  },
  channelsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  channelTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  channelTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#009F50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  deviceActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  deviceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deviceActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#009F50',
    fontWeight: '700',
  },
  photoGridScroll: {
    maxHeight: 280,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridThumbContainer: {
    width: (SCREEN_WIDTH - 48) / 3,
    height: (SCREEN_WIDTH - 48) / 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  gridThumb: {
    width: '100%',
    height: '100%',
  },
  aiTabContainer: {
    padding: 24,
    alignItems: 'center',
  },
  aiTabTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  aiTabSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  quotaPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  quotaPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  aiGenerateButton: {
    backgroundColor: '#009F50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  aiGenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  editInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
});
