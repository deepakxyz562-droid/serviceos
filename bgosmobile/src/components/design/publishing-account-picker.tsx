import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PublishingAccount } from '../../../../shared/marketing-targets';

interface PublishingAccountPickerProps {
  accounts: PublishingAccount[];
  selectedIds: string[];
  toggle: (accountId: string) => void;
  manage: () => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}

const PLATFORMS_META = [
  {
    key: 'googlebusiness',
    label: 'Google',
    fullName: 'Google Business Profile',
    iconName: 'storefront' as const,
    color: '#1A73E8',
    activeBg: '#EFF6FF',
    activeBorder: '#BFDBFE',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    fullName: 'Facebook Page',
    iconName: 'facebook' as const,
    color: '#1877F2',
    activeBg: '#EEF2FF',
    activeBorder: '#C7D2FE',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    fullName: 'Instagram Business',
    iconName: 'camera-alt' as const,
    color: '#E1306C',
    activeBg: '#FDF2F8',
    activeBorder: '#FBCFE8',
  },
] as const;

export function PublishingAccountPicker({
  accounts,
  selectedIds,
  toggle,
  manage,
  onSelectAll,
  onClearAll,
}: PublishingAccountPickerProps) {
  const activeAccounts = accounts.filter((a) => a.isActive);
  const selectedAccounts = activeAccounts.filter((a) => selectedIds.includes(a.id));
  const hasSelection = selectedAccounts.length > 0;

  return (
    <View style={styles.container}>
      {/* ── Section Header with Transparency & Selection Actions ── */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="share" size={16} color="#009F50" />
          <Text style={styles.sectionTitle}>Publishing Destination</Text>
          <View
            style={[
              styles.countBadge,
              hasSelection ? styles.countBadgeActive : styles.countBadgeZero,
            ]}
          >
            <Text
              style={[
                styles.countBadgeText,
                hasSelection ? styles.countBadgeTextActive : styles.countBadgeTextZero,
              ]}
            >
              {selectedAccounts.length} selected
            </Text>
          </View>
        </View>

        {activeAccounts.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {hasSelection ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear account selection"
                onPress={onClearAll}
                hitSlop={8}
                style={styles.actionLink}
              >
                <Text style={styles.actionLinkText}>Clear</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select all connected accounts"
                onPress={onSelectAll}
                hitSlop={8}
                style={styles.actionLink}
              >
                <Text style={[styles.actionLinkText, { color: '#009F50' }]}>Select all</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* ── Live Selected Account Summary (Explicit Visibility) ── */}
      {hasSelection ? (
        <View style={styles.selectedSummaryBanner}>
          <MaterialIcons name="check-circle" size={16} color="#009F50" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Publishing directly to:</Text>
            <Text style={styles.summaryAccounts}>
              {selectedAccounts
                .map((a) => {
                  const meta = PLATFORMS_META.find((m) => m.key === a.platform);
                  const name = a.accountName || meta?.fullName || a.platform;
                  return `${name} (${meta?.label || a.platform})`;
                })
                .join(', ')}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.warningBanner}>
          <MaterialIcons name="info-outline" size={16} color="#D97706" style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>No account selected</Text>
            <Text style={styles.warningText}>
              Tap the account(s) below where you want this post to be published.
            </Text>
          </View>
        </View>
      )}

      {/* ── Connected Accounts List with Real Account Names ── */}
      <View style={styles.cardsList}>
        {PLATFORMS_META.map((meta) => {
          const platformAccounts = activeAccounts.filter((a) => a.platform === meta.key);
          const isConnected = platformAccounts.length > 0;

          if (!isConnected) {
            return (
              <Pressable
                key={meta.key}
                accessibilityRole="button"
                accessibilityLabel={`Connect ${meta.fullName}`}
                onPress={() => {
                  Alert.alert(
                    `Connect ${meta.fullName}`,
                    `You haven't connected a ${meta.fullName} account yet. Would you like to connect one now?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Connect', onPress: manage },
                    ]
                  );
                }}
                style={[styles.accountCard, styles.accountCardDisconnected]}
              >
                <View style={styles.accountCardLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                    <MaterialIcons name={meta.iconName} size={18} color="#94A3B8" />
                  </View>
                  <View>
                    <Text style={[styles.accountName, { color: '#64748B' }]}>{meta.fullName}</Text>
                    <Text style={styles.platformSub}>Not connected</Text>
                  </View>
                </View>
                <View style={styles.connectPill}>
                  <MaterialIcons name="add" size={13} color="#009F50" />
                  <Text style={styles.connectPillText}>Connect</Text>
                </View>
              </Pressable>
            );
          }

          return platformAccounts.map((account) => {
            const isChecked = selectedIds.includes(account.id);
            const displayName = account.accountName || meta.fullName;

            return (
              <Pressable
                key={account.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                accessibilityLabel={`${displayName} on ${meta.label}`}
                onPress={() => toggle(account.id)}
                style={[
                  styles.accountCard,
                  isChecked && {
                    backgroundColor: meta.activeBg,
                    borderColor: meta.activeBorder,
                  },
                ]}
              >
                <View style={styles.accountCardLeft}>
                  <View style={[styles.iconBox, { backgroundColor: '#FFFFFF', borderColor: isChecked ? meta.activeBorder : '#E2E8F0', borderWidth: 1 }]}>
                    <MaterialIcons name={meta.iconName} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.accountName, isChecked && { color: '#0F172A', fontWeight: '800' }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={styles.platformSub}>{meta.fullName}</Text>
                  </View>
                </View>

                <MaterialIcons
                  name={isChecked ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color={isChecked ? '#009F50' : '#94A3B8'}
                />
              </Pressable>
            );
          });
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  countBadgeZero: {
    backgroundColor: '#FEF3C7',
  },
  countBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  countBadgeTextActive: {
    color: '#15803D',
  },
  countBadgeTextZero: {
    color: '#B45309',
  },
  actionLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  selectedSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#166534',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryAccounts: {
    fontSize: 12,
    fontWeight: '800',
    color: '#14532D',
    marginTop: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  warningText: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 1,
  },
  cardsList: {
    gap: 7,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  accountCardDisconnected: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    opacity: 0.85,
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  platformSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  connectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
  },
  connectPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
});
