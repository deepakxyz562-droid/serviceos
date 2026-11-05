import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PublishingAccount } from '../../../../shared/marketing-targets';

interface PublishingAccountPickerProps {
  accounts: PublishingAccount[];
  selectedIds: string[];
  toggle: (accountId: string) => void;
  manage: () => void;
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
}: PublishingAccountPickerProps) {
  return (
    <View style={styles.container}>
      {PLATFORMS_META.map((meta) => {
        const connectedAccount = accounts.find(
          (a) => a.platform === meta.key && a.isActive
        );
        const isConnected = !!connectedAccount;
        const isChecked = isConnected && selectedIds.includes(connectedAccount.id);

        const handlePress = () => {
          if (!isConnected) {
            Alert.alert(
              `Connect ${meta.fullName}`,
              `You haven't connected a ${meta.fullName} account yet. Would you like to connect one now?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Connect', onPress: manage },
              ]
            );
            return;
          }
          toggle(connectedAccount.id);
        };

        return (
          <Pressable
            key={meta.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isChecked, disabled: !isConnected }}
            accessibilityLabel={`${meta.label}${!isConnected ? ' (not connected)' : ''}`}
            onPress={handlePress}
            style={[
              styles.pill,
              isChecked && {
                backgroundColor: meta.activeBg,
                borderColor: meta.activeBorder,
              },
              !isConnected && styles.pillDisabled,
            ]}
          >
            <View style={styles.leftGroup}>
              <MaterialIcons
                name={meta.iconName}
                size={17}
                color={isConnected ? meta.color : '#94A3B8'}
              />
              <Text
                style={[
                  styles.label,
                  isChecked && { color: '#0F172A', fontWeight: '800' },
                  !isConnected && styles.labelDisabled,
                ]}
                numberOfLines={1}
              >
                {meta.label}
              </Text>
            </View>

            <MaterialIcons
              name={
                isChecked
                  ? 'check-box'
                  : isConnected
                  ? 'check-box-outline-blank'
                  : 'add-circle-outline'
              }
              size={18}
              color={
                isChecked
                  ? '#009F50'
                  : isConnected
                  ? '#94A3B8'
                  : '#CBD5E1'
              }
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 10,
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
  pillDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    opacity: 0.75,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flexShrink: 1,
  },
  labelDisabled: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});
