import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Account Settings */}
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity style={styles.itemRow} activeOpacity={0.75}>
            <View style={styles.itemLeft}>
              <Ionicons name="person-outline" size={20} color={THEME.colors.accentViolet} style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.itemRow} activeOpacity={0.75}>
            <View style={styles.itemLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={THEME.colors.accentViolet} style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.itemRow} activeOpacity={0.75}>
            <View style={styles.itemLeft}>
              <Ionicons name="mail-outline" size={20} color={THEME.colors.accentViolet} style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Email Preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section 2: App Preferences */}
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <View style={styles.cardGroup}>
          <View style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Ionicons name="notifications-outline" size={20} color="#38BDF8" style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#3A3260', true: '#7C3AED' }}
              thumbColor={notificationsEnabled ? '#FFF' : '#A7A2B8'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Ionicons name="moon-outline" size={20} color="#38BDF8" style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Dark Mode</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#3A3260', true: '#7C3AED' }}
              thumbColor={darkModeEnabled ? '#FFF' : '#A7A2B8'}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.itemRow} activeOpacity={0.75}>
            <View style={styles.itemLeft}>
              <Ionicons name="globe-outline" size={20} color="#38BDF8" style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Language</Text>
            </View>
            <View style={styles.valueRow}>
              <Text style={styles.valueText}>English</Text>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3: Privacy & Security */}
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/settings/privacy')}
            activeOpacity={0.75}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/policies')}
            activeOpacity={0.75}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="document-text-outline" size={20} color="#10B981" style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section 4: QA, Security & Store Info */}
        <Text style={styles.sectionTitle}>System & Store Info</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/settings/app-info')}
            activeOpacity={0.75}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="information-circle-outline" size={20} color="#C084FC" style={styles.itemIcon} />
              <Text style={styles.itemTitle}>App Info</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/settings/security-center')}
            activeOpacity={0.75}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="shield-outline" size={20} color="#10B981" style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Security Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => router.push('/settings/store-release')}
            activeOpacity={0.75}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="logo-google-playstore" size={20} color="#FBBF24" style={styles.itemIcon} />
              <Text style={styles.itemTitle}>Store Release Info</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardGroup: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginLeft: 48,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
});
