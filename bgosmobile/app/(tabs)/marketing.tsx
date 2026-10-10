import * as Crypto from 'expo-crypto';
import React, { useState, useRef } from 'react';
import { Alert, Image, Linking, Modal, ScrollView, Text, View } from 'react-native';
import { Screen, Card, Field, Action, Badge, Chip, Empty, ErrorNotice, Loading, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { WEB_URL } from '../../src/lib/constants';
import { validateSocialPost } from '../../src/lib/social-validation';
import { futureLocalTime } from '../../src/lib/dates';
type Account = { id: string; platform: string; accountName: string; isActive: boolean };
type Post = { id: string; content: string; status: string; scheduledAt?: string; failureReason?: string; mediaUrls: string[]; publishTargets?: { platform: string; status: string; error?: string }[] };
export default function MarketingScreen() {
  const pendingRequest = useRef<{ body: string; key: string } | null>(null);
  const saving = useRef(false);
  const [filter, setFilter] = useState('all'); const [page, setPage] = useState(1);
  const posts = useResource<{ data: Post[]; pagination: { totalPages: number } }>(`/api/social/posts?limit=20&page=${page}${filter === 'all' ? '' : `&status=${filter}`}`, 15000);
  const accounts = useResource<{ data: Account[] }>('/api/social/accounts');
  const [open, setOpen] = useState(false); const [step, setStep] = useState(0);
  const [topic, setTopic] = useState(''); const [content, setContent] = useState(''); const [selected, setSelected] = useState<string[]>([]);
  const [media, setMedia] = useState(''); const [date, setDate] = useState(''); const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState('');
  const available = accounts.data?.data.filter(a => a.isActive && ['facebook', 'instagram', 'googlebusiness', 'linkedin', 'twitter'].includes(a.platform)) || [];
  const targets = available.filter(a => selected.includes(a.id)).map(a => ({ platform: a.platform, socialAccountId: a.id }));
  const mediaUrls = media.split('\n').map(s => s.trim()).filter(Boolean);
  async function generate() { setBusy(true); setError(null); try { const data = await apiRequest<{ caption: string }>('/api/social/ai-caption', { method: 'POST', body: { topic, platforms: targets.length ? targets.map(t => t.platform) : Array.from(new Set(available.map(a => a.platform))), tone: 'Friendly and professional' } }); setContent(data.caption); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function save(status: 'draft' | 'scheduled' | 'published') {
    if (busy || saving.current) return;
    setError(null);
    const validation = validateSocialPost(content, targets.map(t => t.platform), mediaUrls);
    if (validation) { setError(validation); return; }
    const scheduledAt = status === 'scheduled' ? futureLocalTime(date, time) : null;
    if (status === 'scheduled' && !scheduledAt) { setError('Choose a valid future date and time.'); return; }
    saving.current = true;
    setBusy(true);
    const body = { content: content.trim(), targets, mediaUrls, status, ...(scheduledAt ? { scheduledAt } : {}) };
    const serialized = JSON.stringify(body);
    if (pendingRequest.current?.body !== serialized) pendingRequest.current = { body: serialized, key: Crypto.randomUUID() };
    try {
      await apiRequest('/api/social/posts', { method: 'POST', body, headers: { 'Idempotency-Key': pendingRequest.current!.key } });
      pendingRequest.current = null;
      setOpen(false); setContent(''); setTopic(''); setMedia(''); setSelected([]); setDate(''); setTime(''); setStep(0);
      setNotice(status === 'published' ? 'Publishing requested. Check the post status below for delivery results.' : status === 'scheduled' ? 'Post scheduled. Delivery depends on connected channels and the publishing worker.' : 'Draft saved.');
      await posts.refresh();
    } catch (e) { setError((e as Error).message); } finally { saving.current = false; setBusy(false); }
  }
  return <Screen title="Marketing Studio" subtitle="Create once. Review every channel." onRefresh={async () => { await Promise.all([posts.refresh(), accounts.refresh()]); }}>
    <Card><Text style={ui.heading}>Create with AI</Text><Text style={ui.body}>Draft a business update, tailor the caption and choose your connected channels.</Text><Action label="＋ Create post" onPress={() => { setError(null); setOpen(true); }} /></Card>
    {notice ? <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text> : null}<ErrorNotice message={error || posts.error || accounts.error} retry={posts.refresh} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={ui.row}>{['all', 'draft', 'scheduled', 'published', 'partial', 'failed'].map(s => <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={filter === s} onPress={() => { setFilter(s); setPage(1); }} />)}</View></ScrollView>
    {posts.loading ? <Loading /> : posts.data?.data.length ? posts.data.data.map(post => <Card key={post.id}><Badge label={post.status} success={post.status === 'published'} /><Text style={ui.heading}>{post.content}</Text>{post.mediaUrls?.[0] && <Image source={{ uri: post.mediaUrls[0] }} accessibilityLabel="Post media" style={{ width: '100%', height: 180, borderRadius: 12 }} />}{post.scheduledAt && <Text style={ui.caption}>{new Date(post.scheduledAt).toLocaleString()}</Text>}{post.publishTargets?.map((target, i) => <Text key={i} style={ui.caption}>{target.platform} · {target.status}{target.error ? ` · ${target.error}` : ''}</Text>)}{post.failureReason && <ErrorNotice message={post.failureReason} />}</Card>) : !posts.error && <Empty title="Your next post starts here" detail="Drafts, scheduled posts and publishing results will appear here." />}
    <View style={[ui.row, { justifyContent: 'space-between' }]}><Action secondary label="Previous" disabled={page === 1 || posts.loading} onPress={() => setPage(page - 1)} /><Text style={ui.caption}>Page {page}</Text><Action secondary label="Next" disabled={posts.loading || page >= (posts.data?.pagination.totalPages || 1)} onPress={() => setPage(page + 1)} /></View>
    <Modal visible={open} animationType="slide" onRequestClose={() => { if (!busy) setOpen(false); }}><Screen title={step === 0 ? 'Create your post' : step === 1 ? 'Publishing channels' : 'Preview & schedule'} subtitle={`Step ${step + 1} of 3`}><ErrorNotice message={error || accounts.error} retry={accounts.refresh} />
      {step === 0 ? <><Field label="What would you like to share?" value={topic} onChangeText={setTopic} multiline placeholder="An offer, event or useful update…" /><Action secondary label={busy ? 'Generating…' : 'Generate caption with AI'} disabled={busy || !topic.trim() || !available.length} onPress={generate} /><Field label="Post caption" value={content} onChangeText={setContent} multiline maxLength={5000} /><Field label="Media URLs (optional, one per line)" value={media} onChangeText={setMedia} multiline autoCapitalize="none" placeholder="https://…" /><Text style={ui.caption}>Use existing public media URLs. Device uploads and advanced media editing are available in the web studio.</Text><Action label="Choose channels →" disabled={!content.trim() || busy} onPress={() => setStep(1)} /></> : step === 1 ? <>{accounts.loading ? <Loading /> : available.length ? available.map(a => <Action key={a.id} secondary={!selected.includes(a.id)} label={`${selected.includes(a.id) ? '✓ ' : ''}${a.accountName} · ${a.platform}`} onPress={() => setSelected(selected.includes(a.id) ? selected.filter(id => id !== a.id) : [...selected, a.id])} />) : <Empty title="Connect a publishing channel" detail="Connect Google Business, Facebook, Instagram or another supported account in BGOS web first." />}<Action secondary label="Manage connections in web" onPress={() => Linking.openURL(`${WEB_URL}/app?view=socialAccounts`).catch(() => setError('Could not open the browser.'))} /><Text style={ui.caption}>WhatsApp outreach is managed separately from social publishing.</Text><Action label="Preview →" disabled={!targets.length} onPress={() => setStep(2)} /></> : <><Card><Text style={ui.caption}>{targets.map(t => t.platform).join(' · ')}</Text><Text style={ui.body}>{content}</Text>{/^https:\/\//.test(mediaUrls[0] || '') && <Image source={{ uri: mediaUrls[0] }} style={{ height: 220, width: '100%', borderRadius: 12 }} accessibilityLabel="Post preview media" />}<Text style={ui.caption}>Content preview. Each platform controls its final appearance.</Text></Card><Field label="Schedule date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" /><Field label="Time (HH:MM, 24-hour)" value={time} onChangeText={setTime} placeholder="14:30" /><Text style={ui.caption}>Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</Text><Action secondary disabled={busy} label="Save draft" onPress={() => save('draft')} /><Action disabled={busy} label={busy ? 'Saving…' : 'Schedule post'} onPress={() => save('scheduled')} /><Action secondary disabled={busy} label="Publish now" onPress={() => Alert.alert('Publish this post?', `Send the reviewed content to ${targets.length} connected account(s).`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Publish', onPress: () => save('published') }])} /></>}
      {step > 0 && <Action secondary disabled={busy} label="Back" onPress={() => setStep(step - 1)} />}<Action secondary disabled={busy} label="Close composer" onPress={() => setOpen(false)} />
    </Screen></Modal>
  </Screen>;
}
