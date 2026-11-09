import React from 'react';
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../ui';
import type { GbpPhoto } from './types';

const VIDEO_URL_RE = /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i;

export function isVideoMediaAsset(item?: GbpPhoto | null): boolean {
  if (!item) return false;
  return item.mediaFormat === 'VIDEO' || VIDEO_URL_RE.test(item.url || '');
}

export function MediaPreviewModal({
  item,
  visible,
  onClose,
  onEdit,
  businessName = 'My Business',
}: {
  item: GbpPhoto | null;
  visible: boolean;
  onClose: () => void;
  onEdit?: (item: GbpPhoto) => void;
  businessName?: string;
}) {
  if (!item) return null;

  const isVideo = isVideoMediaAsset(item);
  const canEdit = item.source === 'queue' && Boolean(onEdit);
  const statusLabel =
    item.source === 'google'
      ? 'Published on Google'
      : item.status === 'scheduled' || item.status === 'publishing'
        ? 'Scheduled'
        : 'Draft (Not Posted)';

  const openVideoPlayer = async () => {
    if (!item.url) return;
    try {
      await WebBrowser.openBrowserAsync(item.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
    } catch {
      await Linking.openURL(item.url).catch(() => {});
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close media preview"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={8}
          >
            <MaterialIcons name="close" size={20} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {item.title || `${businessName} ${isVideo ? 'Video' : 'Photo'}`}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {statusLabel}
              {item.category ? ` · ${item.category}` : ''}
            </Text>
          </View>
          {canEdit ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                onEdit?.(item);
              }}
              style={styles.editTopBtn}
            >
              <MaterialIcons name="edit" size={14} color={colors.brandDark} />
              <Text style={styles.editTopText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.mediaBox}>
            {isVideo ? (
              Platform.OS === 'web' ? (
                React.createElement('video', {
                  src: item.url,
                  poster: item.thumbnailUrl,
                  controls: true,
                  playsInline: true,
                  autoPlay: true,
                  style: {
                    width: '100%',
                    height: 300,
                    backgroundColor: '#000000',
                    borderRadius: 14,
                    objectFit: 'contain',
                  },
                })
              ) : (
                <Pressable onPress={() => void openVideoPlayer()} style={styles.nativeVideoFrame}>
                  {item.thumbnailUrl ? (
                    <Image
                      source={{ uri: item.thumbnailUrl }}
                      style={styles.nativePosterImg}
                      resizeMode="cover"
                      alt={item.title || 'Video thumbnail'}
                    />
                  ) : null}
                  <View style={styles.nativePlayOverlay}>
                    <View style={styles.playCircle}>
                      <MaterialIcons name="play-arrow" size={34} color="#FFFFFF" />
                    </View>
                    <Text style={styles.playHintTitle}>Tap to Play Video</Text>
                    <Text style={styles.playHintSub}>Streams HD playback in your device viewer</Text>
                  </View>
                </Pressable>
              )
            ) : (
              <Image
                source={{ uri: item.url }}
                style={styles.photoPreviewImg}
                resizeMode="contain"
                alt={item.title || item.caption || 'Business media'}
              />
            )}
          </View>

          {isVideo ? (
            <Pressable onPress={() => void openVideoPlayer()} style={styles.openPlayerBtn}>
              <MaterialIcons name="play-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.openPlayerBtnText}>Play Video Fullscreen</Text>
            </Pressable>
          ) : null}

          <View style={styles.metaCard}>
            <View style={styles.metaTopRow}>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{statusLabel}</Text>
              </View>
              {item.scheduledFor ? (
                <Text style={styles.dateText}>
                  Scheduled: {new Date(item.scheduledFor).toLocaleString()}
                </Text>
              ) : null}
            </View>

            {item.title ? <Text style={styles.metaTitle}>{item.title}</Text> : null}
            {item.description || item.caption ? (
              <Text style={styles.metaDesc}>{item.description || item.caption}</Text>
            ) : null}

            {Array.isArray(item.tags) && item.tags.length > 0 ? (
              <View style={styles.tagsWrap}>
                {item.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {item.failureReason ? (
              <View style={styles.errBanner}>
                <MaterialIcons name="warning-amber" size={15} color={colors.danger} />
                <Text style={styles.errText}>{item.failureReason}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  headerSub: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },
  editTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  editTopText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brandDark,
  },
  body: {
    padding: 16,
    gap: 14,
  },
  mediaBox: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.line,
  },
  photoPreviewImg: {
    width: '100%',
    height: 320,
    backgroundColor: '#0F172A',
  },
  nativeVideoFrame: {
    width: '100%',
    height: 260,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativePosterImg: {
    ...StyleSheet.absoluteFill,
    opacity: 0.72,
  },
  nativePlayOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
  },
  playCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(0, 159, 80, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playHintTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  playHintSub: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '600',
  },
  openPlayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    height: 44,
    borderRadius: 12,
  },
  openPlayerBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 8,
  },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPill: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandDark,
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.muted,
  },
  metaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  metaDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.ink,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandDark,
  },
  errBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    padding: 8,
  },
  errText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.danger,
  },
});
