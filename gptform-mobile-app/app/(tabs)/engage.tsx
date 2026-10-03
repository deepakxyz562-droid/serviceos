import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

type EngageFilter = 'browsing' | 'queued' | 'chatting' | 'supervised';

export default function EngageScreen() {
  const [activeFilter, setActiveFilter] = useState<EngageFilter>('chatting');

  const handleShareLink = async () => {
    await hapticFeedback.light();
    try {
      await Share.share({
        title: 'Chat with us',
        message: 'Chat with our AI assistant here: https://fieseros.com/agent/support',
      });
    } catch {}
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
              Chatting (1)
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
        {activeFilter === 'chatting' ? (
          <ScrollView contentContainerStyle={styles.listContent}>
            {/* Live Chatting Visitor Card (matches 18.35.51 (1).jpeg) */}
            <TouchableOpacity
              style={styles.visitorCard}
              onPress={() => {
                hapticFeedback.light();
                router.push('/chat/session-urgent-1');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.visitorCardLeft}>
                <View style={styles.visitorAvatar}>
                  <Text style={styles.visitorAvatarText}>EC</Text>
                </View>
                <View>
                  <Text style={styles.visitorName}>Example Customer</Text>
                  <View style={styles.visitorMetaRow}>
                    <Text style={styles.visitorMeta}>External channel</Text>
                    <Text style={styles.visitorMetaDot}>·</Text>
                    <MaterialIcons name="person" size={13} color="#64748b" />
                    <Text style={styles.visitorMeta}>You</Text>
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
