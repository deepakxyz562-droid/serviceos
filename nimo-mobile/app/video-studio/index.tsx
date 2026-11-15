import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { useAppStore, INITIAL_VIDEO_STYLES, VideoStyleItem } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function VideoStudioHomeScreen() {
  const router = useRouter();
  const { selectedVideoStyle, selectVideoStyle } = useAppStore();

  const handleSelectVideoStyle = (style: VideoStyleItem) => {
    selectVideoStyle(style);
    router.push('/video-studio/create');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Video Studio</Text>
        <TouchableOpacity onPress={() => router.push('/paywall')} style={styles.crownBtn}>
          <Ionicons name="sparkles" size={18} color="#FBBF24" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card: Bring Photos to Life */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => router.push('/video-studio/create')}
          activeOpacity={0.9}
        >
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>Bring Photos{"\n"}to Life</Text>
            <Text style={styles.heroSubtitle}>Turn images into stunning videos</Text>
          </View>

          <View style={styles.clapperboardIconCircle}>
            <Ionicons name="film" size={32} color="#FFF" />
            <View style={styles.miniPlayCircle}>
              <Ionicons name="play" size={14} color="#7C3AED" style={{ marginLeft: 2 }} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Dual Mode Cards */}
        <View style={styles.dualModeRow}>
          {/* Photo to Video */}
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => router.push('/video-studio/create')}
            activeOpacity={0.85}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <Ionicons name="image" size={24} color={THEME.colors.accentViolet} />
            </View>
            <Text style={styles.modeTitle}>Photo to{"\n"}Video</Text>
          </TouchableOpacity>

          {/* Text to Video */}
          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => router.push('/video-studio/create')}
            activeOpacity={0.85}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
              <Ionicons name="videocam" size={24} color={THEME.colors.accentMagenta} />
            </View>
            <Text style={styles.modeTitle}>Text to{"\n"}Video</Text>
          </TouchableOpacity>
        </View>

        {/* Popular Video Styles */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Popular Video Styles</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
            <Text style={styles.seeAllText}>See All →</Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Strip of Video Styles */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videoStylesRail}
        >
          {INITIAL_VIDEO_STYLES.map((style) => (
            <TouchableOpacity
              key={style.id}
              style={styles.videoStyleCard}
              onPress={() => handleSelectVideoStyle(style)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: style.thumbnailUrl }} style={styles.videoStyleImg} />
              <View style={styles.videoStyleTag}>
                <Text style={styles.videoStyleName} numberOfLines={1}>
                  {style.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
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
  crownBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    width: '100%',
    height: 160,
    borderRadius: THEME.radii.xl,
    backgroundColor: THEME.colors.bgCard,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.colors.accentViolet,
    marginTop: 6,
    fontWeight: '600',
  },
  clapperboardIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  miniPlayCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dualModeRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  modeCard: {
    flex: 1,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  modeIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: THEME.colors.accentViolet,
    fontWeight: '700',
  },
  videoStylesRail: {
    gap: 12,
  },
  videoStyleCard: {
    width: 90,
    height: 120,
    borderRadius: THEME.radii.md,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  videoStyleImg: {
    width: '100%',
    height: '100%',
  },
  videoStyleTag: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(8,0,20,0.78)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  videoStyleName: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
