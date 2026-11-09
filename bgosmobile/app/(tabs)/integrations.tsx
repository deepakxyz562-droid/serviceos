import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen, Card, Badge, Loading, colors, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { API_BASE_URL } from '../../src/lib/constants';

interface Account {
  id: string;
  platform: string;
  accountName: string;
  isActive: boolean;
  tokenExpiry?: string;
}

interface WhatsAppConfig {
  isConfigured: boolean;
  mode: string;
  phoneNumberId: string;
  source?: 'platform' | 'tenant' | 'custom' | string;
}

interface ChannelDef {
  key: string;
  name: string;
  badge: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor: string;
  iconBg: string;
  desc: string;
  oauthPath: string;
}

const SUPPORTED_CHANNELS: ChannelDef[] = [
  {
    key: 'googlebusiness',
    name: 'Google Business Profile',
    badge: 'Local 3-Pack & Reviews',
    icon: 'storefront',
    iconColor: '#1A73E8',
    iconBg: '#E8F0FE',
    desc: 'Sync 5-star Google reviews, AI auto-replies, and publish photo drips directly to Google Maps.',
    oauthPath: '/api/oauth/googlebusiness',
  },
  {
    key: 'facebook',
    name: 'Facebook Pages',
    badge: 'Official Page & Feed',
    icon: 'facebook',
    iconColor: '#1877F2',
    iconBg: '#EBF5FF',
    desc: 'Publish branded promotional posters, announcements, and local community updates.',
    oauthPath: '/api/oauth/facebook',
  },
  {
    key: 'instagram',
    name: 'Instagram Business',
    badge: 'Feed, Visuals & Reels',
    icon: 'camera-alt',
    iconColor: '#E1306C',
    iconBg: '#FDF2F8',
    desc: 'Share creative commercial posters, visual showcases, and engaging stories to followers.',
    oauthPath: '/api/oauth/instagram',
  },
  {
    key: 'threads',
    name: 'Meta Threads',
    badge: 'Conversations & Updates',
    icon: 'alternate-email',
    iconColor: '#0F172A',
    iconBg: '#F1F5F9',
    desc: 'Engage local customers and followers with text-first updates and community discussions.',
    oauthPath: '/api/oauth/threads',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn Company & Profile',
    badge: 'B2B & Professional Network',
    icon: 'business',
    iconColor: '#0A66C2',
    iconBg: '#E8F4F9',
    desc: 'Build business credibility, announce corporate events, and connect with commercial clients.',
    oauthPath: '/api/oauth/linkedin',
  },
  {
    key: 'pinterest',
    name: 'Pinterest Boards',
    badge: 'Visual Pins & Inspiration',
    icon: 'push-pin',
    iconColor: '#E60023',
    iconBg: '#FEE2E2',
    desc: 'Publish high-resolution photo pins to relevant boards for long-term organic search discovery.',
    oauthPath: '/api/oauth/pinterest',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Business Messaging',
    badge: '1-Tap Reviews & CRM',
    icon: 'chat',
    iconColor: '#25D366',
    iconBg: '#DCFCE7',
    desc: 'Automated 1-tap Google review requests, appointment confirmations, and instant customer chat.',
    oauthPath: '/(tabs)/reviews',
  },
];

