import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Share, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Action, Badge, Chip, Field, ErrorNotice, Loading, ui } from '../src/components/ui';
import { useUnsavedWarning } from '../src/hooks/use-unsaved-warning';
import { useResource } from '../src/hooks/use-resource';
import { apiRequest } from '../src/lib/api';
import { WEB_URL } from '../src/lib/constants';
import type { BgosWorkspace } from '../src/types/bgos-contracts';

type Service = { id: string; name: string; duration: number; basePrice: number; isActive: boolean };
type PageConfig = NonNullable<BgosWorkspace['bookingPageConfig']>;
const emptyService = { name: '', duration: '60', price: '', isActive: true };
export default function BookingPageScreen() {
  const router = useRouter();
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const [tab, setTab] = useState<'page' | 'services' | 'booking'>('page');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [query]);
  const services = useResource<{services: Service[]; pagination: {total: number; totalPages: number}}>(`/api/services?limit=20&page=${page}&search=${encodeURIComponent(search)}`, 0, tab === 'services');
  const settings = useResource<{autoConfirm: boolean; googleCalendarSync: boolean}>('/api/bookings/settings', 0, tab === 'booking');
  const [config, setConfig] = useState<PageConfig>({});
  const [dirty, setDirty] = useState(false);
  useUnsavedWarning(dirty);
  const dirtyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyService);
  useEffect(() => {
    if (workspace.data && !dirtyRef.current) setConfig({ businessName: workspace.data.name, onlineBookingEnabled: true, ...workspace.data.bookingPageConfig });
  }, [workspace.data]);
  function change(key: keyof PageConfig, value: string | boolean) { dirtyRef.current = true; setDirty(true); setNotice(''); setConfig(old => ({ ...old, [key]: value })); }
  function leave() { if(!busy) router.back(); }
  async function savePage() {
    if (!config.businessName?.trim()) { setError('Enter your business name.'); return; }
    if (config.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) { setError('Enter a valid email address.'); return; }
    if (config.website && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(config.website)) { setError('Enter a website starting with https://.'); return; }
    setBusy(true); setError(null);
    try {
      await apiRequest('/api/bgos/workspace', { method: 'PATCH', body: {bookingPageConfig: config} });
      dirtyRef.current = false; setDirty(false); setNotice('Booking page saved.'); await workspace.refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function openService(service?: Service) {
    setError(null); setEditingId(service?.id || null);
    setForm(service ? {name: service.name, duration: String(service.duration), price: String(service.basePrice), isActive: service.isActive} : emptyService);
    setEditor(true);
  }
  async function saveService() {
    const price = Number(form.price); const duration = Number(form.duration);
    if (!form.name.trim() || !form.price.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration < 1 || duration > 1440) {
      setError('Enter a name, a price of 0 or more, and a duration between 1 and 1,440 minutes.'); return;
    }
    setBusy(true); setError(null);
    try {
      await apiRequest(editingId ? `/api/services/${editingId}` : '/api/services', { method: editingId ? 'PUT' : 'POST', body: {name: form.name.trim(), basePrice: price, duration, isActive: form.isActive} });
      setEditor(false); setNotice('Service saved.'); await services.refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function deleteService(service: Service) {
    Alert.alert('Delete service?', `Remove ${service.name} from your service menu?`, [{text: 'Cancel', style: 'cancel'}, {text: 'Delete', style: 'destructive', onPress: async () => {
      setBusy(true); setError(null);
      try { await apiRequest(`/api/services/${service.id}`, {method: 'DELETE'}); await services.refresh(); } catch (e) {setError((e as Error).message);} finally {setBusy(false);}
    }}]);
  }
  async function setAutoConfirm(value: boolean) {
    setBusy(true); setError(null);
    try { await apiRequest('/api/bookings/settings', {method: 'PATCH', body: {autoConfirm: value}}); await settings.refresh(); } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  const link = workspace.data?.links?.booking;
  const url = link ? (link.startsWith('http') ? link : `${WEB_URL}${link}`) : null;
  async function openUrl(value: string) { try { await Linking.openURL(value); } catch {setError('Could not open the page. Please try again.');} }
  return <Screen title="Booking page" subtitle="Make it easy for customers to book with you." showBack onBack={leave}>
    <View style={[ui.row, {gap: 8}]}>{(['page', 'services', 'booking'] as const).map(t => <Chip key={t} label={t === 'page' ? 'Page details' : t === 'services' ? 'Services' : 'Booking rules'} selected={tab === t} onPress={() => {setTab(t); setError(null);}} />)}</View>
    <ErrorNotice message={error || workspace.error} retry={workspace.refresh} />
    {!!notice && <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text>}
    {tab === 'page' && <>
      <Card><Text style={ui.heading}>{config.businessName || 'Your booking page'}</Text><Text style={ui.body}>{config.headline || 'Your services, contact details and booking link in one place.'}</Text>
        {url ? <View style={[ui.row, {gap: 12}]}><Action secondary label="Preview" icon="open-in-new" onPress={() => void openUrl(url)} /><Action secondary label="Share link" icon="share" onPress={() => void Share.share({message: url}).catch(() => setError('Could not share link.'))} /></View> : <Text style={ui.caption}>A booking link is not available yet. Complete your business setup.</Text>}
      </Card>
      {workspace.loading && !workspace.data ? <Loading /> : !!workspace.data && <Card>
        <Field label="Business name" value={config.businessName || ''} onChangeText={v => change('businessName',v)} editable={!busy} />
        <Field label="Headline" placeholder="How can you help your customers?" value={config.headline || ''} onChangeText={v => change('headline',v)} editable={!busy} />
        {(['phone','whatsapp','email','website'] as const).map(key => <Field key={key} label={{phone:'Phone',whatsapp:'WhatsApp',email:'Email',website:'Website'}[key]} value={config[key] || ''} onChangeText={v => change(key,v)} autoCapitalize="none" keyboardType={key === 'email' ? 'email-address' : key === 'website' ? 'url' : 'phone-pad'} editable={!busy} />)}
        <Field label="Short business description" multiline value={config.seoDescription || ''} onChangeText={v => change('seoDescription',v)} editable={!busy} />
        <View style={[ui.row, {justifyContent:'space-between'}]}><Text style={ui.label}>Accept online bookings</Text><Switch accessibilityLabel="Accept online bookings" value={config.onlineBookingEnabled !== false} onValueChange={v => change('onlineBookingEnabled',v)} disabled={busy}/></View>
        <Text style={ui.caption}>{dirty ? 'Unsaved changes' : 'All changes saved'}</Text>
        <Action label={busy ? 'Saving…' : 'Save page'} disabled={busy || !dirty} onPress={() => void savePage()} />
      </Card>}
    </>}
    {tab === 'services' && <>
      <Field label="Search services" value={query} onChangeText={setQuery} placeholder="Search by name" />
      <Action label="Add service" icon="add" onPress={() => openService()} />
      <ErrorNotice message={services.error} retry={services.refresh} />
      {services.loading && !services.data ? <Loading /> : services.data?.services.length === 0 ? <Card><Text style={ui.heading}>{search ? 'No matching services' : 'Add your first service'}</Text><Text style={ui.body}>Include its price and duration so customers know what to expect.</Text></Card> : services.data?.services.map(s => <Card key={s.id}>
        <View style={[ui.row,{justifyContent:'space-between'}]}><Text style={[ui.heading,{flex:1}]}>{s.name}</Text><Badge label={s.isActive ? 'Active' : 'Hidden'} accent={s.isActive}/></View>
        <Text style={ui.body}>{s.duration} min · {Number(s.basePrice) === 0 ? 'Free' : `${s.basePrice} (business currency)`}</Text>
        <View style={[ui.row,{gap:12}]}><Action secondary label="Edit" disabled={busy} onPress={() => openService(s)}/><Action secondary danger label="Delete" disabled={busy} onPress={() => deleteService(s)}/></View>
      </Card>)}
      {!!services.data && services.data.pagination.totalPages > 1 && <View style={[ui.row,{gap:12}]}><Action secondary label="Previous" disabled={page===1} onPress={() => setPage(p=>p-1)}/><Text style={ui.caption}>Page {page} of {services.data.pagination.totalPages}</Text><Action secondary label="Next" disabled={page>=services.data.pagination.totalPages} onPress={() => setPage(p=>p+1)}/></View>}
    </>}
    {tab === 'booking' && <Card><Text style={ui.heading}>Booking confirmation</Text><Text style={ui.body}>Choose whether new customer bookings need your approval.</Text><ErrorNotice message={settings.error} retry={settings.refresh}/>{settings.loading && !settings.data ? <Loading/> : !!settings.data && <View style={[ui.row,{justifyContent:'space-between'}]}><Text style={ui.label}>Confirm automatically</Text><Switch accessibilityLabel="Confirm automatically" value={settings.data.autoConfirm} disabled={busy} onValueChange={v=>void setAutoConfirm(v)}/></View>}<Action secondary label="Manage appointments" onPress={()=>router.push('/appointments')}/><Text style={ui.caption}>Calendar availability and staff schedules are managed in your business calendar.</Text></Card>}
    <Modal visible={editor} animationType="slide" onRequestClose={()=>{if(!busy)setEditor(false);}}><Screen title={editingId ? 'Edit service' : 'Add service'} showBack onBack={()=>{if(!busy)setEditor(false);}}>
      <ErrorNotice message={error}/><Card><Field label="Service name" value={form.name} onChangeText={name=>setForm(f=>({...f,name}))} editable={!busy}/><Field label="Price (your business currency)" value={form.price} keyboardType="decimal-pad" placeholder="0 for a free service" onChangeText={price=>setForm(f=>({...f,price}))} editable={!busy}/><Field label="Duration in minutes" keyboardType="number-pad" value={form.duration} onChangeText={duration=>setForm(f=>({...f,duration}))} editable={!busy}/><View style={[ui.row,{justifyContent:'space-between'}]}><Text style={ui.label}>Visible to customers</Text><Switch accessibilityLabel="Visible to customers" value={form.isActive} disabled={busy} onValueChange={isActive=>setForm(f=>({...f,isActive}))}/></View><Action label={busy?'Saving…':'Save service'} disabled={busy} onPress={()=>void saveService()}/><Action secondary label="Cancel" disabled={busy} onPress={()=>setEditor(false)}/></Card>
    </Screen></Modal>
  </Screen>;
}
