import React from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Screen, Action, ErrorNotice, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import type { BgosConversation, BgosWorkspace } from '../../../shared/bgos-contracts';
export default function HomeScreen() {
  const router = useRouter();
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const inbox = useResource<BgosConversation[]>('/api/omnichannel/conversations', 15000);
  const bookings = useResource<{ bookings: { scheduledAt?: string; status: string }[] }>('/api/bookings');
  const reviews = useResource<{ reviews: { rating: number }[] }>('/api/reviews');
  const today = new Date().toDateString();
  const count = bookings.data?.bookings.filter(b => b.scheduledAt && new Date(b.scheduledAt).toDateString() === today && !['cancelled','completed'].includes(b.status)).length;
  return <Screen title={workspace.data?.name || 'Your overview'} subtitle="A clear view of today. One action at a time." onRefresh={() => { workspace.refresh(); inbox.refresh(); bookings.refresh(); reviews.refresh(); }}>
    <ErrorNotice message={workspace.error || inbox.error || bookings.error || reviews.error} />
    <Card><Text style={ui.label}>UNREAD MESSAGES · LATEST 50 CHATS</Text><Text style={ui.metric}>{inbox.data ? inbox.data.reduce((sum,c) => sum + c.unreadCount, 0) : '—'}</Text><Action label="Open inbox" onPress={() => router.push('/(tabs)/inbox')} /></Card>
    <Card><Text style={ui.label}>TODAY'S APPOINTMENTS · LOADED BOOKINGS</Text><Text style={ui.metric}>{count ?? '—'}</Text><Action label="Manage appointments" secondary onPress={() => router.push('/(tabs)/appointments')} /></Card>
    <Card><Text style={ui.label}>CUSTOMER REVIEWS · LOADED REVIEWS</Text><Text style={ui.metric}>{reviews.data?.reviews.length ? (reviews.data.reviews.reduce((sum,r) => sum + r.rating, 0) / reviews.data.reviews.length).toFixed(1) + ' / 5' : reviews.data ? 'No reviews yet' : '—'}</Text><Action label="Grow your reputation" secondary onPress={() => router.push('/(tabs)/growth')} /></Card>
    <Card><Text style={ui.heading}>Your next opportunity</Text><Action label="Add a lead" onPress={() => router.push('/(tabs)/leads')} /><Action label="View form responses" secondary onPress={() => router.push('/(tabs)/submissions')} /><Action label="Share your digital card" secondary onPress={() => router.push('/(tabs)/tools')} /></Card>
  </Screen>;
}
