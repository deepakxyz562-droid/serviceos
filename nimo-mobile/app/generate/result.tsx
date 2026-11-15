import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function ResultScreen() {
  const router = useRouter();
  const { generatedImageUrl, selectedStyle, resetGeneration } = useAppStore();
  const [isDownloading, setIsDownloading] = useState(false);

  const fallbackUrl = selectedStyle?.thumbnailUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85';
  const imageUrl = generatedImageUrl || fallbackUrl;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const filename = `nimo_portrait_${Date.now()}.jpg`;
      const localUri = `${(FileSystem as any).documentDirectory || ''}${filename}`;
      await FileSystem.downloadAsync(imageUrl, localUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri);
      } else {
        Alert.alert('Saved', 'Your AI portrait has been saved to your device gallery.');
      }
    } catch (e: any) {
      Alert.alert('Download Error', e.message || 'Unable to save image');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Notice', 'Sharing is not available on this device');
        return;
      }
      const filename = `nimo_share_${Date.now()}.jpg`;
      const localUri = `${(FileSystem as any).cacheDirectory || ''}${filename}`;
      await FileSystem.downloadAsync(imageUrl, localUri);
      await Sharing.shareAsync(localUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share your NIMO AI Portrait',
      });
    } catch (e: any) {
      Alert.alert('Share Error', e.message);
    }
  };

  const handleTryAnother = () => {
    resetGeneration();
    router.replace('/photo-studio');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your AI Portrait</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Full Portrait Preview Card */}
        <View style={styles.portraitCard}>
          <Image source={{ uri: imageUrl }} style={styles.portraitImg} resizeMode="cover" />
        </View>

        {/* Action Buttons Stack */}
        <View style={styles.actionsStack}>
          {/* Download Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDownload}
            activeOpacity={0.85}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#FFF" style={styles.btnIcon} />
                <Text style={styles.actionBtnText}>Download</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFF" style={styles.btnIcon} />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>

          {/* Try Another Button */}
          <TouchableOpacity
            style={styles.tryAnotherBtn}
            onPress={handleTryAnother}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={18} color={THEME.colors.textSecondary} style={styles.btnIcon} />
            <Text style={styles.tryAnotherText}>Try Another</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  portraitCard: {
    width: '100%',
    flex: 1,
    maxHeight: width * 1.25,
    borderRadius: THEME.radii.xl,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  portraitImg: {
    width: '100%',
    height: '100%',
  },
  actionsStack: {
    gap: 12,
    marginTop: 18,
  },
  actionBtn: {
    height: 52,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  btnIcon: {
    marginRight: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tryAnotherBtn: {
    height: 48,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tryAnotherText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
