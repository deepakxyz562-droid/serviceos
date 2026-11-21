import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../ui';
import {
  COUNTRIES,
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
  onAddCustomer?: () => void;
  onOpenBulk?: () => void;
  onOpenQr?: () => void;
  onOpenSeoUpdates?: () => void;
  onWatchVideo?: () => void;
}

export function UrgentReviewCard({
  businessName,
  reviewUrl,
  totalReviews = 0,
  lastReviewDate,
  thisWeekCount = 0,
  weeklyTarget = 8,
  countryCode,
  onAddCustomer,
  onOpenBulk,
  onOpenQr,
  onOpenSeoUpdates,
  onWatchVideo,
}: UrgentReviewCardProps) {
  const initialCountry: CountryItem = useMemo(
    () => (countryCode ? getCountryByCode(countryCode) : detectDeviceCountryAndTimezone().country),
    [countryCode],
  );
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(initialCountry);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Calculate true days since last review (null when no review timestamp exists)
  const daysAgo = useMemo<number | null>(() => {
    if (!lastReviewDate) return null;
    const reviewTime = new Date(lastReviewDate).getTime();
    if (isNaN(reviewTime)) return null;
    const diffDays = Math.floor((Date.now() - reviewTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [lastReviewDate]);

  const isHealthyWeek = thisWeekCount >= 1 || (daysAgo !== null && daysAgo <= 7);
  const remaining = Math.max(0, weeklyTarget - thisWeekCount);
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
      const message = `Hi! Thank you for choosing ${businessName}. We’d truly appreciate your feedback! Could you take a moment to leave us a quick Google review? Tap here: ${reviewUrl}`;

      const fullPhone =
        trimmed.startsWith('+')
          ? cleanPhone
          : cleanPhone.length === selectedCountry.digits || cleanPhone.length === 10
            ? `${selectedCountry.callingCode}${cleanPhone}`
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
      {/* ── Top Header: This Week's Reviews, QR & Weekly Goal (Plan A) ── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.headerTitle}>This Week&apos;s Reviews</Text>
          <Text style={styles.headerSubtitle}>
            {thisWeekCount > 0
              ? `${thisWeekCount} received this week · ${totalReviews} total reviews`
              : totalReviews > 0
                ? `0 received in last 7 days · ${totalReviews} total reviews`
                : 'Turn your customers into Google reviews'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {onWatchVideo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Watch Review Tutorial Video"
              onPress={onWatchVideo}
              style={({ pressed }) => [styles.headerPillBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="play-circle-outline" size={13} color="#2563EB" />
              <Text style={styles.headerPillBtnText}>Guide</Text>
            </Pressable>
          ) : null}

          {onOpenQr ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Review QR Standee"
              onPress={onOpenQr}
              style={({ pressed }) => [styles.headerPillBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialIcons name="qr-code-2" size={14} color="#2563EB" />
              <Text style={styles.headerPillBtnText}>QR</Text>
            </Pressable>
          ) : null}

          <View style={[styles.targetBadge, isHealthyWeek && styles.targetBadgeHealthy]}>
            <Text style={[styles.targetBadgeText, isHealthyWeek && styles.targetBadgeTextHealthy]}>
              {thisWeekCount}/{weeklyTarget}
            </Text>
          </View>
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
              . Keep requesting reviews toward your {weeklyTarget}/week target ({remaining} more to go).
            </>
          ) : (
            <>
              Last review was{' '}
              <Text style={styles.alertHighlight}>{daysAgo} days ago</Text>. Regular weekly reviews keep your Google ranking ahead of nearby competitors.
            </>
          )}
        </Text>
      </View>

      {/* ── Direct Customer Phone Input with Country Selector ── */}
      <View style={styles.inputContainer}>
        <Pressable
          onPress={() => setCountryPickerOpen(true)}
          style={styles.countryPill}
          accessibilityLabel="Select country code"
        >
          <Text style={styles.countryPillText}>
            {selectedCountry.flag} +{selectedCountry.callingCode}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={16} color={colors.ink} />
        </Pressable>
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
          accessibilityLabel="Send Review Link"
          onPress={handleSendLink}
          disabled={isSending}
          style={({ pressed }) => [
            styles.sendInlineBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <MaterialIcons name="send" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.sendInlineBtnText}>Send Link</Text>
        </Pressable>
      </View>

      {/* ── 2 Action Buttons (Plan A: 50/50 Balanced Symmetry) ── */}
      <View style={styles.actionButtonsRow}>
        {onAddCustomer ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Customer"
            onPress={onAddCustomer}
            style={({ pressed }) => [
              styles.primaryActionBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <MaterialIcons name="person-add" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionBtnText}>+ Add Customer</Text>
          </Pressable>
        ) : null}

        {onOpenBulk ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bulk Upload"
            onPress={onOpenBulk}
            style={({ pressed }) => [
              styles.secondaryActionBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialIcons name="upload-file" size={15} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryActionBtnText}>Bulk Upload</Text>
          </Pressable>
        ) : null}
      </View>

      {/* ── Footer Link: AI Agent Actions (100% Contained, Never Overflows) ── */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText} numberOfLines={1} ellipsizeMode="tail">
          Goal: {thisWeekCount}/{weeklyTarget} reviews {remaining > 0 ? `(${remaining} left)` : '🎉'}
        </Text>

        {onOpenSeoUpdates ? (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenSeoUpdates}
            style={styles.aiActionsLink}
          >
            <Text style={styles.watchVideosLink}>AI Actions →</Text>
            <MaterialIcons name="auto-awesome" size={13} color={colors.brand} />
          </Pressable>
        ) : null}
      </View>
      {/* ── Country Picker Modal ── */}
      <Modal
        visible={countryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCountryPickerOpen(false)}
      >
        <View style={styles.countryOverlay}>
          <View style={styles.countryCard}>
            <View style={styles.countryHeaderLine}>
              <Text style={styles.countryHeaderTitle}>Select Country Code</Text>
              <Pressable onPress={() => setCountryPickerOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {COUNTRIES.map((c) => {
                const active = c.code === selectedCountry.code;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      setSelectedCountry(c);
                      setCountryPickerOpen(false);
                    }}
                    style={[styles.countryRow, active && styles.countryRowActive]}
                  >
                    <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.countryNameText}>{c.name}</Text>
                      <Text style={styles.countryCodeText}>+{c.callingCode}</Text>
                    </View>
                    {active ? <MaterialIcons name="check" size={18} color={colors.brand} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerPillBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 44,
    paddingRight: 4,
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
  sendInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  sendInlineBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 11,
    backgroundColor: '#2563EB',
  },
  primaryActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    gap: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 11.5,
    color: colors.muted,
    fontWeight: '600',
  },
  aiActionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  watchVideosLink: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.brand,
  },
  countryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  countryCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  countryHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  countryHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  countryRowActive: {
    backgroundColor: '#F0FDF4',
  },
  countryNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  countryCodeText: {
    fontSize: 11.5,
    color: colors.muted,
    fontWeight: '600',
  },
});
