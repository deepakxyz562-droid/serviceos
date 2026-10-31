import * as Crypto from 'expo-crypto';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Screen,
  Card,
  Field,
  Action,
  Badge,
  Chip,
  ErrorNotice,
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
import { PostsBoard } from '../../src/components/gbp/posts-list';
import { ViralVideoModal } from '../../src/components/gbp/viral-video-modal';
import { StayActiveSocialMediaCard } from '../../src/components/social/stay-active-card';
import type { BgosWorkspace } from '../../src/types/bgos-contracts';
import type { GbpPlaceResult } from '../../src/components/gbp/types';

type Account = { id: string; platform: string; accountName: string; accountId?: string; isActive: boolean };

type BrandProfileData = {
  profile?: {
    businessName?: string;
    industry?: string;
    services?: string[];
    products?: string[];
  };
};

export default function MarketingScreen() {
  const router = useRouter();
  // "Generate text post" CTA on the Google Post tab lands here with ?generate=1
  // → the composer opens straight away.
  const params = useLocalSearchParams<{ generate?: string }>();
  const pendingRequest = useRef<{ body: string; key: string } | null>(null);
  const saving = useRef(false);
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const discover = useResource<{ activeProfile?: { id: string; name: string } }>('/api/gbp/accounts/discover');
  const accounts = useResource<{ data: Account[] }>('/api/social/accounts');
  const brandProfile = useResource<BrandProfileData>('/api/brand-profile');

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
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [boardRefresh, setBoardRefresh] = useState(0);

  useEffect(() => {
    if (params.generate === '1') {
      setError(null);
      setOpen(true);
      // Clear the flag so a later push with ?generate=1 re-triggers the composer.
      router.setParams({ generate: '' });
    }
  }, [params.generate, router]);

  const available = accounts.data?.data || [];
  const activeProfileId = discover.data?.activeProfile?.id;
  const gbpAccount =
    available.find(
      (a) =>
        a.platform === 'googlebusiness' &&
        a.isActive &&
        (activeProfileId
          ? a.id === activeProfileId || a.accountId === activeProfileId
          : a.accountName?.toLowerCase().includes('fieser') || a.accountId === '10777612572223040949')
    ) || available.find((a) => a.platform === 'googlebusiness' && a.isActive);
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
      // error so the user can retry or write the caption below manually.
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

    const contentCheck = validateSocialPost(content.trim(), ['googlebusiness'], mediaUrls);
    if (contentCheck) {
      setError(contentCheck);
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
          : 'Draft saved. Find it under the Not Posted pill.'
      );
      setBoardRefresh((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function openGoogleConnect() {
    try {
      let ticketParam = '';
      try {
        const res = await apiRequest<{ ticket: string }>('/api/bgos/mobile-auth/handoff', { method: 'POST' });
        if (res?.ticket) ticketParam = `&ticket=${encodeURIComponent(res.ticket)}`;
      } catch {}
      await Linking.openURL(`${WEB_URL}/api/oauth/googlebusiness/connect?product=bgos&returnView=socialMedia${ticketParam}`);
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

  function openComposer() {
    setError(null);
    setOpen(true);
  }

  const dynamicServices = React.useMemo(() => {
    const brandServices = [
      ...(brandProfile.data?.profile?.services || []),
      ...(brandProfile.data?.profile?.products || []),
    ].filter(Boolean);

    if (brandServices.length > 0) {
      return brandServices.slice(0, 6).map((s) => ({
        label: `✨ ${s.slice(0, 24)}`,
        val: s,
      }));
    }

    const category = (gbpPlace.data?.place?.category || '').toLowerCase();
    const title = (discover.data?.activeProfile?.name || gbpPlace.data?.place?.title || '').toLowerCase();

    if (category.includes('software') || category.includes('tech') || title.includes('fieser') || title.includes('zozo')) {
      return [
        { label: '💻 Custom Web Apps', val: 'modern responsive web application and client portal development' },
        { label: '🤖 AI Chatbots & Agents', val: 'smart AI receptionist, chatbots and 24/7 automated business workflows' },
        { label: '📱 Mobile App Development', val: 'high-performance native iOS and Android mobile app development' },
        { label: '📈 Local SEO & Maps Growth', val: 'Google Business Profile local SEO ranking and Google Maps visibility' },
        { label: '⚡ Cloud & SaaS Consulting', val: 'cloud infrastructure setup, software integrations and SaaS consulting' },
      ];
    }

    if (category.includes('market') || category.includes('community') || title.includes('market') || title.includes('ganga')) {
      return [
        { label: '🏪 Store Directory & Stalls', val: 'daily fresh grocery, electronics and retail stalls directory' },
        { label: '🛍️ Weekend Shopping Bazaar', val: 'special weekend wholesale deals on everyday essentials' },
        { label: '🅿️ Parking & Amenities', val: 'spacious two-wheeler and four-wheeler visitor parking' },
        { label: '🎁 Festive Discounts', val: 'limited-time festive offers from local market retailers' },
      ];
    }

    if (category.includes('fabricat') || category.includes('weld') || title.includes('fabricat')) {
      return [
        { label: '🚪 Gates & Grills', val: 'custom gate and window grill fabrication' },
        { label: '🛡️ SS Railings', val: 'grade 304 stainless steel balcony and staircase railings' },
        { label: '🏭 Industrial Sheds', val: 'heavy-duty industrial factory shed and roofing structure' },
        { label: '✨ Laser Cutting', val: 'designer CNC metal laser cutting and decorative screens' },
      ];
    }

    return [
      { label: '⭐ 5-Star Customer Service', val: 'five-star customer service and verified quality guarantee' },
      { label: '🎁 Exclusive Promotion', val: 'special discount for local customers this week' },
      { label: '🕒 Fast Turnaround', val: 'quick response and same-day priority service' },
      { label: '📍 Visit Our Location', val: 'visit our verified local store or showroom today' },
    ];
  }, [brandProfile.data, gbpPlace.data, discover.data]);

  return (
    <View style={{ flex: 1 }}>
      <Screen
        title="AI Post"
        subtitle="AI-powered Google updates, local offers & post scheduling."
        showBack={true}
        onBack={() => {
          if (router.canGoBack?.()) router.back();
          else router.push('/(tabs)/index');
        }}
        onRefresh={async () => {
          await Promise.all([accounts.refresh(), workspace.refresh(), gbpPlace.refresh()]).catch(() => {});
          setBoardRefresh((k) => k + 1);
        }}
        rightAction={
          <Action
            compact
            label="＋ Post"
            icon="auto-awesome"
            onPress={openComposer}
          />
        }
      >
        {notice ? (
          <View style={{ backgroundColor: colors.successSoft, padding: 12, borderRadius: 12, marginBottom: 8 }}>
            <Text style={{ color: colors.success, fontWeight: '700' }}>✓ {notice}</Text>
          </View>
        ) : null}

        <ErrorNotice message={error || accounts.error} retry={() => accounts.refresh()} />

        {/* Viral Video Banner (Dhanda AI benchmark) — Interactive */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try Generating Viral Video"
          onPress={() => setVideoModalOpen(true)}
          style={({ pressed }) => ({
            backgroundColor: '#FAF5FF',
            borderColor: '#E9D5FF',
            borderWidth: 1,
            borderRadius: 14,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🎬</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B21A8' }}>
              Try Generating Viral Video (0/5)
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand }}>Explore →</Text>
        </Pressable>

        {/* Keyword Planner Tip (Dhanda AI benchmark) */}
        <View
          style={{
            backgroundColor: '#EFF6FF',
            borderColor: '#BFDBFE',
            borderWidth: 1,
            borderRadius: 14,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={{ fontSize: 16 }}>💡</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>
                Google works best with keywords
              </Text>
              <Text style={{ fontSize: 11, color: '#3B82F6', marginTop: 1 }}>
                Using your keywords we post daily on your Google Profile.
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Keyword Planner"
            onPress={() => router.push('/keyword-planner')}
            style={{
              backgroundColor: '#2563EB',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Keywords</Text>
          </Pressable>
        </View>

        {/* Stay Active on Social Media (Facebook & Instagram connection) */}
        <StayActiveSocialMediaCard />

        {/* 6 status pills (2 rows) + fetched post list + Approve/Reject on Pending */}
        <PostsBoard refreshKey={boardRefresh} />
      </Screen>

      {/* Floating full-width gradient CTA + voice mic (Dhanda AI benchmark) */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate AI Post"
          disabled={busy}
          onPress={openComposer}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 50,
            borderRadius: 25,
            overflow: 'hidden',
            opacity: busy ? 0.6 : pressed ? 0.85 : 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 8,
          })}
        >
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
            <View style={{ flex: 1, backgroundColor: '#C084FC' }} />
            <View style={{ flex: 1, backgroundColor: '#A855F7' }} />
          </View>
          <View style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <MaterialIcons name="auto-awesome" size={17} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Generate AI Post ✨</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voice assistant"
          onPress={() => Alert.alert('Voice Assistant', 'Speak your marketing request in Hindi or English…')}
          style={({ pressed }) => ({
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 8,
          })}
        >
          <MaterialIcons name="mic" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* 3-Step Create / Preview Modal (Google Post Studio) */}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { if (!busy) setOpen(false); }}
      >
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

              {/* 2-Click Offering Chips (Dynamic from Brand Brain / Category) */}
              <Text style={ui.label}>🔥 Select Service to Promote (2-Click Draft)</Text>
              <View style={[ui.row, { gap: 6, flexWrap: 'wrap' }]}>
                {dynamicServices.map((item) => (
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
        businessName={gbpPlace.data?.place?.title || workspace.data?.name || 'Your Business'}
        reviewUrl={
          gbpPlace.data?.place?.reviewUrl ||
          (gbpPlace.data?.place?.placeId
            ? `https://search.google.com/local/writereview?placeid=${gbpPlace.data.place.placeId}`
            : gbpPlace.data?.place?.mapsUrl ||
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                gbpPlace.data?.place?.title || workspace.data?.name || 'Your Business'
              )}`)
        }
        apiRequest={apiRequest}
      />

      {/* AI Viral Video & Reel Studio Modal */}
      <ViralVideoModal
        visible={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        businessName={workspace.data?.name || gbpPlace.data?.place?.title || 'My Business'}
        onSchedule={(videoScript) => {
          setTopic(videoScript.hook);
          setContent(`${videoScript.hook}\n\n${videoScript.scenes.map(s => `Scene ${s.scene}: ${s.onScreenText}`).join('\n')}\n\n${videoScript.hashtags}`);
          setNotice('Video reel script loaded into post composer.');
          setOpen(true);
        }}
      />
    </View>
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
