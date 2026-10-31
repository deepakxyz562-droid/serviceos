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

  async function handleConnect(platform: 'facebook' | 'instagram') {
    setConnectingKey(platform);
    try {
      // In web BGOS, OAuth connects via /api/oauth/facebook or web integrations
      const oauthUrl = `${WEB_URL}/api/oauth/${platform}`;
      const canOpen = await Linking.canOpenURL(oauthUrl);
      if (canOpen) {
        await Linking.openURL(oauthUrl);
      } else {
        Alert.alert(
          `Connect ${platform === 'facebook' ? 'Facebook' : 'Instagram'}`,
          `To connect your official ${platform === 'facebook' ? 'Facebook Page' : 'Instagram Business account'}, open BGOS Web Channels or log in through Meta Business Suite.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Web Integrations',
              onPress: () => void Linking.openURL(`${WEB_URL}/app?view=integrations`),
            },
          ]
        );
      }
    } catch {
      Alert.alert(
        'Connection Info',
        `Meta OAuth requires a verified business redirect. Open BGOS Web Settings > Social Accounts to complete ${platform === 'facebook' ? 'Facebook' : 'Instagram'} verification.`
      );
    } finally {
      setConnectingKey(null);
    }
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
