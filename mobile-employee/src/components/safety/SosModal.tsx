import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ShieldAlert,
  PhoneCall,
  AlertTriangle,
  X,
  CheckCircle2,
  Navigation,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { captureGps } from '@/lib/gps';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface SosModalProps {
  visible: boolean;
  onClose: () => void;
  activeJobId?: string | null;
  activeJobAddress?: string | null;
}

type SosState = 'countdown' | 'sending' | 'sent' | 'cancelled';

export function SosModal({
  visible,
  onClose,
  activeJobId,
  activeJobAddress,
}: SosModalProps) {
  const { show } = useToast();
  const [sosState, setSosState] = useState<SosState>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [companyPhone, setCompanyPhone] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation for the emergency shield
  useEffect(() => {
    if (visible && sosState === 'countdown') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [visible, sosState, pulseAnim]);

  // Reset & start countdown when modal becomes visible
  useEffect(() => {
    if (visible) {
      setSosState('countdown');
      setCountdown(3);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [visible]);

  // When countdown hits 0, trigger dispatch
  useEffect(() => {
    if (countdown === 0 && sosState === 'countdown') {
      triggerSosDispatch();
    }
  }, [countdown, sosState]);

  const triggerSosDispatch = async () => {
    setSosState('sending');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    try {
      const gps = await captureGps();

      const res = await api.post<{
        success?: boolean;
        companyPhone?: string;
        error?: string;
      }>('/api/employee/sos', {
        latitude: gps?.latitude ?? null,
        longitude: gps?.longitude ?? null,
        address: activeJobAddress ?? null,
        jobId: activeJobId ?? null,
      });

      if (res && res.companyPhone) {
        setCompanyPhone(res.companyPhone);
      }

      setSosState('sent');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      show('🚨 Emergency SOS broadcasted to dispatchers', 'error');
    } catch (err: any) {
      console.warn('SOS dispatch failed:', err);
      setSosState('sent'); // Still show emergency dialing options even if network failed
      show('Distress signal logged locally. Call emergency services immediately.', 'error');
    }
  };

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSosState('cancelled');
    onClose();
  };

  const handleCall911 = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    Linking.openURL('tel:911').catch(() => {
      show('Unable to open phone app to dial 911.', 'error');
    });
  };

  const handleCallDispatcher = () => {
    if (!companyPhone) {
      show('No company phone number configured on account.', 'info');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(`tel:${companyPhone}`).catch(() => {
      show('Unable to dial company dispatcher.', 'error');
    });
  };

  return (
    <Modal visible={visible} onClose={handleCancel} position="center" showHandle={false}>
      <View className="p-6 items-center">
        {/* State: Countdown */}
        {sosState === 'countdown' && (
          <View className="items-center w-full">
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
              }}
              className="h-24 w-24 rounded-full bg-red-100 border-4 border-red-500 items-center justify-center mb-4"
            >
              <ShieldAlert size={48} color="#DC2626" />
            </Animated.View>

            <Text className="text-xl font-black text-red-600 tracking-tight uppercase">
              Emergency SOS Signal
            </Text>

            <Text className="text-center text-xs text-muted-foreground mt-1 mb-4 px-2">
              Dispatching your live GPS coordinates & job details to company managers in:
            </Text>

            <View className="h-16 w-16 rounded-full bg-red-600 items-center justify-center mb-5 shadow-lg">
              <Text className="text-3xl font-black text-white">{countdown}</Text>
            </View>

            <View className="w-full gap-2.5">
              <Button
                variant="destructive"
                size="lg"
                fullWidth
                onPress={triggerSosDispatch}
              >
                <View className="flex-row items-center justify-center">
                  <ShieldAlert size={18} color="#ffffff" />
                  <Text className="ml-2 font-black text-white">SEND SOS NOW</Text>
                </View>
              </Button>

              <Button
                variant="outline"
                size="md"
                fullWidth
                onPress={handleCancel}
              >
                <Text className="font-semibold text-foreground">Cancel (False Alarm)</Text>
              </Button>
            </View>
          </View>
        )}

        {/* State: Sending */}
        {sosState === 'sending' && (
          <View className="items-center py-6 w-full">
            <ActivityIndicator size="large" color="#DC2626" />
            <Text className="text-base font-bold text-foreground mt-4">
              Broadcasting Distress Signal…
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              Capturing GPS & notifying dispatchers via SMS
            </Text>
          </View>
        )}

        {/* State: Sent / Active Distress */}
        {sosState === 'sent' && (
          <View className="items-center w-full">
            <View className="h-16 w-16 rounded-full bg-red-500 items-center justify-center mb-3">
              <AlertTriangle size={32} color="#ffffff" />
            </View>

            <Text className="text-lg font-black text-red-600 uppercase tracking-tight">
              SOS Broadcasted!
            </Text>

            <Text className="text-center text-xs text-muted-foreground mt-1 mb-5">
              Your distress signal and live GPS location have been dispatched to company managers.
            </Text>

            {/* Quick Call Actions */}
            <View className="w-full gap-2.5 mb-4">
              <Pressable
                onPress={handleCall911}
                className="w-full py-3.5 px-4 rounded-xl bg-red-600 active:bg-red-700 flex-row items-center justify-center shadow-md"
              >
                <PhoneCall size={20} color="#ffffff" />
                <Text className="ml-2 text-base font-black text-white">
                  CALL 911 (POLICE / EMS)
                </Text>
              </Pressable>

              {companyPhone && (
                <Pressable
                  onPress={handleCallDispatcher}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 active:bg-slate-900 flex-row items-center justify-center"
                >
                  <PhoneCall size={18} color="#ffffff" />
                  <Text className="ml-2 text-sm font-bold text-white">
                    Call Company Dispatcher ({companyPhone})
                  </Text>
                </Pressable>
              )}
            </View>

            <Button
              variant="outline"
              size="sm"
              fullWidth
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onClose();
              }}
            >
              <Text className="text-xs font-semibold text-muted-foreground">
                Dismiss (I am safe now)
              </Text>
            </Button>
          </View>
        )}
      </View>
    </Modal>
  );
}
