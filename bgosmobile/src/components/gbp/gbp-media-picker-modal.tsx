import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../lib/api';
import type { GbpPhoto } from './types';

export interface SelectedMediaItem {
  url: string;
  thumbnailUrl?: string;
  title?: string;
}

interface GbpMediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPhoto: (photo: SelectedMediaItem) => void;
}

export function GbpMediaPickerModal({
  visible,
  onClose,
  onSelectPhoto,
}: GbpMediaPickerModalProps) {
  const [photos, setPhotos] = useState<GbpPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ photos?: GbpPhoto[]; error?: string }>('/api/social/photos');
      if (res.photos && Array.isArray(res.photos)) {
        // Filter out videos, keeping only valid image URLs
        const imageItems = res.photos.filter((p) => {
          if (!p.url) return false;
          if (p.mediaFormat === 'VIDEO') return false;
          const clean = p.url.split('?')[0].toLowerCase();
          return !clean.endsWith('.mp4') && !clean.endsWith('.mov') && !clean.endsWith('.webm');
        });
        // Deduplicate by URL
        const seen = new Set<string>();
        const unique = imageItems.filter((p) => {
          if (seen.has(p.url)) return false;
          seen.add(p.url);
          return true;
        });
        setPhotos(unique);
      } else if (res.error) {
        setError(res.error);
      }
    } catch (err: unknown) {
      console.warn('[GbpMediaPickerModal] Error fetching photos:', err);
      setError(err instanceof Error ? err.message : 'Could not load media library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      void fetchPhotos();
    }
  }, [visible]);

  const handleSelect = (item: GbpPhoto) => {
    onSelectPhoto({
      url: item.url,
      thumbnailUrl: item.thumbnailUrl || item.url,
      title: item.title,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeRoot}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close photo picker"
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <MaterialIcons name="close" size={24} color="#0F172A" />
          </Pressable>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Select Uploaded Photo</Text>
            <Text style={styles.subtitle}>
              Use your authentic business or Google profile photo
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh media library"
            onPress={fetchPhotos}
            hitSlop={12}
            style={styles.refreshBtn}
          >
            <MaterialIcons name="refresh" size={22} color="#2563EB" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading media library…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <MaterialIcons name="error-outline" size={44} color="#EF4444" />
            <Text style={styles.errorTitle}>Could not load photos</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={fetchPhotos}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="photo-library" size={38} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Uploaded Photos Found</Text>
            <Text style={styles.emptySub}>
              You haven’t uploaded photos yet. Use the camera or device gallery to attach a photo.
            </Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(item, index) => item.id || `${item.url}-${index}`}
            numColumns={3}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select this photo"
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [
                  styles.gridItem,
                  pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Image
                  source={{ uri: item.thumbnailUrl || item.url }}
                  style={styles.photoThumb}
                  resizeMode="cover"
                />
                {item.source === 'google' ? (
                  <View style={styles.googleBadge}>
                    <Text style={styles.googleBadgeText}>GBP</Text>
                  </View>
                ) : null}
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    padding: 6,
  },
  refreshBtn: {
    padding: 6,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  gridContent: {
    padding: 8,
  },
  gridItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  googleBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  googleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
