import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Action,
  Field,
  Empty,
  Loading,
  ErrorNotice,
  ui,
  colors,
  Avatar,
  Badge,
  Chip,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { useAuthStore } from '../../src/stores/auth-store';
import { apiRequest } from '../../src/lib/api';
import { WEB_URL } from '../../src/lib/constants';
import type { BgosConversation, BgosMessage, BgosWorkspace } from '../../../shared/bgos-contracts';

export default function InboxScreen() {
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 10000);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const [activeTab, setActiveTab] = useState<'inbox' | 'engage' | 'tickets'>('inbox');
  const [selected, setSelected] = useState<BgosConversation | null>(null);
  const [channelFilter, setChannelFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [ticketStatus, setTicketStatus] = useState('all');
  const [engageFilter, setEngageFilter] = useState<'browsing' | 'queued' | 'chatting' | 'supervised'>('browsing');

  const rawList = inbox.data || [];

  // Dynamic live channel counts
  const channelCounts = rawList.reduce((acc, c) => {
    const ch = (c.channel || 'web').toLowerCase();
    acc[ch] = (acc[ch] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Dynamic live ticket counts
  const ticketCounts = {
    all: rawList.length,
    unassigned: rawList.filter((c) => !c.aiPaused && c.unreadCount > 0).length,
    open: rawList.filter((c) => !c.aiPaused).length,
    pending: rawList.filter((c) => c.aiPaused).length,
    solved: rawList.filter((c) => c.status === 'closed' || c.status === 'solved').length,
  };

  const items = rawList.filter((c) => {
    const matchesSearch = `${c.customerName || ''} ${c.lastMessage || ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'inbox') {
      if (channelFilter === 'all') return true;
      if (channelFilter === 'team') return c.aiPaused;
      return (c.channel || '').toLowerCase() === channelFilter.toLowerCase();
    }

    if (activeTab === 'tickets') {
      if (ticketStatus === 'all') return true;
      if (ticketStatus === 'unassigned') return !c.aiPaused && c.unreadCount > 0;
      if (ticketStatus === 'open') return !c.aiPaused;
      if (ticketStatus === 'pending') return c.aiPaused;
      if (ticketStatus === 'solved') return c.status === 'closed' || c.status === 'solved';
      return true;
    }

    return true;
  });

  const unreadTotal = rawList.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const user = useAuthStore((s) => s.user);
  const chatLink = `${WEB_URL}/chat?workspace=${user?.workspaceId || 'live'}`;

  async function shareChatLink() {
    try {
      await Share.share({
        title: `Chat with ${workspace.data?.name || 'our team'}`,
        message: `Hello! You can chat with ${workspace.data?.name || 'our team'} directly here: ${chatLink}`,
        url: chatLink,
      });
    } catch {
      Alert.alert('Share Link', chatLink);
    }
  }

  return (
    <Screen
      title="Unified Inbox"
      subtitle="Omnichannel conversations, visitor radar & support tickets."
      onRefresh={inbox.refresh}
      showBack={false}
      rightAction={
        <Pressable accessibilityRole="button" onPress={shareChatLink} style={styles.shareHeaderBtn}>
          <MaterialIcons name="share" size={18} color={colors.brand} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>Share Link</Text>
        </Pressable>
      }
    >
      {/* 3 Top Segment Switchers: Inbox, Engage (Visitors), Tickets */}
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Chip
          label="Conversations"
          count={rawList.length}
          selected={activeTab === 'inbox'}
          onPress={() => setActiveTab('inbox')}
        />
        <Chip
          label="Engage (Visitors)"
          selected={activeTab === 'engage'}
          onPress={() => setActiveTab('engage')}
        />
        <Chip
          label="Tickets"
          count={ticketCounts.open + ticketCounts.pending}
          selected={activeTab === 'tickets'}
          onPress={() => setActiveTab('tickets')}
        />
      </View>

      <ErrorNotice message={inbox.error} retry={inbox.refresh} />

      {/* CONVERSATIONS INBOX TAB */}
      {activeTab === 'inbox' && (
        <>
          <Field
            label="Search conversations"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by customer name or message…"
          />

          {/* Dynamic Channel Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={ui.row}>
              {[
                { key: 'all', label: 'All', count: rawList.length },
                { key: 'whatsapp', label: 'WhatsApp', count: channelCounts['whatsapp'] || 0 },
                { key: 'instagram', label: 'Instagram', count: channelCounts['instagram'] || 0 },
                { key: 'messenger', label: 'Messenger', count: channelCounts['messenger'] || 0 },
                { key: 'calls', label: 'Calls', count: channelCounts['calls'] || 0 },
                { key: 'sms', label: 'SMS', count: channelCounts['sms'] || 0 },
                { key: 'team', label: 'Needs Human', count: rawList.filter((c) => c.aiPaused).length },
              ].map((ch) => (
                <Chip
                  key={ch.key}
                  label={ch.label}
                  count={ch.count}
                  selected={channelFilter === ch.key}
                  onPress={() => setChannelFilter(ch.key)}
                />
              ))}
            </View>
          </ScrollView>

          {inbox.loading ? (
            <Loading />
          ) : !items.length ? (
            <Empty
              title="You're all caught up"
              detail="No customer conversations matching this filter. New inquiries from connected channels will appear here automatically."
              actionLabel="Share Direct Chat Link"
              onAction={shareChatLink}
            />
          ) : (
            <Card style={{ padding: 0 }}>
              {items.map((c, i) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open conversation with ${c.customerName}`}
                  key={c.id}
                  onPress={() => setSelected(c)}
                  style={[
                    ui.menuRow,
                    {
                      paddingHorizontal: 16,
                      borderBottomWidth: i === items.length - 1 ? 0 : 1,
                      backgroundColor: c.unreadCount > 0 ? '#F0FDF4' : 'transparent',
                    },
                  ]}
                >
                  <View style={{ position: 'relative' }}>
                    <Avatar name={c.customerName || 'Customer'} size={46} />
                    <View
                      style={[
                        styles.channelBadgeSmall,
                        {
                          backgroundColor:
                            (c.channel || '').toLowerCase() === 'whatsapp'
                              ? '#25D366'
                              : (c.channel || '').toLowerCase() === 'instagram'
                              ? '#E1306C'
                              : colors.brand,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={
                          (c.channel || '').toLowerCase() === 'whatsapp'
                            ? 'chat'
                            : (c.channel || '').toLowerCase() === 'instagram'
                            ? 'camera-alt'
                            : 'language'
                        }
                        size={11}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={ui.heading}>{c.customerName || 'Customer'}</Text>
                      <Text style={ui.caption}>
                        {c.lastMessageTime
                          ? new Date(c.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Recent'}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={1}
                      style={[
                        ui.caption,
                        {
                          color: c.unreadCount > 0 ? colors.ink : colors.muted,
                          fontWeight: c.unreadCount > 0 ? '700' : '400',
                        },
                      ]}
                    >
                      {c.lastMessage || 'New inquiry received'}
                    </Text>

                    <View style={[ui.row, { marginTop: 4, gap: 6 }]}>
                      <Badge label={c.channel || 'Web'} accent={(c.channel || '').toLowerCase() === 'whatsapp'} />
                      {c.aiPaused ? <Badge label="With Team" danger /> : <Badge label="AI Active" success />}
                    </View>
                  </View>

                  {c.unreadCount > 0 ? (
                    <View style={styles.unreadCircle}>
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>{c.unreadCount}</Text>
                    </View>
                  ) : (
                    <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
                  )}
                </Pressable>
              ))}
            </Card>
          )}
        </>
      )}

      {/* ENGAGE (VISITOR RADAR) SCREEN */}
      {activeTab === 'engage' && (
        <View style={{ gap: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={ui.row}>
              {(['browsing', 'queued', 'chatting', 'supervised'] as const).map((k) => (
                <Chip
                  key={k}
                  label={k.charAt(0).toUpperCase() + k.slice(1)}
                  selected={engageFilter === k}
                  onPress={() => setEngageFilter(k)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Radar Globe Graphic Card */}
          <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 14 }}>
            <View style={styles.radarContainer}>
              <View style={[styles.radarRing, { width: 140, height: 140, borderColor: colors.brand }]} />
              <View style={[styles.radarRing, { width: 90, height: 90, borderColor: colors.accent }]} />
              <View style={styles.radarCenter}>
                <MaterialIcons name="public" size={36} color="#FFFFFF" />
              </View>
              <View style={[styles.radarBlip, { top: 25, right: 35 }]} />
              <View style={[styles.radarBlip, { bottom: 30, left: 30 }]} />
            </View>

            <Text style={[ui.heading, { fontSize: 18 }]}>Live Visitor Radar</Text>
            <Text style={[ui.body, { textAlign: 'center', maxWidth: 320 }]}>
              Monitor real-time visitors on your website or digital catalog. Share your direct chat link to invite customers.
            </Text>

            <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
              <Action label="🔗 Share Chat Link" icon="share" onPress={shareChatLink} />
              <Action
                secondary
                label="Preview Customer Web Chat"
                icon="open-in-new"
                onPress={() => Linking.openURL(chatLink).catch(() => {})}
              />
            </View>
          </Card>
        </View>
      )}

      {/* TICKETS VIEW */}
      {activeTab === 'tickets' && (
        <View style={{ gap: 14 }}>
          <Field
            label="Search Tickets"
            value={search}
            onChangeText={setSearch}
            placeholder="Search in all tickets…"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={ui.row}>
              {[
                { key: 'all', label: 'All Tickets', count: ticketCounts.all },
                { key: 'unassigned', label: 'Unassigned', count: ticketCounts.unassigned },
                { key: 'open', label: 'My Open', count: ticketCounts.open },
                { key: 'pending', label: 'Pending', count: ticketCounts.pending },
                { key: 'solved', label: 'Solved', count: ticketCounts.solved },
              ].map((t) => (
                <Chip
                  key={t.key}
                  label={t.label}
                  count={t.count}
                  selected={ticketStatus === t.key}
                  onPress={() => setTicketStatus(t.key)}
                />
              ))}
            </View>
          </ScrollView>

          {inbox.loading ? (
            <Loading />
          ) : !items.length ? (
            <Empty
              title="No tickets found"
              detail="Conversations requiring follow-up or customer resolution will appear here."
            />
          ) : (
            <Card style={{ padding: 0 }}>
              {items.map((c, i) => (
                <Pressable
                  key={c.id}
                  onPress={() => setSelected(c)}
                  style={[
                    ui.menuRow,
                    {
                      paddingHorizontal: 16,
                      borderBottomWidth: i === items.length - 1 ? 0 : 1,
                    },
                  ]}
                >
                  <Avatar name={c.customerName || 'Customer'} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={ui.heading}>{c.customerName || 'Customer'}</Text>
                    <Text style={ui.caption}>
                      Ticket #{c.id.slice(-4).toUpperCase()} · {c.channel}
                    </Text>
                  </View>
                  <Badge label={c.aiPaused ? 'Pending' : 'Open'} success={!c.aiPaused} />
                </Pressable>
              ))}
            </Card>
          )}
        </View>
      )}

      {/* Chat Thread Modal with Back Button & Real AI Suggestions */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <Thread
            conversation={selected}
            close={() => {
              setSelected(null);
              inbox.refresh();
            }}
          />
        )}
      </Modal>
    </Screen>
  );
}

function Thread({ conversation, close }: { conversation: BgosConversation; close: () => void }) {
  const thread = useResource<BgosMessage[]>(`/api/omnichannel/conversations/${conversation.id}/messages`, 5000);
  const [paused, setPaused] = useState(conversation.aiPaused);
  const [mode, setMode] = useState<'reply' | 'ai_reply' | 'note'>('reply');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function takeover() {
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<{ aiPaused: boolean }>(
        `/api/omnichannel/conversations/${conversation.id}/takeover`,
        { method: 'PATCH', body: { aiPaused: !paused } }
      );
      setPaused(result.aiPaused);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function generateAiReply() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ reply: string }>('/api/forms/agents/preview/chat', {
        method: 'POST',
        body: {
          message: `Suggest a helpful professional customer reply for ${conversation.customerName} on ${conversation.channel}. Context: ${conversation.lastMessage || 'General inquiry'}`,
        },
      });
      setText(res.reply || `Hi ${conversation.customerName}! Thank you for reaching out. How can we help you today?`);
    } catch {
      setText(`Hi ${conversation.customerName}! Thank you for reaching out. How can we assist you today?`);
    } finally {
      setBusy(false);
      setMode('reply');
    }
  }

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const content = mode === 'note' ? `[INTERNAL NOTE] ${text.trim()}` : text.trim();
      const result = await apiRequest<BgosMessage>(
        `/api/omnichannel/conversations/${conversation.id}/messages`,
        { method: 'POST', body: { content } }
      );
      setText('');
      if (mode === 'reply') setPaused(true);
      if (result.delivery && !['delivered', 'in_app'].includes(result.delivery.status)) {
        setError(result.delivery.error || result.delivery.reason || 'Saved, delivery confirmation pending.');
      }
      await thread.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      title={conversation.customerName || 'Customer'}
      subtitle={`${conversation.channel} · ${paused ? 'AI Paused (You are in control)' : 'AI Active'}`}
      onRefresh={thread.refresh}
      showBack={true}
      onBack={close}
      rightAction={
        <Pressable
          accessibilityRole="button"
          onPress={() => Linking.openURL(`tel:${conversation.id}`).catch(() => {})}
          style={styles.callIconBtn}
        >
          <MaterialIcons name="call" size={20} color={colors.brand} />
        </Pressable>
      }
    >
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Action label="← Back to Inbox" secondary onPress={close} />
        <Action
          label={paused ? 'Resume AI' : 'Take Over · Pause AI'}
          disabled={busy}
          secondary={!paused}
          onPress={takeover}
        />
      </View>

      <ErrorNotice message={error || thread.error} retry={thread.refresh} />

      {/* Message Stream */}
      <ScrollView style={{ minHeight: 280, maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 10, paddingVertical: 8 }}>
          {thread.loading ? (
            <Loading />
          ) : !thread.data?.length ? (
            <Empty title="No messages yet" detail="Start the conversation below." />
          ) : (
            thread.data.map((m) => {
              const isCustomer = m.sender === 'customer';
              const isNote = m.content.startsWith('[INTERNAL NOTE]');

              if (isNote) {
                return (
                  <View key={m.id} style={styles.noteBubble}>
                    <View style={[ui.row, { gap: 6 }]}>
                      <MaterialIcons name="lock" size={14} color={colors.noteText} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.noteText }}>
                        Private Team Note
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.noteText, marginTop: 4 }}>
                      {m.content.replace('[INTERNAL NOTE]', '').trim()}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.muted, marginTop: 4, alignSelf: 'flex-end' }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              }

              return (
                <View
                  key={m.id}
                  style={[
                    styles.chatBubble,
                    isCustomer ? styles.customerBubble : styles.teamBubble,
                  ]}
                >
                  <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
                    <Text style={[styles.bubbleAuthor, { color: isCustomer ? colors.brand : '#CCFBF1' }]}>
                      {isCustomer ? conversation.customerName : m.sender === 'system' ? '🤖 AI Assistant' : 'Your Team'}
                    </Text>
                  </View>
                  <Text style={[styles.bubbleText, { color: isCustomer ? colors.ink : '#FFFFFF' }]}>
                    {m.content}
                  </Text>
                  <Text style={[styles.bubbleTime, { color: isCustomer ? colors.muted : '#D1EAE5' }]}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 3-Mode Action Pill Bar: Reply, AI Reply, Note */}
      <View style={[ui.row, { justifyContent: 'space-between', backgroundColor: colors.surface, padding: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.line }]}>
        <Chip label="✍️ Reply" selected={mode === 'reply'} onPress={() => setMode('reply')} />
        <Chip label="✨ AI Suggestion" selected={mode === 'ai_reply'} onPress={generateAiReply} />
        <Chip label="🔒 Team Note" selected={mode === 'note'} onPress={() => setMode('note')} />
      </View>

      {/* Composer */}
      <Field
        label={mode === 'note' ? 'Internal Team Note (Private)' : 'Message Composer'}
        multiline
        value={text}
        onChangeText={setText}
        maxLength={5000}
        placeholder={
          mode === 'note'
            ? 'Write a private note for your team (customer will NOT see this)…'
            : 'Type your message…'
        }
      />

      <Action
        label={busy ? 'Sending…' : mode === 'note' ? 'Save Private Note' : 'Send Message'}
        icon={mode === 'note' ? 'lock' : 'send'}
        disabled={busy || !text.trim()}
        onPress={send}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  shareHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.soft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.softHover,
  },
  channelBadgeSmall: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  unreadCircle: {
    backgroundColor: colors.danger,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  radarContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 12,
  },
  radarRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    opacity: 0.35,
  },
  radarCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  radarBlip: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  callIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 16,
  },
  customerBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  teamBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand,
  },
  bubbleAuthor: {
    fontSize: 11,
    fontWeight: '700',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  noteBubble: {
    alignSelf: 'center',
    width: '95%',
    backgroundColor: colors.note,
    borderColor: colors.noteBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
  },
});
