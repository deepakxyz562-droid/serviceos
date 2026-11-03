import '../../src/lib/runtime-polyfills';
import {
  createDesign,
  validateDesign,
  createFieserosCampaignDesign,
  createCommercialPosterDesign,
  type MarketingDesign,
  type CommercialTheme,
  type PosterTemplateLayout,
  COMMERCIAL_THEMES,
  COMMERCIAL_THEME_KEYS,
  POSTER_TEMPLATES,
} from '../../../shared/marketing-design';
import { getTemplateById } from '../../../shared/poster-templates';
import type { PosterTemplate } from '../../../shared/poster-templates';
import { PosterTemplateGallery } from '../../src/components/design/poster-template-gallery';
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

function buildDefaultCaption(businessName?: string, website?: string, industry?: string) {
  const name = businessName || 'our business';
  const web = website ? `\n\nVisit us: https://${website.replace(/^https?:\/\//, '')}` : '';
  const indTag = industry ? ` #${industry.replace(/[^a-zA-Z0-9]/g, '')}` : '';
  return `✨ Exciting updates from ${name}!\n\nWe take pride in providing exceptional quality and service you can count on. Whether you're looking for our latest offerings or customized solutions, we're here to help.${web}\n\n#${name.replace(/[^a-zA-Z0-9]/g, '')}${indTag} #QualityService #CustomerFirst`;
}

