import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import { API_PATHS } from '@/lib/constants';
import { apiRequest, ApiError } from '@/lib/api';

type InboxFilter =
  | 'my_chats'
  | 'unassigned'
  | 'products'
  | 'order_status'
  | 'order_issues'
  | 'shipping'
  | 'whatsapp';

interface ChatItem {
  id: string;
  name: string;
  avatarText: string;
  lastMessage: string;
  timeAgo: string;
  unread: boolean;
  channel: 'website' | 'whatsapp' | 'instagram' | 'sms';
  category?: string;
}

export default function InboxScreen() {
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('my_chats');
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = async () => {
    try {
      setError(null);
      const res = await apiRequest<any>(API_PATHS.sessions);
      const list = Array.isArray(res) ? res : res?.sessions || [];
      const mapped: ChatItem[] = list.map((s: any, idx: number) => {
        const name = s.visitorName || s.customerName || `Customer #${idx + 1}`;
        const initials = name
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return {
          id: s.id,
          name,
          avatarText: initials || 'CU',
          lastMessage: s.lastMessage || s.summary || 'Customer started a conversation',
          timeAgo: s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          unread: !!s.unread || s.status === 'open',
          channel: (s.channel === 'whatsapp' || s.channel === 'instagram') ? s.channel : 'website',
          category: s.category || 'my_chats',
        };
      });
      setChats(mapped);
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message || 'We couldn\'t load your conversations right now.';
      setError(msg);
      setChats([]);
    }
  };

  useEffect(() => {
    fetchChats().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    hapticFeedback.light();
    await fetchChats();
    setRefreshing(false);
  };

  const filteredChats = chats.filter((c) => {
    if (activeFilter === 'my_chats') return true;
    if (activeFilter === 'unassigned') return c.unread;
    if (activeFilter === 'products') return c.category === 'products';
    if (activeFilter === 'order_status') return c.category === 'order_status';
    if (activeFilter === 'order_issues') return c.category === 'order_issues';
    if (activeFilter === 'shipping') return c.category === 'shipping';
    if (activeFilter === 'whatsapp') return c.channel === 'whatsapp';
    return true;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.headerTitle}>Inbox</Text>
          <View style={styles.tidioBadge}>
            <Text style={styles.tidioBadgeText}>Tidio Suite</Text>
          </View>
        </View>
      </View>

      {/* Filter Row: Tidio Smart Views */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'my_chats', label: 'All Open' },
            { id: 'unassigned', label: 'Unassigned' },
            { id: 'products', label: '🛍️ Products' },
            { id: 'order_status', label: '📖 Order status' },
            { id: 'order_issues', label: '📦 Order issues' },
            { id: 'shipping', label: '🚚 Shipping' },
            { id: 'whatsapp', label: 'WhatsApp' },
          ].map((item) => {
            const active = activeFilter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => {
                  hapticFeedback.light();
                  setActiveFilter(item.id as InboxFilter);
                }}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* White Content Container */}
      <View style={styles.contentWrap}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
        >
          {/* Archives Row at the top (matches 18.35.51.jpeg) */}
          <TouchableOpacity
            style={styles.archiveRow}
            onPress={() => {
              hapticFeedback.light();
              router.push('/archives');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.archiveRowLeft}>
              <MaterialIcons name="inventory-2" size={20} color="#1e293b" style={{ marginRight: 12 }} />
              <Text style={styles.archiveTitle}>Archives</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Loading spinner */}
          {loading && (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.stateText}>Loading conversations…</Text>
            </View>
          )}

          {/* Error banner */}
          {!loading && error && (
            <View style={styles.errorWrap}>
              <MaterialIcons name="cloud-off" size={28} color="#ef4444" style={{ marginBottom: 8 }} />
              <Text style={styles.errorTitle}>Couldn't load conversations</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  hapticFeedback.light();
                  setLoading(true);
                  fetchChats().finally(() => setLoading(false));
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty state (no chats at all) */}
          {!loading && !error && chats.length === 0 && (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="chat-bubble-outline" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>New chats from your website, WhatsApp, and other channels will appear here.</Text>
            </View>
          )}

          {/* Conversation List */}
          {!loading && !error && chats.length > 0 && (filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatRow}
                onPress={() => {
                  hapticFeedback.light();
                  router.push(`/chat/${chat.id}` as any);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.chatRowLeft}>
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>{chat.avatarText}</Text>
                    {chat.channel === 'whatsapp' ? (
                      <View style={[styles.channelBadge, { backgroundColor: '#25D366' }]}>
                        <MaterialIcons name="chat" size={9} color="#fff" />
                      </View>
                    ) : chat.channel === 'instagram' ? (
                      <View style={[styles.channelBadge, { backgroundColor: '#E1306C' }]}>
                        <MaterialIcons name="photo-camera" size={9} color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.channelBadge, { backgroundColor: '#2563eb' }]}>
                        <MaterialIcons name="public" size={9} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chatName}>{chat.name}</Text>
                    <Text style={styles.chatMessage} numberOfLines={1}>
                      {chat.lastMessage}
                    </Text>
                  </View>
                </View>

                <View style={styles.chatRowRight}>
                  <Text style={styles.timeAgoText}>{chat.timeAgo}</Text>
                  {chat.unread && <View style={styles.unreadDot} />}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="filter-list" size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No chats in this folder</Text>
              <Text style={styles.emptySub}>Try another filter above.</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  tidioBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tidioBadgeText: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  filterRow: {
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  contentWrap: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 6,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingVertical: 6,
  },
  archiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  archiveRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  archiveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  chatRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarText: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 44,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  channelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  chatName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  chatMessage: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  chatRowRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 8,
  },
  timeAgoText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  stateWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  stateText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
  },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
