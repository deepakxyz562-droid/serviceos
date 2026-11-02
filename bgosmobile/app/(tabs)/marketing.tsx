import '../../src/lib/runtime-polyfills';
import {
  createDesign,
  validateDesign,
  createFieserosCampaignDesign,
  createCommercialPosterDesign,
  type MarketingDesign,
  type CommercialTheme,
  COMMERCIAL_THEMES,
  COMMERCIAL_THEME_KEYS,
} from '../../../shared/marketing-design';
import { EditableDesign } from '../../src/components/design/editable-design';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { WEB_URL } from '../../src/lib/constants';
import { validateSocialPost } from '../../src/lib/social-validation';
import { futureLocalTime } from '../../src/lib/dates';
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
    website?: string;
    location?: string;
    services?: string[];
    products?: string[];
    usps?: string;
    currentOffers?: string;
  };
  logo?: string | null;
  brandDetails?: {
    logoUrl?: string;
    tagline?: string;
  };
};

export type LayoutId = 'editorial' | 'photo_led' | 'bold';

interface CreativeLayout {
  id: LayoutId;
  name: string;
  headline: string;
  subtitle: string;
  badge: string;
  ctaText: string;
  theme: string;
  photoUrl: string;
}

const DEFAULT_CAPTION = `Switching between customer calls, job diaries, quote calculators, and messaging apps eats away the hours you should be spending on the tools or growing your business.

Meet the Fieseros AI Assistant—turning natural conversation into connected field service workflows.

Just say: “Schedule a boiler repair for Sarah tomorrow, assign Mike, create a £350 quote, and prepare her confirmation.”

In seconds, Fieseros maps the customer, books the job, drafts the quote, and queues her confirmation for your review. Less repetitive admin, zero lost paperwork, and more time to focus on your customers and high-value jobs.

Discover what Fieseros can do for your business: https://fieseros.com

#Fieseros #FieldServiceManagement #TradeBusiness #HVAC #Plumbing`;

const DEFAULT_ALT_HEADLINES = [
  'From one instruction to a connected workflow.',
  'Run your field service business in plain English.',
  'Stop juggling apps. Just tell your assistant.',
];

