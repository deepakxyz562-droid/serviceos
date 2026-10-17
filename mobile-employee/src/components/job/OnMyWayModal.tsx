import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Navigation,
  MapPin,
  Clock,
  MessageSquare,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { COLORS } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth-store';
import type { Job } from '@/types';

interface OnMyWayModalProps {
  visible: boolean;
  onClose: () => void;
  job: Job;
  onConfirmTravel: (etaMinutes: number, sendSms: boolean) => Promise<void>;
}

const ETA_PRESETS = [15, 30, 45, 60];

export function OnMyWayModal({
  visible,
  onClose,
  job,
  onConfirmTravel,
}: OnMyWayModalProps) {
  const [selectedEta, setSelectedEta] = useState<number>(30);
  const [isCustom, setIsCustom] = useState(false);
  const [customEta, setCustomEta] = useState('30');
  const [sendSms, setSendSms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = useAuthStore((s) => s.user);
  const techName = user?.name ? user.name.split(' ')[0] : 'Your technician';
  const customerFirstName = job.customer?.name
    ? job.customer.name.split(' ')[0]
    : 'there';

  const effectiveEta = isCustom ? parseInt(customEta, 10) || 30 : selectedEta;

  const smsPreview = useMemo(() => {
    return `Hi ${customerFirstName}, ${techName} from the service team is on the way to your location! Estimated arrival: ~${effectiveEta} mins. Track live here: https://fieseros.com/track/${job.id}`;
  }, [customerFirstName, techName, effectiveEta, job.id]);

  const handleSelectPreset = (val: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsCustom(false);
    setSelectedEta(val);
  };

  const handleStartTravel = async () => {
    try {
      setIsSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // 1. Trigger backend lifecycle transition + tracking activation
      await onConfirmTravel(effectiveEta, sendSms);

      // 2. Automatically launch Apple Maps or Google Maps navigation if address is present
      if (job.address) {
        const encoded = encodeURIComponent(job.address);
        const mapUrl = Platform.select({
          ios: `maps://app?daddr=${encoded}`,
          android: `google.navigation:q=${encoded}`,
          default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
        });

        Linking.canOpenURL(mapUrl).then((supported) => {
          if (supported) {
            Linking.openURL(mapUrl).catch(() => {
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
            });
          } else {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
          }
        });
      }

      onClose();
    } catch {
      // error handled in caller
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <View className="max-h-[85vh]">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border pb-3 mb-4">
          <View className="flex-row items-center gap-2.5">
            <View className="size-10 rounded-full bg-emerald-100 items-center justify-center">
              <Navigation size={20} color="#059669" />
            </View>
            <View>
              <Text className="text-lg font-bold text-foreground">On My Way</Text>
              <Text className="text-xs text-muted-foreground">
                Heading to {job.customer?.name || 'Customer'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="size-8 items-center justify-center rounded-full bg-muted"
          >
            <X size={16} color={COLORS.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
          {/* Destination banner */}
          {job.address ? (
            <View className="flex-row items-start gap-2 rounded-xl bg-slate-50 p-3 border border-slate-200">
              <MapPin size={16} color="#059669" className="mt-0.5 shrink-0" />
              <View className="flex-1">
                <Text className="text-xs font-semibold text-slate-700">Destination</Text>
                <Text className="text-sm font-medium text-slate-900 mt-0.5">
                  {job.address}
                </Text>
              </View>
            </View>
          ) : null}

          {/* ETA Presets */}
          <View className="space-y-2 mt-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Estimated Arrival Time (ETA)
              </Text>
              <Text className="text-xs font-bold text-emerald-700">
                {effectiveEta} mins away
              </Text>
            </View>

            <View className="flex-row gap-2">
              {ETA_PRESETS.map((val) => {
                const active = !isCustom && selectedEta === val;
                return (
                  <Pressable
                    key={val}
                    onPress={() => handleSelectPreset(val)}
                    className={`flex-1 items-center justify-center py-2.5 rounded-xl border ${
                      active
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        active ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      {val}m
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setIsCustom(true);
                }}
                className={`px-3 items-center justify-center rounded-xl border ${
                  isCustom
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isCustom ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  Custom
                </Text>
              </Pressable>
            </View>

            {isCustom ? (
              <View className="flex-row items-center gap-2 mt-1">
                <TextInput
                  value={customEta}
                  onChangeText={setCustomEta}
                  keyboardType="number-pad"
                  placeholder="Minutes"
                  className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                />
                <Text className="text-xs text-muted-foreground font-medium">minutes</Text>
              </View>
            ) : null}
          </View>

          {/* SMS Notification Toggle */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setSendSms(!sendSms);
            }}
            className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 mt-2"
          >
            <View className="flex-row items-center gap-2.5 flex-1 pr-2">
              <View className="size-8 rounded-full bg-emerald-50 items-center justify-center">
                <MessageSquare size={16} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">
                  Send Live Tracking SMS
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Text customer ETA and real-time map link
                </Text>
              </View>
            </View>

            <View
              className={`size-6 rounded-md items-center justify-center ${
                sendSms ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              {sendSms ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
            </View>
          </Pressable>

          {/* Message Preview */}
          {sendSms ? (
            <View className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100 space-y-1">
              <View className="flex-row items-center gap-1.5">
                <Sparkles size={12} color="#059669" />
                <Text className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Customer Message Preview
                </Text>
              </View>
              <Text className="text-xs text-emerald-950 font-medium leading-relaxed">
                "{smsPreview}"
              </Text>
            </View>
          ) : null}

          {/* Action Button */}
          <View className="pt-2">
            <Button
              onPress={handleStartTravel}
              loading={isSubmitting}
              size="lg"
              className="bg-emerald-600 active:bg-emerald-700"
              fullWidth
            >
              <View className="flex-row items-center justify-center gap-2">
                <Navigation size={18} color="#fff" />
                <Text className="text-base font-bold text-white">
                  Start Travel & Open Maps
                </Text>
              </View>
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
