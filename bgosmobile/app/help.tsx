import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Screen, colors, ui } from '../src/components/ui';
import { useAuthStore } from '../src/stores/auth-store';
import { useResource } from '../src/hooks/use-resource';
import { BGOS_SUPPORT_EMAIL, BGOS_SUPPORT_WHATSAPP_DIGITS } from '../src/lib/constants';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}

const FAQS: FaqItem[] = [
  {
    id: 'gbp',
    question: 'How do I connect and manage Google Business Profile?',
    answer:
      'Go to Home > Manage Profile or Select Profile. BGOS automatically links your verified location, syncs business hours, photos, and live customer reviews.',
    icon: 'storefront',
  },
  {
    id: 'whatsapp',
    question: 'How does the WhatsApp AI Chatbot reply to customers?',
    answer:
      'Connect your WhatsApp Business number under Integrations. Inbound inquiries will be answered 24/7 by your trained AI Assistant using your custom knowledge base and pricing.',
    icon: 'chat',
  },
  {
    id: 'reviews',
    question: 'How does 1-Tap WhatsApp Review Request work?',
    answer:
      'Tap "Ask Review" on the Home dashboard or QR Standee. Choose a contact or enter a phone number to send a pre-filled WhatsApp message with your direct 5-star Google review link.',
    icon: 'star',
  },
  {
    id: 'trial',
    question: 'How does the 7-day free trial and billing work?',
    answer:
      'Every new business receives 7 days of full access to Google Growth, AI marketing posts, and WhatsApp automation. You can review or upgrade anytime under My Plan via UPI or cards.',
    icon: 'credit-card',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const workspace = useResource<BgosWorkspace>('/api/bgos/mobile/workspace');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const businessName = workspace.data?.name || user?.name || '';
  const userEmail = user?.email || '';

  function openWhatsAppSupport() {
    const contextBits: string[] = [];
    if (businessName) contextBits.push(`Business: ${businessName}`);
    if (userEmail) contextBits.push(`Account: ${userEmail}`);

    const baseGreeting = 'Hello BGOS Support, I need help with my BGOS account.';
    const fullMessage = contextBits.length > 0 ? `${baseGreeting}\n(${contextBits.join(' • ')})` : baseGreeting;
    const url = `https://wa.me/${BGOS_SUPPORT_WHATSAPP_DIGITS}?text=${encodeURIComponent(fullMessage)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Unable to open WhatsApp',
        `Please ensure WhatsApp is installed on your device or contact us via email at ${BGOS_SUPPORT_EMAIL}.`
      );
    });
  }

  function openEmailSupport() {
    const subject = `BGOS Support Request - ${businessName || userEmail || 'Account'}`;
    const url = `mailto:${BGOS_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Email Client Not Found', `You can email our support desk directly at ${BGOS_SUPPORT_EMAIL}.`);
    });
  }

  return (
    <Screen
      title="Help & Support"
      subtitle="BGOS 24/7 AI & Dedicated Team Support"
      showBack={true}
      onBack={() => {
        if (router.canGoBack?.()) router.back();
        else router.replace('/(tabs)');
      }}
    >
      {/* Top Hero Banner */}
      <Card
        style={{
          backgroundColor: '#043B26',
          borderColor: '#065F46',
          padding: 18,
          gap: 12,
        }}
      >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="auto-awesome" size={18} color="#34D399" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                BGOS Verified Support
              </Text>
              <Text style={{ color: '#A7F3D0', fontSize: 11.5, fontWeight: '600' }}>
                Instant AI answers & human team backup
              </Text>
            </View>
          </View>
          <Text style={{ color: '#E2E8F0', fontSize: 12.5, lineHeight: 18 }}>
            Have a question about Google rankings, review automations, or your business settings?
            Connect directly through our official WhatsApp channel or explore common guides below.
          </Text>
        </Card>

        {/* 1. Official WhatsApp Support (Primary) */}
        <Card style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="chat" size={24} color="#059669" />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
                  Chat on WhatsApp
                </Text>
                <Text style={{ fontSize: 11.5, color: '#059669', fontWeight: '700' }}>
                  Meta Verified • 24/7 AI Auto-Reply
                </Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: '#ECFDF5',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#A7F3D0',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857' }}>Official</Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
            Chat with our trained BGOS AI Assistant directly on WhatsApp for instant assistance with your
            account, marketing score, or customer leads.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chat on WhatsApp with BGOS"
            onPress={openWhatsAppSupport}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#059669',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              gap: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <MaterialIcons name="chat-bubble" size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' }}>
              Connect on WhatsApp
            </Text>
          </Pressable>
        </Card>

        {/* 2. In-App AI Assistant & Receptionist */}
        <Card style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#F3E8FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="smart-toy" size={24} color="#7C3AED" />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
                  AI Assistant & Receptionist
                </Text>
                <Text style={{ fontSize: 11.5, color: '#7C3AED', fontWeight: '700' }}>
                  Interactive Sandbox & Training
                </Text>
              </View>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
            Test customer questions, customize tone, and preview automated responses configured for your
            business before going live.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open AI Assistant"
            onPress={() => router.push('/(tabs)/agents')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FAF5FF',
              borderWidth: 1,
              borderColor: '#E9D5FF',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              gap: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: '#7C3AED', fontSize: 13, fontWeight: '800' }}>
              Open AI Assistant →
            </Text>
          </Pressable>
        </Card>

        {/* 3. Email Support Desk */}
        <Card style={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#EFF6FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="mail-outline" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }}>
                Email Support Desk
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.muted }}>
                {BGOS_SUPPORT_EMAIL}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send email to BGOS Support"
              onPress={openEmailSupport}
              style={{
                backgroundColor: '#F1F5F9',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '700' }}>Email Us</Text>
            </Pressable>
          </View>
        </Card>

        {/* 4. Frequently Asked Questions */}
        <Card style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="help-outline" size={18} color={colors.brand} />
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.ink }}>
              Frequently Asked Questions
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            {FAQS.map((faq) => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <Pressable
                  key={faq.id}
                  accessibilityRole="button"
                  onPress={() => setExpandedFaq(isExpanded ? null : faq.id)}
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                      <MaterialIcons name={faq.icon} size={18} color={colors.brand} />
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                        {faq.question}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={20}
                      color="#64748B"
                    />
                  </View>
                  {isExpanded ? (
                    <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 2 }}>
                      {faq.answer}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Card>
    </Screen>
  );
}
