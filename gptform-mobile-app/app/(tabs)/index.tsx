import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Share,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { hapticFeedback } from '@/lib/haptics';
import { API_PATHS, API_BASE_URL } from '@/lib/constants';
import { apiRequest } from '@/lib/api';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [agent, setAgent] = useState<any | null>(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isAiAnswering, setIsAiAnswering] = useState(true);

  useEffect(() => {
    apiRequest<any>(API_PATHS.agents)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.agents || [];
        if (list.length > 0) {
          setAgent(list[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleShareLink = async () => {
    await hapticFeedback.light();
    try {
      await Share.share({
        title: 'Chat with our AI Assistant',
        message: 'Chat with our AI assistant 24/7 here: https://fieseros.com/agent/support',
      });
    } catch {}
  };

  const submitFeedback = async () => {
    await hapticFeedback.success();
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setFeedbackModalVisible(false);
      setFeedbackText('');
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: Business Greeting + Live Pulse */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greetingTitle}>
              Hi, {user?.name ? user.name.split(' ')[0] : 'there'}!
            </Text>
            <Text style={styles.greetingSubtitle}>AI Employee Command Center</Text>
          </View>
          <View style={styles.liveStatusPill}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveStatusText}>AI Live 24/7</Text>
          </View>
        </View>

        {/* ─── Hero: Your AI Assistant Card ─── */}
        <View style={styles.assistantCard}>
          <View style={styles.assistantCardHeader}>
            <View style={styles.assistantAvatarWrap}>
              <View style={styles.assistantAvatar}>
                <MaterialIcons name="smart-toy" size={26} color="#ffffff" />
              </View>
              <View style={styles.onlineBadgeDot} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.assistantName}>{agent?.name || 'Ava'}</Text>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>AI EMPLOYEE</Text>
                </View>
              </View>
              <Text style={styles.assistantRole}>
                {agent?.systemPrompt ? 'Trained 24/7 AI Receptionist' : 'Customer Support & Lead Agent'}
              </Text>
            </View>
          </View>

          {/* Active Channels Grid */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
            <Text style={styles.channelsHeading}>CONNECTED CHANNELS</Text>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.push('/channels');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981' }}>Manage All &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.channelsRow}>
            <TouchableOpacity
              style={styles.channelChip}
              onPress={() => {
                hapticFeedback.light();
                router.push('/channels/website');
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="language" size={15} color="#2563eb" style={{ marginRight: 4 }} />
              <Text style={styles.channelChipText}>Website</Text>
              <View style={styles.channelActiveDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.channelChip}
              onPress={() => {
                hapticFeedback.light();
                router.push('/channels/whatsapp');
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chat" size={15} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.channelChipText}>WhatsApp</Text>
              <View style={styles.channelActiveDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.channelChip}
              onPress={() => {
                hapticFeedback.light();
                router.push('/channels/instagram');
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="camera-alt" size={15} color="#db2777" style={{ marginRight: 4 }} />
              <Text style={styles.channelChipText}>Instagram</Text>
              <View style={styles.channelActiveDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.channelChip}
              onPress={() => {
                hapticFeedback.light();
                router.push('/channels/messenger');
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="forum" size={15} color="#0084FF" style={{ marginRight: 4 }} />
              <Text style={styles.channelChipText}>Messenger</Text>
              <View style={styles.channelActiveDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelChip, styles.channelChipVoice]}
              onPress={() => {
                hapticFeedback.light();
                router.push('/receptionist');
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="phone" size={14} color="#8b5cf6" style={{ marginRight: 4 }} />
              <Text style={styles.channelVoiceText}>Voice</Text>
            </TouchableOpacity>
          </View>

          {/* Knowledge Status Bar */}
          <View style={styles.knowledgeBar}>
            <View style={styles.knowledgeItem}>
              <MaterialIcons name="check-circle" size={13} color="#10b981" style={{ marginRight: 4 }} />
              <Text style={styles.knowledgeText}>Website: Synced</Text>
            </View>
            <View style={styles.knowledgeDivider} />
            <View style={styles.knowledgeItem}>
              <MaterialIcons name="description" size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.knowledgeText}>12 PDFs</Text>
            </View>
            <View style={styles.knowledgeDivider} />
            <View style={styles.knowledgeItem}>
              <MaterialIcons name="help" size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.knowledgeText}>42 FAQs</Text>
            </View>
          </View>

          {/* Primary Action Buttons */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.trainBtn}
              onPress={() => {
                hapticFeedback.light();
                router.push('/team/train-agent' as any);
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="psychology" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.trainBtnText}>Train AI Knowledge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.conversationsBtn}
              onPress={() => {
                hapticFeedback.light();
                router.push('/(tabs)/inbox');
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="forum" size={18} color="#0f172a" style={{ marginRight: 6 }} />
              <Text style={styles.conversationsBtnText}>View Chats</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Urgent Human Takeover Alert Banner ─── */}
        <TouchableOpacity
          style={styles.takeoverAlertCard}
          onPress={() => {
            hapticFeedback.light();
            router.push('/(tabs)/inbox');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.takeoverLeft}>
            <View style={styles.takeoverIconCircle}>
              <MaterialIcons name="warning" size={20} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.takeoverTitle}>2 Chats Need Attention</Text>
              <Text style={styles.takeoverSubtitle}>
                WhatsApp visitor requested custom discount approval
              </Text>
            </View>
          </View>
          <View style={styles.takeoverActionPill}>
            <Text style={styles.takeoverActionText}>Take Over →</Text>
          </View>
        </TouchableOpacity>

        {/* ─── Today's AI Activity (Interactive Metrics) ─── */}
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Today's Activity</Text>
          <Text style={styles.sectionSubHeading}>Automated by AI</Text>
        </View>

        <View style={styles.metricsGrid}>
          {/* Total Conversations */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => {
              hapticFeedback.light();
              router.push('/(tabs)/inbox');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.metricTopRow}>
              <Text style={styles.metricCardLabel}>CONVERSATIONS</Text>
              <MaterialIcons name="chat-bubble-outline" size={18} color="#2563eb" />
            </View>
            <Text style={[styles.metricCardValue, { color: '#2563eb' }]}>28</Text>
            <Text style={styles.metricCardFoot}>94% resolved by AI</Text>
          </TouchableOpacity>

          {/* Leads Qualified */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => {
              hapticFeedback.light();
              router.push('/(tabs)/leads' as any);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.metricTopRow}>
              <Text style={styles.metricCardLabel}>LEADS CAPTURED</Text>
              <MaterialIcons name="assignment-ind" size={18} color="#059669" />
            </View>
            <Text style={[styles.metricCardValue, { color: '#059669' }]}>7</Text>
            <Text style={styles.metricCardFoot}>Phone &amp; WhatsApp</Text>
          </TouchableOpacity>

          {/* Bookings Confirmed */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => {
              hapticFeedback.light();
              router.push('/(tabs)/bookings' as any);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.metricTopRow}>
              <Text style={styles.metricCardLabel}>BOOKINGS</Text>
              <MaterialIcons name="event-available" size={18} color="#7c3aed" />
            </View>
            <Text style={[styles.metricCardValue, { color: '#7c3aed' }]}>3</Text>
            <Text style={styles.metricCardFoot}>Google Calendar sync</Text>
          </TouchableOpacity>

          {/* Response Time */}
          <View style={styles.metricCard}>
            <View style={styles.metricTopRow}>
              <Text style={styles.metricCardLabel}>AVG SPEED</Text>
              <MaterialIcons name="speed" size={18} color="#ea580c" />
            </View>
            <Text style={[styles.metricCardValue, { color: '#ea580c' }]}>1.2s</Text>
            <Text style={styles.metricCardFoot}>Instant response</Text>
          </View>
        </View>

        {/* ─── Quick Operations & Tools ─── */}
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Quick Shortcuts</Text>
        </View>

        <View style={styles.quickActionRow}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              hapticFeedback.light();
              router.push('/(tabs)/leads' as any);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#ecfdf5' }]}>
              <MaterialIcons name="assignment-ind" size={22} color="#059669" />
            </View>
            <Text style={styles.quickActionLabel}>Leads</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              hapticFeedback.light();
              router.push('/(tabs)/bookings' as any);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#eff6ff' }]}>
              <MaterialIcons name="event-available" size={22} color="#2563eb" />
            </View>
            <Text style={styles.quickActionLabel}>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              hapticFeedback.light();
              router.push('/receptionist');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionCircle, { backgroundColor: '#f5f3ff' }]}>
              <MaterialIcons name="phone-in-talk" size={22} color="#8b5cf6" />
            </View>
            <Text style={styles.quickActionLabel}>Voice ($29)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              hapticFeedback.light();
              router.push('/team');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionCircle}>
              <MaterialIcons name="group" size={22} color="#1e293b" />
            </View>
            <Text style={styles.quickActionLabel}>Team</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={handleShareLink}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionCircle}>
              <MaterialIcons name="share" size={22} color="#1e293b" />
            </View>
            <Text style={styles.quickActionLabel}>Share Bot</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 4,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  liveStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  assistantCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  assistantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  assistantAvatarWrap: {
    position: 'relative',
  },
  assistantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  assistantName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  roleTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563eb',
  },
  assistantRole: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  channelsHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  channelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  channelChipVoice: {
    backgroundColor: '#faf5ff',
    borderColor: '#f3e8ff',
  },
  channelChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  channelVoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  channelActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
    marginLeft: 6,
  },
  knowledgeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
  },
  knowledgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  knowledgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  knowledgeDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#cbd5e1',
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trainBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  trainBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  conversationsBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationsBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  takeoverAlertCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  takeoverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  takeoverIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  takeoverTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
  },
  takeoverSubtitle: {
    fontSize: 11,
    color: '#b45309',
    marginTop: 1,
  },
  takeoverActionPill: {
    backgroundColor: '#d97706',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  takeoverActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  metricCardValue: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  metricCardFoot: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickActionItem: {
    alignItems: 'center',
  },
  quickActionCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
});
