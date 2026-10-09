import React, { useState } from 'react';
import { Image, Linking, Share, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Action, ErrorNotice, Loading, ui, colors } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { WEB_URL } from '../../src/lib/constants';
import { useAuthStore } from '../../src/stores/auth-store';
import { enablePush } from '../../src/lib/push';
import type { BgosWorkspace } from '../../../shared/bgos-contracts';
export default function ToolsScreen() {
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace'); const router = useRouter(); const { logout } = useAuthStore();
  const [busy,setBusy] = useState(false); const [error,setError] = useState<string | null>(null); const [qr,setQr] = useState<string | null>(null); const [notice,setNotice] = useState('');
  async function run(action: () => Promise<unknown>) { setBusy(true); setError(null); try { await action(); } catch(e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function update(body: object) { await apiRequest('/api/bgos/workspace', { method: 'PATCH', body }); await workspace.refresh(); }
  function absolute(path: string) { return path.startsWith('https://') ? path : `${WEB_URL}${path}`; }
  const data = workspace.data;
  return <Screen title="Your toolkit" subtitle="Share your business. Stay in control." onRefresh={workspace.refresh}><ErrorNotice message={error || workspace.error} retry={workspace.refresh} />{notice ? <Card><Text style={ui.body}>{notice}</Text></Card> : null}{workspace.loading ? <Loading /> : data && <>
    <Card><Text style={ui.heading}>Digital identity</Text>{([['profile','Business card'],['booking','Booking page'],['form','Intake form']] as const).map(([key,label]) => <View key={key} style={{ gap: 10 }}><Text style={ui.label}>{label}</Text><Text style={ui.body}>{data.links[key] ? absolute(data.links[key]!) : 'Not published yet. Set this up in BGOS web.'}</Text>{data.links[key] && <Action secondary disabled={busy} label={`Share ${label.toLowerCase()}`} onPress={() => run(() => Share.share({ message: absolute(data.links[key]!), url: absolute(data.links[key]!) }))} />}</View>)}<Action disabled={busy || !data.links.profile} label="Show scannable QR" onPress={() => run(async () => { const result = await apiRequest<{ image: string }>('/api/bgos/qr'); setQr(result.image); })} />{qr && <Image accessibilityLabel="QR code for your published business profile" source={{ uri: qr }} style={{ width: '100%', aspectRatio: 1 }} />}</Card>
    <Card><Text style={ui.heading}>Automations</Text>{([['profileAssistant','Digital profile AI assistant'],['offlineReply','Offline customer auto-reply']] as const).map(([key,label]) => <View key={key} style={[ui.row,{ justifyContent: 'space-between' }]}><Text style={[ui.body,{ flex: 1 }]}>{label}</Text><Switch accessibilityLabel={label} disabled={busy} value={data.automations[key]} onValueChange={value => run(() => update({ [key]: value }))} trackColor={{ true: colors.brand }} /></View>)}<Text style={ui.body}>Auto-reply availability follows your connected channels and subscription.</Text><Action label="Manage workflows" secondary onPress={() => router.push('/(tabs)/automations')} /></Card>
    <Card><Text style={ui.heading}>Workspace mode</Text><Action disabled={busy} secondary label={data.mode === 'local' ? 'Local business · Switch to agency' : 'B2B agency · Switch to local'} onPress={() => run(() => update({ mode: data.mode === 'local' ? 'agency' : 'local' }))} /></Card>
    <Card><Text style={ui.heading}>Plan & account</Text><Text style={ui.body}>{data.plan.code} · {data.plan.status}</Text><Action secondary label="Plan details & usage" onPress={() => run(() => Linking.openURL(`${WEB_URL}/app?view=billing`))} /><Action secondary disabled={busy} label="Enable customer notifications" onPress={() => run(async () => { await enablePush(); setNotice('Notifications are enabled for this device.'); })} /><Action secondary label="Form responses" onPress={() => router.push('/(tabs)/submissions')} /><Action secondary label="Review outreach batches" onPress={() => router.push('/(tabs)/outreach')} /><Action disabled={busy} secondary label="Sign out" onPress={() => run(async () => { await logout(); router.replace('/login'); })} /></Card>
  </>}</Screen>;
}
