import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function PhotoUploadScreen() {
  const router = useRouter();
  const { selectedTemplate, coinsAvailable, startGeneration, identityPhotos } = useAppStore();

  const isCouple =
    selectedTemplate?.required_photo_slots === 2 ||
    selectedTemplate?.category === 'Couple' ||
    selectedTemplate?.slug.includes('couple') ||
    selectedTemplate?.slug.includes('love');

  // Slot 1 and Slot 2
  const [photo1Uri, setPhoto1Uri] = useState<string | null>(
    identityPhotos.length > 0 ? identityPhotos[0] : null
  );
  const [photo2Uri, setPhoto2Uri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async (slotIndex: 1 | 2, useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Camera permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.85,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Photo gallery access is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.85,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        if (slotIndex === 1) {
          setPhoto1Uri(result.assets[0].uri);
        } else {
          setPhoto2Uri(result.assets[0].uri);
        }
      }
    } catch (e: any) {
      Alert.alert('Selection Error', e.message);
    }
  };

  const handleGenerate = async () => {
    if (!photo1Uri) {
      Alert.alert('Photo Required', isCouple ? 'Please upload Partner 1 photo.' : 'Please upload a portrait photo.');
      return;
    }

    if (isCouple && !photo2Uri) {
      Alert.alert('Partner Photo Required', 'Please upload Partner 2 photo to complete the couple portrait.');
      return;
    }

    const cost = selectedTemplate?.coin_cost || 5;
    if (coinsAvailable < cost) {
      Alert.alert(
        'Insufficient Coins',
        `You need ${cost} coins to generate this portrait. You currently have ${coinsAvailable} coins.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Coins', onPress: () => router.push('/coins') },
        ]
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const photos = isCouple ? [photo1Uri, photo2Uri!] : [photo1Uri];
      await startGeneration(photos, selectedTemplate?.aspect_ratio);
      router.replace('/generate/progress');
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setIsSubmitting(false);
    }
  };

  const canGenerate = isCouple ? !!(photo1Uri && photo2Uri) : !!photo1Uri;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isCouple ? 'Couple Photo Slots' : 'Add Your Photo'}
        </Text>
        <View style={styles.coinPill}>
          <Text style={styles.coinText}>🪙 {coinsAvailable}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Style Banner */}
        <View style={styles.templateSummaryRow}>
          <Image
            source={{ uri: selectedTemplate?.thumbnail_url || selectedTemplate?.preview_url }}
            style={styles.templateThumb}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.templateName}>{selectedTemplate?.title || 'AI Portrait'}</Text>
            <Text style={styles.templateCategory}>
              {isCouple ? 'Couple Style • 2 Individual Photos' : 'Portrait Style • 1 Photo'}
            </Text>
          </View>
          <View style={styles.costBadge}>
            <Text style={styles.costBadgeText}>🪙 {selectedTemplate?.coin_cost || 5}</Text>
          </View>
        </View>

        {/* Slot 1 */}
        <View style={styles.slotSection}>
          <View style={styles.slotHeader}>
            <Text style={styles.slotTitle}>
              {isCouple ? 'Slot 1: Partner 1 (Her / Woman)' : 'Your Portrait Photo'}
            </Text>
            {identityPhotos.length > 0 && photo1Uri !== identityPhotos[0] && (
              <TouchableOpacity
                onPress={() => setPhoto1Uri(identityPhotos[0])}
                style={styles.useIdLink}
              >
                <Ionicons name="sparkles" size={12} color={THEME.colors.accentViolet} />
                <Text style={styles.useIdLinkText}>Use AI Identity</Text>
              </TouchableOpacity>
            )}
          </View>

          {photo1Uri ? (
            <View style={styles.previewBox}>
              <Image source={{ uri: photo1Uri }} style={styles.selectedImage} resizeMode="cover" />
              <View style={styles.previewActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(1, false)}>
                  <Ionicons name="images" size={14} color="#FFF" />
                  <Text style={styles.actionBtnText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => setPhoto1Uri(null)}>
                  <Ionicons name="trash" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.uploadCard}>
              <Ionicons name="person" size={36} color={THEME.colors.accentViolet} />
              <Text style={styles.uploadTitle}>
                {isCouple ? 'Upload Partner 1 Photo' : 'Upload Your Selfie'}
              </Text>
              <View style={styles.pickerActionsRow}>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => pickImage(1, true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={18} color="#FFF" />
                  <Text style={styles.pickerBtnText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pickerBtn, styles.galleryBtn]}
                  onPress={() => pickImage(1, false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images" size={18} color="#FFF" />
                  <Text style={styles.pickerBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Slot 2 (Couple Mode) */}
        {isCouple && (
          <View style={styles.slotSection}>
            <View style={styles.slotHeader}>
              <Text style={styles.slotTitle}>Slot 2: Partner 2 (His / Man)</Text>
              <Text style={styles.slotRequiredBadge}>Required</Text>
            </View>

            {photo2Uri ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: photo2Uri }} style={styles.selectedImage} resizeMode="cover" />
                <View style={styles.previewActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(2, false)}>
                    <Ionicons name="images" size={14} color="#FFF" />
                    <Text style={styles.actionBtnText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => setPhoto2Uri(null)}>
                    <Ionicons name="trash" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.uploadCard}>
                <Ionicons name="heart" size={36} color="#EC4899" />
                <Text style={styles.uploadTitle}>Upload Partner 2 Photo</Text>
                <View style={styles.pickerActionsRow}>
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => pickImage(2, true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera" size={18} color="#FFF" />
                    <Text style={styles.pickerBtnText}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pickerBtn, styles.galleryBtn]}
                    onPress={() => pickImage(2, false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images" size={18} color="#FFF" />
                    <Text style={styles.pickerBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Quality Guidelines Card */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Photo Quality Checklist:</Text>
          <View style={styles.guideItem}>
            <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
            <Text style={styles.guideText}>Front-facing portraits with clear facial details</Text>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="checkmark-circle" size={16} color={THEME.colors.success} />
            <Text style={styles.guideText}>Even, natural lighting without strong shadows</Text>
          </View>
          <View style={styles.guideItem}>
            <Ionicons name="close-circle" size={16} color={THEME.colors.error} />
            <Text style={styles.guideText}>No sunglasses, hats, or covered faces</Text>
          </View>
        </View>

        {/* Cost summary note */}
        <View style={styles.costNote}>
          <Ionicons name="shield-checkmark" size={16} color={THEME.colors.success} />
          <Text style={styles.costNoteText}>
            Generation cost: <Text style={{ color: THEME.colors.coinGold, fontWeight: '700' }}>🪙 {selectedTemplate?.coin_cost || 5} coins</Text>. Zero risk: Coins are only deducted on successful generation.
          </Text>
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={!canGenerate || isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#FFF" />
              <Text style={styles.generateBtnText}>
                {isCouple
                  ? `Generate Couple Portrait (🪙 ${selectedTemplate?.coin_cost || 5})`
                  : `Generate AI Portrait (🪙 ${selectedTemplate?.coin_cost || 5})`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  coinPill: {
    backgroundColor: THEME.colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  coinText: {
    color: THEME.colors.coinGold,
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  templateSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: THEME.colors.bgCard,
    padding: 12,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  templateThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  templateCategory: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  costBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radii.pill,
  },
  costBadgeText: {
    color: THEME.colors.coinGold,
    fontSize: 12,
    fontWeight: '700',
  },
  slotSection: {
    gap: 8,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  slotRequiredBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EC4899',
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  useIdLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  useIdLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.accentViolet,
  },
  uploadCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
    gap: 10,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  pickerActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.bgCardLighter,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  galleryBtn: {
    backgroundColor: THEME.colors.accentElectric,
    borderColor: 'transparent',
  },
  pickerBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  previewBox: {
    width: '100%',
    height: 180,
    borderRadius: THEME.radii.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radii.pill,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  guideCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  costNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 12,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  costNoteText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8, 0, 20, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 14,
    borderRadius: THEME.radii.xl,
    gap: 8,
  },
  generateBtnDisabled: {
    opacity: 0.45,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
