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
const SLOT_WIDTH = (width - 32 - 16) / 3; // 3 columns grid

export default function IdentitySetupScreen() {
  const router = useRouter();
  const { identityPhotos, addIdentityPhoto, removeIdentityPhoto, saveIdentityPhotos } = useAppStore();
  const [localPhotos, setLocalPhotos] = useState<string[]>(identityPhotos);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickPhoto = async (index: number) => {
    Alert.alert(
      'Add Selfie for AI Identity',
      'Choose a clear front-facing portrait with natural lighting',
      [
        {
          text: 'Take Selfie (Camera)',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera permission is required to take a selfie.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!res.canceled && res.assets && res.assets[0]?.uri) {
              const uri = res.assets[0].uri;
              const updated = [...localPhotos];
              if (index < updated.length) {
                updated[index] = uri;
              } else {
                updated.push(uri);
              }
              setLocalPhotos(updated.slice(0, 10));
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Gallery access is required.');
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
            if (!res.canceled && res.assets && res.assets[0]?.uri) {
              const uri = res.assets[0].uri;
              const updated = [...localPhotos];
              if (index < updated.length) {
                updated[index] = uri;
              } else {
                updated.push(uri);
              }
              setLocalPhotos(updated.slice(0, 10));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemove = (index: number) => {
    const updated = localPhotos.filter((_, i) => i !== index);
    setLocalPhotos(updated);
  };

  const handleSaveIdentity = async () => {
    if (localPhotos.length < 5) {
      Alert.alert(
        'Minimum 5 Photos Needed',
        `You currently have ${localPhotos.length} photos. Please add at least 5 varied selfies to guarantee high facial likeness.`
      );
      return;
    }

    try {
      setIsSaving(true);
      await saveIdentityPhotos(localPhotos);
      setIsSaving(false);
      Alert.alert(
        '✨ AI Likeness Saved!',
        'Your personal AI portrait identity is active. You can now use 1-Tap Generation across all templates!',
        [
          {
            text: 'Explore Styles',
            onPress: () => router.replace('/(tabs)/explore'),
          },
        ]
      );
    } catch (e: any) {
      setIsSaving(false);
      Alert.alert('Save Error', e.message || 'Failed to save identity photos.');
    }
  };

  const count = localPhotos.length;
  const isReady = count >= 5;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()} disabled={isSaving}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Identity Album</Text>
        <View style={[styles.badgePill, isReady ? styles.badgeReady : styles.badgePending]}>
          <Ionicons name={isReady ? 'checkmark-circle' : 'time-outline'} size={14} color="#FFF" />
          <Text style={styles.badgeText}>{isReady ? 'Trained' : `${count}/5 Min`}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroSparkleRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={24} color={THEME.colors.accentViolet} />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitle}>One-Time Setup, 1-Tap Forever</Text>
              <Text style={styles.heroSubtitle}>
                Add 5 to 10 selfies. NIMO captures your natural facial structure, angles, and skin tones so you never have to re-upload.
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressInfoRow}>
              <Text style={styles.progressLabel}>Identity Training Status</Text>
              <Text style={[styles.progressValue, { color: isReady ? THEME.colors.success : THEME.colors.warning }]}>
                {count}/10 Photos {isReady ? '• Ready ✨' : `(${5 - count} more needed)`}
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, (count / 10) * 100)}%`,
                    backgroundColor: isReady ? THEME.colors.success : THEME.colors.accentViolet,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* 10 Photo Slots Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your AI Identity Photos</Text>
          <Text style={styles.sectionHint}>Tap any slot to change or add</Text>
        </View>

        <View style={styles.slotsGrid}>
          {Array.from({ length: 10 }).map((_, idx) => {
            const hasPhoto = idx < localPhotos.length;
            const photoUri = hasPhoto ? localPhotos[idx] : null;

            if (hasPhoto && photoUri) {
              return (
                <View key={`slot-${idx}`} style={styles.slotFilledContainer}>
                  <Image source={{ uri: photoUri }} style={styles.slotImage} resizeMode="cover" />
                  <View style={styles.slotNumberBadge}>
                    <Text style={styles.slotNumberText}>#{idx + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.slotDeleteBtn}
                    onPress={() => handleRemove(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={`slot-${idx}`}
                style={[styles.slotEmptyContainer, idx === localPhotos.length && styles.slotEmptyActive]}
                onPress={() => handlePickPhoto(idx)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={idx === localPhotos.length ? 'add-circle' : 'camera-outline'}
                  size={26}
                  color={idx === localPhotos.length ? THEME.colors.accentViolet : THEME.colors.textMuted}
                />
                <Text style={styles.slotEmptyText}>Photo {idx + 1}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quality Guidelines Card */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Quality Rules for Flawless Likeness</Text>

          <View style={styles.guideRow}>
            <Ionicons name="checkmark-circle" size={18} color={THEME.colors.success} />
            <Text style={styles.guideText}>High resolution, natural daily lighting</Text>
          </View>

          <View style={styles.guideRow}>
            <Ionicons name="checkmark-circle" size={18} color={THEME.colors.success} />
            <Text style={styles.guideText}>Varied expressions (neutral, smile, looking straight)</Text>
          </View>

          <View style={styles.guideRow}>
            <Ionicons name="checkmark-circle" size={18} color={THEME.colors.success} />
            <Text style={styles.guideText}>Slight head angles (straight-on, 15° slight tilt)</Text>
          </View>

          <View style={styles.guideRow}>
            <Ionicons name="close-circle" size={18} color={THEME.colors.error} />
            <Text style={styles.guideText}>No sunglasses, masks, or extreme beauty filters</Text>
          </View>

          <View style={styles.guideRow}>
            <Ionicons name="close-circle" size={18} color={THEME.colors.error} />
            <Text style={styles.guideText}>No group photos or obstructed facial features</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (!isReady || isSaving) && styles.saveBtnDisabled]}
          onPress={handleSaveIdentity}
          disabled={!isReady || isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>
                {isReady ? 'Save & Lock My AI Identity' : `Add ${5 - count} More Photos to Save`}
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
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.pill,
  },
  badgeReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: THEME.colors.success,
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: THEME.colors.warning,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 18,
  },
  heroCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 14,
  },
  heroSparkleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
  progressContainer: {
    gap: 6,
    marginTop: 4,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: THEME.colors.bgCardLighter,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionHint: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotFilledContainer: {
    width: SLOT_WIDTH,
    height: SLOT_WIDTH * 1.25,
    borderRadius: THEME.radii.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotNumberBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  slotNumberText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  slotDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmptyContainer: {
    width: SLOT_WIDTH,
    height: SLOT_WIDTH * 1.25,
    borderRadius: THEME.radii.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
    backgroundColor: THEME.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  slotEmptyActive: {
    borderColor: THEME.colors.accentViolet,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  slotEmptyText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  guideCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 10,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: 'rgba(8, 0, 20, 0.95)',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  saveBtn: {
    backgroundColor: THEME.colors.accentViolet,
    paddingVertical: 14,
    borderRadius: THEME.radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
