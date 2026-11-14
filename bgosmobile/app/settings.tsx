import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../src/stores/auth-store';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { BGOS_SUPPORT_EMAIL, BGOS_SUPPORT_WHATSAPP_DIGITS } from '../src/lib/constants';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

const FONT_SIZES = [
  { label: 'Small', scale: 0.9 },
  { label: 'Default', scale: 1.0 },
  { label: 'Medium', scale: 1.1 },
  { label: 'Large', scale: 1.2 },
  { label: 'Extra Large', scale: 1.3 },
];

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'es', label: 'Spanish (Español)', flag: '🇪🇸' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuthStore();
  const workspace = useResource<BgosWorkspace>('/api/bgos/mobile/workspace');

  // App preferences state
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // Default = 1.0
  const [darkMode, setDarkMode] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [reviewAlerts, setReviewAlerts] = useState(true);
  const [growthTips, setGrowthTips] = useState(true);

  // Modals state
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [labelsModalOpen, setLabelsModalOpen] = useState(false);
  const [dataSettingsModalOpen, setDataSettingsModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const minTopInset =
    Platform.OS === 'ios'
      ? Math.max(insets.top, 48)
      : Math.max(insets.top, (RNStatusBar.currentHeight || 28) + 12);

  const orgId = user?.tenantId || user?.workspaceId || user?.id || '6ae304d0507c3fe1a973de821b';
  const displayOrgId =
    orgId.length > 24 ? `${orgId.slice(0, 20)}...` : orgId;

  function handleBack() {
    if (router.canGoBack?.()) router.back();
    else router.replace('/(tabs)');
  }

  function handleCopyOrgId() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Share.share({
      title: 'BGOS Org ID',
      message: orgId,
    }).catch(() => {
      Alert.alert('Org ID', orgId);
    });
  }

  function confirmLogout() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Logout', 'Are you sure you want to log out of BGOS?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  function openWhatsAppSupport() {
    const businessName = workspace.data?.name || user?.name || '';
    const userEmail = user?.email || '';
    const baseGreeting = 'Hello BGOS Support, I need help with my account.';
    const context = businessName ? `\n(Business: ${businessName} • ${userEmail})` : '';
    const url = `https://wa.me/${BGOS_SUPPORT_WHATSAPP_DIGITS}?text=${encodeURIComponent(
      baseGreeting + context
    )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Unable to open WhatsApp',
        `Please ensure WhatsApp is installed or reach us at ${BGOS_SUPPORT_EMAIL}.`
      );
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* ─── Top Header (Screenshot 2 & 3) ─────────────────────────── */}
      <View
        style={{
          paddingTop: minTopInset,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <MaterialIcons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>

          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
            Settings
          </Text>
        </View>

        {/* Top-Right Green "Help" Pill Button (Screenshot 2 & 3) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open AI Growth Agent Help"
          onPress={() => router.push('/help')}
          hitSlop={6}
          style={({ pressed }) => ({
            backgroundColor: '#10B981',
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 6,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
            Help
          </Text>
        </Pressable>
      </View>

      {/* ─── Scrollable Body ───────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 24) + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Subscription Banner Card (Screenshot 3) */}
        <View style={styles.subscriptionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="auto-awesome" size={17} color="#8B5CF6" />
              <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0F172A' }}>
                BGOS Subscription
              </Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '500' }}>
            Expires on Nov 13, 2027
          </Text>
        </View>

        {/* 2. Review Request Limits Card (Screenshot 2) */}
        <View style={styles.limitsCard}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
              Review Request Limits
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
              Daily 0/20 used • 20 left
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upgrade Plan"
            onPress={() => router.push('/my-plan')}
            style={({ pressed }) => [
              styles.upgradePlanBtn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <MaterialIcons name="auto-awesome" size={14} color="#FFFFFF" />
            <Text style={styles.upgradePlanText}>Upgrade Plan</Text>
          </Pressable>
        </View>

        {/* 3. Operational Menu Rows (Group 1 - Screenshot 3) */}
        <View style={styles.menuGroup}>
          <MenuRowItem
            icon="play-circle-outline"
            title="App Training Videos"
            onPress={() => setTrainingModalOpen(true)}
          />
          <MenuRowItem
            icon="person-outline"
            title="Logo Management"
            onPress={() => router.push('/logo-management')}
          />
          <MenuRowItem
            icon="business-center"
            title="Business Information"
            onPress={() => router.push('/manage-profile')}
          />
          <MenuRowItem
            icon="settings"
            title="Branch/Location Settings"
            onPress={() => router.push('/select-profile')}
          />
          <MenuRowItem
            icon="people-outline"
            title="Manage Employees"
            onPress={() => router.push('/team-management')}
          />
          <MenuRowItem
            icon="notifications-none"
            title="Manage Notifications"
            onPress={() => setNotificationsModalOpen(true)}
          />
          <MenuRowItem
            icon="tune"
            title="GBP Management"
            onPress={() => router.push('/growth')}
          />
          <MenuRowItem
            icon="assignment"
            title="Brochure and Specialities"
            onPress={() => router.push('/services-management')}
            isLast
          />
        </View>

        {/* Subtle Divider Spacer */}
        <View style={styles.sectionDivider} />

        {/* 4. Operational Menu Rows (Group 2 - Screenshot 3) */}
        <View style={styles.menuGroup}>
          <MenuRowItem
            icon="label-outline"
            title="Labels"
            onPress={() => setLabelsModalOpen(true)}
          />
          <MenuRowItem
            icon="person-outline"
            title="Customer Data Settings"
            onPress={() => setDataSettingsModalOpen(true)}
            isLast
          />
        </View>

        {/* Subtle Divider Spacer */}
        <View style={styles.sectionDivider} />

        {/* 5. App Controls & Preferences (Screenshot 2) */}
        <View style={styles.menuGroup}>
          {/* Language Selector */}
          <View style={styles.controlRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MaterialIcons name="translate" size={20} color="#0F172A" />
              <Text style={styles.menuRowTitle}>Language</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setLanguageModalOpen(true)}
              style={styles.dropdownPill}
            >
              <Text style={styles.dropdownPillText}>{selectedLanguage}</Text>
              <MaterialIcons name="keyboard-arrow-down" size={18} color="#64748B" />
            </Pressable>
          </View>

          {/* Font Size Slider */}
          <View style={[styles.controlRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MaterialIcons name="tune" size={20} color="#0F172A" />
              <Text style={styles.menuRowTitle}>Font Size</Text>
              <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600' }}>
                ({FONT_SIZES[fontSizeIndex].label})
              </Text>
            </View>

            {/* Interactive 5-step tick slider bar */}
            <View style={styles.sliderTrackContainer}>
              <View style={styles.sliderTrackLineBackground} />
              <View
                style={[
                  styles.sliderTrackLineActive,
                  { width: `${(fontSizeIndex / 4) * 100}%` },
                ]}
              />
              <View style={styles.sliderTicksRow}>
                {FONT_SIZES.map((step, idx) => {
                  const isSelected = idx === fontSizeIndex;
                  return (
                    <Pressable
                      key={step.label}
                      hitSlop={12}
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setFontSizeIndex(idx);
                      }}
                      style={[
                        styles.sliderDot,
                        isSelected && styles.sliderDotActive,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          {/* Dark Mode Toggle */}
          <View style={styles.controlRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MaterialIcons name="wb-sunny" size={20} color="#0F172A" />
              <Text style={styles.menuRowTitle}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(val) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDarkMode(val);
                if (val) {
                  Alert.alert('Dark Mode', 'Dark mode preference will be applied in the upcoming release.');
                }
              }}
              trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
              thumbColor={darkMode ? '#2563EB' : '#FFFFFF'}
            />
          </View>

          {/* Contact Support */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setSupportModalOpen(true)}
            style={styles.controlRow}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MaterialIcons name="help-outline" size={20} color="#0F172A" />
              <Text style={styles.menuRowTitle}>Contact Support</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
          </Pressable>

          {/* Logout Row */}
          <Pressable
            accessibilityRole="button"
            onPress={confirmLogout}
            style={[styles.controlRow, { borderBottomWidth: 0 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MaterialIcons name="logout" size={20} color="#DC2626" />
              <Text style={[styles.menuRowTitle, { color: '#DC2626', fontWeight: '800' }]}>
                Logout
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Subtle Divider Spacer */}
        <View style={styles.sectionDivider} />

        {/* 6. Org ID Row (Screenshot 2) */}
        <View style={styles.orgIdCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <MaterialIcons name="storefront" size={20} color="#475569" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
              Org ID
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', flexShrink: 1 }} numberOfLines={1}>
              {displayOrgId}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy Org ID"
            onPress={handleCopyOrgId}
            hitSlop={8}
            style={({ pressed }) => ({
              padding: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="content-copy" size={18} color="#64748B" />
          </Pressable>
        </View>

        {/* 7. App Brand & Version Footer (Screenshot 2) */}
        <View style={styles.footerBranding}>
          <View style={styles.appLogoBadge}>
            <MaterialIcons name="navigation" size={22} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />
          </View>
          <Text style={styles.appNameText}>BGOS</Text>
          <Text style={styles.appVersionText}>Version 1.0.0 (Build 34)</Text>
        </View>
      </ScrollView>

      {/* ─── Language Modal ───────────────────────────────────────── */}
      <Modal
        visible={languageModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLanguageModalOpen(false)} />
          <View style={styles.modalDialog}>
            <Text style={styles.dialogTitle}>Select Language</Text>
            <View style={{ gap: 6, marginTop: 12 }}>
              {LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.label.split(' ')[0];
                return (
                  <Pressable
                    key={lang.code}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedLanguage(lang.label.split(' ')[0]);
                      setLanguageModalOpen(false);
                    }}
                    style={[
                      styles.dialogOptionRow,
                      isSelected && { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>{lang.flag}</Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isSelected ? '800' : '600',
                        color: isSelected ? '#047857' : '#0F172A',
                        flex: 1,
                      }}
                    >
                      {lang.label}
                    </Text>
                    {isSelected && <MaterialIcons name="check" size={18} color="#047857" />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Training Videos Modal ─────────────────────────────────── */}
      <Modal
        visible={trainingModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTrainingModalOpen(false)}
      >
        <View style={styles.modalBackdropBottom}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTrainingModalOpen(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>App Training Videos</Text>
              <Pressable hitSlop={10} onPress={() => setTrainingModalOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              {[
                { title: '1. Getting Started with BGOS Growth Plan', duration: '3 mins' },
                { title: '2. 1-Tap Google Reviews & WhatsApp Invites', duration: '4 mins' },
                { title: '3. Connecting Google Business Profile & Auto-Posting', duration: '5 mins' },
              ].map((v) => (
                <Pressable
                  key={v.title}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    void Linking.openURL('https://youtube.com');
                  }}
                  style={styles.trainingVideoCard}
                >
                  <View style={styles.videoPlayIcon}>
                    <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0F172A' }}>
                      {v.title}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                      Video Tutorial • {v.duration}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Notifications Modal ──────────────────────────────────── */}
      <Modal
        visible={notificationsModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNotificationsModalOpen(false)}
      >
        <View style={styles.modalBackdropBottom}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setNotificationsModalOpen(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Manage Notifications</Text>
              <Pressable hitSlop={10} onPress={() => setNotificationsModalOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
            <View style={{ padding: 16, gap: 14 }}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleRowTitle}>Push Notifications</Text>
                  <Text style={styles.toggleRowDesc}>Receive live updates on your phone</Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={(v) => setPushEnabled(v)}
                  trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }}
                  thumbColor={pushEnabled ? '#059669' : '#FFFFFF'}
                />
              </View>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleRowTitle}>Google Review Alerts</Text>
                  <Text style={styles.toggleRowDesc}>Instant notification when a customer reviews you</Text>
                </View>
                <Switch
                  value={reviewAlerts}
                  onValueChange={(v) => setReviewAlerts(v)}
                  trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }}
                  thumbColor={reviewAlerts ? '#059669' : '#FFFFFF'}
                />
              </View>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleRowTitle}>Daily Growth Tips</Text>
                  <Text style={styles.toggleRowDesc}>Morning AI recommendations to boost rank</Text>
                </View>
                <Switch
                  value={growthTips}
                  onValueChange={(v) => setGrowthTips(v)}
                  trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }}
                  thumbColor={growthTips ? '#059669' : '#FFFFFF'}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Labels Modal ─────────────────────────────────────────── */}
      <Modal
        visible={labelsModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLabelsModalOpen(false)}
      >
        <View style={styles.modalBackdropBottom}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLabelsModalOpen(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Customer &amp; Lead Labels</Text>
              <Pressable hitSlop={10} onPress={() => setLabelsModalOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              {['VIP Customer', 'Hot Lead', 'Follow-up Needed', 'Walk-in', 'Quote Requested'].map((label) => (
                <View key={label} style={styles.labelChipRow}>
                  <MaterialIcons name="label" size={16} color="#4F46E5" />
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1E1B4B', flex: 1 }}>
                    {label}
                  </Text>
                  <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#4F46E5' }}>Active</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Customer Data Settings Modal ─────────────────────────── */}
      <Modal
        visible={dataSettingsModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDataSettingsModalOpen(false)}
      >
        <View style={styles.modalBackdropBottom}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDataSettingsModalOpen(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Customer Data Settings</Text>
              <Pressable hitSlop={10} onPress={() => setDataSettingsModalOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={styles.dataShieldCard}>
                <MaterialIcons name="verified-user" size={24} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>
                    100% Tenant Isolation
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2, lineHeight: 16 }}>
                    Customer contacts, review replies, and chat transcripts are strictly encrypted and never shared.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  setDataSettingsModalOpen(false);
                  Alert.alert(
                    'Export Customer Data',
                    'A CSV export link will be sent to your registered account email within 5 minutes.'
                  );
                }}
                style={styles.exportDataBtn}
              >
                <MaterialIcons name="download" size={18} color="#0F172A" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                  Export All Customer Contacts (.csv)
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Contact Support Modal ────────────────────────────────── */}
      <Modal
        visible={supportModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSupportModalOpen(false)}
      >
        <View style={styles.modalBackdropBottom}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSupportModalOpen(false)} />
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Contact Support</Text>
              <Pressable hitSlop={10} onPress={() => setSupportModalOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <Pressable
                onPress={() => {
                  setSupportModalOpen(false);
                  openWhatsAppSupport();
                }}
                style={styles.supportOptionBtn}
              >
                <View style={[styles.supportIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <MaterialIcons name="chat" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                    WhatsApp Live Support
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                    Meta Verified Desk • 24/7 AI &amp; Human Team
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </Pressable>

              <Pressable
                onPress={() => {
                  setSupportModalOpen(false);
                  Linking.openURL(`mailto:${BGOS_SUPPORT_EMAIL}`);
                }}
                style={styles.supportOptionBtn}
              >
                <View style={[styles.supportIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialIcons name="mail-outline" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                    Email Support Desk
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                    {BGOS_SUPPORT_EMAIL}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </Pressable>

              <Pressable
                onPress={() => {
                  setSupportModalOpen(false);
                  router.push('/help');
                }}
                style={styles.supportOptionBtn}
              >
                <View style={[styles.supportIconWrap, { backgroundColor: '#FAF5FF' }]}>
                  <MaterialIcons name="auto-awesome" size={20} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                    Business Growth Agent
                  </Text>
                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                    Interactive AI Agent for instant answers &amp; workflows
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuRowItem({
  icon,
  title,
  onPress,
  isLast = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        isLast && { borderBottomWidth: 0 },
        pressed && { backgroundColor: '#F8FAFC' },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <MaterialIcons name={icon} size={21} color="#0F172A" />
        <Text style={styles.menuRowTitle}>{title}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  subscriptionCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F3E8FF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
  },
  limitsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  upgradePlanText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuRowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dropdownPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  sliderTrackContainer: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 2,
    paddingHorizontal: 6,
  },
  sliderTrackLineBackground: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  sliderTrackLineActive: {
    position: 'absolute',
    left: 6,
    height: 4,
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  sliderTicksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  sliderDotActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionDivider: {
    height: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  orgIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  footerBranding: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
    gap: 4,
  },
  appLogoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  appNameText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  appVersionText: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalDialog: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dialogOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalBackdropBottom: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  trainingVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  videoPlayIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleRowDesc: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  labelChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dataShieldCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
  },
  exportDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  supportOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supportIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
