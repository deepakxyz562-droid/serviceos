import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  TextInput,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

interface Message {
  id: string;
  sender: 'ai' | 'visitor' | 'agent' | 'system' | 'note';
  text?: string;
  time?: string;
  avatarText?: string;
  orderCard?: {
    id: string;
    total: string;
    time: string;
  };
  productCard?: {
    title: string;
    imageUrl: string;
  };
  noteData?: {
    title: string;
    bullets: string[];
    footer: string;
  };
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm1',
    sender: 'system',
    orderCard: {
      id: '#863',
      total: '$2,799.00',
      time: 'Custom · 07:30 PM',
    },
  },
  {
    id: 'm2',
    sender: 'agent',
    text: "Got everything I need. I'll email you the order summary.",
    time: '07:30 PM',
    avatarText: 'D',
  },
  {
    id: 'm3',
    sender: 'visitor',
    text: 'Thanks!',
    time: '07:30 PM',
    avatarText: 'EC',
  },
  {
    id: 'm4',
    sender: 'system',
    text: 'Chat archived due to 15 minutes of inactivity · 12:55 PM',
  },
  {
    id: 'm5',
    sender: 'note',
    noteData: {
      title: 'E-bike Purchase',
      bullets: [
        'Customer choosing first e-bike',
        'Rides in city and gravel',
        'Request for custom fit',
        'Agent connects with Laura for fitting',
      ],
      footer: 'Previous thread summary · Internal note · 12:55 PM',
    },
  },
  {
    id: 'm6',
    sender: 'system',
    text: 'Reopened - by agent · 06:30 PM',
  },
];

const CANNED_REPLIES = [
  "I'm still on it. Please bear with me.",
  "Give me a moment, I'll check that for you.",
  "Would you like me to book an appointment?",
  "Our support hours are 9 AM to 6 PM Monday to Friday.",
];

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputMode, setInputMode] = useState<'message' | 'note'>('message');
  const [inputText, setInputText] = useState('');
  const [cannedModalVisible, setCannedModalVisible] = useState(false);
  const [isAiPaused, setIsAiPaused] = useState(true);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    await hapticFeedback.light();

    const newMsg: Message = {
      id: `m_${Date.now()}`,
      sender: inputMode === 'note' ? 'note' : 'agent',
      text: inputMode === 'message' ? inputText.trim() : undefined,
      time: 'Just now',
      avatarText: 'D',
      noteData:
        inputMode === 'note'
          ? {
              title: 'Internal Note',
              bullets: [inputText.trim()],
              footer: `Added by agent · Just now`,
            }
          : undefined,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  const handleSelectCanned = (reply: string) => {
    setInputText(reply);
    setCannedModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header (matches 18.35.51 (2).jpeg) */}
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
            <Text style={styles.customerAvatarText}>EC</Text>
          </View>
          <View>
            <Text style={styles.customerName}>Example Customer</Text>
            <Text style={styles.customerStatus}>Left website</Text>
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
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              hapticFeedback.light();
              Alert.alert('Chat Options', 'Options for Example Customer', [
                {
                  text: isAiPaused ? 'Resume AI Agent' : 'Pause AI Agent',
                  onPress: () => setIsAiPaused(!isAiPaused),
                },
                { text: 'Assign Chat' },
                { text: 'Close Chat', style: 'destructive' },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
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
          onPress={() => {
            hapticFeedback.medium();
            setIsAiPaused(!isAiPaused);
          }}
        >
          <Text style={styles.aiTogglePillText}>{isAiPaused ? 'Resume AI' : 'Take Over'}</Text>
        </TouchableOpacity>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((item) => {
          if (item.sender === 'system') {
            if (item.orderCard) {
              return (
                <View key={item.id} style={styles.orderEventWrap}>
                  <View style={styles.orderEventHeader}>
                    <MaterialIcons name="local-mall" size={16} color="#16a34a" style={{ marginRight: 6 }} />
                    <Text style={styles.orderEventTitle}>
                      Order {item.orderCard.id} placed. Total: {item.orderCard.total}
                    </Text>
                  </View>
                  <Text style={styles.orderEventTime}>{item.orderCard.time}</Text>
                  <TouchableOpacity
                    style={styles.viewOrderBtn}
                    onPress={() => Alert.alert('Order #863', 'Total: $2,799.00\nCustomer: Example Customer')}
                  >
                    <Text style={styles.viewOrderBtnText}>View order</Text>
                  </TouchableOpacity>
                </View>
              );
            }
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
                  <Text style={styles.agentAvatarText}>{item.avatarText || 'D'}</Text>
                </View>
              </View>
            );
          }

          // Visitor Message
          return (
            <View key={item.id} style={styles.visitorMsgRow}>
              <View style={styles.visitorAvatarCircle}>
                <Text style={styles.visitorAvatarText}>{item.avatarText || 'EC'}</Text>
              </View>
              <View style={styles.visitorBubble}>
                <Text style={styles.visitorMsgText}>{item.text}</Text>
                <Text style={styles.visitorTimeText}>{item.time}</Text>
              </View>
            </View>
          );
        })}

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

      {/* Bottom Dual Mode Input Box (matches 18.35.51 (2).jpeg) */}
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
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.4 }]}
            disabled={!inputText.trim()}
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
              <Text style={styles.sheetTitle}>Canned Responses (#)</Text>
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
  orderEventWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  orderEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderEventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  orderEventTime: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  viewOrderBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  viewOrderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
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
