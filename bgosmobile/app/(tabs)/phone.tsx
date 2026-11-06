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
  lead?: { id: string; name: string; status: string; value: number } | null;
};

type CallStats = {
  total: number;
  todayCount: number;
  missedCount: number;
  convertedCount: number;
  followupCount?: number;
};

type CallsResponse = {
  calls: Call[];
  stats: CallStats;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CallerLookup = {
  matched: boolean;
  type?: 'lead' | 'customer';
  caller?: {
    id: string;
    name: string;
    phone: string;
    status?: string;
    value?: number;
    serviceType?: string;
    isCustomer?: boolean;
  };
};

export default function PhoneScreen() {
  const router = useRouter();
  const { open } = useLocalSearchParams<{ open?: string }>();

  // Fetch calls & live stats
  const callsResource = useResource<CallsResponse>('/api/calls?limit=50');

  const [activeTab, setActiveTab] = useState<'all' | 'missed' | 'followup' | 'converted' | 'dialpad'>('all');
  useEffect(() => {
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

  // SalesTrail Caller ID Lookup on Dialpad
  const [dialerCallerId, setDialerCallerId] = useState<CallerLookup | null>(null);

  useEffect(() => {
    const clean = dialNumber.replace(/\D/g, '');
    if (clean.length >= 7) {
      let active = true;
      apiRequest<CallerLookup>(`/api/calls/lookup?phone=${encodeURIComponent(clean)}`)
        .then((res) => {
          if (active && res.matched) setDialerCallerId(res);
          else if (active) setDialerCallerId(null);
        })
        .catch(() => {
          if (active) setDialerCallerId(null);
        });
      return () => {
        active = false;
      };
    } else {
      setDialerCallerId(null);
    }
  }, [dialNumber]);

  // Post-Call prompt detector: triggers when returning to BGOS from native phone dialer
  const [postCallPrompt, setPostCallPrompt] = useState<{
    number: string;
    callerInfo?: CallerLookup['caller'] | null;
  } | null>(null);
  const pendingCallRef = useRef<{ number: string; startedAt: number } | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && pendingCallRef.current) {
        const callInfo = pendingCallRef.current;
        pendingCallRef.current = null;

        // Perform instant Caller ID resolution
        apiRequest<CallerLookup>(`/api/calls/lookup?phone=${encodeURIComponent(callInfo.number)}`)
          .then((res) => {
            setPostCallPrompt({
              number: callInfo.number,
              callerInfo: res.matched && res.caller ? res.caller : null,
            });
          })
          .catch(() => {
            setPostCallPrompt({ number: callInfo.number, callerInfo: null });
          });
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
  const [logOutcome, setLogOutcome] = useState('connected');
  const [logNotes, setLogNotes] = useState('');
  const [logCreateLead, setLogCreateLead] = useState(true);
  const [logSubmitting, setLogSubmitting] = useState(false);

  const stats = callsResource.data?.stats;
  const rawCalls = callsResource.data?.calls || [];

  const calls = rawCalls.filter((c) => {
    const num = (c.customerPhone || c.fromNumber || c.toNumber || '').toLowerCase();
    const sum = (c.summary || '').toLowerCase();
    const leadName = (c.lead?.name || '').toLowerCase();
    const matchesSearch =
      !search ||
      num.includes(search.toLowerCase()) ||
      sum.includes(search.toLowerCase()) ||
      leadName.includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'missed') {
      return (
        c.callType === 'missed' ||
        c.status === 'missed' ||
        ['no-answer', 'busy', 'missed', 'rejected', 'canceled'].includes(c.endedReason || '')
      );
    }
    if (activeTab === 'followup') {
      return (
        c.outcomeType === 'followup' ||
        c.endedReason === 'followup' ||
        (c.summary || '').toLowerCase().includes('follow-up') ||
        (c.summary || '').toLowerCase().includes('callback')
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
          name: call.lead?.name || `Caller ${phone.slice(-4)}`,
          notes: call.summary || `Converted from ${call.callType} call (${call.durationSec || 0}s)`,
        },
      });

      if (res.success) {
        setNotice(`✓ Call converted to CRM Lead!`);
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
      const durationSec = Math.max(0, (parseInt(logDurationMin, 10) || 0) * 60);
      const res = await apiRequest<{ success: boolean; call: Call }>('/api/calls', {
        method: 'POST',
        body: {
          customerPhone: cleanPhone,
          callType: logType,
          durationSec,
          outcomeType: logOutcome,
          summary: logNotes.trim() || undefined,
          createLead: logCreateLead,
          leadName: `Caller ${cleanPhone.slice(-4)}`,
        },
      });

      if (res.success) {
        setNotice(`✓ Call logged successfully${logCreateLead ? ' & added to CRM' : ''}!`);
        setTimeout(() => setNotice(null), 4000);
        setLogModalOpen(false);
        // Reset form
        setLogPhone('');
        setLogNotes('');
        setLogDurationMin('2');
        setLogOutcome('connected');
        setLogCreateLead(true);
        await callsResource.refresh();
      }
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Could not save call log.');
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
          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>{notice}</Text>
        </View>
      ) : null}

      {/* TOP KPI CARDS */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
        {/* Today's Calls */}
        <View
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            padding: 10,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            gap: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.muted }}>Today</Text>
            <MaterialIcons name="phone-in-talk" size={13} color={colors.brand} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.ink }}>
            {stats?.todayCount ?? rawCalls.length}
          </Text>
          <Text style={{ fontSize: 10, color: colors.muted }}>Calls</Text>
        </View>

        {/* Missed Calls */}
        <View
          style={{
            flex: 1,
            backgroundColor: (stats?.missedCount || 0) > 0 ? '#FFFBEB' : '#FFFFFF',
            borderRadius: 14,
            padding: 10,
            borderWidth: 1,
            borderColor: (stats?.missedCount || 0) > 0 ? '#FDE68A' : '#E2E8F0',
            gap: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: (stats?.missedCount || 0) > 0 ? '#B45309' : colors.muted }}>
              Missed
            </Text>
            <MaterialIcons name="call-missed" size={13} color={(stats?.missedCount || 0) > 0 ? '#D97706' : colors.muted} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: (stats?.missedCount || 0) > 0 ? '#B45309' : colors.ink }}>
            {stats?.missedCount ?? 0}
          </Text>
          <Text style={{ fontSize: 10, color: (stats?.missedCount || 0) > 0 ? '#D97706' : colors.muted }}>
            Callback
          </Text>
        </View>

        {/* Follow-up Queue */}
        <View
          style={{
            flex: 1,
            backgroundColor: (stats?.followupCount || 0) > 0 ? '#EFF6FF' : '#FFFFFF',
            borderRadius: 14,
            padding: 10,
            borderWidth: 1,
            borderColor: (stats?.followupCount || 0) > 0 ? '#BFDBFE' : '#E2E8F0',
            gap: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: (stats?.followupCount || 0) > 0 ? '#1D4ED8' : colors.muted }}>
              Follow-up
            </Text>
            <MaterialIcons name="schedule" size={13} color={(stats?.followupCount || 0) > 0 ? '#2563EB' : colors.muted} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: (stats?.followupCount || 0) > 0 ? '#1D4ED8' : colors.ink }}>
            {stats?.followupCount ?? 0}
          </Text>
          <Text style={{ fontSize: 10, color: (stats?.followupCount || 0) > 0 ? '#2563EB' : colors.muted }}>
            Quotes/Call
          </Text>
        </View>

        {/* Converted to Leads */}
        <View
          style={{
            flex: 1,
            backgroundColor: '#F0FDF4',
            borderRadius: 14,
            padding: 10,
            borderWidth: 1,
            borderColor: '#BBF7D0',
            gap: 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#166534' }}>Leads</Text>
            <MaterialIcons name="person-add" size={13} color="#16a34a" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#15803D' }}>
            {stats?.convertedCount ?? 0}
          </Text>
          <Text style={{ fontSize: 10, color: '#16a34a' }}>In CRM</Text>
        </View>
      </View>

      {/* FILTER TABS (SalesTrail & CRM Workflow) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 6 }}>
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
          label="Follow-up ⏳"
          count={stats?.followupCount ?? 0}
          selected={activeTab === 'followup'}
          onPress={() => setActiveTab('followup')}
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
      </ScrollView>

      {/* KEYPAD TAB */}
      {activeTab === 'dialpad' && (
        <Card style={{ paddingVertical: 18, gap: 14 }}>
          {/* Caller ID Match Banner */}
          {dialerCallerId?.matched && dialerCallerId.caller ? (
            <View
              style={{
                backgroundColor: '#DCFCE7',
                padding: 10,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MaterialIcons name="verified-user" size={18} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>
                  {dialerCallerId.caller.name}
                </Text>
                <Text style={{ fontSize: 11, color: '#15803D' }}>
                  {dialerCallerId.caller.isCustomer
                    ? 'Existing Client'
                    : `CRM Lead: ${(dialerCallerId.caller.status || 'Active').toUpperCase()}`}
                  {dialerCallerId.caller.value ? ` • \$${dialerCallerId.caller.value}` : ''}
                </Text>
              </View>
            </View>
          ) : null}

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
            label="Search by caller, number or notes"
            value={search}
            onChangeText={setSearch}
            keyboardType="default"
            placeholder="Search caller name or number…"
          />

          {callsResource.loading ? (
            <Loading />
          ) : !calls.length ? (
            <Empty
              title={
                activeTab === 'missed'
                  ? 'No missed calls 🎉'
                  : activeTab === 'followup'
                  ? 'No pending follow-ups'
                  : activeTab === 'converted'
                  ? 'No leads converted yet'
                  : 'No calls recorded'
              }
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
                  ['no-answer', 'busy', 'missed', 'rejected', 'canceled'].includes(c.endedReason || '');
                const isOutbound = c.callType === 'outbound';
                const isConverted = Boolean(c.leadId);
                const callerTitle = c.lead?.name || `Caller ${number.slice(-4)}`;

                return (
                  <View
                    key={c.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isMissed ? '#FDE68A' : '#E2E8F0',
                      padding: 14,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Avatar name={c.lead?.name || number} size={38} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink }} numberOfLines={1}>
                              {callerTitle}
                            </Text>
                            {c.lead ? (
                              <View
                                style={{
                                  backgroundColor: '#DCFCE7',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#166534' }}>
                                  CRM LEAD
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={{ fontSize: 12, color: colors.muted }}>{number}</Text>
                        </View>
                      </View>

                      {/* Call Type Pill */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                          backgroundColor: isMissed ? '#FEF3C7' : isOutbound ? '#EFF6FF' : '#F0FDF4',
                        }}
                      >
                        <MaterialIcons
                          name={isMissed ? 'call-missed' : isOutbound ? 'call-made' : 'call-received'}
                          size={13}
                          color={isMissed ? '#D97706' : isOutbound ? '#2563EB' : '#16A34A'}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: isMissed ? '#B45309' : isOutbound ? '#1D4ED8' : '#15803D',
                          }}
                        >
                          {isMissed ? 'Missed' : isOutbound ? 'Outbound' : 'Inbound'}
                        </Text>
                      </View>
                    </View>

                    {/* Summary / Notes if present */}
                    {c.summary ? (
                      <View style={{ backgroundColor: '#F8FAFC', padding: 8, borderRadius: 10 }}>
                        <Text style={{ fontSize: 12, color: colors.ink, lineHeight: 16 }}>{c.summary}</Text>
                      </View>
                    ) : null}

                    {/* Metadata bar */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        {c.durationSec ? `${Math.round(c.durationSec)}s conversation` : 'No duration recorded'} •{' '}
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>

                      {isConverted ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <MaterialIcons name="check-circle" size={13} color="#16A34A" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Lead Saved</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Quick Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
                      {!isConverted && (
                        <Pressable
                          accessibilityRole="button"
                          disabled={convertingId === c.id}
                          onPress={() => void handleConvertToLead(c)}
                          style={({ pressed }) => ({
                            flex: 1,
                            backgroundColor: colors.brandSoft,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            opacity: convertingId === c.id ? 0.5 : pressed ? 0.8 : 1,
                          })}
                        >
                          <MaterialIcons name="person-add" size={14} color={colors.brand} />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.brand }}>
                            {convertingId === c.id ? 'Saving…' : '+ Save Lead'}
                          </Text>
                        </Pressable>
                      )}

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => handleWhatsApp(number, isMissed)}
                        style={({ pressed }) => ({
                          flex: 1,
                          backgroundColor: '#DCFCE7',
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <MaterialIcons name="chat" size={14} color="#16A34A" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>WhatsApp</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void handleStartCall(number)}
                        style={({ pressed }) => ({
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#F1F5F9',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <MaterialIcons name="phone" size={18} color={colors.ink} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* MANUAL LOG MODAL */}
      <Modal visible={logModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>Log a Phone Call</Text>
              <Pressable onPress={() => setLogModalOpen(false)}>
                <MaterialIcons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <Field
              label="Customer Phone Number"
              value={logPhone}
              onChangeText={setLogPhone}
              keyboardType="phone-pad"
              placeholder="+1 555-0199"
            />

            {/* Call Direction */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Direction</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
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
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: logType === t ? '#FFFFFF' : colors.ink,
                      }}
                    >
                      {t.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Call Outcome */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>Outcome</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[
                  ['connected', 'Spoke / Interested'],
                  ['followup', 'Follow-up Needed'],
                  ['missed', 'No Answer'],
                  ['cancelled', 'Cancelled / Busy'],
                ].map(([val, lbl]) => (
                  <Pressable
                    key={val}
                    onPress={() => setLogOutcome(val)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      backgroundColor: logOutcome === val ? colors.brandSoft : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: logOutcome === val ? colors.brand : '#E2E8F0',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '700',
                        color: logOutcome === val ? colors.brand : colors.ink,
                      }}
                    >
                      {lbl}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {logType !== 'missed' && (
              <Field
                label="Approx. Duration (minutes)"
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

      {/* SALES-TRAIL POST-CALL PROMPT MODAL */}
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
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 1 }}>
                  {postCallPrompt?.number}
                </Text>
              </View>
            </View>

            {/* Caller ID Match Display */}
            {postCallPrompt?.callerInfo ? (
              <View style={{ backgroundColor: '#F0FDF4', padding: 10, borderRadius: 12, gap: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534' }}>
                  👤 {postCallPrompt.callerInfo.name}
                </Text>
                <Text style={{ fontSize: 11, color: '#15803D' }}>
                  {postCallPrompt.callerInfo.isCustomer
                    ? 'Existing Client'
                    : `CRM Lead: ${(postCallPrompt.callerInfo.status || 'Active').toUpperCase()}`}
                  {postCallPrompt.callerInfo.value ? ` • \$${postCallPrompt.callerInfo.value}` : ''}
                </Text>
              </View>
            ) : null}

            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
              Did you speak with the customer?
            </Text>

            {/* Honest Outcome Confirmation Options */}
            <View style={{ gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (postCallPrompt) {
                    setLogPhone(postCallPrompt.number);
                    setLogType('outbound');
                    setLogDurationMin('2');
                    setLogOutcome('connected');
                    setLogCreateLead(true);
                    setPostCallPrompt(null);
                    setLogModalOpen(true);
                  }
                }}
                style={({ pressed }) => ({
                  backgroundColor: colors.brand,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                    Spoke with Customer
                  </Text>
                  <Text style={{ color: '#D1FAE5', fontSize: 11 }}>Save notes & add to CRM</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (postCallPrompt) {
                    setLogPhone(postCallPrompt.number);
                    setLogType('outbound');
                    setLogDurationMin('2');
                    setLogOutcome('followup');
                    setLogNotes('Follow-up call needed');
                    setLogCreateLead(true);
                    setPostCallPrompt(null);
                    setLogModalOpen(true);
                  }
                }}
                style={({ pressed }) => ({
                  backgroundColor: '#2563EB',
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <MaterialIcons name="schedule" size={18} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                    Callback / Follow-up Needed
                  </Text>
                  <Text style={{ color: '#DBEAFE', fontSize: 11 }}>Schedule reminder in queue</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (postCallPrompt) {
                    const num = postCallPrompt.number;
                    setPostCallPrompt(null);
                    handleWhatsApp(num, true);
                  }
                }}
                style={({ pressed }) => ({
                  backgroundColor: '#25D366',
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <MaterialIcons name="chat" size={18} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 }}>
                    Send WhatsApp Message
                  </Text>
                  <Text style={{ color: '#DCFCE7', fontSize: 11 }}>Send 1-tap template message</Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setPostCallPrompt(null)}
                style={({ pressed }) => ({
                  paddingVertical: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 12.5 }}>Dismiss</Text>
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
