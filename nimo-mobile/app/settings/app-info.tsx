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
import { NimoLogo } from '../../src/components/NimoLogo';

export default function AppInfoScreen() {
  const router = useRouter();

  const handleCheckUpdates = () => {
    Alert.alert('Up to Date 🎉', 'You are running the latest version of NIMO (v1.0.0 Build 100).');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Brand Emblem & Version */}
        <View style={styles.logoSection}>
          <NimoLogo size="hero" showText showTagline alignCenter />
          <Text style={styles.versionText}>Version 1.0.0 (Build 100)</Text>
        </View>

        {/* Options List */}
        <View style={styles.optionsList}>
          {/* About NIMO */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => router.push('/policies')}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="information-circle-outline" size={20} color="#C084FC" style={styles.icon} />
              <Text style={styles.optionTitle}>About NIMO</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Rate Our App */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => Alert.alert('Thank You ⭐', 'Redirecting to App Store rating...')}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="star-outline" size={20} color="#FBBF24" style={styles.icon} />
              <Text style={styles.optionTitle}>Rate Our App</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Share App */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => Alert.alert('Share NIMO', 'https://nimo.ai/download')}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="share-social-outline" size={20} color="#38BDF8" style={styles.icon} />
              <Text style={styles.optionTitle}>Share App</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Check for Updates */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleCheckUpdates}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="sync-outline" size={20} color="#10B981" style={styles.icon} />
              <Text style={styles.optionTitle}>Check for Updates</Text>
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
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  versionText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 8,
    fontWeight: '600',
  },
  optionsList: {
    width: '100%',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginTop: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginLeft: 48,
  },
});
