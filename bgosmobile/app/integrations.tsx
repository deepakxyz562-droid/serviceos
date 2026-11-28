import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, ErrorNotice, Loading } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { connectSocialPlatform, type SocialConnectPlatform } from '../src/lib/social-connect';
import { withProtectedRoute } from '../src/components/navigation/protected-route';

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
  source?: 'platform' | 'tenant-own' | 'tenant' | 'custom' | 'env' | 'none' | string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  nameStatus?: string | null;
  messagingLimitTier?: string | null;
  qualityRating?: string | null;
  coexistenceMode?: boolean;
  waMeUrl?: string | null;
  qrCodeDataUrl?: string | null;
  googleMapsWhatsappUrl?: string | null;
  googleMapsWhatsappSynced?: boolean;
  googleMapsWhatsappWarnings?: string[];
}

function formatMetaTierLabel(tier?: string | null): string {
  if (!tier) return 'Starter Tier (250 outbound/day · Unlimited AI replies)';
  if (tier.includes('UNLIMITED')) return 'Verified Unlimited Tier';
  if (tier.includes('100K')) return 'Verified 100K/day Tier';
  if (tier.includes('10K')) return 'Verified 10K/day Tier';
  if (tier.includes('1K')) return 'Verified 1K/day Tier';
  if (tier.includes('250')) return 'Live Starter Tier (250/day · Unlimited AI replies)';
  return tier;
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
    desc: 'Sync 5-star Google reviews, AI auto-replies, and scheduled photo publishing directly to Google Maps.',
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
    badge: 'AI Chat, Campaigns & Reminders',
    icon: 'chat',
    iconColor: '#25D366',
    iconBg: '#DCFCE7',
    desc: 'Connect Meta WhatsApp Cloud API for 24/7 AI chat booking, PDF brochures, reminders, and campaigns.',
    oauthPath: '/api/whatsapp/manual-config',
  },
];

