import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../src/theme/tokens';
import { useAppStore } from '../src/store/useAppStore';

const REASONS = [
  'Privacy concerns regarding AI photo processing',
  'Output quality does not match my expectations',
  'Coin packages are too expensive',
  'I am taking a break from content creation',
  'Other',
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { coinsAvailable } = useAppStore();
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [feedback, setFeedback] = useState('');
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (!hasConfirmed) {
      Alert.alert('Confirmation Required', 'Please check the box confirming you understand your photos and coins will be deleted.');
      return;
    }

    Alert.alert(
      'Final Confirmation',
      'Are you absolutely sure? Your account cannot be recovered once purged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            setTimeout(() => {
              setIsDeleting(false);
              Alert.alert(
                'Account Deleted',
                'Your account and all associated AI portrait records have been purged.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/onboarding'),
                  },
                ]
              );
            }, 1200);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Callout Box */}
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={24} color={THEME.colors.error} />
          <Text style={styles.warningTitle}>This Action Is Irreversible</Text>
          <Text style={styles.warningText}>
            Deleting your NIMO account will permanently wipe:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• All your generated studio portraits and uploaded photos</Text>
            <Text style={styles.bulletItem}>• Your remaining balance of {coinsAvailable} coins (no cash refunds)</Text>
            <Text style={styles.bulletItem}>• Your personal profile and preferences</Text>
          </View>
          <Text style={styles.legalNotice}>
            * Note: Past financial tax invoices must be retained for 7 years as mandated by Indian GST regulations.
          </Text>
        </View>

        {/* Reason Selector */}
        <Text style={styles.sectionTitle}>Please tell us why you are leaving:</Text>
        <View style={styles.reasonList}>
          {REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonRow, isSelected && styles.reasonRowActive]}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={isSelected ? THEME.colors.accentViolet : THEME.colors.textMuted}
                />
                <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feedback Area */}
        <Text style={styles.sectionTitle}>Optional Feedback</Text>
        <TextInput
          style={styles.feedbackInput}
          placeholder="How could we have improved your experience?"
          placeholderTextColor={THEME.colors.textMuted}
          multiline
          numberOfLines={3}
          value={feedback}
          onChangeText={setFeedback}
        />

        {/* Acknowledgment Checkbox */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setHasConfirmed(!hasConfirmed)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={hasConfirmed ? 'checkbox' : 'square-outline'}
            size={22}
            color={hasConfirmed ? THEME.colors.accentViolet : THEME.colors.textMuted}
          />
          <Text style={styles.checkboxText}>
            I understand that my remaining coin balance and all generated media will be permanently deleted and cannot be recovered.
          </Text>
        </TouchableOpacity>

        {/* Delete CTA Button */}
        <TouchableOpacity
          style={[styles.deleteBtn, !hasConfirmed && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={!hasConfirmed || isDeleting}
          activeOpacity={0.85}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.deleteBtnText}>Permanently Delete My Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  warningCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: THEME.radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.error,
  },
  warningText: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    lineHeight: 18,
  },
  bulletList: {
    gap: 4,
    marginVertical: 4,
  },
  bulletItem: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  legalNotice: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  reasonList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  reasonRowActive: {
    borderColor: THEME.colors.accentViolet,
  },
  reasonText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  reasonTextActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  feedbackInput: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    padding: 14,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 8,
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  deleteBtn: {
    backgroundColor: THEME.colors.error,
    paddingVertical: 16,
    borderRadius: THEME.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  deleteBtnDisabled: {
    opacity: 0.4,
  },
  deleteBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
