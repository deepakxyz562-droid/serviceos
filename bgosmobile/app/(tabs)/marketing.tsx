import * as Crypto from 'expo-crypto';
import React, { useState, useRef } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Field,
  Action,
  Badge,
  Chip,
  Empty,
  ErrorNotice,
  Loading,
  Avatar,
  ui,
  colors,
} from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { getToken } from '../../src/lib/auth';
import { WEB_URL } from '../../src/lib/constants';
import { validateSocialPost } from '../../src/lib/social-validation';
import { futureLocalTime } from '../../src/lib/dates';
import { ReviewRequestSheet } from '../../src/components/gbp/review-request';
import type { BgosWorkspace } from '../../../shared/bgos-contracts';
import type { GbpPlaceResult } from '../../src/components/gbp/types';

type Account = { id: string; platform: string; accountName: string; isActive: boolean };
type Post = {
  id: string;
  content: string;
  status: string;
  scheduledAt?: string;
  failureReason?: string;
  mediaUrls: string[];
  gbpPostType?: string;
  publishTargets?: { platform: string; status: string; error?: string }[];
};

export default function MarketingScreen() {
  const router = useRouter();
  const pendingRequest = useRef<{ body: string; key: string } | null>(null);
  const saving = useRef(false);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const posts = useResource<{ data: Post[]; pagination: { totalPages: number } }>(
    `/api/social/posts?limit=20&page=${page}${filter === 'all' ? '' : `&status=${filter}`}`,
    15000
  );
  const accounts = useResource<{ data: Account[] }>('/api/social/accounts');

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [gbpPostType, setGbpPostType] = useState<'whats_new' | 'offer' | 'event'>('whats_new');
  const [ctaType, setCtaType] = useState<'LEARN_MORE' | 'CALL' | 'BOOK' | 'ORDER_ONLINE'>('LEARN_MORE');
  const [couponCode, setCouponCode] = useState('');
  const [media, setMedia] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);

  const available = accounts.data?.data || [];
  const gbpAccount = available.find((a) => a.platform === 'googlebusiness' && a.isActive);
  const targets = gbpAccount ? [{ platform: 'googlebusiness', socialAccountId: gbpAccount.id }] : [];
  const mediaUrls = media.split('\n').map((s) => s.trim()).filter(Boolean);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const data = await apiRequest<{ caption: string }>('/api/social/ai-caption', {
        method: 'POST',
        body: {
          topic,
          platforms: ['googlebusiness'],
          tone: 'Friendly and professional',
        },
      });
      setContent(data.caption);
    } catch (e) {
      // Never fabricate a caption when the AI service fails — surface the real
      // error so the user can retry or write the caption manually.
      setError(
        `${(e as Error).message || 'AI caption generation failed.'} You can retry, or write the caption below manually.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(status: 'draft' | 'scheduled' | 'published') {
    if (busy || saving.current) return;
    setError(null);
    const scheduledAt = status === 'scheduled' ? futureLocalTime(date, time) : null;
    if (status === 'scheduled' && !scheduledAt) {
      setError('Choose a valid future date and time.');
      return;
    }

    if (status !== 'draft' && !gbpAccount) {
      setError(
        'Connect your Google Business Profile to publish or schedule posts to Google. You can save as a Draft in the meantime.'
      );
      return;
    }

    saving.current = true;
    setBusy(true);
    const body: Record<string, unknown> = {
      content: content.trim(),
      targets,
      mediaUrls,
      status,
      gbpPostType,
      ...(scheduledAt ? { scheduledAt } : {}),
    };
    if (gbpPostType === 'offer') {
      body.gbpOfferData = {
        title: topic.trim() || 'Special Offer',
        couponCode: couponCode.trim(),
      };
    }

    const serialized = JSON.stringify(body);
    if (pendingRequest.current?.body !== serialized) {
      pendingRequest.current = { body: serialized, key: Crypto.randomUUID() };
    }

    try {
      await apiRequest('/api/social/posts', {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': pendingRequest.current!.key },
      });
      pendingRequest.current = null;
      setOpen(false);
      setContent('');
      setTopic('');
      setCouponCode('');
      setDate('');
      setTime('');
      setStep(0);
      setNotice(
        status === 'published'
          ? 'Post published to your Google Business Profile! 🚀'
          : status === 'scheduled'
          ? 'Post scheduled for your Google Business Profile.'
          : 'Draft saved.'
      );
      await posts.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function openGoogleConnect() {
    try {
      const token = await getToken();
      const authPart = token ? `&auth=${encodeURIComponent(token)}` : '';
      await Linking.openURL(`${WEB_URL}/api/oauth/googlebusiness/connect?product=bgos&returnView=socialMedia${authPart}`);
    } catch {
      setError('Could not open the browser to connect Google. Try again or connect from BGOS web.');
    }
  }

  function handleGoogleChipPress() {
    if (gbpAccount) {
      Alert.alert('Google Business Profile Connected ✅', 'Your Google Business Profile is active and ready to publish posts.');
    } else {
      Alert.alert(
        'Connect Google Business Profile',
        'Link your verified Google profile to publish posts, local offers, and updates directly from BGOS.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '1-Click Connect',
            onPress: () => {
              void openGoogleConnect();
            },
          },
        ]
      );
    }
  }

  return (
    <Screen
      title="Google Post Studio"
      subtitle="AI-powered Google updates, local offers & post scheduling."
      showBack={true}
      onRefresh={async () => {
        await Promise.all([posts.refresh(), accounts.refresh(), workspace.refresh(), gbpPlace.refresh()]);
      }}
      rightAction={
        <Action
          compact
          label="＋ Post"
          icon="auto-awesome"
          onPress={() => {
            setError(null);
            setOpen(true);
          }}
        />
      }
    >
      {/* Feature Navigation Cards (Screen 14) */}
      <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 18 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <View style={[ui.row, { gap: 6 }]}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF' }}>Google Business Autopilot</Text>
              <Badge label="GBP Focus" accent />
            </View>
            <Text style={{ fontSize: 13, color: '#D1EAE5', marginTop: 4 }}>
              Craft high-converting Google updates, announcements, and local offers that boost your Google Maps ranking.
            </Text>
          </View>
          <MaterialIcons name="auto-awesome" size={32} color={colors.accent} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Pressable onPress={handleGoogleChipPress} style={styles.channelChip}>
            <MaterialIcons name="store" size={14} color="#FFFFFF" />
            <Text style={styles.channelChipText}>
              Google Business {gbpAccount ? '✓' : '+'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setRequestOpen(true)}
            style={[styles.channelChip, { backgroundColor: '#25D366' }]}
            accessibilityRole="button"
            accessibilityLabel="Send 1-Tap Google Review Request via WhatsApp"
          >
            <MaterialIcons name="chat" size={14} color="#FFFFFF" />
            <Text style={styles.channelChipText}>
              WhatsApp Review Invite ↗
            </Text>
          </Pressable>
        </View>
      </Card>

      {notice ? (
        <View style={{ backgroundColor: colors.successSoft, padding: 12, borderRadius: 12 }}>
          <Text style={{ color: colors.success, fontWeight: '700' }}>✓ {notice}</Text>
        </View>
      ) : null}

      <ErrorNotice message={error || posts.error || accounts.error} retry={posts.refresh} />

      {/* Status Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={ui.row}>
          {['all', 'draft', 'scheduled', 'published', 'failed'].map((s) => (
            <Chip
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              selected={filter === s}
              onPress={() => {
                setFilter(s);
                setPage(1);
              }}
            />
          ))}
        </View>
      </ScrollView>

      {/* Post List */}
      {posts.loading ? (
        <Loading />
      ) : !posts.data?.data.length ? (
        !posts.error && (
          <Empty
            title="No posts published yet"
            detail="Generate your first AI post and review before sharing."
            actionLabel="＋ Create First Post"
            onAction={() => {
              setSelected(available.slice(0, 3).map((a) => a.id));
              setOpen(true);
            }}
          />
        )
      ) : (
        posts.data.data.map((post) => (
          <Card key={post.id} style={{ gap: 10 }}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Badge label={post.status.toUpperCase()} success={post.status === 'published'} />
              {post.scheduledAt && (
                <Text style={ui.caption}>
                  📅 {new Date(post.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>

            <Text style={ui.body}>{post.content}</Text>

            {post.mediaUrls?.[0] ? (
              <Image
                source={{ uri: post.mediaUrls[0] }}
                style={{ width: '100%', height: 190, borderRadius: 12 }}
                accessibilityLabel="Post image"
                alt="Post image"
              />
            ) : null}

            {post.publishTargets && (
              <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}>
                {post.publishTargets.map((t, i) => (
                  <View key={i} style={[ui.row, { gap: 4, backgroundColor: colors.soft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand }}>
                      {t.platform} · {t.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        ))
      )}

      {/* 3-Step Create / Preview Modal (Google Post Studio) */}
      <Modal visible={open} animationType="slide" onRequestClose={() => { if (!busy) setOpen(false); }}>
        <Screen
          title={step === 0 ? 'Create Google Post' : step === 1 ? 'Google Post Details' : 'Preview & Publish'}
          subtitle={`Step ${step + 1} of 3`}
          showBack={true}
          onBack={() => {
            if (busy) return;
            if (step > 0) {
              setStep(step - 1);
            } else {
              setOpen(false);
            }
          }}
        >
          {/* Visual Stepper */}
          <View style={[ui.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
            {['1. Content & AI', '2. Google Details', '3. Publish & Schedule'].map((name, i) => (
              <Text
                key={name}
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: step === i ? colors.brand : colors.muted,
                  borderBottomWidth: step === i ? 2 : 0,
                  borderBottomColor: colors.brand,
                  paddingBottom: 4,
                }}
              >
                {name}
              </Text>
            ))}
          </View>

          <ErrorNotice message={error} />

          {/* STEP 1: CONTENT */}
          {step === 0 && (
            <Card style={{ gap: 12 }}>
              <Field
                label="What would you like to share on Google?"
                value={topic}
                onChangeText={setTopic}
                multiline
                placeholder="e.g. Weekend special on plumbing tune-up. 15% discount for local homeowners. Call today…"
              />

              {/* 2-Click Offering Chips (Grexa / Dhanda AI Benchmark) */}
              <Text style={ui.label}>🔥 Select Service to Promote (2-Click Draft)</Text>
              <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}>
                {[
                  { label: '🚪 Gates & Grills', val: 'custom gate and window grill fabrication' },
                  { label: '🛡️ SS Railings', val: 'grade 304 stainless steel balcony and staircase railings' },
                  { label: '🏭 Factory Sheds', val: 'heavy-duty industrial factory shed and roofing structure' },
                  { label: '✨ Laser Cutting', val: 'designer CNC metal laser cutting and decorative screens' },
                  { label: '🔧 Welding Repair', val: 'urgent on-site welding and rolling shutter repair service' },
                ].map((item) => (
                  <Chip
                    key={item.label}
                    label={item.label}
                    selected={topic === item.val}
                    onPress={() => setTopic(item.val)}
                  />
                ))}
              </View>

              {/* Quick Prompt Tags */}
              <Text style={ui.label}>Quick Topic Tags</Text>
              <View style={[ui.row, { gap: 6 }]}>
                {['Special Offer', 'New Service', 'Weekend Discount', 'Local Update'].map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    selected={topic.includes(tag)}
                    onPress={() => setTopic((prev) => (prev ? `${prev} - ${tag}` : tag))}
                  />
                ))}
              </View>

              <Action
                secondary
                icon="auto-awesome"
                label={busy ? 'Generating Caption…' : '✨ Generate with Google AI'}
                disabled={busy}
                onPress={generate}
              />

              <Field
                label="Post Caption (Local SEO Optimized)"
                value={content}
                onChangeText={setContent}
                multiline
                placeholder="Caption will appear here or write your own…"
              />

              <Field
                label="Media URL (Image)"
                value={media}
                onChangeText={setMedia}
                placeholder="https://your-cdn.com/photo.jpg"
                autoCapitalize="none"
              />

              <Action
                label="Next: Google Post Details →"
                disabled={!content.trim()}
                onPress={() => setStep(1)}
              />
            </Card>
          )}

          {/* STEP 2: GOOGLE POST DETAILS */}
          {step === 1 && (
            <Card style={{ gap: 14 }}>
              <View>
                <Text style={ui.heading}>Google Post Format</Text>
                <Text style={ui.caption}>Select how this update appears on your Google Maps & Search profile.</Text>
              </View>

              <View style={[ui.row, { gap: 8 }]}>
                {[
                  { key: 'whats_new', label: "What's New" },
                  { key: 'offer', label: 'Special Offer' },
                  { key: 'event', label: 'Event' },
                ].map((type) => (
                  <Chip
                    key={type.key}
                    label={type.label}
                    selected={gbpPostType === type.key}
                    onPress={() => setGbpPostType(type.key as any)}
                  />
                ))}
              </View>

              <View style={{ gap: 8 }}>
                <Text style={ui.label}>Call-to-Action (CTA) Button on Google</Text>
                <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}>
                  {[
                    { key: 'LEARN_MORE', label: 'Learn More' },
                    { key: 'CALL', label: 'Call Now' },
                    { key: 'BOOK', label: 'Book Online' },
                    { key: 'ORDER_ONLINE', label: 'Order Online' },
                  ].map((cta) => (
                    <Chip
                      key={cta.key}
                      label={cta.label}
                      selected={ctaType === cta.key}
                      onPress={() => setCtaType(cta.key as any)}
                    />
                  ))}
                </View>
              </View>

              {gbpPostType === 'offer' && (
                <Field
                  label="Coupon / Discount Code (Optional)"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  placeholder="e.g. SUMMER20"
                  autoCapitalize="characters"
                />
              )}

              <Action label="Next: Preview & Publish →" onPress={() => setStep(2)} />
              <Action secondary label="← Back to Content" onPress={() => setStep(0)} />
            </Card>
          )}

          {/* STEP 3: PREVIEW & PUBLISH */}
          {step === 2 && (
            <Card style={{ gap: 12 }}>
              <View style={[ui.row, { gap: 8 }]}>
                <Badge label="GOOGLE BUSINESS" accent />
                <Badge label={gbpPostType.toUpperCase().replace('_', ' ')} />
              </View>

              {/* Google Business Feed Preview Simulation */}
              <View style={[ui.card, { padding: 14, gap: 10, backgroundColor: colors.surface }]}>
                <View style={[ui.row, { gap: 10 }]}>
                  <Avatar name={workspace.data?.name || 'Your Business'} size={38} />
                  <View>
                    <Text style={ui.heading}>{workspace.data?.name || 'Your Business'}</Text>
                    <Text style={ui.caption}>Google Business Profile · Live Update</Text>
                  </View>
                </View>

                <Text style={ui.body}>{content}</Text>

                {couponCode ? (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.brandSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brandDark }}>Coupon: {couponCode}</Text>
                  </View>
                ) : null}

                {mediaUrls[0] ? (
                  <Image
                    source={{ uri: mediaUrls[0] }}
                    style={{ width: '100%', height: 210, borderRadius: 12 }}
                    accessibilityLabel="Post preview"
                    alt="Post preview"
                  />
                ) : null}

                <View style={{ alignSelf: 'flex-start', backgroundColor: colors.brand, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                    {ctaType === 'CALL' ? '📞 Call Now' : ctaType === 'BOOK' ? '📅 Book' : ctaType === 'ORDER_ONLINE' ? '🛍️ Order' : '📖 Learn More'}
                  </Text>
                </View>
              </View>

              <Field label="Schedule Date (YYYY-MM-DD, Optional)" value={date} onChangeText={setDate} placeholder="2026-10-15" />
              <Field label="Schedule Time (HH:MM, Optional)" value={time} onChangeText={setTime} placeholder="14:30" />

              <View style={[ui.row, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Action
                    label={busy ? 'Publishing…' : '✓ Publish to Google'}
                    disabled={busy}
                    onPress={() => save('published')}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Action
                    secondary
                    label="Schedule for Later"
                    disabled={busy || !date.trim()}
                    onPress={() => save('scheduled')}
                  />
                </View>
              </View>

              <Action secondary label="Save as Draft" disabled={busy} onPress={() => save('draft')} />
              <Action secondary label="← Back to Post Details" disabled={busy} onPress={() => setStep(1)} />
            </Card>
          )}

          <Action secondary label="Close" onPress={() => setOpen(false)} />
        </Screen>
      </Modal>

      {/* 1-Tap WhatsApp Review Request Sheet */}
      <ReviewRequestSheet
        visible={requestOpen}
        onClose={() => setRequestOpen(false)}
        businessName={workspace.data?.name || 'Your Business'}
        reviewUrl={
          gbpPlace.data?.place?.reviewUrl ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workspace.data?.name || 'Your Business')}`
        }
        apiRequest={apiRequest}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  channelChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

