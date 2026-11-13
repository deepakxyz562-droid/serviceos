import { PosterEditor } from '../../src/components/design/poster-editor';
import { PublishingAccountPicker } from '../../src/components/design/publishing-account-picker';
import { publishingTargets, selectedPublishingIds } from '../../../shared/marketing-targets';
import { backgroundBrief } from '../../../shared/design-editor';
import { PosterPreview } from '../../src/components/design/poster-preview';
import '../../src/lib/runtime-polyfills';
import {
  createDesign,
  validateDesign,
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
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  Share,
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
import { apiRequest, isTransientGatewayStatus } from '../../src/lib/api';
import { WEB_URL } from '../../src/lib/constants';
import { validateSocialPost } from '../../src/lib/social-validation';
import { futureLocalTime } from '../../src/lib/dates';
import { loadJson, saveJson } from '../../src/lib/device-storage';
import { PostsBoard, PostDetailModal, type PostPill, type SocialPostRow } from '../../src/components/gbp/posts-list';
import { SocialCalendarView } from '../../src/components/gbp/social-calendar';
import { ViralVideoModal } from '../../src/components/gbp/viral-video-modal';
import { StayActiveSocialMediaCard } from '../../src/components/social/stay-active-card';
import { UpcomingPostsCarousel } from '../../src/components/gbp/upcoming-posts-carousel';
import { CreateGbpPostModal, type GeneratedPostData } from '../../src/components/gbp/create-gbp-post-modal';
import { PostReviewEditModal } from '../../src/components/gbp/post-review-edit-modal';
import { FullscreenImageModal } from '../../src/components/gbp/fullscreen-image-modal';
import {
  IMAGE_PROVIDER_CHOICES,
  IMAGE_PROVIDER_LABELS,
  appendImageCandidate,
  isTextOnlyImageProvider,
  type ImageCandidate,
  type ImageProviderChoice,
} from '../../../shared/image-review';
import { normalizePendingUpload, uploadFileToStorage } from '../../src/lib/upload';

const DEFAULT_FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1080&q=80';

const TIME_SLOTS = [
  { label: '08:00 AM (Early Rush)', value: '08:00' },
  { label: '09:00 AM (Standard Business)', value: '09:00' },
  { label: '10:30 AM (Mid-Morning Peak)', value: '10:30' },
  { label: '12:00 PM (Lunch Break)', value: '12:00' },
  { label: '02:30 PM (Afternoon Focus)', value: '14:30' },
  { label: '05:00 PM (Evening Commute)', value: '17:00' },
  { label: '07:30 PM (Prime Browsing)', value: '19:30' },
];

const AUTOPILOT_THEMES = [
  { day: 'Mon', title: 'Service Spotlight', icon: 'place', desc: 'Promote weekly availability & booking' },
  { day: 'Tue', title: 'Pro Advice & Tip', icon: 'tips-and-updates', desc: 'Educational guide & problem prevention' },
  { day: 'Wed', title: 'Midweek Offer', icon: 'local-offer', desc: 'Limited savings package for midweek bookings' },
  { day: 'Thu', title: '5-Star Reviews', icon: 'star', desc: 'Highlight customer satisfaction & trust' },
  { day: 'Fri', title: 'Weekend Priority', icon: 'flash-on', desc: 'Fast response for urgent weekend needs' },
  { day: 'Sat', title: 'Behind the Scenes', icon: 'engineering', desc: 'Dedicated craftsmanship & team standards' },
  { day: 'Sun', title: 'Community Connection', icon: 'favorite', desc: 'Friendly presence & easy scheduling' },
];
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
  document,
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
  document?: MarketingDesign;
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
  if(document)return <View style={{height,aspectRatio:document.width/document.height,alignSelf:'center'}}><PosterPreview doc={document}/></View>;
  if (['studio_', 'professional_', 'business_', 'kit_'].some(prefix=>layout.startsWith(prefix))) {
    const ratio = aspectRatio === 1 ? '1:1' : aspectRatio < .6 ? '9:16' : aspectRatio > 1 ? '16:9' : '4:5';
    const doc = createCommercialPosterDesign({brand:businessName,headline,subtitle,badge,cta:ctaText,photo:photoUri||undefined,logoUrl:logoUri||undefined,website,phone,ratio,theme,layout});
    return <View style={{height,aspectRatio,alignSelf:'center'}}><PosterPreview doc={doc}/>{isGenerating && <ActivityIndicator style={{position:'absolute',top:12,right:12}}/>}</View>;
  }
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
              source={{ uri: photoUri || DEFAULT_FALLBACK_PHOTO }}
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
            source={{ uri: photoUri || DEFAULT_FALLBACK_PHOTO }}
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
  const params = useLocalSearchParams<{
    generate?: string;
    mode?: string;
    view?: string;
    date?: string;
    pill?: string;
    postId?: string;
  }>();
  const [postSubView, setPostSubView] = useState<'list' | 'calendar'>(
    params.view === 'calendar' ? 'calendar' : 'list'
  );
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const pendingRequest = useRef<{ body: string; key: string } | null>(null);
  const saving = useRef(false);

  const [activeMode, setActiveMode] = useState<'studio' | 'autopilot' | 'posts'>('posts');
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);
  const [reviewPostModalOpen, setReviewPostModalOpen] = useState(false);
  const [activeReviewPost, setActiveReviewPost] = useState<GeneratedPostData | null>(null);
  const [focusedPostId, setFocusedPostId] = useState<string | null>(
    typeof params.postId === 'string' && params.postId ? params.postId : null
  );
  const resolvedInitialPill: PostPill | undefined =
    params.pill === 'posted' ||
    params.pill === 'scheduled' ||
    params.pill === 'failed' ||
    params.pill === 'pending' ||
    params.pill === 'approved' ||
    params.pill === 'rejected' ||
    params.pill === 'not_posted'
      ? params.pill
      : undefined;

  useEffect(() => {
    if (params.mode === 'posts' || params.postId) {
      setActiveMode('posts');
      if (params.view !== 'calendar') setPostSubView('list');
    } else if (params.mode === 'autopilot') {
      setActiveMode('autopilot');
    } else if (params.mode === 'studio') {
      setActiveMode('studio');
    }
    if (typeof params.postId === 'string' && params.postId) {
      setFocusedPostId(params.postId);
    }
  }, [params.mode, params.postId, params.view]);
  const [studioStep, setStudioStep] = useState<1 | 2 | 3>(1);
  const [showCreationOptions,setShowCreationOptions] = useState(false);
  const [templateSearchOpen, setTemplateSearchOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [studioCreateTab, setStudioCreateTab] = useState<'templates' | 'ideas' | 'search' | 'drafts'>('ideas');
  // ── Resources ─────────────────────────────────────────────────────────────
  const workspace = useResource<BgosWorkspace>('/api/bgos/workspace');
  const gbpPlace = useResource<GbpPlaceResult>('/api/gbp/place');
  const discover = useResource<{ activeProfile?: { id: string; name: string } }>('/api/gbp/accounts/discover',0,activeMode !== 'studio' || studioStep === 3);
  const accounts = useResource<{ data: Account[] }>('/api/social/accounts',0,activeMode !== 'studio' || studioStep === 3);
  const brandProfile = useResource<BrandProfileData>('/api/brand-profile');
  const aiPostsRes = useResource<{
    success: boolean;
    business: { name: string; category: string; city: string; phone: string; website: string; logoUrl?: string };
    count: number;
    posts: Array<{
      id: string;
      badge: 'Standard Post' | 'Special Offer' | 'Seasonal Event';
      postType: 'STANDARD' | 'OFFER' | 'EVENT';
      title: string;
      intro: string;
      bullets: string[];
      conclusion: string;
      hashtags: string[];
      ctaText: string;
      phone: string;
      website: string;
      imageUrl: string;
      content: string;
      logoUrl?: string;
      businessName?: string;
    }>;
  }>('/api/social/ai-posts', 0, activeMode === 'studio');
  const [localAiPosts, setLocalAiPosts] = useState<any[]>([]);
  const [selectedAiPostForDetail, setSelectedAiPostForDetail] = useState<SocialPostRow | null>(null);
  const [activeAiPostIndex, setActiveAiPostIndex] = useState(0);
  const aiPostSliderRef = useRef<ScrollViewInstance | null>(null);
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null);
  const [isRefreshingAiPosts, setIsRefreshingAiPosts] = useState(false);
  const [publishingAiPostId, setPublishingAiPostId] = useState<string | null>(null);
  const [aiPostCategoryFilter, setAiPostCategoryFilter] = useState<'ALL' | 'OFFER' | 'STANDARD' | 'EVENT'>('ALL');

  useEffect(() => {
    if (aiPostsRes.data?.posts && aiPostsRes.data.posts.length > 0) {
      setLocalAiPosts(aiPostsRes.data.posts);
    }
  }, [aiPostsRes.data]);

  const handleRefreshAiPosts = useCallback(async () => {
    setIsRefreshingAiPosts(true);
    try {
      const seed = Date.now();
      const refreshed = await apiRequest<{ posts?: any[] }>(
        `/api/social/ai-posts?refresh=1&seed=${seed}`,
      );
      if (Array.isArray(refreshed?.posts) && refreshed.posts.length > 0) {
        setLocalAiPosts(refreshed.posts);
      } else {
        await aiPostsRes.refresh();
      }
      if (aiPostSliderRef.current) {
        try {
          aiPostSliderRef.current.scrollTo({ x: 0, animated: true });
        } catch {}
      }
      setActiveAiPostIndex(0);
    } catch (err) {
      Alert.alert(
        'Refresh Failed',
        err instanceof Error ? err.message : 'Could not generate new posts right now.',
      );
    } finally {
      setIsRefreshingAiPosts(false);
    }
  }, [aiPostsRes]);

  const filteredAiPosts = useMemo(() => {
    if (aiPostCategoryFilter === 'ALL') return localAiPosts;
    return localAiPosts.filter((p) => p.postType === aiPostCategoryFilter);
  }, [localAiPosts, aiPostCategoryFilter]);

  const handlePublishCardDirectly = useCallback(async (item: any, idx?: number) => {
    const postKey = String(item.id || `post_${idx ?? 0}`);
    setPublishingAiPostId(postKey);
    try {
      const res = await apiRequest<{ success?: boolean; error?: string; message?: string }>('/api/social/posts', {
        method: 'POST',
        body: {
          content: item.content,
          platforms: ['googlebusiness'],
          mediaUrls: item.imageUrl ? [item.imageUrl] : [],
          publishNow: true,
        },
      });
      if (res && res.error) throw new Error(res.error);
      Alert.alert('Published!', `"${item.title}" has been published to Google Business Profile.`);
    } catch (err: unknown) {
      Alert.alert(
        'Publish Failed',
        err instanceof Error
          ? err.message
          : `Could not publish "${item.title}" right now. Check your Google connection in Settings.`,
      );
    } finally {
      setPublishingAiPostId(null);
    }
  }, []);

  const handleCopyCardText = useCallback(async (item: any) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(item.content || '');
        Alert.alert('Copied', 'Post content copied to clipboard!');
      } else {
        await Share.share({ message: item.content || '' });
      }
    } catch {
      Alert.alert('Notice', 'Could not copy content.');
    }
  }, []);

  const handleShareCard = useCallback(async (item: any) => {
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n\n${item.content || ''}`,
        url: item.imageUrl || undefined,
      });
    } catch {}
  }, []);

  const promptSuggestions = useResource<{
    business?: { name?: string; category?: string };
    website?: string;
    websiteTags?: string[];
    suggestions: Array<{ id: string; category?: string; chipLabel?: string; icon?: string; title?: string; prompt: string; headline?: string; badge?: string }>;
  }>('/api/social/prompts/suggestions', 0, activeMode === 'studio' && studioStep === 1 && studioCreateTab === 'ideas');



  // ── Mode Switch: Studio / Create vs Autopilot vs Posts & Approvals ──────────


  // ── Autopilot State ────────────────────────────────────────────────────────
  const [apConfig, setApConfig] = useState<{
    enabled: boolean;
    duration: '7_days' | '30_days' | '1_year' | 'custom';
    customDays?: number;
    contentSource?: 'ai_generated' | 'my_templates' | 'hybrid';
    platforms: string[];
    timeZone?: string;
    accountIds?: string[];
    templateIds?: string[];
    postingTime: string;
    lastError?: string | null;
    totalPostsCreated: number;
    daysRemaining: number;
  }>({
    enabled: false,
    duration: '30_days',
    platforms: ['googlebusiness', 'instagram', 'facebook'],
    postingTime: '09:00',
    lastError: null,
    totalPostsCreated: 0,
    daysRemaining: 30,
    contentSource: 'ai_generated',
  });
  const [apError,setApError] = useState<string | null>(null);
  const [apNextRun,setApNextRun] = useState<string | null>(null);
  const [apReady,setApReady] = useState(false);
  const [apRecent,setApRecent] = useState<Array<{id:string;content:string;status:string;failureReason?:string;publishTargets:string}>>([]);
  const [apAccounts,setApAccounts] = useState<Array<{id:string;platform:string;accountName:string}>>([]);
  const apSaving = useRef(false);
  const [apTemplates,setApTemplates] = useState<Array<{id:string;content:string}>>([]);
  const [apTemplatePage,setApTemplatePage] = useState(0);
  const [apMoreTemplates,setApMoreTemplates] = useState(false);
  const loadApTemplates = async (page=1) => {
    try {const res=await apiRequest<{data:typeof apTemplates;pagination:{totalPages:number}}>(`/api/social/posts?status=draft&kind=poster&limit=20&page=${page}`);setApTemplates(old=>page===1?res.data:[...old,...res.data]);setApTemplatePage(page);setApMoreTemplates(page<res.pagination.totalPages);} catch {setApError('Saved posters could not be loaded. Try again.');}
  };
  const [apLoading, setApLoading] = useState(false);
  const [apTriggering, setApTriggering] = useState(false);

  const loadAutopilot = async () => {
    try {
      setApLoading(true);
      setApError(null);
      const res = await apiRequest<{ config: any; daysRemaining: number; nextRunAt:string|null; recentPosts: typeof apRecent; accounts: typeof apAccounts }>('/api/social/autopilot');
      if (res?.config) {
        setApNextRun(res.nextRunAt);setApReady(true);setApRecent(res.recentPosts || []);setApAccounts(res.accounts || []);
        setApConfig({
          timeZone:res.config.timeZone,accountIds:res.config.accountIds,templateIds:res.config.templateIds || [],
          enabled: res.config.enabled,
          duration: res.config.duration || '30_days',
          customDays: res.config.customDays,
          contentSource: res.config.contentSource || 'ai_generated',
          platforms: res.config.platforms || ['googlebusiness', 'instagram', 'facebook'],
          postingTime: res.config.postingTime || '09:00',
          lastError: res.config.lastError || null,
          totalPostsCreated: res.config.totalPostsCreated || 0,
          daysRemaining: res.daysRemaining ?? 0,
        });
      }
    } catch {setApError('Could not load Autopilot. Retry before changing settings.');setApReady(false);} finally {
      setApLoading(false);
    }
  };

  const saveAutopilot = async (updates: Partial<typeof apConfig> & { triggerPostNow?: boolean }) => {
    if (apSaving.current || !apReady) return;
    apSaving.current=true;
    try {
      setApLoading(true);
      setApError(null);
      const res = await apiRequest<{ config: any; daysRemaining: number; nextRunAt:string|null; message: string; triggerResult?:{success:boolean;partial?:boolean;warning?:string;error?:string} }>('/api/social/autopilot', {
        method: 'POST',
        body: updates.enabled === false && Object.keys(updates).length === 1 ? {enabled:false} : {
          enabled: updates.enabled !== undefined ? updates.enabled : apConfig.enabled,
          duration: updates.duration || apConfig.duration,
          customDays: updates.customDays !== undefined ? updates.customDays : apConfig.customDays,
          contentSource: updates.contentSource || apConfig.contentSource,
          platforms: updates.platforms || apConfig.platforms,
          postingTime: updates.postingTime || apConfig.postingTime,
          accountIds:updates.accountIds ?? apConfig.accountIds ?? [],
          templateIds:updates.templateIds ?? apConfig.templateIds ?? [],
          timeZone: updates.timeZone || apConfig.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          triggerPostNow: updates.triggerPostNow || false,
        },
      });
      if (res?.config) {
        setApNextRun(res.nextRunAt);
        setApConfig({
          timeZone:res.config.timeZone,accountIds:res.config.accountIds ?? apConfig.accountIds,templateIds:res.config.templateIds || [],
          enabled: res.config.enabled,
          duration: res.config.duration,
          customDays: res.config.customDays,
          contentSource: res.config.contentSource || 'ai_generated',
          platforms: res.config.platforms,
          postingTime: res.config.postingTime,
          lastError: res.config.lastError || null,
          totalPostsCreated: res.config.totalPostsCreated,
          daysRemaining: res.daysRemaining,
        });
        if (res.triggerResult && !res.triggerResult.success) {setApError(res.triggerResult.error || 'Post could not be published.');Alert.alert('Post needs attention',res.triggerResult.error || 'Check recent activity.');}
        else if (res.triggerResult?.warning) {setApError(res.triggerResult.warning);Alert.alert('Partially published', res.triggerResult.warning);}
        else Alert.alert('Autopilot', updates.triggerPostNow ? 'Post published successfully.' : 'Settings saved.');
        if (updates.triggerPostNow) await loadAutopilot();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update autopilot');
    } finally {
      apSaving.current=false;
      setApLoading(false);
    }
  };

  useEffect(()=>{if(activeMode==='autopilot') void loadAutopilot();},[activeMode]);

  // ── Studio 3-Step Flow (01 Create -> 02 Design -> 03 Review) ───────────────

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


  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const activeTemplateBgPrompt = activeTemplateId
    ? getTemplateById(activeTemplateId)?.bgPrompt
    : undefined;

  const generationEpoch = useRef(0);
  const [templatePickerOpen,setTemplatePickerOpen] = useState(false);
  const [draftPickerOpen,setDraftPickerOpen]=useState(false);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [editSheet, setEditSheet] = useState<'none' | 'text' | 'photo' | 'style' | 'brand'>('none');
  const [imageProvider, setImageProvider] = useState<ImageProviderChoice>('cloudflare');
  const [refPhotosList, setRefPhotosList] = useState<Array<{ id: string; url: string; title?: string; source?: string }>>([]);
  const [refPhotosLoading, setRefPhotosLoading] = useState(false);
  const [selectedRefUrls, setSelectedRefUrls] = useState<string[]>([]);
  const [uploadingRefPhoto, setUploadingRefPhoto] = useState(false);
  const [bgImageCandidates, setBgImageCandidates] = useState<ImageCandidate[]>([]);
  const [bgApprovedUrl, setBgApprovedUrl] = useState<string | null>(null);
  const [inspectMainFullscreen, setInspectMainFullscreen] = useState<false | 'poster' | 'photo'>(false);
  const [inspectSheetBgFullscreen, setInspectSheetBgFullscreen] = useState(false);
  const [lastBgGenPrompt, setLastBgGenPrompt] = useState('');
  const [refPhotosError, setRefPhotosError] = useState<string | null>(null);
  useEffect(()=>()=>{generationEpoch.current++;},[]);
  const loadBusinessRefPhotos = useCallback(async () => {
    try {
      setRefPhotosLoading(true);
      setRefPhotosError(null);
      const res = await apiRequest<{
        previousPhotos?: Array<{ id: string; url: string; title?: string; source?: string }>;
      }>('/api/social/ai-image-ideas?includeGoogle=1');
      if (Array.isArray(res?.previousPhotos)) {
        setRefPhotosList(res.previousPhotos.filter((p) => Boolean(p.url)));
      }
    } catch (err: unknown) {
      setRefPhotosError(
        err instanceof Error ? err.message : 'Could not load AI image ideas & business photos.',
      );
    } finally {
      setRefPhotosLoading(false);
    }
  }, []);
  useEffect(() => {
    if (activeMode === 'studio') void loadBusinessRefPhotos();
  }, [activeMode, loadBusinessRefPhotos]);
  const toggleRefPhoto = (url: string) => {
    setSelectedRefUrls((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= 3) {
        return [...prev.slice(1), url];
      }
      return [...prev, url];
    });
  };
  const handleUploadRefPhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Needed', 'Allow photo access to upload a reference business photo.');
          return;
        }
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        selectionLimit: 1,
        quality: 0.85,
        exif: false,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      setUploadingRefPhoto(true);
      const pending = normalizePendingUpload(
        {
          uri: asset.uri,
          name: asset.fileName || `ref-${Date.now()}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
          file: (asset as any).file,
          fileSize: asset.fileSize,
          mediaType: 'image',
        },
        0,
      );
      const uploadedUrl = await uploadFileToStorage(pending);
      const newEntry = {
        id: `ref-${Date.now()}`,
        url: uploadedUrl,
        title: 'Reference Photo',
        source: 'upload',
      };
      setRefPhotosList((prev) => [newEntry, ...prev.filter((x) => x.url !== uploadedUrl)]);
      setSelectedRefUrls((prev) => {
        if (prev.includes(uploadedUrl)) return prev;
        return prev.length >= 3 ? [...prev.slice(1), uploadedUrl] : [...prev, uploadedUrl];
      });
    } catch (e: unknown) {
      Alert.alert('Upload Failed', e instanceof Error ? e.message : 'Could not upload reference photo.');
    } finally {
      setUploadingRefPhoto(false);
    }
  };
  const [autosaveFailed,setAutosaveFailed] = useState(false);
  const [isCanvasGestureActive, setIsCanvasGestureActive] = useState(false);
  const applyPosterTemplate = (t: PosterTemplate) => {
    generationEpoch.current++;
    setBusy(false);
    setTemplatePickerOpen(false);
    setIsGeneratingImage(false);
    historyTravel.current = true;
    setActiveTemplateId(t.id);
    setHeadline(t.headline);
    setDiscountBadge(t.badge);
    setSubtitle(t.subtitle);
    setCtaText(t.cta);
    setColorTheme(t.theme);
    const targetAspect = t.aspect === '16:9' ? '4:5' : t.aspect;
    setAspectRatio(targetAspect);
    setPosterLayout(t.layout);
    setBgPhotoUrl(t.photo);
    setCustomPosterUri(null);
    setHasGenerated(true);
    setActiveUserPrompt('');
    setStudioCreateTab('templates');
    setStudioStep(2);
    setStudioSubTab('design');

    try {
      const initialDoc = createCommercialPosterDesign({
        brand: effectiveBusinessName,
        headline: t.headline,
        subtitle: t.subtitle,
        badge: t.badge,
        cta: t.cta,
        phone: brandPhone || effectiveBusinessPhone || undefined,
        website: brandWebsite || effectiveBusinessWebsite,
        photo: t.photo,
        ratio: targetAspect,
        theme: t.theme,
        logoUrl: effectiveBusinessLogo || undefined,
        tagline: effectiveBusinessTagline || undefined,
        layout: t.layout,
      });
      setCustomDesign(initialDoc);
      historyDocument.current = initialDoc;
      setDesignPast([]);
      setDesignFuture([]);
    } catch (e) {
      console.warn('[applyPosterTemplate] initialDoc fallback:', e);
    }

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
  const [offerStartDate, setOfferStartDate] = useState('6 Nov');
  const [offerEndDate, setOfferEndDate] = useState('8 Nov');
  const [bookingLink, setBookingLink] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule' | 'multi_day'>('now');
  const [multiDayCount, setMultiDayCount] = useState<number>(7);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Step 3: Interactive Review & Preview Card Actions
  const [previewLiked, setPreviewLiked] = useState(false);
  const [previewBookmarked, setPreviewBookmarked] = useState(false);
  const [showCommentPreview, setShowCommentPreview] = useState(false);
  const [previewCommentText, setPreviewCommentText] = useState('');

  const handleToggleLikePreview = useCallback(() => {
    setPreviewLiked((prev) => {
      const next = !prev;
      if (next) {
        setSuccessNotice('Saved to your favorite marketing ideas!');
      }
      return next;
    });
  }, []);

  const handleToggleBookmarkPreview = useCallback(() => {
    setPreviewBookmarked((prev) => {
      const next = !prev;
      if (next) {
        setSuccessNotice('Template bookmarked for quick reuse!');
      }
      return next;
    });
  }, []);

  async function handleSaveAsMyTemplate() {
    try {
      setBusy(true);
      const savedTemplates = (await loadJson<PosterTemplate[]>('bgos_custom_templates')) || [];
      const newTemplate: PosterTemplate = {
        id: `custom_${Date.now()}`,
        name: headline || `My Design ${savedTemplates.length + 1}`,
        collection: 'creative',
        category: 'sale_offer',
        layout: 'bold_offer',
        theme: 'royal_gold',
        aspect: aspectRatio === '1:1' ? '1:1' : aspectRatio === '9:16' ? '9:16' : '4:5',
        badge: discountBadge || 'SPECIAL',
        headline: headline || 'Special Promotion',
        subtitle: subtitle || 'Exclusive offer for our customers',
        cta: ctaText || 'Contact Us',
        photo: bgPhotoUrl || customPosterUri || '',
        bgPrompt: activeUserPrompt || 'Custom template',
        industries: [],
      };
      const updated = [newTemplate, ...savedTemplates];
      await saveJson('bgos_custom_templates', updated);
      setSuccessNotice('Design saved to "⭐ My Templates"!');
      Alert.alert(
        'Template Saved!',
        'This design has been saved to "⭐ My Templates". You can now reuse or schedule it anytime from the template gallery.'
      );
    } catch {
      Alert.alert('Save Failed', 'Could not save template. Please retry.');
    } finally {
      setBusy(false);
    }
  }

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
    if (params.view === 'calendar') {
      setPostSubView('calendar');
    } else if (params.view === 'list') {
      setPostSubView('list');
    }
  }, [params.generate, params.mode, params.view]);

  // Social account resolution & publishing targets
  const availableAccounts = accounts.data?.data || [];
  const activeProfileId = discover.data?.activeProfile?.id;
  const savedGooglePublishingAccountId = (discover.data as any)?.savedPublishingAccountId || null;
  const [manualAccountIds, setManualAccountIds] = useState<string[] | null>(null);

  const selectedAccountIds = useMemo(
    () => selectedPublishingIds(availableAccounts, manualAccountIds ?? (savedGooglePublishingAccountId ? [savedGooglePublishingAccountId] : []), savedGooglePublishingAccountId),
    [availableAccounts, manualAccountIds, savedGooglePublishingAccountId]
  );

  const targets = useMemo(
    () => publishingTargets(availableAccounts, selectedAccountIds),
    [availableAccounts, selectedAccountIds]
  );

  const selectedPlatforms = useMemo(
    () => Array.from(new Set(targets.map((t) => t.platform))),
    [targets]
  );

  const togglePublishingAccount = useCallback((accountId: string) => {
    setManualAccountIds((prev) => {
      const current = prev !== null ? prev : selectedAccountIds;
      if (current.includes(accountId)) {
        return current.filter((id) => id !== accountId);
      }
      return [...current, accountId];
    });
  }, [selectedAccountIds]);

  const handleSelectAllAccounts = useCallback(() => {
    setManualAccountIds(availableAccounts.filter((a) => a.isActive).map((a) => a.id));
  }, [availableAccounts]);

  const handleClearAllAccounts = useCallback(() => {
    setManualAccountIds([]);
  }, []);

  const gbpAccount = useMemo(() => {
    return (
      availableAccounts.find(
        (a) =>
          a.platform === 'googlebusiness' &&
          a.isActive &&
          (savedGooglePublishingAccountId
            ? a.id === savedGooglePublishingAccountId
            : activeProfileId
            ? a.id === activeProfileId || a.accountId === activeProfileId
            : true)
      ) || availableAccounts.find((a) => a.platform === 'googlebusiness' && a.isActive)
    );
  }, [availableAccounts, savedGooglePublishingAccountId, activeProfileId]);

  const fbAccount = useMemo(
    () => availableAccounts.find((a) => a.platform === 'facebook' && a.isActive),
    [availableAccounts]
  );
  const igAccount = useMemo(
    () => availableAccounts.find((a) => a.platform === 'instagram' && a.isActive),
    [availableAccounts]
  );

  const [brandLogoUri, setBrandLogoUri] = useState<string | null>(null);
  const [brandTagline, setBrandTagline] = useState<string>('');
  const [brandWebsite, setBrandWebsite] = useState<string>('');
  const [brandPhone, setBrandPhone] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('');
  const [refreshingIdeas, setRefreshingIdeas] = useState<boolean>(false);

  function buildFooterText(brand: string, web: string, phone?: string, tag?: string) {
    const cleanWeb = (web || 'visit website').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const tagPart = tag && tag.trim() ? ` • ${tag.trim()}` : '';
    const phonePart = phone && phone.trim() ? ` • 📞 ${phone.trim()}` : '';
    return `${brand.trim()}${tagPart}\n🌐 ${cleanWeb}${phonePart}`;
  }

  const effectiveBusinessName = useMemo(() => {
    if (brandName && brandName.trim()) return brandName.trim();
    const activeName = discover.data?.activeProfile?.name || gbpAccount?.accountName;
    if (activeName && activeName.toLowerCase() !== 'google business profile' && !activeName.toLowerCase().includes('google business')) {
      return activeName;
    }
    if (gbpPlace.data?.place?.title && gbpPlace.data.place.title.toLowerCase() !== 'google business profile' && !gbpPlace.data.place.title.toLowerCase().includes('google business')) {
      return gbpPlace.data.place.title;
    }
    if (gbpPlace.data?.tenantFallback?.name && gbpPlace.data.tenantFallback.name.toLowerCase() !== 'business profile') {
      return gbpPlace.data.tenantFallback.name;
    }
    if (brandProfile.data?.profile?.businessName) return brandProfile.data.profile.businessName;
    if (workspace.data?.bookingPageConfig?.businessName) return workspace.data.bookingPageConfig.businessName;
    if (workspace.data?.name && workspace.data.name !== 'Commercial Brand') {
      return workspace.data.name;
    }
    return 'My Business';
  }, [brandName, discover.data?.activeProfile?.name, gbpAccount?.accountName, gbpPlace.data?.place?.title, gbpPlace.data?.tenantFallback?.name, brandProfile.data?.profile?.businessName, workspace.data?.bookingPageConfig?.businessName, workspace.data?.name]);
  const effectiveBusinessPhone = brandPhone || workspace.data?.bookingPageConfig?.phone || '';
  const rawSite =
    brandWebsite ||
    brandProfile.data?.profile?.website ||
    workspace.data?.links?.profile ||
    '';
  const effectiveBusinessWebsite =
    rawSite && !rawSite.includes('fieseros.com') && !rawSite.includes('serviceos.com')
      ? rawSite
      : '';
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

  const handleSharePreview = useCallback(async () => {
    try {
      const text = `${headline || effectiveHeadline}\n\n${caption || effectiveCaption}\n\n${bookingLink ? `Book online: ${bookingLink}` : ''}`;
      await Share.share({
        title: headline || effectiveHeadline,
        message: text,
      });
    } catch (err) {
      console.warn('Share preview error:', err);
    }
  }, [headline, effectiveHeadline, caption, effectiveCaption, bookingLink]);

  const userInitials = useMemo(() => {
    const raw =
      workspace.data?.name ||
      brandProfile.data?.profile?.businessName ||
      effectiveBusinessName ||
      'FO';
    const parts = raw.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [workspace.data?.name, brandProfile.data?.profile?.businessName, effectiveBusinessName]);

  const businessDisplayName =
    (effectiveBusinessName && effectiveBusinessName !== 'Commercial Brand' ? effectiveBusinessName : null) ||
    brandProfile.data?.profile?.businessName ||
    workspace.data?.name ||
    'My Business';

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
        const applyLogoToDoc = (logoUrl: string) => {
          setBrandLogoUri(logoUrl);
          if (customDesign) {
            const hasLogo = customDesign.layers.some((l) => l.id === 'brand_logo' || l.id === 'logo');
            if (hasLogo) {
              setCustomDesign({
                ...customDesign,
                layers: customDesign.layers.map((l) =>
                  l.id === 'brand_logo' || l.id === 'logo' ? { ...l, src: logoUrl, hidden: false } : l
                ),
              });
            } else {
              setCustomDesign({
                ...customDesign,
                layers: [
                  ...customDesign.layers,
                  {
                    id: 'brand_logo',
                    type: 'image' as const,
                    x: Math.round(customDesign.width - 110),
                    y: 35,
                    width: 60,
                    height: 60,
                    src: logoUrl,
                    color: '#ffffff',
                    background: 'transparent',
                    fontSize: 16,
                    opacity: 1,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                  },
                ],
              });
            }
          }
        };

        applyLogoToDoc(asset.uri);
        if (asset.base64) {
          const rawMime = asset.mimeType || 'image/png';
          const mime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
          apiRequest<{ url: string }>('/api/social/designs/assets', {
            method: 'POST',
            body: { data: `data:${mime};base64,${asset.base64}` },
          })
            .then((res) => {
              if (res?.url) {
                applyLogoToDoc(res.url);
              }
            })
            .catch(() => {
              applyLogoToDoc(`data:${mime};base64,${asset.base64}`);
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

  function applySelectedBgImage(url: string, assetId?: string) {
    setCustomPosterUri(url);
    setBgPhotoUrl(url);
    setCustomDesign((prev) => {
      const base = prev || design;
      return {
        ...base,
        layers: base.layers.map((l) =>
          l.id === 'bg_photo' ? { ...l, src: url, ...(assetId ? { assetId } : {}) } : l,
        ),
      };
    });
  }

  async function handleRegenerateImage(opts?: {
    promptOverride?: string;
    providerOverride?: ImageProviderChoice;
    openSheetInspector?: boolean;
  }) {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    setError(null);
    const epoch=++generationEpoch.current;
    try {
      const requestId = `mob-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const chosenProv = opts?.providerOverride ?? imageProvider;
      if (opts?.providerOverride) {
        setImageProvider(opts.providerOverride);
      }
      const effectiveProv: ImageProviderChoice =
        selectedRefUrls.length > 0 && isTextOnlyImageProvider(chosenProv) ? 'gemini' : chosenProv;
      const computedPrompt =
        opts?.promptOverride?.trim() ||
        backgroundBrief({
          template: activeTemplateId ? getTemplateById(activeTemplateId) : undefined,
          headline,
          instruction: promptInput,
          ratio: aspectRatio,
        });
      setLastBgGenPrompt(computedPrompt);
      const res = await apiRequest<{ jobId: string; status: string }>('/api/social/designs/image', {
        method: 'POST',
        retryTransient: 2,
        body: {
          prompt: computedPrompt,
          provider: effectiveProv,
          requestId,
          isPoster: true,
          aspectRatio,
          businessName: effectiveBusinessName,
          category: brandProfile.data?.profile?.industry || gbpPlace.data?.place?.category || '',
          products: brandProfile.data?.profile?.products || '',
          services: brandProfile.data?.profile?.services || '',
          website: effectiveBusinessWebsite,
          autoFromBusiness: false,
          referenceImageUrls: selectedRefUrls,
        },
      });

      if (res?.jobId) {
        const targetJobId = res.jobId;
        const pollStart = Date.now();
        let transientPollErrors = 0;
        let checking=false;
        const pollInterval = setInterval(async () => {
          if(checking)return;checking=true;
          try {
            if(epoch!==generationEpoch.current){clearInterval(pollInterval);return;}
            const check = await apiRequest<{ status: string; error?: string; result?: { url?: string; assetId?: string } }>(
              `/api/social/designs/image?id=${encodeURIComponent(targetJobId)}`
            );
            transientPollErrors = 0;
            if(epoch!==generationEpoch.current){clearInterval(pollInterval);return;}
            if (check?.status === 'completed' && check.result?.url) {
              clearInterval(pollInterval);
              setIsGeneratingImage(false);
              const generatedUrl = check.result.url;
              applySelectedBgImage(generatedUrl, check.result?.assetId);
              setBgImageCandidates((prev) =>
                appendImageCandidate(prev, {
                  url: generatedUrl,
                  prompt: computedPrompt,
                  provider: effectiveProv,
                  aspectRatio,
                }),
              );
              setBgApprovedUrl(null);
              if (opts?.openSheetInspector) {
                setInspectSheetBgFullscreen(true);
              }
              setSuccessNotice('✨ Fresh commercial photo background generated!');
              setTimeout(() => setSuccessNotice(null), 3500);
            } else if (check?.status === 'failed' || check?.status === 'cancelled' || check?.status === 'uncertain') {
              clearInterval(pollInterval);
              setIsGeneratingImage(false);
              const reason = check?.error || 'Image generation could not be completed.';
              setError(`${reason} You can retry with another provider or select a template photo.`);
            } else if (Date.now() - pollStart > 95000) {
              clearInterval(pollInterval);
              setIsGeneratingImage(false);
              setError('Image generation timed out after 95s. Your existing design is unchanged.');
            }
          } catch (pollErr: unknown) {
            const statusCode =
              typeof (pollErr as { statusCode?: unknown })?.statusCode === 'number'
                ? (pollErr as { statusCode: number }).statusCode
                : 0;
            if (isTransientGatewayStatus(statusCode) && transientPollErrors < 4 && Date.now() - pollStart < 95000) {
              transientPollErrors += 1;
              return;
            }
            clearInterval(pollInterval);
            setIsGeneratingImage(false);
            setError((pollErr as Error)?.message || 'Could not check image generation status. Please try again.');
          } finally { checking=false; }
        }, 2000);
      } else {
        setIsGeneratingImage(false);
      }
    } catch (err: unknown) {
      setIsGeneratingImage(false);
      const msg = (err as Error)?.message || '';
      if (/could not connect|fetch failed|network request failed|failed to connect/i.test(msg)) {
        setError('Could not connect to backend server. Check your connection and try again.');
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
        phone: brandPhone || effectiveBusinessPhone || undefined,
        website: brandWebsite || effectiveBusinessWebsite,
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

  function handleUpdateSubtitle(val: string) {
    setSubtitle(val);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) => (l.id === 'subtitle' ? { ...l, text: val } : l)),
      });
    }
  }

  function handleApplyLayout(layout: PosterTemplateLayout) {
    setPosterLayout(layout);
    if (customDesign) {
      const updated = createCommercialPosterDesign({
        brand: brandName || effectiveBusinessName,
        headline: headline || effectiveHeadline,
        subtitle,
        badge: discountBadge,
        cta: ctaText,
        phone: brandPhone || effectiveBusinessPhone || undefined,
        website: brandWebsite || effectiveBusinessWebsite,
        photo: customPosterUri || bgPhotoUrl || undefined,
        ratio: aspectRatio,
        theme: colorTheme,
        logoUrl: effectiveBusinessLogo || undefined,
        tagline: brandTagline || effectiveBusinessTagline || undefined,
        layout,
      });
      setCustomDesign(updated);
    }
  }

  function handleApplyTheme(theme: CommercialTheme) {
    setColorTheme(theme);
    if (customDesign) {
      const updated = createCommercialPosterDesign({
        brand: brandName || effectiveBusinessName,
        headline: headline || effectiveHeadline,
        subtitle,
        badge: discountBadge,
        cta: ctaText,
        phone: brandPhone || effectiveBusinessPhone || undefined,
        website: brandWebsite || effectiveBusinessWebsite,
        photo: customPosterUri || bgPhotoUrl || undefined,
        ratio: aspectRatio,
        theme,
        logoUrl: effectiveBusinessLogo || undefined,
        tagline: brandTagline || effectiveBusinessTagline || undefined,
        layout: posterLayout,
      });
      setCustomDesign(updated);
    }
  }

  function handleApplyAspect(ratio: '1:1' | '4:5' | '9:16') {
    setAspectRatio(ratio);
    if (customDesign) {
      const updated = createCommercialPosterDesign({
        brand: brandName || effectiveBusinessName,
        headline: headline || effectiveHeadline,
        subtitle,
        badge: discountBadge,
        cta: ctaText,
        phone: brandPhone || effectiveBusinessPhone || undefined,
        website: brandWebsite || effectiveBusinessWebsite,
        photo: customPosterUri || bgPhotoUrl || undefined,
        ratio,
        theme: colorTheme,
        logoUrl: effectiveBusinessLogo || undefined,
        tagline: brandTagline || effectiveBusinessTagline || undefined,
        layout: posterLayout,
      });
      setCustomDesign(updated);
    }
  }

  function handleApplyPhoto(photoUrl: string | null) {
    setCustomPosterUri(photoUrl);
    if (photoUrl) setBgPhotoUrl(photoUrl);
    if (customDesign) {
      const safePhoto = photoUrl || bgPhotoUrl || undefined;
      const updated = createCommercialPosterDesign({
        brand: brandName || effectiveBusinessName,
        headline: headline || effectiveHeadline,
        subtitle,
        badge: discountBadge,
        cta: ctaText,
        phone: brandPhone || effectiveBusinessPhone || undefined,
        website: brandWebsite || effectiveBusinessWebsite,
        photo: safePhoto,
        ratio: aspectRatio,
        theme: colorTheme,
        logoUrl: effectiveBusinessLogo || undefined,
        tagline: brandTagline || effectiveBusinessTagline || undefined,
        layout: posterLayout,
      });
      setCustomDesign(updated);
    }
  }

  function handleRemoveLogo() {
    setBrandLogoUri(null);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.filter((l) => l.id !== 'logo' && l.id !== 'brand_logo'),
      });
    }
  }

  function handleApplyBrandName(val: string) {
    setBrandName(val);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) => {
          if (l.id === 'brand') return { ...l, text: val.toUpperCase() };
          if (l.id === 'footer_brand' || l.id === 'footer') {
            return {
              ...l,
              text: buildFooterText(
                val,
                brandWebsite || effectiveBusinessWebsite,
                brandPhone || effectiveBusinessPhone,
                brandTagline || effectiveBusinessTagline
              ),
            };
          }
          return l;
        }),
      });
    }
  }

  function handleApplyBrandTagline(val: string) {
    setBrandTagline(val);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) => {
          if (l.id === 'tagline') return { ...l, text: val };
          if (l.id === 'footer_brand' || l.id === 'footer') {
            return {
              ...l,
              text: buildFooterText(
                brandName || effectiveBusinessName,
                brandWebsite || effectiveBusinessWebsite,
                brandPhone || effectiveBusinessPhone,
                val
              ),
            };
          }
          return l;
        }),
      });
    }
  }

  function handleApplyBrandWebsite(val: string) {
    setBrandWebsite(val);
    const cleanVal = val.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) => {
          if (l.id === 'footer_brand' || l.id === 'footer') {
            return {
              ...l,
              text: buildFooterText(
                brandName || effectiveBusinessName,
                val,
                brandPhone || effectiveBusinessPhone,
                brandTagline || effectiveBusinessTagline
              ),
            };
          }
          if (l.id === 'website') return { ...l, text: cleanVal };
          return l;
        }),
      });
    }
  }

  function handleApplyBrandPhone(val: string) {
    setBrandPhone(val);
    if (customDesign) {
      setCustomDesign({
        ...customDesign,
        layers: customDesign.layers.map((l) => {
          if (l.id === 'footer_brand' || l.id === 'footer') {
            return {
              ...l,
              text: buildFooterText(
                brandName || effectiveBusinessName,
                brandWebsite || effectiveBusinessWebsite,
                val,
                brandTagline || effectiveBusinessTagline
              ),
            };
          }
          return l;
        }),
      });
    }
  }

  const [designPast,setDesignPast]=useState<MarketingDesign[]>([]);
  const [designFuture,setDesignFuture]=useState<MarketingDesign[]>([]);
  const historyDocument=useRef<MarketingDesign|null>(null);
  const historyTravel=useRef(false);
  useEffect(()=>{
    if(JSON.stringify(historyDocument.current)===JSON.stringify(design))return;
    if(historyTravel.current)historyTravel.current=false;
    else if(historyDocument.current){const previous=historyDocument.current;setDesignPast(p=>[...p.slice(-49),previous]);setDesignFuture([]);}
    historyDocument.current=design;
  },[design]);
  function navigateHistory(direction:'undo'|'redo'){
    const target=direction==='undo'?designPast.at(-1):designFuture[0];if(!target)return;
    generationEpoch.current++;setBusy(false);setIsGeneratingImage(false);historyTravel.current=true;
    if(direction==='undo'){setDesignPast(p=>p.slice(0,-1));setDesignFuture(p=>[design,...p]);}
    else {setDesignPast(p=>[...p,design]);setDesignFuture(p=>p.slice(1));}
    handleCustomDesignChange(target);
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
    const br = updated.layers.find((l) => l.id === 'brand');
    if (br?.text && br.text !== brandName) setBrandName(br.text);
    const lg = updated.layers.find((l) => l.id === 'brand_logo' || l.id === 'logo');
    if (lg?.src && lg.src !== brandLogoUri) setBrandLogoUri(lg.src);
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
  const draftRequest = useRef(0);
  const [draftLoading,setDraftLoading] = useState(false);
  const [draftError,setDraftError] = useState('');
  async function loadDesignDrafts(page = 1) {
    const request = ++draftRequest.current;
    setDraftLoading(true);
    setDraftError('');
    if (page === 1) {setDesignDrafts([]);setMoreDrafts(false);setDraftPage(0);}
    try {
      const result = await apiRequest<{data:typeof designDrafts; pagination:{totalPages:number}}>(
        `/api/social/posts?status=draft&kind=poster&limit=20&page=${page}`);
      if (request !== draftRequest.current) return;
      setDesignDrafts(previous => page === 1 ? result.data : [...new Map([...previous,...result.data].map(row=>[row.id,row])).values()]);
      setDraftPage(page);
      setMoreDrafts(page < result.pagination.totalPages);
    } catch {
      if (request === draftRequest.current) setDraftError('Could not load your saved posters.');
    } finally {
      if (request === draftRequest.current) setDraftLoading(false);
    }
  }

  async function handlePickCustomPoster() {
    const epoch=++generationEpoch.current;
    try {
      const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,base64:true,quality:.85});
      if(picked.canceled)return;
      const asset=picked.assets[0];
      if(!asset?.base64)throw new Error('Could not read this image. Choose another photo.');
      if((asset.fileSize||0)>12_000_000)throw new Error('Choose an image smaller than 12 MB.');
      setBusy(true);
      const rawMime = (asset.mimeType || 'image/jpeg').toLowerCase();
      const mime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
      const uploaded=await apiRequest<{url:string;assetId:string}>('/api/social/designs/assets',{method:'POST',body:{data:`data:${mime};base64,${asset.base64}`}});
      if(epoch!==generationEpoch.current)return;
      if(!uploaded.url)throw new Error('Upload was not confirmed. Please retry.');
      handleCustomDesignChange({...design,layers:design.layers.map(l=>l.id==='bg_photo'?{...l,src:uploaded.url,assetId:uploaded.assetId}:l)});
      setCustomPosterUri(uploaded.url);setBgPhotoUrl(uploaded.url);

      // Auto-generate caption, headline and details from AI immediately upon upload
      try {
        const aiRes = await apiRequest<{ caption: string }>('/api/social/ai-caption', {
          method: 'POST',
          body: {
            topic: `${effectiveBusinessName} showcase: comfort, quality service & serene atmosphere`,
            platforms: ['googlebusiness', 'instagram', 'facebook'],
          },
        });
        if (aiRes?.caption && epoch === generationEpoch.current) {
          setCaption(aiRes.caption);
          const firstSentence = aiRes.caption.split('\n')[0]?.replace(/^[#*•\s]+/, '').slice(0, 65);
          if (firstSentence) {
            setHeadline(firstSentence);
            setAlternativeHeadlines([
              firstSentence,
              `Experience Comfort & Excellence at ${effectiveBusinessName}`,
              `Your Ideal Destination for Peace & Quality`,
            ]);
          }
        }
      } catch {}
    }catch(e){if(epoch===generationEpoch.current)setError(e instanceof Error?e.message:'Upload failed. Your design is unchanged.');}
    finally{if(epoch===generationEpoch.current)setBusy(false);}
  }

  // AI Generation Trigger
  async function generatePost(customTopic?: string) {
    const epoch=++generationEpoch.current;
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
      const shouldGenerateAiImage = generationMode === 'poster' || generationMode === 'image_only';
      const usedBrief = backgroundBrief({
        template: activeTemplateId ? getTemplateById(activeTemplateId) : undefined,
        headline,
        instruction: topicToUse,
        ratio: aspectRatio,
      });

      // 1. Generate campaign copy, headline, and alternative headlines with transient gateway retries
      const genPromise = apiRequest<{ design: MarketingDesign; caption: string; alternativeHeadlines?: string[] }>('/api/social/designs/generate', {
        method: 'POST',
        retryTransient: 2,
        body: { prompt: topicToUse, design, caption: caption || effectiveCaption, mode: generationMode },
      });

      // 2. For poster & image_only modes, trigger AI image generation asynchronously (with optional previous business photo references)
      let imagePromise: Promise<{ jobId: string; status: string } | null> = Promise.resolve(null);
      let imageInitError: unknown = null;
      if (shouldGenerateAiImage) {
        setIsGeneratingImage(true);
        const effectiveGenProvider: ImageProviderChoice =
          selectedRefUrls.length > 0 && isTextOnlyImageProvider(imageProvider) ? 'gemini' : imageProvider;
        imagePromise = apiRequest<{ jobId: string; status: string }>('/api/social/designs/image', {
          method: 'POST',
          retryTransient: 2,
          body: {
            prompt: usedBrief,
            provider: effectiveGenProvider,
            requestId,
            isPoster: generationMode === 'poster',
            aspectRatio,
            businessName: effectiveBusinessName,
            category: brandProfile.data?.profile?.industry || gbpPlace.data?.place?.category || '',
            products: brandProfile.data?.profile?.products || '',
            services: brandProfile.data?.profile?.services || '',
            website: effectiveBusinessWebsite,
            autoFromBusiness: false,
            referenceImageUrls: selectedRefUrls,
          },
        }).catch((err) => {
          imageInitError = err;
          return null;
        });
      }

      const [genOutcome, imageOutcome] = await Promise.allSettled([genPromise, imagePromise]);
      if(epoch!==generationEpoch.current)return;

      const imageInit = imageOutcome.status === 'fulfilled' ? imageOutcome.value : null;

      if (genOutcome.status === 'fulfilled' && genOutcome.value) {
        const data = genOutcome.value;
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
            ? 'Design and copy are ready. The background image may still be generating.'
            : generationMode === 'image_only'
            ? imageInit?.jobId
              ? 'Generating clean AI background image without text overlays...'
              : 'AI generated background image without text overlays!'
            : 'AI generated fresh design and copy directly to canvas!'
        );
        setTimeout(() => setSuccessNotice(null), 3500);
      } else {
        if (!imageInit?.jobId) {
          throw (genOutcome.status === 'rejected' ? genOutcome.reason : imageInitError) || new Error('AI generation failed.');
        }
        setError('Copy AI was temporarily busy, while your AI image continues generating below.');
      }

      // 3. Poll for AI image if job was queued
      if (imageInit?.jobId) {
        const targetJobId = imageInit.jobId;
        const pollStart = Date.now();
        let transientPollErrors = 0;
        let checking=false;
        const pollInterval = setInterval(async () => {
          if(checking)return;checking=true;
          if(epoch!==generationEpoch.current){clearInterval(pollInterval);return;}
          try {
            const check = await apiRequest<{ status: string; error?: string; result?: { url?: string;assetId?:string } }>(
              `/api/social/designs/image?id=${encodeURIComponent(targetJobId)}`
            );
            transientPollErrors = 0;
            if(epoch!==generationEpoch.current){clearInterval(pollInterval);return;}
            if (check?.status === 'completed' && check.result?.url) {
              clearInterval(pollInterval);
              setIsGeneratingImage(false);
              const generatedUrl = check.result.url;
              applySelectedBgImage(generatedUrl, check.result?.assetId);
              setLastBgGenPrompt(usedBrief);
              setBgImageCandidates((prev) =>
                appendImageCandidate(prev, {
                  url: generatedUrl,
                  prompt: usedBrief,
                  provider:
                    selectedRefUrls.length > 0 && isTextOnlyImageProvider(imageProvider)
                      ? 'gemini'
                      : imageProvider,
                  aspectRatio,
                }),
              );
              setSuccessNotice(
                generationMode === 'image_only'
                  ? '✨ Clean AI image generated without text overlays!'
                  : '✨ AI poster visual ready!',
              );
              setTimeout(() => setSuccessNotice(null), 3500);
            } else if (check?.status === 'failed' || check?.status === 'cancelled' || check?.status === 'uncertain' || Date.now() - pollStart > 95000) {
              clearInterval(pollInterval);
              setIsGeneratingImage(false);
              setError((check as { error?: string } | undefined)?.error || 'The image did not complete. Your editable design and copy are preserved.');
            }
          } catch (pollErr: unknown) {
            const statusCode =
              typeof (pollErr as { statusCode?: unknown })?.statusCode === 'number'
                ? (pollErr as { statusCode: number }).statusCode
                : 0;
            if (isTransientGatewayStatus(statusCode) && transientPollErrors < 4 && Date.now() - pollStart < 95000) {
              transientPollErrors += 1;
              return;
            }
            clearInterval(pollInterval);
            setIsGeneratingImage(false);
            setError((pollErr as Error)?.message || 'The image check failed. Your editable design and copy are preserved.');
          } finally { checking=false; }
        }, 2000);
      } else {
        setIsGeneratingImage(false);
      }
    } catch (err: unknown) {
      if(epoch!==generationEpoch.current)return;
      setIsGeneratingImage(false);
      const msg = (err as Error)?.message || '';
      if (/could not connect|fetch failed|network request failed|failed to connect/i.test(msg)) {
        setError('Could not connect to backend server. Check your connection and try again.');
      } else {
        setError(msg || 'AI generation failed. You can customize the fields manually below.');
      }
    } finally {
      if(epoch===generationEpoch.current)setBusy(false);
    }
  }

  // Publishing / Scheduling handler
  async function submitPost(status: 'published' | 'scheduled' | 'draft', autosave=false) {
    if (busy || saving.current) return;
    setError(null);
    if(!autosave)setAutosaveFailed(false);

    const scheduledAt = status === 'scheduled' && scheduleMode !== 'multi_day' ? futureLocalTime(scheduleDate, scheduleTime) : null;
    if (status === 'scheduled' && scheduleMode !== 'multi_day' && !scheduledAt) {
      setError('Please choose a valid future date and time to schedule.');
      return;
    }

    if (status === 'scheduled' && scheduleMode === 'multi_day') {
      saving.current = true;
      setBusy(true);
      try {
        const daysToSchedule = multiDayCount || 7;
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + 1);
        const resolvedPosterUrl = customPosterUri || bgPhotoUrl;
        const mediaList = resolvedPosterUrl ? [resolvedPosterUrl] : [];
        const postCaption = (caption || effectiveCaption).trim();

        for (let i = 0; i < daysToSchedule; i++) {
          const postDate = new Date(baseDate);
          postDate.setDate(postDate.getDate() + i);
          const [hours, mins] = (scheduleTime || '10:00').split(':').map(Number);
          postDate.setHours(hours || 10, mins || 0, 0, 0);

          await apiRequest('/api/social/posts', {
            method: 'POST',
            body: {
              content: `${postCaption}\n\n(Day ${i + 1} of ${daysToSchedule})`,
              platforms: selectedPlatforms,
              mediaUrls: mediaList,
              isPoster: true,
              isPreRendered: false,
              design: design,
              status: 'scheduled',
              scheduledAt: postDate.toISOString(),
            },
          });
        }
        setSuccessNotice(`${daysToSchedule}-day campaign scheduled successfully!`);
        Alert.alert(
          'Campaign Scheduled',
          `Successfully scheduled ${daysToSchedule} daily posts across your selected channels!`
        );
        setActiveMode('posts');
      } catch (err: any) {
        setError(err?.message || 'Failed to schedule multi-day campaign');
      } finally {
        saving.current = false;
        setBusy(false);
      }
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
    const contentCheck = validateSocialPost(postCaption, selectedPlatforms, mediaList, { isPoster: isPosterMode });
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
        redeemUrl: bookingLink || (effectiveBusinessWebsite ? (effectiveBusinessWebsite.startsWith('http') ? effectiveBusinessWebsite : `https://${effectiveBusinessWebsite}`) : ''),
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
      if(status === 'draft' && (!saved.data?.id||!saved.data.updatedAt))throw new Error('The server did not confirm the draft. Retry saving.');
      if(status === 'draft' && saved.data?.id){setEditingDesignId(saved.data.id);setDesignRevision(saved.data.updatedAt);savedDesignSnapshot.current=JSON.stringify({design,caption});}
      setAutosaveFailed(false);
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
      if(autosave)setAutosaveFailed(true);
      const msg = (err as Error)?.message || '';
      if (/could not connect|fetch failed|network request failed|failed to connect/i.test(msg)) {
        setError('Could not connect to backend server. Check your connection and try again.');
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
    if(!editingDesignId||busy||autosaveFailed||savedDesignSnapshot.current===designSnapshot)return;
    const timer=setTimeout(()=>{void submitPost('draft',true);},1500);
    return ()=>clearTimeout(timer);
  },[designSnapshot,editingDesignId,busy,autosaveFailed]);

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

  async function handleUseMyPhoto() { await handlePickCustomPoster(); }

  const savedDraftsContent = (<>
            {draftLoading && designDrafts.length === 0 ? <ActivityIndicator accessibilityLabel="Loading saved drafts" /> : draftError && designDrafts.length === 0 ? <ErrorNotice message={draftError} retry={()=>void loadDesignDrafts()}/> : designDrafts.length === 0 ? (
              <View style={styles.emptyDraftsWrap}>
                <MaterialIcons name="folder-open" size={40} color="#CBD5E1" />
                <Text style={styles.emptyDraftsTitle}>No saved drafts yet</Text>
                <Text style={styles.emptyDraftsSub}>Designs you save in Studio will appear here for easy editing.</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
                {designDrafts.map((draft) => {
                  let preview: MarketingDesign | null = null;
                  try { preview = validateDesign(JSON.parse(draft.designJson)); } catch { /* Invalid drafts remain visible for recovery. */ }
                  const open = () => {
                    try {
                      const restored = validateDesign(JSON.parse(draft.designJson));
                      generationEpoch.current++;
                      setIsGeneratingImage(false);
                      setBusy(false);
                      historyTravel.current = true;
                      setDesignPast([]);
                      setDesignFuture([]);
                      handleCustomDesignChange(restored);
                      setCaption(draft.content);
                      setEditingDesignId(draft.id);
                      setDesignRevision(draft.updatedAt);
                      savedDesignSnapshot.current = JSON.stringify({ design: restored, caption: draft.content });
                      setAutosaveFailed(false);
                      setActiveTemplateId(null);
                      setHasGenerated(true);
                      setStudioStep(2);
                      setDraftPickerOpen(false);
                    } catch {
                      setError('This draft could not be opened.');
                    }
                  };

                  return (
                    <Pressable
                      key={draft.id}
                      onPress={() => {
                        if (savedDesignSnapshot.current !== designSnapshot) {
                          Alert.alert(
                            'Open saved design?',
                            'Unsaved changes in this canvas will be replaced.',
                            [
                              { text: 'Keep editing', style: 'cancel' },
                              { text: 'Open draft', onPress: open },
                            ]
                          );
                        } else {
                          open();
                        }
                      }}
                      style={styles.draftItemCard}
                    >
                      <View style={styles.draftIconBox}>
                        {preview ? <PosterPreview doc={preview}/> : <MaterialIcons name="description" size={20} color="#009F50" />}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={1} style={styles.draftItemTitle}>
                          {draft.content?.slice(0, 60) || 'Untitled Design'}
                        </Text>
                        <Text style={styles.draftItemDate}>
                          Updated {new Date(draft.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
                    </Pressable>
                  );
                })}
                {draftError ? <ErrorNotice message={draftError} retry={()=>void loadDesignDrafts(draftPage+1)}/> :
                  moreDrafts && <Action label={draftLoading?'Loading…':'Load more drafts'} secondary disabled={draftLoading} onPress={()=>void loadDesignDrafts(draftPage+1)}/>}
              </ScrollView>
            )}
  </>);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Math.max(insets.top, 12) }}>
      {/* ── Single-Row Top Header Bar matching Benchmark Screenshot 1 ─────────────────── */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 10,
          minHeight: 54,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: '#EEF2F6',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {brandProfile.data?.brandDetails?.logoUrl || brandProfile.data?.logo ? (
            <Image
              source={{ uri: brandProfile.data?.brandDetails?.logoUrl || brandProfile.data?.logo || '' }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#F1F5F9',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#E0F2FE',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#BAE6FD',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0369A1' }}>
                {(effectiveBusinessName || 'B').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 }}>
              Posts
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '600', color: '#2563EB', maxWidth: 160 }}>
                {effectiveBusinessName && !effectiveBusinessName.toLowerCase().includes('fieseros')
                  ? effectiveBusinessName
                  : 'My Business'}
              </Text>
              <MaterialIcons name="expand-more" size={16} color="#2563EB" />
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Alert.alert(
              'Posts & Updates Help',
              'BGOS automatically crafts SEO-optimized Google Business Profile posts to boost your local search ranking and Maps visibility.\n\nTap "Create Post with AI" to generate a tailored post with reference photos in seconds.',
            );
          }}
          style={{
            backgroundColor: '#009F50',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>Help</Text>
        </Pressable>
      </View>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
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
          <ErrorNotice message={apError} retry={loadAutopilot}/>
          {!apReady ? <View style={{padding:24}}>{apLoading && <ActivityIndicator/>}<Text style={{textAlign:'center',marginTop:12}}>Load your settings to manage Autopilot.</Text></View> : <>
          {/* Hero Banner with Dynamic Progress */}
          <View style={styles.apHeroCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: apConfig.enabled ? '#DCFCE7' : '#FEF3C7',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: apConfig.enabled ? '#86EFAC' : '#FDE68A',
                }}
              >
                <MaterialIcons
                  name="bolt"
                  size={14}
                  color={apConfig.enabled ? '#15803D' : '#B45309'}
                />
                <Text
                  style={{
                    color: apConfig.enabled ? '#15803D' : '#B45309',
                    fontSize: 11,
                    fontWeight: '800',
                  }}
                >
                  {apConfig.enabled ? 'Autopilot enabled' : apConfig.daysRemaining===0 ? 'Campaign completed' : 'Autopilot paused'}
                </Text>
              </View>
              <Text style={{ color: '#64748B', fontSize: 11.5, fontWeight: '700' }}>
                {apConfig.daysRemaining} days remaining
              </Text>
            </View>

            <Text style={{ color: '#0F172A', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
              Daily Localized Social Media Autopilot
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18 }}>
              Automated daily publishing for Google Business, Instagram, and Facebook. High-converting branded flyers and captions created specifically for {effectiveBusinessName}.
            </Text>

            {/* Campaign Progress Bar */}
            <View style={{ gap: 4, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Campaign Progress</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#009F50' }}>
                  {apConfig.totalPostsCreated} posts published
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(6, (apConfig.totalPostsCreated / (apConfig.totalPostsCreated + apConfig.daysRemaining || 30)) * 100))}%`,
                    backgroundColor: '#009F50',
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => saveAutopilot({ enabled: !apConfig.enabled })}
                style={{
                  flex: 1,
                  backgroundColor: apConfig.enabled ? '#D97706' : '#009F50',
                  paddingVertical: 11,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
              >
                <MaterialIcons name={apConfig.enabled ? 'pause' : 'play-arrow'} size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>
                  {apConfig.enabled ? 'Pause Autopilot' : 'Activate Daily Autopilot'}
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  try {
                    setApTriggering(true);
                    Alert.alert('Generating Post', "Dispatching today's post across your connected channels...");
                    await saveAutopilot({ triggerPostNow: true });
                  } finally {
                    setApTriggering(false);
                  }
                }}
                disabled={apTriggering || apLoading}
                style={{
                  backgroundColor: '#0F172A',
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {apTriggering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="auto-awesome" size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Post Today</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Preferred Daily Posting Time (Interactive Trigger) */}
          <Pressable
            onPress={() => setTimePickerOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 14,
              shadowColor: '#000',
              shadowOpacity: 0.03,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="schedule" size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0F172A' }}>Preferred Posting Time</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>Daily slot for auto-publishing</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#DCFCE7' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#009F50' }}>{apConfig.postingTime}</Text>
              <MaterialIcons name="edit" size={14} color="#009F50" />
            </View>
          </Pressable>

          {/* Duration Selector */}
          <Card style={{ marginBottom: 14, gap: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Campaign Duration</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable
                onPress={() => saveAutopilot({ duration: '7_days' })}
                style={{
                  flexBasis: '48%',
                  flexGrow: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: apConfig.duration === '7_days' ? '#009F50' : '#E2E8F0',
                  backgroundColor: apConfig.duration === '7_days' ? '#F0FDF4' : '#FFFFFF',
                  gap: 3,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>7 Days</Text>
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#009F50', backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>SPRINT</Text>
                </View>
                <Text style={{ fontSize: 10.5, color: '#64748B' }}>1 post daily for 7 days (trial friendly)</Text>
              </Pressable>

              <Pressable
                onPress={() => saveAutopilot({ duration: '30_days' })}
                style={{
                  flexBasis: '48%',
                  flexGrow: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: apConfig.duration === '30_days' ? '#009F50' : '#E2E8F0',
                  backgroundColor: apConfig.duration === '30_days' ? '#F0FDF4' : '#FFFFFF',
                  gap: 3,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>30 Days</Text>
                <Text style={{ fontSize: 10.5, color: '#64748B' }}>1 post daily for 1 month (30 posts)</Text>
              </Pressable>

              <Pressable
                onPress={() => saveAutopilot({ duration: '1_year' })}
                style={{
                  flexBasis: '48%',
                  flexGrow: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: apConfig.duration === '1_year' ? '#009F50' : '#E2E8F0',
                  backgroundColor: apConfig.duration === '1_year' ? '#F0FDF4' : '#FFFFFF',
                  gap: 3,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>1 Full Year</Text>
                <Text style={{ fontSize: 10.5, color: '#64748B' }}>365 daily posts with theme rotation</Text>
              </Pressable>

              <Pressable
                onPress={() => saveAutopilot({ duration: 'custom', customDays: 14 })}
                style={{
                  flexBasis: '48%',
                  flexGrow: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: apConfig.duration === 'custom' ? '#009F50' : '#E2E8F0',
                  backgroundColor: apConfig.duration === 'custom' ? '#F0FDF4' : '#FFFFFF',
                  gap: 3,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>Custom Range</Text>
                <Text style={{ fontSize: 10.5, color: '#64748B' }}>Custom campaign date window</Text>
              </Pressable>
            </View>
          </Card>

          {/* Content Source Selector */}
          <Card style={{ marginBottom: 14, gap: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Post content</Text>
            <Action secondary label="Choose saved posters" onPress={()=>void loadApTemplates()}/>
            {apTemplates.map(poster=><Pressable key={poster.id} disabled={apLoading} accessibilityRole="checkbox" accessibilityState={{checked:(apConfig.templateIds || []).includes(poster.id)}} onPress={()=>void saveAutopilot({templateIds:(apConfig.templateIds || []).includes(poster.id)?(apConfig.templateIds || []).filter(id=>id!==poster.id):[...(apConfig.templateIds || []),poster.id]})} style={{flexDirection:'row',gap:8,minHeight:44,alignItems:'center'}}><MaterialIcons size={22} color="#009F50" name={(apConfig.templateIds || []).includes(poster.id)?'check-box':'check-box-outline-blank'}/><Text style={{flex:1}} numberOfLines={2}>{poster.content || 'Untitled poster'}</Text></Pressable>)}
            {apMoreTemplates && <Action secondary label="More saved posters" onPress={()=>void loadApTemplates(apTemplatePage+1)}/>}
            {apTemplatePage>0 && !apTemplates.length && <Text>Save a poster draft in Create to use it here.</Text>}
            <View style={{ gap: 8 }}>
              {[
                { id: 'ai_generated', title: 'AI designs', desc: 'Generates a daily image and caption for your business' },
                { id: 'my_templates', title: 'Saved posters', desc: 'Publishes selected saved posters and their captions unchanged' },
                { id: 'hybrid', title: 'Mix AI and saved posters', desc: 'Alternates AI designs with your selected saved posters' },
              ].map((src) => {
                const isSelected = (apConfig.contentSource || 'ai_generated') === src.id;
                return (
                  <Pressable
                    key={src.id}
                    onPress={() => {
                      if (src.id !== 'ai_generated' && !(apConfig.templateIds || []).length) {
                        void loadApTemplates();
                        setDraftPickerOpen(true);
                      }
                      saveAutopilot({ contentSource: src.id as any });
                    }}
                    style={{
                      padding: 11,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#009F50' : '#E2E8F0',
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: isSelected ? '#009F50' : '#0F172A' }}>
                        {src.title}
                      </Text>
                      <MaterialIcons
                        name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={18}
                        color={isSelected ? '#009F50' : '#94A3B8'}
                      />
                    </View>
                    <Text style={{ fontSize: 10.5, color: '#64748B', marginTop: 3 }}>{src.desc}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card><Text style={{fontWeight:'700'}}>Publishing accounts</Text>
            <Text>Choose exactly where your daily posts will appear.</Text>
            {apAccounts.filter(a=>['googlebusiness','facebook','instagram','linkedin','pinterest','threads'].includes(a.platform)).map(account=>{
              const selected=(apConfig.accountIds || []).includes(account.id);
              return <Pressable key={account.id} disabled={apLoading} accessibilityRole="checkbox" accessibilityState={{checked:selected}} onPress={()=>{
                const ids=selected?(apConfig.accountIds || []).filter(id=>id!==account.id):[...(apConfig.accountIds || []),account.id];
                void saveAutopilot({accountIds:ids,platforms:[...new Set(apAccounts.filter(a=>ids.includes(a.id)).map(a=>a.platform))].length ? [...new Set(apAccounts.filter(a=>ids.includes(a.id)).map(a=>a.platform))] : apConfig.platforms});
              }} style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:48}}><MaterialIcons name={selected?'check-box':'check-box-outline-blank'} size={24} color="#009F50"/><View><Text>{account.accountName}</Text><Text style={{color:'#64748B'}}>{account.platform}</Text></View></Pressable>;
            })}
            {!apAccounts.length && <Text>Connect a publishing account in Integrations first.</Text>}
          </Card>

          <Card><Text style={{fontWeight:'700'}}>Recent activity</Text>
            {!apRecent.length && <Text>No Autopilot posts yet.</Text>}
            {apRecent.map(post=><View key={post.id} style={{gap:6,paddingVertical:10}}><Text numberOfLines={2}>{post.content || 'Generating design'}</Text><Text style={{fontWeight:'700'}}>{post.status}</Text>{post.failureReason && <Text style={{color:'#B42318'}}>{post.failureReason}</Text>}{(()=>{try{return JSON.parse(post.publishTargets || '[]').map((t:any)=><Text key={t.socialAccountId}>{apAccounts.find(a=>a.id===t.socialAccountId)?.accountName || t.platform} · {t.status}{t.error ? ` · ${t.error}` : ''}</Text>);}catch{return null;}})()}</View>)}
            <Action secondary label="Refresh activity" onPress={loadAutopilot}/>
          </Card>
          {/* Progress Summary */}
          <Card style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Schedule</Text><Text>Next eligible run · {apNextRun ? new Date(apNextRun).toLocaleString() : 'Not scheduled'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Total Posts Created</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>{apConfig.totalPostsCreated} posts</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: '#64748B' }}>Preferred Daily Time</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#009F50' }}>{apConfig.postingTime} · {apConfig.timeZone}</Text>
            </View>
            {apConfig.lastError ? (
              <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#991B1B' }}>Last Autopilot Notice</Text>
                <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 2 }}>{apConfig.lastError}</Text>
              </View>
            ) : null}
          </Card>
          </>}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODE 2: POSTS & CALENDAR (List View vs Interactive Calendar View)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'posts' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 90 }}>
          {/* Benchmark: Upcoming Posts Carousel (Screenshot 1) */}
          <UpcomingPostsCarousel
            businessName={effectiveBusinessName}
            businessCategory={brandProfile.data?.profile?.industry || gbpPlace.data?.place?.category}
            defaultWebsiteUrl={
              brandProfile.data?.profile?.website ||
              gbpPlace.data?.place?.website ||
              ''
            }
            onCreateWithAi={() => setCreatePostModalOpen(true)}
            onViewPost={(post) => {
              setActiveReviewPost({
                id: post.id,
                title: post.headline,
                headline: post.headline,
                caption: post.caption,
                imageUrl: post.imageUrl,
                postType: (post.type as any) || 'Standard Post',
                ctaAction: post.ctaAction || 'CALL',
                ctaUrl: post.ctaUrl,
                scheduledTime: post.scheduledTime,
              });
              setReviewPostModalOpen(true);
            }}
            onPostPublished={() => setBoardRefresh((k) => k + 1)}
          />

          {/* Connected Social Accounts Header */}
          <StayActiveSocialMediaCard />

          {/* Segmented Switcher: Posts List vs Content Calendar */}
          <View style={styles.postViewSwitcher}>
            <Pressable
              onPress={() => setPostSubView('list')}
              style={[styles.postViewBtn, postSubView === 'list' && styles.postViewBtnActive]}
            >
              <MaterialIcons
                name="view-list"
                size={16}
                color={postSubView === 'list' ? '#009F50' : '#64748B'}
              />
              <Text style={[styles.postViewBtnText, postSubView === 'list' && styles.postViewBtnTextActive]}>
                Posts & Approvals
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setPostSubView('calendar')}
              style={[styles.postViewBtn, postSubView === 'calendar' && styles.postViewBtnActive]}
            >
              <MaterialIcons
                name="calendar-month"
                size={16}
                color={postSubView === 'calendar' ? '#009F50' : '#64748B'}
              />
              <Text style={[styles.postViewBtnText, postSubView === 'calendar' && styles.postViewBtnTextActive]}>
                Content Calendar
              </Text>
            </Pressable>
          </View>

          {postSubView === 'list' ? (
            <>
              {/* Quick Header with Posting Time Preference */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Posts & Approvals</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change daily posting time"
                    onPress={() => setTimePickerOpen(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
                  >
                    <MaterialIcons name="schedule" size={13} color="#64748B" />
                    <Text style={{ fontSize: 12, color: '#64748B' }}>
                      Daily posting time: <Text style={{ color: '#2563EB', fontWeight: '700' }}>{apConfig.postingTime || '10:00 AM'}</Text> (Change)
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create New Post"
                  onPress={() => setCreatePostModalOpen(true)}
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

              {/* Shared Modern Posts Board */}
              <PostsBoard
                refreshKey={boardRefresh}
                initialPill={resolvedInitialPill}
                focusedPostId={focusedPostId}
                onClearFocusedPost={() => setFocusedPostId(null)}
                onNeedCompose={() => setCreatePostModalOpen(true)}
              />
            </>
          ) : (
            /* Interactive Dynamic Social Calendar */
            <SocialCalendarView
              refreshTrigger={boardRefresh}
              onScheduleForDate={() => {
                setCreatePostModalOpen(true);
              }}
            />
          )}
        </ScrollView>
      )}

      {/* ── Time Picker Modal ── */}
      <Modal visible={timePickerOpen} animationType="slide" transparent onRequestClose={() => setTimePickerOpen(false)}>
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalContent}>
            <View style={styles.timeModalHeader}>
              <Text style={styles.timeModalTitle}>Select Daily Posting Time</Text>
              <Pressable onPress={() => setTimePickerOpen(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={18} color="#0F172A" />
              </Pressable>
            </View>
            <Text style={styles.timeModalSub}>Choose the time when your local audience is most active:</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {TIME_SLOTS.map((slot) => {
                const isSelected = apConfig.postingTime === slot.value;
                return (
                  <Pressable
                    key={slot.value}
                    onPress={() => {
                      setTimePickerOpen(false);
                      saveAutopilot({ postingTime: slot.value });
                    }}
                    style={[
                      styles.timeSlotRow,
                      isSelected && styles.timeSlotRowSelected,
                    ]}
                  >
                    <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextSelected]}>
                      {slot.label}
                    </Text>
                    {isSelected && <MaterialIcons name="check" size={18} color="#009F50" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Redesigned Saved Drafts Picker Modal ── */}
      <Modal visible={draftPickerOpen} animationType="slide" transparent onRequestClose={() => setDraftPickerOpen(false)}>
        <View style={styles.draftModalOverlay}>
          <View style={styles.draftModalContent}>
            <View style={styles.draftModalHeader}>
              <View>
                <Text style={styles.draftModalTitle}>Saved Poster Drafts</Text>
                <Text style={styles.draftModalSub}>Workspace posters · Recently edited</Text>
              </View>
              <Pressable onPress={() => setDraftPickerOpen(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={20} color="#0F172A" />
              </Pressable>
            </View>

            {savedDraftsContent}
          </View>
        </View>
      </Modal>
      <Modal visible={templatePickerOpen} animationType="slide" onRequestClose={() => setTemplatePickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Choose a Poster Template</Text>
            <Pressable
              onPress={() => setTemplatePickerOpen(false)}
              hitSlop={10}
              style={styles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialIcons name="close" size={20} color="#0F172A" />
            </Pressable>
          </View>
          <PosterTemplateGallery
            business={{
              businessName: effectiveBusinessName,
              category: brandProfile.data?.profile?.industry,
              phone: effectiveBusinessPhone,
              website: effectiveBusinessWebsite,
              logoUri: effectiveBusinessLogo,
              tagline: effectiveBusinessTagline,
            }}
            onApply={(t) => {
              applyPosterTemplate(t);
              setTemplatePickerOpen(false);
            }}
            onDescribeIdea={() => {
              setTemplatePickerOpen(false);
              setStudioStep(1);
              setStudioCreateTab('ideas');
              setHasGenerated(false);
            }}
          />
        </View>
      </Modal>
      {activeMode === 'studio' && (
        <View style={{ flex: 1 }}>
          {/* Sub-Tab Navigation Header for Step 1 (when design exists), Step 2 (Editor) & Step 3 (Review) */}
          {(studioStep > 1 || hasGenerated || Boolean(customPosterUri) || Boolean(customDesign) || Boolean(activeTemplateId)) && (
            <View style={styles.subTabBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Pressable
                  onPress={() => {
                    if (studioStep === 3) {
                      setStudioStep(2);
                    } else if (studioStep === 2) {
                      if (activeTemplateId || studioCreateTab === 'templates' || studioCreateTab === 'search') {
                        setStudioStep(1);
                        setStudioCreateTab('templates');
                        setCustomDesign(null);
                        setHasGenerated(false);
                        setCustomPosterUri(null);
                        setActiveTemplateId(null);
                      } else {
                        setStudioStep(1);
                        setStudioSubTab('chat');
                      }
                    } else if (studioStep === 1) {
                      setHasGenerated(false);
                      setCustomPosterUri(null);
                      setCustomDesign(null);
                      setActiveTemplateId(null);
                      setActiveUserPrompt('');
                    }
                  }}
                  style={{ padding: 6, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                >
                  <MaterialIcons name="arrow-back" size={18} color="#0F172A" />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.studioHeaderTitle}>
                    {studioStep === 3 ? 'Review & Schedule' : studioStep === 2 ? (headline || 'Design Editor') : (headline || 'Campaign Studio')}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: '#009F50' }}>
                    {effectiveBusinessName}
                  </Text>
                </View>
              </View>

              {/* Chat vs Design toggle - visible whenever design exists in step 1 or 2 */}
              {studioStep <= 2 && (hasGenerated || Boolean(customPosterUri) || Boolean(customDesign) || Boolean(activeTemplateId)) && (
                <View style={styles.segmentedToggle}>
                  <Pressable
                    onPress={() => {
                      setStudioStep(1);
                      setStudioSubTab('chat');
                    }}
                    style={[styles.segBtn, (studioStep === 1 || studioSubTab === 'chat') && styles.segBtnActive]}
                  >
                    <MaterialIcons
                      name="chat-bubble-outline"
                      size={14}
                      color={(studioStep === 1 || studioSubTab === 'chat') ? '#009F50' : '#64748B'}
                    />
                    <Text style={[styles.segBtnText, (studioStep === 1 || studioSubTab === 'chat') && styles.segBtnTextActive]}>
                      Chat
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setStudioStep(2);
                      setStudioSubTab('design');
                    }}
                    style={[styles.segBtn, (studioStep === 2 && studioSubTab === 'design') && styles.segBtnActive]}
                  >
                    <MaterialIcons
                      name="image"
                      size={14}
                      color={(studioStep === 2 && studioSubTab === 'design') ? '#009F50' : '#64748B'}
                    />
                    <Text style={[styles.segBtnText, (studioStep === 2 && studioSubTab === 'design') && styles.segBtnTextActive]}>
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
          )}

          {/* ──────────────────────────────────────────────────────────────────
              STEP 1: 01 · Create (Conversational Copilot & Layouts)
              ────────────────────────────────────────────────────────────────── */}
          {studioStep === 1 && (
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
              {!hasGenerated ? (
                /* ── Flyer-Maker-style entry: Templates / AI Ideas ── */
                <View style={{ flex: 1 }}>
                    <View style={styles.createSegmentWrap}>
                      <Pressable
                        onPress={() => setStudioCreateTab('templates')}
                        style={[styles.createSegmentBtn, studioCreateTab === 'templates' && styles.createSegmentBtnActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: studioCreateTab === 'templates' }}
                        accessibilityLabel="Templates"
                      >
                        <MaterialIcons
                          name="grid-view"
                          size={15}
                          style={{ flexShrink: 0 }}
                          color={studioCreateTab === 'templates' ? '#FFFFFF' : '#64748B'}
                        />
                        <Text
                          numberOfLines={1}
                          style={[styles.createSegmentText, studioCreateTab === 'templates' && styles.createSegmentTextActive]}
                        >
                          Templates
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setStudioCreateTab('ideas')}
                        style={[styles.createSegmentBtn, studioCreateTab === 'ideas' && styles.createSegmentBtnActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: studioCreateTab === 'ideas' }}
                        accessibilityLabel="AI Posts"
                      >
                        <MaterialIcons
                          name="auto-awesome"
                          size={15}
                          style={{ flexShrink: 0 }}
                          color={studioCreateTab === 'ideas' ? '#FFFFFF' : '#64748B'}
                        />
                        <Text
                          numberOfLines={1}
                          style={[styles.createSegmentText, studioCreateTab === 'ideas' && styles.createSegmentTextActive]}
                        >
                          AI Posts
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setStudioCreateTab('search')}
                        style={[styles.createSegmentBtn, studioCreateTab === 'search' && styles.createSegmentBtnActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: studioCreateTab === 'search' }}
                        accessibilityLabel="Search templates"
                      >
                        <MaterialIcons
                          name="search"
                          size={15}
                          style={{ flexShrink: 0 }}
                          color={studioCreateTab === 'search' ? '#FFFFFF' : '#64748B'}
                        />
                        <Text
                          numberOfLines={1}
                          style={[styles.createSegmentText, studioCreateTab === 'search' && styles.createSegmentTextActive]}
                        >
                          Search
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setStudioCreateTab('drafts');
                          void loadDesignDrafts();
                        }}
                        style={[styles.createSegmentBtn, studioCreateTab === 'drafts' && styles.createSegmentBtnActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: studioCreateTab === 'drafts' }}
                        accessibilityLabel="Saved folders"
                      >
                        <MaterialIcons
                          name="folder-open"
                          size={15}
                          style={{ flexShrink: 0 }}
                          color={studioCreateTab === 'drafts' ? '#FFFFFF' : '#64748B'}
                        />
                        <Text
                          numberOfLines={1}
                          style={[styles.createSegmentText, studioCreateTab === 'drafts' && styles.createSegmentTextActive]}
                        >
                          Folders
                        </Text>
                      </Pressable>
                    </View>

                    {studioCreateTab === 'search' && (
                      <View style={styles.searchExpandedWrap}>
                        <MaterialIcons name="search" size={18} color="#009F50" />
                        <TextInput
                          accessibilityLabel="Search templates"
                          autoFocus
                          autoCapitalize="none"
                          placeholder="Search by topic, service or style..."
                          placeholderTextColor="#94A3B8"
                          value={templateSearch}
                          onChangeText={setTemplateSearch}
                          style={styles.searchExpandedInput}
                        />
                        {templateSearch.length > 0 && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                            onPress={() => setTemplateSearch('')}
                            style={styles.searchExpandedCloseBtn}
                          >
                            <MaterialIcons name="close" size={16} color="#64748B" />
                          </Pressable>
                        )}
                      </View>
                    )}

                    {studioCreateTab === 'drafts' ? (
                      <View style={{ flex: 1, padding: 14 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#0F172A' }}>Saved Drafts & Folders</Text>
                        {savedDraftsContent}
                      </View>
                    ) : studioCreateTab === 'templates' || studioCreateTab === 'search' ? (
                      <View style={{ flex: 1 }}>
                        <PosterTemplateGallery
                          searchQuery={studioCreateTab === 'search' ? templateSearch : ''}
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
                      /* ── Compact Branded AI Posts Feed ── */
                      <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 12, paddingBottom: 100, gap: 10 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                      >
                        {/* Compact Single-Row Title + Refresh Header */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 2,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                            <MaterialIcons name="auto-awesome" size={16} color="#009F50" />
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
                              AI Posts
                            </Text>
                            {filteredAiPosts.length > 0 && (
                              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#166534' }}>
                                  {activeAiPostIndex + 1} / {filteredAiPosts.length}
                                </Text>
                              </View>
                            )}
                          </View>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Refresh AI posts"
                            onPress={() => void handleRefreshAiPosts()}
                            disabled={isRefreshingAiPosts}
                            hitSlop={8}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: isRefreshingAiPosts ? '#F1F5F9' : '#0F172A',
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 16,
                            }}
                          >
                            {isRefreshingAiPosts ? (
                              <ActivityIndicator size={12} color="#009F50" />
                            ) : (
                              <MaterialIcons name="refresh" size={13} color="#FFFFFF" />
                            )}
                            <Text style={{ fontSize: 11, fontWeight: '700', color: isRefreshingAiPosts ? '#475569' : '#FFFFFF' }}>
                              {isRefreshingAiPosts ? 'Updating…' : 'New Ideas'}
                            </Text>
                          </Pressable>
                        </View>

                        {/* Sleek 1-Line Business Branding Bar */}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            borderRadius: 12,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            gap: 8,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            {effectiveBusinessLogo ? (
                              <Image
                                source={{ uri: effectiveBusinessLogo }}
                                style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' }}
                                resizeMode="contain"
                              />
                            ) : (
                              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#009F50', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>{userInitials}</Text>
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text numberOfLines={1} style={{ fontSize: 11.5, fontWeight: '800', color: '#0F172A' }}>
                                {effectiveBusinessName}
                              </Text>
                              {effectiveBusinessPhone ? (
                                <Text numberOfLines={1} style={{ fontSize: 10, color: '#64748B' }}>
                                  {effectiveBusinessPhone}
                                </Text>
                              ) : null}
                            </View>
                          </View>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Manage business branding"
                            onPress={() => router.push('/logo-management' as any)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 3,
                              backgroundColor: '#FFFFFF',
                              borderWidth: 1,
                              borderColor: '#CBD5E1',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 10,
                            }}
                          >
                            <MaterialIcons name="palette" size={12} color="#009F50" />
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0F172A' }}>Branding</Text>
                          </Pressable>
                        </View>

                        {/* Category Filter Pills */}
                        {localAiPosts.length > 0 && (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 4, gap: 8 }}
                          >
                            {[
                              { key: 'ALL', label: `All Posts (${localAiPosts.length})`, icon: 'auto-awesome' },
                              { key: 'OFFER', label: '🏷️ Deals & Offers', icon: 'local-offer' },
                              { key: 'STANDARD', label: '⭐ Quality & Trust', icon: 'verified' },
                              { key: 'EVENT', label: '🎉 Seasonal & Events', icon: 'event' },
                            ].map((filter) => {
                              const isActive = aiPostCategoryFilter === filter.key;
                              return (
                                <Pressable
                                  key={filter.key}
                                  onPress={() => {
                                    setAiPostCategoryFilter(filter.key as any);
                                    setActiveAiPostIndex(0);
                                    aiPostSliderRef.current?.scrollTo({ x: 0, animated: true });
                                  }}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 5,
                                    paddingHorizontal: 11,
                                    paddingVertical: 6,
                                    borderRadius: 18,
                                    backgroundColor: isActive ? '#009F50' : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: isActive ? '#009F50' : '#E2E8F0',
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 11.5,
                                      fontWeight: '700',
                                      color: isActive ? '#FFFFFF' : '#475569',
                                    }}
                                  >
                                    {filter.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        )}

                        {/* Loading State */}
                        {aiPostsRes.loading && localAiPosts.length === 0 ? (
                          <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }}>
                            <ActivityIndicator size="large" color="#009F50" />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                              Generating 20 branded posts for {effectiveBusinessName}...
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center' }}>
                              Tailoring headlines, bulleted benefits, and local keywords
                            </Text>
                          </View>
                        ) : null}

                        {/* Horizontal Carousel Slider */}
                        {filteredAiPosts.length > 0 && (
                          <View style={{ marginTop: 4 }}>
                            <ScrollView
                              ref={aiPostSliderRef}
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              snapToInterval={Math.min(Dimensions.get('window').width - 40, 348) + 14}
                              snapToAlignment="start"
                              decelerationRate="fast"
                              contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 6, gap: 14 }}
                              onMomentumScrollEnd={(e) => {
                                const cardStep = Math.min(Dimensions.get('window').width - 40, 348) + 14;
                                const nextIndex = Math.max(0, Math.min(filteredAiPosts.length - 1, Math.round(e.nativeEvent.contentOffset.x / cardStep)));
                                setActiveAiPostIndex(nextIndex);
                              }}
                            >
                              {filteredAiPosts.map((item, idx) => {
                                const cardWidth = Math.min(Dimensions.get('window').width - 40, 348);
                                const postLogo = effectiveBusinessLogo || item.logoUrl || null;
                                const postBizName = item.businessName || effectiveBusinessName;

                                return (
                                  <View
                                    key={item.id || `post_${idx}`}
                                    style={{
                                      width: cardWidth,
                                      backgroundColor: '#FFFFFF',
                                      borderRadius: 16,
                                      borderWidth: 1,
                                      borderColor: '#E2E8F0',
                                      overflow: 'hidden',
                                      shadowColor: '#000',
                                      shadowOpacity: 0.06,
                                      shadowRadius: 8,
                                      elevation: 2,
                                    }}
                                  >
                                    {/* ── Compact Visual Hero ── */}
                                    {item.imageUrl ? (
                                      <Pressable
                                        onPress={() => {
                                          setSelectedAiPostForDetail({
                                            id: item.id || `ai_post_${idx + 1}`,
                                            title: item.title,
                                            badge: item.badge,
                                            status: 'draft',
                                            content: item.content,
                                            mediaUrls: [item.imageUrl],
                                            linkUrl: item.website,
                                            publishTargets: [{ platform: 'googlebusiness', status: 'pending' }],
                                            createdAt: new Date().toISOString(),
                                            updatedAt: new Date().toISOString(),
                                            approvalStatus: 'pending',
                                            logoUrl: postLogo,
                                            businessName: postBizName,
                                          });
                                        }}
                                        style={{ width: '100%', height: 148, backgroundColor: '#0F172A', position: 'relative' }}
                                      >
                                        <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />

                                        <View
                                          style={{
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 8,
                                            backgroundColor: item.postType === 'OFFER' ? '#FEF3C7' : item.postType === 'EVENT' ? '#F3E8FF' : '#DCFCE7',
                                          }}
                                        >
                                          <Text
                                            style={{
                                              fontSize: 10,
                                              fontWeight: '800',
                                              color: item.postType === 'OFFER' ? '#92400E' : item.postType === 'EVENT' ? '#6B21A8' : '#166534',
                                            }}
                                          >
                                            {item.badge || 'Standard Post'}
                                          </Text>
                                        </View>

                                        <View
                                          style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            backgroundColor: 'rgba(15, 23, 42, 0.78)',
                                            paddingHorizontal: 7,
                                            paddingVertical: 3,
                                            borderRadius: 10,
                                          }}
                                        >
                                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                                            {idx + 1}/{filteredAiPosts.length}
                                          </Text>
                                        </View>

                                        <View
                                          style={{
                                            position: 'absolute',
                                            bottom: 8,
                                            right: 8,
                                            backgroundColor: '#009F50',
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 7,
                                          }}
                                        >
                                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#FFFFFF' }}>
                                            {item.ctaText || 'CALL'}
                                          </Text>
                                        </View>
                                      </Pressable>
                                    ) : null}

                                    {/* ── Scannable Card Content Body ── */}
                                    <View style={{ padding: 12, gap: 6 }}>
                                      <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '800', color: '#0F172A', lineHeight: 19 }}>
                                        {item.title}
                                      </Text>

                                      {item.intro ? (
                                        <Text numberOfLines={2} style={{ fontSize: 11.5, color: '#475569', lineHeight: 16 }}>
                                          {item.intro}
                                        </Text>
                                      ) : null}

                                      {item.bullets && item.bullets.length > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
                                          <MaterialIcons name="check-circle" size={12} color="#009F50" />
                                          <Text numberOfLines={1} style={{ fontSize: 11, color: '#334155', flex: 1 }}>
                                            {item.bullets[0]}
                                          </Text>
                                        </View>
                                      )}

                                      {/* ── Action Toolbar ── */}
                                      <View
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          paddingTop: 8,
                                          borderTopWidth: 1,
                                          borderTopColor: '#F1F5F9',
                                          marginTop: 4,
                                          gap: 6,
                                        }}
                                      >
                                        <Pressable
                                          disabled={publishingAiPostId === String(item.id || `post_${idx}`)}
                                          onPress={() => void handlePublishCardDirectly(item, idx)}
                                          hitSlop={6}
                                          style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                            backgroundColor: '#009F50',
                                            paddingHorizontal: 10,
                                            paddingVertical: 7,
                                            borderRadius: 8,
                                            flex: 1,
                                            justifyContent: 'center',
                                            opacity: publishingAiPostId === String(item.id || `post_${idx}`) ? 0.65 : 1,
                                          }}
                                        >
                                          {publishingAiPostId === String(item.id || `post_${idx}`) ? (
                                            <ActivityIndicator size={12} color="#FFFFFF" />
                                          ) : (
                                            <MaterialIcons name="send" size={13} color="#FFFFFF" />
                                          )}
                                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                                            {publishingAiPostId === String(item.id || `post_${idx}`) ? 'Publishing…' : 'Publish'}
                                          </Text>
                                        </Pressable>

                                        {/* Copy Caption */}
                                        <Pressable
                                          onPress={() => void handleCopyCardText(item)}
                                          hitSlop={6}
                                          style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                            backgroundColor: '#F8FAFC',
                                            borderWidth: 1,
                                            borderColor: '#E2E8F0',
                                            paddingHorizontal: 9,
                                            paddingVertical: 7,
                                            borderRadius: 8,
                                          }}
                                        >
                                          <MaterialIcons name="content-copy" size={13} color="#475569" />
                                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>Copy</Text>
                                        </Pressable>

                                        {/* Edit & Customize */}
                                        <Pressable
                                          onPress={() => {
                                            setSelectedAiPostForDetail({
                                              id: item.id || `ai_post_${idx + 1}`,
                                              title: item.title,
                                              badge: item.badge,
                                              status: 'draft',
                                              content: item.content,
                                              mediaUrls: [item.imageUrl],
                                              linkUrl: item.website,
                                              publishTargets: [{ platform: 'googlebusiness', status: 'pending' }],
                                              createdAt: new Date().toISOString(),
                                              updatedAt: new Date().toISOString(),
                                              approvalStatus: 'pending',
                                              logoUrl: postLogo,
                                              businessName: postBizName,
                                            });
                                          }}
                                          hitSlop={6}
                                          style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                            backgroundColor: '#F0FDF4',
                                            borderWidth: 1,
                                            borderColor: '#BBF7D0',
                                            paddingHorizontal: 9,
                                            paddingVertical: 7,
                                            borderRadius: 8,
                                          }}
                                        >
                                          <MaterialIcons name="edit" size={13} color="#009F50" />
                                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#009F50' }}>Edit</Text>
                                        </Pressable>

                                        {/* Share */}
                                        <Pressable
                                          onPress={() => void handleShareCard(item)}
                                          hitSlop={6}
                                          style={{
                                            backgroundColor: '#F8FAFC',
                                            borderWidth: 1,
                                            borderColor: '#E2E8F0',
                                            paddingHorizontal: 8,
                                            paddingVertical: 7,
                                            borderRadius: 8,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <MaterialIcons name="share" size={14} color="#475569" />
                                        </Pressable>
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </ScrollView>

                            {/* Slider Navigation Controls */}
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 12,
                                marginTop: 10,
                                marginBottom: 4,
                              }}
                            >
                              <Pressable
                                disabled={activeAiPostIndex <= 0}
                                hitSlop={10}
                                onPress={() => {
                                  const nextIndex = Math.max(0, activeAiPostIndex - 1);
                                  const cardStep = Math.min(Dimensions.get('window').width - 40, 348) + 14;
                                  aiPostSliderRef.current?.scrollTo({ x: nextIndex * cardStep, animated: true });
                                  setActiveAiPostIndex(nextIndex);
                                }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: activeAiPostIndex <= 0 ? '#F1F5F9' : '#FFFFFF',
                                  borderWidth: 1,
                                  borderColor: '#E2E8F0',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <MaterialIcons name="chevron-left" size={20} color={activeAiPostIndex <= 0 ? '#CBD5E1' : '#0F172A'} />
                              </Pressable>

                              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#475569' }}>
                                Post {activeAiPostIndex + 1} of {filteredAiPosts.length}
                              </Text>

                              <Pressable
                                disabled={activeAiPostIndex >= filteredAiPosts.length - 1}
                                hitSlop={10}
                                onPress={() => {
                                  const nextIndex = Math.min(filteredAiPosts.length - 1, activeAiPostIndex + 1);
                                  const cardStep = Math.min(Dimensions.get('window').width - 40, 348) + 14;
                                  aiPostSliderRef.current?.scrollTo({ x: nextIndex * cardStep, animated: true });
                                  setActiveAiPostIndex(nextIndex);
                                }}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 16,
                                  backgroundColor: activeAiPostIndex >= filteredAiPosts.length - 1 ? '#F1F5F9' : '#FFFFFF',
                                  borderWidth: 1,
                                  borderColor: '#E2E8F0',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <MaterialIcons name="chevron-right" size={20} color={activeAiPostIndex >= filteredAiPosts.length - 1 ? '#CBD5E1' : '#0F172A'} />
                              </Pressable>
                            </View>
                          </View>
                        )}

                        {/* Custom Prompt Box below 20 posts */}
                        <View
                          style={{
                            marginTop: 12,
                            padding: 16,
                            borderRadius: 16,
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#E2E8F0',
                            gap: 10,
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                            Want something custom?
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 16 }}>
                            Tap any idea chip below or enter your own custom topic in the composer at the bottom.
                          </Text>

                          <View style={{ width: '100%', gap: 8 }}>
                            {(promptSuggestions.data?.suggestions && promptSuggestions.data.suggestions.length > 0
                              ? promptSuggestions.data.suggestions.slice(0, 3)
                              : [
                                  { id: '1', icon: '📱', title: 'Introduce my business', prompt: 'Introduce my business using its saved profile.' },
                                  { id: '2', icon: '⏱️', title: 'Highlight a service', prompt: 'Spotlight a service from my business profile.' },
                                  { id: '3', icon: '🚀', title: 'Plan a promotion', prompt: 'Help me draft a promotion using only the offer details I provide.' },
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
                                    paddingVertical: 10,
                                    paddingHorizontal: 12,
                                    borderRadius: 12,
                                    backgroundColor: '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                  },
                                  pressed && { backgroundColor: '#F1F5F9' },
                                ]}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                  <Text style={{ fontSize: 16 }}>{item.icon || '💡'}</Text>
                                  <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '700', color: '#1E293B', flex: 1 }}>
                                    {item.title || item.chipLabel || item.prompt}
                                  </Text>
                                </View>
                                <MaterialIcons name="arrow-forward" size={15} color="#94A3B8" />
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      </ScrollView>
                    )}
                  </View>
                ) : (
                  /* ── Active Generated Campaign State ── */
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

                    {/* Active Template & Switcher Bar */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name="auto-awesome" size={15} color="#009F50" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                          {activeTemplateId ? `${getTemplateById(activeTemplateId)?.name || 'Custom'} Template` : 'AI Branded Poster'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setTemplatePickerOpen(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }}
                      >
                        <MaterialIcons name="grid-view" size={13} color="#009F50" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#009F50' }}>Change Template</Text>
                      </Pressable>
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
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Inspect poster in full screen"
                        onPress={() => setInspectMainFullscreen('poster')}
                        style={{ padding: 12, backgroundColor: '#070A13', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                      >
                        <AutoBrandedPosterCard document={design}
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
                        <View
                          style={{
                            position: 'absolute',
                            top: 18,
                            right: 18,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 9,
                            paddingVertical: 5,
                            borderRadius: 14,
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.22)',
                          }}
                        >
                          <MaterialIcons name="fullscreen" size={14} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>Full Screen</Text>
                        </View>
                      </Pressable>

                      {(customPosterUri || bgPhotoUrl) ? (
                        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10 }}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setInspectMainFullscreen('photo')}
                            style={{
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                              paddingVertical: 8,
                              borderRadius: 10,
                              backgroundColor: '#F5F3FF',
                              borderWidth: 1,
                              borderColor: '#DDD6FE',
                            }}
                          >
                            <MaterialIcons name="image-search" size={15} color="#6D28D9" />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>
                              Inspect AI Photo{bgImageCandidates.length > 1 ? ` (${bgImageCandidates.length})` : ''}
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setInspectMainFullscreen('poster')}
                            style={{
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                              paddingVertical: 8,
                              borderRadius: 10,
                              backgroundColor: '#F8FAFC',
                              borderWidth: 1,
                              borderColor: '#CBD5E1',
                            }}
                          >
                            <MaterialIcons name="fullscreen" size={15} color="#0F172A" />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>
                              Full Poster
                            </Text>
                          </Pressable>
                        </View>
                      ) : null}

                      <View style={{padding:12}}><Action secondary label="Edit design" icon="edit" onPress={()=>{setStudioStep(2);setStudioSubTab('design');}}/></View>

                      {/* 1-Tap Fast Action Suite — Zero Canvas Friction */}
                      <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, backgroundColor: '#FFFFFF', gap: 8 }}>
                        {/* 1. Primary 1-Tap Publish */}
                        <Pressable
                          onPress={() => setStudioStep(3)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            paddingVertical: 13,
                            borderRadius: 12,
                            backgroundColor: '#009F50',
                            shadowColor: '#009F50',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.25,
                            shadowRadius: 6,
                            elevation: 4,
                          }}
                        >
                          <MaterialIcons name="rocket-launch" size={17} color="#FFFFFF" />
                          <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 }}>
                            Review post →
                          </Text>
                        </Pressable>

                        {/* 2. Share to WhatsApp Status */}
                        <Pressable
                          onPress={async () => {
                            try {
                              const shareText = `${headline || effectiveHeadline}\n\n${subtitle || ''}\n\nCall: ${brandPhone || effectiveBusinessPhone || ''}\nVisit: ${brandWebsite || effectiveBusinessWebsite || ''}`;
                              await Share.share({
                                message: shareText,
                                title: headline || 'Business Promotion',
                              });
                            } catch (err: unknown) {
                              console.warn('Share error:', err);
                            }
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 7,
                            paddingVertical: 11,
                            borderRadius: 12,
                            backgroundColor: '#F0FDF4',
                            borderWidth: 1.5,
                            borderColor: '#22C55E',
                          }}
                        >
                          <MaterialIcons name="share" size={16} color="#16A34A" />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#16A34A' }}>
                            Share to WhatsApp Status
                          </Text>
                        </Pressable>

                        {/* 3. Advanced Canvas Studio Editing (Optional) */}
                        <Pressable
                          onPress={() => {
                            setStudioStep(2);
                            setStudioSubTab('design');
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: 'transparent',
                          }}
                        >
                          <MaterialIcons name="edit" size={13} color="#64748B" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                            Edit design
                          </Text>
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
                  </ScrollView>
                )}

              {/* Bottom Sticky Action Bar: Suggestions (if generated) + Mode Selector + Floating Composer */}
              <View style={styles.promptInputContainer}>
                <Pressable accessibilityRole="button" accessibilityState={{expanded:showCreationOptions}} onPress={()=>setShowCreationOptions(!showCreationOptions)} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:6}}>
                  <MaterialIcons name="tune" size={18} color="#64748B"/><Text style={{color:'#64748B'}}>Format · {generationMode==='poster'?'AI poster':generationMode==='graphic'?'Editable design':'Photo'}</Text><MaterialIcons name={showCreationOptions?'expand-less':'expand-more'} size={18} color="#64748B"/>
                </Pressable>
                {showCreationOptions && <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                  <Pressable
                    onPress={() => {
                      setGenerationMode('poster');setShowCreationOptions(false);
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
                      setGenerationMode('graphic');setShowCreationOptions(false);
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
                    onPress={() => {setGenerationMode('image_only');setShowCreationOptions(false);}}
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
                </View>}

                {/* Dynamic Prompt Suggestion Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 4, gap: 6, marginBottom: 8 }}
                >
                  {[
                    '✨ Weekend Special Offer',
                    '🌟 5-Star Customer Review',
                    '🎉 Festival Announcement',
                    '🔥 Limited Time Deal',
                    '💡 Pro Tip & Guide',
                    '🚀 New Service Launch',
                  ].map((chip) => (
                    <Pressable
                      key={chip}
                      onPress={() => setPromptInput(chip)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4.5,
                        borderRadius: 14,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#334155' }}>
                        {chip}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

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
                        : 'Describe your post or ask for a change…'
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
              {/* Studio Step 2 Top Bar: Undo, Redo, Drafts, Save, Templates */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Pressable
                    accessibilityLabel="Undo"
                    disabled={!designPast.length}
                    onPress={() => navigateHistory('undo')}
                    style={{ padding: 6, opacity: designPast.length ? 1 : 0.3 }}
                  >
                    <MaterialIcons name="undo" size={21} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Redo"
                    disabled={!designFuture.length}
                    onPress={() => navigateHistory('redo')}
                    style={{ padding: 6, opacity: designFuture.length ? 1 : 0.3 }}
                  >
                    <MaterialIcons name="redo" size={21} color="#0F172A" />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => { setDraftPickerOpen(true); void loadDesignDrafts(); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}
                  >
                    <MaterialIcons name="folder-open" size={14} color="#475569" />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569' }}>Drafts</Text>
                  </Pressable>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#64748B' }}>
                    {busy ? 'Saving…' : '✓ Saved'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setTemplatePickerOpen(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#009F50' }}
                  >
                    <MaterialIcons name="grid-view" size={13} color="#FFFFFF" />
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>Templates</Text>
                  </Pressable>
                </View>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                scrollEnabled={!isCanvasGestureActive}
                contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
              >
                {autosaveFailed && (
                  <Pressable onPress={() => void submitPost('draft', true)} style={{ marginBottom: 10, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' }}>
                    <Text style={{ color: '#B91C1C', fontSize: 11.5, fontWeight: '700', textAlign: 'center' }}>Changes not saved. Tap to retry.</Text>
                  </Pressable>
                )}

                {/* Live Full-Bleed Canvas Editor with Direct Tap Selection & Contextual Tools */}
                <View style={{ marginBottom: 14 }}>
                  <PosterEditor
                    doc={design}
                    onChange={handleCustomDesignChange}
                    onGestureActive={setIsCanvasGestureActive}
                    onOpenTemplates={() => setTemplatePickerOpen(true)}
                    onOpenRatio={() => setEditSheet('style')}
                  />
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

              </ScrollView>

              {/* Step 2 Sticky Footer: More Actions Overflow & Primary Continue */}
              <View style={styles.dualStickyFooter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="More design actions"
                  onPress={() =>
                    Alert.alert('Design Actions', 'Choose an action for this design:', [
                      { text: 'Save draft', onPress: () => void submitPost('draft') },
                      { text: 'Save as reusable template', onPress: () => void handleSaveAsMyTemplate() },
                      { text: 'Cancel', style: 'cancel' },
                    ])
                  }
                  style={[styles.secondaryButton, { flex: 0, paddingHorizontal: 16 }]}
                >
                  <MaterialIcons name="more-horiz" size={24} color="#475569" />
                </Pressable>

                <Pressable
                  onPress={() => setStudioStep(3)}
                  style={styles.primaryFlexButton}
                >
                  <Text style={styles.primaryActionText}>Review post →</Text>
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
                {/* Where would you like to publish? Account Selector */}
                <PublishingAccountPicker
                  accounts={availableAccounts}
                  selectedIds={selectedAccountIds}
                  toggle={togglePublishingAccount}
                  manage={() => router.push('/integrations')}
                  onSelectAll={handleSelectAllAccounts}
                  onClearAll={handleClearAllAccounts}
                />

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

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Inspect post preview full screen"
                    onPress={() => setInspectMainFullscreen('poster')}
                    style={{ backgroundColor: '#090D16', paddingVertical: 4, position: 'relative' }}
                  >
                    <AutoBrandedPosterCard document={design}
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
                    <View
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 14,
                        backgroundColor: 'rgba(15, 23, 42, 0.84)',
                      }}
                    >
                      <MaterialIcons name="fullscreen" size={14} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>Full Screen</Text>
                    </View>
                  </Pressable>

                  {/* Interactive Social Action Icons */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Like this post"
                        onPress={handleToggleLikePreview}
                        hitSlop={8}
                      >
                        <MaterialIcons
                          name={previewLiked ? 'favorite' : 'favorite-border'}
                          size={22}
                          color={previewLiked ? '#EF4444' : '#0F172A'}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Toggle post comments preview"
                        onPress={() => setShowCommentPreview((p) => !p)}
                        hitSlop={8}
                      >
                        <MaterialIcons
                          name="chat-bubble-outline"
                          size={20}
                          color={showCommentPreview ? '#009F50' : '#0F172A'}
                        />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Share post to social apps"
                        onPress={handleSharePreview}
                        hitSlop={8}
                      >
                        <MaterialIcons name="send" size={20} color="#0F172A" />
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Bookmark this template"
                      onPress={handleToggleBookmarkPreview}
                      hitSlop={8}
                    >
                      <MaterialIcons
                        name={previewBookmarked ? 'bookmark' : 'bookmark-border'}
                        size={22}
                        color={previewBookmarked ? '#009F50' : '#0F172A'}
                      />
                    </Pressable>
                  </View>

                  {/* Interactive Comments & Hashtags Preview Panel */}
                  {showCommentPreview && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 10, paddingTop: 2, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderColor: '#F1F5F9' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                        💬 First Pinned Comment (SEO Hashtags):
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#0284C7', lineHeight: 16 }}>
                        #{businessDisplayName.replace(/[^A-Za-z0-9]/g, '')} #SpecialOffer #LocalBusiness #ServiceDeal #BookNow
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                        <TextInput
                          placeholder="Add preview comment..."
                          placeholderTextColor="#94A3B8"
                          value={previewCommentText}
                          onChangeText={setPreviewCommentText}
                          style={[styles.configInput, { flex: 1, height: 32, paddingVertical: 4, fontSize: 11 }]}
                        />
                        <Pressable
                          onPress={() => {
                            if (previewCommentText.trim()) {
                              setSuccessNotice('Preview comment added to post discussion!');
                              setPreviewCommentText('');
                            }
                          }}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#009F50', borderRadius: 6 }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Post</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

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
                      <Pressable
                        onPress={() => setScheduleMode('multi_day')}
                        style={[styles.scheduleBtn, scheduleMode === 'multi_day' && styles.scheduleBtnActive]}
                      >
                        <Text style={[styles.scheduleBtnText, scheduleMode === 'multi_day' && styles.scheduleBtnTextActive]}>
                          7d Sprint
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {scheduleMode !== 'now' && <Text style={styles.configCardTitle}>Time zone · {Intl.DateTimeFormat().resolvedOptions().timeZone}</Text>}
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

                  {scheduleMode === 'multi_day' && (
                    <View style={{ marginTop: 8, gap: 10 }}>
                      <Text style={{ fontSize: 11.5, color: '#64748B' }}>
                        Distribute this promotion daily across consecutive days:
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[3, 7, 14].map((cnt) => (
                          <Pressable
                            key={cnt}
                            onPress={() => setMultiDayCount(cnt)}
                            style={{
                              flex: 1,
                              paddingVertical: 8,
                              borderRadius: 8,
                              borderWidth: 1.5,
                              borderColor: multiDayCount === cnt ? '#009F50' : '#E2E8F0',
                              backgroundColor: multiDayCount === cnt ? '#F0FDF4' : '#FFFFFF',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '800', color: multiDayCount === cnt ? '#009F50' : '#0F172A' }}>
                              {cnt} Days {cnt === 7 ? '⚡ Sprint' : ''}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 11.5, color: '#64748B' }}>Daily Time:</Text>
                        <TextInput
                          placeholder="10:00"
                          value={scheduleTime}
                          onChangeText={setScheduleTime}
                          style={[styles.configInput, { width: 90, paddingVertical: 4 }]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Step 3 Sticky Footer: Publish / Schedule CTA */}
              <View style={styles.promptInputContainer}>
                <Pressable
                  disabled={busy || targets.length === 0}
                  onPress={() => submitPost(scheduleMode === 'now' ? 'published' : 'scheduled')}
                  style={[
                    styles.primaryActionButton,
                    (busy || targets.length === 0) && { opacity: 0.6 },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryActionText}>
                      {targets.length === 0
                        ? scheduleMode === 'now'
                          ? 'Select an account to publish'
                          : 'Select an account to schedule'
                        : scheduleMode === 'now'
                        ? targets.length === 1
                          ? targets[0].platform === 'googlebusiness'
                            ? 'Publish to Google Business'
                            : targets[0].platform === 'facebook'
                            ? 'Publish to Facebook'
                            : 'Publish to Instagram'
                          : `Publish to ${targets.length} accounts`
                        : scheduleMode === 'multi_day'
                        ? `Schedule ${multiDayCount}-Day Campaign`
                        : targets.length === 1
                        ? targets[0].platform === 'googlebusiness'
                          ? 'Schedule on Google Business'
                          : targets[0].platform === 'facebook'
                          ? 'Schedule on Facebook'
                          : 'Schedule on Instagram'
                        : `Schedule on ${targets.length} accounts`}
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

          {/* Modal 1: Edit Poster Text & Content */}
          <Modal
            visible={isEditingText || editSheet === 'text'}
            animationType="slide"
            transparent
            onRequestClose={() => {
              setIsEditingText(false);
              setEditSheet('none');
            }}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>✏️ Edit Poster Content</Text>
                  <Pressable
                    onPress={() => {
                      setIsEditingText(false);
                      setEditSheet('none');
                    }}
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  {/* ── Section: Header Branding & Logo ── */}
                  <View style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    <Text style={[styles.modalInputLabel, { color: '#009F50', fontWeight: '800' }]}>🏢 HEADER BRAND & LOGO</Text>
                    <Text style={styles.modalInputLabel}>Brand / Business Name</Text>
                    <TextInput
                      value={brandName || effectiveBusinessName}
                      onChangeText={handleApplyBrandName}
                      placeholder="Enter brand name..."
                      style={styles.configInput}
                    />

                    <Text style={styles.modalInputLabel}>Brand Logo</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: '#F1F5F9',
                          borderWidth: 1,
                          borderColor: '#CBD5E1',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        {effectiveBusinessLogo ? (
                          <Image source={{ uri: effectiveBusinessLogo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                          <MaterialIcons name="business" size={20} color="#94A3B8" />
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
                        <Pressable
                          onPress={handlePickLogo}
                          style={{
                            flex: 1,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: '#009F50',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                            {effectiveBusinessLogo ? 'Change Logo' : 'Upload Logo'}
                          </Text>
                        </Pressable>
                        {effectiveBusinessLogo && (
                          <Pressable
                            onPress={handleRemoveLogo}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              borderRadius: 8,
                              backgroundColor: '#FEF2F2',
                              borderWidth: 1,
                              borderColor: '#FCA5A5',
                              alignItems: 'center',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#B91C1C' }}>Remove</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* ── Section: Headlines & Offer Copy ── */}
                  <Text style={[styles.modalInputLabel, { color: '#009F50', fontWeight: '800' }]}>📝 HEADLINE & COPY</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 }}>
                    <Text style={styles.modalInputLabel}>Main Headline</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable
                        onPress={() => handleAiRewriteHeadline('punchier')}
                        style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#334155' }}>⚡ Punchier</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleAiRewriteHeadline('benefits')}
                        style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#334155' }}>💡 Benefit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleAiRewriteHeadline('urgent')}
                        style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#334155' }}>🔥 Urgent</Text>
                      </Pressable>
                    </View>
                  </View>
                  <TextInput
                    value={headline || effectiveHeadline}
                    onChangeText={handleUpdateHeadline}
                    placeholder="Enter poster headline..."
                    style={styles.configInput}
                  />

                  <Text style={styles.modalInputLabel}>Offer Badge / Ribbon</Text>
                  <TextInput
                    value={discountBadge}
                    onChangeText={handleUpdateDiscountBadge}
                    placeholder="e.g. SPECIAL OFFER, 30% OFF"
                    style={styles.configInput}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, marginTop: 4, marginBottom: 8 }}
                  >
                    {['SPECIAL OFFER', '30% OFF', 'FLAT ₹500 OFF', 'LIMITED SEATS', 'WEEKEND ONLY', 'BEST SELLER'].map((b) => (
                      <Pressable
                        key={b}
                        onPress={() => handleUpdateDiscountBadge(b)}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: discountBadge === b ? '#EFF6FF' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: discountBadge === b ? '#3B82F6' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: discountBadge === b ? '#2563EB' : '#475569' }}>
                          {b}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={styles.modalInputLabel}>Subtitle / Description</Text>
                  <TextInput
                    value={subtitle}
                    onChangeText={handleUpdateSubtitle}
                    placeholder="Supporting offer detail..."
                    style={styles.configInput}
                  />

                  <Text style={styles.modalInputLabel}>Button / Call to Action</Text>
                  <TextInput
                    value={ctaText}
                    onChangeText={handleUpdateCtaText}
                    placeholder="e.g. Book Now, Claim Deal"
                    style={styles.configInput}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, marginTop: 4, marginBottom: 8 }}
                  >
                    {['Book Now', 'Order Online', 'Call Us', 'Claim Deal', 'Visit Store', 'Get Directions'].map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => handleUpdateCtaText(c)}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6,
                          backgroundColor: ctaText === c ? '#EFF6FF' : '#F1F5F9',
                          borderWidth: 1,
                          borderColor: ctaText === c ? '#3B82F6' : '#E2E8F0',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: ctaText === c ? '#2563EB' : '#475569' }}>
                          {c}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  {/* ── Section: Footer Link & Contact ── */}
                  <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <Text style={[styles.modalInputLabel, { color: '#009F50', fontWeight: '800' }]}>🌐 FOOTER LINK & CONTACT</Text>
                    <Text style={styles.modalInputLabel}>Website / Profile Link</Text>
                    <TextInput
                      value={brandWebsite || effectiveBusinessWebsite}
                      onChangeText={handleApplyBrandWebsite}
                      placeholder="e.g. yourbusiness.com"
                      autoCapitalize="none"
                      style={styles.configInput}
                    />

                    <Text style={styles.modalInputLabel}>Contact Phone Number</Text>
                    <TextInput
                      value={brandPhone || effectiveBusinessPhone}
                      onChangeText={handleApplyBrandPhone}
                      placeholder="e.g. +91 98765 43210"
                      keyboardType="phone-pad"
                      style={styles.configInput}
                    />
                  </View>

                  <Pressable
                    onPress={() => {
                      setIsEditingText(false);
                      setEditSheet('none');
                    }}
                    style={styles.modalDoneBtn}
                  >
                    <Text style={styles.modalDoneBtnText}>Apply & Close</Text>
                  </Pressable>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal 2: Photo & AI Background */}
          <Modal
            visible={editSheet === 'photo'}
            animationType="slide"
            transparent
            onRequestClose={() => {
              if (inspectSheetBgFullscreen) {
                setInspectSheetBgFullscreen(false);
                return;
              }
              setEditSheet('none');
            }}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>🖼️ Photo & AI Background</Text>
                  <Pressable onPress={() => setEditSheet('none')} hitSlop={8}>
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  {/* Photo upload options */}
                  <Text style={styles.modalInputLabel}>Upload or Replace Imagery</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 14 }}>
                    <Pressable
                      onPress={async () => {
                        await handlePickCustomPoster();
                      }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 10,
                        backgroundColor: '#F8FAFC',
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: '#CBD5E1',
                      }}
                    >
                      <MaterialIcons name="photo-library" size={18} color="#009F50" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A' }}>Pick from Gallery</Text>
                    </Pressable>

                    {customPosterUri && (
                      <Pressable
                        onPress={() => handleApplyPhoto(null)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          backgroundColor: '#FEF2F2',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#FCA5A5',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#B91C1C' }}>↺ Reset</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* AI Generation section */}
                  <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <MaterialIcons name="auto-awesome" size={16} color="#7C3AED" />
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0F172A' }}>AI Background Generator</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16, marginBottom: 10 }}>
                      Synthesizes a brand-new high-resolution background tailored to your headline and festive occasion.
                    </Text>

                    {/* Optional Reference Photos (Previous Business Photos) */}
                    <View style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                          Use Previous Business Photos ({selectedRefUrls.length}/3)
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Pressable
                            onPress={() => void loadBusinessRefPhotos()}
                            disabled={refPhotosLoading}
                            style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' }}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569' }}>
                              {refPhotosLoading ? '…' : '↻'}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => void handleUploadRefPhoto()}
                            disabled={uploadingRefPhoto}
                            style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' }}
                          >
                            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#6D28D9' }}>
                              {uploadingRefPhoto ? 'Uploading…' : '+ Upload Ref'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                      {refPhotosError ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
                          <Text style={{ flex: 1, fontSize: 11, color: '#B91C1C' }} numberOfLines={2}>
                            {refPhotosError}
                          </Text>
                          <Pressable onPress={() => void loadBusinessRefPhotos()}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED' }}>Retry</Text>
                          </Pressable>
                        </View>
                      ) : refPhotosList.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {refPhotosList.map((refItem) => {
                            const active = selectedRefUrls.includes(refItem.url);
                            return (
                              <View key={refItem.id} style={{ position: 'relative', width: 58, height: 58 }}>
                                <Pressable
                                  onPress={() => toggleRefPhoto(refItem.url)}
                                  style={{
                                    width: 58,
                                    height: 58,
                                    borderRadius: 9,
                                    overflow: 'hidden',
                                    borderWidth: active ? 2.5 : 1,
                                    borderColor: active ? '#009F50' : '#CBD5E1',
                                    backgroundColor: '#E2E8F0',
                                  }}
                                >
                                  <Image source={{ uri: refItem.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                  {active ? (
                                    <View style={{ position: 'absolute', top: 3, right: 3, backgroundColor: '#009F50', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                                      <MaterialIcons name="check" size={11} color="#FFFFFF" />
                                    </View>
                                  ) : null}
                                </Pressable>
                                <Pressable
                                  hitSlop={8}
                                  onPress={() => setFullscreenPhotoUrl(refItem.url)}
                                  style={{
                                    position: 'absolute',
                                    bottom: 2,
                                    right: 2,
                                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                                    borderRadius: 4,
                                    padding: 2,
                                  }}
                                >
                                  <MaterialIcons name="fullscreen" size={13} color="#FFFFFF" />
                                </Pressable>
                              </View>
                            );
                          })}
                        </ScrollView>
                      ) : (
                        <Text style={{ fontSize: 11, color: '#64748B' }}>
                          {refPhotosLoading ? 'Loading business photos…' : 'No saved business photos yet — tap "+ Upload Ref" to include your own.'}
                        </Text>
                      )}
                      {selectedRefUrls.length > 0 && isTextOnlyImageProvider(imageProvider) ? (
                        <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#6D28D9', marginTop: 4 }}>
                          ✨ Using Gemini Vision to blend your selected reference photo{selectedRefUrls.length > 1 ? 's' : ''}.
                        </Text>
                      ) : null}
                    </View>

                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>
                      AI Model Provider
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {IMAGE_PROVIDER_CHOICES.map((prov) => (
                        <Pressable
                          key={prov}
                          onPress={() => setImageProvider(prov)}
                          style={{
                            minWidth: '30%',
                            flexGrow: 1,
                            paddingVertical: 6,
                            paddingHorizontal: 8,
                            borderRadius: 8,
                            backgroundColor: imageProvider === prov ? '#009F50' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: imageProvider === prov ? '#009F50' : '#CBD5E1',
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10.5,
                              fontWeight: '700',
                              color: imageProvider === prov ? '#FFFFFF' : '#475569',
                            }}
                          >
                            {IMAGE_PROVIDER_LABELS[prov]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Pressable
                      onPress={async () => {
                        await handleRegenerateImage({ openSheetInspector: true });
                      }}
                      disabled={isGeneratingImage}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: '#7C3AED',
                        borderRadius: 10,
                        paddingVertical: 10,
                        opacity: isGeneratingImage ? 0.7 : 1,
                      }}
                    >
                      {isGeneratingImage ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <MaterialIcons name="auto-fix-high" size={16} color="#FFFFFF" />
                      )}
                      <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#FFFFFF' }}>
                        {isGeneratingImage ? 'Synthesizing Image...' : 'Generate New AI Image'}
                      </Text>
                    </Pressable>

                    {(customPosterUri || bgPhotoUrl) ? (
                      <View style={{ marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#CBD5E1', gap: 8 }}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setInspectSheetBgFullscreen(true)}
                          style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', backgroundColor: '#0F172A', alignItems: 'center' }}
                        >
                          <Image
                            source={{ uri: (customPosterUri || bgPhotoUrl) as string }}
                            style={{ width: '100%', height: 150 }}
                            resizeMode="contain"
                            alt="Current AI background preview"
                          />
                          <View style={{ position: 'absolute', top: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
                            <MaterialIcons name="fullscreen" size={13} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>Full Screen</Text>
                          </View>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setInspectSheetBgFullscreen(true)}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#A7F3D0' }}
                        >
                          <MaterialIcons name="zoom-in" size={15} color="#047857" />
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#047857' }}>
                            {bgApprovedUrl === (customPosterUri || bgPhotoUrl)
                              ? 'Approved · Inspect Again'
                              : `Inspect Full Screen & Judge Quality${bgImageCandidates.length > 1 ? ` (${bgImageCandidates.length})` : ''}`}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>

                  <Pressable onPress={() => setEditSheet('none')} style={styles.modalDoneBtn}>
                    <Text style={styles.modalDoneBtnText}>Done</Text>
                  </Pressable>
                </ScrollView>
              </View>
            </View>

            <FullscreenImageModal
              asOverlay
              visible={inspectSheetBgFullscreen}
              onClose={() => setInspectSheetBgFullscreen(false)}
              imageUrl={customPosterUri || bgPhotoUrl}
              title="AI Background Inspection"
              subtitle={`${aspectRatio} · ${imageProvider}`}
              candidates={bgImageCandidates}
              selectedUrl={customPosterUri || bgPhotoUrl}
              onSelectCandidate={(cand) => {
                applySelectedBgImage(cand.url);
              }}
              reviewMode
              isApproved={Boolean((customPosterUri || bgPhotoUrl) && bgApprovedUrl === (customPosterUri || bgPhotoUrl))}
              onApprove={(url) => {
                applySelectedBgImage(url);
                setBgApprovedUrl(url);
              }}
              basePrompt={lastBgGenPrompt || promptInput}
              activeProvider={imageProvider}
              allowProviderSwitch={false}
              regenerating={isGeneratingImage}
              errorMessage={error}
              onRegenerate={({ prompt, provider }) =>
                handleRegenerateImage({
                  promptOverride: prompt,
                  providerOverride: provider,
                  openSheetInspector: true,
                })
              }
            />
          </Modal>

          {/* Modal 3: Style, Layout & Format */}
          <Modal
            visible={editSheet === 'style'}
            animationType="slide"
            transparent
            onRequestClose={() => setEditSheet('none')}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>🎨 Style, Layout & Format</Text>
                  <Pressable onPress={() => setEditSheet('none')} hitSlop={8}>
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  {/* Canvas Ratio Selector */}
                  <Text style={styles.modalInputLabel}>Canvas Aspect Ratio</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 14 }}>
                    {(
                      [
                        { id: '1:1', label: '1:1 Square', sub: 'Instagram Feed' },
                        { id: '4:5', label: '4:5 Portrait', sub: 'Social Posts' },
                        { id: '9:16', label: '9:16 Story', sub: 'Stories & Reels' },
                      ] as const
                    ).map((r) => {
                      const isActive = aspectRatio === r.id;
                      return (
                        <Pressable
                          key={r.id}
                          onPress={() => handleApplyAspect(r.id)}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            paddingHorizontal: 4,
                            borderRadius: 10,
                            backgroundColor: isActive ? '#009F50' : '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: isActive ? '#009F50' : '#E2E8F0',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: isActive ? '#FFFFFF' : '#0F172A' }}>
                            {r.label}
                          </Text>
                          <Text style={{ fontSize: 9.5, fontWeight: '600', color: isActive ? '#E2FCEE' : '#64748B', marginTop: 2 }}>
                            {r.sub}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Flyer Layout Structures */}
                  <Text style={styles.modalInputLabel}>Flyer Layout Structure</Text>
                  <View style={{ gap: 6, marginTop: 4, marginBottom: 14 }}>
                    {POSTER_TEMPLATES.map((tmpl) => {
                      const isActive = posterLayout === tmpl.id;
                      return (
                        <Pressable
                          key={tmpl.id}
                          onPress={() => handleApplyLayout(tmpl.id as PosterTemplateLayout)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            backgroundColor: isActive ? '#F0FDF4' : '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: isActive ? '#009F50' : '#E2E8F0',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <MaterialIcons name={tmpl.icon as any} size={20} color={isActive ? '#009F50' : '#64748B'} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#009F50' : '#0F172A' }}>
                                {tmpl.name}
                              </Text>
                              <Text numberOfLines={1} style={{ fontSize: 10.5, color: '#64748B' }}>
                                {tmpl.description}
                              </Text>
                            </View>
                          </View>
                          {isActive && <MaterialIcons name="check-circle" size={18} color="#009F50" />}
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Commercial Theme Colors */}
                  <Text style={styles.modalInputLabel}>Brand Color Scheme</Text>
                  <View style={{ gap: 6, marginTop: 4, marginBottom: 14 }}>
                    {COMMERCIAL_THEME_KEYS.map((tKey) => {
                      const cfg = COMMERCIAL_THEMES[tKey];
                      const isActive = colorTheme === tKey;
                      return (
                        <Pressable
                          key={tKey}
                          onPress={() => handleApplyTheme(tKey)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            backgroundColor: isActive ? '#F0FDF4' : '#F8FAFC',
                            borderWidth: 1.5,
                            borderColor: isActive ? '#009F50' : '#E2E8F0',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                backgroundColor: cfg.ctaBg,
                                borderWidth: 2,
                                borderColor: cfg.bg,
                              }}
                            />
                            <Text style={{ fontSize: 12.5, fontWeight: '700', color: isActive ? '#009F50' : '#0F172A' }}>
                              {cfg.name}
                            </Text>
                          </View>
                          {isActive && <MaterialIcons name="check" size={18} color="#009F50" />}
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable onPress={() => setEditSheet('none')} style={styles.modalDoneBtn}>
                    <Text style={styles.modalDoneBtnText}>Done</Text>
                  </Pressable>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal 4: Brand & Business Info */}
          <Modal
            visible={editSheet === 'brand'}
            animationType="slide"
            transparent
            onRequestClose={() => setEditSheet('none')}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>🏢 Brand & Business Identity</Text>
                  <Pressable onPress={() => setEditSheet('none')} hitSlop={8}>
                    <MaterialIcons name="close" size={22} color="#64748B" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  {/* Logo Picker */}
                  <Text style={styles.modalInputLabel}>Business Logo</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 14 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: '#F1F5F9',
                        borderWidth: 1,
                        borderColor: '#CBD5E1',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {effectiveBusinessLogo ? (
                        <Image source={{ uri: effectiveBusinessLogo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <MaterialIcons name="business" size={24} color="#94A3B8" />
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                      <Pressable
                        onPress={handlePickLogo}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: '#009F50',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#FFFFFF' }}>
                          {effectiveBusinessLogo ? 'Change Logo' : 'Upload Logo'}
                        </Text>
                      </Pressable>
                      {effectiveBusinessLogo && (
                        <Pressable
                          onPress={handleRemoveLogo}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: '#FEF2F2',
                            borderWidth: 1,
                            borderColor: '#FCA5A5',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#B91C1C' }}>Remove</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <Text style={styles.modalInputLabel}>Business / Brand Name</Text>
                  <TextInput
                    value={brandName || effectiveBusinessName}
                    onChangeText={handleApplyBrandName}
                    placeholder="Enter business name..."
                    style={styles.configInput}
                  />

                  <Text style={styles.modalInputLabel}>Tagline or Category</Text>
                  <TextInput
                    value={brandTagline || effectiveBusinessTagline}
                    onChangeText={handleApplyBrandTagline}
                    placeholder="e.g. Best in City, Certified Experts"
                    style={styles.configInput}
                  />

                  <Text style={styles.modalInputLabel}>Website / Profile Link</Text>
                  <TextInput
                    value={brandWebsite || effectiveBusinessWebsite}
                    onChangeText={handleApplyBrandWebsite}
                    placeholder="e.g. yourbusiness.com"
                    autoCapitalize="none"
                    style={styles.configInput}
                  />

                  <Text style={styles.modalInputLabel}>Contact Phone Number</Text>
                  <TextInput
                    value={brandPhone || effectiveBusinessPhone}
                    onChangeText={handleApplyBrandPhone}
                    placeholder="e.g. +91 98765 43210"
                    keyboardType="phone-pad"
                    style={styles.configInput}
                  />

                  <Pressable onPress={() => setEditSheet('none')} style={styles.modalDoneBtn}>
                    <Text style={styles.modalDoneBtnText}>Apply & Close</Text>
                  </Pressable>
                </ScrollView>
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
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        {effectiveBusinessName && !effectiveBusinessName.toLowerCase().includes('fieseros')
                          ? `${effectiveBusinessName} • Google Business Profile`
                          : 'Google Business Profile Campaign'}
                      </Text>
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
                          Website Highlights {effectiveBusinessWebsite ? `(${effectiveBusinessWebsite})` : ''}
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

                  {/* Previous Business Photos Reference Strip (optional) */}
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#334155' }}>
                        Previous Business Photos ({selectedRefUrls.length}/3 optional)
                      </Text>
                      <Pressable
                        onPress={() => void handleUploadRefPhoto()}
                        disabled={uploadingRefPhoto}
                        style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#6D28D9' }}>
                          {uploadingRefPhoto ? 'Uploading…' : '+ Upload Ref'}
                        </Text>
                      </Pressable>
                    </View>
                    {refPhotosList.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {refPhotosList.map((refItem) => {
                          const active = selectedRefUrls.includes(refItem.url);
                          return (
                            <View key={refItem.id} style={{ position: 'relative', width: 54, height: 54 }}>
                              <Pressable
                                onPress={() => toggleRefPhoto(refItem.url)}
                                style={{
                                  width: 54,
                                  height: 54,
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  borderWidth: active ? 2.5 : 1,
                                  borderColor: active ? '#009F50' : '#CBD5E1',
                                }}
                              >
                                <Image source={{ uri: refItem.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                {active ? (
                                  <View style={{ position: 'absolute', top: 3, right: 3, backgroundColor: '#009F50', borderRadius: 8, width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
                                    <MaterialIcons name="check" size={10} color="#FFFFFF" />
                                  </View>
                                ) : null}
                              </Pressable>
                              <Pressable
                                hitSlop={8}
                                onPress={() => setFullscreenPhotoUrl(refItem.url)}
                                style={{
                                  position: 'absolute',
                                  bottom: 2,
                                  right: 2,
                                  backgroundColor: 'rgba(15, 23, 42, 0.75)',
                                  borderRadius: 4,
                                  padding: 2,
                                }}
                              >
                                <MaterialIcons name="fullscreen" size={12} color="#FFFFFF" />
                              </Pressable>
                            </View>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        Pick up to 3 existing business photos or tap &quot;+ Upload Ref&quot; so AI blends your real place into the campaign poster.
                      </Text>
                    )}
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

          {/* Main Fullscreen Inspector for Poster or AI Background Photo */}
          <FullscreenImageModal
            visible={Boolean(inspectMainFullscreen)}
            onClose={() => setInspectMainFullscreen(false)}
            imageUrl={customPosterUri || bgPhotoUrl}
            title={
              inspectMainFullscreen === 'poster'
                ? 'Full Poster Preview'
                : 'AI Photo Quality Review'
            }
            subtitle={
              inspectMainFullscreen === 'poster'
                ? `${aspectRatio} · Pinch or double-tap to inspect typography & framing`
                : `${aspectRatio} · ${imageProvider}`
            }
            renderCustomContent={
              inspectMainFullscreen === 'poster'
                ? () => (
                    <AutoBrandedPosterCard
                      document={design}
                      photoUri={customPosterUri || bgPhotoUrl}
                      headline={headline || effectiveHeadline}
                      subtitle={subtitle}
                      badge={discountBadge}
                      ctaText={ctaText}
                      businessName={effectiveBusinessName}
                      logoUri={effectiveBusinessLogo}
                      tagline={effectiveBusinessTagline}
                      website={effectiveBusinessWebsite}
                      height={Math.min(540, Math.round(Dimensions.get('window').height * 0.68))}
                      theme={colorTheme}
                      layout={posterLayout}
                    />
                  )
                : undefined
            }
            candidates={inspectMainFullscreen === 'photo' ? bgImageCandidates : undefined}
            selectedUrl={customPosterUri || bgPhotoUrl}
            onSelectCandidate={(cand) => {
              applySelectedBgImage(cand.url);
            }}
            reviewMode={inspectMainFullscreen === 'photo'}
            isApproved={Boolean(
              (customPosterUri || bgPhotoUrl) && bgApprovedUrl === (customPosterUri || bgPhotoUrl),
            )}
            onApprove={(url) => {
              applySelectedBgImage(url);
              setBgApprovedUrl(url);
            }}
            basePrompt={lastBgGenPrompt || promptInput}
            activeProvider={imageProvider}
            allowProviderSwitch={false}
            regenerating={isGeneratingImage}
            errorMessage={error}
            onRegenerate={
              inspectMainFullscreen === 'photo'
                ? ({ prompt, provider }) =>
                    handleRegenerateImage({
                      promptOverride: prompt,
                      providerOverride: provider,
                    })
                : undefined
            }
          />
        </View>
      )}

      {selectedAiPostForDetail && (
        <PostDetailModal
          visible={selectedAiPostForDetail !== null}
          post={selectedAiPostForDetail}
          onClose={() => setSelectedAiPostForDetail(null)}
          onDelete={(postToDelete) => {
            setLocalAiPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
            setSelectedAiPostForDetail(null);
          }}
          onEditSave={(updated) => {
            setLocalAiPosts((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, content: updated.content } : p))
            );
            setSelectedAiPostForDetail(null);
          }}
        />
      )}

      {fullscreenPhotoUrl && (
        <Modal
          visible={fullscreenPhotoUrl !== null}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setFullscreenPhotoUrl(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#090D16', paddingTop: insets.top, paddingBottom: insets.bottom }}>
            {/* Top Bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#1E293B',
              }}
            >
              <Pressable
                onPress={() => setFullscreenPhotoUrl(null)}
                hitSlop={10}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                }}
              >
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Close</Text>
              </Pressable>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    const toDelete = fullscreenPhotoUrl;
                    Alert.alert(
                      'Delete Photo',
                      'Are you sure you want to delete this business photo from your marketing gallery?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            setRefPhotosList((prev) => prev.filter((p) => p.url !== toDelete));
                            setSelectedRefUrls((prev) => prev.filter((u) => u !== toDelete));
                            setFullscreenPhotoUrl(null);
                          },
                        },
                      ]
                    );
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#EF4444',
                  }}
                >
                  <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Delete</Text>
                </Pressable>
              </View>
            </View>

            {/* Photo Preview Container */}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <Image
                source={{ uri: fullscreenPhotoUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>

            {/* Bottom Actions Bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderTopWidth: 1,
                borderTopColor: '#1E293B',
                backgroundColor: '#0F172A',
              }}
            >
              <Pressable
                onPress={() => {
                  toggleRefPhoto(fullscreenPhotoUrl);
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: selectedRefUrls.includes(fullscreenPhotoUrl) ? '#009F50' : '#1E293B',
                  paddingVertical: 12,
                  borderRadius: 10,
                }}
              >
                <MaterialIcons
                  name={selectedRefUrls.includes(fullscreenPhotoUrl) ? 'check' : 'add-photo-alternate'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  {selectedRefUrls.includes(fullscreenPhotoUrl) ? 'Selected as Reference' : 'Use as AI Reference'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setCustomPosterUri(fullscreenPhotoUrl);
                  setFullscreenPhotoUrl(null);
                  Alert.alert('Hero Image Updated', 'This photo is now set as your active poster hero image.');
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: '#2563EB',
                  paddingVertical: 12,
                  borderRadius: 10,
                }}
              >
                <MaterialIcons name="wallpaper" size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                  Set as Poster
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Create Post for GBP with AI Modal (Screenshot 2) ── */}
      <CreateGbpPostModal
        visible={createPostModalOpen}
        onClose={() => setCreatePostModalOpen(false)}
        onPostGenerated={(generated) => {
          setActiveReviewPost(generated);
          setReviewPostModalOpen(true);
        }}
        businessName={effectiveBusinessName}
        businessCategory={brandProfile.data?.profile?.industry || gbpPlace.data?.place?.category}
      />

      {/* ── Review & Dual-Edit Post Modal ── */}
      <PostReviewEditModal
        visible={reviewPostModalOpen}
        onClose={() => {
          setReviewPostModalOpen(false);
          setActiveReviewPost(null);
        }}
        post={activeReviewPost}
        businessName={effectiveBusinessName}
        defaultWebsiteUrl={
          brandProfile.data?.profile?.website ||
          gbpPlace.data?.place?.website ||
          ''
        }
        onPublished={() => {
          setBoardRefresh((k) => k + 1);
        }}
      />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  createSegmentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#FFFFFF',
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchExpandedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#009F50',
    paddingHorizontal: 10,
    gap: 8,
    shadowColor: '#009F50',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  searchExpandedInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
    fontWeight: '600',
  },
  searchExpandedCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  createSegmentBtnActive: {
    backgroundColor: '#009F50',
    borderColor: '#009F50',
    shadowColor: '#009F50',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  createSegmentText: {
    textAlign: 'center',
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
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
    gap: 8,
  },
  modeTab: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modeTabActive: {
    borderBottomColor: '#009F50',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#043B26',
    fontWeight: '800',
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

  // Post view switcher
  postViewSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginVertical: 8,
    gap: 4,
  },
  postViewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  postViewBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  postViewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  postViewBtnTextActive: {
    fontWeight: '800',
    color: '#009F50',
  },

  // Autopilot hero card
  apHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },

  // Time picker modal
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  timeModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  timeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  timeModalSub: {
    fontSize: 12,
    color: '#64748B',
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timeSlotRowSelected: {
    backgroundColor: '#F0FDF4',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  timeSlotTextSelected: {
    fontWeight: '800',
    color: '#009F50',
  },

  // Drafts modal
  draftModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  draftModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 34,
    maxHeight: '80%',
    gap: 12,
  },
  draftModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  draftModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  draftModalSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  emptyDraftsWrap: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyDraftsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  emptyDraftsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 240,
  },
  draftItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  draftIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  draftItemDate: {
    fontSize: 11,
    color: '#64748B',
  },
});