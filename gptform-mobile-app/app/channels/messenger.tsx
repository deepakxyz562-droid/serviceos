import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { API_BASE_URL, API_PATHS } from '@/lib/constants';
import { apiRequest } from '@/lib/api';

export default function MessengerChannelScreen() {
  const router = useRouter();

  const [isConnected, setIsConnected] = useState(false);
  const [pageName, setPageName] = useState('');
  const [aiAutoResponder, setAiAutoResponder] = useState(true);
  const [greetingMessage, setGreetingMessage] = useState(
    'Hi there! Thanks for reaching out. How can our team and AI assistant help you today?'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>(API_PATHS.channels)
      .then((channels) => {
        if (Array.isArray(channels)) {
          const fb = channels.find((c) => c.type === 'messenger' || c.channel === 'messenger');
          if (fb) {
            setIsConnected(!!fb.connected || fb.status === 'active');
            if (fb.config?.pageName) setPageName(fb.config.pageName);
            if (fb.config?.greetingMessage) setGreetingMessage(fb.config.greetingMessage);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConnectFacebook = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Connect Facebook Page',
      'Select your Facebook Business Page to allow GPTForm AI agent to respond to Messenger chats.\n\nOpen Meta OAuth authentication in browser?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect Meta OAuth',
          onPress: () => {
            const oauthUrl = `${API_BASE_URL}/api/oauth/facebook/callback`;
            Linking.openURL(oauthUrl).catch(() => {
              Alert.alert('Browser Error', 'Could not open Meta OAuth. Please try from your desktop dashboard.');
            });
          },
        },
      ]
    );
  };

  const handleToggleAutoResponder = (val: boolean) => {
    hapticFeedback.light();
    setAiAutoResponder(val);
  };

  const handleDisconnect = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Disconnect Messenger',
      'Are you sure you want to disconnect Facebook Messenger? Your AI agent will no longer respond to incoming page messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setIsConnected(false);
            setPageName('');
          },
        },
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
        <Text style={styles.headerTitle}>Facebook Messenger</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.messengerIconCircle}>
            <FontAwesome5 name="facebook-messenger" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Connect Facebook Page Messenger</Text>
          <Text style={styles.heroDesc}>
            Reply instantly to customers messaging your Facebook Page. Capture leads, schedule quotes, and answer service inquiries 24/7.
          </Text>

          {isConnected ? (
            <View style={styles.connectedPillRow}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.connectedPageText}>
                {pageName ? pageName : 'Facebook Page'} · Active & Synced
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={handleConnectFacebook}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="facebook-messenger" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.connectBtnText}>Connect Facebook Page</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Benefits Checklist */}
        <View style={styles.checklistCard}>
          <Text style={styles.checkTitle}>Messenger Integration Features:</Text>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Instant AI responses within Facebook's 24-hr policy</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Syncs directly into your unified Mobile Inbox</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Auto-creates lead cards with contact details</Text>
          </View>
        </View>

        {/* Automation Settings */}
        <Text style={styles.sectionHeader}>PAGE MESSAGING CONTROLS</Text>
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>AI Autopilot Responder</Text>
              <Text style={styles.settingSubtitle}>
                AI agent answers customer inquiries instantly based on your company knowledge.
              </Text>
            </View>
            <Switch
              value={aiAutoResponder}
              onValueChange={handleToggleAutoResponder}
              trackColor={{ false: '#CBD5E1', true: '#0084FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={{ paddingTop: 6 }}>
            <Text style={styles.settingTitle}>Instant Welcome Greeting</Text>
            <Text style={styles.settingSubtitle}>
              Sent automatically the moment a user opens a new chat on your Facebook Page:
            </Text>
            <TextInput
              style={styles.greetingInput}
              value={greetingMessage}
              onChangeText={setGreetingMessage}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Actions */}
        {isConnected ? (
          <TouchableOpacity
            style={styles.disconnectBtn}
            onPress={handleDisconnect}
            activeOpacity={0.8}
          >
            <Text style={styles.disconnectBtnText}>Disconnect Messenger Channel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.manualVerifyBtn}
            onPress={() => {
              setIsConnected(true);
              setPageName('Main Facebook Page');
              Alert.alert('Channel Activated', 'Facebook Messenger channel has been marked as active.');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.manualVerifyText}>Mark as Connected (Direct API)</Text>
          </TouchableOpacity>
        )}
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
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 16,
    shadowColor: '#0084FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  messengerIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0084FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  connectedPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  connectedPageText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0084FF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    gap: 8,
  },
  checkTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  greetingInput: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  disconnectBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  disconnectBtnText: {
    color: '#E11D48',
    fontSize: 13,
    fontWeight: '700',
  },
  manualVerifyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  manualVerifyText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
});
