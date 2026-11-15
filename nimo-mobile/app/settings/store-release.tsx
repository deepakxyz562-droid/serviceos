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

export default function StoreReleaseInfoScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store Release Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Google Play Ready Hero */}
        <View style={styles.heroBox}>
          <View style={styles.playStoreCircle}>
            <Ionicons name="logo-google-playstore" size={48} color="#FBBF24" />
          </View>
          <Text style={styles.heroTitle}>Google Play Ready</Text>
          <Text style={styles.heroSubtitle}>Your app meets all policies</Text>
        </View>

        {/* Policy Checklist */}
        <View style={styles.checklistCard}>
          {/* Content Policy */}
          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <View style={styles.checkIconBox}>
                <Ionicons name="checkmark" size={16} color="#10B981" />
              </View>
              <Text style={styles.checkTitle}>Content Policy</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusTextActive}>Compliant</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Data Safety */}
          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <View style={styles.checkIconBox}>
                <Ionicons name="checkmark" size={16} color="#10B981" />
              </View>
              <Text style={styles.checkTitle}>Data Safety</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusTextActive}>Verified</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Permissions */}
          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <View style={styles.checkIconBox}>
                <Ionicons name="checkmark" size={16} color="#10B981" />
              </View>
              <Text style={styles.checkTitle}>Permissions</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusTextActive}>Optimized</Text>
            </View>
          </View>
        </View>

        {/* View Details Button */}
        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => Alert.alert('Compliance Checklist', 'NIMO conforms to all Google Play AI-generated content disclosures, Target API 35 requirements, and DPDPA data protection standards.')}
          activeOpacity={0.88}
        >
          <Text style={styles.detailsBtnText}>View Details</Text>
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
  playStoreCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FBBF24',
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
  checklistCard: {
    width: '100%',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginVertical: 20,
  },
  checkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  checkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusTextActive: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginLeft: 56,
  },
  detailsBtn: {
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
  detailsBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