export default function IntegrationsScreen() {
  const router = useRouter();
  const accountsRes = useResource<{ data: Account[] }>('/api/social/accounts?includeInactive=true');
  const waConfig = useResource<WhatsAppConfig>('/api/whatsapp/config');
  const [disconnectingAccount, setDisconnectingAccount] = useState<Account | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const refreshAll = async () => {
    await Promise.all([accountsRes.refresh(), waConfig.refresh()]).catch(() => {});
  };

  const accounts = accountsRes.data?.data || [];
  const activeAccounts = accounts.filter((a) => a.isActive);
  const waActive = Boolean(waConfig.data?.isConfigured);
  const totalConnected = activeAccounts.length + (waActive ? 1 : 0);

  // Connect Channel via OAuth
  const handleConnect = async (channel: ChannelDef) => {
    if (channel.key === 'whatsapp') {
      router.push('/(tabs)/reviews');
      return;
    }
    const targetUrl = `${API_BASE_URL}${channel.oauthPath}`;
    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        await Linking.openURL(targetUrl);
      }
    } catch {
      Alert.alert('Connection Link', `Please open ${targetUrl} in your browser to authorize.`);
    }
  };

  // Disconnect Channel
  const handleConfirmDisconnect = async () => {
    if (!disconnectingAccount) return;
    setActionLoading(true);
    try {
      await apiRequest(`/api/social/accounts?id=${disconnectingAccount.id}`, {
        method: 'DELETE',
      });
      await accountsRes.refresh();
      Alert.alert('Channel Disconnected', `Successfully disconnected ${disconnectingAccount.accountName}.`);
      setDisconnectingAccount(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not disconnect account. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Screen
      title="Channels &amp; Integrations"
      subtitle="Connect marketing channels &amp; customer communication engines."
      showBack={true}
      onRefresh={refreshAll}
    >
      {/* ── Top Summary Header Card ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.livePulseDot} />
              <Text style={styles.summaryTitle}>
                {totalConnected} of {SUPPORTED_CHANNELS.length} Channels Connected
              </Text>
            </View>
            <Text style={styles.summarySubtitle}>
              Multi-channel auto-publishing &amp; review automation active
            </Text>
          </View>
          <View style={styles.summaryProgressBadge}>
            <Text style={styles.summaryProgressText}>
              {Math.round((totalConnected / SUPPORTED_CHANNELS.length) * 100)}%
            </Text>
          </View>
        </View>

        {/* Progress Fill Bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.max(10, (totalConnected / SUPPORTED_CHANNELS.length) * 100)}%` },
            ]}
          />
        </View>
      </View>

      {/* ── Channel Cards List ── */}
      {accountsRes.loading && !accountsRes.data ? (
        <Loading />
      ) : (
        <View style={styles.channelsList}>
          {SUPPORTED_CHANNELS.map((ch) => {
            const isWa = ch.key === 'whatsapp';
            const matchedAccount = isWa ? null : activeAccounts.find((a) => a.platform === ch.key);
            const isConnected = isWa ? waActive : Boolean(matchedAccount);

            return (
              <View key={ch.key} style={styles.channelCard}>
                {/* Channel Header Row */}
                <View style={styles.channelHeaderRow}>
                  <View style={[styles.channelIconTile, { backgroundColor: ch.iconBg }]}>
                    <MaterialIcons name={ch.icon} size={22} color={ch.iconColor} />
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.channelName}>{ch.name}</Text>
                      {isConnected ? (
                        <View style={styles.connectedBadge}>
                          <View style={styles.greenDot} />
                          <Text style={styles.connectedBadgeText}>Connected</Text>
                        </View>
                      ) : (
                        <View style={styles.notConnectedBadge}>
                          <Text style={styles.notConnectedBadgeText}>Not Connected</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.channelBadgeText}>{ch.badge}</Text>
                  </View>
                </View>

                {/* Capability Description */}
                <Text style={styles.channelDesc}>{ch.desc}</Text>

                {/* Account details if connected */}
                {matchedAccount ? (
                  <View style={styles.accountInfoRow}>
                    <MaterialIcons name="account-circle" size={15} color="#64748B" />
                    <Text style={styles.accountNameText} numberOfLines={1}>
                      Account: {matchedAccount.accountName}
                    </Text>
                  </View>
                ) : isWa && waActive ? (
                  <View style={styles.accountInfoRow}>
                    <MaterialIcons name="verified" size={15} color="#059669" />
                    <Text style={styles.accountNameText} numberOfLines={1}>
                      {waConfig.data?.source === 'platform'
                        ? 'Managed via BGOS Cloud Gateway'
                        : `Phone ID: ${waConfig.data?.phoneNumberId || 'Verified'}`}
                    </Text>
                  </View>
                ) : null}

                {/* Bottom Action Row */}
                <View style={styles.cardActionsRow}>
                  {isConnected ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => refreshAll()}
                        style={styles.syncBtn}
                      >
                        <MaterialIcons name="sync" size={16} color="#009F50" />
                        <Text style={styles.syncBtnText}>Sync Status</Text>
                      </Pressable>

                      {matchedAccount ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setDisconnectingAccount(matchedAccount)}
                          style={styles.disconnectBtn}
                        >
                          <MaterialIcons name="link-off" size={16} color="#EF4444" />
                          <Text style={styles.disconnectBtnText}>Disconnect</Text>
                        </Pressable>
                      ) : isWa ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => router.push('/(tabs)/reviews')}
                          style={styles.settingsBtn}
                        >
                          <MaterialIcons name="settings" size={16} color="#64748B" />
                          <Text style={styles.settingsBtnText}>Settings</Text>
                        </Pressable>
                      ) : null}
                    </>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Connect ${ch.name}`}
                      onPress={() => handleConnect(ch)}
                      style={styles.connectBtn}
                    >
                      <MaterialIcons name="add-link" size={18} color="#FFFFFF" />
                      <Text style={styles.connectBtnText}>Connect {ch.name.split(' ')[0]}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Disconnect Confirmation Modal ── */}
      <Modal
        visible={Boolean(disconnectingAccount)}
        transparent
        animationType="fade"
        onRequestClose={() => setDisconnectingAccount(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalAlertIcon}>
              <MaterialIcons name="warning" size={28} color="#EF4444" />
            </View>

            <Text style={styles.modalHeading}>Disconnect Channel?</Text>
            <Text style={styles.modalSubheading}>
              Are you sure you want to disconnect{' '}
              <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                {disconnectingAccount?.accountName}
              </Text>
              ? Scheduled posts and automatic AI publishing to this channel will pause.
            </Text>

            <View style={styles.modalButtonsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDisconnectingAccount(null)}
                disabled={actionLoading}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleConfirmDisconnect}
                disabled={actionLoading}
                style={styles.modalConfirmBtn}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Disconnect</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  summaryTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  summarySubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  summaryProgressBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryProgressText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  channelsList: {
    gap: 12,
    paddingBottom: 40,
  },
  channelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  channelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  channelIconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  channelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  notConnectedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  notConnectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  channelDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  accountInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accountNameText: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '700',
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  connectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#009F50',
    borderRadius: 12,
    height: 40,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  syncBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    height: 38,
  },
  syncBtnText: {
    color: '#009F50',
    fontSize: 12.5,
    fontWeight: '800',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    height: 38,
    paddingHorizontal: 14,
  },
  disconnectBtnText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontWeight: '800',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 38,
    paddingHorizontal: 14,
  },
  settingsBtnText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 12,
  },
  modalAlertIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  modalSubheading: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
