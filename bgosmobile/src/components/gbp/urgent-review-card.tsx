import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';
import {
  detectDeviceCountryAndTimezone,
  getCountryByCode,
  type CountryItem,
} from '../../lib/country-codes';

interface UrgentReviewCardProps {
  businessName: string;
  reviewUrl: string;
  totalReviews?: number;
  lastReviewDate?: string | Date | null;
  thisWeekCount?: number;
  weeklyTarget?: number;
  countryCode?: string;
  onOpenQr?: () => void;
  onOpenBulk?: () => void;
  onOpenSeoUpdates?: () => void;
}

export function UrgentReviewCard({
  businessName,
  reviewUrl,
  totalReviews = 0,
  lastReviewDate,
  thisWeekCount = 0,
  weeklyTarget = 12,
  countryCode,
  onOpenQr,
  onOpenBulk,
  onOpenSeoUpdates,
}: UrgentReviewCardProps) {
  const defaultCountry: CountryItem = useMemo(
    () => (countryCode ? getCountryByCode(countryCode) : detectDeviceCountryAndTimezone().country),
    [countryCode],
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'polite' | 'hinglish' | 'reward'>('polite');
  const [isSending, setIsSending] = useState(false);

  const TEMPLATES = [
    { id: 'polite' as const, label: '⭐ Polite 30s' },
    { id: 'hinglish' as const, label: '🤝 Hinglish' },
    { id: 'reward' as const, label: '🎁 Surprise Gift' },
  ];

  // Calculate true days since last review (null when no review timestamp exists)
  const daysAgo = useMemo<number | null>(() => {
    if (!lastReviewDate) return null;
    const reviewTime = new Date(lastReviewDate).getTime();
    if (isNaN(reviewTime)) return null;
    const diffDays = Math.floor((Date.now() - reviewTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [lastReviewDate]);

  const isHealthyWeek = thisWeekCount >= 1 || (daysAgo !== null && daysAgo <= 7);
  const progressPercent = Math.min(
    100,
    Math.max(thisWeekCount > 0 ? 6 : 0, Math.round((thisWeekCount / Math.max(1, weeklyTarget)) * 100)),
  );

  // Universal WhatsApp + SMS single review invite
  const handleSendLink = async () => {
    const trimmed = phoneNumber.trim();
    const cleanPhone = trimmed.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      Alert.alert('Phone Number Required', 'Please enter a valid customer phone number.');
      return;
    }

    setIsSending(true);
    try {
      let message = `Hi! Thank you for choosing ${businessName}. We’d truly appreciate your feedback! Could you take 30 seconds to leave us a quick Google review? Tap here: ${reviewUrl}`;
      if (selectedTemplate === 'hinglish') {
        message = `Namaste! ${businessName} me aane ke liye shukriya. Agar aapko hamari service pasand aayi toh please Google par apna 5-star review dekar support karein: ${reviewUrl}`;
      } else if (selectedTemplate === 'reward') {
        message = `Hi! We loved serving you at ${businessName}. Review us on Google and show this on your next visit to get a special thank-you offer! ${reviewUrl}`;
      }

      const fullPhone =
        trimmed.startsWith('+')
          ? cleanPhone
          : cleanPhone.length === defaultCountry.digits || cleanPhone.length === 10
            ? `${defaultCountry.callingCode}${cleanPhone}`
            : cleanPhone;
      const universalWaUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;

      await Linking.openURL(universalWaUrl);
      setPhoneNumber('');
    } catch {
      try {
        const cleanDigits = phoneNumber.replace(/[^0-9]/g, '');
        const message = `Hi! Thank you for choosing ${businessName}. Please leave us a quick Google review: ${reviewUrl}`;
        await Linking.openURL(`sms:${cleanDigits}?body=${encodeURIComponent(message)}`);
      } catch {
        Alert.alert('Unable to launch messenger', 'Could not open WhatsApp or SMS. Please check device permissions.');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* ── Top Header: This Week's Reviews & Weekly Goal ── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.headerTitle}>This Week&apos;s Reviews</Text>
          <Text style={styles.headerSubtitle}>
            {thisWeekCount > 0
              ? `${thisWeekCount} received this week · ${totalReviews} total`
              : totalReviews > 0
                ? `0 received in last 7 days · ${totalReviews} total`
                : 'No Google reviews synced yet'}
          </Text>
        </View>
        <View style={[styles.targetBadge, isHealthyWeek && styles.targetBadgeHealthy]}>
          <Text style={[styles.targetBadgeText, isHealthyWeek && styles.targetBadgeTextHealthy]}>
            {thisWeekCount}/{weeklyTarget}
          </Text>
        </View>
      </View>

      {/* ── Visual Weekly Goal Progress Bar ── */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: isHealthyWeek ? colors.brand : '#F59E0B',
            },
          ]}
        />
      </View>

      {/* ── Status Callout (Accurate timestamp, clean light surface) ── */}
      <View style={[styles.alertRow, isHealthyWeek && styles.alertRowHealthy]}>
        <View style={[styles.iconCircle, isHealthyWeek && styles.iconCircleHealthy]}>
          <MaterialIcons
            name={isHealthyWeek ? 'trending-up' : daysAgo === null ? 'star-outline' : 'schedule'}
            size={15}
            color={isHealthyWeek ? colors.brandDark : '#B45309'}
          />
        </View>
        <Text style={[styles.alertText, isHealthyWeek && styles.alertTextHealthy]}>
          {daysAgo === null ? (
            'Invite recent customers now — steady weekly reviews boost local Google Maps ranking.'
          ) : isHealthyWeek ? (
            <>
              Last review received{' '}
              <Text style={styles.alertHighlightHealthy}>
                {daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`}
              </Text>
              . Keep requesting reviews toward your {weeklyTarget}/week target.
            </>
          ) : (
            <>
              Last review was{' '}
              <Text style={styles.alertHighlight}>{daysAgo} days ago</Text>. Regular weekly reviews keep your Google ranking ahead of nearby competitors.
            </>
          )}
        </Text>
      </View>

      {/* ── Bulk Review Automation Banner (5/day) ── */}
      <View style={styles.bannerContainer}>
        <View style={styles.bannerTopRow}>
          <Text style={styles.bannerHeading}>Get Reviews Every Day, Automatically</Text>
          <View style={styles.cadencePill}>
            <Text style={styles.cadencePillText}>5 / day</Text>
          </View>
        </View>
        <Text style={styles.bannerSubtext}>
          Upload a CSV, paste numbers, or pick CRM contacts — BGOS queues and staggers 5 invites/day automatically.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Schedule Review Messages in Bulk"
          onPress={onOpenBulk}
          style={({ pressed }) => [styles.bulkButton, pressed && { opacity: 0.9 }]}
        >
          <MaterialIcons name="schedule-send" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.bulkButtonText}>Schedule Review Messages in Bulk</Text>
        </Pressable>
      </View>

      {/* ── Message Style Chips ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {TEMPLATES.map((tpl) => {
          const isActive = selectedTemplate === tpl.id;
          return (
            <Pressable
              key={tpl.id}
              onPress={() => setSelectedTemplate(tpl.id)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 14,
                backgroundColor: isActive ? colors.brandSoft : colors.background,
                borderWidth: 1,
                borderColor: isActive ? colors.brand : colors.line,
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: isActive ? '700' : '600',
                  color: isActive ? colors.brandDark : colors.muted,
                }}
              >
                {tpl.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Direct Customer Phone Input ── */}
      <View style={styles.inputContainer}>
        <View style={styles.countryPill}>
          <Text style={styles.countryPillText}>
            {defaultCountry.flag} +{defaultCountry.callingCode}
          </Text>
        </View>
        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Customer Phone Number"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          style={styles.textInput}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Alert.alert(
              '1-Tap or Bulk Review Requests',
              'Enter one mobile number here for an instant WhatsApp review invite, or tap "Schedule Review Messages in Bulk" above to upload CSV/paste many customers at 5/day.',
            );
          }}
          hitSlop={8}
          style={{ paddingRight: 10 }}
        >
          <MaterialIcons name="help-outline" size={18} color={colors.brand} />
        </Pressable>
      </View>

      {/* ── Action Buttons: Send Review Link & Review QR ── */}
      <View style={styles.actionButtonsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send Review Link"
          onPress={handleSendLink}
          disabled={isSending}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <MaterialIcons name="send" size={16} color={colors.brandDark} style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>Send Review Link</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Review QR"
          onPress={onOpenQr}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <MaterialIcons name="qr-code-2" size={16} color={colors.brandDark} style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>Review QR</Text>
        </Pressable>
      </View>

      {/* ── Footer Link: AI Agent Actions ── */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Weekly Goal: {thisWeekCount}/{weeklyTarget} reviews</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSeoUpdates}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={styles.watchVideosLink}>See AI Agent Actions</Text>
          <MaterialIcons name="auto-awesome" size={15} color={colors.brand} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
    marginVertical: 4,
    shadowColor: '#070B2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: colors.muted,
    fontWeight: '500',
  },
  targetBadge: {
    backgroundColor: colors.note,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.noteBorder,
  },
  targetBadgeHealthy: {
    backgroundColor: colors.brandSoft,
    borderColor: '#A7F3D0',
  },
  targetBadgeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#B45309',
  },
  targetBadgeTextHealthy: {
    color: colors.brandDark,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#EEF2F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.note,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.noteBorder,
  },
  alertRowHealthy: {
    backgroundColor: colors.brandSoft,
    borderColor: '#C6F6D5',
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  iconCircleHealthy: {
    backgroundColor: '#D1FAE5',
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  alertTextHealthy: {
    color: colors.brandDark,
  },
  alertHighlight: {
    color: '#92400E',
    fontWeight: '800',
  },
  alertHighlightHealthy: {
    color: colors.brandDark,
    fontWeight: '800',
  },
  bannerContainer: {
    backgroundColor: '#F3F8F5',
    borderRadius: 14,
    padding: 13,
    gap: 6,
    borderWidth: 1,
    borderColor: '#D5E9DD',
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bannerHeading: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  cadencePill: {
    backgroundColor: colors.brandSoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cadencePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.brandDark,
  },
  bannerSubtext: {
    fontSize: 11.5,
    color: colors.muted,
    lineHeight: 16,
    marginBottom: 4,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    height: 42,
    borderRadius: 11,
  },
  bulkButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 44,
  },
  countryPill: {
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    justifyContent: 'center',
  },
  countryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    paddingHorizontal: 10,
    height: 44,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: '#BBEAD1',
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.brandDark,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  footerText: {
    fontSize: 11.5,
    color: colors.muted,
    fontWeight: '600',
  },
  watchVideosLink: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.brand,
  },
});
