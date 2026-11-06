import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Action,
  Avatar,
  Badge,
  Field,
  Empty,
  ErrorNotice,
  Loading,
  DialpadGrid,
  Chip,
  ui,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';

type Call = {
  id: string;
  customerPhone?: string;
  fromNumber?: string;
  toNumber?: string;
  callType: 'inbound' | 'outbound' | 'missed';
  status: string;
  createdAt: string;
  durationSec?: number;
  summary?: string;
  outcomeType?: string;
  endedReason?: string;
  leadId?: string | null;
};

type CallStats = {
  total: number;
  todayCount: number;
  missedCount: number;
  convertedCount: number;
};

type CallsResponse = {
  calls: Call[];
  stats: CallStats;
};

export default function PhoneScreen() {
  const router = useRouter();
  const { open } = useLocalSearchParams<{ open?: string }>();

  // Fetch calls & live stats
  const callsResource = useResource<CallsResponse>('/api/calls?limit=50');

  const [activeTab, setActiveTab] = useState<'all' | 'missed' | 'converted' | 'dialpad'>('all');
  React.useEffect(() => {
    if (open === 'dialpad') {
      setActiveTab('dialpad');
      router.setParams({ open: '' });
    }
  }, [open, router]);

  const [dialNumber, setDialNumber] = useState('');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [search, setSearch] = useState('');
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [postCallPrompt, setPostCallPrompt] = useState<{ number: string; durationSec: number } | null>(null);
  const pendingCallRef = useRef<{ number: string; startedAt: number } | null>(null);

  // Post-Call prompt detector: triggers when returning to BGOS from native phone dialer
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && pendingCallRef.current) {
        const elapsed = Math.round((Date.now() - pendingCallRef.current.startedAt) / 1000);
        const callInfo = pendingCallRef.current;
        pendingCallRef.current = null;
        if (elapsed >= 1) {
          setPostCallPrompt({ number: callInfo.number, durationSec: elapsed });
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Manual Log Form State
  const [logPhone, setLogPhone] = useState('');
  const [logType, setLogType] = useState<'inbound' | 'outbound' | 'missed'>('inbound');
  const [logDurationMin, setLogDurationMin] = useState('2');
  const [logOutcome, setLogOutcome] = useState('interested');
  const [logNotes, setLogNotes] = useState('');
  const [logCreateLead, setLogCreateLead] = useState(true);
  const [logSubmitting, setLogSubmitting] = useState(false);

  const stats = callsResource.data?.stats;
  const rawCalls = callsResource.data?.calls || [];

  const calls = rawCalls.filter((c) => {
    const num = (c.customerPhone || c.fromNumber || c.toNumber || '').toLowerCase();
    const sum = (c.summary || '').toLowerCase();
    const matchesSearch = !search || num.includes(search.toLowerCase()) || sum.includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'missed') {
      return (
        c.callType === 'missed' ||
        c.status === 'missed' ||
        c.durationSec === 0 ||
        ['no-answer', 'busy', 'missed', 'rejected'].includes(c.endedReason || '')
      );
    }
    if (activeTab === 'converted') {
      return Boolean(c.leadId);
    }
    return true;
  });

  function handleDigit(d: string) {
    if (dialNumber.length < 15) setDialNumber((prev) => prev + d);
  }

  function handleDelete() {
    setDialNumber((prev) => prev.slice(0, -1));
  }

  async function handleStartCall(numberToCall?: string) {
    const num = (numberToCall || dialNumber).replace(/[\s()-]/g, '');
    if (!/^\+?\d{7,15}$/.test(num)) {
      Alert.alert('Invalid Number', 'Please dial a valid phone number.');
      return;
    }
    pendingCallRef.current = { number: num, startedAt: Date.now() };
    try {
      await Linking.openURL(`tel:${num}`);
    } catch {
      pendingCallRef.current = null;
      Alert.alert('Error', 'Unable to open the native phone app.');
    }
  }

  function handleWhatsApp(phone?: string, isMissed = false) {
    const raw = (phone || '').replace(/\D/g, '');
    if (!raw) {
      Alert.alert('Invalid Phone', 'No valid phone number for WhatsApp message.');
      return;
    }
    const message = isMissed
      ? 'Hi! I noticed I missed your call earlier. How can I assist you today?'
      : 'Hi! Thank you for speaking with us today. Please let me know if you need any more details or quotation information.';
    Linking.openURL(`https://wa.me/${raw}?text=${encodeURIComponent(message)}`).catch(() => {
      Alert.alert('Error', 'Could not open WhatsApp.');
    });
  }

  async function handleConvertToLead(call: Call) {
    setConvertingId(call.id);
    try {
      const phone = call.customerPhone || call.fromNumber || call.toNumber || '';
      const res = await apiRequest<{ success: boolean; lead?: { id: string } }>('/api/calls/convert', {
        method: 'POST',
        body: {
          callId: call.id,
          name: `Caller ${phone.slice(-4)}`,
          notes: call.summary || `Converted from ${call.callType} call (${call.durationSec || 0}s)`,
        },
      });

      if (res.success) {
        setNotice(`Call converted to CRM Lead!`);
        setTimeout(() => setNotice(null), 4000);
        await callsResource.refresh();
      }
    } catch (e) {
      Alert.alert('Lead Conversion Failed', (e as Error).message || 'Could not convert call to lead.');
    } finally {
      setConvertingId(null);
    }
  }

  async function handleSaveManualLog() {
    const cleanPhone = logPhone.replace(/[\s()-]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return;
    }

    setLogSubmitting(true);
    try {
      const durationSec = logType === 'missed' ? 0 : (parseInt(logDurationMin, 10) || 1) * 60;
      await apiRequest('/api/calls', {
        method: 'POST',
        body: {
          customerPhone: cleanPhone,
          callType: logType,
          durationSec,
          outcomeType: logOutcome,
          summary: logNotes.trim() || undefined,
          createLead: logCreateLead,
          leadName: `Lead ${cleanPhone.slice(-4)}`,
        },
      });

      setLogModalOpen(false);
      setLogPhone('');
      setLogNotes('');
      setNotice(logCreateLead ? 'Call logged and saved to CRM Leads!' : 'Call logged successfully.');
      setTimeout(() => setNotice(null), 4000);
      await callsResource.refresh();
    } catch (e) {
      Alert.alert('Save Failed', (e as Error).message || 'Could not log call.');
    } finally {
      setLogSubmitting(false);
    }
  }

  return (
    <Screen
      title="Call Tracker"
      subtitle="Inbound calls, WhatsApp follow-ups & lead capture"
      onRefresh={callsResource.refresh}
      rightAction={
        <Pressable
          accessibilityRole="button"
          onPress={() => setLogModalOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.brand,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 20,
          }}
        >
          <MaterialIcons name="add" size={16} color="#FFFFFF" />
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>+ Log Call</Text>
        </Pressable>
      }
    >
      <ErrorNotice message={callsResource.error} retry={callsResource.refresh} />

      {notice ? (
        <View style={{ backgroundColor: colors.successSoft, padding: 12, borderRadius: 12, marginBottom: 8 }}>
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {notice}</Text>
        </View>
      ) : null}

      {/* TOP KPI CARDS */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
        {/* Today's Calls */}
        <View
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }}>Today</Text>
            <MaterialIcons name="phone-in-talk" size={14} color={colors.brand} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.ink }}>
            {stats?.todayCount ?? rawCalls.length}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.muted }}>Calls handled</Text>
        </View>

        {/* Missed Calls */}
        <View
          style={{
            flex: 1,
            backgroundColor: (stats?.missedCount || 0) > 0 ? '#FFFBEB' : '#FFFFFF',
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: (stats?.missedCount || 0) > 0 ? '#FDE68A' : '#E2E8F0',
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: (stats?.missedCount || 0) > 0 ? '#B45309' : colors.muted }}>
              Missed
            </Text>
            <MaterialIcons name="call-missed" size={14} color={(stats?.missedCount || 0) > 0 ? '#D97706' : colors.muted} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: (stats?.missedCount || 0) > 0 ? '#B45309' : colors.ink }}>
            {stats?.missedCount ?? 0}
          </Text>
          <Text style={{ fontSize: 10.5, color: (stats?.missedCount || 0) > 0 ? '#D97706' : colors.muted }}>
            {(stats?.missedCount || 0) > 0 ? 'Needs action' : 'All clear'}
          </Text>
        </View>

        {/* Converted to Leads */}
        <View
          style={{
            flex: 1,
            backgroundColor: '#F0FDF4',
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: '#BBF7D0',
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>Leads</Text>
            <MaterialIcons name="person-add" size={14} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#15803D' }}>
            {stats?.convertedCount ?? 0}
          </Text>
          <Text style={{ fontSize: 10.5, color: '#16a34a' }}>Captured in CRM</Text>
        </View>
      </View>

      {/* FILTER TABS */}
      <View style={[ui.row, { justifyContent: 'space-between', gap: 6, marginVertical: 6 }]}>
        <Chip
          label="All Calls"
          count={rawCalls.length}
          selected={activeTab === 'all'}
          onPress={() => setActiveTab('all')}
        />
        <Chip
          label="Missed ⚠️"
          count={stats?.missedCount ?? 0}
          selected={activeTab === 'missed'}
          onPress={() => setActiveTab('missed')}
        />
        <Chip
          label="In CRM ✅"
          count={stats?.convertedCount ?? 0}
          selected={activeTab === 'converted'}
          onPress={() => setActiveTab('converted')}
        />
        <Chip
          label="Keypad 🔢"
          selected={activeTab === 'dialpad'}
          onPress={() => setActiveTab('dialpad')}
        />
      </View>

      {/* KEYPAD TAB */}
      {activeTab === 'dialpad' && (
        <Card style={{ paddingVertical: 18, gap: 18 }}>
          <View style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: 1 }}>
              {dialNumber || 'Enter number'}
            </Text>
          </View>

          <DialpadGrid
            onDigit={handleDigit}
            onDelete={handleDelete}
            onCall={() => handleStartCall(dialNumber)}
          />

          <Action
            label="📞 Call via phone app"
            disabled={!dialNumber.trim()}
            onPress={() => handleStartCall(dialNumber)}
          />
        </Card>
      )}

      {/* CALL LOGS LIST */}
      {activeTab !== 'dialpad' && (
        <>
          <Field
            label="Search by number or notes"
            value={search}
            onChangeText={setSearch}
            keyboardType="default"
            placeholder="Search phone number…"
          />

          {callsResource.loading ? (
            <Loading />
          ) : !calls.length ? (
            <Empty
              title={activeTab === 'missed' ? 'No missed calls 🎉' : activeTab === 'converted' ? 'No leads converted yet' : 'No calls recorded'}
              detail="Every phone call you make, receive, or log appears here for instant follow-up."
              actionLabel="+ Log Call"
              onAction={() => setLogModalOpen(true)}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {calls.map((c) => {
                const number = c.customerPhone || c.fromNumber || c.toNumber || 'Unknown caller';
                const isMissed =
                  c.callType === 'missed' ||
                  c.status === 'missed' ||
                  c.durationSec === 0 ||
                  ['no-answer', 'busy', 'missed', 'rejected'].includes(c.endedReason || '');
                const isOutbound = c.callType === 'outbound';
                const isConverted = Boolean(c.leadId);

                const durationLabel = isMissed
                  ? 'Missed call'
                  : c.durationSec
                  ? `${Math.floor(c.durationSec / 60)}m ${c.durationSec % 60}s`
                  : 'Connected';

                const timeLabel = c.createdAt
                  ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
                    ' · ' +
                    new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : 'Recent';

                return (
                  <Card key={c.id} style={{ padding: 14, gap: 10, borderRadius: 16 }}>
                    {/* Header Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: isMissed ? '#FEF2F2' : isOutbound ? '#EFF6FF' : '#F0FDF4',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <MaterialIcons
                            name={isMissed ? 'call-missed' : isOutbound ? 'call-made' : 'call-received'}
                            size={18}
                            color={isMissed ? '#DC2626' : isOutbound ? '#2563EB' : '#16A34A'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
                            {number}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: colors.muted, marginTop: 1 }}>
                            {durationLabel} · {timeLabel}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badges */}
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        {isConverted ? (
                          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#166534' }}>✓ In CRM</Text>
                          </View>
                        ) : isMissed ? (
                          <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#991B1B' }}>⚠️ Missed</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Summary / Notes if any */}
                    {c.summary ? (
                      <View style={{ backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8 }}>
                        <Text style={{ fontSize: 12, color: '#334155', fontStyle: 'italic' }}>
                          "{c.summary}"
                        </Text>
                      </View>
                    ) : null}

                    {/* Actions Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 }}>
                      {!isConverted ? (
                        <Pressable
                          accessibilityRole="button"
                          disabled={convertingId === c.id}
                          onPress={() => void handleConvertToLead(c)}
                          style={{
                            flex: 1.3,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            backgroundColor: colors.brand,
                            paddingVertical: 7,
                            borderRadius: 10,
                            opacity: convertingId === c.id ? 0.6 : 1,
                          }}
                        >
                          <MaterialIcons name="person-add" size={14} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>
                            {convertingId === c.id ? 'Converting…' : '+ Save Lead'}
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => router.push(`/leads?search=${encodeURIComponent(number)}` as any)}
                          style={{
                            flex: 1.3,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            backgroundColor: '#F1F5F9',
                            paddingVertical: 7,
                            borderRadius: 10,
                          }}
                        >
                          <MaterialIcons name="launch" size={14} color="#334155" />
                          <Text style={{ color: '#334155', fontSize: 11.5, fontWeight: '700' }}>
                            View in Leads
                          </Text>
                        </Pressable>
                      )}

                      {/* WhatsApp Follow-up */}
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => handleWhatsApp(number, isMissed)}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          backgroundColor: '#25D366',
                          paddingVertical: 7,
                          borderRadius: 10,
                        }}
                      >
                        <MaterialIcons name="chat" size={14} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' }}>WhatsApp</Text>
                      </Pressable>

                      {/* Callback */}
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => handleStartCall(number)}
                        style={{
                          width: 36,
                          height: 32,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#F1F5F9',
                          borderRadius: 10,
                        }}
                      >
                        <MaterialIcons name="phone" size={16} color={colors.ink} />
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* MANUAL LOG CALL MODAL */}
      <Modal visible={logModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>Log a Phone Call</Text>
              <Pressable accessibilityRole="button" onPress={() => setLogModalOpen(false)}>
                <MaterialIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            <Field
              label="Phone Number"
              value={logPhone}
              onChangeText={setLogPhone}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
            />

            {/* Direction chips */}
            <View style={{ gap: 4 }}>
              <Text style={ui.label}>Call Direction</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['inbound', 'outbound', 'missed'] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setLogType(t)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: 'center',
                      borderRadius: 10,
                      backgroundColor: logType === t ? colors.brand : '#F1F5F9',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: logType === t ? '#FFFFFF' : '#334155' }}>
                      {t.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {logType !== 'missed' && (
              <Field
                label="Duration (minutes)"
                value={logDurationMin}
                onChangeText={setLogDurationMin}
                keyboardType="numeric"
                placeholder="2"
              />
            )}

            <Field
              label="Notes & Requirements"
              value={logNotes}
              onChangeText={setLogNotes}
              placeholder="e.g. Inquired about full AC servicing on weekend…"
            />

            {/* Create Lead Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Save as CRM Lead</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>Automatically adds caller to your Leads pipeline</Text>
              </View>
              <Switch value={logCreateLead} onValueChange={setLogCreateLead} trackColor={{ true: colors.brand, false: '#CBD5E1' }} />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Action label="Cancel" secondary onPress={() => setLogModalOpen(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  label={logSubmitting ? 'Saving…' : 'Save Call'}
                  disabled={logSubmitting}
                  onPress={() => void handleSaveManualLog()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
      {/* POST-CALL PROMPT MODAL (Salestrail / Grexa style post-call capture) */}
      <Modal visible={Boolean(postCallPrompt)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="call-end" size={24} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>Call Ended</Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                  {postCallPrompt?.number} • {postCallPrompt?.durationSec}s
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 18 }}>
              Would you like to log this conversation as a CRM lead or send a quick WhatsApp follow-up?
            </Text>

            <View style={{ gap: 8, marginTop: 4 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (postCallPrompt) {
                    setLogPhone(postCallPrompt.number);
                    setLogType('outbound');
                    setLogDurationMin(Math.max(1, Math.round(postCallPrompt.durationSec / 60)).toString());
                    setLogOutcome('interested');
                    setLogCreateLead(true);
                    setPostCallPrompt(null);
                    setLogModalOpen(true);
                  }
                }}
                style={({ pressed }) => ({
                  backgroundColor: colors.brand,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <MaterialIcons name="person-add" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Save as CRM Lead</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (postCallPrompt) {
                    const num = postCallPrompt.number;
                    setPostCallPrompt(null);
                    handleWhatsApp(num, false);
                  }
                }}
                style={({ pressed }) => ({
                  backgroundColor: '#25D366',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <MaterialIcons name="chat" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>WhatsApp Follow-up</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setPostCallPrompt(null)}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 13 }}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
});
