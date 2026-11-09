import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import type { GbpPhoto } from './types';

interface ScheduledPhotosTimelineProps {
  photos?: GbpPhoto[];
  scheduledPhotos?: GbpPhoto[];
  onUploadPress: () => void;
  onSeeAll?: () => void;
  businessName?: string;
  isUploading?: boolean;
}

interface DripSlot {
  id: string;
  dayDateStr: string;
  timeStr: string;
  photoUrl?: string;
  caption?: string;
  platform: string;
  status: 'Scheduled' | 'Published' | 'Pending';
}

export function ScheduledPhotosTimeline({
  photos = [],
  scheduledPhotos = [],
  onUploadPress,
  onSeeAll,
  businessName = 'Delhi Farm',
  isUploading = false,
}: ScheduledPhotosTimelineProps) {
  const [whyModalOpen, setWhyModalOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);

  // Compute current week range (e.g. "9 Nov - 15 Nov, 2026")
  const weekRangeText = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startStr = monday.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const endStr = sunday.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }, []);

  const fallbackBusinessPhotos = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
  ];

  const displayPhotos = photos.length > 0 ? photos.map(p => p.thumbnailUrl || p.url) : fallbackBusinessPhotos;

  // Real scheduled items mapped to Grexa timeline slots
  const timelineSlots: DripSlot[] = useMemo(() => {
    if (scheduledPhotos.length > 0) {
      return scheduledPhotos.map((sp, idx) => {
        const d = sp.scheduledFor ? new Date(sp.scheduledFor) : new Date(Date.now() + (idx + 1) * 86400000);
        return {
          id: sp.id || `slot-${idx}`,
          dayDateStr: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          timeStr: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          photoUrl: sp.thumbnailUrl || sp.url,
          caption: sp.caption || `${businessName} Showcase Photo`,
          platform: 'Google Business Profile',
          status: 'Scheduled',
        };
      });
    }

    // Default slot matching Screenshot 3 benchmark
    return [
      {
        id: 'slot-1',
        dayDateStr: 'Tue, Nov 10',
        timeStr: '9:00 AM',
        photoUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=300&q=80',
        caption: `Lush green lawn spaces and swimming pool view at ${businessName}`,
        platform: 'Google Business Profile',
        status: 'Scheduled',
      },
    ];
  }, [scheduledPhotos, businessName]);

  const scheduledCount = scheduledPhotos.length > 0 ? scheduledPhotos.length : 1;
  const firstScheduledDate = timelineSlots[0]?.dayDateStr || '10 Nov 2026';

  return (
    <View style={styles.container}>
      {/* ── Section 1: Your Photos & Videos (Screenshot 3 Top) ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Photos &amp; Videos</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setViewAllOpen(true)}
          hitSlop={8}
        >
          <Text style={styles.viewAllLink}>View All &gt;</Text>
        </Pressable>
      </View>

      {/* Horizontal Carousel of Portrait Photos */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.portraitPhotosTrack}
      >
        {displayPhotos.map((imgUri, idx) => (
          <View key={`photo-${idx}`} style={styles.portraitCard}>
            <Image
              source={{ uri: imgUri }}
              style={styles.portraitImage}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>

      {/* Primary Action Button: Add Photos & Videos */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add Photos & Videos"
        onPress={onUploadPress}
        disabled={isUploading}
        style={({ pressed }) => [
          styles.addPhotosButton,
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        ]}
      >
        <Text style={styles.addPhotosButtonText}>
          {isUploading ? 'Uploading & Scheduling…' : 'Add Photos & Videos'}
        </Text>
      </Pressable>

      {/* Subtitle Link: Why Publish Photos & Videos? */}
      <Pressable
        accessibilityRole="button"
        onPress={() => setWhyModalOpen(true)}
        style={styles.whyLinkWrapper}
      >
        <Text style={styles.whyLinkText}>Why Publish Photos &amp; Videos?</Text>
      </Pressable>

      {/* Divider */}
      <View style={styles.sectionDivider} />

      {/* ── Section 2: Scheduled Photos & Videos (Screenshot 3 Bottom) ── */}
      <View style={styles.scheduledHeaderBlock}>
        <Text style={styles.sectionTitle}>Scheduled Photos &amp; Videos</Text>
        <Text style={styles.scheduledSubtext}>
          {scheduledCount} scheduled till {firstScheduledDate}
        </Text>
      </View>

      {/* Date Range Bar */}
      <View style={styles.weekBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="calendar-today" size={14} color="#94A3B8" />
          <Text style={styles.weekBannerText}>{weekRangeText}</Text>
        </View>
        <View style={styles.currentWeekPill}>
          <Text style={styles.currentWeekPillText}>Current Week</Text>
        </View>
      </View>

      {/* Vertical Scheduled Timeline Feed */}
      <View style={styles.timelineList}>
        {timelineSlots.map((slot, index) => (
          <View key={slot.id} style={styles.timelineRow}>
            {/* Left Node & Connector */}
            <View style={styles.nodeColumn}>
              <View style={styles.timelineDot} />
              {index < timelineSlots.length - 1 ? <View style={styles.connectorLine} /> : null}
            </View>

            {/* Middle: Day, Time & Scheduled Badge */}
            <View style={styles.timelineInfo}>
              <Text style={styles.slotDayText}>{slot.dayDateStr}</Text>
              <View style={styles.timeBadgeRow}>
                <Text style={styles.slotTimeText}>{slot.timeStr}</Text>
                <View style={styles.scheduledBadge}>
                  <MaterialIcons name="schedule" size={11} color="#D97706" style={{ marginRight: 3 }} />
                  <Text style={styles.scheduledBadgeText}>{slot.status}</Text>
                </View>
              </View>
            </View>

            {/* Right: Square Photo Thumbnail */}
            {slot.photoUrl ? (
              <Image
                source={{ uri: slot.photoUrl }}
                style={styles.slotThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.slotThumbnail, styles.placeholderThumb]}>
                <MaterialIcons name="photo" size={24} color="#64748B" />
              </View>
            )}
          </View>
        ))}
      </View>

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
                <MaterialIcons name="auto-awesome" size={22} color="#3B82F6" />
                <Text style={styles.modalTitle}>Why Publish Photos?</Text>
              </View>
              <Pressable onPress={() => setWhyModalOpen(false)} hitSlop={10} style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color="#0F172A" />
              </Pressable>
            </View>

            <View style={{ paddingVertical: 14, gap: 12 }}>
              <View style={styles.benefitRow}>
                <View style={styles.benefitIconCircle}>
                  <MaterialIcons name="visibility" size={18} color="#009F50" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitHeading}>42% More Discovery Views</Text>
                  <Text style={styles.benefitDesc}>
                    Businesses that publish regular photos receive 42% more requests for directions on Google Maps and 35% more website clicks.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitRow}>
                <View style={styles.benefitIconCircle}>
                  <MaterialIcons name="trending-up" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitHeading}>Continuous Freshness Signal</Text>
                  <Text style={styles.benefitDesc}>
                    Google's algorithm prioritizes active profiles with weekly photo updates, improving your rank in the Local 3-Pack.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitRow}>
                <View style={styles.benefitIconCircle}>
                  <MaterialIcons name="schedule" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitHeading}>Automated Daily Drip</Text>
                  <Text style={styles.benefitDesc}>
                    Upload your photos once. BGOS AI automatically schedules and posts them during peak search hours throughout the week.
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
        <View style={{ flex: 1, backgroundColor: '#0F172A', padding: 16, paddingTop: 48 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>All Photos ({displayPhotos.length})</Text>
            <Pressable onPress={() => setViewAllOpen(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={20} color="#0F172A" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {displayPhotos.map((uri, i) => (
              <Image
                key={`gallery-${i}`}
                source={{ uri }}
                style={{ width: '48%', height: 160, borderRadius: 12, backgroundColor: '#1E293B' }}
                resizeMode="cover"
              />
            ))}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
  },
  portraitPhotosTrack: {
    paddingVertical: 8,
    gap: 12,
  },
  portraitCard: {
    width: 155,
    height: 195,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  addPhotosButton: {
    backgroundColor: '#2563EB', // Vibrant blue matching Benchmark Screenshot 3
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addPhotosButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  whyLinkWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  whyLinkText: {
    color: '#3B82F6',
    fontSize: 12.5,
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 10,
  },
  scheduledHeaderBlock: {
    gap: 3,
  },
  scheduledSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  weekBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#334155',
  },
  weekBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  currentWeekPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentWeekPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  timelineList: {
    gap: 12,
    marginTop: 6,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  nodeColumn: {
    alignItems: 'center',
    width: 20,
    marginRight: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#60A5FA',
    borderWidth: 2,
    borderColor: '#1E3A8A',
  },
  connectorLine: {
    width: 2,
    height: 36,
    backgroundColor: '#334155',
    marginTop: 4,
  },
  timelineInfo: {
    flex: 1,
    gap: 4,
  },
  slotDayText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTimeText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  scheduledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#451A03',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#78350F',
  },
  scheduledBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FBBF24',
  },
  slotThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  benefitDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 17,
    marginTop: 2,
  },
  modalActionBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
