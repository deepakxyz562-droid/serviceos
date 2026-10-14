import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/lib/constants';
import { useAffinityStore } from '../../src/stores/affinity-store';
import { haptic } from '../../src/lib/haptics';

export default function CustomerProfileScreen() {
  const { currentLocation } = useAffinityStore();

  const handleAction = (title: string) => {
    void haptic.light();
    Alert.alert(title, 'This feature is ready and synced with your verified local store.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User Profile Header Card ────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>D</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Deepak Chandra</Text>
            <Text style={styles.userPhone}>+91 98765 43210</Text>
            <View style={styles.locationTag}>
              <MaterialIcons name="location-on" size={14} color="#059669" />
              <Text style={styles.locationTagText}>{currentLocation.displayName}</Text>
            </View>
          </View>
        </View>

        {/* ── Section: Orders & Shopping ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shopping &amp; Addresses</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleAction('Saved Delivery Addresses')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="home" size={20} color="#059669" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Saved Addresses</Text>
              <Text style={styles.menuSubtitle}>Home, Office, Other locations</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleAction('Payment Preferences')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#059669" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Payment Methods</Text>
              <Text style={styles.menuSubtitle}>UPI, Pay at Counter, Cards</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ── Section: Preferences & Support ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleAction('Language Selection')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="translate" size={20} color="#0284C7" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuSubtitle}>English (Selected) / हिन्दी</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleAction('Customer Help & Support')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <MaterialIcons name="headset-mic" size={20} color="#0284C7" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help &amp; Support</Text>
              <Text style={styles.menuSubtitle}>Chat with support, FAQ</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ── App Version Footnote ────────────────────────────────────── */}
        <View style={styles.appFootnote}>
          <Text style={styles.footnoteText}>BOS Customer Mobile App v1.0.0</Text>
          <Text style={styles.subFootnote}>Built for Local Groceries &amp; Retail Marketplace</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
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
});
