import React, { useState } from 'react';
import { Linking, Modal, ScrollView, Text, View } from 'react-native';
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
  Field,
  ui,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { WEB_URL } from '../../src/lib/constants';
import { getBgosWebUrl } from '../../src/lib/bgos-urls';

type Agent = { id: string; name: string; roleTitle?: string; welcomeGreeting?: string; voiceTone?: string };

export default function AgentsScreen() {
  const router = useRouter();
  const resource = useResource<{ agents: Agent[] }>('/api/forms/agents');
  const [activeTab, setActiveTab] = useState<'channels' | 'testlab' | 'performance'>('channels');
  const [error, setError] = useState<string | null>(null);
  const [builderModal, setBuilderModal] = useState(false);

  // Test Lab Chat State (Module 4.5 in mockups)
  const [testMessages, setTestMessages] = useState<
    { role: 'user' | 'assistant'; text: string; time: string }[]
  >([]);
  const [testInput, setTestInput] = useState('');
  const [testBusy, setTestBusy] = useState(false);

  async function sendTestMessage(msg?: string) {
    const toSend = msg || testInput;
    if (!toSend.trim() || testBusy) return;
    if (!resource.data?.agents?.[0]?.id) { setError('Create an assistant in BGOS web first.'); return; }
    setError(null);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTestMessages((prev) => [...prev, { role: 'user', text: toSend.trim(), time: now }]);
    setTestInput('');
    setTestBusy(true);

    try {
      const activeAgent = resource.data?.agents?.[0];
      const endpoint = activeAgent?.id ? `/api/forms/agents/${activeAgent.id}/chat` : '/api/forms/agents/preview/chat';
      const res = await apiRequest<{ reply?: string; response?: string; text?: string }>(endpoint, {
        method: 'POST',
        body: { message: toSend.trim(), history: testMessages.map(m => ({ role: m.role, content: m.text })) },
      });
      const replyText = res.reply || res.response || res.text;
      if (!replyText) throw new Error('The assistant did not return a response. Please try again.');
      setTestMessages((prev) => [
        ...prev,
        { role: 'assistant', text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } catch (e) {
      setError((e as Error).message || 'Unable to reach the assistant.');
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
          compact
          label="＋ Agent"
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
          label="Assistant Chat"
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

          {resource.loading ? <Loading /> : resource.data?.agents?.length ? resource.data.agents.map(agent => (
            <Card key={agent.id}>
              <Text style={ui.heading}>{agent.name}</Text>
              <Text style={ui.body}>{agent.roleTitle || 'Business assistant'}</Text>
              <Text style={ui.caption}>Channel availability is managed in Integrations.</Text>
            </Card>
          )) : !resource.error ? <Empty title="No assistants configured" detail="Create your business assistant in BGOS web." /> : null}
          <Action secondary label="View channel connections" onPress={() => router.push('/(tabs)/integrations')} />

          <Action
            label="Monitor Active Chats in Inbox"
            icon="chat"
            onPress={() => router.push('/(tabs)/inbox')}
          />
          <Action
            secondary
            label="Configure Knowledge Base · Web"
            icon="open-in-new"
            onPress={() => Linking.openURL(getBgosWebUrl('agentStudio')).catch(() => {})}
          />
        </View>
      )}

      {/* TEST LAB SANDBOX VIEW (Module 4.5 in mockups) */}
      {activeTab === 'testlab' && (
        <View style={{ gap: 14 }}>
          <Card style={{ gap: 8 }}>
            <Text style={ui.heading}>Chat with your assistant</Text>
            <Text style={ui.body}>
              This uses your first configured assistant and its live actions. Requests may create bookings or leads.
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
                        color: m.role === 'user' ? colors.brandSoft : colors.brand,
                        marginBottom: 2,
                      }}
                    >
                      {m.role === 'user' ? 'You' : '🤖 AI Assistant'}
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
            label={testBusy ? 'Responding…' : 'Send Message'}
            icon="send"
            disabled={testBusy || !testInput.trim()}
            onPress={() => sendTestMessage()}
          />
        </View>
      )}

      {activeTab === 'performance' && (
        <Card>
          <Text style={ui.heading}>Assistant analytics</Text>
          <Text style={ui.body}>Review conversation performance and activity in BGOS web.</Text>
          <Action label="Open AI Studio · Web" onPress={() => Linking.openURL(getBgosWebUrl('agentStudio')).catch(() => setError('Could not open the browser.'))} />
        </Card>
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
              { num: '5', title: 'Launch', desc: 'Review configuration and publish' },
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
                Linking.openURL(getBgosWebUrl('agentStudio')).catch(() => {});
              }}
            />
            <Action secondary label="Close" onPress={() => setBuilderModal(false)} />
          </Card>
        </Screen>
      </Modal>
    </Screen>
  );
}
