import React, { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { Screen, Card, Action, Field, Empty, Loading, ErrorNotice, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import type { BgosConversation, BgosMessage } from '../../../shared/bgos-contracts';
export default function InboxScreen() {
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 10000);
  const [selected, setSelected] = useState<BgosConversation | null>(null);
  const [filter, setFilter] = useState('all');
  const items = inbox.data?.filter(c => filter === 'all' || (filter === 'team' ? c.aiPaused : !c.aiPaused)) || [];
  return <Screen title="Team inbox" subtitle="Customer conversations, with your team in control." onRefresh={inbox.refresh}>
    <View style={ui.row}>{[['all','All'],['team','Needs human'],['ai','AI active']].map(([key,label]) => <Action key={key} label={label} secondary={filter !== key} onPress={() => setFilter(key)} />)}</View>
    <ErrorNotice message={inbox.error} retry={inbox.refresh} />
    {inbox.loading ? <Loading /> : !items.length ? <Empty title="You're all caught up" detail="Customer messages from connected channels will appear here." /> : items.map(c => <Card key={c.id}><Text style={ui.heading}>{c.customerName}</Text><Text style={ui.body}>{c.channel} · {c.aiPaused ? 'With team' : 'AI available'}{c.unreadCount ? ` · ${c.unreadCount} unread` : ''}</Text><Text numberOfLines={2} style={ui.body}>{c.lastMessage}</Text><Action secondary label="Open conversation" onPress={() => setSelected(c)} /></Card>)}
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
    {thread.loading ? <Loading /> : thread.data?.map(m => <Card key={m.id}><Text style={ui.label}>{m.sender === 'customer' ? conversation.customerName : m.sender === 'system' ? 'System' : 'Your team'}</Text><Text style={ui.body}>{m.content}</Text><Text style={ui.label}>{new Date(m.timestamp).toLocaleString()}</Text></Card>)}
    <Field label="Reply" multiline value={text} onChangeText={setText} maxLength={10000} placeholder="Write a helpful reply…" /><Action label={busy ? 'Saving…' : 'Send reply'} disabled={busy || !text.trim()} onPress={send} />
  </Screen>;
}
