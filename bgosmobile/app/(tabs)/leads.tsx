import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Field, Action, Avatar, Badge, Chip, Empty, ErrorNotice, Loading, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { leadLabels, leadStage, leadStages } from '../../src/lib/leads';
type Lead = { id: string; name: string; phone: string; email?: string; status: string; title?: string; source?: string; notesJson?: string };
export default function LeadsScreen() {
  const params = useLocalSearchParams<{ create?: string }>();
  const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [stage, setStage] = useState('all'); const [page, setPage] = useState(1);
  const [open, setOpen] = useState(params.create === '1'); const [selected, setSelected] = useState<Lead | null>(null);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { if (params.create === '1') setOpen(true); }, [params.create]);
  const resource = useResource<{ leads: Lead[]; pagination?: { totalPages: number; total: number } }>(`/api/leads?limit=25&page=${page}&search=${encodeURIComponent(query)}${stage === 'all' ? '' : `&status=${stage}`}`);
  async function create() {
    setBusy(true); setError(null);
    try { await apiRequest('/api/leads', { method: 'POST', body: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, status: 'new_lead', source: 'manual' } }); setOpen(false); setName(''); setPhone(''); setEmail(''); await resource.refresh(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function updateStage(status: string) {
    if (!selected || busy) return;
    setBusy(true); setError(null);
    try { await apiRequest(`/api/leads/${selected.id}`, { method: 'PUT', body: { status } }); setSelected({ ...selected, status }); await resource.refresh(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function contact(url: string) { Linking.openURL(url).catch(() => setError('Could not open the requested app.')); }
  return <Screen title="Leads & CRM" subtitle="Every relationship, one clear next step." onRefresh={resource.refresh}>
    <Field label="Search leads" value={search} onChangeText={setSearch} placeholder="Name, phone or email" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={ui.row}>{['all', ...leadStages].map(s => <Chip key={s} label={s === 'all' ? 'All' : leadLabels[s]} selected={stage === s} onPress={() => { setStage(s); setPage(1); }} />)}</View></ScrollView>
    <ErrorNotice message={error || resource.error} retry={resource.refresh} />
    {resource.loading ? <Loading /> : resource.data?.leads.length ? <Card>{resource.data.leads.map(l => <Pressable key={l.id} accessibilityRole="button" accessibilityLabel={`Open ${l.name}`} onPress={() => { setError(null); setSelected(l); }} style={ui.menuRow}><Avatar name={l.name} /><View style={{ flex: 1 }}><Text style={ui.heading}>{l.name}</Text><Text style={ui.caption}>{l.source || 'Direct'}{l.title ? ` · ${l.title}` : ''}</Text></View><Badge label={leadLabels[leadStage(l.status)] || l.status} success={l.status === 'won'} /></Pressable>)}</Card> : !resource.error && <Empty title="No leads to show" detail="Add your first lead or adjust the filters." />}
    <View style={[ui.row, { justifyContent: 'space-between' }]}><Action label="Previous" secondary disabled={page === 1 || resource.loading} onPress={() => setPage(page - 1)} /><Text style={ui.caption}>Page {page}</Text><Action label="Next" secondary disabled={resource.loading || page >= (resource.data?.pagination?.totalPages || 1)} onPress={() => setPage(page + 1)} /></View>
    <Action label="＋ Add lead" onPress={() => { setError(null); setOpen(true); }} />
    <Modal visible={open} animationType="slide" onRequestClose={() => { if (!busy) setOpen(false); }}><Screen title="Add lead" subtitle="Capture the details for your next conversation."><ErrorNotice message={error} /><Field label="Name" value={name} onChangeText={setName} maxLength={150} /><Field label="Phone with country code" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><Field label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><Action label={busy ? 'Saving…' : 'Save lead'} disabled={busy || !name.trim() || phone.replace(/\D/g, '').length < 7} onPress={create} /><Action secondary label="Cancel" disabled={busy} onPress={() => setOpen(false)} /></Screen></Modal>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => { if (!busy) setSelected(null); }}>{selected && <Screen title={selected.name} subtitle={selected.title || 'Lead details'}><ErrorNotice message={error} /><Card><Text style={ui.body}>{selected.phone}</Text>{selected.email && <Text style={ui.body}>{selected.email}</Text>}<View style={ui.row}><Action label="Call" secondary disabled={!selected.phone} onPress={() => contact(`tel:${selected.phone.replace(/[^\d+]/g, '')}`)} /><Action label="WhatsApp" secondary disabled={!selected.phone} onPress={() => contact(`https://wa.me/${selected.phone.replace(/\D/g, '')}`)} /></View></Card><Card><Text style={ui.heading}>Pipeline stage</Text><Text style={ui.body}>Choose the stage that reflects this conversation.</Text><View style={ui.row}>{leadStages.map(s => <Action key={s} label={leadLabels[s]} disabled={busy} secondary={leadStage(selected.status) !== s} onPress={() => updateStage(s)} />)}</View></Card><Action secondary label="Back to leads" disabled={busy} onPress={() => setSelected(null)} /></Screen>}</Modal>
  </Screen>;
}
