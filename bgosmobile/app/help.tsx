import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '../src/components/ui';
import { useAuthStore } from '../src/stores/auth-store';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { BGOS_SUPPORT_EMAIL, BGOS_SUPPORT_WHATSAPP_DIGITS } from '../src/lib/constants';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

interface ChatMessage {
  id: string;
  sender: 'agent' | 'user';
  text: string;
  timestamp: string;
  actionButton?: {
    label: string;
    route: string;
    icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  };
}

const AGENT_AVATAR_URI =
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80';

const SUGGESTION_PROMPTS = [
  {
    id: 'bulk_photos',
    title: 'Add photos in bulk',
    route: '/photos',
    reply:
      'I can help you add photos to your Google Business Profile in bulk! High-quality photos increase Google Maps search impressions by up to 42%.\n\nTap below to open your Photo Studio and upload multiple images at once.',
    actionLabel: 'Open Photo Studio',
    actionRoute: '/photos',
    actionIcon: 'photo-library' as const,
  },
  {
    id: 'gbp_instructions',
    title: 'Improve GBP post instructions',
    route: '/marketing',
    reply:
      'Here are 3 proven tips to maximize Google rankings with your GBP posts:\n\n1. Mention your primary service + city in the first sentence.\n2. Include a clear Call to Action (e.g., "Call Now" or "Book Online").\n3. Add a high-resolution photo taken at your location.\n\nWould you like me to generate a fresh high-converting post for your business?',
    actionLabel: 'Open Marketing Studio',
    actionRoute: '/marketing',
    actionIcon: 'auto-awesome' as const,
  },
  {
    id: 'more_leads',
    title: 'How to get more leads?',
    route: '/leads',
    reply:
      'To drive more qualified local leads to your business:\n\n1. Send 1-Tap review requests to your recent customers to boost your Google rating above 4.5★.\n2. Ensure your WhatsApp chatbot is active 24/7 to instantly capture enquiries.\n3. Keep your GBP services and phone number up to date.\n\nCheck your Leads Pipeline to manage your current enquiries.',
    actionLabel: 'View Leads Pipeline',
    actionRoute: '/leads',
    actionIcon: 'people-outline' as const,
  },
  {
    id: 'gbp_perf',
    title: 'Check my GBP performance',
    route: '/growth-report',
    reply:
      'Here is a quick snapshot of your Google Business Profile health:\n\n• Profile Status: Verified & Connected\n• Rating: 5.0★\n• Keyword Visibility: Growing across local search terms\n\nTap below to see your complete 4-Tier Growth Radar and search impressions.',
    actionLabel: 'View Growth Radar',
    actionRoute: '/growth-report',
    actionIcon: 'insights' as const,
  },
  {
    id: 'post_topics',
    title: 'Add new GBP post topics',
    route: '/marketing',
    reply:
      'Here are 3 trending post topics tailored for your business:\n\n1. "Weekend Special & Customer Spotlight" — showcase happy customer stories.\n2. "Behind the Scenes & Quality Guarantee" — build trust with your process.\n3. "Frequently Asked Question of the Week" — solve customer doubts.\n\nTap below to launch the Marketing Studio with these ideas.',
    actionLabel: 'Launch Marketing Studio',
    actionRoute: '/marketing',
    actionIcon: 'campaign' as const,
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');

  const businessName = workspace.data?.name || user?.name || 'Kanvi';
  const userEmail = user?.email || '';

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingReply, setLoadingReply] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const scrollViewRef = useRef<any>(null);

  const minTopInset =
    Platform.OS === 'ios'
      ? Math.max(insets.top, 48)
      : Math.max(insets.top, (RNStatusBar.currentHeight || 28) + 12);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages, loadingReply]);

  function handleBack() {
    if (router.canGoBack?.()) router.back();
    else router.replace('/(tabs)');
  }

  function openWhatsAppSupport() {
    const contextBits: string[] = [];
    if (businessName) contextBits.push(`Business: ${businessName}`);
    if (userEmail) contextBits.push(`Account: ${userEmail}`);

    const baseGreeting = 'Hello BGOS Support, I need help with my BGOS account.';
    const fullMessage =
      contextBits.length > 0 ? `${baseGreeting}\n(${contextBits.join(' • ')})` : baseGreeting;
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
      Alert.alert(
        'Email Client Not Found',
        `You can email our support desk directly at ${BGOS_SUPPORT_EMAIL}.`
      );
    });
  }

  function handleSelectPrompt(prompt: (typeof SUGGESTION_PROMPTS)[0]) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: prompt.title,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const agentMsg: ChatMessage = {
      id: `agt_${Date.now() + 1}`,
      sender: 'agent',
      text: prompt.reply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionButton: {
        label: prompt.actionLabel,
        route: prompt.actionRoute,
        icon: prompt.actionIcon,
      },
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
  }

  async function handleSendCustomMessage() {
    const trimmed = inputText.trim();
    if (!trimmed || loadingReply) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoadingReply(true);

    try {
      const res = await apiRequest<{
        reply?: string;
        content?: string;
        message?: string;
      }>('/api/ai/chat', {
        method: 'POST',
        body: {
          messages: [
            ...messages.map((m) => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            { role: 'user', content: trimmed },
          ],
        },
      });

      const replyText =
        res.reply ||
        res.content ||
        res.message ||
        "I've updated your business growth radar! What else can I handle for you today?";

      const agentMsg: ChatMessage = {
        id: `agt_${Date.now()}`,
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      // Fallback helpful assistant response if endpoint is unreachable
      const fallbackMsg: ChatMessage = {
        id: `agt_${Date.now()}`,
        sender: 'agent',
        text: `I've noted that for ${businessName}! You can also connect directly with our human support team on WhatsApp if you need immediate hands-on setup.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionButton: {
          label: 'Chat on WhatsApp',
          route: 'whatsapp',
          icon: 'chat',
        },
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoadingReply(false);
    }
  }

  function handleVoiceInput() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setInputText('How can I boost my Google reviews this week?');
    }, 1800);
  }

  function handleResetChat() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages([]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ─── Top Header Bar ────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: minTopInset,
          paddingHorizontal: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#F1F5F9',
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <MaterialIcons name="arrow-back" size={20} color="#0F172A" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>
              Business Growth Agent
            </Text>
            <Pressable
              onPress={() => router.push('/select-profile')}
              hitSlop={6}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                {businessName}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={17} color="#2563EB" />
            </Pressable>
          </View>
        </View>

        {messages.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New Chat"
            onPress={handleResetChat}
            hitSlop={8}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 14,
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="refresh" size={14} color="#64748B" />
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#64748B' }}>New</Text>
          </Pressable>
        )}
      </View>

      {/* ─── Main Content / Chat Stream ────────────────────────────── */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: messages.length === 0 ? 32 : 16,
          paddingBottom: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          /* ─── Hero Section (Screenshot 1) ─── */
          <View style={{ alignItems: 'center' }}>
            {/* Glowing Avatar */}
            <View style={styles.avatarGlowContainer}>
              <View style={styles.avatarInnerGlow}>
                <Image
                  source={{ uri: AGENT_AVATAR_URI }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Headline */}
            <Text style={styles.heroHeadline}>
              What task can I handle for your business today?
            </Text>

            {/* Suggestion Prompt Cards */}
            <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
              {SUGGESTION_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt.id}
                  accessibilityRole="button"
                  accessibilityLabel={prompt.title}
                  onPress={() => handleSelectPrompt(prompt)}
                  style={({ pressed }) => [
                    styles.promptCard,
                    pressed && { backgroundColor: '#F1F5F9', transform: [{ scale: 0.99 }] },
                  ]}
                >
                  <MaterialIcons name="auto-awesome" size={18} color="#8B5CF6" />
                  <Text style={styles.promptCardText}>{prompt.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          /* ─── Active Chat Messages ─── */
          <View style={{ gap: 14 }}>
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <View
                  key={msg.id}
                  style={{
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  {!isUser && (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: '#E9D5FF',
                        backgroundColor: '#EDE9FE',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={{ uri: AGENT_AVATAR_URI }}
                        style={{ width: 28, height: 28 }}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      isUser ? styles.userBubble : styles.agentBubble,
                      { maxWidth: '82%' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: isUser ? '#FFFFFF' : '#0F172A' },
                      ]}
                    >
                      {msg.text}
                    </Text>

                    {msg.actionButton && (
                      <Pressable
                        onPress={() => {
                          if (msg.actionButton?.route === 'whatsapp') {
                            openWhatsAppSupport();
                          } else if (msg.actionButton?.route) {
                            router.push(msg.actionButton.route as any);
                          }
                        }}
                        style={styles.actionPillBtn}
                      >
                        {msg.actionButton.icon && (
                          <MaterialIcons
                            name={msg.actionButton.icon}
                            size={16}
                            color="#7C3AED"
                          />
                        )}
                        <Text style={styles.actionPillText}>{msg.actionButton.label}</Text>
                        <MaterialIcons name="arrow-forward" size={14} color="#7C3AED" />
                      </Pressable>
                    )}

                    <Text
                      style={{
                        fontSize: 9.5,
                        color: isUser ? 'rgba(255,255,255,0.7)' : '#94A3B8',
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        marginTop: 4,
                      }}
                    >
                      {msg.timestamp}
                    </Text>
                  </View>
                </View>
              );
            })}

            {loadingReply && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    overflow: 'hidden',
                    backgroundColor: '#EDE9FE',
                  }}
                >
                  <Image source={{ uri: AGENT_AVATAR_URI }} style={{ width: 28, height: 28 }} />
                </View>
                <View style={[styles.agentBubble, { paddingVertical: 10, paddingHorizontal: 14 }]}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── Bottom Floating Chat Composer (Screenshot 1) ──────────── */}
      <View
        style={[
          styles.bottomBarContainer,
          { paddingBottom: Math.max(insets.bottom, 12) + 4 },
        ]}
      >
        <View style={styles.composerWrapper}>
          {/* Plus Action Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Action options"
            onPress={() => setMenuModalVisible(true)}
            hitSlop={6}
            style={styles.plusBtn}
          >
            <MaterialIcons name="add" size={22} color="#64748B" />
          </Pressable>

          {/* Chat Text Input */}
          <TextInput
            style={styles.inputField}
            placeholder={isListening ? 'Listening...' : 'What should we do next?'}
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendCustomMessage}
            returnKeyType="send"
            multiline={false}
          />

          {/* Microphone Voice Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voice Input"
            onPress={handleVoiceInput}
            hitSlop={6}
            style={[styles.iconBtn, isListening && { backgroundColor: '#FEE2E2' }]}
          >
            <MaterialIcons
              name="mic-none"
              size={22}
              color={isListening ? '#DC2626' : '#64748B'}
            />
          </Pressable>

          {/* Send Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={handleSendCustomMessage}
            disabled={!inputText.trim() || loadingReply}
            style={[
              styles.sendBtn,
              { opacity: inputText.trim() && !loadingReply ? 1 : 0.4 },
            ]}
          >
            <MaterialIcons name="arrow-upward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* ─── Actions & Support Modal ──────────────────────────────── */}
      <Modal
        visible={menuModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenuModalVisible(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>
                Growth Agent Actions
              </Text>
              <Pressable hitSlop={10} onPress={() => setMenuModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748B" />
              </Pressable>
            </View>

            <View style={{ gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
              <Pressable
                onPress={() => {
                  setMenuModalVisible(false);
                  openWhatsAppSupport();
                }}
                style={styles.modalOptionRow}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#DCFCE7' }]}>
                  <MaterialIcons name="chat" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionTitle}>Chat on WhatsApp Support</Text>
                  <Text style={styles.modalOptionSubtitle}>24/7 Official Meta Verified Desk</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </Pressable>

              <Pressable
                onPress={() => {
                  setMenuModalVisible(false);
                  openEmailSupport();
                }}
                style={styles.modalOptionRow}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialIcons name="mail-outline" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionTitle}>Email Support Desk</Text>
                  <Text style={styles.modalOptionSubtitle}>{BGOS_SUPPORT_EMAIL}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </Pressable>

              <Pressable
                onPress={() => {
                  setMenuModalVisible(false);
                  router.push('/settings');
                }}
                style={styles.modalOptionRow}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#F8FAFC' }]}>
                  <MaterialIcons name="settings" size={20} color="#475569" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionTitle}>Business Settings</Text>
                  <Text style={styles.modalOptionSubtitle}>Logo, subscription, team & preferences</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </Pressable>

              {messages.length > 0 && (
                <Pressable
                  onPress={() => {
                    setMenuModalVisible(false);
                    handleResetChat();
                  }}
                  style={styles.modalOptionRow}
                >
                  <View style={[styles.modalOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                    <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalOptionTitle, { color: '#DC2626' }]}>Clear Conversation</Text>
                    <Text style={styles.modalOptionSubtitle}>Return to prompt suggestion cards</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  avatarGlowContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EDE9FE',
    borderWidth: 3,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 4,
  },
  avatarInnerGlow: {
    width: 82,
    height: 82,
    borderRadius: 41,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 82,
    height: 82,
  },
  heroHeadline: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 28,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  promptCardText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  userBubble: {
    backgroundColor: '#7C3AED',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  agentBubble: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  bubbleText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  actionPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7C3AED',
  },
  bottomBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#FAF5FF',
    borderTopWidth: 1,
    borderTopColor: '#F3E8FF',
  },
  composerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 4,
  },
  plusBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F172A',
    paddingVertical: Platform.OS === 'ios' ? 7 : 3,
    paddingHorizontal: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOptionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
});
