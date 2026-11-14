import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';

interface ReviewGoalCardProps {
  thisWeekCount?: number;
  weeklyTarget?: number;
  onAddCustomer: () => void;
  onBulkUpload: () => void;
  onWatchVideo?: () => void;
}

export function ReviewGoalCard({
  thisWeekCount = 2,
  weeklyTarget = 3,
  onAddCustomer,
  onBulkUpload,
  onWatchVideo,
}: ReviewGoalCardProps) {
  const remaining = Math.max(0, weeklyTarget - thisWeekCount);
  const percent = Math.min(100, Math.round((thisWeekCount / Math.max(1, weeklyTarget)) * 100));

  return (
    <View style={styles.card}>
      {/* Top Title & Subtitle */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>Turn your customers into Google reviews</Text>
          <Text style={styles.subtitle}>
            {remaining === 0
              ? '🎉 Target achieved! Keep collecting reviews to dominate local search.'
              : `Let's get going! ${remaining} more to hit your weekly goal.`}
          </Text>
        </View>

        {onWatchVideo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Watch Review Tutorial Video"
            onPress={onWatchVideo}
            style={styles.watchPill}
          >
            <MaterialIcons name="play-circle-fill" size={15} color="#2563EB" />
            <Text style={styles.watchPillText}>Watch Guide</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Goal Meter */}
      <View style={styles.meterCard}>
        <View style={styles.meterHeader}>
          <Text style={styles.meterLabel}>Get Reviews from Your Customers</Text>
          <View style={styles.targetBadge}>
            <Text style={styles.targetBadgeText}>
              {thisWeekCount}/{weeklyTarget}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>

        <Text style={styles.meterSubtext}>
          {thisWeekCount} reviews collected this week · Target: {weeklyTarget}
        </Text>
      </View>

      {/* Two Action Buttons: Add Customer & Bulk Upload */}
      <View style={styles.buttonsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Customer"
          onPress={onAddCustomer}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
        >
          <MaterialIcons name="person-add" size={17} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Add Customer</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bulk Upload"
          onPress={onBulkUpload}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
        >
          <MaterialIcons name="upload-file" size={17} color="#2563EB" />
          <Text style={styles.secondaryBtnText}>Bulk Upload</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  watchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  watchPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  meterCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    gap: 8,
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  targetBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  targetBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  track: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#009F50',
    borderRadius: 4,
  },
  meterSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0284C7',
  },
});
