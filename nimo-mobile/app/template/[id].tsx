import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function TemplateDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    selectedTemplate,
    templates,
    selectTemplate,
    coinsAvailable,
    identityPhotos,
    isIdentityTrained,
    startGeneration,
  } = useAppStore();

  const [isStarting1Tap, setIsStarting1Tap] = useState(false);

  const activeTemplate =
    selectedTemplate && (selectedTemplate.id === id || selectedTemplate.slug === id)
      ? selectedTemplate
      : templates.find((t) => t.id === id || t.slug === id) || selectedTemplate;

  React.useEffect(() => {
    if (activeTemplate && activeTemplate !== selectedTemplate) {
      selectTemplate(activeTemplate);
    }
  }, [activeTemplate, selectedTemplate, selectTemplate]);

  if (!activeTemplate) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Template not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCouple =
    activeTemplate.required_photo_slots === 2 ||
    activeTemplate.category === 'Couple' ||
    activeTemplate.slug.includes('couple') ||
    activeTemplate.slug.includes('love');

  const hasIdentity = identityPhotos.length >= 5;

  const handle1TapGenerate = async () => {
    const cost = activeTemplate.coin_cost || 5;
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
      setIsStarting1Tap(true);
      await startGeneration();
      router.replace('/generate/progress');
    } catch (e: any) {
      setIsStarting1Tap(false);
      Alert.alert('Generation Error', e.message || 'Could not start generation.');
    }
  };

  const handleManualUpload = () => {
    router.push('/generate/upload');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
          disabled={isStarting1Tap}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Style Details</Text>
        <TouchableOpacity
          style={styles.coinPill}
          onPress={() => router.push('/coins')}
        >
          <Text style={styles.coinText}>🪙 {coinsAvailable}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Large Preview */}
        <View style={styles.imageCard}>
          <Image
            source={{ uri: activeTemplate.preview_url || activeTemplate.thumbnail_url }}
            style={styles.previewImage}
            resizeMode="cover"
          />
          <View style={styles.aspectBadge}>
            <Text style={styles.aspectText}>{activeTemplate.aspect_ratio || '9:16'}</Text>
          </View>
          {isCouple && (
            <View style={styles.coupleBadge}>
              <Ionicons name="heart" size={12} color="#FFF" />
              <Text style={styles.coupleBadgeText}>Couple Template (2 Slots)</Text>
            </View>
          )}
        </View>

        {/* Title & Description */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{activeTemplate.title}</Text>
            <View style={styles.costBadge}>
              <Text style={styles.costText}>🪙 {activeTemplate.coin_cost} coins</Text>
            </View>
          </View>

          <Text style={styles.description}>{activeTemplate.description}</Text>

          {/* Slot guidance */}
          <View style={styles.slotGuideBox}>
            <View style={styles.slotGuideHeader}>
              <Ionicons
                name={isCouple ? 'people-circle-outline' : 'person-circle-outline'}
                size={20}
                color={THEME.colors.accentViolet}
              />
              <Text style={styles.slotGuideTitle}>
                {isCouple ? 'Required: 2 Portrait Photos (Her + His)' : 'Required: 1 Clear Portrait Photo'}
              </Text>
            </View>
            <Text style={styles.slotGuideDesc}>
              {isCouple
                ? 'Upload individual photos for both partners. NIMO seamlessly blends both facial identities into this romantic cinematic scene.'
                : 'Upload a clear, front-facing selfie or use your saved AI Identity Album. Your facial features will be preserved with 99% accuracy.'}
            </Text>
          </View>

          {/* Saved Identity Status Card */}
          {hasIdentity ? (
            <View style={styles.identityNoticeCard}>
              <View style={styles.identityNoticeTop}>
                <Ionicons name="sparkles" size={16} color={THEME.colors.accentViolet} />
                <Text style={styles.identityNoticeTitle}>AI Identity Profile Active</Text>
                <TouchableOpacity onPress={() => router.push('/identity/setup')}>
                  <Text style={styles.identityNoticeEdit}>Edit Photos</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.identityNoticeSub}>
                Your 5 trained reference selfies are loaded and ready for 1-Tap generation.
              </Text>
              <View style={styles.identityPreviewStrip}>
                {identityPhotos.slice(0, 5).map((uri, idx) => (
                  <Image key={`preview-id-${idx}`} source={{ uri }} style={styles.miniIdThumb} />
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.trainBanner}
              onPress={() => router.push('/identity/setup')}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={20} color={THEME.colors.accentViolet} />
              <View style={{ flex: 1 }}>
                <Text style={styles.trainBannerTitle}>Train AI Identity Once</Text>
                <Text style={styles.trainBannerSub}>
                  Upload 5 selfies once to unlock 1-Tap Instant Generation on every style!
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Action CTAs */}
      <View style={styles.footer}>
        {hasIdentity && !isCouple ? (
          <>
            {/* Primary: 1-Tap Instant Generate */}
            <TouchableOpacity
              style={styles.oneTapBtn}
              onPress={handle1TapGenerate}
              disabled={isStarting1Tap}
              activeOpacity={0.85}
            >
              {isStarting1Tap ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#FFF" />
                  <Text style={styles.oneTapBtnText}>
                    ✨ 1-Tap Generate with AI Identity
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Secondary: Upload Custom Photo */}
            <TouchableOpacity
              style={styles.customUploadBtn}
              onPress={handleManualUpload}
              disabled={isStarting1Tap}
              activeOpacity={0.85}
            >
              <Ionicons name="camera-outline" size={16} color={THEME.colors.textSecondary} />
              <Text style={styles.customUploadText}>Or Upload a Different Photo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleManualUpload}
            activeOpacity={0.85}
          >
            <Ionicons name={isCouple ? 'people' : 'images'} size={18} color="#FFF" />
            <Text style={styles.continueBtnText}>
              {isCouple ? 'Upload Couple Photos (2 Slots)' : 'Upload Photo & Generate'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        )}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
    gap: 16,
  },
  imageCard: {
    width: '100%',
    height: width * 1.25,
    borderRadius: THEME.radii.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: THEME.colors.bgSecondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  aspectBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(12, 1, 44, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radii.sm,
  },
  aspectText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  coupleBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(236, 72, 153, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coupleBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  costBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  costText: {
    color: THEME.colors.coinGold,
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  slotGuideBox: {
    backgroundColor: THEME.colors.bgSecondary,
    borderRadius: THEME.radii.lg,
    padding: 14,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.accentViolet,
  },
  slotGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotGuideTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  slotGuideDesc: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  identityNoticeCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: THEME.radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    gap: 8,
  },
  identityNoticeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flex: 1,
    marginLeft: 6,
  },
  identityNoticeEdit: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.accentViolet,
  },
  identityNoticeSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  identityPreviewStrip: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  miniIdThumb: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  trainBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.colors.bgSecondary,
    padding: 12,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  trainBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  trainBannerSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8, 0, 20, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    gap: 8,
  },
  oneTapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 14,
    borderRadius: THEME.radii.xl,
    gap: 8,
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  oneTapBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  customUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    gap: 6,
  },
  customUploadText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 14,
    borderRadius: THEME.radii.xl,
    gap: 8,
  },
  continueBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: THEME.colors.bgCard,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: THEME.radii.pill,
  },
  backBtnText: {
    color: THEME.colors.accentViolet,
    fontWeight: '700',
  },
});