const DEFAULT_ALT_HEADLINES = [
  'Quality & Service You Can Trust.',
  'Discover What We Have In Store.',
  'Elevate Your Experience With Us.',
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
  layout = 'bold_offer',
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
  layout?: PosterTemplateLayout;
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
        borderRadius: isCompact ? 14 : 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor:
          layout === 'minimal_luxury'
            ? 'rgba(217, 180, 114, 0.55)'
            : layout === 'tech_modern'
            ? 'rgba(56, 189, 248, 0.45)'
            : layout === 'urgent_callout'
            ? 'rgba(239, 68, 68, 0.4)'
            : 'rgba(255,255,255,0.12)',
        backgroundColor: '#090D16',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 6,
        position: 'relative',
      }}
    >
      {/* Background Photography & Layout Structure */}
      {layout === 'split_card' ? (
        <View style={{ flex: 1 }}>
          <View style={{ height: '52%', width: '100%', overflow: 'hidden' }}>
            <Image
              source={photoUri ? { uri: photoUri } : require('../../assets/fieseros-ai-assistant-poster.jpg')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: themeConfig.scrimBg,
              paddingHorizontal: isCompact ? 10 : 14,
              paddingTop: isCompact ? 8 : 10,
              paddingBottom: isCompact ? 8 : 10,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View
                style={{
                  backgroundColor: themeConfig.badgeBg,
                  paddingHorizontal: isCompact ? 8 : 10,
                  paddingVertical: isCompact ? 3 : 4,
                  borderRadius: 16,
                }}
              >
                <Text style={{ color: themeConfig.badgeText, fontSize: isCompact ? 8 : 9.5, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {badge || 'SPECIAL OFFER'}
                </Text>
              </View>
              <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: isCompact ? 9 : 11, fontWeight: '800' }}>
                {businessName || 'Brand'}
              </Text>
            </View>

            <Text
              numberOfLines={2}
              style={{
                color: '#FFFFFF',
                fontSize: isCompact ? 12 : 15,
                fontWeight: '900',
                lineHeight: isCompact ? 16 : 20,
              }}
            >
              {headline || 'Professional Business Services'}
            </Text>

            {subtitle ? (
              <Text numberOfLines={1} style={{ color: themeConfig.subColor || '#94A3B8', fontSize: isCompact ? 8.5 : 10.5, fontWeight: '700' }}>
                {subtitle}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 6 }}>
              <Text numberOfLines={1} style={{ color: '#94A3B8', fontSize: isCompact ? 7.5 : 9, fontWeight: '600', flex: 1, marginRight: 8 }}>
                {cleanWeb || businessName}
              </Text>
              <View style={{ backgroundColor: themeConfig.ctaBg, paddingHorizontal: isCompact ? 8 : 12, paddingVertical: isCompact ? 3.5 : 5, borderRadius: 16 }}>
                <Text style={{ color: themeConfig.ctaText, fontSize: isCompact ? 8 : 10, fontWeight: '900' }}>
                  {ctaText ? `${ctaText} →` : 'VISIT STORE →'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <>
          <Image
            source={photoUri ? { uri: photoUri } : require('../../assets/fieseros-ai-assistant-poster.jpg')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />

          {/* If Urgent 24/7 Layout: Top Red Banner */}
          {layout === 'urgent_callout' ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: '#DC2626',
                paddingVertical: isCompact ? 4 : 7,
                paddingHorizontal: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                zIndex: 3,
              }}
            >
              <MaterialIcons name="bolt" size={isCompact ? 12 : 15} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: isCompact ? 8.5 : 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {badge || '24/7 RAPID SERVICE'} • CALL NOW 📞
              </Text>
            </View>
          ) : layout === 'minimal_luxury' ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                paddingHorizontal: isCompact ? 12 : 16,
                paddingVertical: isCompact ? 8 : 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 3,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: '#D4AF37',
                  fontSize: isCompact ? 10 : 12,
                  fontWeight: '900',
                  letterSpacing: 2.2,
                  textTransform: 'uppercase',
                  flex: 1,
                  textAlign: logoUri ? 'left' : 'center',
                }}
              >
                {businessName || 'LUXURY ATELIER'}
              </Text>
              {logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={{
                    width: isCompact ? 22 : 28,
                    height: isCompact ? 22 : 28,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderWidth: 1,
                    borderColor: 'rgba(212, 175, 55, 0.8)',
                  }}
                  resizeMode="cover"
                />
              ) : null}
            </View>
          ) : (
            /* Floating Glassmorphic Top Ribbon (Badge & Logo) */
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                paddingHorizontal: isCompact ? 10 : 14,
                paddingVertical: isCompact ? 8 : 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: layout === 'tech_modern' ? 'rgba(11,15,25,0.45)' : 'rgba(0,0,0,0.18)',
              }}
            >
              <View
                style={{
                  backgroundColor: themeConfig.badgeBg,
                  paddingHorizontal: isCompact ? 8 : 12,
                  paddingVertical: isCompact ? 3.5 : 5,
                  borderRadius: 20,
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 5,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: layout === 'tech_modern' ? '#38BDF8' : 'rgba(255,255,255,0.25)',
                }}
              >
                <Text
                  style={{
                    color: themeConfig.badgeText,
                    fontSize: isCompact ? 8.5 : 10.5,
                    fontWeight: '900',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}
                >
                  {badge || 'SPECIAL OFFER'}
                </Text>
              </View>

              {logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={{
                    width: isCompact ? 22 : 28,
                    height: isCompact ? 22 : 28,
                    borderRadius: 6,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.4)',
                  }}
                  resizeMode="cover"
                />
              ) : null}
            </View>
          )}

          {/* Modern Cinematic Vignette Overlay at Bottom */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor:
                layout === 'urgent_callout'
                  ? 'rgba(15,3,3,0.85)'
                  : layout === 'tech_modern'
                  ? 'rgba(5, 11, 26, 0.92)'
                  : layout === 'minimal_luxury'
                  ? 'rgba(9, 8, 7, 0.88)'
                  : 'rgba(7, 10, 19, 0.78)',
              paddingHorizontal: isCompact ? 12 : 16,
              paddingTop: isCompact ? 10 : 14,
              paddingBottom: isCompact ? 10 : 14,
              borderTopLeftRadius: isCompact ? 14 : 18,
              borderTopRightRadius: isCompact ? 14 : 18,
              borderTopWidth: 1,
              borderTopColor:
                layout === 'urgent_callout'
                  ? 'rgba(239,68,68,0.3)'
                  : layout === 'tech_modern'
                  ? 'rgba(56, 189, 248, 0.35)'
                  : layout === 'minimal_luxury'
                  ? 'rgba(217, 180, 114, 0.35)'
                  : 'rgba(255,255,255,0.14)',
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {/* Minimal luxury subtle gold badge */}
            {layout === 'minimal_luxury' ? (
              <Text
                style={{
                  color: '#D4AF37',
                  fontSize: isCompact ? 8.5 : 10.5,
                  fontWeight: '900',
                  letterSpacing: 2,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                — {badge || 'EXCLUSIVE COLLECTION'} —
              </Text>
            ) : null}

            {/* Dynamic Marketing Headline */}
            <Text
              numberOfLines={2}
              style={{
                color: '#FFFFFF',
                fontSize: isCompact ? 13 : 17,
                fontWeight: '900',
                lineHeight: isCompact ? 17 : 23,
                letterSpacing: layout === 'minimal_luxury' ? 0.3 : -0.4,
                textAlign: layout === 'minimal_luxury' ? 'center' : 'left',
                textShadowColor: 'rgba(0,0,0,0.9)',
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
                  color:
                    layout === 'urgent_callout'
                      ? '#FCA5A5'
                      : layout === 'minimal_luxury'
                      ? '#E5D6B8'
                      : layout === 'tech_modern'
                      ? '#38BDF8'
                      : themeConfig.subColor || '#94A3B8',
                  fontSize: isCompact ? 9 : 11.5,
                  fontWeight: '700',
                  marginTop: 3,
                  textAlign: layout === 'minimal_luxury' ? 'center' : 'left',
                  textShadowColor: 'rgba(0,0,0,0.85)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
              >
                {subtitle}
              </Text>
            ) : null}

            {/* Tech Modern specs chip */}
            {layout === 'tech_modern' ? (
              <Text
                numberOfLines={1}
                style={{
                  color: '#38BDF8',
                  fontSize: isCompact ? 7.5 : 9,
                  fontWeight: '800',
                  marginTop: 3,
                  letterSpacing: 0.5,
                }}
              >
                ⚡ FAST SETUP  •  🛡️ ENTERPRISE READY  •  📱 LIVE SYNC
              </Text>
            ) : null}

            {/* Action Row: Brand Info + Floating CTA Pill */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: isCompact ? 8 : 12,
                paddingTop: isCompact ? 6 : 8,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.1)',
              }}
            >
              {/* Brand Signature */}
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, paddingRight: 8 }}>
                <View
                  style={{
                    width: isCompact ? 20 : 24,
                    height: isCompact ? 20 : 24,
                    borderRadius: 12,
                    backgroundColor:
                      layout === 'urgent_callout'
                        ? '#DC2626'
                        : layout === 'tech_modern'
                        ? '#0284C7'
                        : layout === 'minimal_luxury'
                        ? '#D4AF37'
                        : themeConfig.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: isCompact ? 9.5 : 12 }}>
                    {initial}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: '#FFFFFF', fontSize: isCompact ? 9.5 : 11.5, fontWeight: '800' }}
                  >
                    {businessName || 'Commercial Brand'}
                  </Text>
                  {cleanWeb ? (
                    <Text
                      numberOfLines={1}
                      style={{ color: '#94A3B8', fontSize: isCompact ? 7.5 : 9, fontWeight: '600' }}
                    >
                      {cleanWeb}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Floating High-Conversion CTA Button */}
              <View
                style={{
                  backgroundColor:
                    layout === 'urgent_callout'
                      ? '#DC2626'
                      : layout === 'tech_modern'
                      ? '#38BDF8'
                      : layout === 'minimal_luxury'
                      ? '#D4AF37'
                      : themeConfig.ctaBg,
                  paddingHorizontal: isCompact ? 8 : 12,
                  paddingVertical: isCompact ? 4 : 6,
                  borderRadius: 20,
                  shadowColor: layout === 'tech_modern' ? '#38BDF8' : themeConfig.accent,
                  shadowOpacity: 0.35,
                  shadowRadius: 4,
                  elevation: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Text
                  style={{
                    color:
                      layout === 'tech_modern' || layout === 'minimal_luxury'
                        ? '#090807'
                        : themeConfig.ctaText,
                    fontSize: isCompact ? 8 : 10,
                    fontWeight: '900',
                    letterSpacing: layout === 'minimal_luxury' ? 0.8 : 0.3,
                  }}
                >
                  {ctaText ? `${ctaText} →` : (layout === 'urgent_callout' ? 'CALL NOW 📞' : 'VISIT STORE →')}
                </Text>
              </View>
            </View>
          </View>
        </>
      )}

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
    website?: string;
    websiteTags?: string[];
    suggestions: Array<{ id: string; category?: string; chipLabel?: string; icon?: string; title?: string; prompt: string; headline?: string; badge?: string }>;
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
  const [hasGenerated, setHasGenerated] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [activeUserPrompt, setActiveUserPrompt] = useState('');
  const [generationMode, setGenerationMode] = useState<'poster' | 'graphic' | 'image_only'>('poster');
  const [activeVisualFormat, setActiveVisualFormat] = useState<'poster' | 'canvas'>('poster');
  const [posterLayout, setPosterLayout] = useState<PosterTemplateLayout>('bold_offer');
  const [customPosterUri, setCustomPosterUri] = useState<string | null>(null);
  const [alternativeHeadlines, setAlternativeHeadlines] = useState<string[]>(DEFAULT_ALT_HEADLINES);
  const [selectedLayout, setSelectedLayout] = useState<LayoutId>('editorial');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('4:5');
  const [colorTheme, setColorTheme] = useState<CommercialTheme>('royal_gold');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);

  // ─── Flyer-Maker-style template gallery entry ──────────────────────────
  const [studioCreateTab, setStudioCreateTab] = useState<'templates' | 'ideas'>('templates');
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const activeTemplateBgPrompt = activeTemplateId
    ? getTemplateById(activeTemplateId)?.bgPrompt
    : undefined;

  const applyPosterTemplate = (t: PosterTemplate) => {
    setActiveTemplateId(t.id);
    setCustomDesign(null);
    setHeadline(t.headline);
    setDiscountBadge(t.badge);
    setSubtitle(t.subtitle);
    setCtaText(t.cta);
    setColorTheme(t.theme);
    setAspectRatio(t.aspect === '16:9' ? '4:5' : t.aspect);
    setPosterLayout(t.layout);
    setBgPhotoUrl(t.photo);
    setCustomPosterUri(null);
    setHasGenerated(false);
    setActiveUserPrompt('');
    setStudioCreateTab('templates');
    setStudioStep(2);
    setStudioSubTab('design');
    setSuccessNotice(`✨ ${t.name} template applied — customize & publish!`);
    setTimeout(() => setSuccessNotice(null), 3200);
  };

  // Graphic content elements — dynamic business-aware defaults
  const [headline, setHeadline] = useState('');
  const [discountBadge, setDiscountBadge] = useState('SPECIAL OFFER');
  const [subtitle, setSubtitle] = useState('Quality & Service You Can Trust.');
  const [ctaText, setCtaText] = useState('Learn More');
  const [bgPhotoUrl, setBgPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1080&q=80'
  );

  // Caption & copy
  const [caption, setCaption] = useState('');
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [isEditingText, setIsEditingText] = useState(false);
  const [isCampaignSheetOpen, setIsCampaignSheetOpen] = useState(false);
  const [selectedIdeaModal, setSelectedIdeaModal] = useState<{
    id: string;
    title?: string;
    chipLabel?: string;
    icon?: string;
    prompt: string;
    headline?: string;
    badge?: string;
  } | null>(null);

  // Offer details & Review step
  const [reviewPlatform, setReviewPlatform] = useState<'instagram' | 'facebook' | 'googlebusiness'>('instagram');
  const [offerStartDate, setOfferStartDate] = useState('6 Nov');
  const [offerEndDate, setOfferEndDate] = useState('8 Nov');
  const [bookingLink, setBookingLink] = useState('');
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

  const effectiveHeadline = useMemo(() => {
    if (headline) return headline;
    return effectiveBusinessName && effectiveBusinessName !== 'Commercial Brand'
      ? `Welcome to ${effectiveBusinessName}`
      : 'Special Offer';
  }, [headline, effectiveBusinessName]);

  const effectiveCaption = useMemo(() => {
    if (caption) return caption;
    return buildDefaultCaption(
      effectiveBusinessName !== 'Commercial Brand' ? effectiveBusinessName : undefined,
      effectiveBusinessWebsite,
      brandProfile.data?.profile?.industry || gbpPlace.data?.place?.category
    );
  }, [caption, effectiveBusinessName, effectiveBusinessWebsite, brandProfile.data?.profile?.industry, gbpPlace.data?.place?.category]);

  const userInitials = useMemo(() => {
    const raw =
      workspace.data?.name ||
      brandProfile.data?.profile?.businessName ||
      effectiveBusinessName ||
      'ME';
    const parts = raw.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [workspace.data?.name, brandProfile.data?.profile?.businessName, effectiveBusinessName]);

  const businessDisplayName =
    discover.data?.activeProfile?.name ||
    brandProfile.data?.profile?.businessName ||
    gbpPlace.data?.place?.title ||
    effectiveBusinessName;

  // 3 Creative Directions
  const layouts: CreativeLayout[] = useMemo(
    () => [
      {
        id: 'editorial',
        name: 'Editorial',
        headline: headline || effectiveHeadline,
        subtitle: subtitle || 'Quality & Service You Can Trust.',
        badge: discountBadge || 'SPECIAL OFFER',
        ctaText: ctaText || 'Learn More',
        theme: 'sand_olive',
        photoUrl: bgPhotoUrl,
      },
      {
        id: 'photo_led',
        name: 'Photo-led',
        headline: discountBadge || 'EXCLUSIVE OFFER',
        subtitle: subtitle || 'Selected offerings for you.',
        badge: 'EXCLUSIVE',
        ctaText: ctaText || 'Explore Now',
        theme: 'beige',
        photoUrl: bgPhotoUrl,
      },
      {
        id: 'bold',
        name: 'Bold',
        headline: headline || 'FEATURED OFFER',
        subtitle: subtitle || 'Quality & Service You Can Trust.',
        badge: discountBadge || 'LIMITED TIME',
        ctaText: ctaText || 'Claim Offer',
        theme: 'emerald_gold',
        photoUrl: bgPhotoUrl,
      },
    ],
    [headline, effectiveHeadline, subtitle, discountBadge, ctaText, bgPhotoUrl]
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

  const handlePickLogo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow photo gallery access to pick a business logo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        base64: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setBrandLogoUri(asset.uri);
        if (asset.base64) {
          const rawMime = asset.mimeType || 'image/png';
          const mime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
          apiRequest<{ url: string }>('/api/social/designs/assets', {
            method: 'POST',
            body: { data: `data:${mime};base64,${asset.base64}` },
          })
            .then((res) => {
              if (res?.url) {
                setBrandLogoUri(res.url);
              }
            })
            .catch(() => {
              setBrandLogoUri(`data:${mime};base64,${asset.base64}`);
            });
        }
      }
    } catch (err) {
      console.warn('Failed to pick logo:', err);
    }
  };

  const [isScanningWebsite, setIsScanningWebsite] = useState(false);
  const lastFetchedWebsiteRef = useRef<string | null>(null);

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
      if (effectiveBusinessWebsite) params.set('website', effectiveBusinessWebsite);

      const fresh = await apiRequest<{
        business?: { name?: string; category?: string };
        website?: string;
        websiteTags?: string[];
        suggestions: Array<{ id: string; category?: string; chipLabel?: string; icon?: string; title?: string; prompt: string; headline?: string; badge?: string }>;
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

  const handleScanWebsite = async (overrideWebsite?: string) => {
    const targetWeb = overrideWebsite || effectiveBusinessWebsite;
    if (!targetWeb || isScanningWebsite) return;
    setIsScanningWebsite(true);
    try {
      const params = new URLSearchParams({ refresh: '1', scan: '1', website: targetWeb });
      const cat =
        brandProfile.data?.profile?.industry ||
        gbpPlace.data?.place?.category ||
        '';
      if (cat) params.set('category', cat);
      if (effectiveBusinessName) params.set('businessName', effectiveBusinessName);

      const fresh = await apiRequest<{
        business?: { name?: string; category?: string };
        website?: string;
        websiteTags?: string[];
        suggestions: Array<{ id: string; category?: string; chipLabel?: string; icon?: string; title?: string; prompt: string; headline?: string; badge?: string }>;
      }>(`/api/social/prompts/suggestions?${params.toString()}`);

      if (fresh?.suggestions && fresh.suggestions.length > 0) {
        promptSuggestions.setData(fresh);
        Alert.alert('Website Scanned', `Extracted features from ${targetWeb}:\n${(fresh.websiteTags || []).slice(0, 4).join('\n') || 'Smart tags ready'}`);
      }
    } catch (err: any) {
      console.warn('Failed to scan website:', err);
      Alert.alert('Scan Result', 'Could not reach website directly, using smart industry tags.');
    } finally {
      setIsScanningWebsite(false);
    }
  };

  useEffect(() => {
    if (effectiveBusinessWebsite && lastFetchedWebsiteRef.current !== effectiveBusinessWebsite) {
      lastFetchedWebsiteRef.current = effectiveBusinessWebsite;
      handleRefreshIdeas();
    }
  }, [effectiveBusinessWebsite]);

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
          prompt: activeUserPrompt || promptInput || activeTemplateBgPrompt || 'commercial product photography',
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
      const msg = (err as Error)?.message || '';
      if (/could not connect|fetch failed|network request failed|failed to connect/i.test(msg)) {
        setError('Could not connect to backend server. Make sure Next.js is running on port 3000.');
      } else {
        setError(msg || 'Failed to regenerate image.');
      }
    }
  }

  const [customDesign, setCustomDesign] = useState<MarketingDesign | null>(null);
  const design = useMemo(() => {
    if (customDesign) return customDesign;
    try {
      const isEligible = (u?: string | null) => typeof u === 'string' && /^(https:\/\/|data:image\/(png|jpeg|jpg|webp);base64,)/i.test(u.trim());
      const safePhoto = isEligible(customPosterUri)
        ? customPosterUri!
        : isEligible(bgPhotoUrl)
        ? bgPhotoUrl
        : undefined;

      const safeLogo = isEligible(effectiveBusinessLogo) ? effectiveBusinessLogo! : undefined;

      return createCommercialPosterDesign({
        brand: effectiveBusinessName,
        headline: headline || effectiveHeadline,
        subtitle,
        badge: discountBadge,
        cta: ctaText,
        phone: undefined,
        website: effectiveBusinessWebsite,
        photo: safePhoto,
        ratio: aspectRatio,
        theme: colorTheme,
        logoUrl: safeLogo,
        tagline: effectiveBusinessTagline || undefined,
        layout: posterLayout,
      });
    } catch (err) {
      console.warn('[marketing.tsx] createCommercialPosterDesign fallback:', err);
      return createCommercialPosterDesign({
        brand: effectiveBusinessName,
        headline: headline || effectiveHeadline,
        subtitle,
        badge: discountBadge,
        cta: ctaText,
        photo: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1080&q=80',
        ratio: aspectRatio,
        theme: colorTheme,
        layout: posterLayout,
      });
    }
  }, [
    customDesign,
    effectiveBusinessName,
    headline,
    effectiveHeadline,
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
    posterLayout,
  ]);

  function handleAiRewriteHeadline(mode: 'punchier' | 'benefits' | 'urgent') {
    const current = (headline || effectiveHeadline || '').trim();
    if (!current) return;
    if (mode === 'punchier') {
      const words = current.split(/\s+/);
      const shortened = words.slice(0, Math.min(5, words.length)).join(' ');
      handleUpdateHeadline(shortened);
    } else if (mode === 'benefits') {
      if (/save|boost|grow|streamline/i.test(current)) {
        handleUpdateHeadline(`Boost Results with ${effectiveBusinessName}`);
      } else {
        handleUpdateHeadline(`Save Time & Grow with ${current}`);
      }
    } else if (mode === 'urgent') {
      if (!/limited|today|now|fast/i.test(current)) {
        handleUpdateHeadline(`⚡ Limited Time: ${current}`);
      } else {
        handleUpdateHeadline(`🔥 Today Only: ${current}`);
      }
    }
  }

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
            const rawMime = asset.mimeType || 'image/jpeg';
            const mime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
            const dataUrl = `data:${mime};base64,${asset.base64}`;
            const uploaded = await apiRequest<{ url: string; assetId?: string }>('/api/social/designs/assets', {
              method: 'POST',
              body: { data: dataUrl },
            });
            setCustomPosterUri(uploaded?.url || dataUrl);
          } else {
            setCustomPosterUri(asset.uri);
          }
          setActiveVisualFormat('poster');
          setSuccessNotice('Custom promotional graphic uploaded & saved!');
          setTimeout(() => setSuccessNotice(null), 3000);
        } catch {
          if (asset.base64) {
            const rawMime = asset.mimeType || 'image/jpeg';
            const mime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
            setCustomPosterUri(`data:${mime};base64,${asset.base64}`);
          } else {
            setCustomPosterUri(asset.uri);
          }
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
    const topicToUse =
      (typeof customTopic === 'string' ? customTopic : promptInput).trim() ||
      activeUserPrompt ||
      `Promote ${effectiveBusinessName}`;
    setBusy(true);
    setHasGenerated(true);
    setError(null);
    setActiveUserPrompt(topicToUse);
    try {
      const requestId = `mob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      // 1. Generate campaign copy, headline, and alternative headlines with resilient fallback
      const genPromise = apiRequest<{ design: MarketingDesign; caption: string; alternativeHeadlines?: string[] }>('/api/social/designs/generate', {
        method: 'POST',
        body: { prompt: topicToUse, design, caption: caption || effectiveCaption, mode: generationMode },
      }).catch((genErr) => {
        console.warn('[marketing.tsx] generate design fallback activated:', genErr);
        const cleanTopic = topicToUse.replace(/^\[POSTER\]\s*/i, '').trim();
        const firstLine = cleanTopic.split(/[.\n]/)[0].slice(0, 50) || headline || 'Smart Field Tracking';
        return {
          design: design || createCommercialPosterDesign({
            brand: effectiveBusinessName,
            headline: firstLine,
            subtitle: 'Real-time telemetry & workflow automation',
            badge: 'RECOMMENDED',
            cta: 'Learn More',
            photo: bgPhotoUrl,
          }),
          caption: `${firstLine}\n\nStreamline your operations and manage your field workforce effortlessly. Contact ${effectiveBusinessName} today for more details!`,
          alternativeHeadlines: [firstLine, 'Boost Team Productivity', 'Automated Attendance App'],
        };
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
      const msg = (err as Error)?.message || '';
      if (/could not connect|fetch failed|network request failed|failed to connect/i.test(msg)) {
        setError('Could not connect to backend server. Make sure Next.js is running on port 3000.');
      } else {
        setError(msg || 'AI generation failed. You can customize the fields manually below.');
      }
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

    const isPosterMode = true;
    const resolvedPosterUrl = customPosterUri || bgPhotoUrl;
    const mediaList = resolvedPosterUrl ? [resolvedPosterUrl] : [];
    const postCaption = (caption || effectiveCaption).trim();
    const contentCheck = validateSocialPost(postCaption, selectedPlatforms, mediaList);
    if (contentCheck) {
      setError(contentCheck);
      return;
    }

    saving.current = true;
    setBusy(true);

    const body: Record<string, unknown> = {
      content: postCaption,
      targets: targets.length > 0 ? targets : undefined,
      platforms: selectedPlatforms,
      mediaUrls: mediaList,
      isPoster: isPosterMode,
      isPreRendered: false,
      design: design,
      expectedUpdatedAt: designRevision,
      ...(status !== 'draft' && editingDesignId ? { draftId: editingDesignId } : {}),
      status,
      gbpPostType: 'offer',
      ...(scheduledAt ? { scheduledAt } : {}),
      gbpOfferData: {
        title: headline || effectiveHeadline,
        couponCode: discountBadge.replace(/[^A-Za-z0-9]/g, ''),
        redeemUrl: bookingLink || (effectiveBusinessWebsite ? (effectiveBusinessWebsite.startsWith('http') ? effectiveBusinessWebsite : `https://${effectiveBusinessWebsite}`) : 'https://fieseros.com'),
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
      const msg = (err as Error)?.message || '';
      if (/could not connect|fetch failed|network request failed|failed to connect/i.test(msg)) {
        setError('Could not connect to backend server. Make sure Next.js is running on port 3000.');
      } else {
        setError(msg || 'Failed to save or publish post.');
      }
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
    const cur = caption || effectiveCaption;
    const lines = cur.split('\n').filter(Boolean);
    const tag = effectiveBusinessName && effectiveBusinessName !== 'Commercial Brand'
      ? effectiveBusinessName.replace(/[^a-zA-Z0-9]/g, '')
      : 'SpecialOffer';
    if (lines.length > 2) {
      setCaption(lines.slice(0, 2).join('\n\n') + `\n\n#SpecialOffer #${tag}`);
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
            const rawMime = asset.mimeType || 'image/jpeg';
            const mime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
            const dataUrl = `data:${mime};base64,${asset.base64}`;
            try {
              const uploaded = await apiRequest<{ url: string; assetId?: string }>('/api/social/designs/assets', {
                method: 'POST',
                body: { data: dataUrl },
              });
              remoteUrl = uploaded?.url || dataUrl;
            } catch {
              remoteUrl = dataUrl;
            }
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
                  <Text numberOfLines={1} style={styles.brandPillText}>
                    {effectiveBusinessName} · {activeProfileId ? 'Active Profile' : 'Brand Studio'} ⌵
                  </Text>
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
                {!hasGenerated ? (
                  /* ── Flyer-Maker-style entry: Templates / AI Ideas ── */
                  <View style={{ flex: 1 }}>
                    <View style={styles.createSegmentWrap}>
                      <Pressable
                        onPress={() => setStudioCreateTab('templates')}
                        style={[styles.createSegmentBtn, studioCreateTab === 'templates' && styles.createSegmentBtnActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: studioCreateTab === 'templates' }}
                        accessibilityLabel="Browse poster templates"
                      >
                        <MaterialIcons name="grid-view" size={13} color={studioCreateTab === 'templates' ? '#FFFFFF' : '#64748B'} />
                        <Text style={[styles.createSegmentText, studioCreateTab === 'templates' && styles.createSegmentTextActive]}>
                          Templates
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setStudioCreateTab('ideas')}
                        style={[styles.createSegmentBtn, studioCreateTab === 'ideas' && styles.createSegmentBtnActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: studioCreateTab === 'ideas' }}
                        accessibilityLabel="Describe with AI ideas"
                      >
                        <MaterialIcons name="auto-awesome" size={13} color={studioCreateTab === 'ideas' ? '#FFFFFF' : '#64748B'} />
                        <Text style={[styles.createSegmentText, studioCreateTab === 'ideas' && styles.createSegmentTextActive]}>
                          AI Ideas
                        </Text>
                      </Pressable>
                    </View>
                    {studioCreateTab === 'templates' ? (
                      <View style={{ flex: 1 }}>
                        <PosterTemplateGallery
                          business={{
                            businessName: effectiveBusinessName,
                            category: brandProfile.data?.profile?.industry || gbpPlace.data?.place?.category || '',
                            phone: effectiveBusinessPhone,
                            website: effectiveBusinessWebsite,
                            logoUri: effectiveBusinessLogo,
                            tagline: effectiveBusinessTagline,
                          }}
                          onApply={applyPosterTemplate}
                          onDescribeIdea={() => setStudioCreateTab('ideas')}
                        />
                      </View>
                    ) : (
                      /* ── ChatGPT / Gemini Style Breathable Stage ── */
                      <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 8 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                      >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: '#F0FDF4',
                        borderWidth: 1.5,
                        borderColor: '#DCFCE7',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                        shadowColor: '#009F50',
                        shadowOpacity: 0.12,
                        shadowRadius: 8,
                        elevation: 2,
                      }}
                    >
                      <MaterialIcons name="auto-awesome" size={26} color="#009F50" />
                    </View>

                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#0F172A', textAlign: 'center', letterSpacing: -0.4, marginBottom: 6 }}>
                      What would you like to create?
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', maxWidth: 290, lineHeight: 18, marginBottom: 20 }}>
                      Pick an idea below or describe your promotion to generate high-converting posters & copy.
                    </Text>

                    {/* Quick 1-Tap Feature Idea Chips */}
                    <View style={{ width: '100%', gap: 8 }}>
                      {(promptSuggestions.data?.suggestions && promptSuggestions.data.suggestions.length > 0
                        ? promptSuggestions.data.suggestions.slice(0, 3)
                        : [
                            { id: '1', icon: '📱', title: 'Live App Tracking', prompt: 'Promote our live mobile tracking app with GPS route navigation' },
                            { id: '2', icon: '⏱️', title: 'GPS Attendance Launch', prompt: 'Announce smart geo-fenced staff attendance tracking app' },
                            { id: '3', icon: '🚀', title: 'Special Promo Offer', prompt: 'Special 20% discount offer for all new clients this month' },
                          ]
                      ).map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => setSelectedIdeaModal(item)}
                          style={({ pressed }) => [
                            {
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingVertical: 12,
                              paddingHorizontal: 14,
                              borderRadius: 14,
                              backgroundColor: '#FFFFFF',
                              borderWidth: 1,
                              borderColor: '#E2E8F0',
                              shadowColor: '#000',
                              shadowOpacity: 0.03,
                              shadowRadius: 3,
                              elevation: 1,
                            },
                            pressed && { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontSize: 18 }}>{item.icon || '💡'}</Text>
                            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', flex: 1 }}>
                              {item.title || item.chipLabel || item.prompt}
                            </Text>
                          </View>
                          <MaterialIcons name="arrow-forward" size={16} color="#94A3B8" />
                        </Pressable>
                      ))}
                    </View>
                      </ScrollView>
                    )}
                  </View>
                ) : (
                  /* ── Active Generated Campaign State ── */
                  <>
                    {/* User Prompt Bubble */}
                    <View style={styles.userBubbleContainer}>
                      <View style={styles.userBubble}>
                        <Text style={styles.userBubbleText}>{activeUserPrompt}</Text>
                      </View>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{userInitials}</Text>
                      </View>
                    </View>

                    {/* AI Reply Bubble */}
                    <View style={styles.aiBubbleContainer}>
                      <View style={styles.aiAvatar}>
                        <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
                      </View>
                      <View style={styles.aiBubble}>
                        <Text style={styles.aiBubbleText}>
                          Here is your custom visual campaign for {effectiveBusinessName}.
                        </Text>
                      </View>
                    </View>

                    {/* Live Creative Design Preview Card with Inline Action Bar */}
                    <View
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        overflow: 'hidden',
                        marginBottom: 12,
                        shadowColor: '#000',
                        shadowOpacity: 0.06,
                        shadowRadius: 6,
                        elevation: 3,
                      }}
                    >
                      <View style={{ padding: 12, backgroundColor: '#070A13', alignItems: 'center', justifyContent: 'center' }}>
                        <AutoBrandedPosterCard
                          photoUri={customPosterUri || bgPhotoUrl}
                          headline={headline || effectiveHeadline}
                          subtitle={subtitle}
                          badge={discountBadge}
                          ctaText={ctaText}
                          businessName={effectiveBusinessName}
                          logoUri={effectiveBusinessLogo}
                          tagline={effectiveBusinessTagline}
                          website={effectiveBusinessWebsite}
                          height={280}
                          theme={colorTheme}
                          layout={posterLayout}
                          isGenerating={isGeneratingImage || (busy && generationMode === 'poster')}
                        />
                      </View>

                      {/* Inline Quick Action Pills directly underneath the visual */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                        <Pressable
                          onPress={() => setIsEditingText(true)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                        >
                          <MaterialIcons name="edit" size={13} color="#334155" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>Edit Text</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            const curIndex = COMMERCIAL_THEME_KEYS.indexOf(colorTheme);
                            const nextTheme = COMMERCIAL_THEME_KEYS[(curIndex + 1) % COMMERCIAL_THEME_KEYS.length];
                            cycleTheme(nextTheme);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                        >
                          <MaterialIcons name="palette" size={13} color="#334155" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                            {COMMERCIAL_THEMES[colorTheme]?.name?.split(' ')[0] || 'Theme'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={handleRegenerateImage}
                          disabled={isGeneratingImage}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#F0FDF4' }}
                        >
                          {isGeneratingImage ? (
                            <ActivityIndicator size="small" color="#009F50" />
                          ) : (
                            <MaterialIcons name="auto-awesome" size={13} color="#009F50" />
                          )}
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#009F50' }}>
                            {isGeneratingImage ? 'Rendering...' : 'New Image'}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setStudioStep(3)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#009F50' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>Publish →</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Alternative Headlines Chips */}
                    {alternativeHeadlines && alternativeHeadlines.length > 0 && (
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
                    )}

                    {/* Caption Card */}
                    <View style={styles.captionBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialIcons name="description" size={16} color="#009F50" />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Caption</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                          {(caption || effectiveCaption).trim().split(/\s+/).filter(Boolean).length} words
                        </Text>
                      </View>

                      <Text style={styles.captionText}>{caption || effectiveCaption}</Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                        <Pressable onPress={() => setIsEditingCaption(true)}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#009F50' }}>Edit caption</Text>
                        </Pressable>
                        <Pressable onPress={handleMakeShorter}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>Make shorter</Text>
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>

              {/* Bottom Sticky Action Bar: Suggestions (if generated) + Mode Selector + Floating Composer */}
              <View style={styles.promptInputContainer}>
                {/* Suggestions row shown when generated */}
                {hasGenerated && promptSuggestions.data?.suggestions && promptSuggestions.data.suggestions.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
                      {promptSuggestions.data.suggestions.map((s) => (
                        <Pressable
                          key={s.id}
                          onPress={() => setSelectedIdeaModal(s)}
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

                {/* Floating Composer */}
                <View style={styles.promptInputRow}>
                  {/* Smart Campaign Helper Button */}
                  <Pressable
                    onPress={() => setIsCampaignSheetOpen(true)}
                    hitSlop={6}
                    style={{
                      padding: 6,
                      backgroundColor: '#F0FDF4',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#BBF7D0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="auto-fix-high" size={18} color="#009F50" />
                  </Pressable>

                  <TextInput
                    value={promptInput}
                    onChangeText={setPromptInput}
                    placeholder={
                      generationMode === 'image_only'
                        ? 'Describe image to generate...'
                        : 'Describe campaign or feature idea...'
                    }
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={2}
                    style={[styles.promptInput, { maxHeight: 68, fontSize: 12.5, minHeight: 32 }]}
                    returnKeyType="default"
                  />

                  {/* Clean Single Image Picker Button */}
                  <Pressable onPress={handleUseMyPhoto} hitSlop={6} style={{ padding: 6 }}>
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
                      <MaterialIcons name="arrow-upward" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
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

                {/* Template Layout Carousel (NRA Flyer Maker Style) */}
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>Flyer Layout Template</Text>
                    <Text style={{ fontSize: 10.5, color: '#009F50', fontWeight: '700' }}>5 Pro Styles</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {POSTER_TEMPLATES.map((tmpl) => {
                      const isSelected = posterLayout === tmpl.id;
                      return (
                        <Pressable
                          key={tmpl.id}
                          onPress={() => {
                            setPosterLayout(tmpl.id);
                            setCustomDesign(null);
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: isSelected ? '#009F50' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isSelected ? '#009F50' : '#E2E8F0',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            shadowColor: '#000',
                            shadowOpacity: isSelected ? 0.15 : 0.03,
                            shadowRadius: 3,
                            elevation: isSelected ? 2 : 1,
                          }}
                        >
                          <MaterialIcons name={tmpl.icon as any} size={15} color={isSelected ? '#FFFFFF' : '#475569'} />
                          <View>
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: isSelected ? '#FFFFFF' : '#0F172A' }}>
                              {tmpl.name}
                            </Text>
                            <Text style={{ fontSize: 9.5, fontWeight: '600', color: isSelected ? '#E2E8F0' : '#64748B' }}>
                              {tmpl.badge}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Color Scheme Chips */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Color Scheme</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {COMMERCIAL_THEME_KEYS.map((key) => {
                      const cfg = COMMERCIAL_THEMES[key];
                      const isSelected = colorTheme === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => setColorTheme(key)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isSelected ? '#009F50' : '#CBD5E1',
                          }}
                        >
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.badgeBg }} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#009F50' : '#475569' }}>
                            {cfg.name.split(' ')[0]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Live Auto-Branded Flyer Preview */}
                <View style={{ marginBottom: 16 }}>
                  <AutoBrandedPosterCard
                    photoUri={customPosterUri || bgPhotoUrl}
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
                    layout={posterLayout}
                    isGenerating={isGeneratingImage || (busy && generationMode === 'poster')}
                  />

                  {/* Quick Poster Customization Controls: Headline, Offer, CTA, Photo, Brand */}
                  <View style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 12, marginTop: 12, gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>Customize Poster Details</Text>
                      <Text style={{ fontSize: 10.5, color: '#009F50', fontWeight: '700' }}>Live Auto-Branded</Text>
                    </View>

                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Headline</Text>
                        {/* One-Tap AI Rewrite Chips */}
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <Pressable
                            onPress={() => handleAiRewriteHeadline('punchier')}
                            style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}
                          >
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#475569' }}>⚡ Punchier</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleAiRewriteHeadline('benefits')}
                            style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}
                          >
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#009F50' }}>🎯 Benefits</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleAiRewriteHeadline('urgent')}
                            style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}
                          >
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#EF4444' }}>🔥 Urgent</Text>
                          </Pressable>
                        </View>
                      </View>
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
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>{userInitials[0] || 'B'}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>{businessDisplayName}</Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>Just now</Text>
                      </View>
                    </View>
                    <MaterialIcons name="more-horiz" size={20} color="#64748B" />
                  </View>

                  <View style={{ backgroundColor: '#090D16', paddingVertical: 4 }}>
                    <AutoBrandedPosterCard
                      photoUri={customPosterUri || bgPhotoUrl}
                      headline={headline || effectiveHeadline}
                      subtitle={subtitle}
                      badge={discountBadge}
                      ctaText={ctaText}
                      businessName={effectiveBusinessName}
                      logoUri={effectiveBusinessLogo}
                      tagline={effectiveBusinessTagline}
                      website={effectiveBusinessWebsite}
                      height={Math.min(320, Math.round(Dimensions.get('window').height * 0.36))}
                      theme={colorTheme}
                      layout={posterLayout}
                    />
                  </View>

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
                      {caption || effectiveCaption}
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
                  value={captionDraft || caption || effectiveCaption}
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

          {/* Modal: Suggested Idea Quick Action */}
          <Modal
            visible={!!selectedIdeaModal}
            animationType="fade"
            transparent
            onRequestClose={() => setSelectedIdeaModal(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 20 }}>{selectedIdeaModal?.icon || '💡'}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1 }}>
                      {selectedIdeaModal?.title || selectedIdeaModal?.chipLabel || 'Marketing Idea'}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelectedIdeaModal(null)} hitSlop={8}>
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </Pressable>
                </View>

                <Text style={{ fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 14 }}>
                  {selectedIdeaModal?.prompt}
                </Text>

                {selectedIdeaModal?.headline && (
                  <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748B', marginBottom: 3, textTransform: 'uppercase' }}>Poster Preview</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>{selectedIdeaModal.headline}</Text>
                    {selectedIdeaModal.badge && (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#009F50', marginTop: 2 }}>{selectedIdeaModal.badge}</Text>
                    )}
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => {
                      if (selectedIdeaModal) {
                        setPromptInput(selectedIdeaModal.prompt);
                        if (selectedIdeaModal.headline) setHeadline(selectedIdeaModal.headline);
                        if (selectedIdeaModal.badge) setDiscountBadge(selectedIdeaModal.badge);
                        setSelectedIdeaModal(null);
                        setIsCampaignSheetOpen(true);
                      }
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: '#CBD5E1',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>✏️ Customize</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (selectedIdeaModal) {
                        const p = selectedIdeaModal.prompt;
                        if (selectedIdeaModal.headline) setHeadline(selectedIdeaModal.headline);
                        if (selectedIdeaModal.badge) setDiscountBadge(selectedIdeaModal.badge);
                        setSelectedIdeaModal(null);
                        generatePost(p);
                      }
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: '#009F50',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>⚡ Generate Now</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          {/* Modal: Smart Campaign Creator Sheet */}
          <Modal
            visible={isCampaignSheetOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setIsCampaignSheetOpen(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, { maxHeight: '90%', paddingBottom: 20 }]}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="auto-awesome" size={18} color="#009F50" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Smart Campaign Creator</Text>
                      <Text style={{ fontSize: 11, color: '#64748B' }}>Tailored for {effectiveBusinessName}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setIsCampaignSheetOpen(false)} hitSlop={8}>
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                  {/* Website Feature Tags Section */}
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, paddingRight: 6 }}>
                        <MaterialIcons name="language" size={14} color="#009F50" />
                        <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                          Website Highlights ({effectiveBusinessWebsite || 'fieseros.com'})
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleScanWebsite()}
                        disabled={isScanningWebsite}
                        hitSlop={6}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' }}
                      >
                        {isScanningWebsite ? (
                          <ActivityIndicator size="small" color="#009F50" />
                        ) : (
                          <MaterialIcons name="sync" size={12} color="#475569" />
                        )}
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>
                          {isScanningWebsite ? 'Scanning...' : 'Scan Site'}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Chips for tags */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {(promptSuggestions.data?.websiteTags && promptSuggestions.data.websiteTags.length > 0
                        ? promptSuggestions.data.websiteTags
                        : ['📱 Live Employee Tracking', '⏱️ Geo Attendance', '🗺️ Field Dispatch', '🚗 Route Tracker', '📊 Live Dashboard']
                      ).map((tag, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => {
                            const cleanText = tag.replace(/^[^\w\s]+/, '').trim();
                            setPromptInput(cleanText);
                            setHeadline(cleanText);
                          }}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#CBD5E1',
                            borderRadius: 14,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#1E293B' }}>{tag}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Campaign Prompt / Goal */}
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                      Campaign Prompt / Business Focus
                    </Text>
                    <TextInput
                      multiline
                      numberOfLines={3}
                      value={promptInput}
                      onChangeText={setPromptInput}
                      placeholder="e.g. Promote our live employee tracking mobile app with real-time GPS routes..."
                      placeholderTextColor="#94A3B8"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 13,
                        color: '#0F172A',
                        minHeight: 72,
                        textAlignVertical: 'top',
                      }}
                    />
                  </View>

                  {/* Headline & Badge Customization */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                        Poster Headline
                      </Text>
                      <TextInput
                        value={headline}
                        onChangeText={setHeadline}
                        placeholder="e.g. Live Employee Tracking"
                        placeholderTextColor="#94A3B8"
                        style={styles.configInput}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                        Badge / Offer
                      </Text>
                      <TextInput
                        value={discountBadge}
                        onChangeText={setDiscountBadge}
                        placeholder="e.g. GPS Telemetry"
                        placeholderTextColor="#94A3B8"
                        style={styles.configInput}
                      />
                    </View>
                  </View>

                  {/* CTA Text & Theme */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                        Call To Action
                      </Text>
                      <TextInput
                        value={ctaText}
                        onChangeText={setCtaText}
                        placeholder="e.g. Try Live Demo"
                        placeholderTextColor="#94A3B8"
                        style={styles.configInput}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 }}>
                        Design Theme
                      </Text>
                      <Pressable
                        onPress={() => {
                          const curIndex = COMMERCIAL_THEME_KEYS.indexOf(colorTheme);
                          const nextTheme = COMMERCIAL_THEME_KEYS[(curIndex + 1) % COMMERCIAL_THEME_KEYS.length];
                          cycleTheme(nextTheme);
                        }}
                        style={[styles.configInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>
                          {COMMERCIAL_THEMES[colorTheme]?.name || 'Cyber Tech'}
                        </Text>
                        <MaterialIcons name="palette" size={16} color="#009F50" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Generate Button */}
                  <Pressable
                    disabled={busy}
                    onPress={() => {
                      setIsCampaignSheetOpen(false);
                      generatePost(promptInput || headline);
                    }}
                    style={[
                      styles.modalDoneBtn,
                      { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
                      busy && { opacity: 0.6 }
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" />
                        <Text style={styles.modalDoneBtnText}>Generate Visual Campaign</Text>
                      </>
                    )}
                  </Pressable>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  createSegmentWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  createSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  createSegmentBtnActive: {
    backgroundColor: '#009F50',
    borderColor: '#009F50',
  },
  createSegmentText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#64748B',
  },
  createSegmentTextActive: {
    color: '#FFFFFF',
  },
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