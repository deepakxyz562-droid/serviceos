import React, { useMemo, useState } from 'react';
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

export interface GeneratedPostData {
  id?: string;
  title: string;
  headline: string;
  caption: string;
  imageUrl?: string;
  postType: 'Standard Post' | 'Offer Post' | 'Event Post';
  ctaAction?: string;
  ctaUrl?: string;
  scheduledTime?: string;
}

interface CreateGbpPostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostGenerated: (post: GeneratedPostData) => void;
  businessName?: string;
  businessCategory?: string;
}

export function CreateGbpPostModal({
  visible,
  onClose,
  onPostGenerated,
  businessName = 'My Business',
  businessCategory = '',
}: CreateGbpPostModalProps) {
  const [prompt, setPrompt] = useState('');
  const [referenceImageUri, setReferenceImageUri] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Dynamic inspiration chips tailored to the merchant's business context
  const inspirationIdeas = useMemo(() => {
    const cat = (businessCategory + ' ' + businessName).toLowerCase();

    if (
      cat.includes('farm') ||
      cat.includes('pool') ||
      cat.includes('resort') ||
      cat.includes('stay') ||
      cat.includes('villa')
    ) {
      return [
        'Perfect venue for your next family pool party',
        'Create unforgettable memories at our private farmhouse pool',
        'Weekend getaway destination near Delhi with swimming',
        'Safe and fun swimming for kids of all ages',
      ];
    }

    if (
      cat.includes('salon') ||
      cat.includes('spa') ||
      cat.includes('beauty') ||
      cat.includes('hair')
    ) {
      return [
        'Weekend relaxation: Treat yourself to our signature massage',
        'Special 20% off all hair styling & treatments this Thursday',
        'Bridal glow packages now open for booking',
        'Expert skin care routines tailored for you',
      ];
    }

    if (
      cat.includes('restaurant') ||
      cat.includes('cafe') ||
      cat.includes('food') ||
      cat.includes('dine')
    ) {
      return [
        'Weekend chef special: Freshly crafted seasonal delicacies',
        'Reserve your table for tonight’s family dinner experience',
        'Midweek lunch combo with complimentary refreshing beverages',
        'Celebrate your special celebrations with our private dining',
      ];
    }

    if (
      cat.includes('car') ||
      cat.includes('auto') ||
      cat.includes('mechanic') ||
      cat.includes('repair')
    ) {
      return [
        'Complete multi-point vehicle inspection before your road trip',
        'Fast turnaround oil change & brake service by certified pros',
        'Special seasonal maintenance package for worry-free driving',
        'Genuine parts, transparent pricing, and 100% satisfaction guaranteed',
      ];
    }

    // Default universal high-converting GBP ideas
    return [
      `Discover why local customers rate ${businessName} 5 stars on Google`,
      'Exclusive limited-time offer for our valued local community',
      'Behind the scenes: Dedicated craftsmanship and authentic care',
      'Book your appointment early to secure your preferred weekend slot',
    ];
  }, [businessName, businessCategory]);

  const handlePickReferenceImage = async () => {
    Alert.alert(
      'Add Reference Photo',
      'Add a real photo of your business space, service, or product for best AI post results.',
      [
        {
          text: 'Take Photo 📷',
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission Needed', 'Please allow camera access to take a photo.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              quality: 0.85,
            });
            if (!res.canceled && res.assets?.[0]?.uri) {
              await processPickedImage(res.assets[0]);
            }
          },
        },
        {
          text: 'Choose from Gallery 🖼️',
          onPress: async () => {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
              Alert.alert('Permission Needed', 'Please allow photo gallery access.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.85,
              selectionLimit: 1,
            });
            if (!res.canceled && res.assets?.[0]?.uri) {
              await processPickedImage(res.assets[0]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const processPickedImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setReferenceImageUri(asset.uri);
    setUploadingImage(true);
    try {
      const pending = normalizePendingUpload(
        {
          uri: asset.uri,
          name: asset.fileName || `ref-${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          file: (asset as any).file,
          fileSize: asset.fileSize,
          mediaType: 'image',
        },
        0,
      );
      const cloudUrl = await uploadFileToStorage(pending);
      if (cloudUrl) {
        setReferenceImageUrl(cloudUrl);
      }
    } catch (err) {
      console.warn('[processPickedImage] Upload notice:', err);
      // Keep local URI as fallback
      setReferenceImageUrl(asset.uri);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMicrophoneTap = () => {
    Alert.alert(
      '🎙️ Voice Input',
      'Choose a quick idea or speak your promotion details:',
      [
        {
          text: 'Weekend Pool Party & Discounts',
          onPress: () => setPrompt('Weekend pool party package with 15% discount for families'),
        },
        {
          text: 'New Service Showcase',
          onPress: () => setPrompt(`Showcase our premium amenities and top-rated comfort at ${businessName}`),
        },
        {
          text: 'Seasonal Limited Offer',
          onPress: () => setPrompt('Special limited-time offer for early bookings this week'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const handleGenerate = async () => {
    const finalPrompt = prompt.trim();
    if (!finalPrompt && !referenceImageUrl && !referenceImageUri) {
      Alert.alert('Post Topic Needed', 'Please describe the post you want to create or pick an inspiration idea.');
      return;
    }

    setIsGenerating(true);
    try {
      const activeTopic = finalPrompt || inspirationIdeas[0];
      const res = await apiRequest<{
        success?: boolean;
        title?: string;
        headline?: string;
        caption?: string;
        imageUrl?: string;
        photoUrl?: string;
        gbpPostType?: string;
        gbpCtaAction?: string;
        bookingUrl?: string;
        error?: string;
      }>('/api/social/ai-generate-post', {
        method: 'POST',
        body: JSON.stringify({
          topic: activeTopic,
          photoUrl: referenceImageUrl || referenceImageUri || undefined,
          referenceImageUrl: referenceImageUrl || referenceImageUri || undefined,
          targetKeyword: businessCategory || 'local business',
        }),
      });

      if (!res.success && res.error) {
        throw new Error(res.error);
      }

      const generatedHeadline = res.headline || res.title || activeTopic;
      const generatedCaption =
        res.caption ||
        `${activeTopic}\n\nExperience unmatched comfort and quality at ${businessName}. Contact us today to learn more!\n\n#${businessName.replace(/[^a-zA-Z0-9]/g, '')} #GoogleBusiness`;

      const postTypeStr =
        res.gbpPostType === 'offer'
          ? 'Offer Post'
          : res.gbpPostType === 'event'
            ? 'Event Post'
            : 'Standard Post';

      const generatedPost: GeneratedPostData = {
        title: res.title || generatedHeadline,
        headline: generatedHeadline,
        caption: generatedCaption,
        imageUrl: res.imageUrl || res.photoUrl || referenceImageUrl || referenceImageUri || undefined,
        postType: postTypeStr,
        ctaAction: res.gbpCtaAction || 'CALL',
        ctaUrl: res.bookingUrl || undefined,
        scheduledTime: 'Today, Optimal Google Time',
      };

      onClose();
      onPostGenerated(generatedPost);
    } catch (err: unknown) {
      Alert.alert(
        'Generation Notice',
        err instanceof Error ? err.message : 'Could not generate post copy. Please try again.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const isButtonActive = Boolean(prompt.trim() || referenceImageUri);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        {/* ── Top Header matching Screenshot 2 ── */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onClose}
            hitSlop={10}
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>

          <View style={styles.titleCenter}>
            <MaterialIcons name="auto-awesome" size={20} color="#8B5CF6" style={{ marginBottom: 4 }} />
            <Text style={styles.screenTitle}>Create Post for GBP with AI</Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Main Input Card with Glow ── */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Describe the post you want to create"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
            />

            {/* Reference Image Preview Chip (if selected) */}
            {referenceImageUri ? (
              <View style={styles.refImageRow}>
                <Image source={{ uri: referenceImageUri }} style={styles.refThumbnail} />
                <View style={{ flex: 1, paddingLeft: 8 }}>
                  <Text style={styles.refImageTitle} numberOfLines={1}>
                    Reference Photo Attached
                  </Text>
                  <Text style={styles.refImageSub}>
                    {uploadingImage ? 'Uploading authentic photo…' : 'Ready for AI post generation'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setReferenceImageUri(null);
                    setReferenceImageUrl(null);
                  }}
                  hitSlop={8}
                  style={styles.removeRefBtn}
                >
                  <MaterialIcons name="close" size={16} color="#64748B" />
                </Pressable>
              </View>
            ) : null}

            {/* Bottom Row inside card: + Add Reference Image & 🎙️ */}
            <View style={styles.inputCardFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add Reference Image"
                onPress={handlePickReferenceImage}
                style={styles.addRefBtn}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <MaterialIcons name="add" size={18} color="#2563EB" />
                )}
                <Text style={styles.addRefText}>Add Reference Image</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dictate post idea"
                onPress={handleMicrophoneTap}
                hitSlop={8}
                style={styles.micBtn}
              >
                <MaterialIcons name="mic" size={22} color="#0F172A" />
              </Pressable>
            </View>
          </View>

          {/* ── Inspiration Section matching Screenshot 2 ── */}
          <View style={styles.inspirationHeader}>
            <Text style={styles.inspirationTitle}>Need inspiration? Try an idea</Text>
          </View>

          <View style={styles.ideasContainer}>
            {inspirationIdeas.map((idea, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`Use idea: ${idea}`}
                onPress={() => setPrompt(idea)}
                style={({ pressed }) => [
                  styles.ideaCard,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                ]}
              >
                <Text style={styles.ideaText}>{idea}</Text>
                <MaterialIcons name="arrow-upward" size={18} color="#2563EB" />
              </Pressable>
            ))}
          </View>

          {/* ── Usage Info ── */}
          <Text style={styles.usageText}>
            1 use remaining this week • Resets in 7 days
          </Text>

          {/* ── Primary Action Button: Generate with AI ✨ ── */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate post with AI"
            disabled={!isButtonActive || isGenerating || uploadingImage}
            onPress={handleGenerate}
            style={({ pressed }) => [
              styles.generateBtn,
              isButtonActive ? styles.generateBtnActive : styles.generateBtnDisabled,
              pressed && isButtonActive && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            {isGenerating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.generateBtnTextActive}>Creating Post for Google…</Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.generateBtnText,
                  isButtonActive ? styles.generateBtnTextActive : styles.generateBtnTextDisabled,
                ]}
              >
                Generate with AI ✨
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  body: {
    flex: 1,
    paddingTop: 16,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    padding: 14,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  textInput: {
    fontSize: 15,
    color: '#0F172A',
    minHeight: 95,
    lineHeight: 22,
    paddingTop: 4,
    paddingBottom: 8,
  },
  refImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  refThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  refImageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  refImageSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  removeRefBtn: {
    padding: 6,
  },
  inputCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
  },
  addRefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addRefText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspirationHeader: {
    marginBottom: 12,
  },
  inspirationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  ideasContainer: {
    gap: 10,
    marginBottom: 16,
  },
  ideaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ideaText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
    paddingRight: 10,
    lineHeight: 20,
  },
  usageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 10,
  },
  generateBtn: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  generateBtnActive: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  generateBtnTextActive: {
    color: '#FFFFFF',
  },
  generateBtnTextDisabled: {
    color: '#94A3B8',
  },
});
