import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { apiRequest, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import { registerForPushNotifications } from '@/lib/notifications';
import * as Notifications from 'expo-notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [sendNotifications, setSendNotifications] = useState(true);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [soundChoice, setSoundChoice] = useState('Default');
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);

  /**
   * Fetch the user's NotificationPreference row from the backend and seed
   * the local switch state. Falls back silently to defaults on error.
   */
  const fetchPrefs = useCallback(async () => {
    try {
      const res = await apiRequest<{
        pushEnabled?: boolean;
        inAppEnabled?: boolean;
        typePrefsJson?: string;
      }>(API_PATHS.notificationPreferences);
      const sendOn = res.pushEnabled !== false && res.inAppEnabled !== false;
      setSendNotifications(sendOn);
      if (typeof res.typePrefsJson === 'string' && res.typePrefsJson) {
        try {
          const tpr = JSON.parse(res.typePrefsJson) || {};
          if (typeof tpr.soundEnabled === 'boolean') setSoundNotifications(tpr.soundEnabled);
          if (typeof tpr.soundChoice === 'string' && tpr.soundChoice) setSoundChoice(tpr.soundChoice);
        } catch {}
      }
    } catch {
      // Non-fatal: defaults remain in place.
    } finally {
      setPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  /**
   * Persist the send-notifications toggle to the backend by writing both
   * `pushEnabled` and `inAppEnabled` (mirrors what the user sees: turning
   * this off kills all app notifications). Optimistic + revert on error.
   */
  const handleToggleSendNotifications = async (val: boolean) => {
    setSendNotifications(val);
    if (prefsSaving) return;
    setPrefsSaving(true);
    try {
      await apiRequest(API_PATHS.notificationPreferences, {
        method: 'PUT',
        body: { pushEnabled: val, inAppEnabled: val },
      });
    } catch (err: any) {
      setSendNotifications(!val);
      Alert.alert(
        'Save failed',
        err instanceof ApiError ? err.message : 'Could not save your preference.',
      );
    } finally {
      setPrefsSaving(false);
    }
  };

  /**
   * Persist the sound-notifications toggle by writing it into the
   * NotificationPreference.typePrefsJson blob (merged with existing keys
   * so we don't clobber other topic prefs).
   */
  const persistSoundPrefs = async (soundEnabled: boolean, soundChoiceStr?: string) => {
    setPrefsSaving(true);
    try {
      const cur = await apiRequest<{ typePrefsJson?: string }>(
        API_PATHS.notificationPreferences,
      ).catch(() => ({ typePrefsJson: '{}' }));
      let tpr: Record<string, any> = {};
      try {
        tpr = cur.typePrefsJson ? JSON.parse(cur.typePrefsJson) || {} : {};
      } catch {}
      tpr.soundEnabled = soundEnabled;
      if (typeof soundChoiceStr === 'string') tpr.soundChoice = soundChoiceStr;
      await apiRequest(API_PATHS.notificationPreferences, {
        method: 'PUT',
        body: { typePrefsJson: JSON.stringify(tpr) },
      });
    } catch (err: any) {
      Alert.alert(
        'Save failed',
        err instanceof ApiError ? err.message : 'Could not save your preference.',
      );
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleToggleSoundNotifications = async (val: boolean) => {
    setSoundNotifications(val);
    await persistSoundPrefs(val, soundChoice);
  };

  const handleChooseSound = (choice: string) => {
    setSoundChoice(choice);
    persistSoundPrefs(soundNotifications, choice);
  };

  /**
   * Real push-notification diagnostic.
   *
   * Calls `registerForPushNotifications()` (which requests iOS/Android
   * permissions, fetches an Expo push token, and POSTs it to
   * /api/notifications/push/subscribe), then surfaces the real result:
   * success + token (truncated) on green, or the actual error string on
   * red. Replaces the previous hardcoded "✅ Device Token: Registered /
   * ✅ APNs / FCM: Connected / ✅ Background Fetch: Enabled" banner.
   */
  const runDiagnostic = async () => {
    if (diagnosticRunning) return;
    setDiagnosticRunning(true);
    try {
      let permStatus = 'unknown';
      try {
        // expo-notifications is conditionally imported inside notifications.ts
        // (web falls back to a no-op). We can't reach `Notifications` directly
        // here, so we rely on registerForPushNotifications to do the
        // permission check internally and surface the result.
        // This try/catch only runs if the module is reachable from this
        // screen (e.g. via a require() shim).
        if (Notifications?.getPermissionsAsync) {
          const permRes = await Notifications.getPermissionsAsync();
          permStatus = permRes?.status || 'unknown';
        }
      } catch {}

      const result = await registerForPushNotifications(user?.id);
      if (result.success && result.token) {
        Alert.alert(
          '✅ Push Diagnostic Passed',
          `Permission: ${permStatus}\nDevice Token: Registered\nToken: ${result.token.slice(0, 24)}…\nBackend subscription: Active\n\nPush notifications are working properly.`,
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert(
          '⚠️ Push Diagnostic Failed',
          `Permission: ${permStatus}\nResult: ${result.error || 'Could not register for push notifications.'}\n\nPush notifications are NOT working on this device.`,
          [{ text: 'OK' }],
        );
      }
    } catch (err: any) {
      Alert.alert(
        '⚠️ Push Diagnostic Failed',
        err?.message || 'An unexpected error occurred while running the diagnostic.',
        [{ text: 'OK' }],
      );
    } finally {
      setDiagnosticRunning(false);
    }
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
          disabled={diagnosticRunning}
          activeOpacity={0.7}
        >
          <View style={styles.troubleTextContainer}>
            <Text style={styles.troubleTitle}>Troubleshooting</Text>
            <Text style={styles.troubleDesc}>
              Push notifications are not working? Click to run diagnostic tool.
            </Text>
          </View>
          <View style={styles.troubleIconBadge}>
            {diagnosticRunning ? (
              <ActivityIndicator color="#DC2626" size="small" />
            ) : (
              <Ionicons name="alert-circle" size={26} color="#DC2626" />
            )}
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
              onValueChange={handleToggleSendNotifications}
              disabled={!prefsLoaded || prefsSaving}
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
              onValueChange={handleToggleSoundNotifications}
              disabled={!prefsLoaded || prefsSaving}
              trackColor={{ false: '#CBD5E1', true: '#10B981' }}
              thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.rowPressable}
            onPress={() => {
              Alert.alert('Notification Sound', 'Choose notification ringtone:', [
                { text: 'Default (Chime)', onPress: () => handleChooseSound('Default') },
                { text: 'Ping', onPress: () => handleChooseSound('Ping') },
                { text: 'Subtle Pulse', onPress: () => handleChooseSound('Subtle Pulse') },
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
