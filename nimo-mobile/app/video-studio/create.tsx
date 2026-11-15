import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function PhotoToVideoScreen() {
  const router = useRouter();
  const {
    videoDuration,
    setVideoDuration,
    videoQuality,
    setVideoQuality,
    videoTargetUri,
    setVideoTargetUri,
    coinsAvailable,
    startVideoGeneration,
  } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Photo library access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setVideoTargetUri(result.assets[0].uri);
    }
  };

  const handleGenerateVideo = async () => {
    if (coinsAvailable < 10) {
      Alert.alert('Insufficient Credits', 'Video generation requires 10 credits.', [
        { text: 'Get Credits', onPress: () => router.push('/coins') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    try {
      setIsGenerating(true);
      await startVideoGeneration();

      // Navigate to progress/gallery after brief animation
      setTimeout(() => {
        setIsGenerating(false);
        Alert.alert(
          'Video Generation Started! ⚡',
          `Your video is rendering with Kling 2.1 in ${videoQuality} (${videoDuration}). It will appear in your Creations tab in 45-60 seconds.`,
          [
            {
              text: 'View Creations',
              onPress: () => router.replace('/(tabs)/gallery'),
            },
          ]
        );
      }, 1500);
    } catch (e: any) {
      setIsGenerating(false);
      Alert.alert('Error', e.message || 'Video generation failed');
    }
  };

  const targetPhoto =
    videoTargetUri ||
    'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=800&q=80';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo to Video</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photo Preview Card with Play Overlay */}
        <TouchableOpacity
          style={styles.previewCard}
          onPress={handlePickPhoto}
          activeOpacity={0.9}
        >
          <Image source={{ uri: targetPhoto }} style={styles.previewImg} resizeMode="cover" />
          <View style={styles.playOverlayCircle}>
            <Ionicons name="play" size={32} color="#FFF" style={{ marginLeft: 4 }} />
          </View>
          <View style={styles.tapToChangeBadge}>
            <Ionicons name="camera" size={14} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.tapToChangeText}>Tap to change photo</Text>
          </View>
        </TouchableOpacity>

        {/* Setting 1: Duration */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Duration</Text>
          <View style={styles.pillsRow}>
            {(['3s', '5s', '10s'] as const).map((dur) => {
              const isActive = videoDuration === dur;
              return (
                <TouchableOpacity
                  key={dur}
                  style={[styles.durationPill, isActive && styles.pillActive]}
                  onPress={() => setVideoDuration(dur)}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {dur}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Setting 2: Quality */}
        <View style={styles.controlSection}>
          <Text style={styles.controlLabel}>Quality</Text>
          <View style={styles.pillsRow}>
            {(['HD', 'Full HD'] as const).map((q) => {
              const isActive = videoQuality === q;
              return (
                <TouchableOpacity
                  key={q}
                  style={[styles.qualityPill, isActive && styles.pillActive]}
                  onPress={() => setVideoQuality(q)}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {q}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Generate Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleGenerateVideo}
          activeOpacity={0.88}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.btnRow}>
              <Text style={styles.generateBtnText}>Generate Video</Text>
              <Text style={styles.boltEmoji}>⚡</Text>
              <Text style={styles.costText}>10</Text>
            </View>
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  previewCard: {
    width: '100%',
    height: width * 1.05,
    borderRadius: THEME.radii.xl,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  playOverlayCircle: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(124, 58, 237, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  tapToChangeBadge: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(8, 0, 20, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapToChangeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  controlSection: {
    marginBottom: 20,
  },
  controlLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationPill: {
    flex: 1,
    height: 44,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  qualityPill: {
    flex: 1,
    height: 44,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  pillActive: {
    backgroundColor: THEME.colors.accentViolet,
    borderColor: THEME.colors.accentViolet,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.colors.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  generateBtn: {
    height: 52,
    backgroundColor: THEME.colors.accentViolet,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  boltEmoji: {
    fontSize: 16,
    marginHorizontal: 6,
  },
  costText: {
    color: '#FBBF24',
    fontSize: 16,
    fontWeight: '800',
  },
});
