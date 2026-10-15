import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/lib/constants';
import { useAffinityStore } from '../../src/stores/affinity-store';
import { useProfileStore } from '../../src/stores/profile-store';
import { useMobileTranslation } from '../../src/stores/language-store';
import { MobileLanguage } from '../../src/i18n/translations';
import { haptic } from '../../src/lib/haptics';

export default function CustomerProfileScreen() {
  const { currentLocation } = useAffinityStore();
  const { name, phone, defaultAddress, savedAddresses, updateProfile, addSavedAddress, removeSavedAddress } =
    useProfileStore();
  const { language, setLanguage, t } = useMobileTranslation();

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState(name);
  const [editPhone, setEditPhone] = useState(phone);
  const [editAddress, setEditAddress] = useState(defaultAddress);

  // New address state
  const [newLabel, setNewLabel] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [newAddressText, setNewAddressText] = useState('');

  const openEditProfile = () => {
    void haptic.light();
    setEditName(name);
    setEditPhone(phone);
    setEditAddress(defaultAddress);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    void haptic.success();
    await updateProfile({
      name: editName.trim(),
      phone: editPhone.trim(),
      defaultAddress: editAddress.trim(),
    });
    setIsEditProfileOpen(false);
    Alert.alert(t('profile.title', 'My Profile'), 'Profile details updated successfully.');
  };

  const handleSelectLanguage = async (lang: MobileLanguage) => {
    void haptic.medium();
    await setLanguage(lang, true);
    setIsLangModalOpen(false);
  };

  const handleAddNewAddress = async () => {
    if (!newAddressText.trim()) {
      Alert.alert('Empty Address', 'Please enter a valid address.');
      return;
    }
    void haptic.success();
    await addSavedAddress(newLabel, newAddressText.trim());
    setNewAddressText('');
    Alert.alert('Address Saved', 'Your address has been saved.');
  };

  const getLanguageLabel = () => {
    if (language === 'hi') return 'हिन्दी (Hindi)';
    if (language === 'both') return 'English / हिन्दी (Bilingual)';
    return 'English (अंग्रेज़ी)';
  };

  const displayName = name.trim() || t('profile.guestUser', 'Guest Customer');
  const displayPhone = phone.trim() || t('profile.notSet', 'Add your mobile number');
  const avatarLetter = (name.trim() || 'G')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title', 'My Profile')}</Text>
        <TouchableOpacity
          style={styles.langPillHeader}
          onPress={() => {
            void haptic.light();
            setIsLangModalOpen(true);
          }}
        >
          <MaterialIcons name="translate" size={16} color="#059669" />
          <Text style={styles.langPillText}>
            {language === 'hi' ? 'हिन्दी' : language === 'both' ? 'EN/हि' : 'EN'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User Profile Header Card ────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userPhone}>{displayPhone}</Text>
            {defaultAddress ? (
              <Text style={styles.userAddress} numberOfLines={1}>
                {defaultAddress}
              </Text>
            ) : null}
            <View style={styles.locationTag}>
              <MaterialIcons name="location-on" size={14} color="#059669" />
              <Text style={styles.locationTagText}>{currentLocation.displayName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={openEditProfile}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="edit" size={18} color="#059669" />
          </TouchableOpacity>
        </View>

        {/* ── Section: Orders & Shopping ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.shoppingSection', 'Shopping & Addresses')}</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              void haptic.light();
              setIsAddressModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="home" size={20} color="#059669" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('profile.savedAddresses', 'Saved Delivery Addresses')}</Text>
              <Text style={styles.menuSubtitle}>
                {savedAddresses.length > 0
                  ? `${savedAddresses.length} saved address${savedAddresses.length > 1 ? 'es' : ''}`
                  : defaultAddress || t('profile.savedAddressesSub', 'Manage Home, Office, Other addresses')}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              void haptic.light();
              Alert.alert(
                t('profile.paymentPreferences', 'Payment Preferences'),
                'Direct UPI and Cash on Delivery / Counter are supported with zero commissions.'
              );
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#059669" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('profile.paymentPreferences', 'Payment Methods')}</Text>
              <Text style={styles.menuSubtitle}>{t('profile.paymentPreferencesSub', 'UPI, Pay at Counter (Cash)')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ── Section: Preferences & Support ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.preferencesSection', 'App Preferences')}</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              void haptic.light();
              setIsLangModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="translate" size={20} color="#0284C7" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('profile.language', 'Language & Translation')}</Text>
              <Text style={styles.menuSubtitle}>{getLanguageLabel()}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              void haptic.light();
              Alert.alert(
                t('profile.helpCenter', 'Help & Store Support'),
                'Direct customer support is provided directly by your neighborhood verified merchant.'
              );
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="headset-mic" size={20} color="#0284C7" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{t('profile.helpCenter', 'Help & Support')}</Text>
              <Text style={styles.menuSubtitle}>{t('profile.helpCenterSub', 'Contact merchant on WhatsApp')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ── App Version Footnote ────────────────────────────────────── */}
        <View style={styles.appFootnote}>
          <Text style={styles.footnoteText}>BOS Customer Mobile App v1.0.0</Text>
          <Text style={styles.subFootnote}>Direct-to-Consumer Local Retail Marketplace</Text>
        </View>
      </ScrollView>

      {/* ── Language Selection Modal ─────────────────────────────────── */}
      <Modal
        visible={isLangModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLangModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLangModalOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <MaterialIcons name="translate" size={22} color="#059669" />
                <Text style={styles.modalTitle}>{t('profile.language', 'Select Language')}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsLangModalOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.langOption, language === 'en' && styles.langOptionActive]}
              onPress={() => handleSelectLanguage('en')}
            >
              <View>
                <Text style={[styles.langOptionText, language === 'en' && styles.langOptionTextActive]}>
                  English
                </Text>
                <Text style={styles.langOptionSub}>Default interface in English</Text>
              </View>
              {language === 'en' && <MaterialIcons name="check-circle" size={20} color="#059669" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, language === 'hi' && styles.langOptionActive]}
              onPress={() => handleSelectLanguage('hi')}
            >
              <View>
                <Text style={[styles.langOptionText, language === 'hi' && styles.langOptionTextActive]}>
                  हिन्दी (Hindi)
                </Text>
                <Text style={styles.langOptionSub}>सम्पूर्ण ऐप हिंदी भाषा में</Text>
              </View>
              {language === 'hi' && <MaterialIcons name="check-circle" size={20} color="#059669" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOption, language === 'both' && styles.langOptionActive]}
              onPress={() => handleSelectLanguage('both')}
            >
              <View>
                <Text style={[styles.langOptionText, language === 'both' && styles.langOptionTextActive]}>
                  Bilingual (English / हिन्दी)
                </Text>
                <Text style={styles.langOptionSub}>Shows both English and Hindi labels</Text>
              </View>
              {language === 'both' && <MaterialIcons name="check-circle" size={20} color="#059669" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Edit Profile Modal ───────────────────────────────────────── */}
      <Modal
        visible={isEditProfileOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditProfileOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setIsEditProfileOpen(false)}>
              <Text style={styles.sheetCancelText}>{t('profile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('profile.editProfile', 'Edit Profile')}</Text>
            <TouchableOpacity onPress={handleSaveProfile}>
              <Text style={styles.sheetSaveText}>{t('profile.save', 'Save')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name</Text>
              <TextInput
                style={styles.sheetInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mobile Number</Text>
              <TextInput
                style={styles.sheetInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+91 Mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Default Delivery Address</Text>
              <TextInput
                style={[styles.sheetInput, { height: 80, textAlignVertical: 'top' }]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Flat / House No., Landmark, Area"
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Saved Addresses Modal ────────────────────────────────────── */}
      <Modal
        visible={isAddressModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddressModalOpen(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setIsAddressModalOpen(false)}>
              <Text style={styles.sheetCancelText}>{t('common.close', 'Close')}</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>{t('profile.savedAddresses', 'Saved Addresses')}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.sheetContent}>
            <Text style={styles.addressSectionTitle}>Your Saved Locations</Text>
            {savedAddresses.length === 0 ? (
              <View style={styles.emptyAddressBox}>
                <MaterialIcons name="location-off" size={32} color="#94A3B8" />
                <Text style={styles.emptyAddressText}>No custom addresses saved yet.</Text>
                {defaultAddress ? (
                  <Text style={styles.currentDefaultText}>Default: {defaultAddress}</Text>
                ) : null}
              </View>
            ) : (
              savedAddresses.map((addr) => (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.addressHeaderRow}>
                      <MaterialIcons
                        name={addr.label === 'Home' ? 'home' : addr.label === 'Office' ? 'business' : 'place'}
                        size={16}
                        color="#059669"
                      />
                      <Text style={styles.addressLabel}>{addr.label}</Text>
                    </View>
                    <Text style={styles.addressText}>{addr.address}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeSavedAddress(addr.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={styles.addNewAddressSection}>
              <Text style={styles.addressSectionTitle}>Add New Address</Text>
              <View style={styles.labelPickerRow}>
                {(['Home', 'Office', 'Other'] as const).map((lbl) => (
                  <TouchableOpacity
                    key={lbl}
                    style={[styles.labelChip, newLabel === lbl && styles.labelChipActive]}
                    onPress={() => setNewLabel(lbl)}
                  >
                    <Text style={[styles.labelChipText, newLabel === lbl && styles.labelChipTextActive]}>
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.sheetInput, { height: 70, textAlignVertical: 'top', marginTop: 10 }]}
                value={newAddressText}
                onChangeText={setNewAddressText}
                placeholder="Complete address with floor, landmark..."
                placeholderTextColor="#94A3B8"
                multiline
              />
              <TouchableOpacity style={styles.saveAddressBtn} onPress={handleAddNewAddress}>
                <Text style={styles.saveAddressBtnText}>Save Address</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  langPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  userPhone: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  userAddress: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  editBtn: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#64748B',
    marginBottom: 10,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  appFootnote: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footnoteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  subFootnote: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  langOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  langOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  langOptionTextActive: {
    color: '#059669',
  },
  langOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetCancelText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSaveText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '800',
  },
  sheetContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  sheetInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  addressSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 10,
  },
  emptyAddressBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  emptyAddressText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  currentDefaultText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  addressText: {
    fontSize: 13,
    color: '#0F172A',
  },
  addNewAddressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  labelPickerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labelChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  labelChipActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  labelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  labelChipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  saveAddressBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveAddressBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
