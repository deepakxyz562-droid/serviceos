import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../src/theme/tokens';
import { nimoApi } from '../src/api/client';
import { useAppStore } from '../src/store/useAppStore';

const REASONS = [
  'Explicit Content',
  'Violence or Graphic Image',
  'Misleading or False Information',
  'Intellectual Property Concern',
  'Privacy Concerns',
  'Discriminatory or Hateful Content',
  'Other',
];

export default function ReportModal() {
  const router = useRouter();
  const { selectedTemplate } = useAppStore();
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await nimoApi.reportContent({
        templateId: selectedTemplate?.id,
        reason: selectedReason,
        description: description.trim(),
      });

      Alert.alert(
        'Report Submitted',
        `Thank you for helping keep NIMO safe. Reference Number: ${res.referenceNumber}`,
        [
          {
            text: 'Close',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report AI Content</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Why are you reporting this content?</Text>

        <View style={styles.reasonList}>
          {REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonItem, isSelected && styles.reasonItemActive]}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? THEME.colors.accentViolet : THEME.colors.textMuted}
                />
                <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Additional details (optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe why this image or template violates community guidelines..."
          placeholderTextColor={THEME.colors.textMuted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Report</Text>
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
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 6,
  },
  reasonList: {
    gap: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  reasonItemActive: {
    borderColor: THEME.colors.accentViolet,
    backgroundColor: THEME.colors.bgCardLighter,
  },
  reasonText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  reasonTextActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    padding: 14,
    color: THEME.colors.textPrimary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: THEME.colors.accentElectric,
    paddingVertical: 14,
    borderRadius: THEME.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
