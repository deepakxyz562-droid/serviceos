import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, ui } from '../ui';
import { useResource } from '../../hooks/use-resource';
import { apiRequest } from '../../lib/api';
import { getToken } from '../../lib/auth';
import { WEB_URL } from '../../lib/constants';

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  isActive: boolean;
  tokenExpiry?: string;
}

export function StayActiveSocialMediaCard() {
  const accountsRes = useResource<{ data: SocialAccount[] }>('/api/social/accounts?includeInactive=true');
  const [connectingKey, setConnectingKey] = useState<string | null>(null);

  const accounts = accountsRes.data?.data || [];
  const fbAccount = accounts.find((a) => a.platform === 'facebook' && a.isActive);
  const igAccount = accounts.find((a) => a.platform === 'instagram' && a.isActive);

  async function openInstalledApp(platform: 'facebook' | 'instagram') {
    const scheme = platform === 'instagram' ? 'instagram://app' : 'fb://feed';
    const webFallback = platform === 'instagram' ? 'https://instagram.com' : 'https://facebook.com';
    try {
      const supported = await Linking.canOpenURL(scheme);
      if (supported) {
        await Linking.openURL(scheme);
      } else {
        await Linking.openURL(webFallback);
      }
    } catch {
      await Linking.openURL(webFallback);
    }
  }

  async function handleConnect(platform: 'facebook' | 'instagram') {
    const platformLabel = platform === 'facebook' ? 'Facebook' : 'Instagram';

    Alert.alert(
      `Connect ${platformLabel}`,
      `Choose how you would like to interact with ${platformLabel}:\n\n• Open ${platformLabel} App: Opens your installed mobile app directly.\n• Auto-Post OAuth: Connects Meta API to schedule and publish posts from BGOS.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Open ${platformLabel} App`,
          onPress: () => void openInstalledApp(platform),
        },
        {
          text: 'Auto-Post OAuth',
          onPress: async () => {
            setConnectingKey(platform);
            try {
              let ticket = '';
              try {
                const ticketRes = await apiRequest<{ ticket: string }>('/api/bgos/mobile-auth/handoff', { method: 'POST' });
                if (ticketRes?.ticket) ticket = ticketRes.ticket;
              } catch {}
              const ticketQuery = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
              const token = await getToken();
              const precheckHeaders: Record<string, string> = { Accept: 'application/json' };
              if (token) precheckHeaders.Authorization = `Bearer ${token}`;

              // Preflight check if Meta App credentials are ready
              const precheck = await fetch(`${WEB_URL}/api/oauth/${platform}${ticketQuery}`, {
                headers: precheckHeaders,
              }).catch(() => null);

              if (precheck && precheck.status === 503) {
                Alert.alert(
                  'Meta App Required',
                  `Meta OAuth credentials (META_APP_ID / META_APP_SECRET) are not configured on this server yet.\n\nYou can still use the "Open App" button to post directly from your device!`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: `Open ${platformLabel} App`, onPress: () => void openInstalledApp(platform) },
                  ]
                );
                return;
              }

              const oauthUrl = `${WEB_URL}/api/oauth/${platform}${ticketQuery}`;
              // Open in-app secure browser session rather than kicking out to external Safari
              await WebBrowser.openBrowserAsync(oauthUrl, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                controlsColor: colors.brand,
              });
              await accountsRes.refresh();
            } catch {
              let ticket = '';
              try {
                const ticketRes = await apiRequest<{ ticket: string }>('/api/bgos/mobile-auth/handoff', { method: 'POST' });
                if (ticketRes?.ticket) ticket = ticketRes.ticket;
              } catch {}
              const ticketQuery = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
              await Linking.openURL(`${WEB_URL}/api/oauth/${platform}${ticketQuery}`).catch(() => {
                Alert.alert('Unable to Open', `Could not open ${platformLabel} connection.`);
              });
            } finally {
              setConnectingKey(null);
            }
          },
        },
      ]
    );
  }

  const channels = [
    {
      key: 'facebook' as const,
      name: 'Facebook',
      badge: 'f',
      badgeBg: '#1877F2',
      account: fbAccount,
      description: 'Auto-share daily Google posts to Facebook Page',
    },
    {
      key: 'instagram' as const,
      name: 'Instagram',
      badge: 'IG',
      badgeBg: '#E1306C',
      account: igAccount,
      description: 'Auto-publish promotional photo cards to Instagram',
    },
  ];

  return (
    <View style={styles.card}>
      <View style={{ gap: 2, marginBottom: 8 }}>
        <View style={[ui.row, { gap: 6, alignItems: 'center' }]}>
          <MaterialIcons name="share" size={18} color={colors.brand} />
          <Text style={styles.title}>Stay Active on Social Media</Text>
        </View>
        <Text style={styles.subtitle}>
          Connect Facebook & Instagram to auto-share your Google posts with local customers.
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        {channels.map((ch) => {
          const isConnected = Boolean(ch.account && ch.account.isActive);
          const busy = connectingKey === ch.key;

          return (
            <View key={ch.key} style={styles.channelRow}>
              <View style={[styles.avatarBadge, { backgroundColor: ch.badgeBg }]}>
                <Text style={styles.avatarText}>{ch.badge}</Text>
              </View>

              <View style={{ flex: 1, gap: 1 }}>
                <Text style={styles.channelName}>{ch.name}</Text>
                <Text
                  style={[
                    styles.channelStatus,
                    isConnected ? styles.channelStatusConnected : styles.channelStatusMuted,
                  ]}
                  numberOfLines={1}
                >
                  {isConnected
                    ? `Connected · ${ch.account?.accountName || 'Active'}`
                    : 'Not connected'}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Connect ${ch.name}`}
                disabled={busy}
                onPress={() => handleConnect(ch.key)}
                style={({ pressed }) => [
                  styles.connectBtn,
                  isConnected && styles.manageBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={isConnected ? colors.ink : '#FFFFFF'} />
                ) : (
                  <Text
                    style={[
                      styles.connectBtnText,
                      isConnected && styles.manageBtnText,
                    ]}
                  >
                    {isConnected ? 'Manage' : 'Connect'}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#070B2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.muted,
    lineHeight: 16,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  channelName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  channelStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  channelStatusConnected: {
    color: colors.success,
  },
  channelStatusMuted: {
    color: colors.muted,
  },
  connectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.brand,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  manageBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  manageBtnText: {
    color: colors.ink,
  },
});
