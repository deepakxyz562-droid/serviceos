import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Screen, Card, Badge, ErrorNotice, ui, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { withProtectedRoute } from '../src/components/navigation/protected-route';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

function AutomationsScreen() {
  const router = useRouter();
  const workspaceRes = useResource<BgosWorkspace>('/api/bgos/workspace');

  const gbpAuto = workspaceRes.data?.automations?.gbp || {};
  const canUseRepeatCampaigns = Boolean(workspaceRes.data?.features?.whatsappRepeatCampaigns);
  const autoRows = [
    {
      id: 'gbp-autopost',
      title: 'Google Business Daily AI Auto-Post',
      desc: 'Automatically drafts and schedules local SEO posts and fresh photos to Google Maps.',
      icon: 'bolt' as const,
      route: '/(tabs)/marketing?mode=autopilot',
      active: Boolean(gbpAuto.autoPosts ?? workspaceRes.data?.automations?.profileAssistant),
    },
    {
      id: 'review-autoreply',
      title: 'AI Review Auto-Reply & Drip Requests',
      desc: 'Replies to new Google reviews in your brand tone and sends review invite reminders.',
      icon: 'rate-review' as const,
      route: '/reply-settings',
      active: Boolean(gbpAuto.autoReplies ?? true),
    },
    {
      id: 'whatsapp-followup',
      title: 'WhatsApp Chat AI & Quiet-Chat Follow-Up',
      desc: 'Answers leads 24/7 in Hinglish/English, checks open slots, and nudges quiet chats.',
      icon: 'smart-toy' as const,
      route: '/agents',
      active: Boolean(workspaceRes.data?.automations?.offlineReply ?? true),
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
      desc: 'Captures bookings 24/7 and sends timely appointment reminders automatically.',
      icon: 'event-available' as const,
      route: '/booking-page',
      active: Boolean(workspaceRes.data?.links?.booking),
    },
  ];

  return (
    <Screen
      title="AI Growth Automations"
      subtitle="All active Google Business & WhatsApp automations in one place."
      showBack
      onRefresh={workspaceRes.refresh}
    >
      <ErrorNotice message={workspaceRes.error} retry={workspaceRes.refresh} />

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
                <Badge success={item.active} label={item.active ? 'Ready' : 'Configure'} />
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
