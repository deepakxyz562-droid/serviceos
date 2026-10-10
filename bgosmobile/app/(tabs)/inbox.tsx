import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Screen, Card, Action, Field, Empty, Loading, ErrorNotice, ui, colors, Avatar, Badge, Chip } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import type { BgosConversation, BgosMessage } from '../../../shared/bgos-contracts';
export default function InboxScreen() {
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 10000);
  const [selected, setSelected] = useState<BgosConversation | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const items = inbox.data?.filter(c => (filter === 'all' || (filter === 'team' ? c.aiPaused : c.channel === filter)) && `${c.customerName} ${c.lastMessage}`.toLowerCase().includes(search.toLowerCase())) || [];
  const channels = Array.from(new Set(inbox.data?.map(c => c.channel) || []));
  return <Screen title="Inbox" subtitle="Every channel. One conversation workspace." onRefresh={inbox.refresh}>
    <Field label="Search conversations" value={search} onChangeText={setSearch} placeholder="Name or message" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={ui.row}>{[['all','All'],['team','Needs human'],...channels.map(c => [c,c])].map(([key,label]) => <Chip key={key} label={label} selected={filter === key} onPress={() => setFilter(key)} />)}</View></ScrollView>
    <ErrorNotice message={inbox.error} retry={inbox.refresh} />
    {inbox.loading ? <Loading /> : !items.length ? !inbox.error && <Empty title="You're all caught up" detail="Messages from connected channels will appear here." /> : <Card>{items.map(c => <Pressable accessibilityRole="button" accessibilityLabel={`Open conversation with ${c.customerName}`} key={c.id} onPress={() => setSelected(c)} style={ui.menuRow}><Avatar name={c.customerName} /><View style={{ flex: 1 }}><Text style={ui.heading}>{c.customerName}</Text><Text numberOfLines={1} style={ui.caption}>{c.lastMessage || 'No message yet'}</Text><Text style={ui.caption}>{c.channel}{c.aiPaused ? ' · With team' : ''}</Text></View><View style={{ gap: 8, alignItems: 'flex-end' }}><Text style={ui.caption}>{c.lastMessageTime ? new Date(c.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>{c.unreadCount > 0 && <Badge label={String(c.unreadCount)} />}</View></Pressable>)}</Card>}
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>{selected && <Thread conversation={selected} close={() => { setSelected(null); inbox.refresh(); }} />}</Modal>
  </Screen>;
}
function Thread({ conversation, close }: { conversation: BgosConversation; close: () => void }) {
  const thread = useResource<BgosMessage[]>(`/api/omnichannel/conversations/${conversation.id}/messages`, 5000);
  const [paused, setPaused] = useState(conversation.aiPaused);
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [error,setError] = useState<string | null>(null);
  async function takeover() { setBusy(true); setError(null); try { const result = await apiRequest<{ aiPaused: boolean }>(`/api/omnichannel/conversations/${conversation.id}/takeover`, { method: 'PATCH', body: { aiPaused: !paused } }); setPaused(result.aiPaused); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function send() { if (!text.trim()) return; setBusy(true); setError(null); try { const result = await apiRequest<BgosMessage>(`/api/omnichannel/conversations/${conversation.id}/messages`, { method: 'POST', body: { content: text.trim() } }); setText(''); setPaused(true); if (result.delivery && !['delivered','in_app'].includes(result.delivery.status)) setError(result.delivery.error || result.delivery.reason || 'Saved, but delivery was not confirmed.'); await thread.refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <Screen title={conversation.customerName} subtitle={`${conversation.channel} · ${paused ? 'AI paused' : 'AI available'}`} onRefresh={thread.refresh}>
    <Action label="Back to inbox" secondary onPress={close} /><Action label={paused ? 'Resume AI' : 'Take over · Pause AI'} disabled={busy} secondary onPress={takeover} /><ErrorNotice message={error || thread.error} retry={thread.refresh} />
    {thread.loading ? <Loading /> : thread.data?.map(m => <View key={m.id} style={[ui.card, { maxWidth: '90%', alignSelf: m.sender === 'customer' ? 'flex-start' : 'flex-end', backgroundColor: m.sender === 'customer' ? colors.surface : colors.soft }]}><Text style={ui.label}>{m.sender === 'customer' ? conversation.customerName : m.sender === 'system' ? 'System' : 'Your team'}</Text><Text style={ui.body}>{m.content}</Text><Text style={ui.label}>{new Date(m.timestamp).toLocaleString()}</Text></View>)}
    <Field label="Reply" multiline value={text} onChangeText={setText} maxLength={10000} placeholder="Write a helpful reply…" /><Action label={busy ? 'Saving…' : 'Send reply'} disabled={busy || !text.trim()} onPress={send} />
  </Screen>;
}
