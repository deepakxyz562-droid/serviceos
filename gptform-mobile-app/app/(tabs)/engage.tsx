import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest, ApiError } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

type EngageFilter = 'browsing' | 'queued' | 'chatting' | 'supervised';

interface ChatSession {
  id: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  visitorEmail?: string | null;
  status?: string | null;
  unreadCount?: number | null;
  channel?: string | null;
  lastMessageAt?: string | null;
  createdAt?: string | null;
  lastMessage?: { body?: string; senderType?: string } | null;
  formName?: string | null;
}

function isEngaged(session: ChatSession): boolean {
  if (typeof session.unreadCount === 'number' && session.unreadCount > 0) return true;
  const status = (session.status || '').toLowerCase();
  return status === 'active' || status === 'engaged' || status === 'claimed' || status === 'waiting_for_agent';
}

function initials(name?: string | null): string {
  if (!name) return 'CU';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CU';
}

export default function EngageScreen() {
  const [activeFilter, setActiveFilter] = useState<EngageFilter>('chatting');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setError(null);
    try {
      const res = await apiRequest<{ sessions: ChatSession[] }>(API_PATHS.sessions);
      const list = Array.isArray(res?.sessions) ? res.sessions : Array.isArray(res) ? (res as any) : [];
      setSessions(list);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load live visitors.';
      setError(msg);
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleShareLink = async () => {
    await hapticFeedback.light();
    try {
      await Share.share({
        title: 'Chat with us',
        message: 'Chat with our AI assistant here: https://fieseros.com/agent/support',
      });
    } catch {}
  };

  const engagedSessions = sessions.filter(isEngaged);
  const chattingCount = engagedSessions.length;
  const currentVisitor = engagedSessions[0];

  const handleVisitorPress = () => {
    if (!currentVisitor) return;
    hapticFeedback.light();
    router.push(`/chat/${currentVisitor.id}` as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Engage</Text>
        <TouchableOpacity
          onPress={() => hapticFeedback.light()}
          style={styles.headerActionBtn}
        >
          <MaterialIcons name="check-box-outline-blank" size={22} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {/* Status Pill Filters */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'browsing' && styles.filterPillActive]}
            onPress={() => {
              hapticFeedback.light();
              setActiveFilter('browsing');
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === 'browsing' && styles.filterPillTextActive]}>
              Browsing
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
            style={[styles.filterPill, activeFilter === 'chatting' && styles.filterPillActive]}
            onPress={() => {
              hapticFeedback.light();
              setActiveFilter('chatting');
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === 'chatting' && styles.filterPillTextActive]}>
              Chatting ({chattingCount})
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

      {/* Content */}
      <View style={styles.contentWrap}>
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#0f172a" />
            <Text style={[styles.emptySubtitle, { marginTop: 12 }]}>Loading live visitors…</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="cloud-off" size={56} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>Couldn't load visitors</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() => { setLoading(true); fetchSessions(); }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="refresh" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.shareBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : activeFilter === 'chatting' ? (
          chattingCount === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="account-circle" size={64} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No customers are currently engaged</Text>
              <Text style={styles.emptySubtitle}>
                Live visitor sessions will appear here.
              </Text>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShareLink}
                activeOpacity={0.85}
              >
                <MaterialIcons name="share" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.shareBtnText}>Share chat link</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions(); }} />
              }
            >
              {/* Live Chatting Visitor Card (matches 18.35.51 (1).jpeg) */}
              <TouchableOpacity
                style={styles.visitorCard}
                onPress={handleVisitorPress}
                activeOpacity={0.8}
              >
                <View style={styles.visitorCardLeft}>
                  <View style={styles.visitorAvatar}>
                    <Text style={styles.visitorAvatarText}>
                      {initials(currentVisitor?.visitorName)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.visitorName}>
                      {currentVisitor?.visitorName || 'Anonymous Visitor'}
                    </Text>
                    <View style={styles.visitorMetaRow}>
                      <Text style={styles.visitorMeta}>
                        {currentVisitor?.channel || currentVisitor?.formName || 'External channel'}
                      </Text>
                      <Text style={styles.visitorMetaDot}>·</Text>
                      {typeof currentVisitor?.unreadCount === 'number' && currentVisitor.unreadCount > 0 ? (
                        <>
                          <MaterialIcons name="notifications-active" size={13} color="#d97706" />
                          <Text style={[styles.visitorMeta, { color: '#d97706', fontWeight: '700' }]}>
                            {currentVisitor.unreadCount} unread
                          </Text>
                        </>
                      ) : (
                        <>
                          <MaterialIcons name="person" size={13} color="#64748b" />
                          <Text style={styles.visitorMeta}>Live</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => hapticFeedback.light()}
                  style={styles.infoBtn}
                >
                  <MaterialIcons name="info-outline" size={22} color="#1e293b" />
                </TouchableOpacity>
              </TouchableOpacity>
            </ScrollView>
          )
        ) : (
          /* Empty State (matches 18.35.52 (2).jpeg) */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="account-circle" size={64} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No traffic to show</Text>
            <Text style={styles.emptySubtitle}>
              Your website isn't connected, but you can still chat. Share your chat link with customers.
            </Text>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareLink}
              activeOpacity={0.85}
            >
              <MaterialIcons name="share" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.shareBtnText}>Share chat link</Text>
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerActionBtn: {
    padding: 6,
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
  listContent: {
    padding: 16,
  },
  visitorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  visitorCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visitorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitorAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  visitorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  visitorMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  visitorMetaDot: {
    fontSize: 12,
    color: '#94a3b8',
  },
  infoBtn: {
    padding: 8,
    borderRadius: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  shareBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
