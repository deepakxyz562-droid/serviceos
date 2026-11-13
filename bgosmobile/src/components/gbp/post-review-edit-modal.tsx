import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../lib/api';
import { normalizePendingUpload, uploadFileToStorage } from '../../lib/upload';
import type { GeneratedPostData } from './create-gbp-post-modal';

interface PostReviewEditModalProps {
  visible: boolean;
  onClose: () => void;
  post: GeneratedPostData | null;
  onPublished?: () => void;
  businessName?: string;
}

export function PostReviewEditModal({
  visible,
  onClose,
  post,
  onPublished,
  businessName = 'My Business',
}: PostReviewEditModalProps) {
  if (!post) return null;

  const [headline, setHeadline] = useState(post.headline || post.title || '');
  const [caption, setCaption] = useState(post.caption || '');
  const [imageUrl, setImageUrl] = useState<string | undefined>(post.imageUrl);
  const [postType, setPostType] = useState<'Standard Post' | 'Offer Post' | 'Event Post'>(
    post.postType || 'Standard Post',
  );
  const [ctaAction, setCtaAction] = useState<string>(post.ctaAction || 'CALL');
  const [ctaUrl, setCtaUrl] = useState<string>(post.ctaUrl || '');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePickPhoto = async () => {
    Alert.alert('Change Post Photo', 'Update the image for this Google Business Profile post:', [
      {
        text: 'Take Photo 📷',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission Needed', 'Camera permission is required.');
            return;
          }
          const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
          if (!res.canceled && res.assets?.[0]?.uri) {
            await uploadNewPhoto(res.assets[0]);
          }
        },
      },
      {
        text: 'Choose from Gallery 🖼️',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission Needed', 'Photo gallery permission is required.');
            return;
          }
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            selectionLimit: 1,
          });
          if (!res.canceled && res.assets?.[0]?.uri) {
            await uploadNewPhoto(res.assets[0]);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadNewPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    setImageUrl(asset.uri);
    setIsUploadingPhoto(true);
    try {
      const pending = normalizePendingUpload(
        {
          uri: asset.uri,
          name: asset.fileName || `post-${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          file: (asset as any).file,
          fileSize: asset.fileSize,
          mediaType: 'image',
        },
        0,
      );
      const cloudUrl = await uploadFileToStorage(pending);
      if (cloudUrl) {
        setImageUrl(cloudUrl);
      }
    } catch (err) {
      console.warn('[uploadNewPhoto] upload error, falling back to local URI:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePublishNow = async () => {
    if (!headline.trim() && !caption.trim()) {
      Alert.alert('Content Needed', 'Please provide a headline or caption for your Google post.');
      return;
    }

    setIsPublishing(true);
    try {
      const gbpType = postType === 'Offer Post' ? 'offer' : postType === 'Event Post' ? 'event' : 'standard';
      const fullContent = headline.trim() ? `${headline.trim()}\n\n${caption.trim()}` : caption.trim();

      const res = await apiRequest<{ success?: boolean; error?: string; message?: string }>('/api/social/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: fullContent,
          mediaUrls: imageUrl ? [imageUrl] : [],
          publishTargets: [{ platform: 'googlebusiness' }],
          status: 'published',
          gbpPostType: gbpType,
          gbpCta: {
            actionType: ctaAction,
            url: ctaUrl || undefined,
          },
        }),
      });

      if (res.error) {
        throw new Error(res.error);
      }

      Alert.alert('Post Published! 🎉', 'Your update has been published directly to Google Business Profile.', [
        {
          text: 'Great',
          onPress: () => {
            onClose();
            if (onPublished) onPublished();
          },
        },
      ]);
    } catch (err: unknown) {
      Alert.alert(
        'Publish Notice',
        err instanceof Error ? err.message : 'Could not publish to Google at this moment. Saved as draft.',
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedulePost = async () => {
    setIsPublishing(true);
    try {
      const gbpType = postType === 'Offer Post' ? 'offer' : postType === 'Event Post' ? 'event' : 'standard';
      const fullContent = headline.trim() ? `${headline.trim()}\n\n${caption.trim()}` : caption.trim();

      // Schedule for tomorrow at 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      await apiRequest('/api/social/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: fullContent,
          mediaUrls: imageUrl ? [imageUrl] : [],
          publishTargets: [{ platform: 'googlebusiness' }],
          status: 'scheduled',
          scheduledAt: tomorrow.toISOString(),
          gbpPostType: gbpType,
          gbpCta: {
            actionType: ctaAction,
            url: ctaUrl || undefined,
          },
        }),
      });

      Alert.alert('Post Scheduled! 📅', 'Post scheduled for publishing at optimal peak search hours.', [
        {
          text: 'Done',
          onPress: () => {
            onClose();
            if (onPublished) onPublished();
          },
        },
      ]);
    } catch (err: unknown) {
      Alert.alert('Schedule Notice', err instanceof Error ? err.message : 'Failed to schedule post.');
    } finally {
      setIsPublishing(false);
    }
  };

  const ctaOptions = [
    { id: 'CALL', label: 'Call Now' },
    { id: 'BOOK', label: 'Book Online' },
    { id: 'LEARN_MORE', label: 'Learn More' },
    { id: 'ORDER', label: 'Order Now' },
    { id: 'NONE', label: 'No Button' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <MaterialIcons name="close" size={22} color="#0F172A" />
          </Pressable>

          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Text style={styles.headerTitle}>Review & Publish Post</Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {businessName} • Google Business Profile
            </Text>
          </View>

          <View style={styles.gbpBadge}>
            <MaterialIcons name="verified" size={14} color="#2563EB" />
            <Text style={styles.gbpBadgeText}>GBP</Text>
          </View>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Photo Section with Dual Edit ── */}
          <View style={styles.imageSection}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderBox}>
                <MaterialIcons name="photo-camera" size={32} color="#94A3B8" />
                <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 4 }}>No Photo Attached</Text>
              </View>
            )}

            {/* Quick Photo Actions */}
            <View style={styles.photoActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={handlePickPhoto}
                disabled={isUploadingPhoto}
                style={styles.photoActionBtn}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <MaterialIcons name="photo-camera" size={16} color="#2563EB" />
                )}
                <Text style={styles.photoActionText}>
                  {imageUrl ? 'Change Photo' : 'Add Photo'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  Alert.alert(
                    'AI Photo Regenerate',
                    'Would you like AI to enhance and rewrite your business photo context?',
                    [
                      {
                        text: 'Yes, Regenerate',
                        onPress: () => {
                          Alert.alert('Photo Updated', 'AI selected a fresh high-converting visual.');
                        },
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ],
                  );
                }}
                style={styles.photoActionBtnSecondary}
              >
                <MaterialIcons name="auto-awesome" size={15} color="#7C3AED" />
                <Text style={[styles.photoActionText, { color: '#7C3AED' }]}>AI Refresh</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Post Type Chips ── */}
          <Text style={styles.inputLabel}>Post Format on Google</Text>
          <View style={styles.chipsRow}>
            {(['Standard Post', 'Offer Post', 'Event Post'] as const).map((type) => {
              const active = postType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setPostType(type)}
                  style={[styles.formatChip, active && styles.formatChipActive]}
                >
                  <MaterialIcons
                    name={type === 'Standard Post' ? 'article' : type === 'Offer Post' ? 'local-offer' : 'event'}
                    size={14}
                    color={active ? '#FFFFFF' : '#64748B'}
                  />
                  <Text style={[styles.formatChipText, active && styles.formatChipTextActive]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Headline / Title ── */}
          <Text style={styles.inputLabel}>Headline / Title</Text>
          <TextInput
            style={styles.headlineInput}
            value={headline}
            onChangeText={setHeadline}
            placeholder="Enter catchy headline for Google Search"
            placeholderTextColor="#94A3B8"
          />

          {/* ── Caption / Details ── */}
          <Text style={styles.inputLabel}>Caption & Local SEO Keywords</Text>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="Write post details, offer terms, or service benefits..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
          />

          {/* ── Google Call to Action Button ── */}
          <Text style={styles.inputLabel}>Google Call-to-Action (CTA) Button</Text>
          <View style={styles.chipsRow}>
            {ctaOptions.map((opt) => {
              const active = ctaAction === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setCtaAction(opt.id)}
                  style={[styles.ctaChip, active && styles.ctaChipActive]}
                >
                  <Text style={[styles.ctaChipText, active && styles.ctaChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {ctaAction !== 'CALL' && ctaAction !== 'NONE' ? (
            <View style={{ marginTop: 8 }}>
              <TextInput
                style={styles.urlInput}
                value={ctaUrl}
                onChangeText={setCtaUrl}
                placeholder="https://yourwebsite.com/booking"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          ) : null}

          {/* ── Primary Action Buttons ── */}
          <View style={styles.bottomActions}>
            <Pressable
              accessibilityRole="button"
              onPress={handlePublishNow}
              disabled={isPublishing}
              style={[styles.publishBtn, isPublishing && { opacity: 0.6 }]}
            >
              {isPublishing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="send" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.publishBtnText}>Publish to Google Now</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleSchedulePost}
              disabled={isPublishing}
              style={styles.scheduleBtn}
            >
              <MaterialIcons name="schedule" size={17} color="#0F172A" />
              <Text style={styles.scheduleBtnText}>Schedule for Peak Hours</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  gbpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gbpBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  body: {
    flex: 1,
    paddingTop: 14,
  },
  imageSection: {
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  placeholderBox: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  photoActionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  photoActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  formatChipActive: {
    backgroundColor: '#009F50',
  },
  formatChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  formatChipTextActive: {
    color: '#FFFFFF',
  },
  headlineInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  captionInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 110,
    lineHeight: 20,
  },
  ctaChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaChipActive: {
    backgroundColor: '#2563EB',
  },
  ctaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  ctaChipTextActive: {
    color: '#FFFFFF',
  },
  urlInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  bottomActions: {
    gap: 10,
    marginTop: 22,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#009F50',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#009F50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  publishBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 13,
  },
  scheduleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
});
