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
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { hapticFeedback } from '@/lib/haptics';
import { API_PATHS } from '@/lib/constants';
import { apiRequest, ApiError } from '@/lib/api';

interface DashboardStats {
  totalLeads?: { count?: number; trend?: number } | number;
  activeJobs?: { count?: number; totalJobs?: number } | number;
  monthlyRevenue?: { amount?: number; collected?: number; pending?: number; trend?: number } | number;
  todaysBookings?: number;
  todaysJobs?: any[];
  recentLeads?: any[];
  recentJobs?: any[];
}

interface DashboardBootstrap {
  stats?: DashboardStats;
  employees?: any[];
  unreadCount?: number;
}

interface ChatSession {
  id: string;
  visitorName?: string | null;
  status?: string | null;
  unreadCount?: number | null;
  lastMessage?: any | null;
}

interface KnowledgeDoc {
  id: string;
  title: string;
  sourceType?: string | null;
}

function num(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object') {
    if (typeof v.count === 'number') return v.count;
    if (typeof v.amount === 'number') return v.amount;
    if (typeof v.totalJobs === 'number') return v.totalJobs;
  }
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function formatCompact(n: number, prefix: string = ''): string {
  if (!n) return `${prefix}0`;
  if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}k`;
  return `${prefix}${n}`;
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [agent, setAgent] = useState<any | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([]);
  const [unreadAttentionCount, setUnreadAttentionCount] = useState(0);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isAiAnswering] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [daybookSummary, setDaybookSummary] = useState<any | null>(null);
  const [khataSummary, setKhataSummary] = useState<any | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  useEffect(() => {
    // 1. Agent (kept for the assistant card — name + persona).
    apiRequest<any>(API_PATHS.agents)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.agents || [];
        if (list.length > 0) setAgent(list[0]);
      })
      .catch(() => {});

    // 2. Dashboard bootstrap (KPIs).
    apiRequest<DashboardBootstrap>(API_PATHS.dashboardBootstrap)
      .then((res) => {
        setStats(res?.stats || null);
      })
      .catch(() => {});

    // 3. Chat sessions — drives the CONVERSATIONS metric + the "Chats Need Attention" banner.
    apiRequest<{ sessions: ChatSession[] }>(API_PATHS.sessions)
      .then((res) => {
        const list = Array.isArray(res?.sessions) ? res.sessions : Array.isArray(res) ? (res as any) : [];
        setActiveSessions(list);
        const needsAttention = list.filter(
          (s: ChatSession) =>
            (typeof s.unreadCount === 'number' && s.unreadCount > 0) || s.status === 'waiting_for_agent',
        ).length;
        setUnreadAttentionCount(needsAttention);
      })
      .catch(() => {});

    // 4. Knowledge documents — drives the Knowledge bar counts.
    apiRequest<{ documents: KnowledgeDoc[] }>(API_PATHS.aiKnowledge)
      .then((res) => {
        const docs = Array.isArray(res?.documents) ? res.documents : Array.isArray(res) ? (res as any) : [];
        setKnowledgeDocs(docs);
      })
      .catch(() => {});

    // 5. Daybook & Khata summaries for Business Pulse
    apiRequest<any>(API_PATHS.commerceDaybook)
      .then((res) => {
        if (res?.summary) setDaybookSummary(res.summary);
      })
      .catch(() => {});

    apiRequest<any>(API_PATHS.commerceKhata)
      .then((res) => {
        if (res?.summary) setKhataSummary(res.summary);
      })
      .catch(() => {});

    // 6. Inventory low-stock alerts
    apiRequest<any>(API_PATHS.commerceInventory)
      .then((res) => {
        if (Array.isArray(res?.lowStockAlerts)) {
          setLowStockCount(res.lowStockAlerts.length);
        } else if (Array.isArray(res?.items)) {
          const low = res.items.filter((it: any) => (it.stock ?? it.availableStock ?? 0) <= (it.reorderLevel ?? 5)).length;
          setLowStockCount(low);
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
    if (submittingFeedback) return;
    if (!feedbackText.trim()) {
      Alert.alert('Notice', 'Please type a message before sending.');
      return;
    }
    await hapticFeedback.success();
    setSubmittingFeedback(true);
    try {
      await apiRequest(API_PATHS.feedback, {
        method: 'POST',
        body: { message: feedbackText, userId: user?.id },
      });
      setFeedbackSent(true);
      setFeedbackText('');
      Alert.alert('Thank you!', 'Your feedback has been sent to our team.');
      setTimeout(() => {
        setFeedbackSent(false);
        setFeedbackModalVisible(false);
      }, 800);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to send feedback. Please try again.';
      Alert.alert('Send failed', msg);
    } finally {
      setSubmittingFeedback(false);
    }
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
            <Text style={styles.greetingSubtitle}>Today's Business &amp; Store Pulse</Text>
          </View>
          <View style={styles.liveStatusPill}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveStatusText}>Store Live</Text>
          </View>
        </View>

        {/* ─── Hero: Ask AI Voice Copilot Bar ─── */}
        <TouchableOpacity
          style={styles.aiVoiceBar}
          onPress={() => {
            hapticFeedback.light();
            router.push('/receptionist' as any);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.aiVoiceMicCircle}>
            <MaterialIcons name="mic" size={18} color="#ffffff" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.aiVoiceTitle}>Ask AI Staff / Voice Copilot</Text>
            <Text style={styles.aiVoiceSub} numberOfLines={1}>
              &quot;Who hasn&apos;t paid me?&quot; / &quot;Make ₹500 bill&quot;
            </Text>
          </View>
          <View style={styles.aiVoiceBadge}>
            <Text style={styles.aiVoiceBadgeText}>AI VOICE</Text>
          </View>
        </TouchableOpacity>

        {/* ─── Today's Business Pulse (Dukaan + Vyapar) ─── */}
        <View style={styles.businessPulseCard}>
          <View style={styles.businessPulseHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseTitle}>Today's Business Pulse</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                router.push('/expenses' as any);
              }}
            >
              <Text style={styles.pulseViewAll}>Day Book &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pulseGrid}>
            <TouchableOpacity
              style={styles.pulseStatBox}
              onPress={() => {
                hapticFeedback.light();
                router.push('/(tabs)/orders' as any);
              }}
            >
              <Text style={styles.pulseStatLabel}>TODAY SALES</Text>
              <Text style={styles.pulseStatValue}>₹{daybookSummary?.totalSales?.toFixed(2) || '0.00'}</Text>
              <Text style={styles.pulseStatSub}>{daybookSummary?.ordersCount || 0} orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pulseStatBox}
              onPress={() => {
                hapticFeedback.light();
                router.push('/expenses' as any);
              }}
            >
              <Text style={styles.pulseStatLabel}>DRAWER CASH</Text>
              <Text style={[styles.pulseStatValue, { color: '#059669' }]}>
                ₹{daybookSummary?.netCashInHand?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.pulseStatSub}>Cash in hand</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pulseStatBox}
              onPress={() => {
                hapticFeedback.light();
                router.push('/khata' as any);
              }}
            >
              <Text style={styles.pulseStatLabel}>AAPKO MILEGA</Text>
              <Text style={[styles.pulseStatValue, { color: '#d97706' }]}>
                ₹{khataSummary?.totalAapkoMilega?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.pulseStatSub}>{khataSummary?.customersWithDuesCount || 0} dues</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pulseStatBox}
              onPress={() => {
                hapticFeedback.light();
                router.push('/catalog' as any);
              }}
            >
              <Text style={styles.pulseStatLabel}>LOW STOCK</Text>
              <Text style={[styles.pulseStatValue, { color: lowStockCount > 0 ? '#dc2626' : '#059669' }]}>
                {lowStockCount}
              </Text>
              <Text style={styles.pulseStatSub}>{lowStockCount > 0 ? 'Reorder needed' : 'All in stock'}</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Commerce Action Pills */}
          <View style={styles.pulseActionRow}>
            <TouchableOpacity
              style={styles.pulseActionBtn}
              onPress={() => {
                hapticFeedback.light();
                router.push('/pos' as any);
              }}
            >
              <MaterialIcons name="point-of-sale" size={14} color="#059669" />
              <Text style={styles.pulseActionBtnText}>+ POS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pulseActionBtn}
              onPress={() => {
                hapticFeedback.light();
                router.push('/(tabs)/billing' as any);
              }}
            >
              <MaterialIcons name="receipt-long" size={14} color="#2563eb" />
              <Text style={styles.pulseActionBtnText}>+ GST Bill</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pulseActionBtn}
              onPress={() => {
                hapticFeedback.light();
                router.push('/khata' as any);
              }}
            >
              <MaterialIcons name="menu-book" size={14} color="#d97706" />
              <Text style={styles.pulseActionBtnText}>+ Khata</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pulseActionBtn}
              onPress={() => {
                hapticFeedback.light();
                router.push('/expenses' as any);
              }}
            >
              <MaterialIcons name="account-balance-wallet" size={14} color="#dc2626" />
              <Text style={styles.pulseActionBtnText}>+ Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Urgent Human Takeover Alert Banner ─── */}
        {unreadAttentionCount > 0 && (
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
                <Text style={styles.takeoverTitle}>
                  {unreadAttentionCount} {unreadAttentionCount === 1 ? 'Chat Needs' : 'Chats Need'} Attention
                </Text>
                <Text style={styles.takeoverSubtitle}>
                  {unreadAttentionCount} active {unreadAttentionCount === 1 ? 'session is' : 'sessions are'} waiting for a reply
                </Text>
              </View>
            </View>
            <View style={styles.takeoverActionPill}>
              <Text style={styles.takeoverActionText}>Take Over →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ─── AI Employee & Channels Assistant Card ─── */}
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
              <MaterialIcons
                name="check-circle"
                size={13}
                color={knowledgeDocs.some((d) => (d.sourceType || '').match(/crawl|website|url/i)) ? '#10b981' : '#94a3b8'}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.knowledgeText}>
                Website: {knowledgeDocs.some((d) => (d.sourceType || '').match(/crawl|website|url/i)) ? 'Synced' : 'Not synced'}
              </Text>
            </View>
            <View style={styles.knowledgeDivider} />
            <View style={styles.knowledgeItem}>
              <MaterialIcons name="description" size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.knowledgeText}>
                {knowledgeDocs.filter((d) => (d.sourceType || '').match(/file/i)).length} Files
              </Text>
            </View>
            <View style={styles.knowledgeDivider} />
            <View style={styles.knowledgeItem}>
              <MaterialIcons name="help" size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.knowledgeText}>
                {knowledgeDocs.filter((d) => (d.sourceType || '').match(/manual|faq|text/i)).length} Articles
              </Text>
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
            <Text style={[styles.metricCardValue, { color: '#2563eb' }]}>{activeSessions.length}</Text>
            <Text style={styles.metricCardFoot}>{activeSessions.length === 1 ? 'Active session' : 'Active sessions'}</Text>
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
            <Text style={[styles.metricCardValue, { color: '#059669' }]}>{num(stats?.totalLeads)}</Text>
            <Text style={styles.metricCardFoot}>All-time pipeline</Text>
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
            <Text style={[styles.metricCardValue, { color: '#7c3aed' }]}>{num(stats?.todaysBookings)}</Text>
            <Text style={styles.metricCardFoot}>Scheduled today</Text>
          </TouchableOpacity>

          {/* Monthly Revenue (replaces the fake AVG SPEED card) */}
          <View style={styles.metricCard}>
            <View style={styles.metricTopRow}>
              <Text style={styles.metricCardLabel}>REVENUE (MO)</Text>
              <MaterialIcons name="payments" size={18} color="#ea580c" />
            </View>
            <Text style={[styles.metricCardValue, { color: '#ea580c' }]}>
              {formatCompact(num(stats?.monthlyRevenue), '$')}
            </Text>
            <Text style={styles.metricCardFoot}>Collected + pending</Text>
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
  aiVoiceBar: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  aiVoiceMicCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiVoiceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  aiVoiceSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  aiVoiceBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  aiVoiceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
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
  businessPulseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  businessPulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  pulseTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  pulseViewAll: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  pulseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pulseStatBox: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  pulseStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
  },
  pulseStatValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  pulseStatSub: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 1,
  },
  pulseActionRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  pulseActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 7,
  },
  pulseActionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
  },
});
