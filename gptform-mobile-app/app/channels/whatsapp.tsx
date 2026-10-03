import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

export default function WhatsAppChannelScreen() {
  const router = useRouter();

  const [aiAutoResponder, setAiAutoResponder] = useState(true);
  const [takeoverAlerts, setTakeoverAlerts] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  const handleConnectMeta = () => {
    Alert.alert(
      'Meta Business Suite',
      'Connecting via Meta Cloud API...\n\nYour WhatsApp Business number is verified and linked to your GPTForm tenant.',
      [{ text: 'OK' }]
    );
  };

  const handleTestBot = () => {
    Alert.alert(
      'Test Bot',
      'Send a test WhatsApp message to your business number (+1 415-555-0192) or open a simulated chat session.',
      [
        { text: 'Open Simulated Chat', onPress: () => router.push('/chat/whatsapp-sample' as any) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect WhatsApp',
      'Are you sure you want to disconnect WhatsApp Business? Your AI agent will no longer respond to incoming messages on this number.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setIsConnected(false);
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
        <Text style={styles.headerTitle}>WhatsApp Business</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.whatsappIconCircle}>
            <FontAwesome name="whatsapp" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Bring WhatsApp chats into your inbox</Text>
          <Text style={styles.heroDesc}>
            Reach your customers where they prefer to communicate. Answer inquiries, support shoppers, and send proactive messages — all from GPTForm.
          </Text>

          {isConnected ? (
            <View style={styles.connectedPillRow}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.connectedPhoneText}>+1 (415) 555-0192 · Active & Linked</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectMetaBtn}
              onPress={handleConnectMeta}
              activeOpacity={0.8}
            >
              <FontAwesome name="facebook-square" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.connectMetaBtnText}>Connect with Facebook / Meta</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Requirements Checklist */}
        <Text style={styles.sectionHeader}>BEFORE YOU BEGIN, ENSURE YOU HAVE:</Text>
        <View style={styles.checkCard}>
          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" style={styles.checkIcon} />
            <Text style={styles.checkText}>
              A Facebook account with admin rights to your business Meta Business Account
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" style={styles.checkIcon} />
            <Text style={styles.checkText}>
              A valid phone number not registered to another personal WhatsApp account
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" style={styles.checkIcon} />
            <Text style={styles.checkText}>
              Your business details (legal business name, address, and website)
            </Text>
          </View>
        </View>

        {/* Configuration & Status */}
        {isConnected && (
          <>
            <Text style={styles.sectionHeader}>CONNECTED NUMBER DETAILS</Text>
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Display Name</Text>
                <Text style={styles.detailValue}>HydroPlumbing & Heating</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>+1 (415) 555-0192</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Webhook Health</Text>
                <View style={styles.healthyRow}>
                  <View style={styles.tinyGreenDot} />
                  <Text style={styles.healthyText}>Verified (Synced 2m ago)</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quality Rating</Text>
                <Text style={styles.greenText}>High (Green tier)</Text>
              </View>
            </View>

            {/* AI Settings */}
            <Text style={styles.sectionHeader}>AI AUTOMATION CONTROLS</Text>
            <View style={styles.detailsCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchTitle}>AI Receptionist Auto-Reply</Text>
                  <Text style={styles.switchDesc}>
                    Your trained agent answers WhatsApp inquiries 24/7 with zero latency.
                  </Text>
                </View>
                <Switch
                  value={aiAutoResponder}
                  onValueChange={setAiAutoResponder}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchTitle}>Takeover Push Alerts</Text>
                  <Text style={styles.switchDesc}>
                    Alert your phone immediately if customer requests human agent or asks complex pricing.
                  </Text>
                </View>
                <Switch
                  value={takeoverAlerts}
                  onValueChange={setTakeoverAlerts}
                  trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestBot}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={styles.testBtnText}>Test WhatsApp Bot</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.disconnectBtn}
              onPress={handleDisconnect}
              activeOpacity={0.8}
            >
              <Text style={styles.disconnectText}>Disconnect WhatsApp Number</Text>
            </TouchableOpacity>
          </>
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
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  whatsappIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  connectedPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  greenPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  connectedPhoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#15803D',
  },
  connectMetaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1877F2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectMetaBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  checkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    overflow: 'hidden',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
  checkIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 14,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  healthyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tinyGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  healthyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#059669',
  },
  greenText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  switchDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  testBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  disconnectBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});
