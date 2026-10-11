/**
 * Message Thread Screen (NEW)
 *
 * Fetches GET /api/conversations/[id]/messages → Message[].
 *   - Chat UI: bubbles (inbound left gray, outbound right primary)
 *   - Input bar at bottom: text input + send button
 *     → POST /api/conversations/[id]/messages { body }
 *   - Auto-scroll to bottom. Refresh after send.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Send, Phone, AlertCircle } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useToast } from '@/components/ui/Toast';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Conversation, Message } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeMessages(
  r: Message[] | { data: Message[] } | { messages: Message[] } | undefined
): Message[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray((r as { data?: Message[] }).data)) return (r as { data?: Message[] }).data ?? [];
  if (Array.isArray((r as { messages?: Message[] }).messages))
    return (r as { messages?: Message[] }).messages ?? [];
  return [];
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return iso;
  }
}

function formatDateBadge(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), "EEEE, MMM d");
  } catch {
    return iso;
  }
}

function isSameDay(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    return parseISO(a).toDateString() === parseISO(b).toDateString();
  } catch {
    return false;
  }
}

// ── Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound';
  return (
    <View className={cn('flex-row', isOutbound ? 'justify-end' : 'justify-start')}>
      <View
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2',
          isOutbound ? 'bg-primary-500' : 'bg-muted'
        )}
        style={
          isOutbound
            ? { borderBottomRightRadius: 4 }
            : { borderBottomLeftRadius: 4 }
        }
      >
        <Text
          className={cn(
            'text-sm',
            isOutbound ? 'text-white' : 'text-foreground'
          )}
        >
          {message.body}
        </Text>
        <View className="mt-1 flex-row items-center justify-end">
          <Text
            className={cn(
              'text-[10px]',
              isOutbound ? 'text-white/70' : 'text-muted-foreground'
            )}
          >
            {formatTime(message.createdAt)}
          </Text>
          {isOutbound && message.status ? (
            <Text className="ml-1 text-[10px] text-white/70">· {message.status}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────

export default function MessageThreadScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : undefined;
  const toast = useToast();
  const qc = useQueryClient();

  const [draft, setDraft] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  // ── Conversation (header info) ───────────────────────────────────
  const conversationQuery = useQuery({
    queryKey: ['conversations', id],
    queryFn: async () => {
      const r = await api.get<Conversation | Conversation[] | { data: Conversation }>(
        `/api/conversations/${id}`
      );
      if (Array.isArray(r)) return r[0] ?? null;
      if ((r as { data?: Conversation }).data) return (r as { data: Conversation }).data;
      return r as Conversation;
    },
    enabled: !!id,
  });

  // ── Messages ─────────────────────────────────────────────────────
  const messagesQuery = useQuery({
    queryKey: ['conversations', id, 'messages'],
    queryFn: async () => {
      const r = await api.get<Message[] | { data: Message[] }>(
        `/api/conversations/${id}/messages`
      );
      return normalizeMessages(r);
    },
    enabled: !!id,
    refetchInterval: 10000, // poll every 10s for new messages
  });

  // ── Send message ─────────────────────────────────────────────────
  const sendMessage = useMutation({
    mutationFn: (body: string) =>
      api.post<Message>(`/api/conversations/${id}/messages`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations', id, 'messages'] });
      qc.invalidateQueries({ queryKey: ['conversations', 'list'] });
    },
  });

  const messages = messagesQuery.data ?? [];
  const conversation = conversationQuery.data;

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    try {
      await sendMessage.mutateAsync(text);
    } catch (err) {
      setDraft(text); // restore draft so the user can retry
      toast.show(
        err instanceof Error ? err.message : 'Failed to send message.',
        'error'
      );
    }
  };

  // ── Loading / error states ──────────────────────────────────────

  if (messagesQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color={COLORS.foreground} />
          </Pressable>
        </View>
        <Spinner />
      </SafeAreaView>
    );
  }

  if (messagesQuery.isError && messages.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <View className="flex-row items-center px-1 py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color={COLORS.foreground} />
          </Pressable>
        </View>
        <EmptyState
          icon={<AlertCircle size={48} color={COLORS.destructive} />}
          title="Couldn't load messages"
          description={
            messagesQuery.error instanceof Error
              ? messagesQuery.error.message
              : 'Please try again later.'
          }
          actionLabel="Retry"
          onAction={() => messagesQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  const headerName =
    conversation?.provider?.name ?? conversation?.customer?.name ?? 'Conversation';

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const prev = messages[index - 1];
    const showDateSeparator =
      !prev || !isSameDay(prev.createdAt, item.createdAt);
    return (
      <View>
        {showDateSeparator ? (
          <View className="my-3 items-center">
            <View className="rounded-full bg-muted px-3 py-1">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {formatDateBadge(item.createdAt)}
              </Text>
            </View>
          </View>
        ) : null}
        <View className="mb-1.5 px-1">
          <MessageBubble message={item} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background" style={{ flex: 1 }}>
      {/* Top bar */}
      <View className="flex-row items-center border-b border-border px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            {headerName}
          </Text>
          {conversation?.provider?.name ? (
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {conversation.provider.name}
            </Text>
          ) : null}
        </View>
        {conversation?.provider?.phone ? (
          <Pressable
            onPress={() => {
              const url = `tel:${conversation.provider!.phone!.replace(/[^\d+]/g, '')}`;
              Linking.openURL(url).catch(() => {});
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Call provider"
          >
            <Phone size={20} color={COLORS.primary} />
          </Pressable>
        ) : null}
      </View>

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 16,
        }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        refreshControl={
          <RefreshControl
            refreshing={messagesQuery.isRefetching}
            onRefresh={() => messagesQuery.refetch()}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-sm text-muted-foreground">
              No messages yet. Say hello below!
            </Text>
          </View>
        }
      />

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View
          className="flex-row items-center border-t border-border bg-white px-3 py-2"
          style={{ paddingBottom: 8 }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor="#9CA3AF"
            multiline
            style={{
              flex: 1,
              minHeight: 36,
              maxHeight: 120,
              borderRadius: 18,
              backgroundColor: '#F3F4F6',
              paddingHorizontal: 14,
              paddingVertical: 8,
              fontSize: 14,
              color: COLORS.foreground,
            }}
            editable={!sendMessage.isPending}
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || sendMessage.isPending}
            className={cn(
              'ml-2 h-10 w-10 items-center justify-center rounded-full',
              draft.trim() && !sendMessage.isPending
                ? 'bg-primary-500'
                : 'bg-muted'
            )}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {sendMessage.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={16} color={draft.trim() ? '#fff' : COLORS.mutedForeground} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <LoadingOverlay visible={sendMessage.isPending} message="Sending…" />
    </SafeAreaView>
  );
}
