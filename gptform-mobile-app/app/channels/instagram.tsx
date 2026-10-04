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
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { API_BASE_URL, API_PATHS } from '@/lib/constants';
import { apiRequest } from '@/lib/api';

export default function InstagramChannelScreen() {
  const router = useRouter();

  const [isConnected, setIsConnected] = useState(false);
  const [handle, setHandle] = useState('');
  const [aiAutoResponder, setAiAutoResponder] = useState(true);
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(true);
  const [triggerKeywords, setTriggerKeywords] = useState('price, book, quote, order, help, appointment');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check real channel status
    apiRequest<any[]>(API_PATHS.channels)
      .then((channels) => {
        if (Array.isArray(channels)) {
          const ig = channels.find((c) => c.type === 'instagram' || c.channel === 'instagram');
          if (ig) {
            setIsConnected(!!ig.connected || ig.status === 'active');
            if (ig.config?.handle) setHandle(ig.config.handle);
            if (ig.config?.triggerKeywords) setTriggerKeywords(ig.config.triggerKeywords);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConnectInstagram = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Connect Instagram Professional',
      'To connect your Instagram Direct Messages:\n\n1. Ensure your Instagram is switched to a Professional or Creator account.\n2. Ensure it is connected to your Facebook Business Page.\n3. Grant "instagram_manage_messages" permission.\n\nOpen Meta OAuth connection in browser?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Connect Meta OAuth',
          onPress: () => {
            const oauthUrl = `${API_BASE_URL}/api/oauth/instagram/callback`;
            Linking.openURL(oauthUrl).catch(() => {
              Alert.alert('Browser Error', 'Could not open Meta OAuth. Please try from your desktop dashboard or verify browser settings.');
            });
          },
        },
      ]
    );
  };

  const handleToggleAutoResponder = async (val: boolean) => {
    hapticFeedback.light();
    setAiAutoResponder(val);
  };

  const handleToggleLeadCapture = async (val: boolean) => {
    hapticFeedback.light();
    setLeadCaptureEnabled(val);
  };

  const handleDisconnect = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Disconnect Instagram',
      'Are you sure you want to disconnect Instagram Direct Messages? Your AI agent will stop answering customer DMs.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setIsConnected(false);
            setHandle('');
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
        <Text style={styles.headerTitle}>Instagram Direct</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.igIconCircle}>
            <FontAwesome name="instagram" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Automate Instagram Inquiries & DMs</Text>
          <Text style={styles.heroDesc}>
            Turn story replies, bio link clicks, and DM questions into qualified leads, orders, and booked appointments automatically with your 24/7 AI employee.
          </Text>

          {isConnected ? (
            <View style={styles.connectedPillRow}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.connectedHandleText}>
                {handle ? `@${handle}` : 'Instagram Professional'} · Active & Linked
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectMetaBtn}
              onPress={handleConnectInstagram}
              activeOpacity={0.8}
            >
              <FontAwesome name="instagram" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.connectMetaBtnText}>Connect Instagram Professional</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Requirements Checklist */}
        <View style={styles.checklistCard}>
          <Text style={styles.checkTitle}>Requirements for Meta API:</Text>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Instagram Professional / Creator Account</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>Linked to a Facebook Business Page</Text>
          </View>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            <Text style={styles.checkText}>"Allow Access to Messages" enabled in Instagram Settings</Text>
          </View>
        </View>

        {/* Automation Settings */}
        <Text style={styles.sectionHeader}>DM AUTOMATION CONTROLS</Text>
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>AI Autopilot Responder</Text>
              <Text style={styles.settingSubtitle}>
                AI automatically replies to incoming DMs within 3 seconds using your business catalog and knowledge base.
              </Text>
            </View>
            <Switch
              value={aiAutoResponder}
              onValueChange={handleToggleAutoResponder}
              trackColor={{ false: '#CBD5E1', true: '#E1306C' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.settingTitle}>Auto-Qualify & Capture Leads</Text>
              <Text style={styles.settingSubtitle}>
                Ask for customer phone, name, and service need before handing off to human inbox.
              </Text>
            </View>
            <Switch
              value={leadCaptureEnabled}
              onValueChange={handleToggleLeadCapture}
              trackColor={{ false: '#CBD5E1', true: '#E1306C' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={{ paddingTop: 8 }}>
            <Text style={styles.settingTitle}>Priority DM Trigger Keywords</Text>
            <Text style={styles.settingSubtitle}>
              When a follower sends any of these words, the AI triggers instant VIP response & booking link:
            </Text>
            <TextInput
              style={styles.keywordInput}
              value={triggerKeywords}
              onChangeText={setTriggerKeywords}
              placeholder="e.g. price, book, menu, quote, appointment"
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
            <Text style={styles.disconnectBtnText}>Disconnect Instagram Channel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.manualVerifyBtn}
            onPress={() => {
              setIsConnected(true);
              setHandle('your_brand');
              Alert.alert('Channel Activated', 'Instagram DM channel has been set to active.');
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
    borderColor: '#FCE7F3',
    marginBottom: 16,
    shadowColor: '#E1306C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  igIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E1306C',
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
    backgroundColor: '#FDF2F8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  connectedHandleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BE185D',
  },
  connectMetaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E1306C',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  connectMetaBtnText: {
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
  keywordInput: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
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
