import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { PendingGoogleUpdate } from './types';

interface PendingUpdateBannerProps {
  pending?: PendingGoogleUpdate | null;
  onRefresh?: () => Promise<void> | void;
  style?: any;
}

export function PendingUpdateBanner({ pending, onRefresh, style }: PendingUpdateBannerProps) {
  const [checking, setChecking] = useState(false);

  if (!pending || pending.status === 'IDLE' || pending.status === 'COMPLETED') {
    return null;
  }

  const isVerification = pending.status === 'VERIFICATION_REQUIRED';

  const handleCheckStatus = async () => {
    if (!onRefresh || checking) return;
    setChecking(true);
    try {
      await onRefresh();
    } finally {
      setChecking(false);
    }
  };

  const handleOpenGoogle = async () => {
    const url = pending.googleVerificationUrl || 'https://business.google.com/';
    try {
      await Linking.openURL(url);
    } catch {
      // fallback
    }
  };

  return (
    <View
      style={[
        styles.container,
        isVerification ? styles.containerVerification : styles.containerPending,
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, isVerification ? styles.iconWrapVerification : styles.iconWrapPending]}>
          <MaterialIcons
            name={isVerification ? 'warning' : 'hourglass-top'}
            size={20}
            color={isVerification ? '#b91c1c' : '#b45309'}
          />
        </View>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, isVerification ? styles.titleVerification : styles.titlePending]}>
            {isVerification ? 'Action Required: Verify on Google' : 'Google Update in Review'}
          </Text>
          <Text style={styles.timeText}>
            Submitted {pending.submittedAt ? new Date(pending.submittedAt).toLocaleDateString() : 'recently'}
          </Text>
        </View>
      </View>

      <Text style={styles.bodyText}>
        {isVerification
          ? `Google has placed your recent changes (${pending.label}) on hold pending manual verification. You must confirm this directly in your Google Business Profile manager before edits can go live.`
          : `Your recent changes (${pending.label}) have been submitted to Google. Google is currently processing this update. New submissions are temporarily locked to protect your listing from conflicting edits.`}
      </Text>

      <View style={styles.actionRow}>
        {isVerification ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleOpenGoogle}
            style={[styles.button, styles.primaryButton]}
          >
            <MaterialIcons name="open-in-new" size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryButtonText}>Verify on Google</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={handleCheckStatus}
            disabled={checking}
            style={[styles.button, styles.secondaryButton]}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#92400e" style={{ marginRight: 6 }} />
            ) : (
              <MaterialIcons name="refresh" size={16} color="#92400e" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.secondaryButtonText}>
              {checking ? 'Checking Status...' : 'Check Status'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
  },
  containerPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  containerVerification: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconWrapPending: {
    backgroundColor: '#fef3c7',
  },
  iconWrapVerification: {
    backgroundColor: '#fee2e2',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  titlePending: {
    color: '#92400e',
  },
  titleVerification: {
    color: '#991b1b',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  bodyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryButton: {
    backgroundColor: '#dc2626',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  secondaryButtonText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '700',
  },
});
