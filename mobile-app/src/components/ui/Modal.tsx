/**
 * Modal — bottom sheet / centered dialog wrapper.
 * Uses Modal from react-native with a backdrop press-to-dismiss.
 */
import React from 'react';
import { Modal as RNModal, View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Position of the sheet. */
  position?: 'bottom' | 'center';
  /** Show a drag handle at the top (bottom sheet style). */
  showHandle?: boolean;
  style?: ViewStyle;
}

export function Modal({
  visible,
  onClose,
  children,
  position = 'bottom',
  showHandle = true,
  style,
}: ModalProps) {
  const insets = useSafeAreaInsets();
  // Ensure the bottom-sheet content clears the device home indicator.
  // Use a minimum of 24 so phones without a safe area still get breathing room.
  const safePaddingBottom = Math.max(insets.bottom, 24);
  return (
    <RNModal
      visible={visible}
      transparent
      animationType={position === 'bottom' ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            position === 'bottom' ? styles.bottomSheet : styles.centerSheet,
            position === 'bottom' ? { paddingBottom: safePaddingBottom } : null,
            style,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {showHandle && position === 'bottom' && <View style={styles.handle} />}
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  centerSheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 24,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
});
