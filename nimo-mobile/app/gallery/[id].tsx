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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { THEME } from '../../src/theme/tokens';
import { useAppStore, NIMO_EXPLORE_TEMPLATES } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

export default function PhotoDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isFavorite, toggleFavorite, galleryItems } = useAppStore();

  const item =
    galleryItems.find((g) => g.id === id) ||
    NIMO_EXPLORE_TEMPLATES.find((t) => t.id === id) ||
    NIMO_EXPLORE_TEMPLATES[0];

  const imageUrl = item.storage_path || item.preview_url || item.thumbnail_url;
  const favorited = isFavorite(item.id);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const filename = `nimo_photo_${Date.now()}.jpg`;
      const localUri = `${(FileSystem as any).documentDirectory || ''}${filename}`;
      await FileSystem.downloadAsync(imageUrl, localUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri);
      } else {
        Alert.alert('Saved', 'Photo saved to device gallery.');
      }
    } catch (e: any) {
      Alert.alert('Download Error', e.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(imageUrl);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Details</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.iconBtn}>
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={22}
              color={favorited ? '#EC4899' : '#FFF'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Large Portrait Card */}
        <View style={styles.portraitCard}>
          <Image source={{ uri: imageUrl }} style={styles.portraitImg} resizeMode="cover" />
        </View>

        {/* Action Buttons Stack */}
        <View style={styles.actionStack}>
          {/* Download Button */}
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={handleDownload}
            activeOpacity={0.88}
          >
            <Ionicons name="download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.downloadBtnText}>Download</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>

          {/* Add to Favorites Button */}
          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => toggleFavorite(item.id)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={18}
              color={favorited ? '#EC4899' : THEME.colors.textSecondary}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.favBtnText, favorited && { color: '#EC4899' }]}>
              {favorited ? 'Favorited' : 'Add to Favorites'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Similar Creations Section */}
        <View style={styles.similarSection}>
          <Text style={styles.similarTitle}>Similar Creations</Text>
          <View style={styles.similarRow}>
            {NIMO_EXPLORE_TEMPLATES.slice(1, 4).map((sim) => (
              <TouchableOpacity
                key={sim.id}
                style={styles.similarCard}
                onPress={() => router.push({ pathname: '/gallery/[id]', params: { id: sim.id } })}
              >
                <Image source={{ uri: sim.thumbnail_url }} style={styles.similarImg} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  portraitCard: {
    width: '100%',
    height: width * 1.15,
    borderRadius: THEME.radii.xl,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    marginBottom: 20,
  },
  portraitImg: {
    width: '100%',
    height: '100%',
  },
  actionStack: {
    gap: 12,
    marginBottom: 28,
  },
  downloadBtn: {
    height: 52,
    backgroundColor: THEME.colors.accentViolet,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  downloadBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  shareBtn: {
    height: 50,
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  shareBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  favBtn: {
    height: 46,
    borderRadius: THEME.radii.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  similarSection: {
    marginTop: 8,
  },
  similarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  similarRow: {
    flexDirection: 'row',
    gap: 12,
  },
  similarCard: {
    flex: 1,
    height: 100,
    borderRadius: THEME.radii.md,
    overflow: 'hidden',
    backgroundColor: THEME.colors.bgCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  similarImg: {
    width: '100%',
    height: '100%',
  },
});