function AutoBrandedPosterCard({
  photoUri,
  headline,
  subtitle,
  badge,
  ctaText,
  businessName,
  phone,
  website,
  logoUri,
  tagline,
  height = 360,
  aspectRatio = 4 / 5,
  isGenerating = false,
  generatingText,
  theme = 'royal_gold',
}: {
  photoUri?: string | null;
  headline: string;
  subtitle?: string;
  badge: string;
  ctaText: string;
  businessName: string;
  phone?: string;
  website?: string;
  logoUri?: string | null;
  tagline?: string;
  height?: number;
  aspectRatio?: number;
  isGenerating?: boolean;
  generatingText?: string;
  theme?: CommercialTheme | string;
}) {
  const isCompact = height < 260;
  const cleanWeb = website ? website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  const initial = (businessName || 'B').trim().charAt(0).toUpperCase();
  const themeConfig = COMMERCIAL_THEMES[theme as CommercialTheme] || COMMERCIAL_THEMES.royal_gold;

  return (
    <View
      style={{
        height,
        aspectRatio,
        alignSelf: 'center',
        borderRadius: isCompact ? 12 : 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: themeConfig.bg,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
        position: 'relative',
      }}
    >
      <Image
        source={photoUri ? { uri: photoUri } : require('../../assets/fieseros-ai-assistant-poster.jpg')}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
      />

      {/* Top Header Scrim with Offer Badge & Optional Logo */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingHorizontal: isCompact ? 8 : 12,
          paddingVertical: isCompact ? 6 : 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      >
        <View
          style={{
            backgroundColor: themeConfig.badgeBg,
            paddingHorizontal: isCompact ? 6 : 10,
            paddingVertical: isCompact ? 2 : 4,
            borderRadius: isCompact ? 5 : 8,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            style={{
              color: themeConfig.badgeText,
              fontSize: isCompact ? 8.5 : 10.5,
              fontWeight: '800',
              letterSpacing: 0.5,
            }}
          >
            {badge || 'SPECIAL OFFER'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              style={{
                width: isCompact ? 20 : 24,
                height: isCompact ? 20 : 24,
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.9)',
              }}
              resizeMode="cover"
            />
          ) : null}
          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.65)',
              paddingHorizontal: isCompact ? 5 : 8,
              paddingVertical: isCompact ? 2 : 3.5,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: isCompact ? 8 : 9.5, fontWeight: '700' }}>1080 × 1350</Text>
          </View>
        </View>
      </View>

      {/* Center Content Scrim: Dynamic Headline with Theme Scrim */}
      <View
        style={{
          position: 'absolute',
          bottom: isCompact ? 38 : 50,
          left: 0,
          right: 0,
          paddingHorizontal: isCompact ? 10 : 14,
          paddingVertical: isCompact ? 6 : 12,
          backgroundColor: themeConfig.scrimBg,
        }}
      >
        <Text
          numberOfLines={2}
          style={{
            color: '#FFFFFF',
            fontSize: isCompact ? 12 : 16,
            fontWeight: '900',
            lineHeight: isCompact ? 16 : 22,
            letterSpacing: -0.3,
            textShadowColor: 'rgba(0,0,0,0.95)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 6,
          }}
        >
          {headline || 'Professional Business Services'}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              color: themeConfig.subColor,
              fontSize: isCompact ? 9 : 11,
              fontWeight: '700',
              marginTop: isCompact ? 1 : 3,
              textShadowColor: 'rgba(0,0,0,0.85)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Auto-Branded Themed Footer Strip */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: isCompact ? 38 : 50,
          backgroundColor: themeConfig.footerBg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: isCompact ? 8 : 12,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.12)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, paddingRight: 6 }}>
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              style={{
                width: isCompact ? 22 : 28,
                height: isCompact ? 22 : 28,
                borderRadius: isCompact ? 5 : 6,
                marginRight: 6,
                backgroundColor: '#1E293B',
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: isCompact ? 22 : 28,
                height: isCompact ? 22 : 28,
                borderRadius: isCompact ? 5 : 6,
                marginRight: 6,
                backgroundColor: themeConfig.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: isCompact ? 10 : 13 }}>
                {initial}
              </Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ color: '#FFFFFF', fontSize: isCompact ? 9.5 : 11.5, fontWeight: '800' }}
            >
              {businessName || 'Commercial Brand'}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: themeConfig.subColor, fontSize: isCompact ? 8 : 9.5, fontWeight: '600' }}
            >
              {tagline || (cleanWeb ? `🌐 ${cleanWeb}` : 'Verified Business')}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <View
            style={{
              backgroundColor: themeConfig.ctaBg,
              paddingHorizontal: isCompact ? 5 : 7,
              paddingVertical: isCompact ? 1.5 : 2.5,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: themeConfig.ctaText, fontSize: isCompact ? 7.5 : 9, fontWeight: '800' }}>
              {ctaText || 'VISIT STORE'}
            </Text>
          </View>
          {cleanWeb ? (
            <Text numberOfLines={1} style={{ color: '#94A3B8', fontSize: isCompact ? 7 : 8.5, marginTop: 1, maxWidth: 120 }}>
              {cleanWeb.slice(0, 20)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Loading Overlay if generating */}
      {isGenerating && (
        <View
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: 'rgba(9, 13, 22, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            zIndex: 10,
          }}
        >
          <ActivityIndicator size="small" color={themeConfig.accent} />
          <Text style={{ color: '#FFFFFF', fontSize: isCompact ? 9.5 : 11, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
            {generatingText || 'AI Rendering Visual...'}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MarketingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ generate?: string; mode?: string }>();
  const pendingRequest = useRef<{ body: string; key: string } | null>(null);
  const saving = useRef(false);

  // ── Resources ─────────────────────────────────────────────────────────────
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const discover = useResource<{ activeProfile?: { id: string; name: string } }>('/api/gbp/accounts/discover');
  const accounts = useResource<{ data: Account[] }>('/api/social/accounts');
  const brandProfile = useResource<BrandProfileData>('/api/brand-profile');
  const promptSuggestions = useResource<{
    business?: { name?: string; category?: string };
    suggestions: Array<{ id: string; category?: string; chipLabel?: string; icon?: string; title?: string; prompt: string }>;
  }>('/api/social/prompts/suggestions');

  // ── Mode Switch: Studio / Create vs Autopilot vs Posts & Approvals ──────────
  const [activeMode, setActiveMode] = useState<'studio' | 'autopilot' | 'posts'>(
    params.mode === 'posts' ? 'posts' : params.mode === 'autopilot' ? 'autopilot' : 'studio'
  );

  // ── Autopilot State ────────────────────────────────────────────────────────
  const [apConfig, setApConfig] = useState<{
    enabled: boolean;
    duration: '30_days' | '1_year';
    platforms: string[];
    postingTime: string;
    totalPostsCreated: number;
    daysRemaining: number;
  }>({
    enabled: false,
    duration: '30_days',
    platforms: ['googlebusiness', 'instagram', 'facebook'],
    postingTime: '09:00',
    totalPostsCreated: 0,
    daysRemaining: 30,
  });
  const [apLoading, setApLoading] = useState(false);
  const [apTriggering, setApTriggering] = useState(false);

  const loadAutopilot = async () => {
    try {
      setApLoading(true);
      const res = await apiRequest<{ config: any; daysRemaining: number }>('/api/social/autopilot');
      if (res?.config) {
        setApConfig({
          enabled: res.config.enabled,
          duration: res.config.duration || '30_days',
          platforms: res.config.platforms || ['googlebusiness', 'instagram', 'facebook'],
          postingTime: res.config.postingTime || '09:00',
          totalPostsCreated: res.config.totalPostsCreated || 0,
          daysRemaining: res.daysRemaining || 30,
        });
      }
    } catch {} finally {
      setApLoading(false);
    }
  };

  const saveAutopilot = async (updates: Partial<typeof apConfig> & { triggerPostNow?: boolean }) => {
    try {
      setApLoading(true);
      const res = await apiRequest<{ config: any; daysRemaining: number; message: string }>('/api/social/autopilot', {
        method: 'POST',
        body: {
          enabled: updates.enabled !== undefined ? updates.enabled : apConfig.enabled,
          duration: updates.duration || apConfig.duration,
          platforms: updates.platforms || apConfig.platforms,
          postingTime: updates.postingTime || apConfig.postingTime,
          timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',
          triggerPostNow: updates.triggerPostNow || false,
        },
      });
      if (res?.config) {
        setApConfig({
          enabled: res.config.enabled,
          duration: res.config.duration,
          platforms: res.config.platforms,
          postingTime: res.config.postingTime,
          totalPostsCreated: res.config.totalPostsCreated,
          daysRemaining: res.daysRemaining,
        });
        Alert.alert('Autopilot', res.message || 'Settings saved successfully');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update autopilot');
    } finally {
      setApLoading(false);
    }
  };

  // ── Studio 3-Step Flow (01 Create -> 02 Design -> 03 Review) ───────────────
  const [studioStep, setStudioStep] = useState<1 | 2 | 3>(1);
  const [studioSubTab, setStudioSubTab] = useState<'chat' | 'design'>('chat');

  // ── Content State ──────────────────────────────────────────────────────────
  const [promptInput, setPromptInput] = useState('');
  const [activeUserPrompt, setActiveUserPrompt] = useState(
    'Create a professional social media marketing post promoting the Fieseros AI Assistant.'
  );
  const [generationMode, setGenerationMode] = useState<'poster' | 'graphic' | 'image_only'>('poster');
  const [activeVisualFormat, setActiveVisualFormat] = useState<'poster' | 'canvas'>('poster');
  const [customPosterUri, setCustomPosterUri] = useState<string | null>(null);
  const [alternativeHeadlines, setAlternativeHeadlines] = useState<string[]>(DEFAULT_ALT_HEADLINES);
  const [selectedLayout, setSelectedLayout] = useState<LayoutId>('editorial');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('4:5');
  const [colorTheme, setColorTheme] = useState<CommercialTheme>('royal_gold');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  // Graphic content elements — Fieseros campaign initialized
  const [headline, setHeadline] = useState('Less admin. More jobs.');
  const [discountBadge, setDiscountBadge] = useState('AI WORKFLOW');
  const [subtitle, setSubtitle] = useState('Meet your Fieseros AI Assistant.');
  const [ctaText, setCtaText] = useState('Explore Fieseros');
  const [bgPhotoUrl, setBgPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1080&q=80'
  );

  // Caption & copy
  const [caption, setCaption] = useState(DEFAULT_CAPTION);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(caption);
  const [isEditingText, setIsEditingText] = useState(false);

  // Offer details & Review step
  const [reviewPlatform, setReviewPlatform] = useState<'instagram' | 'facebook' | 'googlebusiness'>('instagram');
  const [offerStartDate, setOfferStartDate] = useState('6 Nov');
  const [offerEndDate, setOfferEndDate] = useState('8 Nov');
  const [bookingLink, setBookingLink] = useState('https://fieseros.com');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Status & loading
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [boardRefresh, setBoardRefresh] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Handle URL params
  useEffect(() => {
    if (params.generate === '1') {
      setActiveMode('studio');
      setStudioStep(1);
      setStudioSubTab('chat');
      router.setParams({ generate: '' });
    }
    if (params.mode === 'posts') {
      setActiveMode('posts');
      router.setParams({ mode: '' });
    }
  }, [params.generate, params.mode]);

  // Social account resolution
  const availableAccounts = accounts.data?.data || [];
  const activeProfileId = discover.data?.activeProfile?.id;
  const gbpAccount =
    availableAccounts.find(
      (a) =>
        a.platform === 'googlebusiness' &&
        a.isActive &&
        (activeProfileId
          ? a.id === activeProfileId || a.accountId === activeProfileId
          : a.accountName?.toLowerCase().includes('fieser') || a.accountId === '10777612572223040949')
    ) || availableAccounts.find((a) => a.platform === 'googlebusiness' && a.isActive);
  const fbAccount = availableAccounts.find((a) => a.platform === 'facebook' && a.isActive);
  const igAccount = availableAccounts.find((a) => a.platform === 'instagram' && a.isActive);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['googlebusiness', 'instagram', 'facebook']);

  // Sync selectedPlatforms with connected accounts so publishing doesn't target disconnected channels
  useEffect(() => {
    if (availableAccounts.length > 0) {
      const activePlatforms = Array.from(new Set(availableAccounts.filter((a) => a.isActive).map((a) => a.platform)));
      if (activePlatforms.length > 0) {
        setSelectedPlatforms((prev) => {
          const valid = prev.filter((p) => activePlatforms.includes(p));
          const withGbp = activePlatforms.includes('googlebusiness') && !valid.includes('googlebusiness')
            ? ['googlebusiness', ...valid]
            : valid;
          return withGbp.length > 0 ? withGbp : [activePlatforms[0]];
        });
      }
    }
  }, [availableAccounts]);

  const businessDisplayName =
    discover.data?.activeProfile?.name ||
    brandProfile.data?.profile?.businessName ||
    gbpPlace.data?.place?.title ||
    'Fieseros';

  // 3 Creative Directions
  const layouts: CreativeLayout[] = useMemo(
    () => [
      {
        id: 'editorial',
        name: 'Editorial',
        headline: headline || 'Make more of your weekend.',
        subtitle: subtitle || 'Selected services. Book your appointment today.',
        badge: discountBadge || '20% OFF',
        ctaText: ctaText || 'Book now',
        theme: 'sand_olive',
        photoUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1080&q=80',
      },
      {
        id: 'photo_led',
        name: 'Photo-led',
        headline: discountBadge || '20% OFF',
        subtitle: 'Selected services',
        badge: 'EXCLUSIVE',
        ctaText: 'Book now',
        theme: 'beige',
        photoUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1080&q=80',
      },
      {
        id: 'bold',
        name: 'Bold',
        headline: 'WEEKEND OFFER',
        subtitle: 'Selected services',
        badge: discountBadge || '20% OFF',
        ctaText: 'Claim offer',
        theme: 'emerald_gold',
        photoUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1080&q=80',
      },
    ],
    [headline, subtitle, discountBadge, ctaText]
  );

  // Targets for publishing
  const targets = useMemo(() => {
    const list: { platform: string; socialAccountId: string }[] = [];
    if (selectedPlatforms.includes('googlebusiness') && gbpAccount) {
      list.push({ platform: 'googlebusiness', socialAccountId: gbpAccount.id });
    }
    if (selectedPlatforms.includes('facebook') && fbAccount) {
      list.push({ platform: 'facebook', socialAccountId: fbAccount.id });
    }
    if (selectedPlatforms.includes('instagram') && igAccount) {
      list.push({ platform: 'instagram', socialAccountId: igAccount.id });
    }
    return list;
  }, [selectedPlatforms, gbpAccount, fbAccount, igAccount]);

  const [brandLogoUri, setBrandLogoUri] = useState<string | null>(null);
  const [brandTagline, setBrandTagline] = useState<string>('');
  const [brandWebsite, setBrandWebsite] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('');
  const [refreshingIdeas, setRefreshingIdeas] = useState<boolean>(false);

  const effectiveBusinessName =
    brandName ||
    brandProfile.data?.profile?.businessName ||
    gbpPlace.data?.place?.title ||
    workspace.data?.bookingPageConfig?.businessName ||
    discover.data?.activeProfile?.name ||
    'Commercial Brand';
  const effectiveBusinessPhone = workspace.data?.bookingPageConfig?.phone;
  const effectiveBusinessWebsite =
    brandWebsite ||
    brandProfile.data?.profile?.website ||
    workspace.data?.links?.profile ||
    'fieseros.com';
  const effectiveBusinessTagline =
    brandTagline ||
    brandProfile.data?.brandDetails?.tagline ||
    brandProfile.data?.profile?.industry ||
    '';
  const effectiveBusinessLogo =
    brandLogoUri ||
    brandProfile.data?.logo ||
    brandProfile.data?.brandDetails?.logoUrl ||
    null;

  const handlePickLogo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow photo gallery access to pick a business logo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setBrandLogoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Failed to pick logo:', err);
    }
  };

  const handleRefreshIdeas = async () => {
    if (refreshingIdeas) return;
    setRefreshingIdeas(true);
    try {
      const params = new URLSearchParams({ refresh: '1' });
      const cat =
        brandProfile.data?.profile?.industry ||
        gbpPlace.data?.place?.category ||
        '';
      if (cat) params.set('category', cat);
      if (effectiveBusinessName) params.set('businessName', effectiveBusinessName);

      const fresh = await apiRequest<{
        business?: { name?: string; category?: string };
        suggestions: Array<{ id: string; category?: string; chipLabel?: string; icon?: string; title?: string; prompt: string }>;
      }>(`/api/social/prompts/suggestions?${params.toString()}`);

      if (fresh?.suggestions && fresh.suggestions.length > 0) {
        promptSuggestions.setData(fresh);
      }
    } catch (err) {
      console.warn('Failed to refresh ideas:', err);
      promptSuggestions.refresh();
    } finally {
      setRefreshingIdeas(false);
    }
  };

  useEffect(() => {
    const combined = `${brandProfile.data?.profile?.industry || ''} ${gbpPlace.data?.place?.category || ''} ${effectiveBusinessName}`.toLowerCase();
    if (/sweet|mithai|bakery|dessert|restaurant|cafe|food/.test(combined)) {
      setColorTheme('royal_gold');
    } else if (/jewel|gold|diamond|gem|luxury/.test(combined)) {
      setColorTheme('luxe_dark');
    } else if (/cloth|saree|boutique|fashion|bridal|apparel|garment|textile/.test(combined)) {
      setColorTheme('rose_chic');
    } else if (/software|tech|it\b|code|saas|cloud|digital|ai\b|data/.test(combined)) {
      setColorTheme('cyber_tech');
    } else if (/plumb|hvac|electr|repair|construct|paint|handyman|pest/.test(combined)) {
      setColorTheme('trust_amber');
    }
  }, [brandProfile.data?.profile?.industry, gbpPlace.data?.place?.category, effectiveBusinessName]);

  const cycleTheme = (nextTheme: CommercialTheme) => {
    setColorTheme(nextTheme);
    setCustomDesign(
      createCommercialPosterDesign({
        brand: effectiveBusinessName,
        headline,
        subtitle,
        badge: discountBadge,
        cta: ctaText,
        phone: undefined,
        website: effectiveBusinessWebsite,
        photo: customPosterUri || bgPhotoUrl,
        ratio: aspectRatio,
        theme: nextTheme,
        logoUrl: effectiveBusinessLogo || undefined,
        tagline: effectiveBusinessTagline || undefined,
      })
    );
  };

  async function handleRegenerateImage() {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    setError(null);
    try {
      const requestId = `mob-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const res = await apiRequest<{ jobId: string; status: string }>('/api/social/designs/image', {
        method: 'POST',
        body: {
          prompt: activeUserPrompt || promptInput || 'commercial product photography',
          provider: 'cloudflare',
          requestId,
          isPoster: true,
          businessName: effectiveBusinessName,
          category: brandProfile.data?.profile?.industry || gbpPlace.data?.place?.category || '',
          products: brandProfile.data?.profile?.products || '',
          services: brandProfile.data?.profile?.services || '',
          website: effectiveBusinessWebsite,
        },
      });

      if (res?.jobId) {
        const targetJobId = res.jobId;
        const pollStart = Date.now();
        const pollInterval = setInterval(async () => {
          try {
            const check = await apiRequest<{ status: string; result?: { url?: string } }>(
              `/api/social/designs/image?id=${encodeURIComponent(targetJobId)}`
            );
            if (check?.status === 'completed' && check.result?.url) {
              clearInterval(pollInterval);
              setIsGeneratingImage(false);
              const generatedUrl = check.result.url;
              setCustomPosterUri(generatedUrl);
              setBgPhotoUrl(generatedUrl);
              setCustomDesign((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  layers: prev.layers.map((l) =>
                    l.id === 'bg_photo' || l.type === 'image' ? { ...l, src: generatedUrl } : l
                  ),
                };
              });
              setSuccessNotice('✨ Fresh commercial photo background generated!');
              setTimeout(() => setSuccessNotice(null), 3500);
            } else if (check?.status === 'failed' || check?.status === 'cancelled' || Date.now() - pollStart > 45000) {
              clearInterval(pollInterval);
              setIsGeneratingImage(false);
              setError('Background image generation timed out. Please try again.');
            }
          } catch {
            clearInterval(pollInterval);
            setIsGeneratingImage(false);
          }
        }, 1500);
      } else {
        setIsGeneratingImage(false);
      }
    } catch (err: unknown) {
      setIsGeneratingImage(false);
      setError((err as Error).message || 'Failed to regenerate image.');
    }
  }

  const [customDesign, setCustomDesign] = useState<MarketingDesign | null>(null);
  const design = useMemo(() => {
    if (customDesign) return customDesign;
    return createCommercialPosterDesign({
      brand: effectiveBusinessName,
      headline,
      subtitle,
      badge: discountBadge,
      cta: ctaText,
      phone: undefined,
      website: effectiveBusinessWebsite,
      photo: customPosterUri || bgPhotoUrl,
      ratio: aspectRatio,
      theme: colorTheme,
      logoUrl: effectiveBusinessLogo || undefined,
      tagline: effectiveBusinessTagline || undefined,
    });
  }, [
    customDesign,
    effectiveBusinessName,
    headline,
    subtitle,
    discountBadge,
    ctaText,
    effectiveBusinessWebsite,
    customPosterUri,
    bgPhotoUrl,
    aspectRatio,
    colorTheme,
    effectiveBusinessLogo,
    effectiveBusinessTagline,
  ]);

  function handleSelectHeadline(newHeadline: string) {
    setHeadline(newHeadline);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) =>
          l.id === 'headline' ? { ...l, text: newHeadline } : l
        ),
      });
    }
  }

  function handleUpdateHeadline(val: string) {
    setHeadline(val);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) => (l.id === 'headline' ? { ...l, text: val } : l)),
      });
    }
  }

  function handleUpdateDiscountBadge(val: string) {
    setDiscountBadge(val);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) => (l.id === 'badge' ? { ...l, text: val } : l)),
      });
    }
  }

  function handleUpdateCtaText(val: string) {
    setCtaText(val);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) => (l.id === 'cta' ? { ...l, text: `${val} →` } : l)),
      });
    }
  }

  function handleCustomDesignChange(updated: MarketingDesign) {
    setCustomDesign(updated);
    const hl = updated.layers.find((l) => l.id === 'headline');
    if (hl?.text && hl.text !== headline) setHeadline(hl.text);
    const bd = updated.layers.find((l) => l.id === 'badge');
    if (bd?.text && bd.text !== discountBadge) setDiscountBadge(bd.text);
    const sub = updated.layers.find((l) => l.id === 'subtitle');
    if (sub?.text && sub.text !== subtitle) setSubtitle(sub.text);
    const ct = updated.layers.find((l) => l.id === 'cta');
    if (ct?.text && ct.text !== ctaText) setCtaText(ct.text.replace(/→$/, '').trim());
    const ph = updated.layers.find((l) => l.id === 'bg_photo');
    if (ph?.src && ph.src !== customPosterUri) {
      setCustomPosterUri(ph.src);
      setBgPhotoUrl(ph.src);
    }
  }

  const [designRevision, setDesignRevision] = useState<string | null>(null);
  const savedDesignSnapshot = useRef('');
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);
  const [designDrafts, setDesignDrafts] = useState<Array<{ id: string; content: string; designJson: string; updatedAt: string }>>([]);
  const [draftPage, setDraftPage] = useState(1);
  const [moreDrafts, setMoreDrafts] = useState(false);
  async function loadDesignDrafts(page = 1) {
    try {
      const result = await apiRequest<{ data: Array<{ id: string; content: string; designJson: string; updatedAt: string }> }>(`/api/social/posts?status=draft&limit=20&page=${page}`);
      const rows = result.data.filter((d) => d.designJson);
      setDesignDrafts((previous) => (page === 1 ? rows : [...previous, ...rows]));
      setDraftPage(page);
      setMoreDrafts(result.data.length === 20);
    } catch {
      setError('Could not load saved designs. Please retry.');
    }
  }

  async function handlePickCustomPoster() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setBusy(true);
        try {
          if (asset.base64) {
            const mime = asset.mimeType || 'image/jpeg';
            const uploaded = await apiRequest<{ url: string; assetId?: string }>('/api/social/designs/assets', {
              method: 'POST',
              body: { data: `data:${mime};base64,${asset.base64}` },
            });
            setCustomPosterUri(uploaded.url);
          } else {
            setCustomPosterUri(asset.uri);
          }
          setActiveVisualFormat('poster');
          setSuccessNotice('Custom promotional graphic uploaded & saved!');
          setTimeout(() => setSuccessNotice(null), 3000);
        } catch {
          setCustomPosterUri(asset.uri);
          setActiveVisualFormat('poster');
          setSuccessNotice('Custom promotional graphic loaded!');
          setTimeout(() => setSuccessNotice(null), 3000);
        } finally {
          setBusy(false);
        }
      }
    } catch {
      Alert.alert('Notice', 'Could not open photo library.');
    }
  }

  // AI Generation Trigger
  async function generatePost(customTopic?: string) {
    const topicToUse = (typeof customTopic === 'string' ? customTopic : promptInput).trim() || activeUserPrompt;
    setBusy(true);
    setError(null);
    setActiveUserPrompt(topicToUse);
    try {
      const requestId = `mob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      // 1. Generate campaign copy, headline, and alternative headlines
      const genPromise = apiRequest<{ design: MarketingDesign; caption: string; alternativeHeadlines?: string[] }>('/api/social/designs/generate', {
        method: 'POST',
        body: { prompt: topicToUse, design, caption, mode: generationMode },
      });

      // 2. If in poster mode, trigger Cloudflare Flux AI image generation asynchronously
      let imagePromise: Promise<any> | null = null;
      if (generationMode === 'poster') {
        setIsGeneratingImage(true);
        imagePromise = apiRequest<{ jobId: string; status: string }>('/api/social/designs/image', {
          method: 'POST',
          body: {
            prompt: topicToUse,
            provider: 'cloudflare',
            requestId,
            isPoster: true,
            businessName: effectiveBusinessName,
            category: brandProfile.data?.profile?.industry || gbpPlace.data?.place?.category || '',
            products: brandProfile.data?.profile?.products || '',
            services: brandProfile.data?.profile?.services || '',
            website: effectiveBusinessWebsite,
          },
        }).catch(() => null);
      }

      const [data, imageInit] = await Promise.all([genPromise, imagePromise]);

      setCaption(data.caption);
      setCaptionDraft(data.caption);
      if (Array.isArray(data.alternativeHeadlines) && data.alternativeHeadlines.length > 0) {
        setAlternativeHeadlines(data.alternativeHeadlines);
      }
      const hlLayer = data.design?.layers?.find((l) => l.id === 'headline' || l.type === 'text');
      if (hlLayer?.text) {
        setHeadline(hlLayer.text);
      }
      const bdLayer = data.design?.layers?.find((l) => l.id === 'badge');
      if (bdLayer?.text) {
        setDiscountBadge(bdLayer.text);
      }
      const subLayer = data.design?.layers?.find((l) => l.id === 'subtitle');
      if (subLayer?.text) {
        setSubtitle(subLayer.text);
      }
      setCustomDesign(data.design);

      setPromptInput('');
      setSuccessNotice(
        generationMode === 'poster'
          ? 'Finished AI Poster campaign created with auto-branded layout!'
          : generationMode === 'image_only'
          ? 'AI generated background image without text overlays!'
          : 'AI generated fresh design and copy directly to canvas!'
      );
      setTimeout(() => setSuccessNotice(null), 3500);

      // 3. Poll for AI poster image if job was queued
      if (imageInit?.jobId) {
        const targetJobId = imageInit.jobId;
        const pollStart = Date.now();
        const pollInterval = setInterval(async () => {
          try {
            const check = await apiRequest<{ status: string; result?: { url?: string } }>(
              `/api/social/designs/image?id=${encodeURIComponent(targetJobId)}`
            );
            if (check?.status === 'completed' && check.result?.url) {
              clearInterval(pollInterval);
              setIsGeneratingImage(false);
              const generatedUrl = check.result.url;
              setCustomPosterUri(generatedUrl);
              setBgPhotoUrl(generatedUrl);
              setCustomDesign((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  layers: prev.layers.map((l) =>
                    l.id === 'bg_photo' || l.type === 'image' ? { ...l, src: generatedUrl } : l
                  ),
                };
              });
            } else if (check?.status === 'failed' || check?.status === 'cancelled' || Date.now() - pollStart > 45000) {
              clearInterval(pollInterval);
              setIsGeneratingImage(false);
            }
          } catch {
            clearInterval(pollInterval);
            setIsGeneratingImage(false);
          }
        }, 1500);
      } else {
        setIsGeneratingImage(false);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'AI generation failed. You can customize the fields manually below.');
    } finally {
      setBusy(false);
    }
  }

  // Publishing / Scheduling handler
  async function submitPost(status: 'published' | 'scheduled' | 'draft', autosave=false) {
    if (busy || saving.current) return;
    setError(null);

    const scheduledAt = status === 'scheduled' ? futureLocalTime(scheduleDate, scheduleTime) : null;
    if (status === 'scheduled' && !scheduledAt) {
      setError('Please choose a valid future date and time to schedule.');
      return;
    }

    if (status !== 'draft' && targets.length === 0 && selectedPlatforms.length === 0) {
      setError('Select at least one social account to publish.');
      return;
    }

    const isPosterMode = activeVisualFormat === 'poster';
    const resolvedPosterUrl = customPosterUri || `${WEB_URL}/images/fieseros-ai-assistant-poster.jpg?v=1`;
    const mediaList = isPosterMode ? [resolvedPosterUrl] : bgPhotoUrl ? [bgPhotoUrl] : [];
    const contentCheck = validateSocialPost(caption.trim(), selectedPlatforms, mediaList);
    if (contentCheck) {
      setError(contentCheck);
      return;
    }

    saving.current = true;
    setBusy(true);

    const body: Record<string, unknown> = {
      content: caption.trim(),
      targets: targets.length > 0 ? targets : undefined,
      platforms: selectedPlatforms,
      mediaUrls: mediaList,
      isPoster: isPosterMode,
      design: design,
      expectedUpdatedAt: designRevision,
      ...(status !== 'draft' && editingDesignId ? { draftId: editingDesignId } : {}),
      status,
      gbpPostType: 'offer',
      ...(scheduledAt ? { scheduledAt } : {}),
      gbpOfferData: {
        title: headline,
        couponCode: discountBadge.replace(/[^A-Za-z0-9]/g, ''),
        redeemUrl: bookingLink,
      },
    };

    const serialized = JSON.stringify(body);
    if (pendingRequest.current?.body !== serialized) {
      pendingRequest.current = { body: serialized, key: Crypto.randomUUID() };
    }

    try {
      const saved = await apiRequest<{data?:{id:string;updatedAt:string}}>(status === 'draft' && editingDesignId ? `/api/social/posts/${editingDesignId}` : '/api/social/posts', {
        method: status === 'draft' && editingDesignId ? 'PATCH' : 'POST',
        body,
        headers: { 'Idempotency-Key': pendingRequest.current!.key },
      });
      if(status === 'draft' && saved.data?.id){setEditingDesignId(saved.data.id);setDesignRevision(saved.data.updatedAt);savedDesignSnapshot.current=JSON.stringify({design,caption});}
      if(autosave)return;
      pendingRequest.current = null;
      setSuccessNotice(
        status === 'published'
          ? 'Post queued for publishing. Check Posts for delivery status.'
          : status === 'scheduled'
          ? 'Post scheduled successfully!'
          : 'Draft saved in your Posts Library.'
      );
      setBoardRefresh((k) => k + 1);
      // Switch to Posts & Approvals tab so user can see it live
      setTimeout(() => {
        setActiveMode('posts');
      }, 1200);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save or publish post.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const designSnapshot=JSON.stringify({design,caption});
  useEffect(()=>{
    if(!editingDesignId||busy||savedDesignSnapshot.current===designSnapshot)return;
    const timer=setTimeout(()=>{savedDesignSnapshot.current=designSnapshot;void submitPost('draft',true);},1500);
    return ()=>clearTimeout(timer);
  },[designSnapshot,editingDesignId,busy]);

  // Quick caption modifiers
  function handleMakeShorter() {
    const lines = caption.split('\n').filter(Boolean);
    if (lines.length > 2) {
      setCaption(lines.slice(0, 2).join('\n\n') + '\n\n#SpecialOffer #Fieseros');
    }
  }

  async function handleUseMyPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setBusy(true);
        try {
          let remoteUrl = asset.uri;
          if (asset.base64) {
            const mime = asset.mimeType || 'image/jpeg';
            const uploaded = await apiRequest<{ url: string; assetId?: string }>('/api/social/designs/assets', {
              method: 'POST',
              body: { data: `data:${mime};base64,${asset.base64}` },
            });
            remoteUrl = uploaded.url;
          }
          setBgPhotoUrl(remoteUrl);
          if (customDesign) {
            setCustomDesign({
              ...customDesign,
              layers: customDesign.layers.map((l) =>
                l.type === 'image' ? { ...l, url: remoteUrl, src: remoteUrl } : l
              ),
            });
          }
          setSuccessNotice('Photo uploaded to design canvas!');
          setTimeout(() => setSuccessNotice(null), 3000);
          return;
        } catch {
          setBgPhotoUrl(asset.uri);
        } finally {
          setBusy(false);
        }
      }
    } catch {
      // fallback to presets
    }

    Alert.alert(
      'Replace Background Photo',
      'Select a photo for this creative:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Modern Chair / Interior',
          onPress: () =>
            setBgPhotoUrl(
              'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1080&q=80'
            ),
        },
        {
          text: 'Salon & Spa Treatment',
          onPress: () =>
            setBgPhotoUrl(
              'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1080&q=80'
            ),
        },
        {
          text: 'Artisanal Cafe & Food',
          onPress: () =>
            setBgPhotoUrl(
              'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1080&q=80'
            ),
        },
        {
          text: 'Auto & Detailing',
          onPress: () =>
            setBgPhotoUrl(
              'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1080&q=80'
            ),
        },
        {
          text: 'Emerald Luxury Texture',
          onPress: () =>
            setBgPhotoUrl(
              'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1080&q=80'
            ),
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: Math.max(insets.top, 12) }}>
      {/* ── Top Mode Switcher Bar ────────────────────────────────────────── */}
      <View style={styles.modeBar}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeMode === 'studio' }}
          onPress={() => setActiveMode('studio')}
          style={[styles.modeTab, activeMode === 'studio' && styles.modeTabActive]}
        >
          <MaterialIcons
            name="auto-awesome"
            size={16}
            color={activeMode === 'studio' ? '#009F50' : '#64748B'}
          />
          <Text style={[styles.modeTabText, activeMode === 'studio' && styles.modeTabTextActive]}>
            Studio
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeMode === 'autopilot' }}
          onPress={() => {
            setActiveMode('autopilot');
            loadAutopilot();
          }}
          style={[styles.modeTab, activeMode === 'autopilot' && styles.modeTabActive]}
        >
          <MaterialIcons
            name="bolt"
            size={16}
            color={activeMode === 'autopilot' ? '#009F50' : '#64748B'}
          />
          <Text style={[styles.modeTabText, activeMode === 'autopilot' && styles.modeTabTextActive]}>
            Autopilot (30d/1yr)
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeMode === 'posts' }}
          onPress={() => setActiveMode('posts')}
          style={[styles.modeTab, activeMode === 'posts' && styles.modeTabActive]}
        >
          <MaterialIcons
            name="list-alt"
            size={16}
            color={activeMode === 'posts' ? '#009F50' : '#64748B'}
          />
          <Text style={[styles.modeTabText, activeMode === 'posts' && styles.modeTabTextActive]}>
            Posts
          </Text>
        </Pressable>
      </View>

      {/* Global Alerts / Notices */}
      {successNotice && (
        <View style={styles.successNotice}>
          <MaterialIcons name="check-circle" size={16} color="#009F50" />
          <Text style={styles.successNoticeText}>{successNotice}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <MaterialIcons name="error-outline" size={16} color="#DC2626" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 3: AUTOPILOT (30-Day / 1-Year Multi-Platform Engine)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'autopilot' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 90 }}>
          {/* Hero Banner */}
          <View
            style={{
              backgroundColor: '#0F172A',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#1E293B',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#064E3B',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <MaterialIcons name="bolt" size={14} color="#34D399" />
                <Text style={{ color: '#34D399', fontSize: 11, fontWeight: '700' }}>
                  {apConfig.enabled ? 'Autopilot Active' : 'Autopilot Paused'}
                </Text>
              </View>
              <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>
                {apConfig.daysRemaining} days left
              </Text>
            </View>

            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
              Daily Multi-Platform Autopilot
            </Text>
            <Text style={{ color: '#94A3B8', fontSize: 12, lineHeight: 18 }}>
              Automatically create and publish daily localized updates with Flux-1 Schnell graphics to Google, Instagram, and Facebook.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => saveAutopilot({ enabled: !apConfig.enabled })}
                style={{
                  flex: 1,
                  backgroundColor: apConfig.enabled ? '#D97706' : '#009F50',
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <MaterialIcons name={apConfig.enabled ? 'pause' : 'play-arrow'} size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                  {apConfig.enabled ? 'Pause Autopilot' : 'Activate Daily Posting'}
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  try {
                    setApTriggering(true);
                    Alert.alert('Generating Post', "Dispatching today's post across your connected channels...");
                    await saveAutopilot({ triggerPostNow: true, enabled: true });
                  } finally {
                    setApTriggering(false);
                  }
                }}
                disabled={apTriggering}
                style={{
                  backgroundColor: '#1E293B',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#334155',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {apTriggering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Post Today</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Duration Selector */}
          <Card style={{ marginBottom: 14, gap: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Campaign Duration</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => saveAutopilot({ duration: '30_days' })}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: apConfig.duration === '30_days' ? '#009F50' : '#E2E8F0',
                  backgroundColor: apConfig.duration === '30_days' ? '#F0FDF4' : '#FFFFFF',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>30 Days</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>1 post daily for 1 month (30 posts)</Text>
              </Pressable>

              <Pressable
                onPress={() => saveAutopilot({ duration: '1_year' })}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: apConfig.duration === '1_year' ? '#009F50' : '#E2E8F0',
                  backgroundColor: apConfig.duration === '1_year' ? '#F0FDF4' : '#FFFFFF',
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>1 Full Year</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>365 daily posts with theme rotation</Text>
              </Pressable>
            </View>
          </Card>

          {/* Channels Selection */}
          <Card style={{ marginBottom: 14, gap: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Publishing Channels</Text>
            {[
              { id: 'googlebusiness', name: 'Google Business Profile', icon: 'place' },
              { id: 'instagram', name: 'Instagram', icon: 'camera-alt' },
              { id: 'facebook', name: 'Facebook Page', icon: 'public' },
            ].map((ch) => {
              const active = apConfig.platforms.includes(ch.id);
              return (
                <Pressable
                  key={ch.id}
                  onPress={() => {
                    const next = active
                      ? apConfig.platforms.filter((p) => p !== ch.id)
                      : [...apConfig.platforms, ch.id];
                    if (next.length === 0) {
                      Alert.alert('Notice', 'Please keep at least one channel selected.');
                      return;
                    }
                    saveAutopilot({ platforms: next });
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialIcons name={ch.icon as any} size={18} color="#009F50" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{ch.name}</Text>
                  </View>
                  <MaterialIcons
                    name={active ? 'check-box' : 'check-box-outline-blank'}
                    size={22}
                    color={active ? '#009F50' : '#94A3B8'}
                  />
                </Pressable>
              );
            })}
          </Card>

          {/* Progress Summary */}
          <Card style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Engine Status</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Total Posts Created</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{apConfig.totalPostsCreated} posts</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Preferred Daily Time</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{apConfig.postingTime} AM</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Image Provider</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#009F50' }}>Cloudflare Flux-1 Schnell</Text>
            </View>
          </Card>
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 2: POSTS & APPROVALS (All 6 status pills, Approve/Reject, etc.)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'posts' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 90 }}>
          {/* Connected Social Accounts Header */}
          <StayActiveSocialMediaCard />

          {/* Quick Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Posts & Approvals</Text>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Filter by live lifecycle status</Text>
            </View>
            <Pressable
              onPress={() => setActiveMode('studio')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#009F50',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
              }}
            >
              <MaterialIcons name="add" size={16} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>New Post</Text>
            </Pressable>
          </View>

          {/* Shared 6-Pill Posts Board */}
          <PostsBoard refreshKey={boardRefresh} />
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 1: STUDIO / CREATE (3-Step Wizard from Screenshots)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'studio' && (
        <View style={{ flex: 1 }}>
          {/* Sub-Tab Navigation Header (Chat | Design) */}
          <View style={styles.subTabBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {studioStep > 1 && (
                <Pressable
                  onPress={() => {
                    if (studioStep === 3) setStudioStep(2);
                    else if (studioStep === 2) setStudioStep(1);
                  }}
                  style={{ padding: 4 }}
                >
                  <MaterialIcons name="arrow-back" size={20} color="#0F172A" />
                </Pressable>
              )}
              <View>
                <Text style={styles.studioHeaderTitle}>
                  {studioStep === 1 ? 'Marketing Studio' : studioStep === 2 ? headline : 'Review Post'}
                </Text>
                <Pressable style={styles.brandPill}>
                  <Text style={styles.brandPillText}>F {businessDisplayName} · #0949 ⌵</Text>
                </Pressable>
              </View>
            </View>

            {/* Chat vs Design toggle */}
            {studioStep <= 2 && (
              <View style={styles.segmentedToggle}>
                <Pressable
                  onPress={() => {
                    setStudioStep(1);
                    setStudioSubTab('chat');
                  }}
                  style={[styles.segBtn, studioSubTab === 'chat' && styles.segBtnActive]}
                >
                  <MaterialIcons
                    name="chat-bubble-outline"
                    size={14}
                    color={studioSubTab === 'chat' ? '#009F50' : '#64748B'}
                  />
                  <Text style={[styles.segBtnText, studioSubTab === 'chat' && styles.segBtnTextActive]}>
                    Chat
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setStudioStep(2);
                    setStudioSubTab('design');
                  }}
                  style={[styles.segBtn, studioSubTab === 'design' && styles.segBtnActive]}
                >
                  <MaterialIcons
                    name="image"
                    size={14}
                    color={studioSubTab === 'design' ? '#009F50' : '#64748B'}
                  />
                  <Text style={[styles.segBtnText, studioSubTab === 'design' && styles.segBtnTextActive]}>
                    Design
                  </Text>
                </Pressable>
              </View>
            )}

            {studioStep === 3 && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeText}>● Draft</Text>
              </View>
            )}
          </View>

          {/* ──────────────────────────────────────────────────────────────────
              STEP 1: 01 · Create (Conversational Copilot & Layouts)
              ────────────────────────────────────────────────────────────────── */}
          {studioStep === 1 && (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* User Prompt Bubble */}
                <View style={styles.userBubbleContainer}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userBubbleText}>{activeUserPrompt}</Text>
                  </View>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>DC</Text>
                  </View>
                </View>

                {/* AI Reply Bubble */}
                <View style={styles.aiBubbleContainer}>
                  <View style={styles.aiAvatar}>
                    <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.aiBubble}>
                    <Text style={styles.aiBubbleText}>
                      Design & copy generated directly to your canvas.
                    </Text>
                  </View>
                </View>

                {/* Live Creative Design Preview Card in Step 1 */}
                <Pressable
                  onPress={() => {
                    setStudioStep(2);
                    setStudioSubTab('design');
                  }}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    overflow: 'hidden',
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 5,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="auto-awesome" size={14} color="#009F50" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>Generated Creative Preview</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#009F50' }}>Tap to view/edit</Text>
                      <MaterialIcons name="chevron-right" size={16} color="#009F50" />
                    </View>
                  </View>
                  <View style={{ padding: 10, backgroundColor: '#0B0F19', alignItems: 'center', justifyContent: 'center' }}>
                    <AutoBrandedPosterCard
                      photoUri={customPosterUri}
                      headline={headline}
                      subtitle={subtitle}
                      badge={discountBadge}
                      ctaText={ctaText}
                      businessName={effectiveBusinessName}
                      logoUri={effectiveBusinessLogo}
                      tagline={effectiveBusinessTagline}
                      website={effectiveBusinessWebsite}
                      height={230}
                      theme={colorTheme}
                      isGenerating={isGeneratingImage || (busy && generationMode === 'poster')}
                    />
                  </View>
                </Pressable>

                {/* Alternative Headlines Chips */}
                <View style={styles.altHeadlinesBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="auto-awesome" size={14} color="#009F50" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>Alternative Headlines</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>Tap to apply</Text>
                  </View>
                  {alternativeHeadlines.map((altHl, idx) => {
                    const isSelected = headline === altHl;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => handleSelectHeadline(altHl)}
                        style={[styles.altHlItem, isSelected && styles.altHlItemSelected]}
                      >
                        <Text style={[styles.altHlText, isSelected && styles.altHlTextSelected]}>
                          "{altHl}"
                        </Text>
                        {isSelected && <MaterialIcons name="check" size={14} color="#009F50" />}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Caption Card */}
                <View style={styles.captionBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="description" size={16} color="#009F50" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Caption</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                      {caption.trim().split(/\s+/).filter(Boolean).length} words · 5 hashtags
                    </Text>
                  </View>

                  <Text style={styles.captionText}>{caption}</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <Pressable onPress={() => setIsEditingCaption(true)}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#009F50' }}>Edit caption</Text>
                    </Pressable>
                    <Pressable onPress={handleMakeShorter}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Make shorter</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Quick Action Pills */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Pressable onPress={handleMakeShorter} style={styles.quickPill}>
                    <MaterialIcons name="format-align-left" size={14} color="#475569" />
                    <Text style={styles.quickPillText}>Less text</Text>
                  </Pressable>

                  <Pressable onPress={handleUseMyPhoto} style={styles.quickPill}>
                    <MaterialIcons name="photo-camera" size={14} color="#475569" />
                    <Text style={styles.quickPillText}>Use my photo</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleRegenerateImage}
                    disabled={isGeneratingImage}
                    style={[styles.quickPill, isGeneratingImage && { opacity: 0.6 }]}
                  >
                    {isGeneratingImage ? (
                      <ActivityIndicator size="small" color="#009F50" />
                    ) : (
                      <MaterialIcons name="auto-awesome" size={14} color="#009F50" />
                    )}
                    <Text style={[styles.quickPillText, { color: '#009F50', fontWeight: '700' }]}>
                      {isGeneratingImage ? 'Rendering...' : 'New image'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      const curIndex = COMMERCIAL_THEME_KEYS.indexOf(colorTheme);
                      const nextTheme = COMMERCIAL_THEME_KEYS[(curIndex + 1) % COMMERCIAL_THEME_KEYS.length];
                      cycleTheme(nextTheme);
                      Alert.alert('Style Updated', `Switched to ${COMMERCIAL_THEMES[nextTheme].name}`);
                    }}
                    style={styles.quickPill}
                  >
                    <MaterialIcons name="palette" size={14} color="#475569" />
                    <Text style={styles.quickPillText}>
                      Style: {COMMERCIAL_THEMES[colorTheme]?.name?.split(' ')[0] || 'Modern'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>

              {/* Bottom Sticky Action Bar: Suggestions + Mode Selector + Prompt Input + Open Design CTA */}
              <View style={styles.promptInputContainer}>
                {/* Dynamic Prompt Suggestions based on Google Business Profile & Website */}
                {promptSuggestions.data?.suggestions && promptSuggestions.data.suggestions.length > 0 && (
                  <View style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                        💡 Suggested for your business:
                      </Text>
                      <Pressable
                        onPress={handleRefreshIdeas}
                        disabled={refreshingIdeas}
                        hitSlop={8}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        {refreshingIdeas && <ActivityIndicator size="small" color="#009F50" />}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: refreshingIdeas ? '#94A3B8' : '#009F50' }}>
                          {refreshingIdeas ? 'Generating...' : '🎲 Refresh Ideas'}
                        </Text>
                      </Pressable>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
                      {promptSuggestions.data.suggestions.map((s) => (
                        <Pressable
                          key={s.id}
                          onPress={() => setPromptInput(s.prompt)}
                          style={({ pressed }) => [
                            {
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 10,
                              backgroundColor: '#FFFFFF',
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                            },
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Text style={{ fontSize: 12 }}>{s.icon || '💡'}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>{s.title || s.chipLabel || 'Idea'}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Generation Mode Switcher */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                  <Pressable
                    onPress={() => {
                      setGenerationMode('poster');
                      setActiveVisualFormat('poster');
                    }}
                    style={[
                      styles.modeBtn,
                      generationMode === 'poster' && styles.modeBtnActive,
                    ]}
                  >
                    <MaterialIcons
                      name="auto-awesome"
                      size={14}
                      color={generationMode === 'poster' ? '#009F50' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeBtnText,
                        generationMode === 'poster' && styles.modeBtnTextActive,
                      ]}
                    >
                      🖼️ AI Poster
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setGenerationMode('graphic');
                      setActiveVisualFormat('canvas');
                    }}
                    style={[
                      styles.modeBtn,
                      generationMode === 'graphic' && styles.modeBtnActive,
                    ]}
                  >
                    <MaterialIcons
                      name="palette"
                      size={14}
                      color={generationMode === 'graphic' ? '#009F50' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeBtnText,
                        generationMode === 'graphic' && styles.modeBtnTextActive,
                      ]}
                    >
                      ✏️ Editable
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setGenerationMode('image_only')}
                    style={[
                      styles.modeBtn,
                      generationMode === 'image_only' && styles.modeBtnActive,
                    ]}
                  >
                    <MaterialIcons
                      name="image"
                      size={14}
                      color={generationMode === 'image_only' ? '#009F50' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.modeBtnText,
                        generationMode === 'image_only' && styles.modeBtnTextActive,
                      ]}
                    >
                      📷 Photo
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.promptInputRow}>
                  <Pressable onPress={handleUseMyPhoto} style={{ padding: 6 }}>
                    <MaterialIcons name="attach-file" size={20} color="#64748B" />
                  </Pressable>

                  <TextInput
                    value={promptInput}
                    onChangeText={setPromptInput}
                    placeholder={
                      generationMode === 'image_only'
                        ? 'Describe image to generate...'
                        : 'Describe an idea or ask for a change...'
                    }
                    placeholderTextColor="#94A3B8"
                    style={styles.promptInput}
                    returnKeyType="send"
                    onSubmitEditing={() => generatePost()}
                  />

                  <Pressable onPress={handleUseMyPhoto} style={{ padding: 6 }}>
                    <MaterialIcons name="image" size={20} color="#64748B" />
                  </Pressable>

                  <Pressable
                    disabled={busy}
                    onPress={() => generatePost()}
                    style={[styles.sendBtn, busy && { opacity: 0.5 }]}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => {
                    setStudioStep(2);
                    setStudioSubTab('design');
                  }}
                  style={styles.primaryActionButton}
                >
                  <Text style={styles.primaryActionText}>Open design →</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              STEP 2: 02 · Design (Live Visual Canvas & Tools)
              ────────────────────────────────────────────────────────────────── */}
          {studioStep === 2 && (
            <View style={{ flex: 1 }}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 110 }}>
                {/* Ratio Selector & Undo */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Pressable
                    onPress={() => {
                      setAspectRatio((prev) => (prev === '1:1' ? '4:5' : prev === '4:5' ? '9:16' : '1:1'));
                    }}
                    style={styles.ratioPill}
                  >
                    <MaterialIcons name="crop-square" size={14} color="#0F172A" />
                    <Text style={styles.ratioPillText}>Square · {aspectRatio} ⌵</Text>
                  </Pressable>

                  <Pressable onPress={() => generatePost()} style={{ padding: 6 }}>
                    <MaterialIcons name="undo" size={20} color="#64748B" />
                  </Pressable>
                </View>

                {/* Visual Format Toggle: AI Creative Poster vs Editable Canvas */}
                <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3, marginBottom: 12 }}>
                  <Pressable
                    onPress={() => setActiveVisualFormat('poster')}
                    style={[
                      { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 10 },
                      activeVisualFormat === 'poster' && { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 }
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: activeVisualFormat === 'poster' ? '#009F50' : '#64748B' }}>
                      🖼️ Finished AI Poster
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setActiveVisualFormat('canvas')}
                    style={[
                      { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 10 },
                      activeVisualFormat === 'canvas' && { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 }
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: activeVisualFormat === 'canvas' ? '#009F50' : '#64748B' }}>
                      ✏️ Editable Canvas
                    </Text>
                  </Pressable>
                </View>

                {activeVisualFormat === 'poster' ? (
                  <View style={{ marginBottom: 16 }}>
                    <AutoBrandedPosterCard
                      photoUri={customPosterUri}
                      headline={headline}
                      subtitle={subtitle}
                      badge={discountBadge}
                      ctaText={ctaText}
                      businessName={effectiveBusinessName}
                      logoUri={effectiveBusinessLogo}
                      tagline={effectiveBusinessTagline}
                      website={effectiveBusinessWebsite}
                      height={Math.min(360, Math.round(Dimensions.get('window').height * 0.40))}
                      theme={colorTheme}
                      isGenerating={isGeneratingImage || (busy && generationMode === 'poster')}
                    />

                    {/* Quick Poster Customization Controls: Headline & Offer Inputs */}
                    <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 12, marginTop: 12, gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>Customize Poster Details</Text>
                        <Text style={{ fontSize: 10.5, color: '#009F50', fontWeight: '700' }}>Live Auto-Branded</Text>
                      </View>

                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Headline</Text>
                        <TextInput
                          value={headline}
                          onChangeText={handleUpdateHeadline}
                          placeholder="e.g. 50% Off First Service"
                          style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12.5, color: '#0F172A' }}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Offer Tag</Text>
                          <TextInput
                            value={discountBadge}
                            onChangeText={handleUpdateDiscountBadge}
                            placeholder="e.g. 20% OFF"
                            style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, color: '#0F172A' }}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Button Text</Text>
                          <TextInput
                            value={ctaText}
                            onChangeText={handleUpdateCtaText}
                            placeholder="e.g. Book Now"
                            style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, color: '#0F172A' }}
                          />
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                        <Pressable
                          onPress={handlePickCustomPoster}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#009F50', backgroundColor: '#F0FDF4' }}
                        >
                          <MaterialIcons name="file-upload" size={16} color="#009F50" />
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#009F50' }}>Upload Photo</Text>
                        </Pressable>
                        {customPosterUri && (
                          <Pressable
                            onPress={() => setCustomPosterUri(null)}
                            style={{ paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#64748B' }}>Reset</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Brand, Logo & Website Customization */}
                      <View style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 4, gap: 8 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0F172A' }}>🏷️ Brand, Logo & Website</Text>

                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <Pressable
                            onPress={handlePickLogo}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingVertical: 7,
                              paddingHorizontal: 10,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: '#CBD5E1',
                              backgroundColor: '#F8FAFC',
                            }}
                          >
                            {effectiveBusinessLogo ? (
                              <Image source={{ uri: effectiveBusinessLogo }} style={{ width: 20, height: 20, borderRadius: 4 }} resizeMode="cover" />
                            ) : (
                              <MaterialIcons name="add-photo-alternate" size={18} color="#009F50" />
                            )}
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#0F172A' }}>
                              {effectiveBusinessLogo ? 'Change Logo' : 'Upload Logo'}
                            </Text>
                          </Pressable>
                          {brandLogoUri && (
                            <Pressable onPress={() => setBrandLogoUri(null)} hitSlop={6}>
                              <Text style={{ fontSize: 10.5, color: '#EF4444', fontWeight: '700' }}>Remove</Text>
                            </Pressable>
                          )}
                        </View>

                        <View style={{ gap: 4 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569' }}>Brand / Shop Name</Text>
                          <TextInput
                            value={brandName}
                            onChangeText={setBrandName}
                            placeholder={effectiveBusinessName}
                            style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11.5, color: '#0F172A' }}
                          />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569' }}>Tagline / Specialty</Text>
                            <TextInput
                              value={brandTagline}
                              onChangeText={setBrandTagline}
                              placeholder="e.g. Pure Desi Ghee"
                              style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11.5, color: '#0F172A' }}
                            />
                          </View>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569' }}>Official Website</Text>
                            <TextInput
                              value={brandWebsite}
                              onChangeText={setBrandWebsite}
                              placeholder={effectiveBusinessWebsite}
                              autoCapitalize="none"
                              keyboardType="url"
                              style={{ borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11.5, color: '#0F172A' }}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <>
                    <Pressable onPress={()=>loadDesignDrafts()} style={{padding:12}}><Text>Open saved design</Text></Pressable>
                    {moreDrafts&&<Pressable onPress={()=>loadDesignDrafts(draftPage+1)}><Text>Load more drafts</Text></Pressable>}
                    {designDrafts.map(d=><Pressable key={d.id} style={{padding:12}} onPress={()=>{try{setCustomDesign(validateDesign(JSON.parse(d.designJson)));setCaption(d.content);setEditingDesignId(d.id);setDesignRevision(d.updatedAt);savedDesignSnapshot.current=JSON.stringify({design:JSON.parse(d.designJson),caption:d.content});setDesignDrafts([]);}catch{setError('This design could not be opened.');}}}><Text>{d.content.slice(0,70)}</Text></Pressable>)}
                    <EditableDesign design={design} onChange={handleCustomDesignChange} />

                    <View style={styles.canvasToolbar}>
                      <Pressable onPress={() => setIsEditingText(true)} style={styles.toolItem}>
                        <MaterialIcons name="text-fields" size={20} color="#0F172A" />
                        <Text style={styles.toolLabel}>Text</Text>
                      </Pressable>

                      <Pressable onPress={handleUseMyPhoto} style={styles.toolItem}>
                        <MaterialIcons name="insert-photo" size={20} color="#0F172A" />
                        <Text style={styles.toolLabel}>Photo</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setColorTheme((prev) => (prev === 'emerald' ? 'sand' : prev === 'sand' ? 'dark' : 'emerald'));
                        }}
                        style={styles.toolItem}
                      >
                        <MaterialIcons name="palette" size={20} color="#009F50" />
                        <Text style={styles.toolLabel}>Colours</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setAspectRatio((prev) => (prev === '1:1' ? '4:5' : prev === '4:5' ? '9:16' : '1:1'));
                        }}
                        style={styles.toolItem}
                      >
                        <MaterialIcons name="aspect-ratio" size={20} color="#0F172A" />
                        <Text style={styles.toolLabel}>Resize</Text>
                      </Pressable>
                    </View>
                  </>
                )}

                {/* Summary Row 1: Caption */}
                <Pressable onPress={() => setIsEditingCaption(true)} style={styles.summaryRow}>
                  <MaterialIcons name="description" size={18} color="#64748B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryTitle}>Caption</Text>
                    <Text numberOfLines={1} style={styles.summarySubtitle}>
                      {caption}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
                </Pressable>

                {/* Summary Row 2: Target Channels */}
                <Pressable
                  onPress={() => {
                    Alert.alert('Publishing Channels', 'Select destination channels:', [
                      {
                        text: selectedPlatforms.includes('instagram') ? '✓ Instagram' : '＋ Instagram',
                        onPress: () =>
                          setSelectedPlatforms((prev) =>
                            prev.includes('instagram') ? prev.filter((p) => p !== 'instagram') : [...prev, 'instagram']
                          ),
                      },
                      {
                        text: selectedPlatforms.includes('facebook') ? '✓ Facebook' : '＋ Facebook',
                        onPress: () =>
                          setSelectedPlatforms((prev) =>
                            prev.includes('facebook') ? prev.filter((p) => p !== 'facebook') : [...prev, 'facebook']
                          ),
                      },
                      {
                        text: selectedPlatforms.includes('googlebusiness') ? '✓ Google Business' : '＋ Google Business',
                        onPress: () =>
                          setSelectedPlatforms((prev) =>
                            prev.includes('googlebusiness')
                              ? prev.filter((p) => p !== 'googlebusiness')
                              : [...prev, 'googlebusiness']
                          ),
                      },
                      { text: 'Done' },
                    ]);
                  }}
                  style={styles.summaryRow}
                >
                  <MaterialIcons name="groups" size={18} color="#64748B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.summaryTitle}>
                      {selectedPlatforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ')}
                    </Text>
                    <Text style={styles.summarySubtitle}>{selectedPlatforms.length} accounts selected</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
                </Pressable>
              </ScrollView>

              {/* Step 2 Sticky Footer: Save Draft & Review CTA */}
              <View style={styles.dualStickyFooter}>
                <Pressable
                  disabled={busy}
                  onPress={() => submitPost('draft')}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Save draft</Text>
                </Pressable>

                <Pressable
                  onPress={() => setStudioStep(3)}
                  style={styles.primaryFlexButton}
                >
                  <Text style={styles.primaryActionText}>Review & schedule →</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              STEP 3: 03 · Review (Channel Preview & Schedule Parameters)
              ────────────────────────────────────────────────────────────────── */}
          {studioStep === 3 && (
            <View style={{ flex: 1 }}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 110 }}>
                {/* Channel Selector Pills */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <Pressable
                    onPress={() => setReviewPlatform('instagram')}
                    style={[
                      styles.platformTab,
                      reviewPlatform === 'instagram' && styles.platformTabActive,
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: reviewPlatform === 'instagram' ? '#009F50' : '#64748B' }}>
                      📸 Instagram
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setReviewPlatform('facebook')}
                    style={[
                      styles.platformTab,
                      reviewPlatform === 'facebook' && styles.platformTabActive,
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: reviewPlatform === 'facebook' ? '#009F50' : '#64748B' }}>
                      📘 Facebook
                    </Text>
                  </Pressable>
                </View>

                {/* ── Mockup Feed Card (Instagram Style) ── */}
                <View style={styles.mockupCard}>
                  {/* Account Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.mockupAvatar}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>F</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{businessDisplayName}</Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>Just now</Text>
                      </View>
                    </View>
                    <MaterialIcons name="more-horiz" size={20} color="#64748B" />
                  </View>

                  {activeVisualFormat === 'poster' ? (
                    <View style={{ backgroundColor: '#090D16', paddingVertical: 4 }}>
                      <AutoBrandedPosterCard
                        photoUri={customPosterUri}
                        headline={headline}
                        subtitle={subtitle}
                        badge={discountBadge}
                        ctaText={ctaText}
                        businessName={effectiveBusinessName}
                        logoUri={effectiveBusinessLogo}
                        tagline={effectiveBusinessTagline}
                        website={effectiveBusinessWebsite}
                        height={Math.min(320, Math.round(Dimensions.get('window').height * 0.36))}
                        theme={colorTheme}
                      />
                    </View>
                  ) : (
                    <EditableDesign design={design} onChange={handleCustomDesignChange} />
                  )}

                  {/* Social Action Icons */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <MaterialIcons name="favorite-border" size={22} color="#0F172A" />
                      <MaterialIcons name="chat-bubble-outline" size={20} color="#0F172A" />
                      <MaterialIcons name="send" size={20} color="#0F172A" />
                    </View>
                    <MaterialIcons name="bookmark-border" size={22} color="#0F172A" />
                  </View>

                  {/* Caption snippet */}
                  <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                      <Text style={{ fontWeight: '800', color: '#0F172A' }}>{businessDisplayName} </Text>
                      {caption}
                    </Text>
                  </View>
                </View>

                {/* Offer Details Box */}
                <View style={styles.configCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <MaterialIcons name="calendar-today" size={16} color="#009F50" />
                    <Text style={styles.configCardTitle}>Offer details</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>Starts</Text>
                      <TextInput
                        value={offerStartDate}
                        onChangeText={setOfferStartDate}
                        style={styles.configInput}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>Ends</Text>
                      <TextInput
                        value={offerEndDate}
                        onChangeText={setOfferEndDate}
                        style={styles.configInput}
                      />
                    </View>
                  </View>
                </View>

                {/* Booking Link Box */}
                <View style={styles.configCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <MaterialIcons name="link" size={16} color="#009F50" />
                    <Text style={styles.configCardTitle}>Booking link</Text>
                  </View>
                  <TextInput
                    value={bookingLink}
                    onChangeText={setBookingLink}
                    placeholder="https://yourbusiness.com/book"
                    style={styles.configInput}
                  />
                  <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                    Required for the "{ctaText}" action button.
                  </Text>
                </View>

                {/* Schedule Selector */}
                <View style={styles.configCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="schedule" size={16} color="#009F50" />
                      <Text style={styles.configCardTitle}>Schedule</Text>
                    </View>
                    <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 2 }}>
                      <Pressable
                        onPress={() => setScheduleMode('now')}
                        style={[styles.scheduleBtn, scheduleMode === 'now' && styles.scheduleBtnActive]}
                      >
                        <Text style={[styles.scheduleBtnText, scheduleMode === 'now' && styles.scheduleBtnTextActive]}>
                          Now
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setScheduleMode('schedule')}
                        style={[styles.scheduleBtn, scheduleMode === 'schedule' && styles.scheduleBtnActive]}
                      >
                        <Text style={[styles.scheduleBtnText, scheduleMode === 'schedule' && styles.scheduleBtnTextActive]}>
                          Schedule
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {scheduleMode === 'schedule' && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      <TextInput
                        placeholder="YYYY-MM-DD"
                        value={scheduleDate}
                        onChangeText={setScheduleDate}
                        style={[styles.configInput, { flex: 1 }]}
                      />
                      <TextInput
                        placeholder="HH:MM"
                        value={scheduleTime}
                        onChangeText={setScheduleTime}
                        style={[styles.configInput, { flex: 1 }]}
                      />
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Step 3 Sticky Footer: Publish / Schedule CTA */}
              <View style={styles.promptInputContainer}>
                <Pressable
                  disabled={busy}
                  onPress={() => submitPost(scheduleMode === 'now' ? 'published' : 'scheduled')}
                  style={[styles.primaryActionButton, busy && { opacity: 0.6 }]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryActionText}>
                      {scheduleMode === 'now'
                        ? `Publish to ${selectedPlatforms.length} accounts`
                        : 'Schedule post'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {/* Modal: Edit Caption */}
          <Modal visible={isEditingCaption} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Edit Caption</Text>
                  <Pressable onPress={() => setIsEditingCaption(false)}>
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </Pressable>
                </View>
                <TextInput
                  multiline
                  value={captionDraft}
                  onChangeText={setCaptionDraft}
                  style={styles.captionModalInput}
                />
                <Pressable
                  onPress={() => {
                    setCaption(captionDraft);
                    setIsEditingCaption(false);
                  }}
                  style={styles.modalDoneBtn}
                >
                  <Text style={styles.modalDoneBtnText}>Save Caption</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          {/* Modal: Edit Canvas Text */}
          <Modal visible={isEditingText} animationType="slide" transparent>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Edit Design Text</Text>
                  <Pressable onPress={() => setIsEditingText(false)}>
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </Pressable>
                </View>

                <Text style={styles.modalInputLabel}>Headline</Text>
                <TextInput value={headline} onChangeText={setHeadline} style={styles.configInput} />

                <Text style={styles.modalInputLabel}>Discount / Offer Badge</Text>
                <TextInput value={discountBadge} onChangeText={setDiscountBadge} style={styles.configInput} />

                <Text style={styles.modalInputLabel}>Subtitle</Text>
                <TextInput value={subtitle} onChangeText={setSubtitle} style={styles.configInput} />

                <Text style={styles.modalInputLabel}>Button Text</Text>
                <TextInput value={ctaText} onChangeText={setCtaText} style={styles.configInput} />

                <Pressable onPress={() => setIsEditingText(false)} style={styles.modalDoneBtn}>
                  <Text style={styles.modalDoneBtnText}>Apply to Design</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modeBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modeTabActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#009F50',
  },
  successNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  successNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#009F50',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  subTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  studioHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandPill: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  brandPillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  segmentedToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  segBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  segBtnTextActive: {
    color: '#009F50',
  },
  draftBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  draftBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#009F50',
  },
  userBubbleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 8,
  },
  userBubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    padding: 12,
    maxWidth: '80%',
  },
  userBubbleText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#009F50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  aiBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 8,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#009F50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBubble: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  aiBubbleText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
    lineHeight: 18,
  },
  layoutCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  layoutCardSelected: {
    borderColor: '#009F50',
  },
  selectedCheckPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    backgroundColor: '#009F50',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutThumb: {
    width: '100%',
    height: 90,
    backgroundColor: '#CBD5E1',
  },
  layoutInfo: {
    padding: 8,
  },
  layoutName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  layoutBadge: {
    fontSize: 10,
    color: '#009F50',
    fontWeight: '700',
    marginTop: 2,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#009F50',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modeBtnTextActive: {
    color: '#009F50',
  },
  altHeadlinesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginVertical: 10,
    gap: 6,
  },
  altHlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  altHlItemSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#009F50',
  },
  altHlText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 6,
  },
  altHlTextSelected: {
    color: '#009F50',
    fontWeight: '700',
  },
  captionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 10,
  },
  captionText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  promptInputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  promptInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  promptInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  sendBtn: {
    backgroundColor: '#009F50',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#009F50',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  ratioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ratioPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  canvasContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  canvasOverlay: {
    ...StyleSheet.absoluteFill,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  canvasBrandHeader: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#1E293B',
  },
  canvasHeadline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 30,
    maxWidth: '85%',
  },
  canvasDiscount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#009F50',
  },
  canvasSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    maxWidth: '80%',
  },
  canvasCtaBtn: {
    backgroundColor: '#009F50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  canvasCtaBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  canvasToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    marginVertical: 12,
  },
  toolItem: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  summarySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dualStickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryFlexButton: {
    flex: 2,
    backgroundColor: '#009F50',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  platformTabActive: {
    borderColor: '#009F50',
    backgroundColor: '#ECFDF5',
  },
  mockupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 14,
  },
  mockupAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#009F50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  configCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  configInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0F172A',
  },
  scheduleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scheduleBtnActive: {
    backgroundColor: '#009F50',
  },
  scheduleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  scheduleBtnTextActive: {
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '80%',
  },
  captionModalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    height: 140,
    textAlignVertical: 'top',
  },
  modalDoneBtn: {
    backgroundColor: '#009F50',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
  },
});