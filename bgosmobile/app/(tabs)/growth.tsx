import React, { useState } from 'react';
import { Text, Linking } from 'react-native';
import { Screen, Card, Field, Action, Empty, ErrorNotice, Loading, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import type { BgosWorkspace } from '../../../shared/bgos-contracts';
import { useRouter } from 'expo-router';
export default function GrowthScreen() {
  const router = useRouter(); const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const reviews = useResource<{ reviews: { id: string; rating: number; authorName?: string; comment?: string; source?: string }[] }>('/api/reviews');
  const [phone,setPhone] = useState(''); const [name,setName] = useState(''); const [error,setError] = useState<string | null>(null);
  async function requestReview() { if (!workspace.data?.links.review) return; const digits = phone.replace(/\D/g,''); if (digits.length < 8 || digits.length > 15) { setError('Enter a valid number including its country code.'); return; } try { await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${name.trim() || 'there'}, thank you for choosing ${workspace.data.name}. Please share your experience: ${workspace.data.links.review}`)}`); setError(null); } catch { setError('Could not open WhatsApp. Check that it is installed.'); } }
  return <Screen title="Grow your reputation" subtitle="Real customer feedback. A stronger first impression." onRefresh={() => { workspace.refresh(); reviews.refresh(); }}>
    <ErrorNotice message={error || workspace.error || reviews.error} /><Card><Text style={ui.heading}>Ask for a review</Text><Text style={ui.body}>{workspace.data?.links.review ? 'Open a personal review request in WhatsApp. You choose when to send it.' : 'Connect a Google Business location in the web workspace to enable verified review links.'}</Text><Field label="Customer name" value={name} onChangeText={setName} /><Field label="WhatsApp number with country code" keyboardType="phone-pad" value={phone} onChangeText={setPhone} /><Action disabled={!workspace.data?.links.review || !phone.trim()} label="Open request in WhatsApp" onPress={requestReview} /></Card>
    <Card><Text style={ui.heading}>Digital card & QR</Text><Text style={ui.body}>Share your published profile with a scannable QR code.</Text><Action secondary label="Open sharing tools" onPress={() => router.push('/(tabs)/tools')} /></Card>
    {reviews.loading ? <Loading /> : !reviews.data?.reviews.length ? <Empty title="Your story starts here" detail="Published customer reviews will appear here. No sample ratings are included." /> : reviews.data.reviews.map(r => <Card key={r.id}><Text style={ui.heading}>{r.authorName || 'Customer'} · {r.rating}/5</Text>{r.comment && <Text style={ui.body}>{r.comment}</Text>}<Text style={ui.label}>{r.source || 'Direct review'}</Text></Card>)}
  </Screen>;
}
