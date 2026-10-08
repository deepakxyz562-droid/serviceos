import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { apiRequest } from '../../src/lib/api';
import { API_PATHS } from '../../src/lib/constants';

interface ChatSession {
  id: string;
  customerName?: string;
  customerPhone?: string;
  channel?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  status: 'OPEN' | 'CLOSED' | 'BOT';
  unreadCount?: number;
}

interface ChatMessage {
  id: string;
  sender: 'CUSTOMER' | 'AGENT' | 'BOT';
  text: string;
  createdAt: string;
}

export default function InboxScreen() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'BOT'>('ALL');

  const fetchSessions = useCallback(async () => {
    try {
      const res = await apiRequest<{ conversations: ChatSession[] }>(API_PATHS.inboxSessions);
      setSessions(res?.conversations || []);
    } catch {
      // Fallback demo state if offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const openSessionDetail = async (session: ChatSession) => {
    setSelectedSession(session);
    try {
      const res = await apiRequest<{ messages: ChatMessage[] }>(API_PATHS.inboxMessages(session.id));
      setMessages(res?.messages || []);
    } catch {
      setMessages([
        { id: '1', sender: 'CUSTOMER', text: 'Hello, I need pricing information for your service.', createdAt: new Date().toISOString() },
        { id: '2', sender: 'BOT', text: 'Hi! Our packages start at $49/mo. Would you like to schedule a demo?', createdAt: new Date().toISOString() },
      ]);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedSession) return;
    setSending(true);
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'AGENT',
      text: replyText.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setReplyText('');

    try {
      await apiRequest(API_PATHS.sendReply(selectedSession.id), {
        method: 'POST',
        body: { text: newMsg.text },
      });
    } catch {} finally {
      setSending(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'ALL') return true;
    return s.status === filter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Inbox</Text>
          <Text style={styles.subtitle}>Real-time visitor chat & WhatsApp leads</Text>
        </View>
        <TouchableOpacity onPress={fetchSessions} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={20} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'OPEN', 'BOT'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            style={[styles.filterChip, filter === tab && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
              {tab === 'ALL' ? 'All Chats' : tab === 'OPEN' ? 'Needs Human' : 'AI Active'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : filteredSessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="forum" size={48} color="#334155" />
          <Text style={styles.emptyTitle}>No active conversations</Text>
          <Text style={styles.emptySub}>When visitors chat on your site or WhatsApp, they will appear here in real-time.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions(); }} tintColor="#0ea5e9" />
          }
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => openSessionDetail(item)}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.customerName || 'V')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{item.customerName || 'Website Visitor'}</Text>
                  <Text style={styles.cardTime}>Just now</Text>
                </View>
                <Text style={styles.cardMessage} numberOfLines={1}>
                  {item.lastMessage || 'Conversation started'}
                </Text>
              </View>
              <View style={[styles.statusDot, item.status === 'BOT' ? styles.statusBot : styles.statusOpen]} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Chat Thread Modal */}
      <Modal visible={!!selectedSession} animationType="slide" onRequestClose={() => setSelectedSession(null)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedSession(null)} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.modalTitle}>{selectedSession?.customerName || 'Website Visitor'}</Text>
              <Text style={styles.modalSub}>{selectedSession?.channel || 'Website Widget'}</Text>
            </View>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatList}
            renderItem={({ item }) => {
              const isMe = item.sender === 'AGENT';
              return (
                <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                  <Text style={[styles.bubbleText, isMe ? styles.bubbleTextRight : styles.bubbleTextLeft]}>
                    {item.text}
                  </Text>
                </View>
              );
            }}
          />

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.replyBox}>
              <TextInput
                style={styles.replyInput}
                placeholder="Type your reply as human agent..."
                placeholderTextColor="#64748b"
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity onPress={handleSendReply} disabled={sending} style={styles.sendBtn}>
                <MaterialIcons name="send" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#ffffff' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(14, 165, 233, 0.1)', justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterChipActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  filterTextActive: { color: '#ffffff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#0369a1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  cardTime: { fontSize: 11, color: '#64748b' },
  cardMessage: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  statusOpen: { backgroundColor: '#22c55e' },
  statusBot: { backgroundColor: '#0ea5e9' },
  modalSafe: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { padding: 4 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  modalSub: { fontSize: 12, color: '#94a3b8' },
  chatList: { padding: 16, gap: 10 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
  bubbleRight: { alignSelf: 'flex-end', backgroundColor: '#0284c7', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14 },
  bubbleTextLeft: { color: '#f8fafc' },
  bubbleTextRight: { color: '#ffffff' },
  replyBox: { flexDirection: 'row', padding: 12, backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155', alignItems: 'center' },
  replyInput: { flex: 1, height: 44, backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, color: '#ffffff', fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});
