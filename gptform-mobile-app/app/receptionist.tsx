import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';

interface CallRecord {
  id: string;
  callerName: string;
  callerPhone: string;
  timestamp: string;
  duration: string;
  status: 'booked' | 'inquiry' | 'quote' | 'missed';
  summary: string;
  transcript: Array<{ speaker: 'AI' | 'Customer'; text: string }>;
}

const SAMPLE_CALLS: CallRecord[] = [
  {
    id: 'call-1',
    callerName: 'Sarah Jenkins',
    callerPhone: '+1 (415) 992-0192',
    timestamp: 'Today, 2:15 PM',
    duration: '2m 14s',
    status: 'booked',
    summary: 'Customer called about an emergency pipe leak in basement. AI booked technician arrival for tomorrow at 10:00 AM.',
    transcript: [
      { speaker: 'AI', text: 'Thank you for calling ABC Services! My name is Ava, your AI assistant. How can I help you today?' },
      { speaker: 'Customer', text: 'Hi Ava, I have a pipe leaking under my kitchen sink and water is pooling everywhere.' },
      { speaker: 'AI', text: 'I understand this is urgent! I can dispatch our senior technician to your address tomorrow morning at 10:00 AM. Does that work for you?' },
      { speaker: 'Customer', text: 'Yes, please book that slot right away.' },
      { speaker: 'AI', text: 'You are all set for 10:00 AM tomorrow. I have sent an SMS confirmation to this number. Is there anything else I can assist with?' },
    ],
  },
  {
    id: 'call-2',
    callerName: 'Marcus Vance',
    callerPhone: '+1 (408) 552-3310',
    timestamp: 'Today, 11:42 AM',
    duration: '1m 45s',
    status: 'quote',
    summary: 'Requested price estimate for commercial HVAC quarterly inspection. AI sent instant pricing breakdown via SMS.',
    transcript: [
      { speaker: 'AI', text: 'Hello! Thanks for calling ABC Services. How may I direct your call or assist you today?' },
      { speaker: 'Customer', text: 'Hi, I need an estimate for routine maintenance on two rooftop AC units for a small retail shop.' },
      { speaker: 'AI', text: 'Our commercial maintenance packages start at $189 per unit including filter replacement and refrigerant check. Would you like me to text you our full service catalog?' },
      { speaker: 'Customer', text: 'Yes, please text me the details.' },
      { speaker: 'AI', text: 'Sent! You should receive the link in a few seconds. Feel free to book online or call us back anytime.' },
    ],
  },
  {
    id: 'call-3',
    callerName: 'Elena Rostova',
    callerPhone: '+1 (650) 201-9988',
    timestamp: 'Yesterday, 4:20 PM',
    duration: '48s',
    status: 'inquiry',
    summary: 'Inquired about weekend operating hours and warranty policy. AI confirmed Saturday 9 AM - 4 PM availability.',
    transcript: [
      { speaker: 'AI', text: 'Welcome to ABC Services! How can I help you?' },
      { speaker: 'Customer', text: 'Are you guys open on Saturdays for walk-ins?' },
      { speaker: 'AI', text: 'Yes, our dispatch and showroom are open this Saturday from 9:00 AM to 4:00 PM.' },
      { speaker: 'Customer', text: 'Great, thanks so much!' },
    ],
  },
];

