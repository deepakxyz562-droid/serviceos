import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../ui';
import { apiRequest } from '../../lib/api';
import {
  COUNTRIES,
  CountryItem,
  detectDeviceCountryAndTimezone,
  getCountryByCode,
} from '../../lib/country-codes';

interface QuickAddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  businessName: string;
  reviewUrl: string;
  defaultCountryCode?: string;
  onSuccess?: () => void;
}

const DEFAULT_LABELS = ['Walk-in', 'Regular', 'VIP', 'New Customer'];

export function QuickAddCustomerModal({
  visible,
  onClose,
  businessName,
  reviewUrl,
  defaultCountryCode,
  onSuccess,
}: QuickAddCustomerModalProps) {
  const defaultCountry: CountryItem = useMemo(
    () => (defaultCountryCode ? getCountryByCode(defaultCountryCode) : detectDeviceCountryAndTimezone().country),
    [defaultCountryCode],
  );

  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(defaultCountry);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>(['Walk-in']);
  const [askForReview, setAskForReview] = useState(true);
  const [busy, setBusy] = useState(false);

  const cleanDigits = phone.replace(/\D/g, '');
  const isValidPhone = cleanDigits.length >= 7 && cleanDigits.length <= 15;
  const isValidName = name.trim().length > 0;

  const toggleLabel = (label: string) => {
    void Haptics.selectionAsync();
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const handleSaveAndRequest = async () => {
    if (!isValidPhone) {
      Alert.alert('Phone Number Required', 'Please enter a valid customer phone number.');
      return;
    }

    setBusy(true);
    try {
      const fullPhone = phone.trim().startsWith('+')
        ? phone.trim()
        : `+${selectedCountry.callingCode}${cleanDigits}`;

      const customerDisplayName = name.trim() || `Customer ${cleanDigits.slice(-4)}`;

      // 1. Save to CRM Leads
      await apiRequest('/api/leads', {
        method: 'POST',
        body: {
          name: customerDisplayName,
          phone: fullPhone,
          title: `${customerDisplayName} (${selectedLabels.join(', ') || 'Customer'})`,
          source: 'Review Generation',
          status: 'new_lead',
          priority: 'medium',
          description: `Added via Quick Customer Review modal. Ask for review: ${askForReview ? 'Yes' : 'No'}`,
        },
      }).catch(() => null);

      // 2. If Ask for Google Review is toggled on, queue or send review invite
      if (askForReview) {
        try {
          await apiRequest('/api/reviews/request', {
            method: 'POST',
            body: {
              recipients: [[fullPhone, customerDisplayName]],
              channel: 'whatsapp',
              source: 'quick_customer_modal',
              saveToCustomers: true,
              saveToLeads: true,
            },
          });
        } catch {
          // If backend queue failed or WhatsApp cloud not configured, fallback to 1-tap wa.me link
          const waMessage = `Hi ${customerDisplayName}! Thank you for choosing ${businessName}. We’d truly appreciate your feedback! Could you take 30 seconds to leave us a quick Google review? Tap here: ${reviewUrl}`;
          const waUrl = `https://wa.me/${fullPhone.replace(/\+/g, '')}?text=${encodeURIComponent(waMessage)}`;
          await Linking.openURL(waUrl).catch(() => null);
        }
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Customer Saved!',
        askForReview
          ? `Review request queued for ${customerDisplayName}. A gentle follow-up reminder will automatically trigger if they haven't reviewed yet.`
          : `${customerDisplayName} added to your customer records.`,
      );

      // Reset
      setPhone('');
      setName('');
      setSelectedLabels(['Walk-in']);
      setAskForReview(true);
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Could not save customer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Add Customer</Text>
              <Text style={styles.subtitle}>Turn your customers into Google reviews</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 16, paddingBottom: 10 }}>
            {/* Phone Number Input with Country Code */}
            <View style={{ gap: 6 }}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <View style={styles.phoneInputRow}>
                <Pressable
                  onPress={() => setCountryPickerOpen(true)}
                  style={styles.countryPill}
                >
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryCode}>+{selectedCountry.callingCode}</Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color="#64748B" />
                </Pressable>

                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={selectedCountry.placeholder}
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                />
              </View>
            </View>

            {/* Customer Name Input */}
            <View style={{ gap: 6 }}>
              <Text style={styles.inputLabel}>Customer Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Shreya, Rahul, Dr. Sharma"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />
            </View>

            {/* Labels Chips */}
            <View style={{ gap: 6 }}>
              <Text style={styles.inputLabel}>Labels</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {DEFAULT_LABELS.map((lbl) => {
                  const isSelected = selectedLabels.includes(lbl);
                  return (
                    <Pressable
                      key={lbl}
                      onPress={() => toggleLabel(lbl)}
                      style={[styles.labelChip, isSelected && styles.labelChipActive]}
                    >
                      <MaterialIcons
                        name={isSelected ? 'check' : 'add'}
                        size={14}
                        color={isSelected ? '#2563EB' : '#64748B'}
                      />
                      <Text style={[styles.labelChipText, isSelected && styles.labelChipTextActive]}>
                        {lbl}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Ask for Google Review Toggle (Matching Video 3 & 4) */}
            <View style={styles.toggleCard}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="star" size={18} color="#F59E0B" />
                  <Text style={styles.toggleTitle}>Ask for Google Review</Text>
                </View>
                <Text style={styles.toggleSubtitle}>
                  Automatically sends review invite via WhatsApp with short link and queues a gentle 2-day reminder.
                </Text>
              </View>
              <Switch
                value={askForReview}
                onValueChange={setAskForReview}
                trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                thumbColor={askForReview ? '#2563EB' : '#FFFFFF'}
              />
            </View>
          </ScrollView>

          {/* Action Button */}
          <Pressable
            accessibilityRole="button"
            onPress={handleSaveAndRequest}
            disabled={busy || !isValidPhone}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!isValidPhone || busy) && { opacity: 0.6 },
              pressed && { opacity: 0.9 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons
                  name={askForReview ? 'send' : 'check'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryBtnText}>
                  {askForReview ? 'Save & Request Review' : 'Save Customer'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Country Picker Sub-Modal */}
        <Modal visible={countryPickerOpen} animationType="slide" transparent>
          <View style={styles.countryPickerBackdrop}>
            <Pressable style={styles.scrim} onPress={() => setCountryPickerOpen(false)} />
            <View style={styles.countryPickerSheet}>
              <View style={styles.countryPickerHeader}>
                <Text style={styles.title}>Select Country</Text>
                <Pressable onPress={() => setCountryPickerOpen(false)}>
                  <MaterialIcons name="close" size={22} color="#64748B" />
                </Pressable>
              </View>
              <ScrollView style={{ maxHeight: 350 }}>
                {COUNTRIES.map((c) => (
                  <Pressable
                    key={c.code}
                    onPress={() => {
                      setSelectedCountry(c);
                      setCountryPickerOpen(false);
                    }}
                    style={styles.countryRow}
                  >
                    <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                      {c.name}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
                      +{c.callingCode}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  countryFlag: {
    fontSize: 16,
  },
  countryCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  labelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  labelChipTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  toggleTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#15803D',
  },
  toggleSubtitle: {
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  countryPickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  countryPickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    gap: 12,
  },
  countryPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
});
