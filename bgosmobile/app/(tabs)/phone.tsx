import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
  AudioScrubber,
  Chip,
  ui,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { WEB_URL } from '../../src/lib/constants';

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
  const [activeCallModal, setActiveCallModal] = useState<string | null>(null);
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

  function handleStartCall(numberToCall?: string) {
    const num = numberToCall || dialNumber;
    if (!num.trim()) {
      setError('Please dial a valid phone number.');
      return;
    }
    setError(null);
    setActiveCallModal(num);
  }

  return (
    <Screen
      title="Business Phone"
      subtitle="AI Receptionist · Call deflection & voice logs."
      showBack={true}
      onRefresh={resource.refresh}
      rightAction={
        <View style={styles.onlinePill}>
          <View style={[ui.statusDot, { backgroundColor: colors.accent }]} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.hero }}>Online</Text>
        </View>
      }
    >
      <ErrorNotice message={error || resource.error} retry={resource.refresh} />

      {/* Main Number Banner Card */}
      <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 16 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>
              +91 98765 43210
            </Text>
            <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>
              Main Business Inbound Number
            </Text>
          </View>
          <View style={[ui.iconTile, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
            <MaterialIcons name="phone" size={22} color={colors.accent} />
          </View>
        </View>

        <View style={[ui.row, { justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.12)' }]}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
              {resource.data?.stats?.todayCount ?? 6}
            </Text>
            <Text style={{ fontSize: 11, color: '#D1EAE5' }}>Calls Today</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
              {Math.round((resource.data?.stats?.totalDurationSec ?? 7440) / 60)} min
            </Text>
            <Text style={{ fontSize: 11, color: '#D1EAE5' }}>Talk Time</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.accent }}>
              92%
            </Text>
            <Text style={{ fontSize: 11, color: '#D1EAE5' }}>Handled by AI</Text>
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
          count={calls.length || 8}
          selected={activeTab === 'recent'}
          onPress={() => setActiveTab('recent')}
        />
        <Chip
          label="Voicemail"
          count="1"
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
            onPress={() => Linking.openURL(`tel:${dialNumber.replace(/[^\d+]/g, '')}`).catch(() => {})}
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
                const number = c.customerPhone || c.fromNumber || '+91 98765 43210';
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

      {/* VOICEMAIL TAB */}
      {activeTab === 'voicemail' && (
        <Card style={{ gap: 14 }}>
          <Text style={ui.heading}>Recorded Voicemails</Text>
          <View style={[ui.card, { padding: 14, gap: 8 }]}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>+91 98765 11223</Text>
              <Badge label="New Voicemail" accent />
            </View>
            <Text style={ui.caption}>Left today at 11:42 AM · 48 seconds</Text>
            <AudioScrubber durationSec={48} />
            <Text style={ui.body}>
              "Hi, I wanted to inquire if you do bridal salon packages this Saturday. Please call me back."
            </Text>
            <View style={[ui.row, { gap: 8 }]}>
              <Action label="Call Back" icon="call" onPress={() => handleStartCall('+91 98765 11223')} />
              <Action secondary label="Create Lead" icon="person-add" onPress={() => router.push('/(tabs)/leads?create=1')} />
            </View>
          </View>
        </Card>
      )}

      {/* AI Receptionist Status Footer */}
      <Card>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={[ui.row, { gap: 10 }]}>
            <MaterialIcons name="record-voice-over" size={24} color={colors.brand} />
            <View>
              <Text style={ui.heading}>AI Receptionist Settings</Text>
              <Text style={ui.caption}>Call deflection & automatic meeting booking is active</Text>
            </View>
          </View>
          <Badge label="Active" success />
        </View>
        <Action
          secondary
          label="Configure Voice Model · Web"
          icon="settings"
          onPress={() => Linking.openURL(`${WEB_URL}/app?view=aiReceptionist`).catch(() => {})}
        />
      </Card>

      {/* ACTIVE CALL SIMULATOR MODAL (Screen 10 in mockups) */}
      <Modal visible={!!activeCallModal} animationType="slide">
        {activeCallModal && (
          <ActiveCallSimulator
            number={activeCallModal}
            onEndCall={() => {
              const num = activeCallModal;
              setActiveCallModal(null);
              setSelectedCallId('last-call');
            }}
          />
        )}
      </Modal>

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

// Active Call Screen (Screen 10 in reference mockup)
function ActiveCallSimulator({ number, onEndCall }: { number: string; onEndCall: () => void }) {
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [hold, setHold] = useState(false);
  const [recording, setRecording] = useState(true);

  return (
    <View style={styles.callScreenContainer}>
      {/* Top Bar with back / minimize */}
      <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onEndCall}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcons name="keyboard-arrow-down" size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={{ fontSize: 13, color: colors.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Call in Progress
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <Text style={{ fontSize: 16, color: '#FFFFFF', marginTop: 4 }}>00:42</Text>

        <View style={styles.callAvatar}>
          <Text style={{ fontSize: 36, color: colors.brand, fontWeight: '800' }}>
            {number.slice(-2)}
          </Text>
        </View>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 14 }}>
          {number}
        </Text>
        <Text style={{ fontSize: 14, color: '#D1EAE5', marginTop: 2 }}>Connected via BGOS AI Trunk</Text>

        {recording && (
          <View style={[ui.row, { gap: 6, marginTop: 10, backgroundColor: 'rgba(186, 53, 71, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
            <Text style={{ fontSize: 12, color: '#FFCCD0', fontWeight: '700' }}>AI Live Recording & Transcription</Text>
          </View>
        )}
      </View>

      {/* 6 In-call Controls: Mute, Keypad, Speaker, Add Call, Hold, Record */}
      <View style={styles.callControlGrid}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setMuted(!muted)}
          style={[styles.callControlBtn, muted && styles.callControlActive]}
        >
          <MaterialIcons name={muted ? 'mic-off' : 'mic'} size={26} color={muted ? colors.brand : '#FFFFFF'} />
          <Text style={styles.callControlLabel}>{muted ? 'Muted' : 'Mute'}</Text>
        </Pressable>

        <Pressable accessibilityRole="button" style={styles.callControlBtn}>
          <MaterialIcons name="dialpad" size={26} color="#FFFFFF" />
          <Text style={styles.callControlLabel}>Keypad</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setSpeaker(!speaker)}
          style={[styles.callControlBtn, speaker && styles.callControlActive]}
        >
          <MaterialIcons name={speaker ? 'volume-up' : 'volume-down'} size={26} color={speaker ? colors.brand : '#FFFFFF'} />
          <Text style={styles.callControlLabel}>Speaker</Text>
        </Pressable>

        <Pressable accessibilityRole="button" style={styles.callControlBtn}>
          <MaterialIcons name="person-add" size={26} color="#FFFFFF" />
          <Text style={styles.callControlLabel}>Add Call</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setHold(!hold)}
          style={[styles.callControlBtn, hold && styles.callControlActive]}
        >
          <MaterialIcons name="pause" size={26} color={hold ? colors.brand : '#FFFFFF'} />
          <Text style={styles.callControlLabel}>{hold ? 'On Hold' : 'Hold'}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setRecording(!recording)}
          style={[styles.callControlBtn, recording && styles.callControlActive]}
        >
          <MaterialIcons name="fiber-manual-record" size={26} color={recording ? colors.danger : '#FFFFFF'} />
          <Text style={styles.callControlLabel}>{recording ? 'Recording' : 'Record'}</Text>
        </Pressable>
      </View>

      {/* End Call Button */}
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Pressable
          accessibilityRole="button"
          onPress={onEndCall}
          style={styles.endCallBtn}
        >
          <MaterialIcons name="call-end" size={32} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
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
    id === 'last-call' ? '/api/vapi/calls?limit=1' : `/api/vapi/calls?id=${encodeURIComponent(id)}`
  );
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'notes'>('summary');
  const [noteText, setNoteText] = useState('');

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
          <AudioScrubber durationSec={call.durationSec || 60} />

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
            <Chip label="Notes" selected={activeTab === 'notes'} onPress={() => setActiveTab('notes')} />
          </View>

          {activeTab === 'summary' && (
            <Card>
              <View style={[ui.row, { gap: 8 }]}>
                <MaterialIcons name="auto-awesome" size={20} color={colors.brand} />
                <Text style={ui.heading}>AI Receptionist Summary</Text>
              </View>
              <Text style={[ui.body, { color: colors.ink, lineHeight: 22 }]}>
                {call.summary || 'Summary generated automatically once call transcript is processed.'}
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

          {activeTab === 'notes' && (
            <Card style={{ gap: 10 }}>
              <Text style={ui.heading}>Internal Staff Notes</Text>
              <Field
                label="Add follow-up notes"
                multiline
                value={noteText}
                onChangeText={setNoteText}
                placeholder="e.g. Followed up with pricing details on WhatsApp…"
              />
              <Action label="Save Note" disabled={!noteText.trim()} onPress={() => Alert.alert('Note Saved', 'Staff note updated.')} />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  callScreenContainer: {
    flex: 1,
    backgroundColor: colors.hero,
    justifyContent: 'space-between',
    padding: 24,
  },
  callAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  callControlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 18,
    maxWidth: 320,
    alignSelf: 'center',
    width: '100%',
  },
  callControlBtn: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callControlActive: {
    backgroundColor: '#FFFFFF',
  },
  callControlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E6F5F3',
    marginTop: 4,
  },
  endCallBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
});
