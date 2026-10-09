import React, { useState } from 'react';
import { Linking, Modal, Text, View } from 'react-native';
import { Screen, Card, Field, Action, Empty, ErrorNotice, Loading, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
type Lead = { id: string; name: string; phone: string; email?: string; status: string; title?: string };
const stages = ['new', 'contacted', 'booked', 'won'];
export default function LeadsScreen() {
  const [search,setSearch] = useState(''); const [stage,setStage] = useState('all'); const [open,setOpen] = useState(false);
  const [name,setName] = useState(''); const [phone,setPhone] = useState(''); const [email,setEmail] = useState('');
  const [busy,setBusy] = useState(false); const [error,setError] = useState<string | null>(null);
  const resource = useResource<{ leads: Lead[] }>('/api/leads?limit=100');
  const leads = resource.data?.leads.filter(l => [l.name,l.phone,l.email,l.title].some(v => v?.toLowerCase().includes(search.toLowerCase())) && (stage === 'all' || l.status === stage)) || [];
  async function create() { setBusy(true); setError(null); try { await apiRequest('/api/leads', { method: 'POST', body: { name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, status: 'new', source: 'manual' } }); setOpen(false); setName(''); setPhone(''); setEmail(''); await resource.refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function progress(lead: Lead) { setBusy(true); setError(null); try { await apiRequest(`/api/leads/${lead.id}`, { method: 'PUT', body: { status: stages[Math.min(stages.indexOf(lead.status) + 1, stages.length - 1)] } }); await resource.refresh(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }
  function contact(url: string) { Linking.openURL(url).catch(() => setError('Could not open the phone app. Check that it is installed.')); }
  return <Screen title="Leads" subtitle="Keep the next conversation moving." onRefresh={resource.refresh}>
    <Action label="Add a lead" onPress={() => { setError(null); setOpen(true); }} /><Field label="Search loaded leads" value={search} onChangeText={setSearch} placeholder="Name, phone or email" /><View style={ui.row}>{['all',...stages].map(s => <Action key={s} label={s === 'won' ? 'Converted' : s.charAt(0).toUpperCase()+s.slice(1)} secondary={stage !== s} onPress={() => setStage(s)} />)}</View>
    <ErrorNotice message={error || resource.error} retry={resource.refresh} />{resource.loading ? <Loading /> : !leads.length ? <Empty title="No leads to show" detail="Add a lead or change your search. Leads captured by your forms will appear here." /> : leads.map(l => <Card key={l.id}><Text style={ui.heading}>{l.name}</Text><Text style={ui.body}>{l.phone} · {l.status === 'won' ? 'Converted' : l.status}</Text><View style={ui.row}><Action label="Call" secondary onPress={() => contact(`tel:${l.phone.replace(/[^\d+]/g,'')}`)} /><Action label="WhatsApp" secondary onPress={() => contact(`https://wa.me/${l.phone.replace(/\D/g,'')}`)} /></View>{stages.includes(l.status) && l.status !== 'won' && <Action disabled={busy} label="Move to next stage" onPress={() => progress(l)} />}</Card>)}
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><Screen title="New lead" subtitle="Start with a name and phone number."><ErrorNotice message={error} /><Field label="Name" value={name} onChangeText={setName} maxLength={150} /><Field label="Phone with country code" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><Field label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><Action label={busy ? 'Saving…' : 'Save lead'} disabled={busy || !name.trim() || phone.replace(/\D/g,'').length < 7} onPress={create} /><Action secondary label="Cancel" disabled={busy} onPress={() => setOpen(false)} /></Screen></Modal>
  </Screen>;
}
