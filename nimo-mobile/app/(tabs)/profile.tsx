import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../src/theme/tokens';
import { useAppStore } from '../../src/store/useAppStore';

export default function MyProfileScreen() {
  const router = useRouter();
  const { userName, userEmail, coinsAvailable, creationsCount, subscriptionPlan, identityPhotos } = useAppStore();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.settingsIconBtn}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Avatar Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' }}
              style={styles.avatarImg}
            />
          </View>

          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>

          <TouchableOpacity style={styles.editProfileBtn} onPress={() => router.push('/settings')}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row: 1.2K Creations | 245 Credits | Pro Plan */}
        <View style={styles.statsCard}>
          <TouchableOpacity
            style={styles.statCol}
            onPress={() => router.push('/(tabs)/gallery')}
          >
            <Text style={styles.statNumber}>{creationsCount}</Text>
            <Text style={styles.statLabel}>Creations</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statCol}
            onPress={() => router.push('/coins')}
          >
            <Text style={styles.statNumber}>{coinsAvailable}</Text>
            <Text style={styles.statLabel}>Credits</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statCol}
            onPress={() => router.push('/paywall')}
          >
            <Text style={styles.statNumber}>{subscriptionPlan || 'Pro'}</Text>
            <Text style={styles.statLabel}>Plan</Text>
          </TouchableOpacity>
        </View>

        {/* VIP AI Identity Album Card */}
        <TouchableOpacity
          style={styles.identityCard}
          onPress={() => router.push('/identity/setup')}
          activeOpacity={0.85}
        >
          <View style={styles.identityCardHeader}>
            <View style={styles.identityIconBadge}>
              <Ionicons name="sparkles" size={18} color={THEME.colors.accentViolet} />
            </View>
            <View style={styles.identityTitleCol}>
              <Text style={styles.identityTitle}>My AI Identity Profile</Text>
              <Text style={styles.identitySubtitle}>
                {identityPhotos.length >= 5
                  ? `${identityPhotos.length} Photos Trained • 1-Tap Ready ✨`
                  : `${identityPhotos.length}/5 Photos • Complete to unlock 1-Tap`}
              </Text>
            </View>
            <View style={styles.identityActionBtn}>
              <Text style={styles.identityActionText}>Manage</Text>
              <Ionicons name="chevron-forward" size={14} color={THEME.colors.accentViolet} />
            </View>
          </View>

          {/* Quick Photo Preview Strip */}
          <View style={styles.identityThumbsRow}>
            {identityPhotos.slice(0, 5).map((uri, idx) => (
              <Image key={`id-thumb-${idx}`} source={{ uri }} style={styles.identityThumb} resizeMode="cover" />
            ))}
            {identityPhotos.length < 5 && (
              <View style={styles.identityThumbEmpty}>
                <Ionicons name="add" size={16} color={THEME.colors.textMuted} />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Menu Navigation Rows */}
        <View style={styles.menuContainer}>
          {/* My Creations */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(tabs)/gallery')}
            activeOpacity={0.8}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="images-outline" size={20} color={THEME.colors.accentViolet} />
              </View>
              <Text style={styles.menuTitle}>My Creations</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {/* Favorites */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/gallery/favorites')}
            activeOpacity={0.8}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="heart-outline" size={20} color="#EC4899" />
              </View>
              <Text style={styles.menuTitle}>Favorites</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {/* Purchase History */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/coins')}
            activeOpacity={0.8}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="card-outline" size={20} color="#FBBF24" />
              </View>
              <Text style={styles.menuTitle}>Purchase History</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/settings')}
            activeOpacity={0.8}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="settings-outline" size={20} color="#38BDF8" />
              </View>
              <Text style={styles.menuTitle}>Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/settings/support')}
            activeOpacity={0.8}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="headset-outline" size={20} color="#A855F7" />
              </View>
              <Text style={styles.menuTitle}>Help & Support</Text>
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
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  settingsIconBtn: {
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
  userCard: {
    alignItems: 'center',
    marginVertical: 14,
  },
  avatarWrapper: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    borderColor: '#FFF',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 10,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  userEmail: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  editProfileBtn: {
    marginTop: 12,
    backgroundColor: THEME.colors.accentViolet,
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: THEME.radii.pill,
  },
  editProfileText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginVertical: 16,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: THEME.colors.border,
    alignSelf: 'center',
  },
  identityCard: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.borderLight,
    marginBottom: 16,
    gap: 12,
  },
  identityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identityIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityTitleCol: {
    flex: 1,
  },
  identityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  identitySubtitle: {
    fontSize: 12,
    color: THEME.colors.accentViolet,
    marginTop: 2,
  },
  identityActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radii.pill,
  },
  identityActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.accentViolet,
  },
  identityThumbsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  identityThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  identityThumbEmpty: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  menuContainer: {
    backgroundColor: THEME.colors.bgCard,
    borderRadius: THEME.radii.xl,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
});
