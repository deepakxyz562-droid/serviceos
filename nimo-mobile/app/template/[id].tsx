import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
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
  const { selectedTemplate, templates, selectTemplate, coinsAvailable } = useAppStore();

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

  const handleContinue = () => {
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
              <Ionicons name="person-circle-outline" size={20} color={THEME.colors.accentViolet} />
              <Text style={styles.slotGuideTitle}>Required: 1 Clear Portrait</Text>
            </View>
            <Text style={styles.slotGuideDesc}>
              Upload a clear, front-facing selfie or portrait with good lighting. Your facial features will be preserved onto this artistic style.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Use This Style</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.colors.bgSecondary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 15,
    borderRadius: THEME.radii.lg,
    gap: 8,
  },
  continueBtnText: {
    color: '#FFF',
    fontSize: 16,
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
