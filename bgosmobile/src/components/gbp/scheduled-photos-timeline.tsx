import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';
import { detectDeviceCountryAndTimezone, getTimeZoneShortLabel } from '../../lib/country-codes';
import type { GbpConnectionState, GbpPhoto } from './types';

type MediaTabKey = 'scheduled' | 'uploaded' | 'unposted';

const VIDEO_URL_RE = /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i;

function isVideoMediaItem(item: GbpPhoto): boolean {
  return item.mediaFormat === 'VIDEO' || VIDEO_URL_RE.test(item.url || '');
}

interface ScheduledPhotosTimelineProps {
  photos?: GbpPhoto[];
  scheduledPhotos?: GbpPhoto[];
  draftPhotos?: GbpPhoto[];
  onUploadPress: () => void;
  onAiCreatePress?: () => void;
  onEditItem?: (item: GbpPhoto) => void;
  onConnectPress?: () => void;
  businessName?: string;
  isConnected?: boolean;
  connectionState?: GbpConnectionState;
  isUploading?: boolean;
  timeZone?: string;
  locale?: string;
}

export function ScheduledPhotosTimeline({
  photos = [],
  scheduledPhotos = [],
  draftPhotos = [],
  onUploadPress,
  onAiCreatePress,
  onEditItem,
  onConnectPress,
  businessName = 'My Business',
  isConnected = true,
  connectionState = 'not_connected',
  isUploading = false,
  timeZone,
  locale,
}: ScheduledPhotosTimelineProps) {
  const [activeTab, setActiveTab] = useState<MediaTabKey>('scheduled');
  const [whyModalOpen, setWhyModalOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);

  const detectedTz = detectDeviceCountryAndTimezone().timeZone;
  const activeTimeZone = timeZone || detectedTz;
  const activeLocale = locale || 'en';

  const weekRangeText = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const startStr = monday.toLocaleDateString(activeLocale, { timeZone: activeTimeZone, day: 'numeric', month: 'short' });
    const endStr = sunday.toLocaleDateString(activeLocale, { timeZone: activeTimeZone, day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }, [activeLocale, activeTimeZone]);

  const galleryPhotos = useMemo(() => {
    return photos.length > 0 ? photos : [...scheduledPhotos, ...draftPhotos];
  }, [photos, scheduledPhotos, draftPhotos]);

  const tabItems =
    activeTab === 'scheduled'
      ? scheduledPhotos
      : activeTab === 'uploaded'
        ? photos
        : draftPhotos;

  const tabs: { key: MediaTabKey; label: string; count: number; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
    { key: 'scheduled', label: 'Scheduled', count: scheduledPhotos.length, icon: 'event-available' },
    { key: 'uploaded', label: 'Uploaded', count: photos.length, icon: 'cloud-done' },
    { key: 'unposted', label: 'Not Posted', count: draftPhotos.length, icon: 'info-outline' },
  ];

  const connectionMessage =
    connectionState === 'select_profile'
      ? 'Select your active Google Business location — uploads save safely in BGOS and publish to the chosen location.'
      : connectionState === 'reconnect_required'
        ? 'Google Business Profile session expired — reconnect Google to resume auto-publishing.'
        : "Google Business Profile isn't connected yet — uploads save safely in BGOS and auto-publish once connected.";

  const connectionCtaLabel =
    connectionState === 'select_profile'
      ? 'Select Profile'
      : connectionState === 'reconnect_required'
        ? 'Reconnect'
        : 'Connect Google';

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <View style={styles.connectBanner}>
          <MaterialIcons name="info-outline" size={16} color={colors.noteText} />
          <Text style={styles.connectBannerText}>{connectionMessage}</Text>
          {onConnectPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={connectionCtaLabel}
              onPress={onConnectPress}
              style={({ pressed }) => [styles.connectBannerCta, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.connectBannerCtaText}>{connectionCtaLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* ── Top Section: Your Photos & Videos ── */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Your Photos &amp; Videos</Text>
          <Text style={styles.sectionSubtitle}>
            {photos.length} live on Google · {scheduledPhotos.length} scheduled
          </Text>
        </View>
        {galleryPhotos.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => setViewAllOpen(true)} hitSlop={8}>
            <Text style={styles.viewAllLink}>View All ({galleryPhotos.length}) &gt;</Text>
          </Pressable>
        ) : null}
      </View>

      {galleryPhotos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.portraitPhotosTrack}
        >
          {galleryPhotos.map((item, idx) => {
            const videoNoThumb = isVideoMediaItem(item) && !item.thumbnailUrl;
            return (
              <Pressable
                key={item.id || `photo-${idx}`}
                onPress={() => {
                  if (item.source === 'queue' && onEditItem) {
                    onEditItem(item);
                  }
                }}
                style={styles.portraitCard}
              >
                {videoNoThumb ? (
                  <View style={[styles.portraitImage, styles.videoTileDark]}>
                    <MaterialIcons name="videocam" size={30} color="#34D399" />
                    <Text style={styles.videoTileLabel}>VIDEO</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: item.thumbnailUrl || item.url }}
                    style={styles.portraitImage}
                    resizeMode="cover"
                    alt={item.title || 'Google Business photo'}
                  />
                )}
                {isVideoMediaItem(item) ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: 'rgba(7,11,45,0.72)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="videocam" size={14} color="#FFFFFF" />
                  </View>
                ) : null}
                <View style={styles.portraitOverlay}>
                  <Text style={styles.portraitTitle} numberOfLines={1}>
                    {item.title || item.category || (item.source === 'google' ? 'Google Live' : 'Queued')}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyHeroCard}>
          <View style={styles.emptyHeroIcon}>
            <MaterialIcons name="add-photo-alternate" size={28} color={colors.brand} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.emptyHeroTitle}>No Google photos synced yet</Text>
            <Text style={styles.emptyHeroSub}>
              Upload real photos or short videos — BGOS AI generates your SEO title, description &amp; tags automatically.
            </Text>
          </View>
        </View>
      )}

      {/* Primary Action Button: Add Photos & Videos */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add Photos & Videos"
        onPress={onUploadPress}
        disabled={isUploading}
        style={({ pressed }) => [
          styles.addPhotosButton,
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
      >
        <MaterialIcons name="add-a-photo" size={18} color="#FFFFFF" />
        <Text style={styles.addPhotosButtonText}>
          {isUploading ? 'Opening Media Picker…' : 'Add Photos & Videos'}
        </Text>
      </Pressable>

      {onAiCreatePress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create AI Business Photo"
          onPress={onAiCreatePress}
          style={({ pressed }) => [
            styles.aiCreateButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
        >
          <MaterialIcons name="auto-awesome" size={17} color="#6D28D9" />
          <Text style={styles.aiCreateButtonText}>Create AI Photo from Business &amp; Previous Photos</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setWhyModalOpen(true)}
        style={styles.whyLinkWrapper}
      >
        <Text style={styles.whyLinkText}>Why Publish Photos &amp; Videos?</Text>
      </Pressable>

      <View style={styles.sectionDivider} />

      {/* ── Segmented Tabs: Scheduled / Uploaded / Not Posted ── */}
      <View style={styles.segmentedBar} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
            >
              <MaterialIcons
                name={tab.icon}
                size={14}
                color={active ? '#FFFFFF' : colors.muted}
              />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'scheduled' ? (
        <View style={styles.weekBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="calendar-today" size={14} color={colors.muted} />
            <Text style={styles.weekBannerText}>{weekRangeText}</Text>
          </View>
          <View style={styles.currentWeekPill}>
            <Text style={styles.currentWeekPillText}>
              Local Schedule ({getTimeZoneShortLabel(activeTimeZone)})
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Queue / Uploaded / Not Posted List ── */}
      {tabItems.length === 0 ? (
        <View style={styles.emptyStateCard}>
          <MaterialIcons
            name={activeTab === 'scheduled' ? 'schedule' : activeTab === 'uploaded' ? 'photo-library' : 'bookmark-border'}
            size={30}
            color={colors.muted}
          />
          <Text style={styles.emptyStateTitle}>
            {activeTab === 'scheduled'
              ? 'No Media Scheduled Yet'
              : activeTab === 'uploaded'
                ? 'No Google Media Found'
                : 'No Drafts or Unposted Media'}
          </Text>
          <Text style={styles.emptyStateDesc}>
            {activeTab === 'scheduled'
              ? 'Tap “Add Photos & Videos” above to upload media with AI title & tags on your local schedule.'
              : activeTab === 'uploaded'
                ? 'Photos live on your Google Business Profile will show here.'
                : 'Media saved as Draft or awaiting Google connection appears here.'}
          </Text>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {tabItems.map((item, index) => {
            const rawDate = item.scheduledFor || item.createdAt;
            const parsedDate = rawDate ? new Date(rawDate) : null;
            const dateValid = Boolean(parsedDate && !isNaN(parsedDate.getTime()));
            const dayDateStr = dateValid
              ? parsedDate!.toLocaleDateString(activeLocale, {
                  timeZone: activeTimeZone,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              : 'Draft';
            const timeStr = dateValid
              ? parsedDate!.toLocaleTimeString(activeLocale, {
                  timeZone: activeTimeZone,
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })
              : 'Not Scheduled';
            const isEditable = item.source === 'queue' && Boolean(onEditItem);

            return (
              <Pressable
                key={item.id || `slot-${index}`}
                disabled={!isEditable}
                onPress={() => isEditable && onEditItem?.(item)}
                style={styles.timelineRow}
              >
                {isVideoMediaItem(item) && !item.thumbnailUrl ? (
                  <View style={[styles.slotThumbnail, styles.videoTileDark]}>
                    <MaterialIcons name="videocam" size={24} color="#34D399" />
                    <Text style={styles.videoTileLabel}>VIDEO</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: item.thumbnailUrl || item.url }}
                    style={styles.slotThumbnail}
                    resizeMode="cover"
                    alt={item.title || 'Scheduled media thumbnail'}
                  />
                )}

                <View style={styles.timelineInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <Text style={styles.slotDayText} numberOfLines={1}>
                      {item.title || `${businessName} ${item.mediaFormat === 'VIDEO' ? 'Video' : 'Photo'}`}
                    </Text>
                    {item.category ? (
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{item.category}</Text>
                      </View>
                    ) : null}
                  </View>

                  {item.caption ? (
                    <Text style={styles.slotCaptionText} numberOfLines={2}>
                      {item.caption}
                    </Text>
                  ) : null}

                  {Array.isArray(item.tags) && item.tags.length > 0 ? (
                    <View style={styles.tagMiniRow}>
                      {item.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.tagMiniPill}>
                          <Text style={styles.tagMiniText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.timeBadgeRow}>
                    <Text style={styles.slotTimeText}>
                      {activeTab === 'scheduled' ? `${dayDateStr} · ${timeStr}` : dayDateStr}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        activeTab === 'uploaded'
                          ? styles.uploadedBadge
                          : activeTab === 'unposted'
                            ? styles.unpostedBadge
                            : styles.scheduledBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          activeTab === 'uploaded'
                            ? { color: colors.success }
                            : activeTab === 'unposted'
                              ? { color: colors.danger }
                              : { color: '#B45309' },
                        ]}
                      >
                        {activeTab === 'uploaded'
                          ? 'Published'
                          : activeTab === 'unposted'
                            ? 'Not Posted'
                            : 'Scheduled'}
                      </Text>
                    </View>
                    {isEditable ? (
                      <Text style={styles.editHintLink}>Edit ✎</Text>
                    ) : null}
                  </View>

                  {item.failureReason ? (
                    <Text style={styles.failureText} numberOfLines={2}>
                      {item.failureReason}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── Modal: Why Publish Photos & Videos? ── */}
      <Modal
        visible={whyModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setWhyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="auto-awesome" size={22} color={colors.brand} />
                <Text style={styles.modalTitle}>Why Publish Photos &amp; Videos?</Text>
              </View>
              <Pressable onPress={() => setWhyModalOpen(false)} hitSlop={10} style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>

            <View style={{ paddingVertical: 14, gap: 12 }}>
              <View style={styles.benefitRow}>
                <View style={styles.benefitIconCircle}>
                  <MaterialIcons name="visibility" size={18} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitHeading}>More Google Maps Discovery</Text>
                  <Text style={styles.benefitDesc}>
                    Active profiles with recent customer-relevant photos and videos get more direction taps, calls, and clicks.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitRow}>
                <View style={styles.benefitIconCircle}>
                  <MaterialIcons name="auto-awesome" size={18} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitHeading}>AI Title, Tags &amp; SEO Descriptions</Text>
                  <Text style={styles.benefitDesc}>
                    Every upload gets an editable local-SEO title, keyword tags, and Google category tailored to {businessName}.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitRow}>
                <View style={styles.benefitIconCircle}>
                  <MaterialIcons name="schedule" size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitHeading}>Hands-Free Scheduled Publishing</Text>
                  <Text style={styles.benefitDesc}>
                    Upload in batches once and let BGOS publish them steadily so your profile stays fresh every week.
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setWhyModalOpen(false);
                onUploadPress();
              }}
              style={styles.modalActionBtn}
            >
              <Text style={styles.modalActionBtnText}>Add Photos &amp; Videos Now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Modal: View All Gallery ── */}
      <Modal
        visible={viewAllOpen}
        animationType="slide"
        onRequestClose={() => setViewAllOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, paddingTop: 48 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>
              All Media ({galleryPhotos.length})
            </Text>
            <Pressable onPress={() => setViewAllOpen(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {galleryPhotos.map((item, i) =>
              isVideoMediaItem(item) && !item.thumbnailUrl ? (
                <View
                  key={item.id || `gallery-${i}`}
                  style={[styles.videoTileDark, { width: '48%', height: 160, borderRadius: 12 }]}
                >
                  <MaterialIcons name="videocam" size={32} color="#34D399" />
                  <Text style={styles.videoTileLabel}>VIDEO</Text>
                  {item.title ? (
                    <Text style={{ color: '#CBD5E1', fontSize: 11, fontWeight: '700', paddingHorizontal: 8 }} numberOfLines={1}>
                      {item.title}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Image
                  key={item.id || `gallery-${i}`}
                  source={{ uri: item.thumbnailUrl || item.url }}
                  style={{ width: '48%', height: 160, borderRadius: 12, backgroundColor: colors.soft }}
                  resizeMode="cover"
                  alt={item.title || 'Gallery photo'}
                />
              ),
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 24,
  },
  connectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.note,
    borderWidth: 1,
    borderColor: colors.noteBorder,
    borderRadius: 12,
    padding: 12,
  },
  connectBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.noteText,
    fontWeight: '600',
    lineHeight: 17,
  },
  connectBannerCta: {
    backgroundColor: colors.noteText,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  connectBannerCtaText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },
  viewAllLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.brand,
  },
  portraitPhotosTrack: {
    paddingVertical: 6,
    gap: 10,
  },
  portraitCard: {
    width: 145,
    height: 175,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  portraitOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7,11,45,0.58)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  portraitTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
  },
  emptyHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHeroTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.ink,
  },
  emptyHeroSub: {
    fontSize: 11.5,
    color: colors.muted,
    lineHeight: 16,
  },
  addPhotosButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  addPhotosButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  whyLinkWrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  whyLinkText: {
    color: colors.brandDark,
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 4,
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: colors.brand,
  },
  segmentText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.muted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  weekBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.line,
  },
  weekBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  currentWeekPill: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentWeekPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandDark,
  },
  emptyStateCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  emptyStateDesc: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 17,
  },
  timelineList: {
    gap: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  slotThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: colors.soft,
  },
  timelineInfo: {
    flex: 1,
    gap: 4,
  },
  slotDayText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.ink,
  },
  catBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  catBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.muted,
  },
  slotCaptionText: {
    fontSize: 11.5,
    color: colors.muted,
    lineHeight: 16,
  },
  tagMiniRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagMiniPill: {
    backgroundColor: colors.brandSoft,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandDark,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  slotTimeText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  scheduledBadge: {
    backgroundColor: colors.note,
    borderColor: colors.noteBorder,
  },
  uploadedBadge: {
    backgroundColor: colors.successSoft,
    borderColor: '#A7F3D0',
  },
  unpostedBadge: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#FECDD3',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  editHintLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand,
  },
  failureText: {
    fontSize: 10.5,
    color: colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7,11,45,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: colors.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  benefitDesc: {
    fontSize: 11.5,
    color: colors.muted,
    lineHeight: 17,
    marginTop: 2,
  },
  modalActionBtn: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  videoTileDark: {
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  videoTileLabel: {
    color: '#E2E8F0',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  aiCreateButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCreateButtonText: {
    color: '#6D28D9',
    fontSize: 13,
    fontWeight: '800',
  },
});
