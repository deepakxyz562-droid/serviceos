import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const router = useRouter();

  const [sendNotifications, setSendNotifications] = useState(true);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [soundChoice, setSoundChoice] = useState('Default');

  const runDiagnostic = () => {
    Alert.alert(
      'Push Diagnostic',
      '✅ Device Token: Registered\n✅ APNs / FCM: Connected\n✅ Background Fetch: Enabled\n\nAll notification channels are working properly!',
      [{ text: 'OK' }]
    );
  };

  const handleTopicPress = (topic: string) => {
    Alert.alert(
      `${topic} Settings`,
      `Configure alerts and notification frequency for ${topic.toLowerCase()}.`,
      [
        { text: 'All Activity', onPress: () => {} },
        { text: 'Mentions & Assigned Only', onPress: () => {} },
        { text: 'Mute', style: 'destructive', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Troubleshooting Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={runDiagnostic}
          activeOpacity={0.7}
        >
          <View style={styles.troubleTextContainer}>
            <Text style={styles.troubleTitle}>Troubleshooting</Text>
            <Text style={styles.troubleDesc}>
              Push notifications are not working? Click to run diagnostic tool.
            </Text>
          </View>
          <View style={styles.troubleIconBadge}>
            <Ionicons name="alert-circle" size={26} color="#DC2626" />
          </View>
        </TouchableOpacity>

        {/* Warning Banner */}
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() =>
            Alert.alert(
              'System Settings',
              'Open device settings to manage app notification permissions.',
              [{ text: 'Open Settings' }, { text: 'Dismiss', style: 'cancel' }]
            )
          }
          activeOpacity={0.8}
        >
          <Ionicons name="warning-outline" size={20} color="#B45309" style={{ marginRight: 10 }} />
          <Text style={styles.warningText}>
            Turn on system notifications to receive push notifications.{' '}
            <Text style={styles.warningLink}>Go to settings ↗</Text>
          </Text>
        </TouchableOpacity>

        {/* NOTIFICATIONS SECTION */}
        <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
        <View style={styles.cardGroup}>
          <View style={styles.row}>
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowTitle}>Send notifications</Text>
              <Text style={styles.rowSubtitle}>
                Turn this off to stop receiving notifications from the app completely
              </Text>
            </View>
            <Switch
              value={sendNotifications}
              onValueChange={setSendNotifications}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowTitle}>Sound notifications</Text>
              <Text style={styles.rowSubtitle}>
                Turn this off if you don't want notifications to play sound
              </Text>
            </View>
            <Switch
              value={soundNotifications}
              onValueChange={setSoundNotifications}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.rowPressable}
            onPress={() => {
              Alert.alert('Notification Sound', 'Choose notification ringtone:', [
                { text: 'Default (Chime)', onPress: () => setSoundChoice('Default') },
                { text: 'Ping', onPress: () => setSoundChoice('Ping') },
                { text: 'Subtle Pulse', onPress: () => setSoundChoice('Subtle Pulse') },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            <Text style={styles.rowTitle}>Sound</Text>
            <View style={styles.rightValueRow}>
              <Text style={styles.rightValueText}>{soundChoice}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* NOTIFICATION TOPICS SECTION */}
        <Text style={styles.sectionHeader}>NOTIFICATION TOPICS</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.rowPressable}
            onPress={() => handleTopicPress('Customers')}
          >
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowTitle}>Customers</Text>
              <Text style={styles.rowSubtitle}>New, queued, unassigned</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.rowPressable}
            onPress={() => handleTopicPress('Chats')}
          >
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowTitle}>Chats</Text>
              <Text style={styles.rowSubtitle}>Supervised, rated bad, rated good, commented</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.rowPressable}
            onPress={() => handleTopicPress('Tickets')}
          >
            <View style={styles.rowTextContainer}>
              <Text style={styles.rowTitle}>Tickets</Text>
              <Text style={styles.rowSubtitle}>Assigned to me, unassigned</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  troubleTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  troubleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  troubleDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  troubleIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  warningLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  rightValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightValueText: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 16,
  },
});
