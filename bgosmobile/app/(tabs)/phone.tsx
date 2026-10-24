import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
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
import { WEB_URL } from '../../src/lib/constants';
import { getBgosWebUrl } from '../../src/lib/bgos-urls';

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
  const resource = useResource<{
    calls: Call[];
    stats: { total: number; totalDurationSec: number; todayCount: number } | null;
  }>('/api/vapi/calls?limit=50');

  const [activeTab, setActiveTab] = useState<'dialpad' | 'recent' | 'voicemail'>('dialpad');
  const [dialNumber, setDialNumber] = useState('');
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const calls =
    resource.data?.calls.filter((c) =>
      `${c.customerPhone || ''} ${c.fromNumber || ''} ${c.toNumber || ''}`.includes(search)
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
      setError('Unable to open the device phone app. Please call from a phone-enabled device.');
    }
  }

  return (
    <Screen
      title="Business Phone"
      subtitle="AI Receptionist · Call deflection & voice logs."
      showBack={true}
      onRefresh={resource.refresh}

    >
      <ErrorNotice message={error || resource.error} retry={resource.refresh} />

      {/* Main Number Banner Card */}
      <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 16 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>
              Business calls
            </Text>
            <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>
              Call history and device dialer
            </Text>
          </View>
          <View style={[ui.iconTile, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
            <MaterialIcons name="phone" size={22} color={colors.accent} />
          </View>
        </View>

        <View style={[ui.row, { justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.12)' }]}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
              {resource.data?.stats?.todayCount ?? '—'}
            </Text>
            <Text style={{ fontSize: 11, color: '#D1EAE5' }}>Calls Today</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
              {resource.data?.stats ? `${Math.round(resource.data.stats.totalDurationSec / 60)} min` : '—'}
            </Text>
            <Text style={{ fontSize: 11, color: '#D1EAE5' }}>Talk Time</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.accent }}>
              {resource.data?.stats?.total ?? '—'}
            </Text>
            <Text style={{ fontSize: 11, color: '#D1EAE5' }}>Total Calls</Text>
          </View>
        </View>
      </Card>

      {/* Tab Switcher: Dialpad, Recent, Voicemail */}
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Chip
          label="Dialpad"
          selected={activeTab === 'dialpad'}
          onPress={() => setActiveTab('dialpad')}
        />
        <Chip
          label="Recent Calls"
          count={calls.length}
          selected={activeTab === 'recent'}
          onPress={() => setActiveTab('recent')}
        />
        <Chip
          label="Voicemail"
          selected={activeTab === 'voicemail'}
          onPress={() => setActiveTab('voicemail')}
        />
      </View>

      {/* DIALPAD TAB */}
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

      {/* RECENT CALLS TAB */}
      {activeTab === 'recent' && (
        <>
          <Field
            label="Search recent calls"
            value={search}
            onChangeText={setSearch}
            keyboardType="phone-pad"
            placeholder="Search phone number or caller…"
          />

          <ErrorNotice message={resource.error} retry={resource.refresh} />
      {resource.loading ? (
            <Loading />
          ) : !calls.length ? (
            <Empty
              title="No calls recorded yet"
              detail="Inbound and outbound calls handled by your receptionist will be listed here."
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
                            ? 'call-received'
                            : 'call-missed'
                        }
                        size={20}
                        color={c.status === 'completed' ? colors.success : colors.danger}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={ui.heading}>{number}</Text>
                      <Text style={ui.caption}>
                        {c.durationSec ? `${Math.round(c.durationSec)}s · ` : ''}
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    <View style={{ gap: 6, alignItems: 'flex-end' }}>
                      <Badge label={c.status} success={c.status === 'completed'} danger={c.status === 'missed'} />
                      <Text style={{ fontSize: 11, color: colors.brand, fontWeight: '700' }}>Review & Actions →</Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          )}
        </>
      )}

      {activeTab === 'voicemail' && (
        <Empty title="Voicemail is managed on the web" detail="Open Business Phone on BGOS web to review available voicemail records." />
      )}

      {/* AI Receptionist Status Footer */}
      <Card>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={[ui.row, { gap: 10 }]}>
            <MaterialIcons name="record-voice-over" size={24} color={colors.brand} />
            <View>
              <Text style={ui.heading}>AI Receptionist Settings</Text>
              <Text style={ui.caption}>Manage your business numbers, routing and assistant</Text>
            </View>
          </View>
        </View>
        <Action
          secondary
          label="Configure Voice Model · Web"
          icon="settings"
          onPress={() => Linking.openURL(getBgosWebUrl('aiReceptionist')).catch(() => {})}
        />
      </Card>

      {/* POST-CALL DETAILS & 4-ACTION SUITE MODAL (Screen 11 in mockups) */}
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

// Post-Call Details & 4-Action Suite (Screen 11 in reference mockup)
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
      title="Call Details"
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
              label={`${call.status === 'completed' ? 'Completed' : call.status} · ${durationText}`}
              success={call.status === 'completed'}
            />
          </Card>

          {/* Audio Player Scrubber (Screen 11) */}
          <Text style={ui.caption}>Recordings can be reviewed securely in Business Phone on BGOS web.</Text>

          {/* 4 Instant Post-Call Actions (Screen 11 bottom bar) */}
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
                label="💬 Follow-up WhatsApp"
                secondary
                onPress={() => {
                  const digits = number.replace(/\D/g, '');
                  if (!digits) {
                    Alert.alert('Invalid Number', 'No valid phone number for WhatsApp message.');
                    return;
                  }
                  Linking.openURL(
                    `https://wa.me/${digits}?text=${encodeURIComponent(
                      'Hi, thank you for contacting us today! Here are the details you requested.'
                    )}`
                  ).catch(() => {});
                }}
              />
            </View>
            <View style={{ flex: 1, minWidth: '45%' }}>
              <Action
                label="📢 Add to Campaign"
                secondary
                onPress={() => onNavigate('/outreach')}
              />
            </View>
          </View>

          {/* 3 Detail Tabs: Summary, Transcript, Notes */}
          <View style={[ui.row, { justifyContent: 'space-between', marginTop: 10 }]}>
            <Chip label="AI Summary" selected={activeTab === 'summary'} onPress={() => setActiveTab('summary')} />
            <Chip label="Transcript" selected={activeTab === 'transcript'} onPress={() => setActiveTab('transcript')} />
          </View>

          {activeTab === 'summary' && (
            <Card>
              <View style={[ui.row, { gap: 8 }]}>
                <MaterialIcons name="auto-awesome" size={20} color={colors.brand} />
                <Text style={ui.heading}>AI Receptionist Summary</Text>
              </View>
              <Text style={[ui.body, { color: colors.ink, lineHeight: 22 }]}>
                {call.summary || 'No summary is available for this call.'}
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
                      {m.role === 'assistant' ? '🤖 AI Receptionist' : 'Caller (Customer)'}
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
