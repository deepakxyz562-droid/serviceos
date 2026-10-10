import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Action,
  Empty,
  ErrorNotice,
  Loading,
  Chip,
  Badge,
  Field,
  MetricCard,
  ui,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { WEB_URL } from '../../src/lib/constants';

type Agent = { id: string; name: string; roleTitle?: string; welcomeGreeting?: string; voiceTone?: string };

export default function AgentsScreen() {
  const router = useRouter();
  const resource = useResource<{ agents: Agent[] }>('/api/forms/agents');
  const [activeTab, setActiveTab] = useState<'channels' | 'testlab' | 'performance'>('channels');
  const [error, setError] = useState<string | null>(null);
  const [builderModal, setBuilderModal] = useState(false);

  // Channel toggles (Screen 10 in mockups)
  const [toggles, setToggles] = useState({
    website: true,
    whatsapp: true,
    instagram: true,
    messenger: true,
    twilio: false,
  });

  // Test Lab Chat State (Module 4.5 in mockups)
  const [testMessages, setTestMessages] = useState<
    { role: 'user' | 'assistant'; text: string; time: string }[]
  >([
    {
      role: 'assistant',
      text: 'Hello! I am your AI Business Assistant. How can I assist you with services, bookings or pricing today?',
      time: '10:00 AM',
    },
  ]);
  const [testInput, setTestInput] = useState('');
  const [testBusy, setTestBusy] = useState(false);

  async function sendTestMessage(msg?: string) {
    const toSend = msg || testInput;
    if (!toSend.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTestMessages((prev) => [...prev, { role: 'user', text: toSend.trim(), time: now }]);
    setTestInput('');
    setTestBusy(true);

    try {
      const activeAgent = resource.data?.agents?.[0];
      const endpoint = activeAgent?.id ? `/api/forms/agents/${activeAgent.id}/chat` : '/api/forms/agents/preview/chat';
      const res = await apiRequest<{ reply?: string; response?: string; text?: string }>(endpoint, {
        method: 'POST',
        body: { message: toSend.trim() },
      });
      const replyText = res.reply || res.response || res.text || 'I have noted your message and will notify our team.';
      setTestMessages((prev) => [
        ...prev,
        { role: 'assistant', text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } catch (e) {
      setTestMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `AI Assistant: ${(e as Error).message || 'Unable to reach agent service. Please verify agent status.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setTestBusy(false);
    }
  }

  return (
    <Screen
      title="AI Assistant Studio"
      subtitle="Autonomous customer bots, multi-channel deployment & test lab."
      showBack={true}
      onRefresh={resource.refresh}
      rightAction={
        <Action
          label="＋ Create Agent"
          icon="smart-toy"
          onPress={() => setBuilderModal(true)}
        />
      }
    >
      <ErrorNotice message={error || resource.error} retry={resource.refresh} />

      {/* Segmented Tabs: Channels, Test Lab, Performance */}
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Chip
          label="Channel Bots"
          selected={activeTab === 'channels'}
          onPress={() => setActiveTab('channels')}
        />
        <Chip
          label="Interactive Test Lab"
          selected={activeTab === 'testlab'}
          onPress={() => setActiveTab('testlab')}
        />
        <Chip
          label="Performance"
          selected={activeTab === 'performance'}
          onPress={() => setActiveTab('performance')}
        />
      </View>

      {/* CHANNELS VIEW (Screen 10 in mockups) */}
      {activeTab === 'channels' && (
        <View style={{ gap: 14 }}>
          {/* Active AI Status Banner */}
          <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 18 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>AI Autonomous Receptionist</Text>
                <Text style={{ fontSize: 13, color: '#D1EAE5', marginTop: 4 }}>
                  Answers questions, captures qualified leads, and books calendar slots 24/7.
                </Text>
              </View>
              <MaterialIcons name="auto-awesome" size={32} color={colors.accent} />
            </View>
          </Card>

          {/* Channel Bots with Toggles */}
          <Card style={{ padding: 0 }}>
            {[
              {
                key: 'website' as const,
                title: 'Website Chatbot',
                detail: 'Active 24x7 · Handles web queries & booking',
                icon: 'language' as const,
              },
              {
                key: 'whatsapp' as const,
                title: 'WhatsApp Bot',
                detail: 'Auto-reply to customer messages & brochures',
                icon: 'chat' as const,
              },
              {
                key: 'instagram' as const,
                title: 'Instagram DM Bot',
                detail: 'Instant replies to story mentions & DMs',
                icon: 'camera-alt' as const,
              },
              {
                key: 'messenger' as const,
                title: 'Facebook Messenger',
                detail: 'Answers inquiries on your business page',
                icon: 'facebook' as const,
              },
              {
                key: 'twilio' as const,
                title: 'Twilio (SMS / Calls)',
                detail: 'Voice deflection & SMS confirmations',
                icon: 'phone' as const,
              },
            ].map((c, i) => (
              <View
                key={c.key}
                style={[
                  ui.row,
                  {
                    justifyContent: 'space-between',
                    padding: 16,
                    borderBottomWidth: i === 4 ? 0 : 1,
                    borderBottomColor: colors.line,
                  },
                ]}
              >
                <View style={[ui.row, { gap: 12, flex: 1 }]}>
                  <View style={ui.iconTile}>
                    <MaterialIcons name={c.icon} size={22} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ui.heading}>{c.title}</Text>
                    <Text style={ui.caption}>{c.detail}</Text>
                  </View>
                </View>
                <Switch
                  value={toggles[c.key]}
                  onValueChange={(val) => setToggles((prev) => ({ ...prev, [c.key]: val }))}
                  trackColor={{ true: colors.brand }}
                />
              </View>
            ))}
          </Card>

          <Action
            label="Monitor Active Chats in Inbox"
            icon="chat"
            onPress={() => router.push('/(tabs)/inbox')}
          />
          <Action
            secondary
            label="Configure Knowledge Base · Web"
            icon="open-in-new"
            onPress={() => Linking.openURL(`${WEB_URL}/app?view=agentStudio`).catch(() => {})}
          />
        </View>
      )}

      {/* TEST LAB SANDBOX VIEW (Module 4.5 in mockups) */}
      {activeTab === 'testlab' && (
        <View style={{ gap: 14 }}>
          <Card style={{ gap: 8 }}>
            <Text style={ui.heading}>Live Assistant Test Lab</Text>
            <Text style={ui.body}>
              Test how your AI assistant responds to customer inquiries before deploying to live channels.
            </Text>

            {/* Quick Test Prompts */}
            <Text style={ui.label}>Try Sample Inquiries</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[ui.row, { gap: 6 }]}>
                {[
                  'What are your business hours?',
                  'Can I book an appointment?',
                  'Do you have fresh chocolate cake?',
                  'How much do services cost?',
                ].map((prompt) => (
                  <Chip
                    key={prompt}
                    label={prompt}
                    selected={false}
                    onPress={() => sendTestMessage(prompt)}
                  />
                ))}
              </View>
            </ScrollView>
          </Card>

          {/* Test Chat Stream */}
          <Card style={{ padding: 12, minHeight: 260, maxHeight: 360 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                {testMessages.map((m, idx) => (
                  <View
                    key={idx}
                    style={{
                      maxWidth: '85%',
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: m.role === 'user' ? colors.brand : colors.soft,
                      padding: 12,
                      borderRadius: 14,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: m.role === 'user' ? '#CCFBF1' : colors.brand,
                        marginBottom: 2,
                      }}
                    >
                      {m.role === 'user' ? 'You (Test User)' : '🤖 AI Assistant'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        lineHeight: 20,
                        color: m.role === 'user' ? '#FFFFFF' : colors.ink,
                      }}
                    >
                      {m.text}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: m.role === 'user' ? '#D1EAE5' : colors.muted,
                        marginTop: 4,
                        alignSelf: 'flex-end',
                      }}
                    >
                      {m.time}
                    </Text>
                  </View>
                ))}
                {testBusy && (
                  <View style={{ alignSelf: 'flex-start', padding: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.muted }}>AI is typing…</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </Card>

          <Field
            label="Type a test question"
            value={testInput}
            onChangeText={setTestInput}
            placeholder="Ask about hours, pricing, bookings…"
          />
          <Action
            label={testBusy ? 'Responding…' : 'Send Test Query'}
            icon="send"
            disabled={testBusy || !testInput.trim()}
            onPress={() => sendTestMessage()}
          />
        </View>
      )}

      {/* PERFORMANCE VIEW (Module 4.6 in mockups) */}
      {activeTab === 'performance' && (
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <MetricCard value="248" label="Total Conversations" trend="+34%" trendPositive={true} icon="chat" />
            <MetricCard value="136" label="Staff Hours Saved" trend="+20%" trendPositive={true} icon="schedule" />
            <MetricCard value="88%" label="Resolution Rate" trend="Optimal" trendPositive={true} icon="check-circle" />
            <MetricCard value="48" label="Bookings Secured" trend="+15%" trendPositive={true} icon="event" />
          </View>

          <Card style={{ gap: 10 }}>
            <Text style={ui.heading}>Most Frequent Customer Questions</Text>
            {[
              ['How much do your services cost?', '78 queries'],
              ['Do you offer weekend appointments?', '54 queries'],
              ['Where are you located?', '42 queries'],
              ['Can I book an appointment online?', '36 queries'],
            ].map(([q, count], i) => (
              <View
                key={i}
                style={[
                  ui.row,
                  {
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderBottomWidth: i === 3 ? 0 : 1,
                    borderBottomColor: colors.line,
                  },
                ]}
              >
                <Text style={[ui.body, { flex: 1, color: colors.ink }]}>{q}</Text>
                <Badge label={count} accent />
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* 5-STEP AGENT BUILDER MODAL (Screen 11 in mockups) */}
      <Modal visible={builderModal} animationType="slide" onRequestClose={() => setBuilderModal(false)}>
        <Screen
          title="Create AI Agent"
          subtitle="5-step fast launch wizard."
          showBack={true}
          onBack={() => setBuilderModal(false)}
        >
          <Card style={{ gap: 14 }}>
            {[
              { num: '1', title: 'Choose template', desc: 'Start with ready industry agent' },
              { num: '2', title: 'Train with your data', desc: 'Websites, PDFs, FAQs & products' },
              { num: '3', title: 'Connect channels', desc: 'WhatsApp, Instagram, Web widget' },
              { num: '4', title: 'Test your agent', desc: 'Try sample customer conversations' },
              { num: '5', title: 'Launch', desc: 'Go live in 5 minutes' },
            ].map((s) => (
              <View key={s.num} style={[ui.row, { gap: 14 }]}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>{s.num}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ui.heading}>{s.title}</Text>
                  <Text style={ui.caption}>{s.desc}</Text>
                </View>
              </View>
            ))}

            <Action
              label="Open Full Studio in Web"
              icon="open-in-new"
              onPress={() => {
                setBuilderModal(false);
                Linking.openURL(`${WEB_URL}/app?view=agentStudio`).catch(() => {});
              }}
            />
            <Action secondary label="Close" onPress={() => setBuilderModal(false)} />
          </Card>
        </Screen>
      </Modal>
    </Screen>
  );
}
