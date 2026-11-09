import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';

export interface SeoUpdateMilestone {
  id: string;
  title: string;
  badge?: string;
  bullets: string[];
}

const DEFAULT_MILESTONES: SeoUpdateMilestone[] = [
  {
    id: 'm1',
    title: 'AI Replies Synced for Un-replied Reviews',
    badge: 'Active',
    bullets: ['Monitors Google Business Profile reviews and drafts brand-aligned replies'],
  },
  {
    id: 'm2',
    title: 'GBP Performance Telemetry Synced',
    badge: 'Active',
    bullets: [
      'Tracks Search views, Maps views, Calls, Directions, and Website clicks',
      'Keeps profile completion & weekly targets visible on Home',
    ],
  },
  {
    id: 'm3',
    title: 'Review Reply Guidelines & Tone Ready',
    badge: 'Active',
    bullets: [
      'Uses business brand context & tracked local SEO keywords in replies',
      'Respects original Google review timestamps for accurate weekly metrics',
    ],
  },
  {
    id: 'm4',
    title: 'GBP Post Topics & Autopilot Calendar',
    badge: 'Active',
    bullets: [
      'Curates local offers, service highlights, and update posts tailored to your business',
      'Supports instant publishing and scheduled posting queues',
    ],
  },
  {
    id: 'm5',
    title: 'Local SEO Keywords Identified',
    badge: 'Active',
    bullets: [
      'Uses tracked search terms & city keywords across posts, replies, and media tags',
    ],
  },
  {
    id: 'm6',
    title: 'Bulk Review Invites (5/Day)',
    badge: 'Active',
    bullets: [
      'Staggers up to 5 customer invites/day from CSV uploads, pasted lists, or CRM contacts',
    ],
  },
  {
    id: 'm7',
    title: 'AI Media Title, SEO Description & Tagging',
    badge: 'Active',
    bullets: [
      'Generates editable title, local SEO description, tags, and GBP category for every photo/video upload',
    ],
  },
  {
    id: 'm8',
    title: 'Scheduled Media Publishing Queue',
    badge: 'Active',
    bullets: [
      'Publishes queued media daily or weekly in your local timezone to keep your Google listing fresh',
    ],
  },
];

interface AiAgentUpdatesSheetProps {
  visible: boolean;
  onClose: () => void;
  businessName?: string;
  milestones?: SeoUpdateMilestone[];
}

export function AiAgentUpdatesSheet({
  visible,
  onClose,
  businessName = 'Google Business Profile',
  milestones = DEFAULT_MILESTONES,
}: AiAgentUpdatesSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close SEO Updates"
            onPress={onClose}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={styles.agentAvatar}>
                <MaterialIcons name="smart-toy" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {businessName}
                </Text>
                <Text style={styles.headerSubtitle}>GBP AI Agent Optimization Engine</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Continuous Monitoring Banner */}
        <View style={styles.banner}>
          <MaterialIcons name="auto-awesome" size={18} color={colors.aiPurple} />
          <Text style={styles.bannerText}>
            Continuously monitoring &amp; optimizing your Google Business Profile
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionHeading}>ACTIVE AI AGENT CAPABILITIES</Text>

          {milestones.map((milestone) => (
            <View key={milestone.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="check-circle" size={20} color={colors.brand} />
                </View>
                <Text style={styles.cardTitle}>{milestone.title}</Text>
                {milestone.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{milestone.badge}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.bulletsContainer}>
                {milestone.bullets.map((bullet, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <MaterialIcons name="check" size={14} color={colors.brand} style={{ marginTop: 2 }} />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.aiPurpleSoft,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.aiPurple,
    lineHeight: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandDark,
    letterSpacing: 0.7,
    marginVertical: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCircle: {
    marginTop: 1,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 18,
  },
  badge: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brandDark,
  },
  bulletsContainer: {
    paddingLeft: 30,
    gap: 5,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
});
