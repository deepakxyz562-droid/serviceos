import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Screen, Action, ErrorNotice, MenuRow, Badge, ui, colors } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { useAuthStore } from '../../src/stores/auth-store';
import type { BgosConversation, BgosWorkspace } from '../../../shared/bgos-contracts';
type Booking = { id: string; title?: string; customerName?: string; scheduledAt?: string; status: string };
export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 15000);
  const bookings = useResource<{ bookings: Booking[] }>('/api/bookings?limit=100');
  const leads = useResource<{ leads: unknown[]; pagination?: { total: number } }>('/api/leads?limit=1');
  const today = new Date().toDateString();
  const appointments = bookings.data?.bookings.filter(b => b.scheduledAt && new Date(b.scheduledAt).toDateString() === today && !['cancelled', 'completed'].includes(b.status));
  const agency = workspace.data?.mode === 'agency';
  const refresh = async () => { await Promise.all([workspace.refresh(), inbox.refresh(), bookings.refresh(), leads.refresh()]); };
  const metrics = [ ['Active leads', leads.data?.pagination?.total ?? '—'], ['Unread messages', inbox.data ? inbox.data.reduce((s, c) => s + c.unreadCount, 0) : '—'], ["Today's appointments", appointments?.length ?? '—'], ['With your team', inbox.data ? inbox.data.filter(c => c.aiPaused).length : '—'] ];
  return <Screen title={`Hello, ${user?.name?.split(' ')[0] || 'there'} 👋`} subtitle={`${workspace.data?.name || 'Your business'} · ${agency ? 'Your sales workspace' : 'Your day, at a glance'}`} onRefresh={refresh}>
    <ErrorNotice message={workspace.error || inbox.error || bookings.error || leads.error} retry={refresh} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{metrics.map(([label, value]) => <View key={label} style={[ui.card, { width: '47%', flexGrow: 1, backgroundColor: label === 'Active leads' ? '#EEF9F3' : colors.surface }]}><Text style={ui.metric}>{value}</Text><Text style={ui.caption}>{label}</Text></View>)}</View>
    <Text style={ui.caption}>Inbox counts cover the latest 50 conversations; appointments cover loaded bookings.</Text>
    <Text style={ui.heading}>Quick actions</Text><View style={ui.row}><Action label="Add lead" onPress={() => router.push('/(tabs)/leads?create=1')} /><Action label="Create post" secondary onPress={() => router.push('/(tabs)/marketing')} /><Action label="Ask for review" secondary onPress={() => router.push('/(tabs)/growth')} /><Action label="Share card" secondary onPress={() => router.push('/(tabs)/tools')} /></View>
    <Card><Text style={ui.heading}>{agency ? 'Next conversations' : "Today's appointments"}</Text>{agency ? <><Text style={ui.body}>Review your leads and outreach before the next follow-up.</Text><MenuRow title="Lead pipeline" icon="people-outline" onPress={() => router.push('/(tabs)/leads')} /><MenuRow title="Outreach approvals" icon="send" onPress={() => router.push('/(tabs)/outreach')} /></> : bookings.error ? <Text style={ui.body}>Appointments are unavailable. Retry above.</Text> : appointments?.length ? appointments.slice(0, 4).map(b => <View key={b.id} style={[ui.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1 }}><Text style={ui.heading}>{b.customerName || b.title || 'Appointment'}</Text><Text style={ui.caption}>{new Date(b.scheduledAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View><Badge label={b.status} success={b.status === 'confirmed'} /></View>) : <Text style={ui.body}>{bookings.loading ? 'Loading your schedule…' : 'No appointments in the loaded schedule for today.'}</Text>}<Action secondary label="View appointments" onPress={() => router.push('/(tabs)/appointments')} /></Card>
    <Card><Text style={ui.heading}>Your growth workspace</Text><MenuRow title="Marketing Studio" detail="Create content and manage scheduled posts" icon="auto-awesome" onPress={() => router.push('/(tabs)/marketing')} /><MenuRow title="Reviews & reputation" detail="Customer feedback and review requests" icon="star-outline" onPress={() => router.push('/(tabs)/growth')} /><MenuRow title="AI & conversations" detail="Monitor customer chats and take over" icon="smart-toy" onPress={() => router.push('/(tabs)/inbox')} /></Card>
  </Screen>;
}
