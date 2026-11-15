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

export default function HelpSupportScreen() {
  const router = useRouter();

  const handleSendMessage = () => {
    Alert.alert(
      'Message Sent 🚀',
      'Thank you for contacting NIMO Support! Our team will respond to your email within 2 hours.'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Headphones Hero Graphic */}
        <View style={styles.heroBox}>
          <View style={styles.headphoneCircle}>
            <Ionicons name="headset" size={48} color="#C084FC" />
          </View>
          <Text style={styles.heroTitle}>Need Help?</Text>
          <Text style={styles.heroSubtitle}>We're here to help you</Text>
        </View>

        {/* Options List */}
        <View style={styles.optionsList}>
          {/* FAQs */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
            <View style={styles.optionLeft}>
              <Ionicons name="help-circle-outline" size={20} color="#C084FC" style={styles.icon} />
              <Text style={styles.optionTitle}>FAQs</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Contact Us */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
            <View style={styles.optionLeft}>
              <Ionicons name="mail-outline" size={20} color="#C084FC" style={styles.icon} />
              <Text style={styles.optionTitle}>Contact Us</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Live Chat */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
            <View style={styles.optionLeft}>
              <Ionicons name="chatbubbles-outline" size={20} color="#C084FC" style={styles.icon} />
              <Text style={styles.optionTitle}>Live Chat</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.onlineText}>Online</Text>
              <Ionicons name="chevron-forward" size={16} color={THEME.colors.textMuted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Report a Problem */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => router.push('/report')}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="warning-outline" size={20} color="#F59E0B" style={styles.icon} />
              <Text style={styles.optionTitle}>Report a Problem</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* App Information */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => router.push('/settings/app-info')}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="information-circle-outline" size={20} color="#38BDF8" style={styles.icon} />
              <Text style={styles.optionTitle}>App Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Send a Message Button */}
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSendMessage}
          activeOpacity={0.88}
        >
          <Text style={styles.sendBtnText}>Send a Message</Text>
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
  headphoneCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A855F7',
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
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    marginVertical: 20,
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
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  onlineText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  sendBtn: {
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
  sendBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
