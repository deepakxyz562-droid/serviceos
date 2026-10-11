/**
 * Inbox Thread (Employee) — chat UI for a single conversation.
 *
 * Mirrors the PWA employee portal's message thread:
 *  - Customer context header: name, phone, call button.
 *  - Chat bubbles: inbound (left, gray) / outbound (right, primary).
 *  - Input bar with text input + send button.
 *  - Auto-scroll to bottom on mount and after send.
 *  - Quick reply suggestions.
 *
 * APIs:
 *   GET  /api/conversations/[id]/messages → Message[]
 *   POST /api/conversations/[id]/messages { body } → Message
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Phone,
  Send,
  MessageCircle,
  Paperclip,
} from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Conversation, Message } from '@/types';

const QUICK_REPLIES = [
  "I'm on my way.",
  'Will be there in 15 minutes.',
  'Thanks for your patience!',
  'Job completed — please review.',
];

/** Pick list out of an API response that may be a bare array or wrapped. */
function pickList<T>(res: T[] | { data: T[] } | { items: T[] }): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    if (Array.isArray((res as { data?: T[] }).data)) return (res as { data: T[] }).data;
    if (Array.isArray((res as { items?: T[] }).items)) return (res as { items: T[] }).items;
  }
  return [];
}

/** Fetch the parent conversation for header context. */
function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', id],
    queryFn: async () => {
      const res = await api.get<Conversation[] | { data: Conversation[] } | { items: Conversation[] } | Conversation>(
        '/api/conversations'
      );
      const list = pickList(res as Conversation[] | { data: Conversation[] } | { items: Conversation[] });
      return list.find((c) => c.id === id) ?? null;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

/** Fetch the messages for a conversation. */
function useMessages(id: string) {
  return useQuery({
    queryKey: ['conversations', id, 'messages'],
    queryFn: async () => {
      const res = await api.get<Message[] | { data: Message[] } | { items: Message[] }>(
        `/api/conversations/${id}/messages`
      );
      return pickList(res);
    },
    enabled: !!id,
    refetchInterval: 15 * 1000, // poll for new inbound messages
  });
}

const formatMessageTime = (iso: string): string => {
  try {
    const d = parseISO(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return format(d, 'h:mm a');
    return format(d, 'MMM d, h:mm a');
  } catch {
    return '';
  }
};

export default function InboxThreadScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';

  const toast = useToast();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<Message>>(null);
  const [draft, setDraft] = useState('');

  const conversationQuery = useConversation(id);
  const messagesQuery = useMessages(id);

  const sendMessage = useMutation({
    mutationFn: (body: string) =>
      api.post<Message>(`/api/conversations/${id}/messages`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', id, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const messages = useMemo<Message[]>(() => messagesQuery.data ?? [], [messagesQuery.data]);

  // Refresh on focus.
  useFocusEffect(
    useCallback(() => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['conversations', id, 'messages'] });
      }
    }, [id, queryClient])
  );

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(t);
  }, [messages.length]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      await sendMessage.mutateAsync(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      toast.show(`Couldn't send message: ${msg}`, 'error');
      setDraft(body); // restore the draft on failure
    }
  };

  const handleCall = () => {
    const phone = conversationQuery.data?.customer?.phone;
    if (!phone) {
      toast.show('No phone number on file', 'info');
      return;
    }
    const url = `tel:${phone.replace(/\s+/g, '')}`;
    Linking.canOpenURL(url).then((ok) => {
      if (ok) {
        Linking.openURL(url);
      } else {
        Alert.alert('Phone', phone);
      }
    });
  };

  const customerName =
    conversationQuery.data?.customer?.name ||
    conversationQuery.data?.provider?.name ||
    'Conversation';

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOutbound = (item.direction || '').toLowerCase() === 'outbound';
    const prev = messages[index - 1];
    const showAvatar = !prev || prev.direction !== item.direction;
    return (
      <View
        className={cn(
          'mb-1.5 flex-row',
          isOutbound ? 'justify-end' : 'justify-start'
        )}
      >
        <View
          className={cn(
            'max-w-[80%] rounded-2xl px-3.5 py-2',
            isOutbound ? 'bg-primary-500' : 'bg-muted'
          )}
        >
          <Text
            className={cn(
              'text-sm',
              isOutbound ? 'text-white' : 'text-foreground'
            )}
          >
            {item.body}
          </Text>
          {item.attachments && item.attachments.length > 0 ? (
            <View className="mt-1.5 flex-row items-center">
              <Paperclip
                size={11}
                color={isOutbound ? '#fff' : COLORS.mutedForeground}
              />
              <Text
                className={cn(
                  'ml-1 text-[11px]',
                  isOutbound ? 'text-white/80' : 'text-muted-foreground'
                )}
              >
                {item.attachments.length} attachment{item.attachments.length === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
          <View className="mt-0.5 flex-row items-center justify-end">
            {isOutbound && item.status ? (
              <Text
                className={cn(
                  'mr-1.5 text-[10px] capitalize',
                  isOutbound ? 'text-white/70' : 'text-muted-foreground'
                )}
              >
                {item.status}
              </Text>
            ) : null}
            <Text
              className={cn(
                'text-[10px]',
                isOutbound ? 'text-white/70' : 'text-muted-foreground'
              )}
            >
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
        </View>
        {!isOutbound && showAvatar ? (
          <View className="ml-2 h-7 w-7 items-center justify-center self-end rounded-full bg-muted">
            <MessageCircle size={14} color={COLORS.mutedForeground} />
          </View>
        ) : null}
      </View>
    );
  };

  if (messagesQuery.isLoading && messages.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header
          onBack={() => router.back()}
          name={customerName}
          phone={conversationQuery.data?.customer?.phone}
          onCall={handleCall}
        />
        <Spinner />
      </SafeAreaView>
    );
  }

  if (messagesQuery.error && messages.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header
          onBack={() => router.back()}
          name={customerName}
          phone={conversationQuery.data?.customer?.phone}
          onCall={handleCall}
        />
        <EmptyState
          icon={<MessageCircle size={48} color={COLORS.mutedForeground} />}
          title="Couldn't load messages"
          description={
            messagesQuery.error instanceof Error
              ? messagesQuery.error.message
              : 'Please try again.'
          }
          actionLabel="Retry"
          onAction={() => messagesQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header
        onBack={() => router.back()}
        name={customerName}
        phone={conversationQuery.data?.customer?.phone}
        onCall={handleCall}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-6 py-16">
              <MessageCircle size={48} color={COLORS.mutedForeground} />
              <Text className="mt-4 text-lg font-bold text-foreground">
                No messages yet
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground text-center">
                Send the first message to start the conversation.
              </Text>
            </View>
          }
        />

        {/* Quick reply chips */}
        <View className="border-t border-border bg-white px-3 pt-2">
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={QUICK_REPLIES}
            keyExtractor={(item, i) => `${i}-${item}`}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setDraft(item)}
                className="mr-2 rounded-full border border-border bg-muted px-3 py-1.5"
                accessibilityRole="button"
                accessibilityLabel={`Quick reply: ${item}`}
              >
                <Text className="text-xs font-medium text-foreground">{item}</Text>
              </Pressable>
            )}
          />
        </View>

        {/* Input bar */}
        <View className="flex-row items-center border-t border-border bg-white px-3 py-2">
          <View className="flex-1 flex-row items-center rounded-xl border border-border bg-white px-3 py-1.5">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message…"
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-base text-foreground"
              multiline
              maxLength={2000}
              editable={!sendMessage.isPending}
            />
          </View>
          <View className="ml-2">
            <Button
              onPress={handleSend}
              loading={sendMessage.isPending}
              disabled={!draft.trim()}
            >
              <View className="flex-row items-center justify-center">
                <Send size={16} color="#fff" />
              </View>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({
  onBack,
  name,
  phone,
  onCall,
}: {
  onBack: () => void;
  name: string;
  phone?: string | null;
  onCall: () => void;
}) {
  return (
    <View className="flex-row items-center border-b border-border bg-white px-4 py-3">
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={22} color={COLORS.foreground} />
      </Pressable>
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {name}
        </Text>
        {phone ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {phone}
          </Text>
        ) : null}
      </View>
      {phone ? (
        <Pressable
          onPress={onCall}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Call customer"
          className="h-9 w-9 items-center justify-center rounded-full bg-primary-50"
        >
          <Phone size={18} color={COLORS.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
