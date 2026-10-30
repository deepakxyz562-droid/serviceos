import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  Share,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
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
import { getBgosWebUrl } from '../../src/lib/bgos-urls';

type DedicatedNumber = {
  id: string;
  number: string;
  displayName?: string | null;
  status: 'pending' | 'active' | 'suspended' | 'released' | 'failed';
  voiceMode?: 'forward' | 'voicemail' | 'ai_vapi';
  forwardToPhone?: string | null;
  forwardToVoicemail?: boolean;
};

type Call = {
  id: string;
  customerPhone?: string;
  fromNumber?: string;
  toNumber?: string;
  callType?: string;
  status: string;
  createdAt: string;
  durationSec?: number;
  summary?: string;
  transcript?: { role: string; content: string }[];
};

export default function PhoneScreen() {
  const router = useRouter();

  // 1. Live dedicated phone numbers from tenant
  const numbersResource = useResource<{ numbers: DedicatedNumber[] }>('/api/sms/numbers');

  // 2. Call history & live stats
  const callsResource = useResource<{
    calls: Call[];
    stats: { total: number; totalDurationSec: number; todayCount: number } | null;
  }>('/api/vapi/calls?limit=50');

  const [activeTab, setActiveTab] = useState<'recent' | 'forwarding' | 'dialpad'>('recent');
  const [dialNumber, setDialNumber] = useState('');
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const dedicatedNumbers = numbersResource.data?.numbers || [];
  const primaryNumber = dedicatedNumbers.find((n) => n.status === 'active') || dedicatedNumbers[0];
  const cleanAiNumber = primaryNumber ? primaryNumber.number.replace(/[^\d+]/g, '') : '';

  const calls =
    callsResource.data?.calls.filter((c) =>
      `${c.customerPhone || ''} ${c.fromNumber || ''} ${c.toNumber || ''} ${c.summary || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ) || [];

  function handleDigit(d: string) {
    if (dialNumber.length < 15) setDialNumber((prev) => prev + d);
  }

  function handleDelete() {
    setDialNumber((prev) => prev.slice(0, -1));
  }

  async function handleStartCall(numberToCall?: string) {
    const num = (numberToCall || dialNumber).replace(/[\s()-]/g, '');
    if (!/^\+?\d{7,15}$/.test(num)) {
      setError('Please dial a valid phone number.');
      return;
    }
    setError(null);
    try {
      await Linking.openURL(`tel:${num}`);
    } catch {
      setError('Unable to open the phone app. Please dial from a phone-enabled device.');
    }
  }

  async function handleDialUssd(code: string) {
    try {
      // Encode # as %23 for tel: URLs
      const encoded = `tel:${encodeURIComponent(code)}`;
      await Linking.openURL(encoded);
    } catch {
      Alert.alert(
        'Dial Code',
        `Open your phone keypad and dial:\n\n${code}\n\nThis configures your mobile carrier to route calls to your AI Receptionist.`
      );
    }
  }

  async function handleShareCode(code: string, label: string) {
    try {
      await Share.share({
        message: code,
        title: label,
      });
    } catch {
      // User dismissed share
    }
  }

  const handleRefresh = () => {
    numbersResource.refresh();
    callsResource.refresh();
  };

  return (
    <Screen
      title="AI Voice Receptionist"
      subtitle="24/7 Call answering, SIM redirection & voice intelligence."
      showBack={true}
      onRefresh={handleRefresh}
      extraBottomPadding={70}
    >
      <ErrorNotice message={error || callsResource.error || numbersResource.error} retry={handleRefresh} />

      {/* DEDICATED AI PHONE LINE STATUS CARD */}
      {primaryNumber ? (
        <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 16 }}>
          <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={[ui.row, { gap: 6, marginBottom: 4 }]}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399' }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#34D399', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  AI Receptionist Online
                </Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>
                {primaryNumber.displayName ? `${primaryNumber.displayName}` : primaryNumber.number}
              </Text>
              {primaryNumber.displayName && (
                <Text style={{ fontSize: 13, color: '#D1EAE5', fontWeight: '500', marginTop: 2 }}>
                  {primaryNumber.number}
                </Text>
              )}
              <Text style={{ fontSize: 12, color: '#A7F3D0', marginTop: 4 }}>
                {primaryNumber.voiceMode === 'ai_vapi' || !primaryNumber.voiceMode
                  ? '⚡ Answers customer calls instantly on 1st ring'
                  : `Forwarding to ${primaryNumber.forwardToPhone || 'device'}`}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleStartCall(primaryNumber.number)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <MaterialIcons name="phone-in-talk" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Test AI</Text>
            </Pressable>
          </View>

          {/* Call Stats Bar */}
          <View
            style={[
              ui.row,
              {
                justifyContent: 'space-between',
                marginTop: 14,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255, 255, 255, 0.15)',
              },
            ]}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                {callsResource.data?.stats?.todayCount ?? '0'}
              </Text>
              <Text style={{ fontSize: 11, color: '#D1EAE5' }}>Calls Today</Text>
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
                {callsResource.data?.stats ? `${Math.round(callsResource.data.stats.totalDurationSec / 60)}m` : '0m'}
              </Text>
              <Text style={{ fontSize: 11, color: '#D1EAE5' }}>AI Talk Time</Text>
            </View>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.accent }}>
                {callsResource.data?.stats?.total ?? calls.length}
              </Text>
              <Text style={{ fontSize: 11, color: '#D1EAE5' }}>Total Handled</Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A', padding: 16 }}>
          <View style={[ui.row, { gap: 12, alignItems: 'flex-start' }]}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FEF3C7',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="phone-disabled" size={22} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#92400E' }}>
                No Dedicated AI Line Assigned
              </Text>
              <Text style={{ fontSize: 12, color: '#B45309', marginTop: 4, lineHeight: 18 }}>
                To let your AI assistant automatically answer customer calls 24/7, assign or purchase a dedicated phone number in your Web Dashboard.
              </Text>
              <View style={{ marginTop: 12 }}>
                <Action
                  label="🛒 Purchase / Assign Line (Web)"
                  onPress={() => Linking.openURL(getBgosWebUrl('aiReceptionist')).catch(() => {})}
                />
              </View>
            </View>
          </View>
        </Card>
      )}

      {/* TAB SWITCHER */}
      <View style={[ui.row, { justifyContent: 'space-between', gap: 6 }]}>
        <Chip
          label="Recent AI Calls"
          count={calls.length}
          selected={activeTab === 'recent'}
          onPress={() => setActiveTab('recent')}
        />
        <Chip
          label="SIM Call Forwarding"
          selected={activeTab === 'forwarding'}
          onPress={() => setActiveTab('forwarding')}
        />
        <Chip
          label="Keypad"
          selected={activeTab === 'dialpad'}
          onPress={() => setActiveTab('dialpad')}
        />
      </View>

      {/* TAB 1: RECENT AI CALLS */}
      {activeTab === 'recent' && (
        <>
          <Field
            label="Search call records"
            value={search}
            onChangeText={setSearch}
            keyboardType="default"
            placeholder="Search phone number or caller…"
          />

          {callsResource.loading ? (
            <Loading />
          ) : !calls.length ? (
            <Empty
              title="No calls recorded yet"
              detail="Customer calls handled by your AI Receptionist or forwarded from your SIM will appear here with live summaries and transcripts."
            />
          ) : (
            <Card style={{ padding: 0 }}>
              {calls.map((c, i) => {
                const number = c.customerPhone || c.fromNumber || c.toNumber || 'Unknown caller';
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    onPress={() => setSelectedCallId(c.id)}
                    style={[
                      ui.menuRow,
                      {
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: i === calls.length - 1 ? 0 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        ui.iconTile,
                        {
                          backgroundColor:
                            c.status === 'completed'
                              ? colors.successSoft
                              : colors.dangerSoft,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={
                          c.callType === 'outbound'
                            ? 'call-made'
                            : c.status === 'completed'
                            ? 'smart-toy'
                            : 'call-missed'
                        }
                        size={20}
                        color={c.status === 'completed' ? colors.success : colors.danger}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[ui.heading, { fontSize: 15 }]}>{number}</Text>
                      <Text style={[ui.caption, { marginTop: 2 }]}>
                        {c.durationSec ? `${Math.round(c.durationSec)}s · ` : ''}
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </Text>
                      {c.summary && (
                        <Text
                          numberOfLines={1}
                          style={{ fontSize: 12, color: colors.muted, marginTop: 4, fontStyle: 'italic' }}
                        >
                          "{c.summary}"
                        </Text>
                      )}
                    </View>

                    <View style={{ gap: 6, alignItems: 'flex-end' }}>
                      <Badge
                        label={c.status === 'completed' ? 'AI Answered' : c.status}
                        success={c.status === 'completed'}
                        danger={c.status === 'missed'}
                      />
                      <Text style={{ fontSize: 11, color: colors.brand, fontWeight: '700' }}>
                        View Details →
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          )}
        </>
      )}

      {/* TAB 2: SIM CALL FORWARDING / REDIRECTION SETUP */}
      {activeTab === 'forwarding' && (
        <View style={{ gap: 14 }}>
          {/* How it works info card */}
          <Card style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}>
            <View style={[ui.row, { gap: 10, alignItems: 'flex-start' }]}>
              <MaterialIcons name="phone-forwarded" size={24} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
                  Redirect Personal Mobile Calls to AI
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 }}>
                  Keep your existing Airtel, Jio, Vi, AT&T or Verizon SIM number. When you are busy or don't answer in 15 seconds, your carrier automatically routes the call to your AI Receptionist.
                </Text>
              </View>
            </View>
          </Card>

          {cleanAiNumber ? (
            <>
              {/* Option 1: Conditional Forwarding (Recommended) */}
              <Card>
                <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
                  <Text style={ui.heading}>1. Conditional Forwarding (Recommended)</Text>
                  <Badge label="Best Choice" success />
                </View>
                <Text style={[ui.caption, { lineHeight: 18 }]}>
                  Routes calls to AI only when your phone is busy, unanswered, or unreachable. You can still pick up calls yourself whenever you want.
                </Text>

                <View
                  style={{
                    backgroundColor: colors.background,
                    padding: 12,
                    borderRadius: 8,
                    marginVertical: 10,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <Text style={{ fontSize: 11, color: colors.muted, textTransform: 'uppercase', fontWeight: '700' }}>
                    Carrier Dial Code
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 2, letterSpacing: 1 }}>
                    *004*{cleanAiNumber}#
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Action
                      label="📞 Dial Code"
                      onPress={() => handleDialUssd(`*004*${cleanAiNumber}#`)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Action
                      secondary
                      label="📋 Share Code"
                      onPress={() => handleShareCode(`*004*${cleanAiNumber}#`, 'Conditional Forwarding Code')}
                    />
                  </View>
                </View>
              </Card>

              {/* Option 2: 24/7 All Calls to AI */}
              <Card>
                <Text style={ui.heading}>2. Unconditional Forwarding (Vacation / After Hours)</Text>
                <Text style={[ui.caption, { lineHeight: 18, marginTop: 4 }]}>
                  Routes 100% of incoming customer calls directly to the AI Receptionist immediately without ringing your phone.
                </Text>

                <View
                  style={{
                    backgroundColor: colors.background,
                    padding: 12,
                    borderRadius: 8,
                    marginVertical: 10,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}
                >
                  <Text style={{ fontSize: 11, color: colors.muted, textTransform: 'uppercase', fontWeight: '700' }}>
                    Carrier Dial Code
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 2, letterSpacing: 1 }}>
                    *21*{cleanAiNumber}#
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Action
                      secondary
                      label="📞 Dial Code"
                      onPress={() => handleDialUssd(`*21*${cleanAiNumber}#`)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Action
                      secondary
                      label="📋 Share Code"
                      onPress={() => handleShareCode(`*21*${cleanAiNumber}#`, 'Unconditional Forwarding Code')}
                    />
                  </View>
                </View>
              </Card>

              {/* Deactivation Card */}
              <Card>
                <Text style={ui.heading}>How to Turn Off Forwarding Anytime</Text>
                <Text style={[ui.caption, { lineHeight: 18, marginTop: 4 }]}>
                  Dial either of these codes on your mobile phone to stop forwarding and take calls normally:
                </Text>
                <View style={[ui.row, { justifyContent: 'space-between', marginTop: 8 }]}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                    Cancel Conditional: <Text style={{ color: colors.brand }}>##004#</Text>
                  </Text>
                  <Pressable onPress={() => handleDialUssd('##004#')}>
                    <Text style={{ fontSize: 12, color: colors.brand, fontWeight: '700' }}>Dial ##004#</Text>
                  </Pressable>
                </View>
                <View style={[ui.row, { justifyContent: 'space-between', marginTop: 6 }]}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
                    Cancel All: <Text style={{ color: colors.brand }}>##21#</Text>
                  </Text>
                  <Pressable onPress={() => handleDialUssd('##21#')}>
                    <Text style={{ fontSize: 12, color: colors.brand, fontWeight: '700' }}>Dial ##21#</Text>
                  </Pressable>
                </View>
              </Card>
            </>
          ) : (
            <Card style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
              <MaterialIcons name="lock-clock" size={36} color={colors.muted} />
              <Text style={[ui.heading, { textAlign: 'center' }]}>
                Purchase a Dedicated Number to Generate Forwarding Codes
              </Text>
              <Text style={[ui.caption, { textAlign: 'center', maxWidth: 300 }]}>
                Once your dedicated line is assigned, your carrier forwarding codes will automatically appear here.
              </Text>
              <Action
                label="🛒 Open Web Settings"
                onPress={() => Linking.openURL(getBgosWebUrl('aiReceptionist')).catch(() => {})}
              />
            </Card>
          )}
        </View>
      )}

      {/* TAB 3: DIALPAD / KEYPAD */}
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
            secondary
            label="Call using device phone app"
            icon="open-in-new"
            disabled={!dialNumber.trim()}
            onPress={() => handleStartCall(dialNumber)}
          />
        </Card>
      )}

      {/* AI Receptionist Settings Link */}
      <Card>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={[ui.row, { gap: 10 }]}>
            <MaterialIcons name="record-voice-over" size={24} color={colors.brand} />
            <View>
              <Text style={ui.heading}>AI Voice Prompt & Business Hours</Text>
              <Text style={ui.caption}>Customize greeting, services list, and voice persona</Text>
            </View>
          </View>
        </View>
        <Action
          secondary
          label="Manage Voice Assistant · Web"
          icon="settings"
          onPress={() => Linking.openURL(getBgosWebUrl('aiReceptionist')).catch(() => {})}
        />
      </Card>

      {/* POST-CALL DETAILS MODAL */}
      <Modal visible={!!selectedCallId} animationType="slide" onRequestClose={() => setSelectedCallId(null)}>
        {selectedCallId && (
          <CallDetailSheet
            id={selectedCallId}
            close={() => setSelectedCallId(null)}
            onNavigate={(path) => {
              setSelectedCallId(null);
              router.push(path as any);
            }}
          />
        )}
      </Modal>
    </Screen>
  );
}

