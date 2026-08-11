/**
 * Notifications Center (Employee)
 *
 * Mirrors the PWA employee portal's notification bell + inbox:
 *  - "Enable Push Notifications" card at top if not yet enabled.
 *  - Auto-register for push on mount (best-effort, errors swallowed).
 *  - List of notifications with icon by type, title, body, time, read/unread.
 *  - Filter: All / Unread.
 *  - Tap a notification → mark as read + navigate to its `link` if present.
 *  - "Mark all read" button → PATCH /api/notifications.
 *
 * APIs:
 *   GET   /api/notifications?filter=all|unread&limit=50 → AppNotification[]
 *   PATCH /api/notifications                            → mark all read
 *   PATCH /api/notifications/[id]                       → mark one read
 *   (also: registerForPushNotifications() from @/lib/notifications)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  Bell,
  BellOff,
  CheckCheck,
  Briefcase,
  CreditCard,
  CalendarDays,
  MessageCircle,
  TriangleAlert,
  Info,
  ChevronRight,
  CircleCheck,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { registerForPushNotifications } from '@/lib/notifications';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { AppNotification } from '@/types';

type FilterKey = 'all' | 'unread';

/** Pick list out of an API response that may be a bare array or wrapped. */
function pickList<T>(res: T[] | { data: T[] } | { items: T[] }): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    if (Array.isArray((res as { data?: T[] }).data)) return (res as { data: T[] }).data;
    if (Array.isArray((res as { items?: T[] }).items)) return (res as { items: T[] }).items;
  }
  return [];
}

function useNotifications(filter: FilterKey) {
  return useQuery({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const params: Record<string, string> = {
        filter: filter === 'unread' ? 'unread' : 'all',
        limit: '50',
      };
      const res = await api.get<
        AppNotification[] | { data: AppNotification[] } | { items: AppNotification[] }
      >('/api/notifications', params);
      return pickList(res);
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // poll for new notifications
  });
}

/** Pick an icon for a notification based on its `type`. */
function iconForType(type: string): { icon: React.ReactNode; bg: string } {
  const t = (type || '').toLowerCase();
  if (t.includes('job') || t.includes('assign') || t.includes('work')) {
    return { icon: <Briefcase size={18} color={COLORS.primary} />, bg: 'bg-primary-50' };
  }
  if (t.includes('invoice') || t.includes('payment') || t.includes('pay')) {
    return { icon: <CreditCard size={18} color={COLORS.success} />, bg: 'bg-green-50' };
  }
  if (t.includes('schedule') || t.includes('shift') || t.includes('visit')) {
    return { icon: <CalendarDays size={18} color={COLORS.accent} />, bg: 'bg-amber-50' };
  }
  if (t.includes('message') || t.includes('chat') || t.includes('conversation')) {
    return { icon: <MessageCircle size={18} color={COLORS.info} />, bg: 'bg-blue-50' };
  }
  if (t.includes('alert') || t.includes('warning') || t.includes('error')) {
    return { icon: <TriangleAlert size={18} color={COLORS.destructive} />, bg: 'bg-red-50' };
  }
  if (t.includes('success') || t.includes('complete')) {
    return { icon: <CircleCheck size={18} color={COLORS.success} />, bg: 'bg-green-50' };
  }
  return { icon: <Info size={18} color={COLORS.mutedForeground} />, bg: 'bg-muted' };
}

const formatRelative = (iso: string): string => {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
};

