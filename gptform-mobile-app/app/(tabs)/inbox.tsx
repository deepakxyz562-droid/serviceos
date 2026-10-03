import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

type InboxFilter = 'my_chats' | 'queued' | 'unassigned' | 'supervised';

interface ChatItem {
  id: string;
  name: string;
  avatarText: string;
  lastMessage: string;
  timeAgo: string;
  unread: boolean;
  channel: 'website' | 'whatsapp' | 'instagram' | 'sms';
}

const SAMPLE_CHATS: ChatItem[] = [
  {
    id: 'session-urgent-1',
    name: 'Example Customer',
    avatarText: 'EC',
    lastMessage: 'Reopened - by agent',
    timeAgo: '2 min',
    unread: true,
    channel: 'website',
  },
  {
    id: 'session-wa-2',
    name: 'Rahul Sharma',
    avatarText: 'RS',
    lastMessage: 'AI: Our AC service starts at ₹499...',
    timeAgo: '15 min',
    unread: false,
    channel: 'whatsapp',
  },
  {
    id: 'session-ig-3',
    name: 'Priya Patel',
    avatarText: 'PP',
    lastMessage: 'AI: Available slots tomorrow are 11 AM or 3 PM.',
    timeAgo: '1h',
    unread: false,
    channel: 'instagram',
  },
];

export default function InboxScreen() {
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('my_chats');

  const filteredChats = activeFilter === 'my_chats'
    ? SAMPLE_CHATS
    : [];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inbox</Text>
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'my_chats' && styles.filterPillActive]}
            onPress={() => {
              hapticFeedback.light();
              setActiveFilter('my_chats');
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === 'my_chats' && styles.filterPillTextActive]}>
              My chats (1)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'queued' && styles.filterPillActive]}
            onPress={() => {
              hapticFeedback.light();
              setActiveFilter('queued');
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === 'queued' && styles.filterPillTextActive]}>
              Queued
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'unassigned' && styles.filterPillActive]}
            onPress={() => {
              hapticFeedback.light();
              setActiveFilter('unassigned');
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === 'unassigned' && styles.filterPillTextActive]}>
              Unassigned
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'supervised' && styles.filterPillActive]}
            onPress={() => {
              hapticFeedback.light();
              setActiveFilter('supervised');
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === 'supervised' && styles.filterPillTextActive]}>
              Supervised
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* White Content Container */}
      <View style={styles.contentWrap}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
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

          {/* Conversation List */}
          {filteredChats.length > 0 ? (
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
              <MaterialIcons name="chat-bubble-outline" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No chats in this folder</Text>
              <Text style={styles.emptySub}>Incoming chats from all channels will appear here.</Text>
            </View>
          )}
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
});