// Post-Call Details Sheet
function CallDetailSheet({
  id,
  close,
  onNavigate,
}: {
  id: string;
  close: () => void;
  onNavigate: (path: string) => void;
}) {
  const resource = useResource<{ call: Call }>(
    `/api/vapi/calls?id=${encodeURIComponent(id)}`
  );
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');

  const call = resource.data?.call;
  const number = call?.customerPhone || call?.fromNumber || call?.toNumber || 'Unknown Caller';
  const durationText = call?.durationSec
    ? `${Math.floor(call.durationSec / 60)}:${String(call.durationSec % 60).padStart(2, '0')} min`
    : 'Completed';
  const formattedDate = call?.createdAt
    ? new Date(call.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Recent call';

  return (
    <Screen
      title="Call Intelligence"
      subtitle={number}
      showBack={true}
      onBack={close}
      onRefresh={resource.refresh}
      rightAction={
        <Pressable accessibilityRole="button" onPress={close}>
          <MaterialIcons name="close" size={24} color={colors.ink} />
        </Pressable>
      }
    >
      <Action label="← Back to Calls" secondary onPress={close} />

      <ErrorNotice message={resource.error} retry={resource.refresh} />
      {resource.loading ? (
        <Loading />
      ) : !call ? (
        <Empty
          title="Call record not found"
          detail="Unable to load this call recording or transcript from your business trunk."
          actionLabel="Back to Call Logs"
          onAction={close}
        />
      ) : (
        <>
          {/* Caller Header Card */}
          <Card style={{ alignItems: 'center', paddingVertical: 18, gap: 8 }}>
            <Avatar name={number} size={60} />
            <Text style={[ui.heading, { fontSize: 20 }]}>{number}</Text>
            <Text style={ui.body}>{formattedDate}</Text>
            <Badge
              label={`${call.status === 'completed' ? 'AI Answered' : call.status} · ${durationText}`}
              success={call.status === 'completed'}
            />
          </Card>

          {/* Post-Call Immediate Next Steps (Outreach removed!) */}
          <Text style={ui.heading}>Immediate Next Steps</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Action
                label="➕ Create Lead"
                onPress={() => onNavigate(`/leads?create=1&phone=${encodeURIComponent(number)}`)}
              />
            </View>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Action
                label="📅 Book Appointment"
                secondary
                onPress={() => onNavigate('/appointments')}
              />
            </View>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Action
                label="💬 WhatsApp Reply"
                secondary
                onPress={() => {
                  const digits = number.replace(/\D/g, '');
                  if (!digits) {
                    Alert.alert('Invalid Number', 'No valid phone number for WhatsApp message.');
                    return;
                  }
                  Linking.openURL(
                    `https://wa.me/${digits}?text=${encodeURIComponent(
                      'Hi, thank you for calling us! Here are the details you requested.'
                    )}`
                  ).catch(() => {});
                }}
              />
            </View>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Action
                label="📞 Call Back"
                secondary
                onPress={() => {
                  const digits = number.replace(/[^\d+]/g, '');
                  if (digits) {
                    Linking.openURL(`tel:${digits}`).catch(() => {});
                  }
                }}
              />
            </View>
          </View>

          {/* AI Summary & Transcript Tabs */}
          <View style={[ui.row, { justifyContent: 'space-between', marginTop: 10 }]}>
            <Chip label="AI Summary" selected={activeTab === 'summary'} onPress={() => setActiveTab('summary')} />
            <Chip label="Full Transcript" selected={activeTab === 'transcript'} onPress={() => setActiveTab('transcript')} />
          </View>

          {activeTab === 'summary' && (
            <Card>
              <View style={[ui.row, { gap: 8 }]}>
                <MaterialIcons name="auto-awesome" size={20} color={colors.brand} />
                <Text style={ui.heading}>AI Receptionist Summary</Text>
              </View>
              <Text style={[ui.body, { color: colors.ink, lineHeight: 22 }]}>
                {call.summary || 'The AI assistant handled this call. No structured summary is available.'}
              </Text>
            </Card>
          )}

          {activeTab === 'transcript' && (
            <Card style={{ gap: 12 }}>
              <Text style={ui.heading}>Call Transcript</Text>
              {call.transcript && call.transcript.length > 0 ? (
                call.transcript.map((m, i) => (
                  <View key={i} style={{ gap: 2 }}>
                    <Text style={[ui.label, { color: m.role === 'assistant' ? colors.brand : colors.ink }]}>
                      {m.role === 'assistant' ? '🤖 AI Receptionist' : '👤 Customer'}
                    </Text>
                    <Text style={ui.body}>{m.content}</Text>
                  </View>
                ))
              ) : (
                <Text style={ui.caption}>No audio transcript recorded for this call.</Text>
              )}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}