export default function NotificationsScreen() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

  const { data, isLoading, isRefetching, refetch, error } = useNotifications(filter);

  // Best-effort: register for push notifications on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (!cancelled) setPushEnabled(!!token);
      } catch (err) {
        console.warn('[notifications] push registration failed:', err);
        if (!cancelled) setPushEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh on focus.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }, [queryClient])
  );

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/api/notifications', { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}`, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const notifications = useMemo<AppNotification[]>(() => data ?? [], [data]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleEnablePush = async () => {
    try {
      const token = await registerForPushNotifications();
      setPushEnabled(!!token);
      if (token) {
        toast.show('Push notifications enabled', 'success');
      } else {
        toast.show('Permission denied — enable notifications in Settings.', 'warning');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      toast.show(`Couldn't enable push: ${msg}`, 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.show('All notifications marked as read', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      toast.show(`Couldn't mark all read: ${msg}`, 'error');
    }
  };

  const handlePressNotification = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await markOneRead.mutateAsync(n.id);
      } catch {
        // Non-fatal — still navigate if a link is present.
      }
    }
    if (n.link) {
      // Internal employee links start with "/(employee)/" — route via expo-router.
      // External links (http/https) open in the system browser.
      if (n.link.startsWith('/')) {
        const path = n.link.startsWith('/(employee)') ? n.link : `/(employee)${n.link}`;
        try {
          router.push(path as never);
        } catch {
          // Fallback to web open if route isn't found
          Linking.openURL(n.link).catch(() => {});
        }
      } else {
        Linking.openURL(n.link).catch(() => {});
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="px-4 pt-2">
          <Text className="mb-3 text-2xl font-bold text-foreground">Notifications</Text>
          <SkeletonList count={5} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <EmptyState
          icon={<Bell size={48} color={COLORS.mutedForeground} />}
          title="Couldn't load notifications"
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
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            onPress={() => handlePressNotification(item)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-3 mt-2">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-foreground">Notifications</Text>
              {unreadCount > 0 ? (
                <Pressable
                  onPress={handleMarkAllRead}
                  disabled={markAllRead.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Mark all notifications as read"
                  hitSlop={8}
                >
                  <View className="flex-row items-center rounded-lg bg-primary-50 px-3 py-1.5">
                    <CheckCheck size={14} color={COLORS.primary} />
                    <Text className="ml-1.5 text-xs font-semibold text-primary-700">
                      Mark all read
                    </Text>
                  </View>
                </Pressable>
              ) : null}
            </View>

            {/* Enable-push banner */}
            {pushEnabled === false ? (
              <Card className="mb-3 border-warning/30 bg-amber-50">
                <View className="flex-row items-center">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <BellOff size={18} color={COLORS.warning} />
                  </View>
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold text-amber-900">
                      Push notifications are off
                    </Text>
                    <Text className="mt-0.5 text-xs text-amber-800">
                      Get alerts for new jobs, schedule changes, and messages.
                    </Text>
                  </View>
                </View>
                <View className="mt-3">
                  <Button onPress={handleEnablePush} loading={false} size="sm" fullWidth>
                    Enable Push
                  </Button>
                </View>
              </Card>
            ) : pushEnabled === true ? (
              <Card className="mb-3 border-primary-200 bg-primary-50">
                <View className="flex-row items-center">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                    <Bell size={18} color={COLORS.primary} />
                  </View>
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-bold text-primary-700">
                      Push notifications enabled
                    </Text>
                    <Text className="mt-0.5 text-xs text-primary-600">
                      You'll receive alerts in real time.
                    </Text>
                  </View>
                </View>
              </Card>
            ) : null}

            {/* Filter */}
            <SegmentedControl<FilterKey>
              options={[
                { value: 'all', label: 'All' },
                { value: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
              ]}
              value={filter}
              onChange={setFilter}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Bell size={48} color={COLORS.mutedForeground} />}
            title="No notifications"
            description={
              filter === 'unread'
                ? "You're all caught up."
                : 'Notifications about your jobs and schedule will appear here.'
            }
            actionLabel={filter === 'unread' ? 'View all' : undefined}
            onAction={filter === 'unread' ? () => setFilter('all') : undefined}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const { icon, bg } = iconForType(notification.type);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      className="mb-2.5 active:opacity-70"
    >
      <Card
        className={cn(
          !notification.read && 'border-primary-200 bg-primary-50/40'
        )}
      >
        <View className="flex-row items-start">
          <View className={cn('mr-3 h-10 w-10 items-center justify-center rounded-full', bg)}>
            {icon}
          </View>
          <View className="flex-1 pr-2">
            <View className="flex-row items-center justify-between">
              <Text
                className={cn(
                  'flex-1 text-base',
                  notification.read ? 'font-semibold text-foreground' : 'font-bold text-foreground'
                )}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              {!notification.read ? (
                <View className="ml-2 h-2 w-2 rounded-full bg-primary-500" />
              ) : null}
            </View>
            <Text
              className="mt-0.5 text-sm text-muted-foreground"
              numberOfLines={3}
            >
              {notification.body}
            </Text>
            <View className="mt-1.5 flex-row items-center justify-between">
              <Text className="text-[11px] text-muted-foreground">
                {formatRelative(notification.createdAt)}
              </Text>
              {notification.link ? (
                <View className="flex-row items-center">
                  <Text className="text-[11px] font-semibold text-primary-700">
                    Open
                  </Text>
                  <ChevronRight size={12} color={COLORS.primary} />
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