export default function ReceptionistScreen() {
  const [isActive, setIsActive] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const dedicatedNumber = '+1 (555) 382-9011';

  const handleToggleActive = async (val: boolean) => {
    await hapticFeedback.light();
    setIsActive(val);
  };

  const handleCopyNumber = async () => {
    await hapticFeedback.success();
    Alert.alert('Copied', `Dedicated number ${dedicatedNumber} copied to clipboard.`);
  };

  const handleSimulatePlayAudio = async () => {
    await hapticFeedback.light();
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticFeedback.light();
            router.back();
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>AI Voice Receptionist</Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Subscription Card */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subHeader}>
            <View style={styles.badgeWrap}>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>$29/MO ADD-ON</Text>
              </View>
              <View style={[styles.statusDot, isActive ? styles.dotActive : styles.dotInactive]} />
              <Text style={styles.statusText}>{isActive ? 'Live 24/7 Answering' : 'Paused'}</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={handleToggleActive}
              trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
              thumbColor="#ffffff"
            />
          </View>

          <Text style={styles.subTitle}>24/7 Autonomous Phone Answering</Text>
          <Text style={styles.subDesc}>
            Never miss another customer phone call. Your AI Voice Receptionist answers immediately, qualifies customer intent, and books appointments on your calendar.
          </Text>

          {/* Benefits */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitRow}>
              <MaterialIcons name="check-circle" size={16} color="#8b5cf6" style={{ marginRight: 8 }} />
              <Text style={styles.benefitText}>Dedicated US/UK/Local phone number</Text>
            </View>
            <View style={styles.benefitRow}>
              <MaterialIcons name="check-circle" size={16} color="#8b5cf6" style={{ marginRight: 8 }} />
              <Text style={styles.benefitText}>2-Way Google Calendar live slot booking</Text>
            </View>
            <View style={styles.benefitRow}>
              <MaterialIcons name="check-circle" size={16} color="#8b5cf6" style={{ marginRight: 8 }} />
              <Text style={styles.benefitText}>Full call recordings & instant AI transcripts</Text>
            </View>
            <View style={styles.benefitRow}>
              <MaterialIcons name="check-circle" size={16} color="#8b5cf6" style={{ marginRight: 8 }} />
              <Text style={styles.benefitText}>Emergency dispatch & SMS confirmations</Text>
            </View>
          </View>
        </View>

        {/* Assigned Dedicated Number Card */}
        <View style={styles.numberCard}>
          <View style={styles.numberCardHeader}>
            <MaterialIcons name="phone" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
            <Text style={styles.numberCardLabel}>Your Assigned Voice Number</Text>
          </View>
          <View style={styles.numberRow}>
            <Text style={styles.numberText}>{dedicatedNumber}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyNumber} activeOpacity={0.7}>
              <MaterialIcons name="content-copy" size={16} color="#8b5cf6" style={{ marginRight: 4 }} />
              <Text style={styles.copyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.forwardingBox}>
            <Text style={styles.forwardingTitle}>Call Forwarding Setup:</Text>
            <Text style={styles.forwardingText}>
              To forward missed calls from your cell phone, simply dial <Text style={{ fontWeight: 'bold' }}>*72 {dedicatedNumber}</Text>.
            </Text>
          </View>
        </View>

        {/* Recent Call Records */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Inbound Phone Calls</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{SAMPLE_CALLS.length}</Text>
          </View>
        </View>

        {SAMPLE_CALLS.map((call) => (
          <TouchableOpacity
            key={call.id}
            style={styles.callCard}
            onPress={() => {
              hapticFeedback.light();
              setSelectedCall(call);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.callCardTop}>
              <View style={styles.callerInfo}>
                <Text style={styles.callerName}>{call.callerName}</Text>
                <Text style={styles.callerPhone}>{call.callerPhone}</Text>
              </View>
              <View style={styles.callBadgeCol}>
                <View
                  style={[
                    styles.statusBadge,
                    call.status === 'booked' && styles.badgeBooked,
                    call.status === 'quote' && styles.badgeQuote,
                    call.status === 'inquiry' && styles.badgeInquiry,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      call.status === 'booked' && styles.textBooked,
                      call.status === 'quote' && styles.textQuote,
                      call.status === 'inquiry' && styles.textInquiry,
                    ]}
                  >
                    {call.status === 'booked' ? 'Meeting Booked' : call.status === 'quote' ? 'Price Quote' : 'Inquiry'}
                  </Text>
                </View>
                <Text style={styles.callDuration}>{call.duration}</Text>
              </View>
            </View>

            <Text style={styles.callSummary} numberOfLines={2}>
              {call.summary}
            </Text>

            <View style={styles.callCardFooter}>
              <Text style={styles.callTime}>{call.timestamp}</Text>
              <View style={styles.viewTranscriptBtn}>
                <Text style={styles.viewTranscriptText}>View Transcript</Text>
                <MaterialIcons name="chevron-right" size={16} color="#8b5cf6" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Transcript & Recording Modal */}
      <Modal
        visible={!!selectedCall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCall(null)}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{selectedCall?.callerName}</Text>
              <Text style={styles.modalSubtitle}>{selectedCall?.callerPhone} • {selectedCall?.duration}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedCall(null)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Audio player simulator */}
          <View style={styles.audioPlayerBox}>
            <TouchableOpacity
              style={styles.playBtn}
              onPress={handleSimulatePlayAudio}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isPlayingAudio ? 'pause' : 'play-arrow'}
                size={28}
                color="#ffffff"
              />
            </TouchableOpacity>
            <View style={styles.audioTrack}>
              <View style={[styles.audioProgress, isPlayingAudio && { width: '60%' }]} />
            </View>
            <Text style={styles.audioTime}>{isPlayingAudio ? '0:42' : '0:00'}</Text>
          </View>

          {/* AI Summary Card */}
          <View style={styles.aiSummaryCard}>
            <View style={styles.aiSummaryHeader}>
              <MaterialIcons name="auto-awesome" size={16} color="#8b5cf6" style={{ marginRight: 6 }} />
              <Text style={styles.aiSummaryTitle}>AI Call Analysis</Text>
            </View>
            <Text style={styles.aiSummaryBody}>{selectedCall?.summary}</Text>
          </View>

          {/* Full Conversation Transcript */}
          <Text style={styles.transcriptHeading}>Call Transcript</Text>
          <ScrollView style={styles.transcriptScroll} showsVerticalScrollIndicator={false}>
            {selectedCall?.transcript.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.msgRow,
                  msg.speaker === 'AI' ? styles.msgRowAi : styles.msgRowCustomer,
                ]}
              >
                <Text style={styles.msgSpeaker}>{msg.speaker === 'AI' ? '🤖 AI Receptionist' : '👤 Customer'}</Text>
                <View
                  style={[
                    styles.msgBubble,
                    msg.speaker === 'AI' ? styles.bubbleAi : styles.bubbleCustomer,
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      msg.speaker === 'AI' ? styles.textAi : styles.textCustomer,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 6,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  navRight: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  subscriptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#10b981',
  },
  dotInactive: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  subDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 14,
  },
  benefitsList: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  numberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  numberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  numberCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  numberText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  forwardingBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  forwardingTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  forwardingText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  callCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  callCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  callerInfo: {
    flex: 1,
  },
  callerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  callerPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  callBadgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeBooked: {
    backgroundColor: '#ecfdf5',
  },
  badgeQuote: {
    backgroundColor: '#eff6ff',
  },
  badgeInquiry: {
    backgroundColor: '#f8fafc',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textBooked: {
    color: '#059669',
  },
  textQuote: {
    color: '#2563eb',
  },
  textInquiry: {
    color: '#475569',
  },
  callDuration: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  callSummary: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 10,
  },
  callCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  callTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  viewTranscriptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewTranscriptText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  audioPlayerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  audioProgress: {
    width: '10%',
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
  audioTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    width: 32,
  },
  aiSummaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#faf5ff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  aiSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  aiSummaryBody: {
    fontSize: 13,
    color: '#4c1d95',
    lineHeight: 18,
  },
  transcriptHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  transcriptScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  msgRow: {
    marginBottom: 14,
  },
  msgRowAi: {
    alignItems: 'flex-start',
  },
  msgRowCustomer: {
    alignItems: 'flex-end',
  },
  msgSpeaker: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  msgBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 14,
  },
  bubbleAi: {
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 4,
  },
  bubbleCustomer: {
    backgroundColor: '#8b5cf6',
    borderTopRightRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  textAi: {
    color: '#0f172a',
  },
  textCustomer: {
    color: '#ffffff',
  },
});
