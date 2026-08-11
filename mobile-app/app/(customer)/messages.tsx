/**
 * Messages — Conversations List (NEW)
 *
 * Fetches GET /api/conversations → Conversation[].
 *   - Cards: customer/provider name, last message preview, time, unread badge
 *   - Tap → /(customer)/messages/[id]
 *   - Empty: "No messages yet"
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { MessageSquare, ChevronRight, ArrowLeft, AlertCircle } from 'lucide-react-native';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Conversation } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeConversations(
  r: Conversation[] | { data: Conversation[] } | { conversations: Conversation[] } | undefined
): Conversation[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray((r as { data?: Conversation[] }).data)) return (r as { data?: Conversation[] }).data ?? [];
  if (Array.isArray((r as { conversations?: Conversation[] }).conversations))
    return (r as { conversations?: Conversation[] }).conversations ?? [];
  return [];
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = parseISO(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return format(d, 'h:mm a');
    // Within a week, show day of week
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return format(d, 'EEE');
    return format(d, 'MMM d');
  } catch {
    return iso;
  }
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── Screen ───────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['conversations', 'list'],
    queryFn: async () => {
      const r = await api.get<Conversation[] | { data: Conversation[] }>(
        '/api/conversations',
        { limit: 50 }
      );
      return normalizeConversations(r);
    },
  });

  const conversations = useMemo(() => data ?? [], [data]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const name = item.provider?.name ?? item.customer?.name ?? 'Conversation';
    const last = item.lastMessage;
    const preview = last?.body ?? 'No messages yet';
    const time = formatTime(item.lastMessageAt ?? last?.createdAt);
    const unread = item.unreadCount ?? 0;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(customer)/messages/[id]',
            params: { id: item.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Open conversation with ${name}`}
        className="active:opacity-70"
      >
        <Card className="mb-2">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-500">
              <Text className="text-sm font-bold text-white">{getInitials(name)}</Text>
            </View>
            <View className="ml-3 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-base font-bold text-foreground" numberOfLines={1}>
                  {name}
                </Text>
                {time ? (
                  <Text className="ml-2 text-xs text-muted-foreground">{time}</Text>
                ) : null}
              </View>
              <View className="mt-1 flex-row items-center justify-between">
                <Text
                  className={cn(
                    'flex-1 pr-2 text-sm',
                    unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  )}
                  numberOfLines={1}
                >
                  {preview}
                </Text>
                {unread > 0 ? (
                  <View className="ml-2">
                    <Badge variant="destructive">{unread}</Badge>
                  </View>
                ) : null}
              </View>
            </View>
            <ChevronRight size={18} color={COLORS.mutedForeground} />
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* Top bar */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
          Messages
        </Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList count={4} />
          ) : isError ? (
            <EmptyState
              icon={<AlertCircle size={48} color={COLORS.destructive} />}
              title="Couldn't load messages"
              description={error instanceof Error ? error.message : 'Please try again later.'}
              actionLabel="Retry"
              onAction={() => refetch()}
            />
          ) : (
            <EmptyState
              icon={<MessageSquare size={48} color={COLORS.mutedForeground} />}
              title="No messages yet"
              description="Conversations with your service providers will appear here."
            />
          )
        }
      />
    </SafeAreaView>
  );
}
