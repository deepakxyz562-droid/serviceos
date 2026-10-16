/**
 * LoadingOverlay — full-screen or section spinner with optional message.
 * Used when a filter / fetch takes noticeable time (e.g. marketplace category).
 */
import React from 'react';
import { View, Text, ActivityIndicator, Modal as RNModal, StyleSheet } from 'react-native';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  /** If true, blocks the whole screen with a semi-transparent backdrop. */
  fullscreen?: boolean;
}

export function LoadingOverlay({ visible, message, fullscreen = true }: LoadingOverlayProps) {
  if (!visible) return null;

  if (fullscreen) {
    return (
      <RNModal visible transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#10B981" />
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </View>
      </RNModal>
    );
  }

  return (
    <View style={styles.inline}>
      <ActivityIndicator size="small" color="#10B981" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  card: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  message: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '500',
  },
});
