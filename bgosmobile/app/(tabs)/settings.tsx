import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/auth-store';
import { BRAND, WEB_URL } from '../../src/lib/constants';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Chatbotly?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const openWebDashboard = () => {
    Linking.openURL(WEB_URL).catch(() => Alert.alert('Error', 'Unable to open browser'));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Account & Chatbotly configuration</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || user?.email || 'U')[0].toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.userName}>{user?.name || 'Chatbotly Admin'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'admin@company.com'}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Pro Plan</Text>
            </View>
          </View>
        </View>

        {/* Action Group */}
        <Text style={styles.sectionTitle}>Tools & Integrations</Text>
        <View style={styles.group}>
          <TouchableOpacity style={styles.row} onPress={openWebDashboard}>
            <MaterialIcons name="open-in-browser" size={22} color="#38bdf8" />
            <Text style={styles.rowText}>Open Web Studio ({WEB_URL})</Text>
            <MaterialIcons name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('Live Chat', 'Live chat widget is currently ACTIVE on your domain.')}
          >
            <MaterialIcons name="chat" size={22} color="#22c55e" />
            <Text style={styles.rowText}>Website Chat Widget</Text>
            <Text style={styles.statusActive}>Active</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('WhatsApp Connected', 'Your business number is connected to Chatbotly.')}
          >
            <MaterialIcons name="phone" size={22} color="#22c55e" />
            <Text style={styles.rowText}>WhatsApp Integration</Text>
            <Text style={styles.statusActive}>Connected</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>{BRAND.name} v1.0.0 • Production Build</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155', marginBottom: 24 },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  userName: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  userEmail: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(56, 189, 248, 0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#38bdf8' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  group: { backgroundColor: '#1e293b', borderRadius: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#f8fafc', marginLeft: 14 },
  divider: { height: 1, backgroundColor: '#334155' },
  statusActive: { fontSize: 12, fontWeight: '700', color: '#22c55e' },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', height: 50, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444', marginLeft: 8 },
  versionText: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 20 },
});