function IntegrationsScreen() {
  const accountsRes = useResource<{ data: Account[] }>('/api/social/accounts?includeInactive=true');
  const waConfig = useResource<WhatsAppConfig>('/api/whatsapp/config');
  const [disconnectingAccount, setDisconnectingAccount] = useState<Account | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waQrModalOpen, setWaQrModalOpen] = useState(false);
  const [showManualWaFields, setShowManualWaFields] = useState(false);
  const [waPhoneNumber, setWaPhoneNumber] = useState('');
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
  const [waWabaId, setWaWabaId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [waTesting, setWaTesting] = useState(false);
  const [waSaving, setWaSaving] = useState(false);
  const [waTestResult, setWaTestResult] = useState<string | null>(null);
  const [syncingGbpWa, setSyncingGbpWa] = useState(false);

  const refreshAll = async () => {
    await Promise.all([accountsRes.refresh(), waConfig.refresh()]).catch(() => {});
  };

  const accounts = accountsRes.data?.data || [];
  const activeAccounts = accounts.filter((a) => a.isActive);
  const waActive = Boolean(
    waConfig.data?.isConfigured &&
    waConfig.data?.source !== 'platform' &&
    waConfig.data?.source !== 'env',
  );
  const totalConnected = activeAccounts.length + (waActive ? 1 : 0);

  const openWhatsAppSetup = () => {
    setWaTestResult(null);
    setShowManualWaFields(false);
    setWaModalOpen(true);
  };

  const handleEmbeddedWhatsAppConnect = async () => {
    setWaModalOpen(false);
    try {
      const outcome = await connectSocialPlatform('whatsapp', {
        returnView: 'growth',
        next: '/integrations',
      });
      if (outcome.error) {
        Alert.alert('WhatsApp Connection Notice', outcome.error);
      }
    } finally {
      await refreshAll();
    }
  };

  const handleShareWhatsAppQrLink = async () => {
    const waUrl = waConfig.data?.waMeUrl;
    if (!waUrl) return;
    const bizName = waConfig.data?.verifiedName || 'our business';
    await Share.share({
      message: `Chat with ${bizName} on WhatsApp for instant answers & appointment booking: ${waUrl}`,
      url: waUrl,
    }).catch(() => {});
  };

  const handleSyncWhatsappToGoogle = async () => {
    setSyncingGbpWa(true);
    try {
      const res = await apiRequest<{
        success?: boolean;
        syncedToGoogle?: boolean;
        googleWarnings?: string[];
        message?: string;
      }>('/api/gbp/growth-actions', {
        method: 'POST',
        body: {
          action: 'update_whatsapp_chat',
          phone: waConfig.data?.displayPhoneNumber || '',
        },
      });
      await waConfig.refresh();
      if (res?.syncedToGoogle) {
        Alert.alert('Synced to Google Maps', res.message || 'Your WhatsApp chat button has been pushed to Google Business Profile.');
      } else {
        const warnText = res?.googleWarnings?.length ? `\n\nGoogle notice: ${res.googleWarnings[0]}` : '';
        Alert.alert(
          'Saved in BGOS',
          `${res?.message || 'WhatsApp link saved to BGOS & Booking Page.'}${warnText}`,
        );
      }
    } catch (e: any) {
      Alert.alert('Google Sync Notice', e?.message || 'Could not sync WhatsApp number to Google Business.');
    } finally {
      setSyncingGbpWa(false);
    }
  };

  const handleTestWhatsApp = async () => {
    const token = waAccessToken.trim();
    const phoneId = waPhoneNumberId.trim();
    if (!token || !phoneId) {
      Alert.alert('Missing Credentials', 'Enter Phone Number ID and Meta Access Token to test.');
      return;
    }
    setWaTesting(true);
    setWaTestResult(null);
    try {
      const res = await apiRequest<{ success?: boolean; verifiedName?: string; displayPhoneNumber?: string; error?: string }>(
        '/api/whatsapp/config',
        {
          method: 'PUT',
          body: JSON.stringify({ accessToken: token, phoneNumberId: phoneId }),
        },
      );
      setWaTestResult(
        `Verified: ${res.verifiedName || 'WhatsApp Business'} (${res.displayPhoneNumber || phoneId})`,
      );
    } catch (e: any) {
      setWaTestResult(`Test failed: ${e?.message || 'Invalid credentials'}`);
    } finally {
      setWaTesting(false);
    }
  };

  const handleSaveWhatsApp = async () => {
    const phoneNumber = waPhoneNumber.trim();
    const phoneNumberId = waPhoneNumberId.trim();
    const wabaId = waWabaId.trim();
    const accessToken = waAccessToken.trim();
    if (!phoneNumber || !phoneNumberId || !wabaId || !accessToken) {
      Alert.alert(
        'Missing Fields',
        'Phone Number, Phone Number ID, WABA ID, and Permanent Access Token are required.',
      );
      return;
    }
    setWaSaving(true);
    try {
      await apiRequest('/api/whatsapp/manual-config', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, phoneNumberId, wabaId, accessToken }),
      });
      await waConfig.refresh();
      setWaModalOpen(false);
      setWaAccessToken('');
      Alert.alert('WhatsApp Connected', 'Your WhatsApp Business Cloud number is now live.');
    } catch (e: any) {
      Alert.alert('Connection Failed', e?.message || 'Could not save WhatsApp Cloud credentials.');
    } finally {
      setWaSaving(false);
    }
  };

  // Connect Channel via Meta Embedded Signup (WhatsApp) or shared OAuth launcher
  const handleConnect = async (channel: ChannelDef) => {
    if (channel.key === 'whatsapp') {
      await handleEmbeddedWhatsAppConnect();
      return;
    }

    try {
      const outcome = await connectSocialPlatform(channel.key as SocialConnectPlatform, {
        returnView: 'growth',
        oauthPath: channel.oauthPath,
      });
      if (outcome.error) {
        Alert.alert('Connection Notice', outcome.error);
      }
    } finally {
      await refreshAll();
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
      <ErrorNotice message={accountsRes.error || waConfig.error} retry={refreshAll} />

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

                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={styles.channelName} numberOfLines={2}>
                        {ch.name}
                      </Text>
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
                  <View style={{ gap: 6 }}>
                    <View style={styles.accountInfoRow}>
                      <MaterialIcons name="verified" size={15} color="#059669" />
                      <Text style={styles.accountNameText} numberOfLines={1}>
                        {waConfig.data?.displayPhoneNumber
                          ? `${waConfig.data.verifiedName ? `${waConfig.data.verifiedName} · ` : ''}${waConfig.data.displayPhoneNumber}`
                          : waConfig.data?.source === 'platform'
                            ? 'Managed via BGOS Cloud Gateway'
                            : `Phone ID: ${waConfig.data?.phoneNumberId || 'Verified'}`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <View style={styles.connectedBadge}>
                        <Text style={styles.connectedBadgeText}>
                          {formatMetaTierLabel(waConfig.data?.messagingLimitTier)}
                        </Text>
                      </View>
                      {waConfig.data?.coexistenceMode ? (
                        <View style={[styles.connectedBadge, { backgroundColor: '#EFF6FF' }]}>
                          <Text style={[styles.connectedBadgeText, { color: '#1D4ED8' }]}>
                            App Coexistence
                          </Text>
                        </View>
                      ) : null}
                      {waConfig.data?.googleMapsWhatsappSynced ? (
                        <View style={[styles.connectedBadge, { backgroundColor: '#DCFCE7' }]}>
                          <Text style={[styles.connectedBadgeText, { color: '#15803D' }]}>
                            Google Maps Linked
                          </Text>
                        </View>
                      ) : null}
                    </View>
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
                        <Text style={styles.syncBtnText}>Sync</Text>
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
                        <>
                          {waConfig.data?.qrCodeDataUrl ? (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => setWaQrModalOpen(true)}
                              style={[styles.settingsBtn, { backgroundColor: '#ECFDF5' }]}
                            >
                              <MaterialIcons name="qr-code-2" size={16} color="#047857" />
                              <Text style={[styles.settingsBtnText, { color: '#047857' }]}>QR &amp; Link</Text>
                            </Pressable>
                          ) : null}
                          <Pressable
                            accessibilityRole="button"
                            disabled={syncingGbpWa}
                            onPress={() => void handleSyncWhatsappToGoogle()}
                            style={[styles.settingsBtn, { backgroundColor: '#EFF6FF' }]}
                          >
                            {syncingGbpWa ? (
                              <ActivityIndicator size="small" color="#1D4ED8" />
                            ) : (
                              <>
                                <MaterialIcons name="add-location-alt" size={15} color="#1D4ED8" />
                                <Text style={[styles.settingsBtnText, { color: '#1D4ED8' }]}>
                                  {waConfig.data?.googleMapsWhatsappSynced ? 'Re-sync Maps' : 'Add to Google'}
                                </Text>
                              </>
                            )}
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={openWhatsAppSetup}
                            style={styles.settingsBtn}
                          >
                            <MaterialIcons name="settings" size={16} color="#64748B" />
                            <Text style={styles.settingsBtnText}>Manage</Text>
                          </Pressable>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <View style={{ flex: 1, gap: 6 }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Connect ${ch.name}`}
                        onPress={() => handleConnect(ch)}
                        style={styles.connectBtn}
                      >
                        <MaterialIcons name="add-link" size={18} color="#FFFFFF" />
                        <Text style={styles.connectBtnText}>
                          {isWa ? 'Connect WhatsApp (2-Min OTP/QR)' : `Connect ${ch.name.split(' ')[0]}`}
                        </Text>
                      </Pressable>
                      {isWa ? (
                        <Pressable onPress={openWhatsAppSetup} style={{ alignSelf: 'center', paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B' }}>
                            Advanced: Enter Manual Cloud API Tokens
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── WhatsApp Setup Modal (1-Tap Embedded Signup + Advanced Manual Fallback) ── */}
      <Modal
        visible={waModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setWaModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 400, alignItems: 'stretch' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[styles.modalHeading, { textAlign: 'left' }]}>
                WhatsApp Business Connection
              </Text>
              <Pressable onPress={() => setWaModalOpen(false)} hitSlop={8}>
                <MaterialIcons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
            <Text style={[styles.modalSubheading, { textAlign: 'left' }]}>
              Keep your existing SIM / mobile number in 2 minutes: Meta Coexistence links the free WhatsApp Business app (switch from Personal WhatsApp without losing chats, or buy no new number).
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={handleEmbeddedWhatsAppConnect}
              style={[styles.connectBtn, { flex: 0, width: '100%' }]}
            >
              <MaterialIcons name="verified-user" size={18} color="#FFFFFF" />
              <Text style={styles.connectBtnText}>
                {waActive ? 'Reconnect / Switch Number via Meta' : 'Connect via Meta Popup (Recommended)'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL('https://business.facebook.com/settings/security').catch(() => {})}
              style={{ paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#047857', textAlign: 'center' }}>
                Verify Business in Meta Portfolio to unlock 1,000+ daily broadcasts →
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowManualWaFields((prev) => !prev)}
              style={{
                paddingVertical: 6,
                borderTopWidth: 1,
                borderTopColor: '#F1F5F9',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                {showManualWaFields ? 'Hide Advanced Manual API Credentials ▲' : 'Advanced: Manual Cloud API Credentials ▼'}
              </Text>
            </Pressable>

            {showManualWaFields ? (
              <>
                <View style={{ gap: 8 }}>
                  <TextInput
                    value={waPhoneNumber}
                    onChangeText={setWaPhoneNumber}
                    placeholder="Business Phone (e.g. +919876543210)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    style={styles.waInput}
                  />
                  <TextInput
                    value={waPhoneNumberId}
                    onChangeText={setWaPhoneNumberId}
                    placeholder="Meta Phone Number ID"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    style={styles.waInput}
                  />
                  <TextInput
                    value={waWabaId}
                    onChangeText={setWaWabaId}
                    placeholder="WhatsApp Business Account (WABA) ID"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    style={styles.waInput}
                  />
                  <TextInput
                    value={waAccessToken}
                    onChangeText={setWaAccessToken}
                    placeholder="Permanent System User Access Token"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    secureTextEntry
                    style={styles.waInput}
                  />
                </View>

                {waTestResult ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: waTestResult.startsWith('Verified') ? '#059669' : '#DC2626',
                    }}
                  >
                    {waTestResult}
                  </Text>
                ) : null}

                <View style={styles.modalButtonsRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleTestWhatsApp}
                    disabled={waTesting || waSaving}
                    style={styles.modalCancelBtn}
                  >
                    {waTesting ? (
                      <ActivityIndicator size="small" color="#334155" />
                    ) : (
                      <Text style={styles.modalCancelText}>Test Token</Text>
                    )}
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={handleSaveWhatsApp}
                    disabled={waTesting || waSaving}
                    style={[styles.modalConfirmBtn, { backgroundColor: '#009F50' }]}
                  >
                    {waSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Save &amp; Connect</Text>
                    )}
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── WhatsApp AI Chat QR Standee Modal ── */}
      <Modal
        visible={waQrModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setWaQrModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>WhatsApp AI Chat QR</Text>
            <Text style={styles.modalSubheading}>
              Print or share this QR code at your reception counter. Customers scan to chat with your AI booking assistant on {waConfig.data?.displayPhoneNumber || 'WhatsApp'}.
            </Text>
            {waConfig.data?.qrCodeDataUrl ? (
              <Image
                source={{ uri: waConfig.data.qrCodeDataUrl }}
                style={{ width: 210, height: 210, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}
                resizeMode="contain"
              />
            ) : null}
            {waConfig.data?.waMeUrl ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }} selectable>
                {waConfig.data.waMeUrl}
              </Text>
            ) : null}
            <View style={styles.modalButtonsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setWaQrModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleShareWhatsAppQrLink}
                style={[styles.modalConfirmBtn, { backgroundColor: '#009F50' }]}
              >
                <Text style={styles.modalConfirmText}>Share Link</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
    flex: 1,
    flexShrink: 1,
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
    flexShrink: 0,
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
    flexShrink: 0,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
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
  waInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
});

export default withProtectedRoute(IntegrationsScreen);
