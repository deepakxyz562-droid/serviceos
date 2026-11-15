import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { NimoLogo } from '../../src/components/NimoLogo';

const { width } = Dimensions.get('window');

export default function CreateHubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <NimoLogo size="large" showTagline alignCenter />

        <Text style={styles.headline}>Choose Your Creative Studio</Text>
        <Text style={styles.subheadline}>Transform your photos into viral portraits or animate them into cinematic videos.</Text>

        <View style={styles.hubContainer}>
          {/* AI Photo Studio Option */}
          <TouchableOpacity
            style={styles.hubCard}
            activeOpacity={0.85}
            onPress={() => router.push('/photo-studio')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="camera" size={28} color="#FFF" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>AI Photo Studio</Text>
              <Text style={styles.cardDesc}>Upload a selfie and transform into 50+ viral portrait aesthetics.</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {/* AI Video Studio Option */}
          <TouchableOpacity
            style={styles.hubCard}
            activeOpacity={0.85}
            onPress={() => router.push('/video-studio')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#EC4899' }]}>
              <Ionicons name="videocam" size={28} color="#FFF" />
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>AI Video Studio</Text>
              <Text style={styles.cardDesc}>Bring photos to life with dynamic motion, Kling 2.1 & Veo cinematic quality.</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 28,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  hubContainer: {
    width: '100%',
    marginTop: 36,
    gap: 16,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTextContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
});
