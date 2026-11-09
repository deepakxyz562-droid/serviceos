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
    title: 'AI Replies Sent to All Past Un-replied Reviews',
    badge: '⚡ New',
    bullets: ['Synced and replied to all past un-replied reviews'],
  },
  {
    id: 'm2',
    title: 'GBP Ranking Benchmark Data Collection Completed',
    badge: '⚡ New',
    bullets: [
      'Stored Views, Calls, Directions, etc. as the benchmark',
      'Prepared the profile for future optimisations by the agent',
    ],
  },
  {
    id: 'm3',
    title: 'AI Replies to GBP Reviews Enabled',
    badge: '⚡ New',
    bullets: [
      'Defined review reply guidelines',
      'Enabled periodic review sync',
      'Enabled auto-replies to new un-replied reviews',
    ],
  },
  {
    id: 'm4',
    title: 'GBP Post Topics Generated',
    badge: '⚡ New',
    bullets: [
      'Generated an in-depth Business Fingerprint',
      'Curated relevant post topics',
    ],
  },
  {
    id: 'm5',
    title: 'GBP Best SEO Keywords Identified',
    badge: '⚡ New',
    bullets: [
      'Analysed business details & shared information',
      'Identified missing keywords',
      'Selected the most suitable keywords',
    ],
  },
  {
    id: 'm6',
    title: 'GBP Ranking Benchmark Data Collection Started',
    badge: '⚡ New',
    bullets: [
      'Generated an internal rank report for chosen keywords',
      'Collected GBP performance data to measure against',
      'Identified opportunities for growth',
    ],
  },
  {
    id: 'm7',
    title: 'GBP Review Request Through WhatsApp Configured',
    badge: '⚡ New',
    bullets: ['Enabled review requests through WhatsApp'],
  },
  {
    id: 'm8',
    title: 'AI Auto-Publishing Enabled for Photos & Videos',
    badge: '⚡ New',
    bullets: [
      'Enabled media publishing to GBP',
      'Configured an optimal media publishing schedule',
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
            <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.agentAvatar}>
                <MaterialIcons name="smart-toy" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {businessName}
                </Text>
                <Text style={styles.headerSubtitle}>AI Agent Optimization Engine</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Continuous Monitoring Banner */}
        <View style={styles.banner}>
          <MaterialIcons name="auto-awesome" size={18} color="#8B5CF6" />
          <Text style={styles.bannerText}>
            Continuously Monitoring & Improving Your Google Business Profile
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Section Heading */}
          <Text style={styles.sectionHeading}>PROFILE SEO UPDATES</Text>

          {/* Milestone Cards */}
          {milestones.map((milestone) => (
            <View key={milestone.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                </View>
                <Text style={styles.cardTitle}>{milestone.title}</Text>
                {milestone.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{milestone.badge}</Text>
                  </View>
                ) : null}
              </View>

              {/* Bullets */}
              <View style={styles.bulletsContainer}>
                {milestone.bullets.map((bullet, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <MaterialIcons name="check" size={14} color="#059669" style={{ marginTop: 2 }} />
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
    backgroundColor: '#0F172A', // Dark mode matching benchmark Screenshot 6
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#3730A3',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#C7D2FE',
    lineHeight: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
    marginVertical: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    gap: 10,
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
    color: '#F8FAFC',
    lineHeight: 18,
  },
  badge: {
    backgroundColor: '#4C1D95',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E9D5FF',
  },
  bulletsContainer: {
    paddingLeft: 30,
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
});
