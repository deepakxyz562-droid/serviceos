import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../lib/api';
import { connectSocialPlatform } from '../../lib/social-connect';
import {
  getPlatformMeta,
  SELECTABLE_PUBLISH_PLATFORMS,
  type PublishablePlatformKey,
} from './platform-meta';

export interface SocialChannelAccount {
  id?: string;
  platform: string;
  accountName?: string | null;
  isActive?: boolean;
}

export function useConnectedSocialChannels(visible = true) {
  const [accounts, setAccounts] = useState<SocialChannelAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ data?: SocialChannelAccount[] }>('/api/social/accounts');
      const list = Array.isArray(res?.data) ? res.data : [];
      setAccounts(list.filter((a) => a && a.isActive !== false));
    } catch {
      // Keep previous list on transient network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      void reload();
    }
  }, [visible]);

  return { accounts, loading, reload };
}

export function ChannelSelectorSection({
  selectedPlatforms,
  onChange,
  accounts,
  onAccountsChanged,
  title = 'Publish Channels',
  subtitle = 'Select where this update should be posted',
}: {
  selectedPlatforms: string[];
  onChange: (next: string[]) => void;
  accounts: SocialChannelAccount[];
  onAccountsChanged?: () => Promise<void> | void;
  title?: string;
  subtitle?: string;
}) {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const accountByPlatform = React.useMemo(() => {
    const map = new Map<string, SocialChannelAccount>();
    for (const acc of accounts) {
      const key = (acc.platform || '').trim().toLowerCase();
      if (!key || map.has(key)) continue;
      map.set(key, acc);
    }
    return map;
  }, [accounts]);

  async function handleConnect(platform: PublishablePlatformKey) {
    setConnectingPlatform(platform);
    const meta = getPlatformMeta(platform);
    try {
      const outcome = await connectSocialPlatform(platform, { returnView: 'growth' });
      await onAccountsChanged?.();
      if (outcome.error) {
        Alert.alert('Connection Notice', outcome.error);
      }
    } catch {
      Alert.alert('Connection Notice', `Could not connect ${meta.fullLabel}. Please try again.`);
    } finally {
      setConnectingPlatform(null);
    }
  }

  function togglePlatform(platform: PublishablePlatformKey) {
    const isSelected = selectedPlatforms.includes(platform);
    if (isSelected) {
      onChange(selectedPlatforms.filter((p) => p !== platform));
    } else {
      onChange([...selectedPlatforms, platform]);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.selectedPill}>
          <Text style={styles.selectedPillText}>{selectedPlatforms.length} selected</Text>
        </View>
      </View>

      <View style={styles.list}>
        {SELECTABLE_PUBLISH_PLATFORMS.map((platform) => {
          const meta = getPlatformMeta(platform);
          const connectedAcc = accountByPlatform.get(platform);
          const isConnected = Boolean(connectedAcc);
          const isChecked = selectedPlatforms.includes(platform);
          const isConnecting = connectingPlatform === platform;

          return (
            <Pressable
              key={platform}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked, disabled: !isConnected }}
              onPress={() => {
                if (!isConnected) {
                  void handleConnect(platform);
                  return;
                }
                togglePlatform(platform);
              }}
              style={[
                styles.row,
                isChecked && isConnected && styles.rowSelected,
                !isConnected && styles.rowDisconnected,
              ]}
            >
              <View style={[styles.iconBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                <MaterialCommunityIcons name={meta.brandIcon} size={17} color={meta.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.platformName}>{meta.fullLabel}</Text>
                <Text style={styles.accountMeta} numberOfLines={1}>
                  {isConnected
                    ? connectedAcc?.accountName || 'Connected'
                    : 'Not connected — tap to link'}
                </Text>
              </View>

              {isConnecting ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : isConnected ? (
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                  {isChecked && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                </View>
              ) : (
                <View style={styles.connectBtn}>
                  <Text style={styles.connectBtnText}>Connect</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  selectedPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  selectedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  rowSelected: {
    borderColor: '#009F50',
    backgroundColor: '#F0FDF4',
  },
  rowDisconnected: {
    backgroundColor: '#FFFFFF',
    borderStyle: 'dashed',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#009F50',
    borderColor: '#009F50',
  },
  connectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  connectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
});
