import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth-store';
import { WEB_URL } from '../../src/lib/constants';

export default function ToolsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [aiChatbotEnabled, setAiChatbotEnabled] = useState(true);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);

  const businessSlug = user?.name ? user.name.toLowerCase().replace(/\s+/g, '-') : 'my-business';
  const profileUrl = `${WEB_URL}/p/${businessSlug}`;
  const bookingUrl = `${WEB_URL}/book/${businessSlug}`;
  const formUrl = `${WEB_URL}/f/${businessSlug}`;

  const handleShareLink = async (url: string, title: string) => {
    try {
      await Share.share({
        message: `${title}: ${url}`,
        url,
        title,
      });
    } catch {
      Alert.alert('Link', url);
    }
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of BGOS?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tools & Settings</Text>
          <Text style={styles.subtitle}>Digital Card, Funnels & AI Controls</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Growth Links & Digital Identity */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeading}>Digital Identity & Live Links</Text>

          {/* Profile Card Link */}
          <View style={styles.linkItem}>
            <View style={[styles.linkIconBox, { backgroundColor: '#0284c720' }]}>
              <MaterialIcons name="badge" size={20} color="#38bdf8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>Digital Business Card</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>{profileUrl}</Text>
            </View>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleShareLink(profileUrl, 'My Business Card')}
            >
              <MaterialIcons name="share" size={18} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleOpenLink(profileUrl)}
            >
              <MaterialIcons name="open-in-new" size={18} color="#38bdf8" />
            </TouchableOpacity>
          </View>

          {/* Booking Page Link */}
          <View style={styles.linkItem}>
            <View style={[styles.linkIconBox, { backgroundColor: '#8b5cf620' }]}>
              <MaterialIcons name="event" size={20} color="#c084fc" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>Appointment Booking Link</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>{bookingUrl}</Text>
            </View>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleShareLink(bookingUrl, 'Book an Appointment')}
            >
              <MaterialIcons name="share" size={18} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleOpenLink(bookingUrl)}
            >
              <MaterialIcons name="open-in-new" size={18} color="#c084fc" />
            </TouchableOpacity>
          </View>

          {/* Hosted Form Link */}
          <View style={styles.linkItem}>
            <View style={[styles.linkIconBox, { backgroundColor: '#10b98120' }]}>
              <MaterialIcons name="dynamic-form" size={20} color="#34d399" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>BGOS Intake Form</Text>
              <Text style={styles.linkUrl} numberOfLines={1}>{formUrl}</Text>
            </View>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleShareLink(formUrl, 'Inquiry Form')}
            >
              <MaterialIcons name="share" size={18} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleOpenLink(formUrl)}
            >
              <MaterialIcons name="open-in-new" size={18} color="#34d399" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 2: AI Automation Controls */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeading}>AI Agents & Automation Controls</Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>24/7 AI Website Chatbot</Text>
              <Text style={styles.toggleDesc}>Answers questions and qualifies leads automatically</Text>
            </View>
            <Switch
              value={aiChatbotEnabled}
              onValueChange={setAiChatbotEnabled}
              trackColor={{ false: '#334155', true: '#0284c7' }}
              thumbColor={aiChatbotEnabled ? '#38bdf8' : '#94a3b8'}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: '#334155' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Instant WhatsApp Auto-Reply</Text>
              <Text style={styles.toggleDesc}>Greets new leads with interactive booking options</Text>
            </View>
            <Switch
              value={autoReplyEnabled}
              onValueChange={setAutoReplyEnabled}
              trackColor={{ false: '#334155', true: '#0284c7' }}
              thumbColor={autoReplyEnabled ? '#38bdf8' : '#94a3b8'}
            />
          </View>
        </View>

        {/* Section 3: Plan & Growth Credits */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeading}>Plan & Growth Credits</Text>
          <View style={styles.planBadgeRow}>
            <View>
              <Text style={styles.planNameText}>BGOS Growth Plan</Text>
              <Text style={styles.planPriceText}>₹1,499 / month</Text>
            </View>
            <View style={styles.activePlanPill}>
              <Text style={styles.activePlanPillText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.creditsGrid}>
            <View style={styles.creditBox}>
              <Text style={styles.creditNum}>2,450</Text>
              <Text style={styles.creditLabel}>B2B Lead Credits</Text>
            </View>
            <View style={styles.creditBox}>
              <Text style={styles.creditNum}>10,000</Text>
              <Text style={styles.creditLabel}>WhatsApp Broadcasts</Text>
            </View>
          </View>
        </View>

        {/* Section 4: Account Information */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeading}>Account Details</Text>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>User Name</Text>
            <Text style={styles.accountValue}>{user?.name || 'Administrator'}</Text>
          </View>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Email</Text>
            <Text style={styles.accountValue}>{user?.email || 'admin@bgos.in'}</Text>
          </View>
          <View style={styles.accountRow}>
            <Text style={styles.accountLabel}>Product Workspace</Text>
            <Text style={styles.accountValue}>BGOS Production (India)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef444415',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  cardSection: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  linkIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  linkUrl: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  actionIconBtn: {
    padding: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  toggleDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  planBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  planNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  planPriceText: {
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 2,
  },
  activePlanPill: {
    backgroundColor: '#0284c730',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  activePlanPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
  },
  creditsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  creditBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  creditNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  creditLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  accountLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  accountValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
