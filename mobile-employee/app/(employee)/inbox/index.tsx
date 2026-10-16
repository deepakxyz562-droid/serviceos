/**
 * Inbox / Conversations (Employee) — list of message threads with customers.
 *
 * Mirrors the PWA employee portal's "inbox" view:
 *  - Card list of conversations: customer name, last message preview, time,
 *    unread badge, channel icon (WhatsApp / SMS / email).
 *  - Filter: All / Unread.
 *  - Tap → inbox/[id] message thread.
 *  - Pull-to-refresh, skeleton loading, empty state.
 *
 * API: GET /api/conversations?filter=&limit=50
 */
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  MessageCircle,
  MessageSquare,
  Mail,
  ChevronRight,
  Inbox as InboxIcon,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Conversation } from '@/types';

type FilterKey = 'all' | 'unread';

/** Pick list out of a raw API response that may be a bare array or wrapped. */
function pickList<T>(res: T[] | { data: T[] } | { items: T[] }): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    if (Array.isArray((res as { data?: T[] }).data)) return (res as { data: T[] }).data;
    if (Array.isArray((res as { items?: T[] }).items)) return (res as { items: T[] }).items;
  }
  return [];
}

function useConversations(filter: FilterKey) {
  return useQuery({
    queryKey: ['conversations', filter],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '50' };
      if (filter === 'unread') params.filter = 'unread';
      const res = await api.get<Conversation[] | { data: Conversation[] } | { items: Conversation[] }>(
        '/api/conversations',
        params
      );
      return pickList(res);
    },
    staleTime: 30 * 1000,
  });
}

const channelIcon = (channel: string) => {
  const c = (channel || '').toLowerCase();
  if (c.includes('whatsapp')) {
    return <MessageCircle size={14} color={COLORS.success} />;
  }
  if (c.includes('sms') || c.includes('text')) {
    return <MessageSquare size={14} color={COLORS.info} />;
  }
  if (c.includes('email') || c.includes('mail')) {
    return <Mail size={14} color={COLORS.warning} />;
  }
  return <MessageCircle size={14} color={COLORS.mutedForeground} />;
};

const channelLabel = (channel: string): string => {
  const c = (channel || '').toLowerCase();
  if (c.includes('whatsapp')) return 'WhatsApp';
  if (c.includes('sms') || c.includes('text')) return 'SMS';
  if (c.includes('email') || c.includes('mail')) return 'Email';
  return channel || 'Message';
};

const formatLastTime = (iso: string): string => {
  try {
    const d = parseISO(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return format(d, 'h:mm a');
    return format(d, 'MMM d');
  } catch {
    return '';
  }
};

const formatLastRelative = (iso: string): string => {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
};

export default function InboxScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data, isLoading, isRefetching, refetch, error } = useConversations(filter);

  // Refresh whenever this screen is focused (e.g. returning from a thread).
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }, [queryClient])
  );

  const conversations = useMemo<Conversation[]>(() => data ?? [], [data]);

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    refetch();
  }, [queryClient, refetch]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const name = item.customer?.name || item.provider?.name || 'Unknown';
    const phone = item.customer?.phone ?? null;
    const lastBody = item.lastMessage?.body ?? 'No messages yet';
    const unread = item.unreadCount > 0;

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(employee)/inbox/[id]',
            params: { id: item.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Open conversation with ${name}`}
        className="active:opacity-70"
      >
        <Card className={cn('mb-2.5', unread && 'border-primary-200')}>
          <View className="flex-row items-start">
            {/* Avatar / initials */}
            <View
              className={cn(
                'h-11 w-11 items-center justify-center rounded-full',
                unread ? 'bg-primary-500' : 'bg-muted'
              )}
            >
              <Text
                className={cn(
                  'text-sm font-bold',
                  unread ? 'text-white' : 'text-foreground'
                )}
              >
                {name.slice(0, 1).toUpperCase()}
              </Text>
            </View>

            <View className="ml-3 flex-1">
              <View className="flex-row items-center justify-between">
                <Text
                  numberOfLines={1}
                  className={cn(
                    'flex-1 text-base',
                    unread ? 'font-bold text-foreground' : 'font-semibold text-foreground'
                  )}
                >
                  {name}
                </Text>
                <Text className="ml-2 text-xs text-muted-foreground">
                  {formatLastTime(item.lastMessageAt)}
                </Text>
              </View>

              {/* Channel + phone */}
              <View className="mt-0.5 flex-row items-center">
                {channelIcon(item.channel)}
                <Text className="ml-1 text-[11px] font-medium text-muted-foreground">
                  {channelLabel(item.channel)}
                </Text>
                {phone ? (
                  <>
                    <Text className="mx-1 text-[11px] text-muted-foreground">·</Text>
                    <Text className="text-[11px] text-muted-foreground">{phone}</Text>
                  </>
                ) : null}
              </View>

              {/* Last message preview */}
              <Text
                numberOfLines={1}
                className={cn(
                  'mt-1 text-sm',
                  unread ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {lastBody}
              </Text>

              <View className="mt-1 flex-row items-center justify-between">
                <Text className="text-[11px] text-muted-foreground">
                  {formatLastRelative(item.lastMessageAt)}
                </Text>
                <View className="flex-row items-center">
                  {unread ? (
                    <Badge variant="primary">{item.unreadCount} new</Badge>
                  ) : null}
                  <ChevronRight
                    size={16}
                    color={COLORS.mutedForeground}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </View>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="px-4 pt-2">
          <Text className="mb-3 text-2xl font-bold text-foreground">Inbox</Text>
          <SkeletonList count={5} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <EmptyState
          icon={<InboxIcon size={48} color={COLORS.mutedForeground} />}
          title="Couldn't load messages"
          description={
            error instanceof Error ? error.message : 'Something went wrong.'
          }
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-3 mt-2">
            <Text className="mb-3 text-2xl font-bold text-foreground">Inbox</Text>
            <SegmentedControl<FilterKey>
              options={[
                { value: 'all', label: 'All' },
                { value: 'unread', label: 'Unread' },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<InboxIcon size={48} color={COLORS.mutedForeground} />}
            title="No messages"
            description={
              filter === 'unread'
                ? "You're all caught up — no unread messages."
                : 'Customer messages will appear here.'
            }
            actionLabel={filter === 'unread' ? 'View all' : undefined}
            onAction={filter === 'unread' ? () => setFilter('all') : undefined}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refreshAll}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </SafeAreaView>
  );
}
