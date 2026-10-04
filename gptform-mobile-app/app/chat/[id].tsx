import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

// ── UI message shape (preserves the existing layout's variants) ──────────────
interface Message {
  id: string;
  sender: 'ai' | 'visitor' | 'agent' | 'system' | 'note';
  text?: string;
  time?: string;
  avatarText?: string;
  noteData?: {
    title: string;
    bullets: string[];
    footer: string;
  };
}

// ── Backend message shape (from /api/chat/sessions/[id]/messages) ────────────
interface ApiMessage {
  id: string;
  sessionId: string;
  senderType: 'visitor' | 'admin' | 'system' | 'agent' | string;
  senderName?: string | null;
  body: string;
  createdAt: string;
  readAt?: string | null;
}

interface ApiSession {
  id: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  visitorEmail?: string | null;
  status: string;
}

const CANNED_REPLIES = [
  "I'm still on it. Please bear with me.",
  "Give me a moment, I'll check that for you.",
  "Would you like me to book an appointment?",
  "Our support hours are 9 AM to 6 PM Monday to Friday.",
];

const initialsFrom = (name?: string | null, fallback = 'V'): string => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatTime = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const mapApiMessage = (m: ApiMessage): Message => {
  if (m.senderType === 'system') {
    return {
      id: m.id,
      sender: 'system',
      text: m.body,
      time: formatTime(m.createdAt),
    };
  }
  if (m.senderType === 'admin') {
    return {
      id: m.id,
      sender: 'agent',
      text: m.body,
      time: formatTime(m.createdAt),
      avatarText: initialsFrom(m.senderName, 'A'),
    };
  }
  // visitor (and any unknown sender falls back to visitor bubble)
  return {
    id: m.id,
    sender: 'visitor',
    text: m.body,
    time: formatTime(m.createdAt),
    avatarText: 'V',
  };
};

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(id) ? id[0] : id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMode, setInputMode] = useState<'message' | 'note'>('message');
  const [inputText, setInputText] = useState('');
  const [cannedModalVisible, setCannedModalVisible] = useState(false);
  // isAiPaused === true  → agent has taken over (AI paused, session claimed)
  // isAiPaused === false → AI is actively responding
  const [isAiPaused, setIsAiPaused] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [visitorName, setVisitorName] = useState<string>('Visitor');

  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [msgRes, sessRes] = await Promise.all([
        apiRequest<{ messages: ApiMessage[] }>(API_PATHS.sessionMessages(sessionId)),
        apiRequest<{ sessions: ApiSession[] }>(API_PATHS.sessions, {
          params: { status: 'all' },
        }).catch(() => null),
      ]);

      setMessages((msgRes.messages || []).map(mapApiMessage));

      if (sessRes?.sessions) {
        const current = sessRes.sessions.find((s) => s.id === sessionId);
        if (current) {
          if (current.visitorName) setVisitorName(current.visitorName);
          // 'claimed' means an agent has taken over → AI is paused
          setIsAiPaused(current.status === 'claimed');
        }
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || `Failed to load chat (${err.statusCode})`
          : 'Failed to load chat';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    await hapticFeedback.light();

    // Note mode stays local (internal note, not delivered to visitor).
    if (inputMode === 'note') {
      const noteMsg: Message = {
        id: `note_${Date.now()}`,
        sender: 'note',
        noteData: {
          title: 'Internal Note',
          bullets: [text],
          footer: `Added by agent · Just now`,
        },
      };
      setMessages((prev) => [...prev, noteMsg]);
      setInputText('');
      return;
    }

    const tempId = `m_${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      sender: 'agent',
      text,
      time: 'Just now',
      avatarText: 'A',
    };
    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setSending(true);

    try {
      const res = await apiRequest<{ message: ApiMessage }>(
        API_PATHS.sessionMessages(sessionId!),
        { method: 'POST', body: { body: text } }
      );
      // Replace optimistic message with the canonical one returned by the API.
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? mapApiMessage(res.message) : m))
      );
      // Sending an admin reply implicitly claims the session → AI paused.
      setIsAiPaused(true);
    } catch (err) {
      // Revert optimistic append on failure.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      const message =
        err instanceof ApiError
          ? err.message || 'Failed to send message'
          : 'Failed to send message';
      Alert.alert('Send failed', message);
    } finally {
      setSending(false);
    }
  };

  const handleSelectCanned = (reply: string) => {
    setInputText(reply);
    setCannedModalVisible(false);
  };

  const handleTakeOver = async () => {
    if (!sessionId) return;
    await hapticFeedback.medium();
    try {
      await apiRequest(API_PATHS.claimSession(sessionId), { method: 'POST' });
      setIsAiPaused(true);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to take over chat';
      Alert.alert('Action failed', message);
    }
  };

  const handleResumeAi = async () => {
    if (!sessionId) return;
    await hapticFeedback.medium();
    try {
      await apiRequest(API_PATHS.claimSession(sessionId) + '?action=hand_back_to_bot', {
        method: 'POST',
      });
      setIsAiPaused(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to resume AI';
      Alert.alert('Action failed', message);
    }
  };

  const handleAssignChat = async () => {
    // Wired to claim for now (assigns to the current agent).
    await handleTakeOver();
  };

  const handleCloseChat = async () => {
    if (!sessionId || closing) return;
    setClosing(true);
    try {
      await apiRequest(API_PATHS.closeSession(sessionId), { method: 'POST' });
      await hapticFeedback.success();
      router.back();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to close chat';
      Alert.alert('Close failed', message);
    } finally {
      setClosing(false);
    }
  };

  const showChatOptions = () => {
    hapticFeedback.light();
    Alert.alert('Chat Options', `Options for ${visitorName}`, [
      {
        text: isAiPaused ? 'Resume AI Agent' : 'Pause AI Agent',
        onPress: () => (isAiPaused ? handleResumeAi() : handleTakeOver()),
      },
      { text: 'Assign Chat', onPress: handleAssignChat },
      { text: 'Close Chat', style: 'destructive', onPress: handleCloseChat },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const avatarInitials = initialsFrom(visitorName, 'V');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerCustomerWrap}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>{avatarInitials}</Text>
          </View>
          <View>
            <Text style={styles.customerName} numberOfLines={1}>
              {visitorName}
            </Text>
            <Text style={styles.customerStatus}>
              {loading ? 'Loading…' : error ? 'Failed to load' : 'Live chat'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActionsRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              hapticFeedback.light();
              Alert.alert('Tickets', 'Create ticket from this conversation?');
            }}
          >
            <MaterialIcons name="note-add" size={22} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={showChatOptions}>
            <MaterialIcons name="more-vert" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Takeover Status Pill */}
      <View style={styles.aiStatusBanner}>
        <View style={styles.aiStatusDot} />
        <Text style={styles.aiStatusText}>
          {isAiPaused
            ? 'Operator Takeover Active — AI is paused for this chat'
            : 'AI Agent is actively responding to visitor'}
        </Text>
        <TouchableOpacity
          style={styles.aiTogglePill}
          onPress={isAiPaused ? handleResumeAi : handleTakeOver}
        >
          <Text style={styles.aiTogglePillText}>
            {isAiPaused ? 'Resume AI' : 'Take Over'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.stateText}>Loading messages…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMessages}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.stateWrap}>
            <Text style={styles.stateText}>No messages yet. Say hello 👋</Text>
          </View>
        ) : (
          messages.map((item) => {
            if (item.sender === 'system') {
              return (
                <View key={item.id} style={styles.systemTimelineRow}>
                  <Text style={styles.systemTimelineText}>{item.text}</Text>
                </View>
              );
            }

            if (item.sender === 'note' && item.noteData) {
              return (
                <View key={item.id} style={styles.noteCardWrap}>
                  <View style={styles.noteCard}>
                    <View style={styles.noteTitleRow}>
                      <MaterialIcons name="reply" size={18} color="#b45309" style={{ transform: [{ scaleX: -1 }] }} />
                      <Text style={styles.noteTitleText}>{item.noteData.title}</Text>
                    </View>
                    {item.noteData.bullets.map((b, idx) => (
                      <Text key={idx} style={styles.noteBulletText}>
                        • {b}
                      </Text>
                    ))}
                    <Text style={styles.noteFooterText}>{item.noteData.footer}</Text>
                  </View>
                  <View style={styles.noteAvatarCircle}>
                    <MaterialIcons name="auto-awesome" size={14} color="#a855f7" />
                  </View>
                </View>
              );
            }

            if (item.sender === 'agent') {
              return (
                <View key={item.id} style={styles.agentMsgRow}>
                  <View style={styles.agentBubble}>
                    <Text style={styles.agentMsgText}>{item.text}</Text>
                    <View style={styles.msgMetaRow}>
                      <Text style={styles.agentTimeText}>{item.time}</Text>
                      <MaterialIcons name="done-all" size={14} color="#1e293b" />
                    </View>
                  </View>
                  <View style={styles.agentAvatarCircle}>
                    <Text style={styles.agentAvatarText}>{item.avatarText || 'A'}</Text>
                  </View>
                </View>
              );
            }

            // Visitor Message
            return (
              <View key={item.id} style={styles.visitorMsgRow}>
                <View style={styles.visitorAvatarCircle}>
                  <Text style={styles.visitorAvatarText}>{item.avatarText || 'V'}</Text>
                </View>
                <View style={styles.visitorBubble}>
                  <Text style={styles.visitorMsgText}>{item.text}</Text>
                  <Text style={styles.visitorTimeText}>{item.time}</Text>
                </View>
              </View>
            );
          })
        )}

        {/* Tags Row */}
        <View style={styles.tagsContainer}>
          <Text style={styles.tagsLabel}>Tags</Text>
          <View style={styles.salesTag}>
            <Text style={styles.salesTagText}>sales</Text>
          </View>
        </View>
      </ScrollView>

      {/* Canned Quick Replies Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cannedStrip}
      >
        {CANNED_REPLIES.map((reply, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.cannedPill}
            onPress={() => handleSelectCanned(reply)}
            activeOpacity={0.7}
          >
            <Text style={styles.cannedPillText} numberOfLines={1}>
              {reply}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Dual Mode Input Box */}
      <View style={styles.bottomBar}>
        {/* Message vs Note Switcher */}
        <View style={styles.modeTabsRow}>
          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'message' && styles.modeTabActive]}
            onPress={() => setInputMode('message')}
          >
            <Text style={[styles.modeTabText, inputMode === 'message' && styles.modeTabTextActive]}>
              Message
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, inputMode === 'note' && styles.modeTabActive]}
            onPress={() => setInputMode('note')}
          >
            <Text style={[styles.modeTabText, inputMode === 'note' && styles.modeTabTextActive]}>
              Note
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input & Toolbar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputToolbar}>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => Alert.alert('Attachment', 'Select photo or file')}
            >
              <MaterialIcons name="attach-file" size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => Alert.alert('Tag', 'Add tag to customer')}
            >
              <MaterialIcons name="local-offer" size={18} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setCannedModalVisible(true)}
            >
              <MaterialIcons name="tag" size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.mainInput}
            placeholder={inputMode === 'message' ? 'Type a message...' : 'Add private internal note...'}
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && { opacity: 0.4 }]}
            disabled={!inputText.trim() || sending}
            onPress={sendMessage}
          >
            <MaterialIcons name="arrow-upward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Canned Responses Sheet */}
      <Modal
        visible={cannedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCannedModalVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Canned Responses ({CANNED_REPLIES.length})</Text>
              <TouchableOpacity onPress={() => setCannedModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              {CANNED_REPLIES.map((reply, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.cannedOptionRow}
                  onPress={() => handleSelectCanned(reply)}
                >
                  <MaterialIcons name="chat-bubble-outline" size={18} color="#2563eb" style={{ marginRight: 12 }} />
                  <Text style={styles.cannedOptionText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBackBtn: {
    padding: 6,
    marginRight: 4,
  },
  headerCustomerWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  customerStatus: {
    fontSize: 11,
    color: '#64748b',
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    padding: 6,
  },
  aiStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  aiStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginRight: 8,
  },
  aiStatusText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#1e40af',
  },
  aiTogglePill: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiTogglePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  stateText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  systemTimelineRow: {
    alignItems: 'center',
    marginVertical: 14,
  },
  systemTimelineText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  noteCardWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    marginVertical: 10,
  },
  noteCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 14,
    maxWidth: '82%',
    marginRight: 8,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noteTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  noteBulletText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 18,
  },
  noteFooterText: {
    fontSize: 10,
    color: '#b45309',
    marginTop: 8,
  },
  noteAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e1b4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentMsgRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  agentBubble: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
    maxWidth: '75%',
    marginRight: 8,
  },
  agentMsgText: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  msgMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  agentTimeText: {
    fontSize: 10,
    color: '#64748b',
  },
  agentAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ca8a04',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  visitorMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 6,
  },
  visitorAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  visitorAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  visitorBubble: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: '75%',
  },
  visitorMsgText: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  visitorTimeText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'right',
  },
  tagsContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  tagsLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  salesTag: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  salesTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  cannedStrip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  cannedPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    maxWidth: 200,
  },
  cannedPillText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  modeTabsRow: {
    flexDirection: 'row',
    gap: 20,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  modeTab: {
    paddingBottom: 4,
  },
  modeTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modeTabTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 6,
  },
  toolBtn: {
    padding: 6,
  },
  mainInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  cannedOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  cannedOptionText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
});
