import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { enablePush, isPushPermissionGranted } from '../../lib/push';

// Session-level flag: on fresh app launch, it asks the user
let sessionPromptShown = false;

export function PushPromptModal({ forceOpen = false, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function checkPermission() {
      if (forceOpen) {
        setVisible(true);
        return;
      }
      if (sessionPromptShown) return;

      const granted = await isPushPermissionGranted();
      if (!granted && active) {
        sessionPromptShown = true;
        setVisible(true);
      }
    }
    void checkPermission();
    return () => {
      active = false;
    };
  }, [forceOpen]);

  async function handleEnable() {
    setBusy(true);
    setStatusMessage(null);
    try {
      const res = await enablePush();
      if (res.success) {
        setStatusMessage('✓ Notifications enabled!');
        setTimeout(() => {
          setVisible(false);
          onClose?.();
        }, 1200);
      } else {
        setStatusMessage(res.message);
      }
    } catch (e) {
      setStatusMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    setVisible(false);
    onClose?.();
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 360,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.2,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Bell Icon with circular gradient background */}
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#EEF2FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: '#C7D2FE',
            }}
          >
            <MaterialIcons name="notifications-active" size={32} color="#4F46E5" />
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              color: '#0F172A',
              textAlign: 'center',
              marginBottom: 8,
              letterSpacing: -0.3,
            }}
          >
            Enable Push Notifications
          </Text>

          <Text
            style={{
              fontSize: 13.5,
              lineHeight: 20,
              color: '#64748B',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            Get instant alerts when customers post new Google reviews, AI draft replies are generated, or new leads come in.
          </Text>

          {statusMessage ? (
            <View
              style={{
                backgroundColor: statusMessage.startsWith('✓') ? '#F0FDF4' : '#FEF2F2',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                marginBottom: 16,
                width: '100%',
              }}
            >
              <Text
                style={{
                  color: statusMessage.startsWith('✓') ? '#16A34A' : '#DC2626',
                  fontSize: 12.5,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                {statusMessage}
              </Text>
            </View>
          ) : null}

          {/* Primary Action Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enable Notifications"
            disabled={busy}
            onPress={handleEnable}
            style={({ pressed }) => ({
              backgroundColor: '#4F46E5',
              paddingVertical: 14,
              borderRadius: 12,
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: busy ? 0.7 : pressed ? 0.85 : 1,
              marginBottom: 10,
            })}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                Enable Notifications
              </Text>
            )}
          </Pressable>

          {/* Maybe Later Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Maybe Later"
            disabled={busy}
            onPress={handleDismiss}
            style={({ pressed }) => ({
              paddingVertical: 10,
              paddingHorizontal: 16,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: '#94A3B8', fontSize: 13.5, fontWeight: '600' }}>
              Maybe Later
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
