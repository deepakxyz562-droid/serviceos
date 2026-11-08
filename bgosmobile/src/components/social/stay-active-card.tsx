import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const liAccount = accounts.find((a) => a.platform === 'linkedin' && a.isActive);
  const pinAccount = accounts.find((a) => a.platform === 'pinterest' && a.isActive);
  const thAccount = accounts.find((a) => a.platform === 'threads' && a.isActive);

  const connectedAccounts = [fbAccount, igAccount, liAccount, pinAccount, thAccount].filter(Boolean) as SocialAccount[];
  const connectedCount = connectedAccounts.length;

  type SupportedConnectPlatform = 'facebook' | 'instagram' | 'linkedin' | 'pinterest' | 'threads';

  async function handleConnect(platform: SupportedConnectPlatform) {
    const platformLabels: Record<SupportedConnectPlatform, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      linkedin: 'LinkedIn',
      pinterest: 'Pinterest',
      threads: 'Threads',
    };
    const platformLabel = platformLabels[platform] || platform;
    setConnectingKey(platform);
    try {
      let ticket = '';
      try {
        const ticketRes = await apiRequest<{ ticket: string }>('/api/bgos/mobile-auth/handoff', { method: 'POST' });
        if (ticketRes?.ticket) ticket = ticketRes.ticket;
      } catch {}

      const ticketQuery = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
      const returnUrlQuery = ticket ? `&returnUrl=${encodeURIComponent('bgos://auth-callback')}` : `?returnUrl=${encodeURIComponent('bgos://auth-callback')}`;
      const originHostQuery = `&originHost=${encodeURIComponent(WEB_URL)}`;
      const oauthUrl = `${WEB_URL}/api/oauth/${platform}${ticketQuery}${returnUrlQuery}${originHostQuery}`;

      const result = await WebBrowser.openAuthSessionAsync(oauthUrl, 'bgos://auth-callback');
      await accountsRes.refresh();

      if (result.type === 'success' && result.url?.includes('error=')) {
        try {
          const urlObj = new URL(result.url);
          const err = urlObj.searchParams.get('error');
          if (err) Alert.alert('Connection Error', decodeURIComponent(err));
        } catch {}
      }
    } catch {
      Alert.alert('Connection Failed', `Could not connect ${platformLabel}. Please try again.`);
    } finally {
      setConnectingKey(null);
    }
  }

  // ── When accounts are connected: show a sleek compact status strip (no giant buttons) ──
  if (connectedCount >= 2) {
    const summary = connectedAccounts.map((a) => a.accountName || a.platform).slice(0, 3).join(', ');
    return (
      <View style={styles.compactConnectedStrip}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <View style={styles.greenDot} />
          <Text style={styles.compactConnectedText} numberOfLines={1}>
            {connectedCount} Channels Active ({summary})
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Manage Connected Accounts"
          onPress={() => {
            const list = connectedAccounts.map((a) => `• ${a.platform.toUpperCase()}: ${a.accountName || 'Active'}`).join('\n');
            Alert.alert(
              'Connected Social Channels',
              list,
              [
                { text: 'Done' },
                { text: '+ Connect LinkedIn', onPress: () => handleConnect('linkedin') },
                { text: '+ Connect Pinterest', onPress: () => handleConnect('pinterest') },
                { text: '+ Connect Threads', onPress: () => handleConnect('threads') },
              ]
            );
          }}
          style={styles.managePill}
        >
          <Text style={styles.managePillText}>Manage ⌵</Text>
        </Pressable>
      </View>
    );
  }

  if (connectedCount === 1) {
    const single = connectedAccounts[0];
    const singleName = single.platform.charAt(0).toUpperCase() + single.platform.slice(1);

    return (
      <View style={styles.compactConnectedStrip}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <View style={styles.greenDot} />
          <Text style={styles.compactConnectedText} numberOfLines={1}>
            {singleName} Active · Connect More Channels
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Alert.alert('Connect Next Channel', 'Choose a channel to add:', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'LinkedIn', onPress: () => handleConnect('linkedin') },
              { text: 'Pinterest', onPress: () => handleConnect('pinterest') },
              { text: 'Threads', onPress: () => handleConnect('threads') },
              { text: 'Instagram', onPress: () => handleConnect('instagram') },
              { text: 'Facebook', onPress: () => handleConnect('facebook') },
            ]);
          }}
          style={styles.connectPill}
        >
          <Text style={styles.connectPillText}>+ Connect</Text>
        </Pressable>
      </View>
    );
  }

  // ── When none are connected: show the connect card with all 5 channels ──
  const channels = [
    {
      key: 'facebook' as const,
      name: 'Facebook',
      badge: 'f',
      badgeBg: '#1877F2',
      account: fbAccount,
      description: 'Auto-share daily updates to Facebook Page',
    },
    {
      key: 'instagram' as const,
      name: 'Instagram',
      badge: 'IG',
      badgeBg: '#E1306C',
      account: igAccount,
      description: 'Auto-publish promotional photo cards to Instagram',
    },
    {
      key: 'linkedin' as const,
      name: 'LinkedIn',
      badge: 'in',
      badgeBg: '#0A66C2',
      account: liAccount,
      description: 'Auto-share B2B articles and service milestones',
    },
    {
      key: 'pinterest' as const,
      name: 'Pinterest',
      badge: 'P',
      badgeBg: '#E60023',
      account: pinAccount,
      description: 'Pin promotional product flyers and offer posters',
    },
    {
      key: 'threads' as const,
      name: 'Threads',
      badge: '@',
      badgeBg: '#111827',
      account: thAccount,
      description: 'Post micro-updates & engage local community',
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
  compactConnectedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginVertical: 4,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#009F50',
  },
  compactConnectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  managePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  managePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#009F50',
  },
  connectPill: {
    backgroundColor: '#009F50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  connectPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
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
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  channelName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  channelStatus: {
    fontSize: 12,
  },
  channelStatusConnected: {
    color: colors.brand,
    fontWeight: '600',
  },
  channelStatusMuted: {
    color: colors.muted,
  },
  connectBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
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
