import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';
import { useMediaUploadStore, type MediaUploadJob } from '../../stores/media-upload-store';

export function GlobalUploadBanner({ bottomOffset = 74 }: { bottomOffset?: number }) {
  const router = useRouter();
  const jobs = useMediaUploadStore((s) => s.jobs);
  const dismissJob = useMediaUploadStore((s) => s.dismissJob);
  const retryJob = useMediaUploadStore((s) => s.retryJob);

  const visibleJob: MediaUploadJob | undefined =
    jobs.find((j) => j.status === 'uploading' || j.status === 'saving') ||
    jobs.find((j) => j.status === 'failed') ||
    jobs.find((j) => j.status === 'completed');

  if (!visibleJob) return null;

  const isWorking = visibleJob.status === 'uploading' || visibleJob.status === 'saving';
  const isCompleted = visibleJob.status === 'completed';
  const isFailed = visibleJob.status === 'failed';

  const handleOpenMedia = () => {
    const qs = new URLSearchParams({
      ...(visibleJob.mediaId ? { mediaId: visibleJob.mediaId, photoId: visibleJob.mediaId } : {}),
      tab: visibleJob.targetTab,
    }).toString();
    dismissJob(visibleJob.id);
    router.push(`/(tabs)/photos?${qs}` as any);
  };

  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <Pressable
        disabled={!isCompleted}
        onPress={isCompleted ? handleOpenMedia : undefined}
        style={[
          styles.card,
          isCompleted && styles.cardDone,
          isFailed && styles.cardFailed,
        ]}
      >
        <View style={styles.iconBox}>
          {isWorking ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : isCompleted ? (
            <MaterialIcons name="check-circle" size={20} color={colors.success} />
          ) : (
            <MaterialIcons name="error-outline" size={20} color={colors.danger} />
          )}
        </View>

        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {isWorking
              ? `${visibleJob.status === 'saving' ? 'Finalizing' : 'Uploading'} ${visibleJob.hasVideo ? 'Video' : 'Media'}… ${visibleJob.progress}%`
              : isCompleted
                ? 'Upload Complete · Tap to View'
                : 'Upload Failed'}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {isFailed
              ? visibleJob.error || 'Tap Retry to try again'
              : visibleJob.config.title || visibleJob.label}
          </Text>
          {isWorking ? (
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(6, Math.min(100, visibleJob.progress))}%` }]} />
            </View>
          ) : null}
        </View>

        {isCompleted ? (
          <Pressable onPress={handleOpenMedia} style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View</Text>
          </Pressable>
        ) : null}

        {isFailed ? (
          <Pressable onPress={() => retryJob(visibleJob.id)} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        ) : null}

        {!isWorking ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss upload status"
            onPress={() => dismissJob(visibleJob.id)}
            hitSlop={8}
            style={styles.closeBtn}
          >
            <MaterialIcons name="close" size={16} color={colors.muted} />
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 90,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  cardDone: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  cardFailed: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.ink,
  },
  sub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  viewBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  retryBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
});
