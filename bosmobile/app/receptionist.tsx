import React, { useState, useEffect, useCallback } from 'react';
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
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { hapticFeedback } from '@/lib/haptics';
import { API_PATHS } from '@/lib/constants';
import { apiRequest, ApiError } from '@/lib/api';

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

function formatTimestamp(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isToday) return `Today, ${time}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  } catch {
    return '—';
  }
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function mapCallStatus(call: any): CallRecord['status'] {
  const outcome = String(call?.outcomeType || '').toLowerCase();
  const status = String(call?.status || '').toLowerCase();
  if (status === 'missed' || status === 'failed' || status === 'no-answer') return 'missed';
  if (outcome.includes('book') || outcome.includes('appointment')) return 'booked';
  if (outcome.includes('quote') || outcome.includes('estimate')) return 'quote';
  return 'inquiry';
}

function mapApiCallToRecord(c: any): CallRecord {
  const phone = c?.customerPhone || c?.fromNumber || c?.toNumber || '';
  return {
    id: c?.id || '',
    callerName: c?.summary ? c.summary.slice(0, 60) : phone || 'Unknown caller',
    callerPhone: phone,
    timestamp: formatTimestamp(c?.startedAt || c?.createdAt),
    duration: formatDuration(c?.durationSec || c?.billableSeconds),
    status: mapCallStatus(c),
    summary: c?.summary || 'Call transcript and summary will appear here after the call ends.',
    transcript: [],
  };
}

export default function ReceptionistScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dedicatedNumber, setDedicatedNumber] = useState('');
  const [greeting, setGreeting] = useState('');
  const [afterHoursGreeting, setAfterHoursGreeting] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Ava (Warm & Professional)');
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [loadingCallDetail, setLoadingCallDetail] = useState(false);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [testingCall, setTestingCall] = useState(false);

  const fetchCalls = useCallback(async () => {
    try {
      const res = await apiRequest<{ calls: any[] }>(API_PATHS.receptionistCalls, {
        params: { limit: 20 },
      });
      const list = Array.isArray(res?.calls) ? res.calls : Array.isArray(res) ? (res as any) : [];
      setCallHistory(list.map(mapApiCallToRecord));
    } catch (err) {
      // Non-fatal: the calls section just stays empty.
      console.warn('[receptionist] fetch calls failed:', err);
      setCallHistory([]);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await apiRequest<{ receptionist: any }>(API_PATHS.receptionist);
      const r = res?.receptionist;
      setConfigLoaded(true);
      if (r) {
        // Backend stores status as uppercase 'ACTIVE' / 'PAUSED' / etc.
        setIsActive(String(r.status || '').toUpperCase() === 'ACTIVE');
        setGreeting(r.greeting || '');
        setAfterHoursGreeting(r.afterHoursGreeting || '');
        setTransferTarget(r.handoffTransferTarget || '');
        // Phone number is not part of the receptionist config — it’s
        // provisioned separately via /api/addons/phones/connections. We
        // intentionally leave dedicatedNumber empty so the UI shows
        // "Not configured" rather than a fake number.
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load AI Receptionist config.';
      setLoadError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchCalls()]).finally(() => setLoading(false));
  }, [fetchConfig, fetchCalls]);

  const handleToggleActive = async (val: boolean) => {
    hapticFeedback.medium();
    const prev = isActive;
    setIsActive(val);
    try {
      await apiRequest(API_PATHS.receptionist, {
        method: 'PATCH',
        body: { status: val ? 'ACTIVE' : 'PAUSED' },
      });
    } catch (err) {
      setIsActive(prev);
      const msg = err instanceof ApiError ? err.message : 'Failed to update receptionist status.';
      Alert.alert('Update failed', msg);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    hapticFeedback.success();
    try {
      await apiRequest(API_PATHS.receptionist, {
        method: 'PATCH',
        body: {
          greeting,
          afterHoursGreeting,
          handoffTransferTarget: transferTarget,
          handoffEnabled: !!transferTarget,
        },
      });
      setShowSettingsModal(false);
      Alert.alert('Settings Saved', 'AI Voice Receptionist greetings and transfer target updated.');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to save settings.';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyNumber = () => {
    hapticFeedback.success();
    Alert.alert(
      dedicatedNumber ? 'Dedicated Number Copied' : 'No Number Configured',
      dedicatedNumber
        ? `${dedicatedNumber}\n\nTo forward calls from your existing business phone, dial:\n*21*${dedicatedNumber.replace(/\D/g, '')}#`
        : 'Provision a phone number in the Channels screen to enable call forwarding.'
    );
  };

  const handleSetupCallForwarding = () => {
    hapticFeedback.light();
    if (!dedicatedNumber) {
      Alert.alert(
        'No Number Provisioned',
        'You haven’t provisioned a dedicated AI phone number yet. Visit the Channels screen to provision one.',
        [{ text: 'Got It' }]
      );
      return;
    }
    Alert.alert(
      'Carrier Call Forwarding Setup',
      `Forward missed or all calls from your personal or store phone to your AI Receptionist:\n\n• Verizon / AT&T / T-Mobile: Dial *72${dedicatedNumber.replace(/\D/g, '')}\n• Airtel / Jio: Dial *21*${dedicatedNumber.replace(/\D/g, '')}#\n• iPhone / Android: Go to Phone Settings → Call Forwarding → Enter ${dedicatedNumber}`,
      [{ text: 'Got It' }]
    );
  };

  const handleTriggerTestCall = async () => {
    const target = transferTarget || dedicatedNumber;
    if (!target) {
      Alert.alert(
        'No phone number configured',
        'Set a Human Handoff / Transfer Target phone number in Settings, or provision a dedicated AI number first.',
      );
      return;
    }
    setTestingCall(true);
    hapticFeedback.medium();

    try {
      await apiRequest(API_PATHS.receptionistTestCall, {
        method: 'POST',
        body: { customerNumber: target },
      });
      Alert.alert(
        'Test Call Initiated',
        `Your AI Voice Receptionist is calling ${target}. Answer the call to test the conversation.`,
      );
      // Refresh the calls list so the new call appears once it starts.
      setTimeout(() => { fetchCalls(); }, 4000);
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.data?.error || err.message
        : 'Failed to initiate the test call. Please try again.';
      Alert.alert('Test Call Failed', msg);
    } finally {
      setTestingCall(false);
    }
  };

  const handleCallPress = async (call: CallRecord) => {
    setSelectedCall(call);
    if (call.transcript.length > 0) return;
    setLoadingCallDetail(true);
    try {
      const res = await apiRequest<{ call: any }>(API_PATHS.receptionistCalls, {
        params: { id: call.id },
      });
      const detail = res?.call;
      const transcript: Array<{ speaker: 'AI' | 'Customer'; text: string }> = Array.isArray(detail?.transcript)
        ? detail.transcript.map((t: any) => ({
            speaker: t?.role === 'assistant' || t?.speaker === 'AI' ? 'AI' : 'Customer',
            text: String(t?.content || t?.text || ''),
          })).filter((t: any) => t.text)
        : [];
      setSelectedCall({ ...call, transcript });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to load transcript.';
      Alert.alert('Transcript unavailable', msg);
    } finally {
      setLoadingCallDetail(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchConfig(), fetchCalls()]).finally(() => setRefreshing(false));
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
        <TouchableOpacity
          onPress={() => setShowSettingsModal(true)}
          style={styles.settingsBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="settings" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.stateText}>Loading AI Receptionist…</Text>
          </View>
        ) : loadError && !configLoaded ? (
          <View style={styles.stateWrap}>
            <MaterialIcons name="cloud-off" size={42} color="#94a3b8" />
            <Text style={styles.stateTitle}>Couldn’t load receptionist</Text>
            <Text style={styles.stateText}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setLoading(true); fetchConfig(); }}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <>
        {/* Status Card */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subHeader}>
            <View style={styles.badgeWrap}>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>24/7 VOICE ENGINE</Text>
              </View>
              <View style={[styles.statusDot, isActive ? styles.dotActive : styles.dotInactive]} />
              <Text style={styles.statusText}>{isActive ? 'Live Answering' : 'Paused'}</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={handleToggleActive}
              trackColor={{ false: '#cbd5e1', true: '#8b5cf6' }}
              thumbColor="#ffffff"
            />
          </View>

          <Text style={styles.subTitle}>Autonomous Phone Answering</Text>
          <Text style={styles.subDesc}>
            Never miss another customer phone call. Your AI Voice Receptionist answers immediately, qualifies intent, answers FAQs, and books appointments.
          </Text>

          {/* Test Call Button */}
          <TouchableOpacity
            style={styles.testCallBtn}
            onPress={handleTriggerTestCall}
            disabled={testingCall}
            activeOpacity={0.8}
          >
            {testingCall ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialIcons name="phone-in-talk" size={18} color="#ffffff" />
                <Text style={styles.testCallText}>Simulate / Test Inbound Call</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Dedicated Phone Number Card */}
        <View style={styles.phoneCard}>
          <View style={styles.phoneHeader}>
            <View style={styles.phoneIconWrap}>
              <MaterialIcons name="phonelink-ring" size={24} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.phoneLabel}>YOUR DEDICATED AI PHONE NUMBER</Text>
              <Text style={[styles.phoneNumber, !dedicatedNumber && { color: '#94a3b8', fontStyle: 'italic' }]}>
                {dedicatedNumber || 'Not configured'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCopyNumber} style={styles.copyBtn} activeOpacity={0.7}>
              <MaterialIcons name="content-copy" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.phoneActionsRow}>
            <TouchableOpacity
              style={styles.forwardingBtn}
              onPress={handleSetupCallForwarding}
              activeOpacity={0.8}
            >
              <MaterialIcons name="call-split" size={16} color="#8b5cf6" />
              <Text style={styles.forwardingText}>Setup Call Forwarding</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.configBtn}
              onPress={() => setShowSettingsModal(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="tune" size={16} color="#0f172a" />
              <Text style={styles.configBtnText}>Edit Greetings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice Persona & Quick Greeting Preview */}
        <View style={styles.personaCard}>
          <View style={styles.personaRow}>
            <View style={styles.voiceAvatar}>
              <MaterialIcons name="record-voice-over" size={20} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.personaLabel}>VOICE PERSONA</Text>
              <Text style={styles.personaName}>{selectedVoice}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.greetingPreviewBox}>
            <Text style={styles.greetingPreviewLabel}>Greeting Message:</Text>
            <Text style={[styles.greetingPreviewText, !greeting && { color: '#94a3b8', fontStyle: 'italic' }]}>
              {greeting ? `"${greeting}"` : 'Not configured — set a greeting in Edit Greetings.'}
            </Text>
          </View>

          <View style={styles.handoffPreviewRow}>
            <MaterialIcons name="phone-forwarded" size={14} color={transferTarget ? '#059669' : '#94a3b8'} />
            <Text style={[styles.handoffPreviewText, !transferTarget && { color: '#94a3b8', fontStyle: 'italic' }]}>
              Human Handoff Number:{' '}
              <Text style={{ fontWeight: '800' }}>{transferTarget || 'Not configured'}</Text>
            </Text>
          </View>
        </View>

        {/* Recent Call Records */}
        <View style={styles.callsSection}>
          <Text style={styles.sectionTitle}>RECENT CALL ACTIVITY</Text>

          {callHistory.length === 0 ? (
            <View style={styles.callsEmptyCard}>
              <MaterialIcons name="phone-in-talk" size={32} color="#94a3b8" />
              <Text style={styles.callsEmptyTitle}>No calls yet</Text>
              <Text style={styles.callsEmptySubtitle}>
                Trigger a test call to see transcripts here.
              </Text>
            </View>
          ) : (
            callHistory.map((call) => (
              <TouchableOpacity
                key={call.id}
                style={styles.callRow}
                onPress={() => handleCallPress(call)}
                activeOpacity={0.7}
              >
                <View style={styles.callAvatar}>
                  <MaterialIcons
                    name={call.status === 'booked' ? 'event' : call.status === 'quote' ? 'request-quote' : 'call'}
                    size={18}
                    color={call.status === 'booked' ? '#059669' : '#8b5cf6'}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.callTopLine}>
                    <Text style={styles.callerName}>{call.callerName}</Text>
                    <Text style={styles.callTime}>{call.timestamp}</Text>
                  </View>
                  <Text style={styles.callSummary} numberOfLines={2}>
                    {call.summary}
                  </Text>
                  <View style={styles.callMetaRow}>
                    <Text style={styles.callDuration}>{call.duration}</Text>
                    <View style={[styles.statusPill, call.status === 'booked' && styles.statusBooked]}>
                      <Text style={styles.statusPillText}>{call.status.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        </>
        )}
      </ScrollView>

      {/* Transcript Detail Modal */}
      <Modal visible={!!selectedCall} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.transcriptCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedCall?.callerName}</Text>
                <Text style={styles.modalSub}>{selectedCall?.callerPhone} · {selectedCall?.duration}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCall(null)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.transcriptScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.transcriptHeading}>CALL TRANSCRIPT</Text>
              {loadingCallDetail ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <ActivityIndicator size="small" color="#8b5cf6" />
                  <Text style={[styles.speakerTag, { marginTop: 8 }]}>Loading transcript…</Text>
                </View>
              ) : selectedCall?.transcript.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <MaterialIcons name="subtitles-off" size={28} color="#94a3b8" />
                  <Text style={[styles.speakerTag, { marginTop: 8 }]}>
                    No transcript available for this call.
                  </Text>
                </View>
              ) : (
                selectedCall?.transcript.map((line, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.chatBubble,
                      line.speaker === 'AI' ? styles.bubbleAi : styles.bubbleCustomer,
                    ]}
                  >
                    <Text style={styles.speakerTag}>{line.speaker}:</Text>
                    <Text style={styles.bubbleText}>{line.text}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setSelectedCall(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receptionist Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <MaterialIcons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Voice Persona</Text>
              <View style={styles.voiceSelectRow}>
                {['Ava (Warm)', 'Oliver (Professional)', 'Maya (Friendly)'].map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setSelectedVoice(v)}
                    style={[styles.voiceOption, selectedVoice.startsWith(v.split(' ')[0]) && styles.voiceOptionActive]}
                  >
                    <Text style={[styles.voiceOptionText, selectedVoice.startsWith(v.split(' ')[0]) && styles.voiceOptionTextActive]}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Daytime Greeting</Text>
              <TextInput
                style={styles.textArea}
                value={greeting}
                onChangeText={setGreeting}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>After-Hours Greeting</Text>
              <TextInput
                style={styles.textArea}
                value={afterHoursGreeting}
                onChangeText={setAfterHoursGreeting}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Human Handoff / Transfer Target Phone</Text>
              <TextInput
                style={styles.input}
                value={transferTarget}
                onChangeText={setTransferTarget}
                placeholder="e.g. +1 (512) 555-0199"
                keyboardType="phone-pad"
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.saveSettingsBtn}
              onPress={handleSaveConfig}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveSettingsText}>{saving ? 'Saving...' : 'Save Configuration'}</Text>
            </TouchableOpacity>
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
    fontWeight: '800',
    color: '#0f172a',
  },
  settingsBtn: {
    padding: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  callsEmptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  callsEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
  },
  callsEmptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  subscriptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    color: '#8b5cf6',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
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
    fontWeight: '700',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  subDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  testCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  testCallText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  phoneCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  phoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  phoneIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8b5cf6',
    letterSpacing: 0.6,
  },
  phoneNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  copyBtn: {
    padding: 6,
  },
  phoneActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  forwardingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f3e8ff',
    paddingVertical: 10,
    borderRadius: 10,
  },
  forwardingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8b5cf6',
  },
  configBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 10,
  },
  configBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  personaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  personaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  voiceAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  personaName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  greetingPreviewBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  greetingPreviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  greetingPreviewText: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  handoffPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  handoffPreviewText: {
    fontSize: 11,
    color: '#059669',
  },
  callsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  callRow: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    gap: 12,
  },
  callAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  callerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  callTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  callSummary: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 6,
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callDuration: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  statusBooked: {
    backgroundColor: '#ecfdf5',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  transcriptCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  transcriptScroll: {
    marginBottom: 16,
  },
  transcriptHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  chatBubble: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  bubbleAi: {
    backgroundColor: '#f3e8ff',
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  bubbleCustomer: {
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  speakerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 12,
    color: '#0f172a',
    lineHeight: 17,
  },
  modalDoneBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  settingsModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  voiceSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  voiceOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  voiceOptionActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3e8ff',
  },
  voiceOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  voiceOptionTextActive: {
    color: '#8b5cf6',
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#0f172a',
    minHeight: 65,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
  },
  saveSettingsBtn: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveSettingsText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
