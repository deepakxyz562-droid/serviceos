import React, { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Card, Badge, ErrorNotice, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { withProtectedRoute } from '../src/components/navigation/protected-route';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

const REMINDER_OPTIONS: Array<{ key: '1h' | '24h' | '2d' | 'none'; label: string }> = [
  { key: '1h', label: '1h before' },
  { key: '24h', label: '24h before' },
  { key: '2d', label: '2d before' },
  { key: 'none', label: 'Off' },
];

function AutomationsScreen() {
  const router = useRouter();
  const workspaceRes = useResource<BgosWorkspace>('/api/bgos/workspace');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const gbpAuto = workspaceRes.data?.automations?.gbp || {};
  const canUseRepeatCampaigns = Boolean(workspaceRes.data?.features?.whatsappRepeatCampaigns);
  const offlineReplyEnabled = Boolean(workspaceRes.data?.automations?.offlineReply);
  const followUpEnabled = Boolean(workspaceRes.data?.automations?.followUp?.enabled);
  const reminderWindow = workspaceRes.data?.automations?.bookingReminderHours || '24h';

  async function patchAutomation(key: string, body: Record<string, unknown>) {
    setSavingKey(key);
    try {
      await apiRequest('/api/bgos/workspace', { method: 'PATCH', body });
      await workspaceRes.refresh();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message || 'Could not update automation setting.');
    } finally {
      setSavingKey(null);
    }
  }

  const autoRows = [
    {
      id: 'gbp-autopost',
      title: 'Google Business Daily AI Auto-Post',
      desc: 'Automatically drafts and schedules local SEO posts and fresh photos to Google Maps.',
      icon: 'bolt' as const,
      route: '/(tabs)/marketing?mode=autopilot',
      active: Boolean(gbpAuto.generatePosts || gbpAuto.postingSchedule || workspaceRes.data?.automations?.profileAssistant),
    },
    {
      id: 'review-autoreply',
      title: 'AI Review Auto-Reply & Drip Requests',
      desc: 'Replies to new Google reviews in your brand tone and sends review invite reminders.',
      icon: 'rate-review' as const,
      route: '/reply-settings',
      active: Boolean(gbpAuto.replyToReviews || gbpAuto.autoReplies),
    },
    {
      id: 'whatsapp-followup',
      title: 'WhatsApp Chat AI & Quiet-Chat Follow-Up',
      desc: 'Answers leads 24/7 in their language, checks open slots, and nudges quiet chats.',
      icon: 'smart-toy' as const,
      route: '/agents',
      active: offlineReplyEnabled || followUpEnabled,
    },
    ...(canUseRepeatCampaigns
      ? [
          {
            id: 'repeat-campaigns',
            title: 'WhatsApp Occasions & 60d Comeback',
            desc: 'Re-engages past & inactive customers around festivals, weekends & return offers.',
            icon: 'campaign' as const,
            route: '/whatsapp-campaigns',
            active: true,
          },
        ]
      : []),
    {
      id: 'booking-reminders',
      title: 'Online Booking & Appointment Reminders',
      desc: 'Captures bookings 24/7 and sends automated WhatsApp utility reminders before slots.',
      icon: 'event-available' as const,
      route: '/booking-page',
      active: Boolean(workspaceRes.data?.links?.booking) && reminderWindow !== 'none',
    },
  ];

  return (
    <Screen
      title="AI Growth Automations"
      subtitle="Configure real-time Google Business & WhatsApp automations for your business."
      showBack
      onRefresh={workspaceRes.refresh}
    >
      <ErrorNotice message={workspaceRes.error} retry={workspaceRes.refresh} />

      {/* Direct Business Automation Controls */}
      <Card style={{ gap: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
          WhatsApp Business Controls
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
              Offline WhatsApp Auto-Reply
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.muted }}>
              Reply automatically when no team member is online
            </Text>
          </View>
          <Switch
            value={offlineReplyEnabled}
            disabled={savingKey === 'offlineReply'}
            onValueChange={(val) => patchAutomation('offlineReply', { offlineReply: val })}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
              Quiet-Chat Auto Follow-Up
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.muted }}>
              Send one polite nudge when an unbooked lead goes quiet
            </Text>
          </View>
          <Switch
            value={followUpEnabled}
            disabled={savingKey === 'followUp'}
            onValueChange={(val) => patchAutomation('followUp', { followUp: { enabled: val } })}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
            WhatsApp Appointment Reminder Window
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {REMINDER_OPTIONS.map((opt) => {
              const selected = reminderWindow === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  disabled={savingKey === 'reminder'}
                  onPress={() => patchAutomation('reminder', { bookingReminderHours: opt.key })}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: selected ? colors.brand : colors.line,
                    backgroundColor: selected ? colors.brandSoft : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '700',
                      color: selected ? colors.brandDark : colors.muted,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        {autoRows.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(item.route as any)}>
            <Card style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: colors.brandSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name={item.icon} size={19} color={colors.brandDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>{item.title}</Text>
                  </View>
                </View>
                <Badge success={item.active} label={item.active ? 'Active' : 'Configure'} />
              </View>
              <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>{item.desc}</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.brand }}>Open Controls →</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

export default withProtectedRoute(AutomationsScreen);
