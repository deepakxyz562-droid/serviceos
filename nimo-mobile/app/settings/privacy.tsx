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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';

export default function PrivacySecurityScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Shield Graphic Hero */}
        <View style={styles.heroBox}>
          <View style={styles.shieldCircle}>
            <Ionicons name="shield-checkmark" size={48} color="#38BDF8" />
          </View>
          <Text style={styles.heroTitle}>Your Privacy Matters</Text>
          <Text style={styles.heroSubtitle}>We keep your data safe and secure</Text>
        </View>

        {/* Options List */}
        <View style={styles.optionsList}>
          {/* Data Protection */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
            <View style={styles.optionIconCircle}>
              <Ionicons name="lock-closed-outline" size={20} color="#38BDF8" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Data Protection</Text>
              <Text style={styles.optionDesc}>Your data is encrypted</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {/* Two-Factor Authentication */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
            <View style={styles.optionIconCircle}>
              <Ionicons name="key-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Two-Factor Authentication</Text>
              <Text style={styles.optionDesc}>Add an extra layer of security</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {/* Manage Data */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => router.push('/delete-account')}
            activeOpacity={0.8}
          >
            <View style={styles.optionIconCircle}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Manage Data</Text>
              <Text style={styles.optionDesc}>Download or delete your data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Learn More Button */}
        <TouchableOpacity
          style={styles.learnMoreBtn}
          onPress={() => router.push('/policies')}
          activeOpacity={0.88}
        >
          <Text style={styles.learnMoreText}>Learn More</Text>
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
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroBox: {
    alignItems: 'center',
    marginVertical: 20,
  },
  shieldCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38BDF8',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  heroSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  optionsList: {
    width: '100%',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginVertical: 20,
    gap: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  optionDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  learnMoreBtn: {
    width: '100%',
    height: 52,
    backgroundColor: THEME.colors.accentViolet,
    borderRadius: THEME.radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: THEME.colors.accentViolet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  learnMoreText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
