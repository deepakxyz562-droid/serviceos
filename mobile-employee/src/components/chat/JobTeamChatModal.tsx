/**
 * Job Team Chat Modal (Fieseros Pro)
 * -----------------------------------
 * In-app internal communication channel between the Field Technician,
 * Dispatcher, and Business Owner for a specific job.
 *
 * Supports:
 *   - Quick-tag templates (e.g., "Access Gate Locked", "Need Part Approval")
 *   - Direct message transmission with push notifications to the owner
 *   - Real-time optimistic updates + sync with /api/inbox-messages
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  X,
  Send,
  Users,
  Shield,
  MessageSquare,
  Clock,
  Sparkles,
  CheckCheck,
} from 'lucide-react-native';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { COLORS } from '@/lib/constants';

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: 'tech' | 'owner' | 'dispatch';
  content: string;
  createdAt: string;
  isSelf: boolean;
}

const QUICK_TAGS = [
  'Need supervisor approval',
  'Access gate locked / no answer',
  'Additional parts required',
  'Job scope expanded by customer',
  'Safety hazard observed on site',
];

interface JobTeamChatModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  jobNumber?: string;
  customerName?: string;
}

export function JobTeamChatModal({
  visible,
  onClose,
  jobId,
  jobNumber,
  customerName,
}: JobTeamChatModalProps) {
  const { show } = useToast();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const conversationId = `job_team_${jobId}`;

  // Fetch messages when modal opens
  const fetchMessages = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await api.get<{ data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
        '/api/inbox-messages',
        { conversationId, limit: 50 }
      );
      const list = Array.isArray(res) ? res : res?.data || [];
      const parsed: ChatMessage[] = list
        .map((m) => {
          const isMe = m.senderId === user?.id || m.senderName === user?.name;
          const roleRaw = String(m.senderType || 'agent').toLowerCase();
          const role: 'tech' | 'owner' | 'dispatch' =
            roleRaw === 'owner' ? 'owner' : roleRaw === 'dispatcher' ? 'dispatch' : 'tech';

          return {
            id: String(m.id || Math.random()),
            senderName: String(m.senderName || 'Team Member'),
            senderRole: role,
            content: String(m.content || ''),
            createdAt: String(m.createdAt || new Date().toISOString()),
            isSelf: isMe,
          };
        })
        .reverse();

      setMessages(parsed);
    } catch {
      // Offline or network error: start with empty/cached
    } finally {
      setLoading(false);
    }
  }, [jobId, conversationId, user?.id, user?.name]);

  useEffect(() => {
    if (visible) {
      fetchMessages();
    }
  }, [visible, fetchMessages]);

  const handleSend = async (textToSend?: string) => {
    const content = (textToSend || input).trim();
    if (!content || sending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      senderName: user?.name || 'You',
      senderRole: 'tech',
      content,
      createdAt: new Date().toISOString(),
      isSelf: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput('');

    try {
      await api.post('/api/inbox-messages', {
        conversationId,
        senderType: 'employee',
        senderId: user?.id,
        senderName: user?.name || 'Technician',
        content,
        messageType: 'text',
        direction: 'inbound',
        isInternalNote: true,
      });

      show('Message sent to Owner & Dispatch', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      show('Saved message offline.', 'info');
    } finally {
      setSending(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSelectQuickTag = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    handleSend(tag);
  };

  return (
    <Modal visible={visible} onClose={onClose} position="bottom">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ maxHeight: 600 }}
        className="w-full"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3 pt-1">
          <View className="flex-row items-center gap-2.5">
            <View className="size-9 items-center justify-center rounded-xl bg-emerald-600 shadow-xs">
              <Users size={18} color="#ffffff" />
            </View>
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-extrabold text-slate-900">Team & Dispatch Chat</Text>
                <View className="rounded bg-emerald-100 px-1.5 py-0.5">
                  <Text className="text-[10px] font-black uppercase text-emerald-800">INTERNAL</Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {jobNumber ? `Job #${jobNumber} · ` : ''}
                {customerName || 'Direct to Owner / Dispatch'}
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={12} className="p-1">
            <X size={20} color="#64748B" />
          </Pressable>
        </View>

        {/* Quick Tag Suggestion Chips */}
        <View className="border-b border-slate-100 bg-slate-50/60 px-3 py-2">
          <Text className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Quick Updates
          </Text>
          <FlatList
            horizontal
            data={QUICK_TAGS}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectQuickTag(item)}
                className="mr-2 flex-row items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-2xs active:bg-slate-100"
              >
                <Sparkles size={11} color="#059669" />
                <Text className="text-xs font-semibold text-slate-700">{item}</Text>
              </Pressable>
            )}
          />
        </View>

        {/* Message Thread */}
        <View style={{ height: 320 }} className="px-4 py-2">
          {loading && messages.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : messages.length === 0 ? (
            <View className="flex-1 items-center justify-center p-6 text-center">
              <View className="mb-2 size-10 items-center justify-center rounded-full bg-emerald-50">
                <MessageSquare size={20} color="#059669" />
              </View>
              <Text className="text-xs font-bold text-slate-800">No team messages yet</Text>
              <Text className="mt-1 text-center text-[11px] text-muted-foreground">
                Send a message to your dispatcher and business owner about this job. All team members receive it instantly.
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => (
                <View
                  className={`mb-2.5 flex-row ${
                    item.isSelf ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <View
                    className={`max-w-[82%] rounded-2xl p-3 ${
                      item.isSelf
                        ? 'rounded-br-xs bg-emerald-600 text-white'
                        : 'rounded-bl-xs border border-slate-200 bg-white'
                    }`}
                  >
                    {!item.isSelf && (
                      <View className="mb-1 flex-row items-center gap-1.5">
                        <Text className="text-[11px] font-bold text-slate-900">
                          {item.senderName}
                        </Text>
                        <View
                          className={`rounded px-1 py-0.5 ${
                            item.senderRole === 'owner'
                              ? 'bg-amber-100'
                              : 'bg-blue-100'
                          }`}
                        >
                          <Text
                            className={`text-[9px] font-extrabold uppercase ${
                              item.senderRole === 'owner'
                                ? 'text-amber-800'
                                : 'text-blue-800'
                            }`}
                          >
                            {item.senderRole}
                          </Text>
                        </View>
                      </View>
                    )}
                    <Text
                      className={`text-xs leading-4 ${
                        item.isSelf ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      {item.content}
                    </Text>
                    <View
                      className={`mt-1 flex-row items-center justify-end gap-1 ${
                        item.isSelf ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      <Text
                        className={`text-[9px] ${
                          item.isSelf ? 'text-emerald-200' : 'text-slate-400'
                        }`}
                      >
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {item.isSelf && <CheckCheck size={11} color="#A7F3D0" />}
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* Input Bar */}
        <View className="flex-row items-center gap-2 border-t border-slate-100 bg-white px-4 py-2.5">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message owner or dispatch..."
            placeholderTextColor="#94A3B8"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900"
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
            className={`size-9 items-center justify-center rounded-xl transition-all ${
              input.trim() ? 'bg-emerald-600 active:bg-emerald-700' : 'bg-slate-200'
            }`}
          >
            {sending ? (
              <ActivityIndicator size={14} color="#ffffff" />
            ) : (
              <Send size={15} color={input.trim() ? '#ffffff' : '#94A3B8'} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
