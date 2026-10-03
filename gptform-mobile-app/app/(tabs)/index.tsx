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
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { hapticFeedback } from '@/lib/haptics';

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleShareLink = async () => {
    await hapticFeedback.light();
    try {
      await Share.share({
        title: 'Chat with us',
        message: 'Chat with our AI team here: https://fieseros.com/agent/support',
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
        {/* Top Header: Hi, Deepak! + 0 🌐 */}
        <View style={styles.topHeader}>
          <Text style={styles.greetingTitle}>
            Hi, {user?.name ? user.name.split(' ')[0] : 'there'}!
          </Text>
          <View style={styles.globePill}>
            <Text style={styles.globeNumber}>0</Text>
            <MaterialIcons name="public" size={18} color="#1e293b" />
          </View>
        </View>

        {/* 4 Circular Action Icons */}
        <View style={styles.quickActionRow}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              hapticFeedback.light();
              router.push('/archives');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionCircle}>
              <MaterialIcons name="inventory-2" size={22} color="#1e293b" />
            </View>
            <Text style={styles.quickActionLabel}>Archives</Text>
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
            onPress={() => {
              hapticFeedback.light();
              router.push('/tickets');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionCircle}>
              <MaterialIcons name="confirmation-number" size={22} color="#1e293b" />
            </View>
            <Text style={styles.quickActionLabel}>Tickets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => {
              hapticFeedback.light();
              setFeedbackModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionCircle}>
              <MaterialIcons name="thumb-up-alt" size={22} color="#1e293b" />
            </View>
            <Text style={styles.quickActionLabel}>Share feedback</Text>
          </TouchableOpacity>
        </View>

        {/* Gradient Announcement Card */}
        <View style={styles.promoCard}>
          <View style={styles.promoLeft}>
            <Text style={styles.promoTitle}>GPTForm is now AI Powered</Text>
            <TouchableOpacity
              style={styles.promoBtn}
              onPress={() => {
                hapticFeedback.light();
                router.push('/team');
              }}
            >
              <Text style={styles.promoBtnText}>See agents</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoIconWrap}>
            <View style={styles.promoIconBox}>
              <MaterialIcons name="smart-toy" size={26} color="#1e293b" />
            </View>
            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>1</Text>
            </View>
          </View>
        </View>

        {/* Card: Today's Wins (matches 18.35.48 (1).jpeg) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Today's wins</Text>
          </View>

          {/* Sales Closed */}
          <View style={styles.winCard}>
            <View style={styles.winHeader}>
              <View style={styles.winTagPill}>
                <Text style={styles.winTagText}>Ecommerce only</Text>
              </View>
              <MaterialIcons name="monetization-on" size={20} color="#94a3b8" />
            </View>
            <Text style={styles.winLabel}>SALES CLOSED</Text>
            <Text style={styles.winValue}>$0.00</Text>
            <Text style={styles.winSub}>Sales made during chats by your team or AI agent.</Text>
          </View>

          {/* Customers Served */}
          <View style={[styles.winCard, { marginTop: 10 }]}>
            <View style={styles.winHeader}>
              <Text style={styles.winLabel}>CUSTOMERS SERVED</Text>
              <MaterialIcons name="check" size={20} color="#1e293b" />
            </View>
            <Text style={styles.winValue}>0</Text>
            <Text style={styles.winSub}>People successfully served through chats or tickets.</Text>
          </View>

          {/* Leads Qualified */}
          <View style={[styles.winCard, { marginTop: 10 }]}>
            <View style={styles.winHeader}>
              <Text style={styles.winLabel}>LEADS QUALIFIED</Text>
              <MaterialIcons name="verified" size={20} color="#1e293b" />
            </View>
            <Text style={styles.winValue}>0</Text>
            <Text style={styles.winSub}>
              Contacts collected through chats today, like emails, phone numbers, or ZIP codes.
            </Text>
          </View>

          {/* Info pill */}
          <View style={styles.infoPillBox}>
            <MaterialIcons name="info-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
            <Text style={styles.infoPillText}>Wins reset at midnight</Text>
          </View>
        </View>

        {/* Card: TRAFFIC NOW 🟢 (matches 18.35.52 (1).jpeg & 18.35.53.jpeg) */}
        <View style={styles.card}>
          <View style={styles.trafficHeaderRow}>
            <Text style={styles.trafficTag}>TRAFFIC NOW</Text>
            <View style={styles.livePulseDot} />
          </View>

          {/* Dotted Globe Graphic */}
          <View style={styles.globeIllustrationWrap}>
            <View style={styles.globeCircle}>
              <MaterialIcons name="public" size={130} color="#e2e8f0" />
            </View>
          </View>

          {/* Active Chats vs Visitors Online */}
          <View style={styles.trafficMetricsRow}>
            <View>
              <Text style={styles.metricLabel}>Active chats</Text>
              <Text style={styles.metricNumber}>1</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metricLabel}>Visitors online</Text>
              <Text style={styles.metricNumber}>1</Text>
            </View>
          </View>

          {/* Split bar */}
          <View style={styles.splitBar}>
            <View style={[styles.splitFill, { width: '100%', backgroundColor: '#3b82f6' }]} />
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#fb923c' }]} />
              <Text style={styles.legendText}>Automated 0</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.legendText}>Team 1</Text>
            </View>
          </View>

          {/* Inside Action: Share chat link > */}
          <TouchableOpacity
            style={styles.shareActionCard}
            onPress={handleShareLink}
            activeOpacity={0.7}
          >
            <MaterialIcons name="share" size={20} color="#1e293b" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.shareActionTitle}>Share chat link</Text>
              <Text style={styles.shareActionSub}>Don't wait for visitors. Bring chat to them.</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Card: RECENT FEEDBACK */}
        <View style={styles.card}>
          <Text style={styles.feedbackTag}>RECENT FEEDBACK</Text>
          <View style={styles.emptyFeedbackBox}>
            <MaterialIcons name="thumb-up-alt" size={28} color="#94a3b8" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyFeedbackTitle}>No feedback or ratings yet</Text>
            <Text style={styles.emptyFeedbackSub}>
              They'll show up here once customers start sharing.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Share Feedback Bottom Sheet */}
      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Share feedback</Text>
              <TouchableOpacity onPress={() => setFeedbackModalVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {feedbackSent ? (
              <View style={styles.feedbackSuccessBox}>
                <MaterialIcons name="check-circle" size={48} color="#10b981" />
                <Text style={styles.feedbackSuccessText}>Thank you for your feedback!</Text>
              </View>
            ) : (
              <View style={{ padding: 16 }}>
                <Text style={styles.feedbackQuestion}>How can we make GPTForm Mobile better for you?</Text>
                <TextInput
                  style={styles.feedbackInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Tell us what you'd like to see..."
                  placeholderTextColor="#94a3b8"
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                />
                <TouchableOpacity
                  style={[styles.feedbackSubmitBtn, !feedbackText.trim() && { opacity: 0.5 }]}
                  disabled={!feedbackText.trim()}
                  onPress={submitFeedback}
                >
                  <Text style={styles.feedbackSubmitText}>Send Feedback</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 10,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  globePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  globeNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingHorizontal: 6,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 72,
  },
  quickActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e0e7ff',
    borderRadius: 20,
    padding: 16,
    marginVertical: 12,
  },
  promoLeft: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e1b4b',
    marginBottom: 8,
  },
  promoBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  promoBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  promoIconWrap: {
    position: 'relative',
    marginLeft: 16,
  },
  promoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeaderRow: {
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  winCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  winHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  winTagPill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  winTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  winLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  winValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 4,
  },
  winSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  infoPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  trafficHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  trafficTag: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  globeIllustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  globeCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trafficMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  splitBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    marginVertical: 8,
  },
  splitFill: {
    height: '100%',
    borderRadius: 3,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  shareActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  shareActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  shareActionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  feedbackTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyFeedbackBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyFeedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyFeedbackSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  feedbackQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  feedbackSubmitBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  feedbackSubmitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackSuccessBox: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 12,
  },
  feedbackSuccessText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
});
