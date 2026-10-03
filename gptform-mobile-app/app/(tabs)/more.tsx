import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Switch,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { hapticFeedback } from '@/lib/haptics';

export default function MoreScreen() {
  const { user, logout } = useAuthStore();
  const [acceptChats, setAcceptChats] = useState(true);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  const handleToggleAcceptChats = async (val: boolean) => {
    await hapticFeedback.light();
    setAcceptChats(val);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await hapticFeedback.warning();
          await logout();
        },
      },
    ]);
  };

  const handleSendContact = async () => {
    if (contactMessage.length < 20) {
      Alert.alert('Notice', 'Please type at least 20 characters.');
      return;
    }
    await hapticFeedback.success();
    Alert.alert('Sent', 'Your message has been sent to our support team.');
    setContactModalVisible(false);
    setContactMessage('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: More */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More</Text>
        </View>

        {/* Profile Card (matches 18.35.50.jpeg) */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => hapticFeedback.light()}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>
                {user?.name || 'Account Owner'}
              </Text>
              <View style={styles.ownerBadge}>
                <Text style={styles.ownerBadgeText}>Owner</Text>
              </View>
            </View>
            <Text style={styles.profileRole}>Product Expert</Text>
            <Text style={styles.profileEmail}>
              {user?.email || 'Active Account'}
            </Text>
          </View>

          <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
        </TouchableOpacity>

        {/* Accept Chats Card */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <MaterialIcons name="chat-bubble-outline" size={20} color="#1e293b" style={{ marginRight: 12 }} />
            <Text style={styles.toggleLabel}>Accept chats</Text>
          </View>
          <Switch
            value={acceptChats}
            onValueChange={handleToggleAcceptChats}
            trackColor={{ false: '#cbd5e1', true: '#10b981' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* AI Voice Receptionist Card ($29/mo) */}
        <TouchableOpacity
          style={styles.receptionistCard}
          onPress={() => {
            hapticFeedback.light();
            router.push('/receptionist');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.receptionistLeft}>
            <View style={styles.receptionistIconWrap}>
              <MaterialIcons name="phone-in-talk" size={22} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.receptionistTitle}>AI Voice Receptionist</Text>
                <View style={styles.receptionistBadge}>
                  <Text style={styles.receptionistBadgeText}>$29/mo</Text>
                </View>
              </View>
              <Text style={styles.receptionistSubtitle}>
                24/7 phone call answering & calendar booking
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#8b5cf6" />
        </TouchableOpacity>

        {/* Leads & Bookings Card */}
        <View style={styles.groupedCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/(tabs)/leads' as any);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="assignment-ind" size={22} color="#10b981" style={{ marginRight: 14 }} />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.menuLabel}>Leads & Pipeline</Text>
                  <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                    <Text style={{ color: '#059669', fontSize: 10, fontWeight: '800' }}>AI Qualified</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Customer contacts, estimates & status</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/(tabs)/bookings' as any);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="event-available" size={22} color="#3b82f6" style={{ marginRight: 14 }} />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.menuLabel}>Bookings & Calendar</Text>
                  <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                    <Text style={{ color: '#2563eb', fontSize: 10, fontWeight: '800' }}>2-Way Sync</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>Appointments, Google Meet & intake</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Grouped Menu Card 1: Team, Notifications, Appearance, Contact Us */}
        <View style={styles.groupedCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/team');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="people-outline" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Team</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/notifications');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="notifications-none" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Notifications</Text>
            </View>
            <View style={styles.menuRight}>
              <View style={styles.alertExclamation}>
                <Text style={styles.alertExclamationText}>!</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/appearance');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="palette" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Appearance</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              setContactModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="mail-outline" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Contact us</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Grouped Card 2: Tickets */}
        <View style={styles.groupedCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/tickets');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="confirmation-number" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Tickets</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Grouped Card 3: Channels & Forms */}
        <View style={styles.groupedCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/channels');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="hub" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Channels & Integrations</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/forms');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="description" size={22} color="#1e293b" style={{ marginRight: 14 }} />
              <Text style={styles.menuLabel}>Forms & Submissions</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Log out Card */}
        <TouchableOpacity
          style={styles.logoutCard}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialIcons name="logout" size={20} color="#ef4444" style={{ marginRight: 12 }} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerLogo}>text</Text>
          <Text style={styles.footerVersion}>v2.44.3-080 · GPTForm Mobile</Text>
        </View>
      </ScrollView>

      {/* Contact Us Bottom Sheet Modal (matches 18.35.49 (1).jpeg) */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>How can we help you?</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18 }}>
              <TextInput
                style={styles.contactInput}
                multiline
                numberOfLines={4}
                placeholder="Type a message (min. 20 characters)"
                placeholderTextColor="#94a3b8"
                value={contactMessage}
                onChangeText={setContactMessage}
              />

              <TouchableOpacity style={styles.addScreenshotsBtn}>
                <MaterialIcons name="photo-camera" size={18} color="#1e293b" style={{ marginRight: 8 }} />
                <Text style={styles.addScreenshotsText}>Add screenshots</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendContactBtn, contactMessage.length < 20 && { opacity: 0.5 }]}
                disabled={contactMessage.length < 20}
                onPress={handleSendContact}
              >
                <Text style={styles.sendContactText}>Send message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 10,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ca8a04',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  ownerBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  profileRole: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  groupedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  alertExclamation: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertExclamationText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ef4444',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginLeft: 54,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
  footerWrap: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  footerLogo: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#0f172a',
  },
  footerVersion: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  contactInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  addScreenshotsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  addScreenshotsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  sendContactBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  sendContactText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  receptionistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e9d5ff',
    marginBottom: 14,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  receptionistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  receptionistIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  receptionistTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  receptionistBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  receptionistBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  receptionistSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
